/**
 * Notification Service
 * Handles in-app, WhatsApp, SMS, and email notifications
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WhatsAppService } from './whatsapp-integration.service';

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PROGRESS_UPDATE = 'progress_update',
  DESIGN_SUGGESTION = 'design_suggestion',
  MESSAGE_RECEIVED = 'message_received',
  COMPLETION = 'completion',
  PAYMENT_REMINDER = 'payment_reminder',
  FITTING_REMINDER = 'fitting_reminder'
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('in-app' | 'whatsapp' | 'sms' | 'email')[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationPreferences {
  inApp: boolean;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export class NotificationService {
  private whatsappService: WhatsAppService;

  constructor() {
    this.whatsappService = new WhatsAppService();
  }

  /**
   * Send notification to user via specified channels
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const supabase = createServerSupabaseClient();

    // Get user preferences and contact info
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, email, notification_preferences')
      .eq('id', payload.userId)
      .single();

    if (!profile) {
      console.error('User not found:', payload.userId);
      return;
    }

    const preferences = profile.notification_preferences || {
      inApp: true,
      whatsapp: true,
      sms: true,
      email: true
    };

    // Send via each requested channel
    const sendPromises = [];

    // In-app notification
    if (payload.channels.includes('in-app') && preferences.inApp) {
      sendPromises.push(this.sendInAppNotification(payload));
    }

    // WhatsApp notification
    if (payload.channels.includes('whatsapp') && preferences.whatsapp && profile.phone_number) {
      sendPromises.push(this.sendWhatsAppNotification(payload, profile.phone_number));
    }

    // SMS notification (fallback if WhatsApp fails)
    if (payload.channels.includes('sms') && preferences.sms && profile.phone_number) {
      sendPromises.push(this.sendSMSNotification(payload, profile.phone_number));
    }

    // Email notification
    if (payload.channels.includes('email') && preferences.email && profile.email) {
      sendPromises.push(this.sendEmailNotification(payload, profile.email));
    }

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(payload: NotificationPayload): Promise<void> {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        priority: payload.priority || 'normal',
        read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error sending in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(
    payload: NotificationPayload,
    phoneNumber: string
  ): Promise<void> {
    try {
      await this.whatsappService.sendMessage({
        to: phoneNumber,
        templateType: this.getWhatsAppTemplateType(payload.type),
        message: `${payload.title}\n\n${payload.message}`
      });
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      // Fallback to SMS if WhatsApp fails
      await this.sendSMSNotification(payload, phoneNumber);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    payload: NotificationPayload,
    phoneNumber: string
  ): Promise<void> {
    // TODO: Integrate with Twilio SMS API
    console.log('SMS would be sent to:', phoneNumber, payload.message);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    payload: NotificationPayload,
    email: string
  ): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Email would be sent to:', email, payload.message);
  }

  /**
   * Bulk send notifications to multiple users
   */
  async sendBulkNotifications(
    userIds: string[],
    notification: Omit<NotificationPayload, 'userId'>
  ): Promise<void> {
    const sendPromises = userIds.map(userId =>
      this.sendNotification({
        ...notification,
        userId
      })
    );

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send notification to all group order participants
   */
  async notifyGroupOrderParticipants(
    groupOrderId: string,
    notification: Omit<NotificationPayload, 'userId'>
  ): Promise<void> {
    const supabase = createServerSupabaseClient();

    // Get all participants
    const { data: items } = await supabase
      .from('group_order_items')
      .select('payment_responsibility')
      .eq('group_order_id', groupOrderId);

    if (!items) return;

    const participantIds = [...new Set(items.map(i => i.payment_responsibility))];
    await this.sendBulkNotifications(participantIds, notification);
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[]): Promise<void> {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get WhatsApp template type based on notification type
   */
  private getWhatsAppTemplateType(type: NotificationType): any {
    const mapping = {
      [NotificationType.ORDER_UPDATE]: 'ORDER_UPDATE',
      [NotificationType.PROGRESS_UPDATE]: 'PROGRESS_UPDATE',
      [NotificationType.DESIGN_SUGGESTION]: 'CUSTOM',
      [NotificationType.MESSAGE_RECEIVED]: 'CUSTOM',
      [NotificationType.COMPLETION]: 'ORDER_COMPLETION',
      [NotificationType.PAYMENT_REMINDER]: 'PAYMENT_REMINDER',
      [NotificationType.FITTING_REMINDER]: 'CUSTOM'
    };

    return mapping[type] || 'CUSTOM';
  }

  /**
   * Helper: Notify on progress update
   */
  async notifyProgressUpdate(
    userId: string,
    orderNumber: string,
    status: string,
    progressPercentage: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.PROGRESS_UPDATE,
      title: 'Order Progress Update',
      message: `Your order ${orderNumber} is now ${status}. ${progressPercentage}% complete.`,
      data: { orderNumber, status, progressPercentage },
      channels: ['in-app', 'whatsapp'],
      priority: 'normal'
    });
  }

  /**
   * Helper: Notify on completion
   */
  async notifyCompletion(
    userId: string,
    orderNumber: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.COMPLETION,
      title: 'Order Complete! 🎉',
      message: `Great news! Your order ${orderNumber} is complete and ready for pickup/delivery.`,
      data: { orderNumber },
      channels: ['in-app', 'whatsapp', 'sms'],
      priority: 'high'
    });
  }

  /**
   * Helper: Notify on design suggestion
   */
  async notifyDesignSuggestion(
    userId: string,
    tailorName: string,
    groupOrderName: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.DESIGN_SUGGESTION,
      title: 'New Design Suggestion',
      message: `${tailorName} has submitted a design suggestion for your group order "${groupOrderName}". Review it now!`,
      data: { tailorName, groupOrderName },
      channels: ['in-app', 'whatsapp'],
      priority: 'normal'
    });
  }
}
