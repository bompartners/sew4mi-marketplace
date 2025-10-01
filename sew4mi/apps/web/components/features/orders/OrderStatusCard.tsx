/**
 * OrderStatusCard component for displaying order status summary
 * Features progress percentage, status badges, and quick actions
 * @file OrderStatusCard.tsx
 */

'use client';

import React from 'react';
import { Clock, CheckCircle, AlertTriangle, Package, MessageSquare, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { OrderStatus, OrderWithProgress } from '@sew4mi/shared/types/order-creation';
import { calculateOrderProgress } from '@sew4mi/shared/utils/order-progress';

/**
 * Props for OrderStatusCard component
 */
interface OrderStatusCardProps {
  /** Order with progress data */
  order: OrderWithProgress;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Whether to show detailed progress */
  showDetailedProgress?: boolean;
  /** Callback when view details is clicked */
  onViewDetails?: () => void;
  /** Callback when message tailor is clicked */
  onMessageTailor?: () => void;
  /** Callback when track order is clicked */
  onTrackOrder?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get status configuration for different order statuses
 */
function getStatusConfig(status: OrderStatus) {
  const configs = {
    [OrderStatus.CREATED]: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Clock,
      label: 'Order Created',
      description: 'Your order has been placed and is being processed'
    },
    [OrderStatus.DEPOSIT_PAID]: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: CheckCircle,
      label: 'Deposit Paid',
      description: 'Payment received, production will begin soon'
    },
    [OrderStatus.IN_PRODUCTION]: {
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Package,
      label: 'In Production',
      description: 'Your tailor is working on your garment'
    },
    [OrderStatus.FITTING_READY]: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: AlertTriangle,
      label: 'Fitting Ready',
      description: 'Ready for fitting - please review photos'
    },
    [OrderStatus.ADJUSTMENTS_IN_PROGRESS]: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: Package,
      label: 'Adjustments in Progress',
      description: 'Making final adjustments based on fitting'
    },
    [OrderStatus.READY_FOR_DELIVERY]: {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      badgeColor: 'bg-green-100 text-green-800 border-green-200',
      icon: Package,
      label: 'Ready for Delivery',
      description: 'Your garment is complete and ready for pickup'
    },
    [OrderStatus.DELIVERED]: {
      color: 'text-green-700',
      bgColor: 'bg-green-200',
      badgeColor: 'bg-green-200 text-green-900 border-green-300',
      icon: CheckCircle,
      label: 'Delivered',
      description: 'Order has been delivered successfully'
    },
    [OrderStatus.COMPLETED]: {
      color: 'text-green-800',
      bgColor: 'bg-green-200',
      badgeColor: 'bg-green-200 text-green-900 border-green-300',
      icon: CheckCircle,
      label: 'Completed',
      description: 'Order completed - thank you for choosing Sew4Mi!'
    },
    [OrderStatus.CANCELLED]: {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertTriangle,
      label: 'Cancelled',
      description: 'This order has been cancelled'
    },
    [OrderStatus.DISPUTED]: {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertTriangle,
      label: 'Under Dispute',
      description: 'This order is currently under dispute resolution'
    }
  };

  return configs[status] || configs[OrderStatus.CREATED];
}

/**
 * OrderStatusCard Component
 * Displays order status summary with progress and actions
 */
export function OrderStatusCard({
  order,
  showActions = true,
  showDetailedProgress = false,
  onViewDetails,
  onMessageTailor,
  onTrackOrder,
  className
}: OrderStatusCardProps) {
  const progressPercentage = calculateOrderProgress(order.milestones);
  const statusConfig = getStatusConfig(order.currentStatus);
  const StatusIcon = statusConfig.icon;

  // Calculate milestone stats
  const totalMilestones = 7; // Standard number of milestones
  const completedMilestones = order.milestones.filter(m => m.approvalStatus === 'APPROVED').length;
  const pendingMilestones = order.milestones.filter(m => m.approvalStatus === 'PENDING').length;

  // Determine urgency level
  const isUrgent = order.estimatedDaysRemaining !== undefined && order.estimatedDaysRemaining <= 2;
  const isOverdue = order.estimatedDaysRemaining !== undefined && order.estimatedDaysRemaining < 0;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', statusConfig.bgColor)}>
              <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">{statusConfig.label}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{statusConfig.description}</p>
            </div>
          </div>
          
          <Badge 
            className={cn('text-sm', statusConfig.badgeColor)}
            variant="outline"
          >
            {order.currentStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Order Progress</span>
            <span className={cn(
              'text-sm font-bold',
              progressPercentage >= 100 ? 'text-green-600' : 
              progressPercentage >= 50 ? 'text-blue-600' : 'text-gray-600'
            )}>
              {progressPercentage}%
            </span>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
          
          {showDetailedProgress && (
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-500 mt-2">
              <div className="text-center">
                <div className="font-semibold text-green-600">{completedMilestones}</div>
                <div>Completed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{pendingMilestones}</div>
                <div>In Progress</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-600">{totalMilestones - completedMilestones - pendingMilestones}</div>
                <div>Remaining</div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Information */}
        {order.estimatedCompletion && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Estimated Completion</p>
                <p className="text-lg font-semibold text-gray-900">
                  {order.estimatedCompletion.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              {order.estimatedDaysRemaining !== undefined && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {isOverdue ? 'Overdue by' : 'Time remaining'}
                  </p>
                  <p className={cn(
                    'text-lg font-semibold',
                    isOverdue ? 'text-red-600' : 
                    isUrgent ? 'text-yellow-600' : 'text-blue-600'
                  )}>
                    {Math.abs(order.estimatedDaysRemaining)} day{Math.abs(order.estimatedDaysRemaining) !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
            
            {(isUrgent || isOverdue) && (
              <div className={cn(
                'mt-3 p-2 rounded-md text-sm flex items-center gap-2',
                isOverdue ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
              )}>
                <AlertTriangle className="h-4 w-4" />
                {isOverdue ? 'This order is overdue. Please contact your tailor.' : 
                 'This order is due soon. Please stay in touch with your tailor.'}
              </div>
            )}
          </div>
        )}

        {/* Next Milestone */}
        {order.nextMilestone && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Next Milestone</h4>
            <p className="text-base font-semibold text-blue-600">
              {order.nextMilestone.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
                className="gap-2 flex-1 sm:flex-none"
              >
                <Eye className="h-4 w-4" />
                View Details
              </Button>
            )}
            
            {onTrackOrder && (
              <Button
                variant="default"
                size="sm"
                onClick={onTrackOrder}
                className="gap-2 flex-1 sm:flex-none"
              >
                <Package className="h-4 w-4" />
                Track Order
              </Button>
            )}
            
            {onMessageTailor && [OrderStatus.IN_PRODUCTION, OrderStatus.FITTING_READY, OrderStatus.ADJUSTMENTS_IN_PROGRESS].includes(order.currentStatus) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMessageTailor}
                className="gap-2 flex-1 sm:flex-none"
              >
                <MessageSquare className="h-4 w-4" />
                Message Tailor
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderStatusCard;