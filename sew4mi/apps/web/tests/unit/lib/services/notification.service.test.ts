/**
 * Unit tests for NotificationService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService, NotificationPermission, NotificationType } from '@/lib/services/notification.service';

// Mock fetch globally
global.fetch = vi.fn();

// Mock navigator APIs
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: vi.fn(),
      ready: Promise.resolve({
        pushManager: {
          subscribe: vi.fn(),
          getSubscription: vi.fn()
        },
        showNotification: vi.fn()
      })
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  writable: true
});

// Mock window APIs
Object.defineProperty(global, 'window', {
  value: {
    PushManager: class MockPushManager {},
    Notification: {
      permission: 'default',
      requestPermission: vi.fn()
    },
    atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
    btoa: (str: string) => Buffer.from(str, 'binary').toString('base64')
  },
  writable: true
});

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get fresh instance
    notificationService = NotificationService.getInstance();
    
    // Mock successful fetch responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with supported APIs', async () => {
      const result = await notificationService.initialize();
      
      expect(result).toBe(true);
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('should fail initialization without service worker support', async () => {
      // Remove service worker support
      const originalSW = (global.navigator as any).serviceWorker;
      delete (global.navigator as any).serviceWorker;
      
      const result = await notificationService.initialize();
      
      expect(result).toBe(false);
      
      // Restore
      (global.navigator as any).serviceWorker = originalSW;
    });

    it('should fail initialization without push manager support', async () => {
      // Remove push manager support
      delete (global.window as any).PushManager;
      
      const result = await notificationService.initialize();
      
      expect(result).toBe(false);
      
      // Restore
      (global.window as any).PushManager = class MockPushManager {};
    });

    it('should handle service worker registration failure', async () => {
      (navigator.serviceWorker.register as any).mockRejectedValue(new Error('Registration failed'));
      
      const result = await notificationService.initialize();
      
      expect(result).toBe(false);
    });
  });

  describe('Permission Management', () => {
    it('should request notification permission', async () => {
      (window.Notification.requestPermission as any).mockResolvedValue('granted');
      
      const permission = await notificationService.requestPermission();
      
      expect(permission).toBe(NotificationPermission.GRANTED);
      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should return current permission status', () => {
      window.Notification.permission = 'granted';
      
      const permission = notificationService.getPermissionStatus();
      
      expect(permission).toBe(NotificationPermission.GRANTED);
    });

    it('should handle denied permission', async () => {
      (window.Notification.requestPermission as any).mockResolvedValue('denied');
      
      const permission = await notificationService.requestPermission();
      
      expect(permission).toBe(NotificationPermission.DENIED);
    });

    it('should return denied for unsupported browsers', () => {
      // Remove Notification support
      const originalNotification = (global.window as any).Notification;
      delete (global.window as any).Notification;
      
      const permission = notificationService.getPermissionStatus();
      
      expect(permission).toBe(NotificationPermission.DENIED);
      
      // Restore
      (global.window as any).Notification = originalNotification;
    });
  });

  describe('Push Subscription', () => {
    const mockUserId = 'user-123';
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      getKey: vi.fn()
    };

    beforeEach(async () => {
      // Initialize service
      await notificationService.initialize();
      
      // Mock permission granted
      window.Notification.permission = 'granted';
      (window.Notification.requestPermission as any).mockResolvedValue('granted');
      
      // Mock subscription
      mockSubscription.getKey.mockReturnValue(new ArrayBuffer(32));
      
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration.pushManager.subscribe as any).mockResolvedValue(mockSubscription);
    });

    it('should create push subscription successfully', async () => {
      const subscription = await notificationService.subscribeToPush(mockUserId);
      
      expect(subscription).toBeTruthy();
      expect(subscription?.userId).toBe(mockUserId);
      expect(subscription?.endpoint).toBe(mockSubscription.endpoint);
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/subscription', expect.any(Object));
    });

    it('should fail subscription without permission', async () => {
      window.Notification.permission = 'denied';
      
      const subscription = await notificationService.subscribeToPush(mockUserId);
      
      expect(subscription).toBeNull();
    });

    it('should handle subscription creation failure', async () => {
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration.pushManager.subscribe as any).mockRejectedValue(new Error('Subscribe failed'));
      
      const subscription = await notificationService.subscribeToPush(mockUserId);
      
      expect(subscription).toBeNull();
    });

    it('should unsubscribe successfully', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(true);
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration.pushManager.getSubscription as any).mockResolvedValue({
        unsubscribe: mockUnsubscribe
      });
      
      const result = await notificationService.unsubscribeFromPush(mockUserId);
      
      expect(result).toBe(true);
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(`/api/notifications/subscription/${mockUserId}`, {
        method: 'DELETE'
      });
    });

    it('should handle unsubscribe with no existing subscription', async () => {
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration.pushManager.getSubscription as any).mockResolvedValue(null);
      
      const result = await notificationService.unsubscribeFromPush(mockUserId);
      
      expect(result).toBe(false);
    });
  });

  describe('Local Notifications', () => {
    beforeEach(async () => {
      await notificationService.initialize();
      window.Notification.permission = 'granted';
    });

    it('should send local notification successfully', async () => {
      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration as any).showNotification = mockShowNotification;
      
      const payload = {
        title: 'Test Notification',
        body: 'This is a test',
        type: NotificationType.MILESTONE_UPDATE
      };
      
      const result = await notificationService.sendLocalNotification(payload);
      
      expect(result).toBe(true);
      expect(mockShowNotification).toHaveBeenCalledWith('Test Notification', expect.objectContaining({
        body: 'This is a test',
        icon: '/icons/icon-192x192.png'
      }));
    });

    it('should fail notification without permission', async () => {
      window.Notification.permission = 'denied';
      
      const payload = {
        title: 'Test Notification',
        body: 'This is a test',
        type: NotificationType.MILESTONE_UPDATE
      };
      
      const result = await notificationService.sendLocalNotification(payload);
      
      expect(result).toBe(false);
    });

    it('should include correct actions for milestone notifications', async () => {
      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration as any).showNotification = mockShowNotification;
      
      const payload = {
        title: 'Milestone Update',
        body: 'New photos available',
        type: NotificationType.MILESTONE_UPDATE
      };
      
      await notificationService.sendLocalNotification(payload);
      
      const callArgs = mockShowNotification.mock.calls[0][1];
      expect(callArgs.actions).toEqual([
        { action: 'view_order', title: 'View Order' },
        { action: 'view_photos', title: 'View Photos' }
      ]);
    });

    it('should send test notification successfully', async () => {
      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration as any).showNotification = mockShowNotification;
      
      const result = await notificationService.testNotification();
      
      expect(result).toBe(true);
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Sew4Mi Test Notification',
        expect.objectContaining({
          body: 'Your notifications are working perfectly! 🎉'
        })
      );
    });
  });

  describe('Preferences Management', () => {
    const mockUserId = 'user-123';
    const mockPreferences = {
      userId: mockUserId,
      sms: true,
      email: true,
      whatsapp: true,
      orderStatusUpdates: true,
      milestoneUpdates: true,
      paymentReminders: false,
      deliveryNotifications: true,
      inAppNotifications: true,
      pushNotifications: true
    };

    it('should update notification preferences successfully', async () => {
      const result = await notificationService.updateNotificationPreferences(mockUserId, mockPreferences);
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: mockUserId, ...mockPreferences })
      });
    });

    it('should handle preferences update failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500
      });
      
      const result = await notificationService.updateNotificationPreferences(mockUserId, mockPreferences);
      
      expect(result).toBe(false);
    });

    it('should register device successfully', async () => {
      const deviceToken = 'device-token-123';
      
      const result = await notificationService.registerDevice(mockUserId, deviceToken, 'web');
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: mockUserId,
          deviceToken,
          platform: 'web',
          enabled: true
        })
      });
    });
  });

  describe('Utility Functions', () => {
    it('should convert VAPID key to Uint8Array', async () => {
      await notificationService.initialize();
      
      // This tests the private method indirectly through subscription
      window.Notification.permission = 'granted';
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration.pushManager.subscribe as any).mockResolvedValue({
        endpoint: 'test',
        getKey: () => new ArrayBuffer(32)
      });
      
      const subscription = await notificationService.subscribeToPush('user-123');
      
      expect(swRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array)
      });
    });

    it('should detect platform correctly', async () => {
      // Test Android detection
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
        configurable: true
      });
      
      await notificationService.initialize();
      window.Notification.permission = 'granted';
      
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration.pushManager.subscribe as any).mockResolvedValue({
        endpoint: 'test',
        getKey: () => new ArrayBuffer(32)
      });
      
      const subscription = await notificationService.subscribeToPush('user-123');
      
      expect(subscription?.platform).toBe('android');
    });

    it('should detect iOS platform', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      await notificationService.initialize();
      window.Notification.permission = 'granted';
      
      const swRegistration = await navigator.serviceWorker.ready;
      (swRegistration.pushManager.subscribe as any).mockResolvedValue({
        endpoint: 'test',
        getKey: () => new ArrayBuffer(32)
      });
      
      const subscription = await notificationService.subscribeToPush('user-123');
      
      expect(subscription?.platform).toBe('ios');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      const result = await notificationService.updateNotificationPreferences('user-123', {
        userId: 'user-123',
        sms: true,
        email: true,
        whatsapp: true,
        orderStatusUpdates: true,
        milestoneUpdates: true,
        paymentReminders: true,
        deliveryNotifications: true,
        inAppNotifications: true,
        pushNotifications: true
      });
      
      expect(result).toBe(false);
    });

    it('should handle service worker registration errors', async () => {
      (navigator.serviceWorker.register as any).mockRejectedValue(new Error('SW registration failed'));
      
      const result = await notificationService.initialize();
      
      expect(result).toBe(false);
    });
  });
});