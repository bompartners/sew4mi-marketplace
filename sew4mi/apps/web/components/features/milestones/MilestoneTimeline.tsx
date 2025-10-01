/**
 * MilestoneTimeline component - Detailed timeline view with photo verification status
 * @file MilestoneTimeline.tsx
 */

"use client"

import React, { useState } from 'react';
import { Check, Clock, AlertCircle, Camera, Eye, MessageSquare, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderMilestone, MilestoneType } from '@sew4mi/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

interface MilestoneTimelineProps {
  milestones: OrderMilestone[];
  orderId: string;
  userRole: 'customer' | 'tailor' | 'admin';
  onViewPhotos?: (milestone: OrderMilestone) => void;
  onViewApproval?: (milestone: OrderMilestone) => void;
  className?: string;
}

/**
 * Timeline milestone configuration
 */
const TIMELINE_CONFIG: Record<MilestoneType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  order: number;
  requiredPhoto: boolean;
}> = {
  FABRIC_SELECTED: {
    label: 'Fabric Selection',
    description: 'Customer approved fabric choice',
    icon: <Check className="h-4 w-4" />,
    color: 'blue',
    order: 1,
    requiredPhoto: false
  },
  CUTTING_STARTED: {
    label: 'Cutting Started', 
    description: 'Fabric cutting has begun',
    icon: <Camera className="h-4 w-4" />,
    color: 'orange',
    order: 2,
    requiredPhoto: true
  },
  INITIAL_ASSEMBLY: {
    label: 'Initial Assembly',
    description: 'Basic construction completed',
    icon: <Camera className="h-4 w-4" />,
    color: 'yellow',
    order: 3,
    requiredPhoto: true
  },
  FITTING_READY: {
    label: 'Fitting Ready',
    description: 'Ready for customer fitting',
    icon: <Camera className="h-4 w-4" />,
    color: 'purple',
    order: 4,
    requiredPhoto: true
  },
  ADJUSTMENTS_COMPLETE: {
    label: 'Adjustments Complete',
    description: 'Fitting adjustments finished',
    icon: <Camera className="h-4 w-4" />,
    color: 'indigo',
    order: 5,
    requiredPhoto: true
  },
  FINAL_PRESSING: {
    label: 'Final Pressing',
    description: 'Final finishing and pressing',
    icon: <Camera className="h-4 w-4" />,
    color: 'pink',
    order: 6,
    requiredPhoto: true
  },
  READY_FOR_DELIVERY: {
    label: 'Ready for Delivery',
    description: 'Completed and ready for pickup',
    icon: <Check className="h-4 w-4" />,
    color: 'green',
    order: 7,
    requiredPhoto: true
  }
};

/**
 * Gets timeline item status
 */
function getTimelineStatus(milestone?: OrderMilestone): {
  status: 'completed' | 'pending' | 'rejected' | 'not_started';
  substatus?: string;
} {
  if (!milestone) {
    return { status: 'not_started' };
  }

  if (milestone.approvalStatus === 'APPROVED') {
    return { status: 'completed' };
  }

  if (milestone.approvalStatus === 'REJECTED') {
    return { status: 'rejected' };
  }

  if (milestone.verifiedAt) {
    return { status: 'pending', substatus: 'awaiting_approval' };
  }

  return { status: 'not_started' };
}

/**
 * Gets status colors for timeline items
 */
function getStatusColors(status: string): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (status) {
    case 'completed':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'bg-green-500'
      };
    case 'pending':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'bg-yellow-500'
      };
    case 'rejected':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'bg-red-500'
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-600',
        icon: 'bg-gray-300'
      };
  }
}

/**
 * Photo preview dialog component
 */
function PhotoPreviewDialog({ 
  milestone, 
  isOpen, 
  onClose 
}: { 
  milestone: OrderMilestone | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!milestone || !milestone.photoUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {TIMELINE_CONFIG[milestone.milestone]?.label} Photo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <Image
              src={milestone.photoUrl}
              alt={`${milestone.milestone} photo`}
              fill
              className="object-cover"
            />
          </div>
          {milestone.notes && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-1">Notes:</h4>
              <p className="text-sm text-muted-foreground">{milestone.notes}</p>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Submitted: {new Date(milestone.verifiedAt!).toLocaleString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main MilestoneTimeline component
 */
export function MilestoneTimeline({ 
  milestones, 
  orderId: _orderId, 
  userRole,
  onViewPhotos,
  onViewApproval,
  className 
}: MilestoneTimelineProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<OrderMilestone | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // Create milestone map for quick lookup
  const milestoneMap = new Map(milestones.map(m => [m.milestone, m]));
  
  // Get all milestone types in order
  const orderedMilestones = Object.entries(TIMELINE_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([type]) => type as MilestoneType);

  const handleViewPhoto = (milestone: OrderMilestone) => {
    setSelectedMilestone(milestone);
    setShowPhotoPreview(true);
    onViewPhotos?.(milestone);
  };

  const handleViewApproval = (milestone: OrderMilestone) => {
    onViewApproval?.(milestone);
  };

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            {/* Timeline items */}
            <div className="space-y-6">
              {orderedMilestones.map((milestoneType, index) => {
                const milestone = milestoneMap.get(milestoneType);
                const config = TIMELINE_CONFIG[milestoneType];
                const { status, substatus: _substatus } = getTimelineStatus(milestone);
                const colors = getStatusColors(status);

                return (
                  <div key={milestoneType} className="relative flex gap-4">
                    {/* Timeline node */}
                    <div className={cn(
                      "relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white",
                      colors.icon
                    )}>
                      {status === 'completed' ? (
                        <Check className="h-5 w-5" />
                      ) : status === 'pending' ? (
                        <Clock className="h-5 w-5" />
                      ) : status === 'rejected' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>

                    {/* Timeline content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className={cn(
                        "p-4 rounded-lg border",
                        colors.bg,
                        colors.border
                      )}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className={cn("font-medium", colors.text)}>
                              {config.label}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {config.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === 'completed' && (
                              <Badge variant="default" className="bg-green-500">
                                Approved
                              </Badge>
                            )}
                            {status === 'pending' && (
                              <Badge variant="secondary" className="bg-yellow-500">
                                Pending Approval
                              </Badge>
                            )}
                            {status === 'rejected' && (
                              <Badge variant="destructive">
                                Rejected
                              </Badge>
                            )}
                            {status === 'not_started' && (
                              <Badge variant="outline" className="text-gray-500">
                                Not Started
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Photo requirement indicator */}
                        {config.requiredPhoto && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Camera className="h-3 w-3" />
                            <span>Photo verification required</span>
                          </div>
                        )}

                        {/* Milestone details */}
                        {milestone && (
                          <div className="space-y-2">
                            {/* Timestamp */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {milestone.verifiedAt 
                                  ? `Submitted: ${new Date(milestone.verifiedAt).toLocaleString()}`
                                  : 'Not submitted'
                                }
                              </span>
                            </div>

                            {/* Customer review info */}
                            {milestone.customerReviewedAt && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>
                                  Reviewed: {new Date(milestone.customerReviewedAt).toLocaleString()}
                                </span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              {milestone.photoUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPhoto(milestone)}
                                  className="h-8"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Photo
                                </Button>
                              )}

                              {userRole === 'customer' && milestone.verifiedAt && milestone.approvalStatus === 'PENDING' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewApproval(milestone)}
                                  className="h-8"
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Review & Approve
                                </Button>
                              )}

                              {milestone.approvalStatus === 'REJECTED' && milestone.rejectionReason && (
                                <div className="text-xs text-red-600 p-2 bg-red-50 rounded border">
                                  <strong>Rejection reason:</strong> {milestone.rejectionReason}
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            {milestone.notes && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <strong>Notes:</strong> {milestone.notes}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Auto-approval countdown */}
                        {status === 'pending' && milestone?.autoApprovalDeadline && (
                          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs">
                            <div className="flex items-center gap-1 text-yellow-800">
                              <Clock className="h-3 w-3" />
                              <span>Auto-approves in:</span>
                              <CountdownTimer 
                                deadline={new Date(milestone.autoApprovalDeadline)} 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Preview Dialog */}
      <PhotoPreviewDialog
        milestone={selectedMilestone}
        isOpen={showPhotoPreview}
        onClose={() => {
          setShowPhotoPreview(false);
          setSelectedMilestone(null);
        }}
      />
    </>
  );
}

/**
 * Countdown timer component for auto-approval
 */
function CountdownTimer({ deadline }: { deadline: Date }) {
  const [timeLeft, setTimeLeft] = useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadlineTime = deadline.getTime();
      const difference = deadlineTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } else {
        setTimeLeft('Expired');
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  const now = new Date().getTime();
  const difference = deadline.getTime() - now;
  const isUrgent = difference > 0 && difference < 6 * 60 * 60 * 1000; // Less than 6 hours

  return (
    <span className={cn(
      "font-medium",
      isUrgent && "text-red-600"
    )}>
      {timeLeft}
    </span>
  );
}

export default MilestoneTimeline;