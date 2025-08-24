/**
 * Real-time milestone notification hook using Supabase realtime
 * @file useMilestoneNotifications.ts
 */

"use client"

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { OrderMilestone } from '@sew4mi/shared';

interface MilestoneNotification {
  id: string;
  type: 'milestone_submitted' | 'milestone_approved' | 'milestone_rejected' | 'auto_approval_warning';
  milestone: OrderMilestone;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface UseMilestoneNotificationsProps {
  orderId: string;
  userId: string;
  userRole: 'customer' | 'tailor' | 'admin';
  onNotification?: (notification: MilestoneNotification) => void;
}

interface UseMilestoneNotificationsReturn {
  notifications: MilestoneNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  isConnected: boolean;
}

/**
 * Hook for real-time milestone notifications
 */
export function useMilestoneNotifications({
  orderId,
  userId,
  userRole,
  onNotification
}: UseMilestoneNotificationsProps): UseMilestoneNotificationsReturn {
  const [notifications, setNotifications] = useState<MilestoneNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  // Add new notification
  const addNotification = useCallback((notification: MilestoneNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep max 50 notifications
    onNotification?.(notification);
  }, [onNotification]);

  // Create notification from milestone change
  const createNotificationFromMilestone = useCallback((
    milestone: OrderMilestone,
    changeType: 'submitted' | 'approved' | 'rejected',
    previousStatus?: string
  ): MilestoneNotification | null => {
    const milestoneLabel = milestone.milestone.replace(/_/g, ' ').toLowerCase();
    let message = '';
    let type: MilestoneNotification['type'];

    switch (changeType) {
      case 'submitted':
        if (userRole === 'customer') {
          message = `New milestone "${milestoneLabel}" submitted for your review`;
          type = 'milestone_submitted';
        } else {
          return null; // Tailors don't need to be notified of their own submissions
        }
        break;
      
      case 'approved':
        if (userRole === 'tailor') {
          message = `Milestone "${milestoneLabel}" approved by customer`;
          type = 'milestone_approved';
        } else if (userRole === 'customer') {
          message = `You approved milestone "${milestoneLabel}"`;
          type = 'milestone_approved';
        } else {
          return null;
        }
        break;
      
      case 'rejected':
        if (userRole === 'tailor') {
          message = `Milestone "${milestoneLabel}" rejected by customer`;
          type = 'milestone_rejected';
        } else if (userRole === 'customer') {
          message = `You rejected milestone "${milestoneLabel}"`;
          type = 'milestone_rejected';
        } else {
          return null;
        }
        break;
      
      default:
        return null;
    }

    return {
      id: `milestone-${milestone.id}-${Date.now()}`,
      type,
      milestone,
      message,
      timestamp: new Date(),
      read: false
    };
  }, [userRole]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear specific notification
  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Set up real-time subscription
  useEffect(() => {
    if (!orderId || !userId) return;

    let milestoneChannel: any;
    let notificationChannel: any;

    const setupRealtimeSubscriptions = async () => {
      try {
        // Subscribe to milestone changes
        milestoneChannel = supabase
          .channel(`milestones-${orderId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'order_milestones',
              filter: `order_id=eq.${orderId}`
            },
            (payload) => {
              console.log('Milestone change received:', payload);
              
              if (payload.eventType === 'UPDATE') {
                const milestone = payload.new as OrderMilestone;
                const oldMilestone = payload.old as OrderMilestone;
                
                // Determine what changed
                if (milestone.verifiedAt && !oldMilestone.verifiedAt) {
                  // Milestone was submitted
                  const notification = createNotificationFromMilestone(milestone, 'submitted');
                  if (notification) addNotification(notification);
                } else if (milestone.approvalStatus !== oldMilestone.approvalStatus) {
                  // Approval status changed
                  if (milestone.approvalStatus === 'APPROVED') {
                    const notification = createNotificationFromMilestone(milestone, 'approved');
                    if (notification) addNotification(notification);
                  } else if (milestone.approvalStatus === 'REJECTED') {
                    const notification = createNotificationFromMilestone(milestone, 'rejected');
                    if (notification) addNotification(notification);
                  }
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('Milestone channel status:', status);
            setIsConnected(status === 'SUBSCRIBED');
          });

        // Subscribe to milestone notifications (for auto-approval warnings, etc.)
        notificationChannel = supabase
          .channel(`notifications-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'milestone_notifications',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              console.log('Notification received:', payload);
              
              const dbNotification = payload.new as any;
              
              // Convert to our notification format
              if (dbNotification.type === 'AUTO_APPROVAL_WARNING') {
                const notification: MilestoneNotification = {
                  id: `auto-approval-${dbNotification.id}`,
                  type: 'auto_approval_warning',
                  milestone: dbNotification.data?.milestone,
                  message: dbNotification.message || 'Milestone will auto-approve soon',
                  timestamp: new Date(dbNotification.created_at),
                  read: false
                };
                addNotification(notification);
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Error setting up realtime subscriptions:', error);
        setIsConnected(false);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup function
    return () => {
      if (milestoneChannel) {
        supabase.removeChannel(milestoneChannel);
      }
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }
      setIsConnected(false);
    };
  }, [orderId, userId, supabase, addNotification, createNotificationFromMilestone]);

  // Check for auto-approval warnings
  useEffect(() => {
    if (!orderId) return;

    const checkAutoApprovalWarnings = async () => {
      try {
        const { data: pendingMilestones, error } = await supabase
          .from('order_milestones')
          .select('*')
          .eq('order_id', orderId)
          .eq('approval_status', 'PENDING')
          .not('verified_at', 'is', null);

        if (error) {
          console.error('Error fetching pending milestones:', error);
          return;
        }

        if (pendingMilestones) {
          const now = new Date();
          
          pendingMilestones.forEach(milestone => {
            const deadline = new Date(milestone.auto_approval_deadline);
            const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            // Only notify customers about auto-approval warnings
            if (userRole === 'customer' && hoursUntil <= 6 && hoursUntil > 0) {
              const existingNotification = notifications.find(n => 
                n.type === 'auto_approval_warning' && 
                n.milestone.id === milestone.id
              );
              
              if (!existingNotification) {
                const notification: MilestoneNotification = {
                  id: `auto-approval-warning-${milestone.id}`,
                  type: 'auto_approval_warning',
                  milestone: milestone as OrderMilestone,
                  message: `Milestone "${milestone.milestone.replace(/_/g, ' ')}" will auto-approve in ${Math.floor(hoursUntil)} hours`,
                  timestamp: new Date(),
                  read: false
                };
                addNotification(notification);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error checking auto-approval warnings:', error);
      }
    };

    // Check immediately and then every 30 minutes
    checkAutoApprovalWarnings();
    const interval = setInterval(checkAutoApprovalWarnings, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [orderId, userRole, supabase, notifications, addNotification]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    isConnected
  };
}

export default useMilestoneNotifications;