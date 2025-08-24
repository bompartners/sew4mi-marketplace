import { EscrowStage, EscrowStatus } from '@sew4mi/shared';
import { EscrowRepository } from '../repositories/escrow.repository';

export interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
}

export interface EscrowNotification {
  type: string;
  recipient: string;
  orderId: string;
  stage: EscrowStage;
  message: string;
  scheduledFor: Date;
  priority: 'low' | 'medium' | 'high';
}

export class EscrowNotificationService {
  private escrowRepository: EscrowRepository;

  constructor() {
    this.escrowRepository = new EscrowRepository();
  }

  /**
   * Schedule reminder notifications for upcoming milestones
   */
  async scheduleReminderNotifications(orderId: string): Promise<void> {
    try {
      const escrowStatus = await this.escrowRepository.getEscrowStatus(orderId);
      if (!escrowStatus) {
        throw new Error('Order not found or no escrow status');
      }

      // Get order details for customer and tailor info
      const orderDetails = await this.getOrderDetails(orderId);
      if (!orderDetails) {
        throw new Error('Order details not found');
      }

      const notifications = this.generateMilestoneReminders(
        escrowStatus,
        orderDetails
      );

      // Schedule each notification
      for (const notification of notifications) {
        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Error scheduling escrow reminder notifications:', error);
      throw error;
    }
  }

  /**
   * Send immediate notification for milestone events
   */
  async sendMilestoneNotification(
    orderId: string,
    stage: EscrowStage,
    event: 'milestone_reached' | 'payment_released' | 'approval_needed'
  ): Promise<void> {
    try {
      const orderDetails = await this.getOrderDetails(orderId);
      if (!orderDetails) {
        throw new Error('Order details not found');
      }

      const notifications = this.generateMilestoneEventNotifications(
        orderId,
        stage,
        event,
        orderDetails
      );

      // Send notifications immediately
      for (const notification of notifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Error sending milestone notification:', error);
      throw error;
    }
  }

  /**
   * Process overdue milestone reminders
   */
  async processOverdueReminders(): Promise<void> {
    try {
      // Get orders that are overdue for milestone progression
      const overdueOrders = await this.getOverdueOrders();

      for (const order of overdueOrders) {
        await this.sendOverdueNotification(order);
      }
    } catch (error) {
      console.error('Error processing overdue reminders:', error);
      throw error;
    }
  }

  /**
   * Generate reminder notifications for different milestone stages
   */
  private generateMilestoneReminders(
    escrowStatus: EscrowStatus,
    orderDetails: any
  ): EscrowNotification[] {
    const notifications: EscrowNotification[] = [];
    const now = new Date();

    switch (escrowStatus.currentStage) {
      case 'DEPOSIT':
        // Remind customer about pending deposit after 2 hours
        notifications.push({
          type: 'deposit_reminder',
          recipient: orderDetails.customerPhone,
          orderId: escrowStatus.orderId,
          stage: 'DEPOSIT',
          message: this.getDepositReminderMessage(orderDetails),
          scheduledFor: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours
          priority: 'high'
        });

        // Follow-up reminder after 24 hours
        notifications.push({
          type: 'deposit_followup',
          recipient: orderDetails.customerPhone,
          orderId: escrowStatus.orderId,
          stage: 'DEPOSIT',
          message: this.getDepositFollowupMessage(orderDetails),
          scheduledFor: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
          priority: 'high'
        });
        break;

      case 'FITTING':
        // Remind customer about fitting photo availability (daily for 3 days)
        for (let day = 1; day <= 3; day++) {
          notifications.push({
            type: 'fitting_reminder',
            recipient: orderDetails.customerPhone,
            orderId: escrowStatus.orderId,
            stage: 'FITTING',
            message: this.getFittingReminderMessage(orderDetails, day),
            scheduledFor: new Date(now.getTime() + day * 24 * 60 * 60 * 1000),
            priority: day === 1 ? 'medium' : 'low'
          });
        }

        // Notify tailor about expected completion timeline
        notifications.push({
          type: 'tailor_fitting_reminder',
          recipient: orderDetails.tailorPhone,
          orderId: escrowStatus.orderId,
          stage: 'FITTING',
          message: this.getTailorFittingReminderMessage(orderDetails),
          scheduledFor: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
          priority: 'medium'
        });
        break;

      case 'FINAL':
        // Remind customer about delivery confirmation
        notifications.push({
          type: 'delivery_reminder',
          recipient: orderDetails.customerPhone,
          orderId: escrowStatus.orderId,
          stage: 'FINAL',
          message: this.getDeliveryReminderMessage(orderDetails),
          scheduledFor: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day
          priority: 'medium'
        });

        // Notify tailor about pending delivery
        notifications.push({
          type: 'tailor_delivery_reminder',
          recipient: orderDetails.tailorPhone,
          orderId: escrowStatus.orderId,
          stage: 'FINAL',
          message: this.getTailorDeliveryReminderMessage(orderDetails),
          scheduledFor: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours
          priority: 'medium'
        });
        break;
    }

    return notifications;
  }

  /**
   * Generate immediate event notifications
   */
  private generateMilestoneEventNotifications(
    orderId: string,
    stage: EscrowStage,
    event: string,
    orderDetails: any
  ): EscrowNotification[] {
    const notifications: EscrowNotification[] = [];
    const now = new Date();

    switch (event) {
      case 'milestone_reached':
        // Notify both customer and tailor about milestone progress
        notifications.push({
          type: 'milestone_progress',
          recipient: orderDetails.customerPhone,
          orderId,
          stage,
          message: this.getMilestoneProgressMessage(stage, 'customer', orderDetails),
          scheduledFor: now,
          priority: 'medium'
        });

        notifications.push({
          type: 'milestone_progress',
          recipient: orderDetails.tailorPhone,
          orderId,
          stage,
          message: this.getMilestoneProgressMessage(stage, 'tailor', orderDetails),
          scheduledFor: now,
          priority: 'medium'
        });
        break;

      case 'payment_released':
        // Notify tailor about payment release
        notifications.push({
          type: 'payment_released',
          recipient: orderDetails.tailorPhone,
          orderId,
          stage,
          message: this.getPaymentReleasedMessage(stage, orderDetails),
          scheduledFor: now,
          priority: 'high'
        });

        // Confirm to customer
        notifications.push({
          type: 'payment_confirmation',
          recipient: orderDetails.customerPhone,
          orderId,
          stage,
          message: this.getPaymentConfirmationMessage(stage, orderDetails),
          scheduledFor: now,
          priority: 'medium'
        });
        break;

      case 'approval_needed':
        // Notify customer about required approval
        notifications.push({
          type: 'approval_needed',
          recipient: orderDetails.customerPhone,
          orderId,
          stage,
          message: this.getApprovalNeededMessage(stage, orderDetails),
          scheduledFor: now,
          priority: 'high'
        });
        break;
    }

    return notifications;
  }

  /**
   * Message templates for different notification types
   */
  private getDepositReminderMessage(orderDetails: any): string {
    return `Hi ${orderDetails.customerName}! Your order #${orderDetails.orderNumber} is waiting for deposit payment of GH₵ ${orderDetails.depositAmount.toFixed(2)}. Complete payment to start production. Reply STOP to opt out.`;
  }

  private getDepositFollowupMessage(orderDetails: any): string {
    return `Reminder: Your order #${orderDetails.orderNumber} deposit (GH₵ ${orderDetails.depositAmount.toFixed(2)}) is still pending. Complete payment within 48 hours or order may be cancelled. Need help? Contact support.`;
  }

  private getFittingReminderMessage(orderDetails: any, day: number): string {
    const urgency = day === 1 ? '' : day === 2 ? 'Reminder: ' : 'Final reminder: ';
    return `${urgency}Your fitting photos for order #${orderDetails.orderNumber} are ready for review. Check your Sew4Mi account to approve and release payment to your tailor.`;
  }

  private getTailorFittingReminderMessage(orderDetails: any): string {
    return `Hi ${orderDetails.tailorName}! Order #${orderDetails.orderNumber} fitting is due. Please upload fitting photos for customer approval to proceed with payment release.`;
  }

  private getDeliveryReminderMessage(orderDetails: any): string {
    return `Your garment for order #${orderDetails.orderNumber} is ready for delivery! Confirm receipt to release final payment of GH₵ ${orderDetails.finalAmount.toFixed(2)} to your tailor.`;
  }

  private getTailorDeliveryReminderMessage(orderDetails: any): string {
    return `Order #${orderDetails.orderNumber} is ready for delivery to ${orderDetails.customerName}. Arrange delivery to receive final payment of GH₵ ${orderDetails.finalAmount.toFixed(2)}.`;
  }

  private getMilestoneProgressMessage(stage: EscrowStage, recipient: 'customer' | 'tailor', orderDetails: any): string {
    const messages = {
      customer: {
        'FITTING': `Great news! Your deposit for order #${orderDetails.orderNumber} is confirmed. Your tailor will now begin creating your garment.`,
        'FINAL': `Fitting approved for order #${orderDetails.orderNumber}! GH₵ ${orderDetails.fittingAmount.toFixed(2)} released to tailor. Delivery coming soon.`,
        'RELEASED': `Order #${orderDetails.orderNumber} completed! Final payment released. Thank you for using Sew4Mi!`
      },
      tailor: {
        'FITTING': `Payment received for order #${orderDetails.orderNumber}! You can now start production. Upload fitting photos when ready.`,
        'FINAL': `Fitting approved for order #${orderDetails.orderNumber}! GH₵ ${orderDetails.fittingAmount.toFixed(2)} has been released to you. Please arrange delivery.`,
        'RELEASED': `Congratulations! Order #${orderDetails.orderNumber} completed. Final payment of GH₵ ${orderDetails.finalAmount.toFixed(2)} released.`
      }
    };

    return messages[recipient][stage] || 'Order status updated.';
  }

  private getPaymentReleasedMessage(stage: EscrowStage, orderDetails: any): string {
    const amounts = {
      'FITTING': orderDetails.fittingAmount,
      'FINAL': orderDetails.finalAmount
    };

    const amount = amounts[stage as keyof typeof amounts] || 0;
    return `Payment released! GH₵ ${amount.toFixed(2)} for order #${orderDetails.orderNumber} has been transferred to your account.`;
  }

  private getPaymentConfirmationMessage(stage: EscrowStage, orderDetails: any): string {
    const actions = {
      'FITTING': 'fitting approval',
      'FINAL': 'delivery confirmation'
    };

    const action = actions[stage as keyof typeof actions] || 'milestone completion';
    return `Payment released to tailor for order #${orderDetails.orderNumber} following your ${action}. Thank you!`;
  }

  private getApprovalNeededMessage(stage: EscrowStage, orderDetails: any): string {
    const messages = {
      'FITTING': `Your fitting photos for order #${orderDetails.orderNumber} are ready! Please review and approve to release payment to your tailor.`,
      'FINAL': `Your garment for order #${orderDetails.orderNumber} is ready for delivery. Confirm receipt to complete your order.`
    };

    return messages[stage] || 'Your approval is needed for order progression.';
  }

  /**
   * Schedule a notification for future delivery
   */
  private async scheduleNotification(notification: EscrowNotification): Promise<void> {
    // This would integrate with your notification queue/scheduler
    // For now, we'll log the scheduled notification
    console.log('Scheduled notification:', {
      type: notification.type,
      recipient: notification.recipient,
      scheduledFor: notification.scheduledFor,
      message: notification.message
    });

    // In a real implementation, you would:
    // 1. Store in notification queue (Redis, database, etc.)
    // 2. Use a job scheduler (Bull Queue, Agenda, etc.)
    // 3. Integrate with SMS/WhatsApp/Email services
  }

  /**
   * Send notification immediately
   */
  private async sendNotification(notification: EscrowNotification): Promise<void> {
    try {
      // This would integrate with your notification services
      // For now, we'll simulate sending
      console.log('Sending notification:', {
        type: notification.type,
        recipient: notification.recipient,
        message: notification.message
      });

      // In a real implementation, you would:
      // 1. Route to appropriate service (SMS, WhatsApp, Email)
      // 2. Handle delivery failures and retries
      // 3. Track delivery status and user preferences
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Get order details for notification context
   */
  private async getOrderDetails(orderId: string): Promise<any | null> {
    // This would fetch from your order service
    // Returning mock data for now
    return {
      orderNumber: orderId.slice(-8).toUpperCase(),
      customerName: 'Customer',
      customerPhone: '+233241234567',
      tailorName: 'Tailor',
      tailorPhone: '+233501234567',
      depositAmount: 250,
      fittingAmount: 500,
      finalAmount: 250,
      totalAmount: 1000
    };
  }

  /**
   * Get orders that are overdue for milestone progression
   */
  private async getOverdueOrders(): Promise<any[]> {
    // This would query your database for overdue orders
    // Based on business rules for expected milestone timeframes
    return [];
  }

  /**
   * Send overdue notification
   */
  private async sendOverdueNotification(order: any): Promise<void> {
    // Implementation for overdue notifications
    console.log('Sending overdue notification for order:', order.id);
  }
}