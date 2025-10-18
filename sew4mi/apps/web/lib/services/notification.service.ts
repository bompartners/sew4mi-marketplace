/**
 * Notification Service
 * Handles in-app, WhatsApp, SMS, and email notifications
 */

import { createClientSupabaseClient } from '@/lib/supabase';
import { WhatsAppIntegrationService } from './whatsapp-integration.service';

export enum NotificationPermission {
  DEFAULT = 'default',
  GRANTED = 'granted',
  DENIED = 'denied'
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PROGRESS_UPDATE = 'progress_update',
  DESIGN_SUGGESTION = 'design_suggestion',
  MESSAGE_RECEIVED = 'message_received',
  COMPLETION = 'completion',
  PAYMENT_REMINDER = 'payment_reminder',
  FITTING_REMINDER = 'fitting_reminder',
  MILESTONE_UPDATE = 'milestone_update',
  DELIVERY_READY = 'delivery_ready'
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
  private whatsappService: WhatsAppIntegrationService;

  constructor() {
    this.whatsappService = new WhatsAppIntegrationService();
  }

  /**
   * Send notification to user via specified channels
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const supabase = createClientSupabaseClient();

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
    const supabase = createClientSupabaseClient();

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
    const supabase = createClientSupabaseClient();

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
    const supabase = createClientSupabaseClient();

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
    const supabase = createClientSupabaseClient();

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

  /**
   * Initialize browser notification support
   */
  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined') return NotificationPermission.DEFAULT;
    if (!('Notification' in window)) return NotificationPermission.DEFAULT;
    
    const permission = window.Notification.permission;
    return permission as NotificationPermission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined') return NotificationPermission.DEFAULT;
    if (!('Notification' in window)) return NotificationPermission.DEFAULT;

    try {
      const permission = await window.Notification.requestPermission();
      return permission as NotificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return NotificationPermission.DEFAULT;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (typeof window === 'undefined') return null;
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return existingSubscription;
      }

      // Subscribe to push
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return null;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription })
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(userId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      }

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  /**
   * Send local browser notification
   */
  async sendLocalNotification(options: {
    title: string;
    body: string;
    icon?: string;
    type: NotificationType;
    orderId?: string;
    url?: string;
  }): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    if (window.Notification.permission !== 'granted') return false;

    try {
      const notification = new window.Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/notification.png',
        badge: '/icons/badge.png',
        tag: options.orderId || 'general',
        data: {
          type: options.type,
          orderId: options.orderId,
          url: options.url
        }
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return false;
    }
  }

  /**
   * Test notification
   */
  async testNotification(): Promise<boolean> {
    return this.sendLocalNotification({
      title: 'Test Notification',
      body: 'If you can see this, notifications are working! 🎉',
      type: NotificationType.ORDER_UPDATE,
      url: '/dashboard'
    });
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: any
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
