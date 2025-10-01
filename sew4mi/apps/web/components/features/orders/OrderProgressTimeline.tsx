/**
 * OrderProgressTimeline component for displaying order progress with milestone visualization
 * Features real-time updates, Ghana-themed styling, and mobile-first design
 * @file OrderProgressTimeline.tsx
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, AlertCircle, Calendar, Camera, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MilestoneStage, OrderMilestone, MilestoneApprovalStatus } from '@sew4mi/shared';
import { OrderStatus, OrderWithProgress } from '@sew4mi/shared/types/order-creation';
import { getMilestoneDisplayInfo, calculateOrderProgress } from '@sew4mi/shared/utils/order-progress';
import { MilestonePhotoGallery } from './MilestonePhotoGallery';

/**
 * Props for OrderProgressTimeline component
 */
interface OrderProgressTimelineProps {
  /** Order with progress data */
  order: OrderWithProgress;
  /** Whether to show photo gallery */
  showPhotos?: boolean;
  /** Whether to show messaging button */
  showMessaging?: boolean;
  /** Whether real-time updates are enabled */
  enableRealTime?: boolean;
  /** Callback when messaging is requested */
  onMessageTailor?: () => void;
  /** Callback when photo is selected */
  onPhotoSelect?: (photoIndex: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Timeline milestone item props
 */
interface TimelineMilestoneProps {
  milestone: OrderMilestone;
  isActive: boolean;
  isCompleted: boolean;
  isNext: boolean;
  estimatedDate?: Date;
  onPhotoView?: () => void;
  showPhoto?: boolean;
}

/**
 * Loading state component
 */
function TimelineLoading() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Timeline milestone component
 */
function TimelineMilestone({
  milestone,
  isActive,
  isCompleted,
  isNext,
  estimatedDate,
  onPhotoView,
  showPhoto = true
}: TimelineMilestoneProps) {
  const milestoneInfo = getMilestoneDisplayInfo(milestone.milestone);
  
  const getStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    }
    if (isActive) {
      return <Clock className="h-6 w-6 text-yellow-600" />;
    }
    return <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />;
  };

  const getStatusColor = () => {
    if (isCompleted) return 'bg-green-600';
    if (isActive) return 'bg-yellow-600';
    return 'bg-gray-300';
  };

