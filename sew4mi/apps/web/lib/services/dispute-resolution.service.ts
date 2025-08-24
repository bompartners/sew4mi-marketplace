import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { 
  Dispute, 
  DisputeResolution, 
  ResolveDisputeRequest 
} from '@sew4mi/shared';
import { EscrowService } from './escrow.service';
import { EscrowNotificationService } from './escrow-notification.service';

export class DisputeResolutionService {
  private supabase;
  private escrowService: EscrowService;
  private notificationService: EscrowNotificationService;

  constructor() {
    const cookieStore = cookies();
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    this.escrowService = new EscrowService();
    this.notificationService = new EscrowNotificationService();
  }

  /**
   * Resolve a dispute with the specified outcome
   */
  async resolveDispute(request: ResolveDisputeRequest): Promise<{ data: DisputeResolution | null; error: string | null }> {
    try {
      // Get current user (admin)
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) {
        return { data: null, error: 'User not authenticated' };
      }

      // Verify admin role
      const isAdmin = await this.verifyAdminRole(user.id);
      if (!isAdmin) {
        return { data: null, error: 'Insufficient permissions' };
      }

      // Get dispute details
      const { data: dispute, error: disputeError } = await this.supabase
        .from('disputes')
        .select(`
          *,
          orders (
            id,
            total_amount,
            escrow_id,
            customers (id, full_name, email, phone),
            tailors (id, business_name, email, phone)
          )
        `)
        .eq('id', request.disputeId)
        .single();

      if (disputeError || !dispute) {
        return { data: null, error: 'Dispute not found' };
      }

      // Process resolution based on type
      const resolutionResult = await this.processResolution(dispute, request);
      if (resolutionResult.error) {
        return { data: null, error: resolutionResult.error };
      }

      // Create resolution record
      const { data: resolution, error: resolutionError } = await this.supabase
        .from('dispute_resolutions')
        .insert({
          dispute_id: request.disputeId,
          resolution_type: request.resolutionType,
          outcome: request.outcome,
          refund_amount: request.refundAmount,
          reason_code: request.reasonCode,
          admin_notes: request.adminNotes,
          resolved_by: user.id
        })
        .select('*')
        .single();

      if (resolutionError) {
        return { data: null, error: resolutionError.message };
      }

      // Update dispute status
      const { error: updateError } = await this.supabase
        .from('disputes')
        .update({
          status: 'RESOLVED',
          resolution_type: request.resolutionType,
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', request.disputeId);

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      // Send notifications to all parties
      await this.sendResolutionNotifications(dispute, resolution);

      return { data: resolution, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to resolve dispute' };
    }
  }

  /**
   * Process the resolution based on type
   */
  private async processResolution(dispute: any, request: ResolveDisputeRequest): Promise<{ error: string | null }> {
    switch (request.resolutionType) {
      case 'FULL_REFUND':
        return await this.processFullRefund(dispute);
      
      case 'PARTIAL_REFUND':
        return await this.processPartialRefund(dispute, request.refundAmount!);
      
      case 'ORDER_COMPLETION':
        return await this.processOrderCompletion(dispute);
      
      case 'NO_ACTION':
        return { error: null }; // No financial action needed
      
      default:
        return { error: 'Invalid resolution type' };
    }
  }

  /**
   * Process full refund resolution
   */
  private async processFullRefund(dispute: any): Promise<{ error: string | null }> {
    try {
      const order = dispute.orders;
      
      // Release full escrow amount to customer
      const refundResult = await this.escrowService.processRefund(
        order.escrow_id,
        order.total_amount,
        'DISPUTE_FULL_REFUND'
      );

      if (refundResult.error) {
        return { error: `Failed to process refund: ${refundResult.error}` };
      }

      // Update order status
      const { error: orderUpdateError } = await this.supabase
        .from('orders')
        .update({ 
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderUpdateError) {
        return { error: 'Failed to update order status' };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to process full refund' };
    }
  }

  /**
   * Process partial refund resolution
   */
  private async processPartialRefund(dispute: any, refundAmount: number): Promise<{ error: string | null }> {
    try {
      const order = dispute.orders;
      
      // Validate refund amount
      if (refundAmount <= 0 || refundAmount >= order.total_amount) {
        return { error: 'Invalid refund amount' };
      }

      // Process partial refund through escrow
      const refundResult = await this.escrowService.processPartialRefund(
        order.escrow_id,
        refundAmount,
        'DISPUTE_PARTIAL_REFUND'
      );

      if (refundResult.error) {
        return { error: `Failed to process partial refund: ${refundResult.error}` };
      }

      // Order continues with reduced amount
      const { error: orderUpdateError } = await this.supabase
        .from('orders')
        .update({ 
          total_amount: order.total_amount - refundAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderUpdateError) {
        return { error: 'Failed to update order amount' };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to process partial refund' };
    }
  }

  /**
   * Process order completion resolution
   */
  private async processOrderCompletion(dispute: any): Promise<{ error: string | null }> {
    try {
      const order = dispute.orders;

      // Set order back to in progress or appropriate status
      const { error: orderUpdateError } = await this.supabase
        .from('orders')
        .update({ 
          status: 'IN_PROGRESS',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderUpdateError) {
        return { error: 'Failed to update order status' };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to process order completion' };
    }
  }

  /**
   * Send resolution notifications to all parties
   */
  private async sendResolutionNotifications(dispute: any, resolution: DisputeResolution): Promise<void> {
    try {
      const order = dispute.orders;

      // Notification to customer
      await this.notificationService.scheduleNotification({
        userId: dispute.customer_id,
        type: 'dispute_resolved',
        priority: 'high',
        title: 'Dispute Resolved',
        message: `Your dispute for order ${order.id} has been resolved: ${resolution.outcome}`,
        data: {
          disputeId: dispute.id,
          orderId: order.id,
          resolutionType: resolution.resolution_type,
          refundAmount: resolution.refund_amount
        }
      });

      // Notification to tailor
      await this.notificationService.scheduleNotification({
        userId: dispute.tailor_id,
        type: 'dispute_resolved',
        priority: 'high',
        title: 'Dispute Resolved',
        message: `The dispute for order ${order.id} has been resolved: ${resolution.outcome}`,
        data: {
          disputeId: dispute.id,
          orderId: order.id,
          resolutionType: resolution.resolution_type
        }
      });

      // Mark notifications as sent in resolution record
      await this.supabase
        .from('dispute_resolutions')
        .update({
          customer_notified: true,
          tailor_notified: true
        })
        .eq('id', resolution.id);

    } catch (error) {
      console.error('Failed to send resolution notifications:', error);
    }
  }

  /**
   * Escalate dispute to higher priority
   */
  async escalateDispute(disputeId: string, reason: string): Promise<{ data: Dispute | null; error: string | null }> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) {
        return { data: null, error: 'User not authenticated' };
      }

      // Get current dispute
      const { data: dispute, error: disputeError } = await this.supabase
        .from('disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        return { data: null, error: 'Dispute not found' };
      }

      // Determine new priority
      const newPriority = this.getEscalatedPriority(dispute.priority);

      // Update dispute
      const { data: updatedDispute, error: updateError } = await this.supabase
        .from('disputes')
        .update({
          priority: newPriority,
          status: 'ESCALATED',
          updated_at: new Date().toISOString()
        })
        .eq('id', disputeId)
        .select('*')
        .single();

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      // Log escalation in messages
      await this.supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: user.id,
          sender_role: 'ADMIN',
          message: `Dispute escalated to ${newPriority} priority. Reason: ${reason}`,
          is_internal_note: true
        });

      return { data: updatedDispute, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to escalate dispute' };
    }
  }

  /**
   * Close dispute without resolution (rejected dispute)
   */
  async closeDispute(disputeId: string, reason: string): Promise<{ data: Dispute | null; error: string | null }> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) {
        return { data: null, error: 'User not authenticated' };
      }

      // Verify admin role
      const isAdmin = await this.verifyAdminRole(user.id);
      if (!isAdmin) {
        return { data: null, error: 'Insufficient permissions' };
      }

      const { data: dispute, error } = await this.supabase
        .from('disputes')
        .update({
          status: 'CLOSED',
          resolution_type: 'NO_ACTION',
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', disputeId)
        .select('*')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      // Log closure reason
      await this.supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: user.id,
          sender_role: 'ADMIN',
          message: `Dispute closed without resolution. Reason: ${reason}`,
          is_internal_note: false // Visible to all parties
        });

      return { data: dispute, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to close dispute' };
    }
  }

  /**
   * Get resolution templates for common outcomes
   */
  async getResolutionTemplates(): Promise<{ data: any[] | null; error: string | null }> {
    // This could be expanded to use a database table for templates
    const templates = [
      {
        id: 'quality-full-refund',
        resolutionType: 'FULL_REFUND',
        reasonCode: 'QUALITY_ISSUE',
        outcomeTemplate: 'Full refund issued due to quality issues. Order cancelled.',
        adminNotesTemplate: 'Customer provided evidence of quality defects. Refund approved.'
      },
      {
        id: 'delay-partial-refund',
        resolutionType: 'PARTIAL_REFUND',
        reasonCode: 'DELIVERY_DELAY',
        outcomeTemplate: 'Partial refund for delivery delay. Order to continue with adjusted timeline.',
        adminNotesTemplate: 'Delivery delayed beyond acceptable timeframe. Partial compensation approved.'
      },
      {
        id: 'minor-issue-continue',
        resolutionType: 'ORDER_COMPLETION',
        reasonCode: 'MINOR_ISSUE',
        outcomeTemplate: 'Minor issues resolved. Order to continue as planned.',
        adminNotesTemplate: 'Issues clarified between parties. No financial adjustment needed.'
      },
      {
        id: 'unfounded-claim',
        resolutionType: 'NO_ACTION',
        reasonCode: 'UNFOUNDED',
        outcomeTemplate: 'Dispute claim not substantiated. Original order terms maintained.',
        adminNotesTemplate: 'Insufficient evidence provided. No action warranted.'
      }
    ];

    return { data: templates, error: null };
  }

  /**
   * Verify if user has admin role
   */
  private async verifyAdminRole(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_roles')
      .select('roles (name)')
      .eq('user_id', userId)
      .eq('roles.name', 'admin')
      .single();

    return !!data;
  }

  /**
   * Get escalated priority level
   */
  private getEscalatedPriority(currentPriority: string): string {
    switch (currentPriority) {
      case 'LOW':
        return 'MEDIUM';
      case 'MEDIUM':
        return 'HIGH';
      case 'HIGH':
        return 'CRITICAL';
      case 'CRITICAL':
        return 'CRITICAL'; // Already at max
      default:
        return 'HIGH';
    }
  }

  /**
   * Get dispute resolution statistics for admin dashboard
   */
  async getResolutionStatistics(dateRange?: { from: Date; to: Date }): Promise<{ data: any | null; error: string | null }> {
    try {
      let query = this.supabase
        .from('dispute_resolutions')
        .select(`
          *,
          disputes (category, priority, created_at)
        `);

      if (dateRange) {
        query = query.gte('resolved_at', dateRange.from.toISOString())
                    .lte('resolved_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      // Process statistics
      const statistics = {
        totalResolutions: data.length,
        resolutionTypeBreakdown: this.groupByField(data, 'resolution_type'),
        reasonCodeBreakdown: this.groupByField(data, 'reason_code'),
        avgResolutionTime: this.calculateAverageResolutionTime(data),
        customerSatisfactionMetrics: this.calculateSatisfactionMetrics(data)
      };

      return { data: statistics, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to fetch resolution statistics' };
    }
  }

  /**
   * Helper function to group data by field
   */
  private groupByField(data: any[], field: string): any {
    return data.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(resolutions: any[]): number {
    const times = resolutions
      .filter(r => r.disputes?.created_at)
      .map(r => {
        const created = new Date(r.disputes.created_at);
        const resolved = new Date(r.resolved_at);
        return (resolved.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });

    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  /**
   * Calculate satisfaction metrics (placeholder for future implementation)
   */
  private calculateSatisfactionMetrics(resolutions: any[]): any {
    // This would integrate with customer feedback system
    return {
      satisfactionRate: 0.85, // Placeholder
      totalFeedback: 0,
      avgRating: 4.2 // Placeholder
    };
  }
}