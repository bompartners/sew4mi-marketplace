/**
 * Order Status Transition Service
 * Manages order lifecycle state transitions and business rules
 */

import { createClientSupabaseClient } from '@/lib/supabase';
import { notificationService, NotificationType } from './notification.service';
import { OrderStatus } from '@sew4mi/shared/types';

export interface StatusTransitionResult {
  success: boolean;
  newStatus?: OrderStatus;
  message: string;
  notifications?: string[];
}

export interface OrderTransitionContext {
  orderId: string;
  currentStatus: OrderStatus;
  targetStatus?: OrderStatus;
  triggeredBy: 'payment' | 'tailor' | 'customer' | 'system';
  metadata?: Record<string, any>;
}

/**
 * Valid state transitions for order workflow
 */
const ORDER_TRANSITIONS: Record<string, Record<string, string>> = {
  SUBMITTED: {
    onDepositPaid: 'DEPOSIT_PAID',
    onCancel: 'CANCELLED'
  },
  DEPOSIT_PAID: {
    onTailorAccept: 'ACCEPTED',
    onCancel: 'CANCELLED'
  },
  ACCEPTED: {
    onMeasurementConfirmed: 'MEASUREMENT_CONFIRMED',
    onDispute: 'DISPUTED'
  },
  MEASUREMENT_CONFIRMED: {
    onFabricSourced: 'FABRIC_SOURCED'
  },
  FABRIC_SOURCED: {
    onCuttingStart: 'CUTTING_STARTED'
  },
  CUTTING_STARTED: {
    onSewingStart: 'SEWING_IN_PROGRESS'
  },
  SEWING_IN_PROGRESS: {
    onFittingScheduled: 'FITTING_SCHEDULED',
    onDispute: 'DISPUTED'
  },
  FITTING_SCHEDULED: {
    onFittingComplete: 'FITTING_COMPLETED',
    onDispute: 'DISPUTED'
  },
  FITTING_COMPLETED: {
    onAdjustmentsNeeded: 'ADJUSTMENTS_IN_PROGRESS',
    onFinalInspection: 'FINAL_INSPECTION'
  },
  ADJUSTMENTS_IN_PROGRESS: {
    onAdjustmentsComplete: 'FINAL_INSPECTION'
  },
  FINAL_INSPECTION: {
    onReadyForDelivery: 'READY_FOR_DELIVERY'
  },
  READY_FOR_DELIVERY: {
    onDelivered: 'DELIVERED',
    onDispute: 'DISPUTED'
  },
  DELIVERED: {
    onCompleted: 'COMPLETED'
  },
  COMPLETED: {
    // Terminal state - no transitions
  },
  CANCELLED: {
    // Terminal state - no transitions
  },
  DISPUTED: {
    onResolution: 'SEWING_IN_PROGRESS',
    onCancel: 'CANCELLED'
  }
};

/**
 * Escrow stage mapping based on order status
 */
const STATUS_TO_ESCROW_STAGE: Record<string, string> = {
  SUBMITTED: 'DEPOSIT',
  DEPOSIT_PAID: 'DEPOSIT',
  ACCEPTED: 'DEPOSIT',
  MEASUREMENT_CONFIRMED: 'DEPOSIT',
  FABRIC_SOURCED: 'DEPOSIT',
  CUTTING_STARTED: 'DEPOSIT',
  SEWING_IN_PROGRESS: 'DEPOSIT',
  FITTING_SCHEDULED: 'FITTING',
  FITTING_COMPLETED: 'FITTING',
  ADJUSTMENTS_IN_PROGRESS: 'FITTING',
  FINAL_INSPECTION: 'FITTING',
  READY_FOR_DELIVERY: 'FINAL',
  DELIVERED: 'FINAL',
  COMPLETED: 'RELEASED',
  CANCELLED: 'REFUNDED',
  DISPUTED: 'HELD'
};

