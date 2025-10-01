/**
 * useNotifications hook for managing push notification state
 * Provides functionality for permission handling, subscription management, and real-time updates
 * @file useNotifications.ts
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, NotificationPermission, NotificationType, PushNotificationPayload } from '@/lib/services/notification.service';
import { OrderNotificationPreferences } from '@sew4mi/shared/types/order-creation';

/**
 * Notification hook state
 */
interface UseNotificationsState {
  permission: NotificationPermission;
  isSupported: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  preferences: OrderNotificationPreferences | null;
  subscription: PushSubscription | null;
}

/**
 * Notification hook return type
 */
interface UseNotificationsReturn extends UseNotificationsState {
  // Permission methods
  requestPermission: () => Promise<boolean>;
  checkPermission: () => NotificationPermission;
  
  // Subscription methods
  subscribe: (userId: string) => Promise<boolean>;
  unsubscribe: (userId: string) => Promise<boolean>;
  getSubscription: () => Promise<PushSubscription | null>;
  
  // Preferences methods
  updatePreferences: (userId: string, preferences: OrderNotificationPreferences) => Promise<boolean>;
  
  // Notification methods
  sendLocalNotification: (payload: PushNotificationPayload) => Promise<boolean>;
  testNotification: () => Promise<boolean>;
  
  // Utility methods
  initialize: () => Promise<boolean>;
  reset: () => void;
}

/**
 * Default notification preferences
 */
const defaultPreferences = (userId: string): OrderNotificationPreferences => ({
  userId,
  sms: true,
  email: true,
  whatsapp: true,
  orderStatusUpdates: true,
  milestoneUpdates: true,
  paymentReminders: true,
  deliveryNotifications: true,
  inAppNotifications: true,
  pushNotifications: false
});

/**
 * useNotifications hook
 * Manages push notification state and operations
 */
export function useNotifications(userId?: string): UseNotificationsReturn {
  const [state, setState] = useState<UseNotificationsState>({
    permission: NotificationPermission.DEFAULT,
    isSupported: false,
    isInitialized: false,
    isLoading: false,
    error: null,
    preferences: userId ? defaultPreferences(userId) : null,
    subscription: null
  });

  const initializationPromise = useRef<Promise<boolean> | null>(null);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<UseNotificationsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Initialize notification service
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    // Prevent multiple initializations
    if (initializationPromise.current) {
      return initializationPromise.current;
    }

    initializationPromise.current = (async () => {
      try {
        updateState({ isLoading: true, error: null });

        // Check if notifications are supported
        const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        if (!isSupported) {
          updateState({
            isSupported: false,
            isInitialized: true,
            isLoading: false
          });
          return false;
        }

        // Initialize service
        const initialized = await notificationService.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize notification service');
        }

        // Get current permission and subscription
        const permission = notificationService.getPermissionStatus();
        const subscription = await notificationService.getCurrentSubscription();

        updateState({
          isSupported: true,
          isInitialized: true,
          permission,
          subscription,
          isLoading: false
        });

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateState({
          error: errorMessage,
          isLoading: false,
          isInitialized: true
        });
        return false;
      }
    })();

    return initializationPromise.current;
  }, [updateState]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });

      const permission = await notificationService.requestPermission();
      updateState({ permission });

      return permission === NotificationPermission.GRANTED;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission request failed';
      updateState({ error: errorMessage });
      return false;
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  /**
   * Check current permission status
   */
  const checkPermission = useCallback((): NotificationPermission => {
    const permission = notificationService.getPermissionStatus();
    updateState({ permission });
    return permission;
  }, [updateState]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (userId: string): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });

      const subscription = await notificationService.subscribeToPush(userId);
      if (subscription) {
        const pushSubscription = await notificationService.getCurrentSubscription();
        updateState({ 
          subscription: pushSubscription,
          preferences: prev => prev ? { ...prev, pushNotifications: true } : null
        });
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Subscription failed';
      updateState({ error: errorMessage });
      return false;
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (userId: string): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });

      const success = await notificationService.unsubscribeFromPush(userId);
      if (success) {
        updateState({ 
          subscription: null,
          preferences: prev => prev ? { ...prev, pushNotifications: false } : null
        });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unsubscribe failed';
      updateState({ error: errorMessage });
      return false;
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  /**
   * Get current push subscription
   */
  const getSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    try {
      const subscription = await notificationService.getCurrentSubscription();
      updateState({ subscription });
      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get subscription';
      updateState({ error: errorMessage });
      return null;
    }
  }, [updateState]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (
    userId: string, 
    preferences: OrderNotificationPreferences
  ): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });

      const success = await notificationService.updateNotificationPreferences(userId, preferences);
      if (success) {
        updateState({ preferences });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
      updateState({ error: errorMessage });
      return false;
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  /**
   * Send local test notification
   */
  const sendLocalNotification = useCallback(async (payload: PushNotificationPayload): Promise<boolean> => {
    try {
      updateState({ error: null });
      return await notificationService.sendLocalNotification(payload);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send notification';
      updateState({ error: errorMessage });
      return false;
    }
  }, [updateState]);

  /**
   * Send test notification
   */
  const testNotification = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ error: null });
      return await notificationService.testNotification();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test notification failed';
      updateState({ error: errorMessage });
      return false;
    }
  }, [updateState]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      permission: NotificationPermission.DEFAULT,
      isSupported: false,
      isInitialized: false,
      isLoading: false,
      error: null,
      preferences: userId ? defaultPreferences(userId) : null,
      subscription: null
    });
    initializationPromise.current = null;
  }, [userId]);

  // Auto-initialize when userId changes
  useEffect(() => {
    if (userId && !state.isInitialized && !initializationPromise.current) {
      initialize();
    }
  }, [userId, state.isInitialized, initialize]);

  // Update preferences when userId changes
  useEffect(() => {
    if (userId && (!state.preferences || state.preferences.userId !== userId)) {
      updateState({ preferences: defaultPreferences(userId) });
    }
  }, [userId, state.preferences, updateState]);

  // Listen for visibility changes to refresh subscription status
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state.isInitialized) {
        getSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isInitialized, getSubscription]);

  return {
    // State
    ...state,
    
    // Permission methods
    requestPermission,
    checkPermission,
    
    // Subscription methods
    subscribe,
    unsubscribe,
    getSubscription,
    
    // Preferences methods
    updatePreferences,
    
    // Notification methods
    sendLocalNotification,
    testNotification,
    
    // Utility methods
    initialize,
    reset
  };
}

export default useNotifications;