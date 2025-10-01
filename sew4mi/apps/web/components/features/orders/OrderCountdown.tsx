/**
 * OrderCountdown component for displaying estimated delivery countdown
 * Features real-time countdown, urgency indicators, and Ghana-themed styling
 * @file OrderCountdown.tsx
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Props for OrderCountdown component
 */
interface OrderCountdownProps {
  /** Estimated completion date */
  estimatedCompletion?: Date;
  /** Order creation date for elapsed time calculation */
  orderCreatedAt?: Date;
  /** Whether countdown is active (order in progress) */
  isActive?: boolean;
  /** Whether to show detailed breakdown */
  showDetails?: boolean;
  /** Whether to show notification settings */
  showNotifications?: boolean;
  /** Callback when notification preferences are clicked */
  onNotificationSettings?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Time unit interface
 */
interface TimeUnit {
  label: string;
  value: number;
  unit: string;
}

/**
 * Calculate time remaining until target date
 */
function calculateTimeRemaining(targetDate: Date): {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
} {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  
  const totalSeconds = Math.floor(absDiffMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return {
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    isOverdue
  };
}

/**
 * Calculate elapsed time since order creation
 */
function calculateElapsedTime(startDate: Date): {
  days: number;
  hours: number;
  totalHours: number;
} {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return { days, hours, totalHours };
}

/**
 * Get urgency level based on time remaining
 */
function getUrgencyLevel(timeRemaining: ReturnType<typeof calculateTimeRemaining>) {
  if (timeRemaining.isOverdue) return 'overdue';
  if (timeRemaining.days === 0) return 'critical';
  if (timeRemaining.days <= 2) return 'urgent';
  if (timeRemaining.days <= 7) return 'moderate';
  return 'normal';
}

/**
 * OrderCountdown Component
 * Real-time countdown to estimated delivery date
 */
export function OrderCountdown({
  estimatedCompletion,
  orderCreatedAt,
  isActive = true,
  showDetails = true,
  showNotifications = false,
  onNotificationSettings,
  className
}: OrderCountdownProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);

  // Update time every second for real-time countdown
  useEffect(() => {
    setIsClient(true);
    
    if (!isActive || !estimatedCompletion) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, estimatedCompletion]);

  // Handle notification settings
  const handleNotificationClick = useCallback(() => {
    onNotificationSettings?.();
  }, [onNotificationSettings]);

  if (!isClient || !estimatedCompletion) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Estimated completion date not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeRemaining = calculateTimeRemaining(estimatedCompletion);
  const urgencyLevel = getUrgencyLevel(timeRemaining);
  const elapsedTime = orderCreatedAt ? calculateElapsedTime(orderCreatedAt) : null;

  // Urgency configurations
  const urgencyConfigs = {
    overdue: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor: 'bg-red-100 text-red-800',
      icon: AlertTriangle,
      title: 'Overdue',
      message: 'This order is past its estimated completion date'
    },
    critical: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor: 'bg-red-100 text-red-800',
      icon: AlertTriangle,
      title: 'Due Today',
      message: 'Order is due for completion today'
    },
    urgent: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      badgeColor: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      title: 'Due Soon',
      message: 'Order is due within the next few days'
    },
    moderate: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-100 text-blue-800',
      icon: Calendar,
      title: 'On Schedule',
      message: 'Order is progressing on schedule'
    },
    normal: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      title: 'On Track',
      message: 'Plenty of time until completion'
    }
  };

  const config = urgencyConfigs[urgencyLevel];
  const UrgencyIcon = config.icon;

  // Format display units
  const displayUnits: TimeUnit[] = [
    { label: 'Days', value: timeRemaining.days, unit: 'd' },
    { label: 'Hours', value: timeRemaining.hours, unit: 'h' },
    { label: 'Minutes', value: timeRemaining.minutes, unit: 'm' }
  ];

  // Only show seconds for critical/overdue situations
  if (urgencyLevel === 'critical' || urgencyLevel === 'overdue') {
    displayUnits.push({ label: 'Seconds', value: timeRemaining.seconds, unit: 's' });
  }

  return (
    <Card className={cn('w-full', config.borderColor, className)}>
      <CardHeader className={cn('pb-3', config.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UrgencyIcon className={cn('h-6 w-6', config.color)} />
            <div>
              <CardTitle className={cn('text-lg', config.color)}>
                {timeRemaining.isOverdue ? 'Overdue' : 'Delivery Countdown'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{config.message}</p>
            </div>
          </div>
          
          <Badge className={cn('text-sm', config.badgeColor)} variant="outline">
            {config.title}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Countdown Display */}
        <div className="text-center py-4">
          {timeRemaining.days > 0 ? (
            // Show days and hours for longer durations
            <div className="space-y-2">
              <div className={cn('text-4xl font-bold', config.color)}>
                {timeRemaining.days}
              </div>
              <div className="text-lg text-gray-600">
                day{timeRemaining.days !== 1 ? 's' : ''} 
                {timeRemaining.hours > 0 && `, ${timeRemaining.hours} hour${timeRemaining.hours !== 1 ? 's' : ''}`}
              </div>
              <div className="text-sm text-gray-500">
                {timeRemaining.isOverdue ? 'past deadline' : 'until completion'}
              </div>
            </div>
          ) : (
            // Show hours and minutes for same-day
            <div className="grid grid-cols-2 gap-4">
              {displayUnits.filter(unit => unit.value > 0 || unit.label === 'Minutes').slice(0, 2).map((unit) => (
                <div key={unit.label} className="text-center">
                  <div className={cn('text-3xl font-bold', config.color)}>
                    {unit.value.toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-600 uppercase tracking-wide">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target Date */}
        <div className="text-center border-t pt-4">
          <p className="text-sm text-gray-500 mb-1">
            {timeRemaining.isOverdue ? 'Was due on' : 'Expected completion'}
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {estimatedCompletion.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'Africa/Accra'
            })}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            at {estimatedCompletion.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'Africa/Accra'
            })} (Ghana Time)
          </p>
        </div>

        {/* Additional Details */}
        {showDetails && (
          <div className="space-y-3 border-t pt-4">
            {/* Elapsed Time */}
            {elapsedTime && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time since order:</span>
                <span className="font-medium">
                  {elapsedTime.days > 0 ? 
                    `${elapsedTime.days} day${elapsedTime.days !== 1 ? 's' : ''}, ${elapsedTime.hours} hour${elapsedTime.hours !== 1 ? 's' : ''}` :
                    `${elapsedTime.hours} hour${elapsedTime.hours !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
            )}

            {/* Urgency Indicator */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Priority level:</span>
              <Badge size="sm" className={cn('text-xs', config.badgeColor)} variant="outline">
                {config.title}
              </Badge>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {showNotifications && onNotificationSettings && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNotificationClick}
              className="w-full gap-2"
            >
              <Bell className="h-4 w-4" />
              Notification Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderCountdown;