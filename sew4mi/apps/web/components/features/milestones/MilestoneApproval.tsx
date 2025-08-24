/**
 * MilestoneApproval component for customer milestone review and approval
 * Features photo gallery, approval/rejection, and dispute escalation
 * @file MilestoneApproval.tsx
 */

'use client';

import React, { useState, useCallback } from 'react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  ZoomIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  OrderMilestone, 
  MilestoneApprovalAction, 
  MilestoneApprovalStatus,
  MilestoneStage
} from '@sew4mi/shared/types';

/**
 * Approval status type for component state
 */
type ApprovalStatus = 'idle' | 'approving' | 'rejecting' | 'success' | 'error';

/**
 * Props for MilestoneApproval component
 */
interface MilestoneApprovalProps {
  /** Milestone data to review */
  milestone: OrderMilestone;
  /** Callback when approval is successful */
  onApprovalComplete?: (action: MilestoneApprovalAction, comment?: string) => void;
  /** Callback when approval fails */
  onApprovalError?: (error: string) => void;
  /** Callback when dispute is created */
  onDisputeCreated?: () => void;
  /** Whether component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Milestone stage display names
 */
const MILESTONE_STAGE_NAMES: Record<MilestoneStage, string> = {
  [MilestoneStage.FABRIC_SELECTED]: 'Fabric Selected',
  [MilestoneStage.CUTTING_STARTED]: 'Cutting Started',
  [MilestoneStage.INITIAL_ASSEMBLY]: 'Initial Assembly',
  [MilestoneStage.FITTING_READY]: 'Fitting Ready',
  [MilestoneStage.ADJUSTMENTS_COMPLETE]: 'Adjustments Complete',
  [MilestoneStage.FINAL_PRESSING]: 'Final Pressing',
  [MilestoneStage.READY_FOR_DELIVERY]: 'Ready for Delivery'
};

/**
 * Gets badge variant for approval status
 */
function getStatusBadgeVariant(status: MilestoneApprovalStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case MilestoneApprovalStatus.APPROVED:
      return 'default';
    case MilestoneApprovalStatus.REJECTED:
      return 'destructive';
    case MilestoneApprovalStatus.PENDING:
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Calculates time remaining until auto-approval
 */
function getTimeUntilAutoApproval(deadline: Date): {
  timeString: string;
  isOverdue: boolean;
  isUrgent: boolean;
  isCritical: boolean;
} {
  const now = new Date();
  const timeLeft = deadline.getTime() - now.getTime();
  
  if (timeLeft <= 0) {
    return {
      timeString: 'Auto-approval deadline passed',
      isOverdue: true,
      isUrgent: false,
      isCritical: false
    };
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  let timeString: string;
  if (hours > 0) {
    timeString = `${hours}h ${minutes}m remaining`;
  } else {
    timeString = `${minutes}m remaining`;
  }
  
  return {
    timeString,
    isOverdue: false,
    isUrgent: hours <= 6, // Less than 6 hours
    isCritical: hours <= 2 // Less than 2 hours
  };
}

/**
 * MilestoneApproval Component
 * Provides customer interface for reviewing and approving milestone photos
 */
export function MilestoneApproval({
  milestone,
  onApprovalComplete,
  onApprovalError,
  onDisputeCreated,
  disabled = false,
  className
}: MilestoneApprovalProps) {
  // State management
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('idle');
  const [comment, setComment] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Calculate time until auto-approval
  const autoApprovalInfo = getTimeUntilAutoApproval(milestone.autoApprovalDeadline);

  /**
   * Handles milestone approval
   */
  const handleApproval = useCallback(async (action: MilestoneApprovalAction) => {
    if (approvalStatus !== 'idle' || milestone.approvalStatus !== MilestoneApprovalStatus.PENDING) {
      return;
    }

    try {
      const statusKey = action === MilestoneApprovalAction.APPROVED ? 'approving' : 'rejecting';
      setApprovalStatus(statusKey);

      const response = await fetch(`/api/milestones/${milestone.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comment: comment.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Approval failed');
      }

      const result = await response.json();
      
      setApprovalStatus('success');
      setComment('');
      
      // Call success callback
      onApprovalComplete?.(action, comment.trim() || undefined);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Approval failed';
      
      setApprovalStatus('error');
      onApprovalError?.(errorMessage);
      
      // Reset to idle after showing error briefly
      setTimeout(() => setApprovalStatus('idle'), 3000);
    }
  }, [approvalStatus, milestone.id, milestone.approvalStatus, comment, onApprovalComplete, onApprovalError]);

  /**
   * Handles dispute creation
   */
  const handleDisputeCreation = useCallback(async () => {
    if (!disputeReason.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/disputes/milestone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          milestoneId: milestone.id,
          orderId: milestone.orderId,
          reason: disputeReason.trim(),
          evidence: comment.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create dispute');
      }

      setShowDisputeModal(false);
      setDisputeReason('');
      setComment('');
      
      onDisputeCreated?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create dispute';
      onApprovalError?.(errorMessage);
    }
  }, [disputeReason, comment, milestone.id, milestone.orderId, onDisputeCreated, onApprovalError]);

  // Determine if milestone can be reviewed
  const canReview = milestone.approvalStatus === MilestoneApprovalStatus.PENDING && !disabled;
  const isApproved = milestone.approvalStatus === MilestoneApprovalStatus.APPROVED;
  const isRejected = milestone.approvalStatus === MilestoneApprovalStatus.REJECTED;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {MILESTONE_STAGE_NAMES[milestone.milestone]}
          </CardTitle>
          <Badge variant={getStatusBadgeVariant(milestone.approvalStatus)}>
            {milestone.approvalStatus}
          </Badge>
        </div>
        
        {/* Auto-approval countdown */}
        {milestone.approvalStatus === MilestoneApprovalStatus.PENDING && (
          <div className={cn(
            'flex items-center gap-2 text-sm',
            autoApprovalInfo.isOverdue 
              ? 'text-red-600 font-medium' 
              : autoApprovalInfo.isCritical
              ? 'text-red-500 font-medium'
              : autoApprovalInfo.isUrgent
              ? 'text-orange-600 font-medium'
              : 'text-muted-foreground'
          )}>
            <Clock className={cn(
              'h-4 w-4',
              autoApprovalInfo.isCritical && 'animate-pulse'
            )} />
            <span>{autoApprovalInfo.timeString}</span>
            {(autoApprovalInfo.isUrgent || autoApprovalInfo.isOverdue) && (
              <AlertTriangle className={cn(
                'h-4 w-4',
                autoApprovalInfo.isCritical ? 'text-red-500' : 'text-orange-500'
              )} />
            )}
          </div>
        )}
        
        {/* Urgent action banner */}
        {milestone.approvalStatus === MilestoneApprovalStatus.PENDING && autoApprovalInfo.isCritical && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Urgent:</strong> This milestone will be automatically approved in less than 2 hours. 
              Please review and take action now.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Photo Gallery */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Milestone Photo</Label>
          <div className="relative">
            <img
              src={milestone.photoUrl}
              alt={`${MILESTONE_STAGE_NAMES[milestone.milestone]} photo`}
              className="w-full max-h-96 object-contain rounded-lg border cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => setIsImageZoomed(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsImageZoomed(true);
                }
              }}
              tabIndex={0}
              role="button"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsImageZoomed(true)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tailor Notes */}
        {milestone.notes && (
          <div className="space-y-2">
            <Label className="text-base font-medium">Tailor Notes</Label>
            <div className="p-3 bg-muted rounded-lg text-sm">
              {milestone.notes}
            </div>
          </div>
        )}

        {/* Verification Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Verified on: {milestone.verifiedAt.toLocaleDateString()}</p>
          {milestone.customerReviewedAt && (
            <p>Reviewed on: {milestone.customerReviewedAt.toLocaleDateString()}</p>
          )}
        </div>

        {/* Rejection Reason (if rejected) */}
        {isRejected && milestone.rejectionReason && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rejection Reason:</strong> {milestone.rejectionReason}
            </AlertDescription>
          </Alert>
        )}

        {/* Approval Success (if approved) */}
        {isApproved && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Milestone approved successfully. Payment has been released to the tailor.
            </AlertDescription>
          </Alert>
        )}

        {/* Review Interface (if pending) */}
        {canReview && approvalStatus !== 'success' && (
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-medium">Review Milestone</Label>
            
            {/* Comment Input */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comments (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any comments about this milestone..."
                rows={3}
                maxLength={500}
                disabled={approvalStatus === 'approving' || approvalStatus === 'rejecting'}
              />
              <p className="text-xs text-muted-foreground text-right">
                {comment.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleApproval(MilestoneApprovalAction.APPROVED)}
                disabled={approvalStatus === 'approving' || approvalStatus === 'rejecting'}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {approvalStatus === 'approving' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleApproval(MilestoneApprovalAction.REJECTED)}
                disabled={approvalStatus === 'approving' || approvalStatus === 'rejecting'}
                variant="destructive"
                className="flex-1"
              >
                {approvalStatus === 'rejecting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    Reject
                  </>
                )}
              </Button>
            </div>

            {/* Dispute Option */}
            <div className="text-center">
              <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Create Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Milestone Dispute</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dispute-reason">Dispute Reason</Label>
                      <Textarea
                        id="dispute-reason"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Explain why you're disputing this milestone..."
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {disputeReason.length}/1000 characters
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleDisputeCreation}
                        disabled={!disputeReason.trim() || disputeReason.trim().length < 10}
                        className="flex-1"
                      >
                        Create Dispute
                      </Button>
                      <Button
                        onClick={() => setShowDisputeModal(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Error Display */}
        {approvalStatus === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to process approval. Please try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Image Zoom Modal */}
      <Dialog open={isImageZoomed} onOpenChange={setIsImageZoomed}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Milestone Photo - {MILESTONE_STAGE_NAMES[milestone.milestone]}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={milestone.photoUrl}
              alt={`${MILESTONE_STAGE_NAMES[milestone.milestone]} photo - enlarged`}
              className="w-full max-h-[80vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default MilestoneApproval;