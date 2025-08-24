/**
 * MilestoneProgress component - Shows current milestone stage with progress indicators
 * @file MilestoneProgress.tsx
 */

"use client"

import React from 'react';
import { Check, Clock, AlertCircle, Camera, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderMilestone, MilestoneType } from '@sew4mi/shared';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MilestoneProgressProps {
  milestones: OrderMilestone[];
  currentMilestone: MilestoneType;
  totalMilestones?: number;
  className?: string;
}

/**
 * Milestone configuration with display information
 */
const MILESTONE_CONFIG: Record<MilestoneType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  order: number;
}> = {
  FABRIC_SELECTED: {
    label: 'Fabric Selection',
    description: 'Customer has selected and approved fabric',
    icon: <Check className="h-4 w-4" />,
    color: 'bg-blue-500',
    order: 1
  },
  CUTTING_STARTED: {
    label: 'Cutting Started',
    description: 'Tailor has begun cutting the fabric',
    icon: <Camera className="h-4 w-4" />,
    color: 'bg-orange-500',
    order: 2
  },
  INITIAL_ASSEMBLY: {
    label: 'Initial Assembly',
    description: 'Basic garment assembly in progress',
    icon: <Camera className="h-4 w-4" />,
    color: 'bg-yellow-500',
    order: 3
  },
  FITTING_READY: {
    label: 'Fitting Ready',
    description: 'Garment ready for customer fitting',
    icon: <Camera className="h-4 w-4" />,
    color: 'bg-purple-500',
    order: 4
  },
  ADJUSTMENTS_COMPLETE: {
    label: 'Adjustments Complete',
    description: 'All fitting adjustments have been made',
    icon: <Camera className="h-4 w-4" />,
    color: 'bg-indigo-500',
    order: 5
  },
  FINAL_PRESSING: {
    label: 'Final Pressing',
    description: 'Final ironing and finishing touches',
    icon: <Camera className="h-4 w-4" />,
    color: 'bg-pink-500',
    order: 6
  },
  READY_FOR_DELIVERY: {
    label: 'Ready for Delivery',
    description: 'Garment completed and ready for pickup',
    icon: <Check className="h-4 w-4" />,
    color: 'bg-green-500',
    order: 7
  }
};

/**
 * Gets milestone status based on verification and approval
 */
function getMilestoneStatus(milestone: OrderMilestone): 'completed' | 'pending' | 'in_progress' | 'not_started' {
  if (milestone.verifiedAt && milestone.approvalStatus === 'APPROVED') {
    return 'completed';
  }
  if (milestone.verifiedAt && milestone.approvalStatus === 'PENDING') {
    return 'pending';
  }
  if (milestone.verifiedAt && milestone.approvalStatus === 'REJECTED') {
    return 'in_progress';
  }
  return 'not_started';
}

/**
 * Gets status icon for milestone
 */
function getStatusIcon(status: string, approvalStatus?: string): React.ReactNode {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'in_progress':
      return approvalStatus === 'REJECTED' 
        ? <AlertCircle className="h-4 w-4 text-red-600" />
        : <Upload className="h-4 w-4 text-blue-600" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  }
}

/**
 * Gets status badge for milestone approval
 */
function getStatusBadge(status: string, approvalStatus?: string): React.ReactNode {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500 text-white">Approved</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-500 text-white">Awaiting Approval</Badge>;
    case 'in_progress':
      return approvalStatus === 'REJECTED' 
        ? <Badge variant="destructive">Rejected</Badge>
        : <Badge variant="outline">In Progress</Badge>;
    default:
      return <Badge variant="outline" className="text-gray-500">Not Started</Badge>;
  }
}

/**
 * Main MilestoneProgress component
 */
export function MilestoneProgress({ 
  milestones, 
  currentMilestone, 
  totalMilestones = 7,
  className 
}: MilestoneProgressProps) {
  // Create milestone map for quick lookup
  const milestoneMap = new Map(milestones.map(m => [m.milestone, m]));
  
  // Get all milestone types in order
  const orderedMilestones = Object.entries(MILESTONE_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([type]) => type as MilestoneType);

  // Calculate progress
  const completedCount = milestones.filter(m => 
    m.verifiedAt && m.approvalStatus === 'APPROVED'
  ).length;
  const progressPercentage = (completedCount / totalMilestones) * 100;

  // Get current milestone index
  const currentMilestoneOrder = MILESTONE_CONFIG[currentMilestone]?.order || 1;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Progress Tracking</span>
          <Badge variant="outline" className="text-sm">
            {completedCount} of {totalMilestones} Complete
          </Badge>
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Overall Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current milestone highlight */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full text-white",
              MILESTONE_CONFIG[currentMilestone]?.color || 'bg-gray-500'
            )}>
              {MILESTONE_CONFIG[currentMilestone]?.icon}
            </div>
            <div>
              <h3 className="font-medium">Current Stage</h3>
              <p className="text-sm text-muted-foreground">
                {MILESTONE_CONFIG[currentMilestone]?.label || 'Unknown Stage'}
              </p>
            </div>
          </div>
        </div>

        {/* Milestone list */}
        <div className="space-y-3">
          {orderedMilestones.map((milestoneType, index) => {
            const milestone = milestoneMap.get(milestoneType);
            const config = MILESTONE_CONFIG[milestoneType];
            const status = milestone ? getMilestoneStatus(milestone) : 'not_started';
            const isCurrentMilestone = milestoneType === currentMilestone;
            const isPastMilestone = config.order < currentMilestoneOrder;

            return (
              <div
                key={milestoneType}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                  isCurrentMilestone && "border-primary bg-primary/5",
                  status === 'completed' && "bg-green-50 border-green-200",
                  status === 'pending' && "bg-yellow-50 border-yellow-200",
                  status === 'in_progress' && milestone?.approvalStatus === 'REJECTED' && "bg-red-50 border-red-200"
                )}
              >
                {/* Step indicator */}
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    status === 'completed' && "bg-green-500 text-white",
                    status === 'pending' && "bg-yellow-500 text-white",
                    status === 'in_progress' && "bg-blue-500 text-white",
                    status === 'not_started' && "bg-gray-200 text-gray-600",
                    isCurrentMilestone && "ring-2 ring-primary ring-offset-2"
                  )}>
                    {status === 'completed' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>

                {/* Milestone info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn(
                      "font-medium",
                      isCurrentMilestone && "text-primary"
                    )}>
                      {config.label}
                    </h4>
                    {getStatusIcon(status, milestone?.approvalStatus)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>
                  {milestone?.verifiedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {new Date(milestone.verifiedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  {getStatusBadge(status, milestone?.approvalStatus)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Next milestone info */}
        {currentMilestoneOrder < totalMilestones && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Next Step</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {MILESTONE_CONFIG[currentMilestone]?.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MilestoneProgress;