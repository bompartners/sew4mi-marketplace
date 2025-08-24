import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { 
  Dispute, 
  DisputeEvidence, 
  DisputeMessage, 
  CreateDisputeRequest,
  DisputeFilters 
} from '@sew4mi/shared';

export class DisputeService {
  private supabase;

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
  }

  /**
   * Create a new dispute
   */
  async createDispute(request: CreateDisputeRequest): Promise<{ data: Dispute | null; error: string | null }> {
    try {
      // Get order details for priority calculation
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .select('total_amount, customer_id, tailor_id')
        .eq('id', request.orderId)
        .single();

      if (orderError) {
        return { data: null, error: 'Order not found' };
      }

      // Calculate priority based on order value and category
      const priority = this.calculatePriority(order.total_amount, request.category);

      // Create the dispute
      const { data: dispute, error: disputeError } = await this.supabase
        .from('disputes')
        .insert({
          order_id: request.orderId,
          raised_by: request.raisedBy,
          customer_id: order.customer_id,
          tailor_id: order.tailor_id,
          category: request.category,
          priority,
          description: request.description,
          status: 'OPEN'
        })
        .select('*')
        .single();

      if (disputeError) {
        return { data: null, error: disputeError.message };
      }

      return { data: dispute, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to create dispute' };
    }
  }

  /**
   * Get disputes with filters
   */
  async getDisputes(filters: DisputeFilters = {}): Promise<{ data: Dispute[] | null; error: string | null }> {
    try {
      let query = this.supabase
        .from('disputes')
        .select(`
          *,
          orders (
            id,
            title,
            total_amount,
            customers (id, full_name, email),
            tailors (id, business_name, email)
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.assignedAdmin) {
        query = query.eq('assigned_admin', filters.assignedAdmin);
      }
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters.tailorId) {
        query = query.eq('tailor_id', filters.tailorId);
      }
      if (filters.overdue) {
        query = query.lt('sla_deadline', new Date().toISOString());
      }

      // Order by created date (newest first)
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to fetch disputes' };
    }
  }

  /**
   * Get dispute by ID with full details
   */
  async getDisputeById(id: string): Promise<{ data: Dispute | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('disputes')
        .select(`
          *,
          orders (
            id,
            title,
            total_amount,
            status,
            customers (id, full_name, email, phone),
            tailors (id, business_name, email, phone)
          ),
          dispute_evidence (*),
          dispute_resolutions (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to fetch dispute details' };
    }
  }

  /**
   * Assign dispute to admin
   */
  async assignDispute(disputeId: string, adminId: string): Promise<{ data: Dispute | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('disputes')
        .update({
          assigned_admin: adminId,
          status: 'IN_PROGRESS',
          updated_at: new Date().toISOString()
        })
        .eq('id', disputeId)
        .select('*')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to assign dispute' };
    }
  }

  /**
   * Upload evidence for dispute
   */
  async uploadEvidence(
    disputeId: string,
    files: Array<{
      file: File;
      description?: string;
    }>
  ): Promise<{ data: DisputeEvidence[] | null; error: string | null }> {
    try {
      const uploadedEvidence: DisputeEvidence[] = [];

      for (const { file, description } of files) {
        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${disputeId}/${timestamp}_${file.name}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from('dispute-evidence')
          .upload(fileName, file);

        if (uploadError) {
          return { data: null, error: `Failed to upload ${file.name}: ${uploadError.message}` };
        }

        // Get public URL
        const { data: { publicUrl } } = this.supabase.storage
          .from('dispute-evidence')
          .getPublicUrl(fileName);

        // Save evidence record
        const { data: evidence, error: evidenceError } = await this.supabase
          .from('dispute_evidence')
          .insert({
            dispute_id: disputeId,
            uploaded_by: (await this.supabase.auth.getUser()).data.user?.id,
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            description
          })
          .select('*')
          .single();

        if (evidenceError) {
          return { data: null, error: evidenceError.message };
        }

        uploadedEvidence.push(evidence);
      }

      return { data: uploadedEvidence, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to upload evidence' };
    }
  }

  /**
   * Get dispute messages
   */
  async getDisputeMessages(disputeId: string): Promise<{ data: DisputeMessage[] | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('dispute_messages')
        .select(`
          *,
          sender:users (id, full_name, email)
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to fetch messages' };
    }
  }

  /**
   * Send message in dispute
   */
  async sendMessage(
    disputeId: string,
    message: string,
    attachments?: string[],
    isInternalNote: boolean = false
  ): Promise<{ data: DisputeMessage | null; error: string | null }> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user;
      if (!user) {
        return { data: null, error: 'User not authenticated' };
      }

      // Determine sender role
      const senderRole = await this.getSenderRole(user.id, disputeId);

      const { data, error } = await this.supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: user.id,
          sender_role: senderRole,
          message,
          attachments,
          is_internal_note: isInternalNote
        })
        .select(`
          *,
          sender:users (id, full_name, email)
        `)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to send message' };
    }
  }

  /**
   * Get admin dashboard metrics
   */
  async getAdminDashboardMetrics(): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('admin_dispute_metrics')
        .select('*')
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to fetch dashboard metrics' };
    }
  }

  /**
   * Get dispute analytics data
   */
  async getDisputeAnalytics(dateRange: { from: Date; to: Date }): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('disputes')
        .select(`
          category,
          priority,
          status,
          resolution_type,
          created_at,
          resolved_at,
          orders (total_amount)
        `)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (error) {
        return { data: null, error: error.message };
      }

      // Process analytics data
      const analytics = this.processAnalyticsData(data);

      return { data: analytics, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to fetch analytics data' };
    }
  }

  /**
   * Calculate dispute priority based on order value and category
   */
  private calculatePriority(orderValue: number, category: string): string {
    if (orderValue > 1000) return 'HIGH';
    if (orderValue > 500 || ['PAYMENT_PROBLEM', 'DELIVERY_DELAY'].includes(category)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Determine sender role for messaging
   */
  private async getSenderRole(userId: string, disputeId: string): Promise<string> {
    // Check if user is admin
    const { data: adminRole } = await this.supabase
      .from('user_roles')
      .select('roles (name)')
      .eq('user_id', userId)
      .eq('roles.name', 'admin')
      .single();

    if (adminRole) return 'ADMIN';

    // Check if user is customer or tailor for this dispute
    const { data: dispute } = await this.supabase
      .from('disputes')
      .select('customer_id, tailor_id')
      .eq('id', disputeId)
      .single();

    if (dispute?.customer_id === userId) return 'CUSTOMER';
    if (dispute?.tailor_id === userId) return 'TAILOR';

    return 'CUSTOMER'; // Default fallback
  }

  /**
   * Process raw dispute data into analytics metrics
   */
  private processAnalyticsData(data: any[]): any {
    const totalDisputes = data.length;
    const categoryCounts = data.reduce((acc, dispute) => {
      acc[dispute.category] = (acc[dispute.category] || 0) + 1;
      return acc;
    }, {});

    const statusCounts = data.reduce((acc, dispute) => {
      acc[dispute.status] = (acc[dispute.status] || 0) + 1;
      return acc;
    }, {});

    const resolutionTimes = data
      .filter(d => d.resolved_at)
      .map(d => {
        const created = new Date(d.created_at);
        const resolved = new Date(d.resolved_at);
        return (resolved.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });

    const avgResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
      : 0;

    const resolutionTypeBreakdown = data
      .filter(d => d.resolution_type)
      .reduce((acc, dispute) => {
        acc[dispute.resolution_type] = (acc[dispute.resolution_type] || 0) + 1;
        return acc;
      }, {});

    return {
      totalDisputes,
      categoryCounts,
      statusCounts,
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
      resolutionTypeBreakdown,
      disputesByMonth: this.groupByMonth(data)
    };
  }

  /**
   * Group disputes by month for trend analysis
   */
  private groupByMonth(data: any[]): any {
    return data.reduce((acc, dispute) => {
      const month = new Date(dispute.created_at).toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});
  }
}