/**
 * Order progress calculation utilities
 * Provides functions for calculating order progress, estimating completion times,
 * and determining next milestones in the tailoring process
 */

import { MilestoneStage, OrderMilestone } from '../types/milestone';
import { OrderStatus, OrderProgressCalculation } from '../types/order-creation';

/**
 * Milestone weights for progress calculation
 * Each milestone contributes differently to overall progress
 */
const MILESTONE_WEIGHTS: Record<MilestoneStage, number> = {
  [MilestoneStage.FABRIC_SELECTED]: 10,
  [MilestoneStage.CUTTING_STARTED]: 20,
  [MilestoneStage.INITIAL_ASSEMBLY]: 35,
  [MilestoneStage.FITTING_READY]: 50,
  [MilestoneStage.ADJUSTMENTS_COMPLETE]: 75,
  [MilestoneStage.FINAL_PRESSING]: 90,
  [MilestoneStage.READY_FOR_DELIVERY]: 100
};

/**
 * Expected days for each milestone stage
 * Used for completion time estimates
 */
const MILESTONE_DURATION: Record<MilestoneStage, number> = {
  [MilestoneStage.FABRIC_SELECTED]: 1,
  [MilestoneStage.CUTTING_STARTED]: 2,
  [MilestoneStage.INITIAL_ASSEMBLY]: 5,
  [MilestoneStage.FITTING_READY]: 3,
  [MilestoneStage.ADJUSTMENTS_COMPLETE]: 4,
  [MilestoneStage.FINAL_PRESSING]: 1,
  [MilestoneStage.READY_FOR_DELIVERY]: 1
};

/**
 * Order of milestone progression
 */
const MILESTONE_ORDER: MilestoneStage[] = [
  MilestoneStage.FABRIC_SELECTED,
  MilestoneStage.CUTTING_STARTED,
  MilestoneStage.INITIAL_ASSEMBLY,
  MilestoneStage.FITTING_READY,
  MilestoneStage.ADJUSTMENTS_COMPLETE,
  MilestoneStage.FINAL_PRESSING,
  MilestoneStage.READY_FOR_DELIVERY
];

/**
 * Calculate order progress percentage based on completed milestones
 */
export function calculateOrderProgress(milestones: OrderMilestone[]): number {
  if (!milestones || milestones.length === 0) {
    return 0;
  }

  // Get completed/approved milestones
  const completedMilestones = milestones.filter(
    m => m.approvalStatus === 'APPROVED' || m.approvalStatus === 'PENDING'
  );

  if (completedMilestones.length === 0) {
    return 0;
  }

  // Find the highest completed milestone
  const highestCompletedStage = getHighestCompletedMilestone(completedMilestones);
  
  return highestCompletedStage ? MILESTONE_WEIGHTS[highestCompletedStage] : 0;
}

/**
 * Get the highest completed milestone stage
 */
export function getHighestCompletedMilestone(milestones: OrderMilestone[]): MilestoneStage | null {
  const completedStages = milestones
    .filter(m => m.approvalStatus === 'APPROVED')
    .map(m => m.milestone);

  let highestStage: MilestoneStage | null = null;
  let highestIndex = -1;

  for (const stage of completedStages) {
    const index = MILESTONE_ORDER.indexOf(stage);
    if (index > highestIndex) {
      highestIndex = index;
      highestStage = stage;
    }
  }

  return highestStage;
}

/**
 * Get the next expected milestone
 */
export function getNextMilestone(milestones: OrderMilestone[]): MilestoneStage | null {
  const highestCompleted = getHighestCompletedMilestone(milestones);
  
  if (!highestCompleted) {
    return MILESTONE_ORDER[0];
  }

  const currentIndex = MILESTONE_ORDER.indexOf(highestCompleted);
  const nextIndex = currentIndex + 1;

  return nextIndex < MILESTONE_ORDER.length ? MILESTONE_ORDER[nextIndex] : null;
}

/**
 * Calculate estimated completion date based on current progress
 */
export function calculateEstimatedCompletion(
  milestones: OrderMilestone[],
  originalEstimate?: Date
): Date | null {
  const nextMilestone = getNextMilestone(milestones);
  
  if (!nextMilestone) {
    return null; // Order is complete
  }

  const now = new Date();
  let totalDaysRemaining = 0;

  // Calculate remaining days from next milestone onwards
  const nextMilestoneIndex = MILESTONE_ORDER.indexOf(nextMilestone);
  for (let i = nextMilestoneIndex; i < MILESTONE_ORDER.length; i++) {
    totalDaysRemaining += MILESTONE_DURATION[MILESTONE_ORDER[i]];
  }

  // Add buffer for potential delays (20%)
  totalDaysRemaining = Math.ceil(totalDaysRemaining * 1.2);

  const estimatedCompletion = new Date(now);
  estimatedCompletion.setDate(now.getDate() + totalDaysRemaining);

  // Don't exceed original estimate if provided
  if (originalEstimate && estimatedCompletion > originalEstimate) {
    return originalEstimate;
  }

  return estimatedCompletion;
}

/**
 * Calculate days remaining until estimated completion
 */