  const getApprovalBadge = () => {
    // Show badge for all milestones that have been submitted
    if (!isCompleted && !isActive && milestone.approvalStatus !== MilestoneApprovalStatus.REJECTED) return null;
    
    const statusColors = {
      [MilestoneApprovalStatus.APPROVED]: 'bg-green-100 text-green-800 border-green-200',
      [MilestoneApprovalStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      [MilestoneApprovalStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge 
        className={cn('text-xs', statusColors[milestone.approvalStatus])}
        variant="outline"
      >
        {milestone.approvalStatus}
      </Badge>
    );
  };

  return (
    <div className="relative flex gap-4 group">
      {/* Timeline Line */}
      {!isNext && (
        <div 
          className={cn(
            'absolute left-6 top-12 bottom-0 w-0.5 transform -translate-x-1/2',
            getStatusColor()
          )} 
        />
      )}
      
      {/* Milestone Icon */}
      <div className={cn(
        'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-md',
        isCompleted ? 'bg-green-50' : isActive ? 'bg-yellow-50' : 'bg-gray-50'
      )}>
        <span className="text-xl" role="img" aria-label={milestoneInfo.name}>
          {milestoneInfo.icon}
        </span>
        <div className="absolute -bottom-1 -right-1">
          {getStatusIcon()}
        </div>
      </div>

      {/* Milestone Content */}
      <div className="flex-1 min-w-0 pb-8">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'text-lg font-semibold',
              isCompleted ? 'text-green-700' : isActive ? 'text-yellow-700' : 'text-gray-500'
            )}>
              {milestoneInfo.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {milestoneInfo.description}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {getApprovalBadge()}
          </div>
        </div>

        {/* Milestone Details */}
        <div className="mt-3 space-y-2">
          {/* Verification Date */}
          {(isCompleted || isActive) && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>
                {isCompleted ? 'Completed' : 'Started'} {new Date(milestone.verifiedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}

          {/* Estimated Date for Future Milestones */}
          {!isCompleted && !isActive && estimatedDate && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              <span>
                Expected {estimatedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}

          {/* Milestone Notes */}
          {milestone.notes && (isCompleted || isActive) && (
            <div className="bg-gray-50 rounded-lg p-3 mt-2">
              <p className="text-sm text-gray-700 italic">"{milestone.notes}"</p>
            </div>
          )}

          {/* Photo Actions */}
          {milestone.photoUrl && showPhoto && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPhotoView}
              className="mt-2 gap-2"
            >
              <Camera className="h-4 w-4" />
              View Photo
            </Button>
          )}

          {/* Rejection Reason */}
          {milestone.approvalStatus === MilestoneApprovalStatus.REJECTED && milestone.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Needs Revision</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{milestone.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * OrderProgressTimeline Component
 * Displays order progress with visual timeline of milestones
 */
export function OrderProgressTimeline({
  order,
  showPhotos = true,
  showMessaging = true,
  enableRealTime = true,
  onMessageTailor,
  onPhotoSelect,
  className
}: OrderProgressTimelineProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | undefined>();

  // Calculate progress
  const progressPercentage = calculateOrderProgress(order.milestones);
  const sortedMilestones = [...order.milestones].sort((a, b) => 
    new Date(a.verifiedAt).getTime() - new Date(b.verifiedAt).getTime()
  );

  // Get current milestone info
  const completedMilestones = sortedMilestones.filter(
    m => m.approvalStatus === MilestoneApprovalStatus.APPROVED
  );
  const activeMilestone = sortedMilestones.find(
    m => m.approvalStatus === MilestoneApprovalStatus.PENDING
  );

  const handlePhotoSelect = useCallback((index: number) => {
    setSelectedPhotoIndex(index);
    onPhotoSelect?.(index);
  }, [onPhotoSelect]);

  const getStatusColor = () => {
    switch (order.currentStatus) {
      case OrderStatus.COMPLETED:
        return 'text-green-700';
      case OrderStatus.IN_PRODUCTION:
      case OrderStatus.FITTING_READY:
        return 'text-blue-700';
      case OrderStatus.READY_FOR_DELIVERY:
        return 'text-purple-700';
      case OrderStatus.CANCELLED:
      case OrderStatus.DISPUTED:
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusBadgeColor = () => {
    switch (order.currentStatus) {
      case OrderStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200';
      case OrderStatus.IN_PRODUCTION:
      case OrderStatus.FITTING_READY:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case OrderStatus.READY_FOR_DELIVERY:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case OrderStatus.CANCELLED:
      case OrderStatus.DISPUTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return <TimelineLoading />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={cn('text-xl', getStatusColor())}>
              Order Progress
            </CardTitle>
            <Badge 
              className={cn('text-sm', getStatusBadgeColor())}
              variant="outline"
            >
              {order.currentStatus.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-green-600">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Completed</span>
              <p className="font-semibold text-green-600">{completedMilestones.length} milestones</p>
            </div>
            {order.estimatedCompletion && (
              <div>
                <span className="text-gray-500">Est. Completion</span>
                <p className="font-semibold text-blue-600">
                  {order.estimatedCompletion.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
            {order.estimatedDaysRemaining !== undefined && (
              <div>
                <span className="text-gray-500">Days Remaining</span>
                <p className={cn(
                  'font-semibold',
                  order.estimatedDaysRemaining <= 3 ? 'text-yellow-600' : 'text-blue-600'
                )}>
                  {order.estimatedDaysRemaining === 0 ? 'Due today' : 
                   order.estimatedDaysRemaining === 1 ? '1 day' : 
                   `${order.estimatedDaysRemaining} days`}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {showMessaging && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onMessageTailor}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Message Tailor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {sortedMilestones.map((milestone, index) => {
              const isCompleted = milestone.approvalStatus === MilestoneApprovalStatus.APPROVED;
              const isActive = milestone.approvalStatus === MilestoneApprovalStatus.PENDING;
              const isNext = index === sortedMilestones.length - 1;

              return (
                <TimelineMilestone
                  key={milestone.id}
                  milestone={milestone}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  isNext={isNext}
                  estimatedDate={order.estimatedCompletion}
                  onPhotoView={() => handlePhotoSelect(index)}
                  showPhoto={showPhotos}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      {showPhotos && sortedMilestones.some(m => m.photoUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Milestone Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <MilestonePhotoGallery
              milestones={sortedMilestones}
              selectedIndex={selectedPhotoIndex}
              onPhotoSelect={handlePhotoSelect}
              showApprovalStatus={true}
              interactive={true}
              allowDownload={false}
              maxHeight="300px"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OrderProgressTimeline;