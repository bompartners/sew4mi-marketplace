/**
 * NotificationSettings component for managing push notification preferences
 * Features permission requests, preference toggles, and testing functionality
 * @file NotificationSettings.tsx
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Check, X, Smartphone, MessageSquare, Package, CreditCard, TestTube, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { OrderNotificationPreferences } from '@sew4mi/shared/types/order-creation';
import { notificationService, NotificationPermission, NotificationType } from '@/lib/services/notification.service';

/**
 * Props for NotificationSettings component
 */
interface NotificationSettingsProps {
  /** User ID */
  userId: string;
  /** Current notification preferences */
  preferences?: OrderNotificationPreferences;
  /** Callback when preferences change */
  onPreferencesChange?: (preferences: OrderNotificationPreferences) => void;
  /** Whether to show test functionality */
  showTestOptions?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Notification category configuration
 */
interface NotificationCategory {
  key: keyof OrderNotificationPreferences;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string[];
}

/**
 * Notification test configuration
 */
interface NotificationTest {
  type: NotificationType;
  title: string;
  description: string;
  payload: {
    title: string;
    body: string;
    icon?: string;
  };
}

/**
 * NotificationSettings Component
 * Manages push notification preferences and permissions
 */
export function NotificationSettings({
  userId,
  preferences: initialPreferences,
  onPreferencesChange,
  showTestOptions = false,
  className
}: NotificationSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>(NotificationPermission.DEFAULT);
  const [isInitialized, setIsInitialized] = useState(false);
  const [preferences, setPreferences] = useState<OrderNotificationPreferences>(
    initialPreferences || {
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
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | null }>({});

  // Notification categories
  const categories: NotificationCategory[] = [
    {
      key: 'orderStatusUpdates',
      title: 'Order Status Updates',
      description: 'Get notified when your order status changes',
      icon: Package,
      examples: ['Order confirmed', 'Production started', 'Order completed']
    },
    {
      key: 'milestoneUpdates',
      title: 'Milestone Updates',
      description: 'Notifications for milestone progress and photos',
      icon: Check,
      examples: ['New milestone photos', 'Milestone approved', 'Fitting ready']
    },
    {
      key: 'paymentReminders',
      title: 'Payment Reminders',
      description: 'Reminders for upcoming payments',
      icon: CreditCard,
      examples: ['Fitting payment due', 'Final payment reminder']
    },
    {
      key: 'deliveryNotifications',
      title: 'Delivery Updates',
      description: 'Notifications about delivery and pickup',
      icon: Package,
      examples: ['Ready for pickup', 'Delivery scheduled', 'Order delivered']
    }
  ];

  // Test notification configurations
  const testNotifications: NotificationTest[] = [
    {
      type: NotificationType.MILESTONE_UPDATE,
      title: 'Milestone Update',
      description: 'Test milestone progress notification',
      payload: {
        title: 'New Milestone Photo! 📸',
        body: 'Your tailor has uploaded photos of fabric selection. Tap to view!',
        icon: '/icons/milestone.png'
      }
    },
    {
      type: NotificationType.PAYMENT_REMINDER,
      title: 'Payment Reminder',
      description: 'Test payment due notification',
      payload: {
        title: 'Payment Reminder 💳',
        body: 'Your fitting payment of GH₵ 150 is due in 2 days.',
        icon: '/icons/payment.png'
      }
    },
    {
      type: NotificationType.DELIVERY_READY,
      title: 'Delivery Ready',
      description: 'Test delivery notification',
      payload: {
        title: 'Your Garment is Ready! 🎉',
        body: 'Your custom dress is complete and ready for pickup.',
        icon: '/icons/delivery.png'
      }
    }
  ];

  // Initialize notification service
  useEffect(() => {
    const initializeService = async () => {
      const initialized = await notificationService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        const currentPermission = notificationService.getPermissionStatus();
        setPermission(currentPermission);
      }
    };

    initializeService();
  }, []);

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);

      if (newPermission === NotificationPermission.GRANTED) {
        // Subscribe to push notifications
        const subscription = await notificationService.subscribeToPush(userId);
        if (subscription) {
          // Enable push notifications in preferences
          const updatedPreferences = {
            ...preferences,
            pushNotifications: true
          };
          setPreferences(updatedPreferences);
          onPreferencesChange?.(updatedPreferences);
        }
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, preferences, onPreferencesChange]);

  // Handle preference toggle
  const handlePreferenceToggle = useCallback(async (key: keyof OrderNotificationPreferences, value: boolean) => {
    const updatedPreferences = {
      ...preferences,
      [key]: value
    };

    setPreferences(updatedPreferences);

    // Save preferences
    try {
      setIsLoading(true);
      const success = await notificationService.updateNotificationPreferences(userId, updatedPreferences);
      if (success) {
        onPreferencesChange?.(updatedPreferences);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsLoading(false);
    }
  }, [userId, preferences, onPreferencesChange]);

  // Handle push notification toggle
  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await handleRequestPermission();
    } else {
      // Unsubscribe from push notifications
      const success = await notificationService.unsubscribeFromPush(userId);
      if (success) {
        const updatedPreferences = {
          ...preferences,
          pushNotifications: false
        };
        setPreferences(updatedPreferences);
        onPreferencesChange?.(updatedPreferences);
      }
    }
  }, [handleRequestPermission, userId, preferences, onPreferencesChange]);

  // Test notification
  const handleTestNotification = useCallback(async (test: NotificationTest) => {
    setTestResults(prev => ({ ...prev, [test.type]: null }));
    
    try {
      const success = await notificationService.sendLocalNotification({
        ...test.payload,
        type: test.type,
        orderId: 'test-order-123',
        url: '/dashboard'
      });

      setTestResults(prev => ({ ...prev, [test.type]: success }));
    } catch (error) {
      console.error('Test notification failed:', error);
      setTestResults(prev => ({ ...prev, [test.type]: false }));
    }
  }, []);

  // Run general test
  const handleGeneralTest = useCallback(async () => {
    setTestResults(prev => ({ ...prev, general: null }));
    
    try {
      const success = await notificationService.testNotification();
      setTestResults(prev => ({ ...prev, general: success }));
    } catch (error) {
      console.error('General test failed:', error);
      setTestResults(prev => ({ ...prev, general: false }));
    }
  }, []);

  const getPermissionBadge = () => {
    switch (permission) {
      case NotificationPermission.GRANTED:
        return <Badge className="bg-green-100 text-green-800 border-green-200">Enabled</Badge>;
      case NotificationPermission.DENIED:
        return <Badge className="bg-red-100 text-red-800 border-red-200">Blocked</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Not Set</Badge>;
    }
  };

  if (!isInitialized) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Notifications not supported on this device</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          {getPermissionBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Permission Status */}
        {permission !== NotificationPermission.GRANTED && (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              {permission === NotificationPermission.DENIED ? (
                <>
                  Push notifications are blocked. Please enable them in your browser settings to receive real-time updates.
                </>
              ) : (
                <>
                  Enable push notifications to get real-time updates about your orders, even when the app is closed.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Push Notifications Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <div>
              <Label className="text-base font-medium">Push Notifications</Label>
              <p className="text-sm text-gray-600 mt-1">
                Receive notifications even when the app is closed
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.pushNotifications && permission === NotificationPermission.GRANTED}
            onCheckedChange={handlePushToggle}
            disabled={isLoading}
          />
        </div>

        <Separator />

        {/* Notification Categories */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notification Types</h3>
          
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <div>
                      <Label className="text-base font-medium">{category.title}</Label>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[category.key] as boolean}
                    onCheckedChange={(checked) => handlePreferenceToggle(category.key, checked)}
                    disabled={isLoading}
                  />
                </div>
                
                {/* Examples */}
                <div className="ml-8 text-xs text-gray-500">
                  Examples: {category.examples.join(', ')}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Traditional Notification Methods */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Other Notification Methods</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <Label className="text-sm">WhatsApp</Label>
              </div>
              <Switch
                checked={preferences.whatsapp}
                onCheckedChange={(checked) => handlePreferenceToggle('whatsapp', checked)}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <Label className="text-sm">SMS</Label>
              </div>
              <Switch
                checked={preferences.sms}
                onCheckedChange={(checked) => handlePreferenceToggle('sms', checked)}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-600" />
                <Label className="text-sm">Email</Label>
              </div>
              <Switch
                checked={preferences.email}
                onCheckedChange={(checked) => handlePreferenceToggle('email', checked)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Test Section */}
        {showTestOptions && permission === NotificationPermission.GRANTED && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Notifications
              </h3>
              
              {/* General Test */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-base">General Test</Label>
                  <p className="text-sm text-gray-600">Send a basic test notification</p>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.general === true && <Check className="h-4 w-4 text-green-600" />}
                  {testResults.general === false && <X className="h-4 w-4 text-red-600" />}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGeneralTest}
                    disabled={isLoading}
                  >
                    Test
                  </Button>
                </div>
              </div>

              {/* Specific Tests */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testNotifications.map((test) => (
                  <div key={test.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="text-sm">{test.title}</Label>
                      <p className="text-xs text-gray-600">{test.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {testResults[test.type] === true && <Check className="h-4 w-4 text-green-600" />}
                      {testResults[test.type] === false && <X className="h-4 w-4 text-red-600" />}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestNotification(test)}
                        disabled={isLoading}
                        className="text-xs"
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;