export function calculateDaysRemaining(estimatedCompletion?: Date): number | null {
  if (!estimatedCompletion) {
    return null;
  }

  const now = new Date();
  const diffTime = estimatedCompletion.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Determine order status from milestone progress
 */
export function getOrderStatusFromMilestones(milestones: OrderMilestone[]): OrderStatus {
  if (!milestones || milestones.length === 0) {
    return OrderStatus.CREATED;
  }

  const highestCompleted = getHighestCompletedMilestone(milestones);
  
  if (!highestCompleted) {
    return OrderStatus.DEPOSIT_PAID;
  }

  const statusMap: Record<MilestoneStage, OrderStatus> = {
    [MilestoneStage.FABRIC_SELECTED]: OrderStatus.IN_PRODUCTION,
    [MilestoneStage.CUTTING_STARTED]: OrderStatus.IN_PRODUCTION,
    [MilestoneStage.INITIAL_ASSEMBLY]: OrderStatus.IN_PRODUCTION,
    [MilestoneStage.FITTING_READY]: OrderStatus.FITTING_READY,
    [MilestoneStage.ADJUSTMENTS_COMPLETE]: OrderStatus.ADJUSTMENTS_IN_PROGRESS,
    [MilestoneStage.FINAL_PRESSING]: OrderStatus.READY_FOR_DELIVERY,
    [MilestoneStage.READY_FOR_DELIVERY]: OrderStatus.READY_FOR_DELIVERY
  };

  return statusMap[highestCompleted] || OrderStatus.IN_PRODUCTION;
}

/**
 * Generate comprehensive progress calculation
 */
export function generateOrderProgressCalculation(
  orderId: string,
  milestones: OrderMilestone[],
  originalEstimate?: Date
): OrderProgressCalculation {
  const progressPercentage = calculateOrderProgress(milestones);
  const completedCount = milestones.filter(m => m.approvalStatus === 'APPROVED').length;
  const nextMilestone = getNextMilestone(milestones) || undefined;
  const estimatedCompletion = calculateEstimatedCompletion(milestones, originalEstimate) || undefined;
  const daysRemaining = estimatedCompletion ? (calculateDaysRemaining(estimatedCompletion) ?? undefined) : undefined;
  const currentStatus = getOrderStatusFromMilestones(milestones);

  return {
    orderId,
    currentStatus,
    progressPercentage,
    completedMilestones: completedCount,
    totalMilestones: MILESTONE_ORDER.length,
    nextMilestone,
    estimatedCompletion,
    daysRemaining
  };
}

/**
 * Check if milestone is overdue based on expected timeline
 */
export function isMilestoneOverdue(
  milestone: MilestoneStage,
  milestones: OrderMilestone[],
  orderCreatedAt: Date,
  _originalEstimate?: Date
): boolean {
  const milestoneIndex = MILESTONE_ORDER.indexOf(milestone);
  
  // Calculate expected completion date for this milestone
  let expectedDays = 0;
  for (let i = 0; i <= milestoneIndex; i++) {
    expectedDays += MILESTONE_DURATION[MILESTONE_ORDER[i]];
  }

  const expectedDate = new Date(orderCreatedAt);
  expectedDate.setDate(orderCreatedAt.getDate() + expectedDays);

  const now = new Date();
  
  // Check if this milestone should have been completed by now
  return now > expectedDate && !milestones.some(m => 
    m.milestone === milestone && m.approvalStatus === 'APPROVED'
  );
}

/**
 * Get milestone display information
 */
export function getMilestoneDisplayInfo(stage: MilestoneStage): {
  name: string;
  description: string;
  icon: string;
  color: string;
} {
  const displayMap = {
    [MilestoneStage.FABRIC_SELECTED]: {
      name: 'Fabric Selected',
      description: 'Fabric has been chosen and prepared',
      icon: '🧵',
      color: '#10B981'
    },
    [MilestoneStage.CUTTING_STARTED]: {
      name: 'Cutting Started',
      description: 'Pattern cutting has begun',
      icon: '✂️',
      color: '#F59E0B'
    },
    [MilestoneStage.INITIAL_ASSEMBLY]: {
      name: 'Initial Assembly',
      description: 'Basic garment construction underway',
      icon: '🪡',
      color: '#3B82F6'
    },
    [MilestoneStage.FITTING_READY]: {
      name: 'Fitting Ready',
      description: 'Ready for fitting and adjustments',
      icon: '👔',
      color: '#8B5CF6'
    },
    [MilestoneStage.ADJUSTMENTS_COMPLETE]: {
      name: 'Adjustments Complete',
      description: 'All modifications have been made',
      icon: '📏',
      color: '#EC4899'
    },
    [MilestoneStage.FINAL_PRESSING]: {
      name: 'Final Pressing',
      description: 'Final finishing and quality checks',
      icon: '🔥',
      color: '#EF4444'
    },
    [MilestoneStage.READY_FOR_DELIVERY]: {
      name: 'Ready for Delivery',
      description: 'Garment is complete and ready',
      icon: '📦',
      color: '#059669'
    }
  };

  return displayMap[stage];
}