export class OrderStatusService {
  /**
   * Transition order to new status based on event
   */
  async transitionOrder(
    context: OrderTransitionContext,
    event: string
  ): Promise<StatusTransitionResult> {
    try {
      // Validate transition is allowed
      const transitions = ORDER_TRANSITIONS[context.currentStatus];
      if (!transitions || !transitions[event]) {
        return {
          success: false,
          message: `Invalid transition: ${context.currentStatus} cannot handle ${event}`
        };
      }

      const newStatus = transitions[event] as OrderStatus;
      
      // Update order status in database
      const supabase = createClientSupabaseClient();
      const { data: order, error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          escrow_stage: STATUS_TO_ESCROW_STAGE[newStatus],
          updated_at: new Date().toISOString()
        })
        .eq('id', context.orderId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update order status:', error);
        return {
          success: false,
          message: 'Failed to update order status'
        };
      }

      // Send notifications based on status change
      const notifications = await this.sendStatusNotifications(
        order,
        context.currentStatus,
        newStatus,
        context.metadata
      );

      // Log status transition for audit
      await this.logStatusTransition(
        context.orderId,
        context.currentStatus,
        newStatus,
        event,
        context.triggeredBy
      );

      return {
        success: true,
        newStatus,
        message: `Order transitioned from ${context.currentStatus} to ${newStatus}`,
        notifications
      };

    } catch (error) {
      console.error('Order transition error:', error);
      return {
        success: false,
        message: 'Failed to transition order status'
      };
    }
  }

  /**
   * Handle payment confirmation and update order status
   */
  async handlePaymentConfirmation(
    orderId: string,
    paymentType: 'deposit' | 'fitting' | 'final',
    transactionId: string
  ): Promise<StatusTransitionResult> {
    try {
      const supabase = createClientSupabaseClient();
      
      // Get current order status
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      // Determine event based on payment type and current status
      let event = '';
      let updateData: any = {
        updated_at: new Date().toISOString()
      };

      switch (paymentType) {
        case 'deposit':
          if (order.status === 'SUBMITTED') {
            event = 'onDepositPaid';
            updateData.deposit_paid = order.deposit_amount;
            updateData.deposit_paid_at = new Date().toISOString();
          }
          break;

        case 'fitting':
          if (order.status === 'FITTING_COMPLETED') {
            updateData.fitting_paid = order.fitting_amount;
            updateData.fitting_paid_at = new Date().toISOString();
            event = 'onFinalInspection';
          }
          break;

        case 'final':
          if (order.status === 'DELIVERED') {
            updateData.final_paid = order.final_amount;
            updateData.final_paid_at = new Date().toISOString();
            event = 'onCompleted';
          }
          break;
      }

      if (!event) {
        return {
          success: false,
          message: `Payment type ${paymentType} not applicable for status ${order.status}`
        };
      }

      // Apply the transition
      const result = await this.transitionOrder(
        {
          orderId,
          currentStatus: order.status,
          triggeredBy: 'payment',
          metadata: { transactionId, paymentType }
        },
        event
      );

      // Update payment fields if transition succeeded
      if (result.success) {
        await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);
      }

      return result;

    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        message: 'Failed to process payment confirmation'
      };
    }
  }

  /**
   * Send notifications for status changes
   */
  private async sendStatusNotifications(
    order: any,
    oldStatus: string,
    newStatus: string,
    metadata?: Record<string, any>
  ): Promise<string[]> {
    const notifications: string[] = [];

    try {
      // Get progress percentage
      const progress = this.calculateOrderProgress(newStatus);

      // Notify customer
      await notificationService.notifyProgressUpdate(
        order.customer_id,
        order.order_number,
        newStatus,
        progress
      );
      notifications.push(`Customer notified: ${newStatus}`);

      // Notify tailor for relevant status changes
      const tailorNotificationStatuses = [
        'DEPOSIT_PAID',
        'FITTING_APPROVED',
        'READY_FOR_DELIVERY',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED'
      ];

      if (tailorNotificationStatuses.includes(newStatus)) {
        await notificationService.notifyProgressUpdate(
          order.tailor_id,
          order.order_number,
          newStatus,
          progress
        );
        notifications.push(`Tailor notified: ${newStatus}`);
      }

      // Special notifications for specific transitions
      if (newStatus === 'DEPOSIT_PAID') {
        // Tailor can now start working
        await notificationService.sendNotification({
          userId: order.tailor_id,
          type: NotificationType.ORDER_UPDATE,
          title: 'Payment Received - Start Production',
          message: `Deposit received for order #${order.order_number}. You can now start working on the ${order.garment_type}.`,
          data: { orderId: order.id, orderNumber: order.order_number },
          channels: ['in-app', 'whatsapp'],
          priority: 'high'
        });
      }

      if (newStatus === 'READY_FOR_FITTING') {
        // Customer needs to review fitting photos
        await notificationService.sendNotification({
          userId: order.customer_id,
          type: NotificationType.FITTING_REMINDER,
          title: 'Fitting Photos Ready for Review',
          message: `Your tailor has uploaded fitting photos for order #${order.order_number}. Please review and approve to continue.`,
          data: { orderId: order.id, orderNumber: order.order_number },
          channels: ['in-app', 'whatsapp'],
          priority: 'high'
        });
      }

      if (newStatus === 'COMPLETED') {
        // Order completed successfully
        await notificationService.notifyCompletion(
          order.customer_id,
          order.order_number
        );
      }

    } catch (error) {
      console.error('Failed to send status notifications:', error);
      notifications.push('Failed to send some notifications');
    }

    return notifications;
  }

  /**
   * Calculate order progress percentage based on status
   */
  private calculateOrderProgress(status: string): number {
    const progressMap: Record<string, number> = {
      SUBMITTED: 0,
      DEPOSIT_PAID: 10,
      ACCEPTED: 15,
      MEASUREMENT_CONFIRMED: 20,
      FABRIC_SOURCED: 25,
      CUTTING_STARTED: 35,
      SEWING_IN_PROGRESS: 45,
      FITTING_SCHEDULED: 55,
      FITTING_COMPLETED: 65,
      ADJUSTMENTS_IN_PROGRESS: 70,
      FINAL_INSPECTION: 80,
      READY_FOR_DELIVERY: 90,
      DELIVERED: 95,
      COMPLETED: 100,
      CANCELLED: 0,
      DISPUTED: 0
    };

    return progressMap[status] || 0;
  }

  /**
   * Log status transition for audit trail
   */
  private async logStatusTransition(
    orderId: string,
    fromStatus: string,
    toStatus: string,
    event: string,
    triggeredBy: string
  ): Promise<void> {
    try {
      const supabase = createClientSupabaseClient();
      
      await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          from_status: fromStatus,
          to_status: toStatus,
          transition_event: event,
          triggered_by: triggeredBy,
          created_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Failed to log status transition:', error);
      // Don't fail the transition if logging fails
    }
  }

  /**
   * Check if a transition is valid
   */
  isValidTransition(fromStatus: string, event: string): boolean {
    const transitions = ORDER_TRANSITIONS[fromStatus];
    return transitions ? event in transitions : false;
  }

  /**
   * Get available transitions for current status
   */
  getAvailableTransitions(currentStatus: string): string[] {
    const transitions = ORDER_TRANSITIONS[currentStatus];
    return transitions ? Object.keys(transitions) : [];
  }

  /**
   * Get next expected status in normal flow
   */
  getNextExpectedStatus(currentStatus: string): string | null {
    const normalFlow: Record<string, string> = {
      SUBMITTED: 'DEPOSIT_PAID',
      DEPOSIT_PAID: 'ACCEPTED',
      ACCEPTED: 'MEASUREMENT_CONFIRMED',
      MEASUREMENT_CONFIRMED: 'FABRIC_SOURCED',
      FABRIC_SOURCED: 'CUTTING_STARTED',
      CUTTING_STARTED: 'SEWING_IN_PROGRESS',
      SEWING_IN_PROGRESS: 'FITTING_SCHEDULED',
      FITTING_SCHEDULED: 'FITTING_COMPLETED',
      FITTING_COMPLETED: 'FINAL_INSPECTION',
      ADJUSTMENTS_IN_PROGRESS: 'FINAL_INSPECTION',
      FINAL_INSPECTION: 'READY_FOR_DELIVERY',
      READY_FOR_DELIVERY: 'DELIVERED',
      DELIVERED: 'COMPLETED'
    };

    return normalFlow[currentStatus] || null;
  }
}

// Export singleton instance
export const orderStatusService = new OrderStatusService();
