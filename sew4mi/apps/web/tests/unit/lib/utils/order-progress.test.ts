/**
 * Unit tests for order progress calculation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateOrderProgress,
  getHighestCompletedMilestone,
  getNextMilestone,
  calculateEstimatedCompletion,
  calculateDaysRemaining,
  getOrderStatusFromMilestones,
  generateOrderProgressCalculation,
  isMilestoneOverdue,
  getMilestoneDisplayInfo
} from '@sew4mi/shared/utils';
import { MilestoneStage, OrderMilestone, MilestoneApprovalStatus } from '@sew4mi/shared';
import { OrderStatus } from '@sew4mi/shared/types/order-creation';

describe('Order Progress Utilities', () => {
  let mockMilestones: OrderMilestone[];
  const orderId = 'order-123';
  const baseDate = new Date('2024-01-01T10:00:00Z');

  beforeEach(() => {
    mockMilestones = [];
  });

  const createMilestone = (
    milestone: MilestoneStage,
    approvalStatus: MilestoneApprovalStatus = MilestoneApprovalStatus.APPROVED,
    verifiedAt: Date = baseDate
  ): OrderMilestone => ({
    id: `milestone-${milestone}`,
    orderId,
    milestone,
    photoUrl: 'https://example.com/photo.jpg',
    notes: 'Test notes',
    verifiedAt,
    verifiedBy: 'tailor-123',
    approvalStatus,
    autoApprovalDeadline: new Date(verifiedAt.getTime() + 72 * 60 * 60 * 1000),
    createdAt: verifiedAt,
    updatedAt: verifiedAt
  });

  describe('calculateOrderProgress', () => {
    it('should return 0% for no milestones', () => {
      const progress = calculateOrderProgress([]);
      expect(progress).toBe(0);
    });

    it('should return 10% for fabric selected milestone', () => {
      mockMilestones = [createMilestone(MilestoneStage.FABRIC_SELECTED)];
      const progress = calculateOrderProgress(mockMilestones);
      expect(progress).toBe(10);
    });

    it('should return 50% for fitting ready milestone', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED),
        createMilestone(MilestoneStage.INITIAL_ASSEMBLY),
        createMilestone(MilestoneStage.FITTING_READY)
      ];
      const progress = calculateOrderProgress(mockMilestones);
      expect(progress).toBe(50);
    });

    it('should return 100% for ready for delivery milestone', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED),
        createMilestone(MilestoneStage.INITIAL_ASSEMBLY),
        createMilestone(MilestoneStage.FITTING_READY),
        createMilestone(MilestoneStage.ADJUSTMENTS_COMPLETE),
        createMilestone(MilestoneStage.FINAL_PRESSING),
        createMilestone(MilestoneStage.READY_FOR_DELIVERY)
      ];
      const progress = calculateOrderProgress(mockMilestones);
      expect(progress).toBe(100);
    });

    it('should ignore pending milestones for progress calculation', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED, MilestoneApprovalStatus.PENDING)
      ];
      const progress = calculateOrderProgress(mockMilestones);
      expect(progress).toBe(10); // Only fabric selected counts
    });

    it('should ignore rejected milestones', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED, MilestoneApprovalStatus.REJECTED)
      ];
      const progress = calculateOrderProgress(mockMilestones);
      expect(progress).toBe(10);
    });
  });

  describe('getHighestCompletedMilestone', () => {
    it('should return null for no completed milestones', () => {
      const highest = getHighestCompletedMilestone([]);
      expect(highest).toBeNull();
    });

    it('should return the highest completed milestone', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED),
        createMilestone(MilestoneStage.INITIAL_ASSEMBLY)
      ];
      const highest = getHighestCompletedMilestone(mockMilestones);
      expect(highest).toBe(MilestoneStage.INITIAL_ASSEMBLY);
    });

    it('should ignore pending milestones', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED, MilestoneApprovalStatus.PENDING)
      ];
      const highest = getHighestCompletedMilestone(mockMilestones);
      expect(highest).toBe(MilestoneStage.FABRIC_SELECTED);
    });
  });

  describe('getNextMilestone', () => {
    it('should return first milestone when none completed', () => {
      const next = getNextMilestone([]);
      expect(next).toBe(MilestoneStage.FABRIC_SELECTED);
    });

    it('should return next milestone in sequence', () => {
      mockMilestones = [createMilestone(MilestoneStage.FABRIC_SELECTED)];
      const next = getNextMilestone(mockMilestones);
      expect(next).toBe(MilestoneStage.CUTTING_STARTED);
    });

    it('should return null when all milestones completed', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED),
        createMilestone(MilestoneStage.INITIAL_ASSEMBLY),
        createMilestone(MilestoneStage.FITTING_READY),
        createMilestone(MilestoneStage.ADJUSTMENTS_COMPLETE),
        createMilestone(MilestoneStage.FINAL_PRESSING),
        createMilestone(MilestoneStage.READY_FOR_DELIVERY)
      ];
      const next = getNextMilestone(mockMilestones);
      expect(next).toBeNull();
    });
  });

  describe('calculateEstimatedCompletion', () => {
    beforeEach(() => {
      // Mock current date
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return null when all milestones completed', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED),
        createMilestone(MilestoneStage.INITIAL_ASSEMBLY),
        createMilestone(MilestoneStage.FITTING_READY),
        createMilestone(MilestoneStage.ADJUSTMENTS_COMPLETE),
        createMilestone(MilestoneStage.FINAL_PRESSING),
        createMilestone(MilestoneStage.READY_FOR_DELIVERY)
      ];
      const completion = calculateEstimatedCompletion(mockMilestones);
      expect(completion).toBeNull();
    });

    it('should calculate completion date from current progress', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED)
      ];
      const completion = calculateEstimatedCompletion(mockMilestones);
      
      // Next milestone is INITIAL_ASSEMBLY, then FITTING_READY, etc.
      // Expected days: 5 + 3 + 4 + 1 + 1 = 14 days + 20% buffer = ~17 days
      expect(completion).not.toBeNull();
      if (completion) {
        const diffDays = Math.ceil((completion.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBeGreaterThan(14);
        expect(diffDays).toBeLessThan(20);
      }
    });

    it('should respect original estimate if provided', () => {
      mockMilestones = [createMilestone(MilestoneStage.FABRIC_SELECTED)];
      const originalEstimate = new Date('2024-01-20T10:00:00Z'); // 5 days from now
      const completion = calculateEstimatedCompletion(mockMilestones, originalEstimate);
      
      expect(completion).not.toBeNull();
      if (completion) {
        expect(completion.getTime()).toBeLessThanOrEqual(originalEstimate.getTime());
      }
    });
  });

  describe('calculateDaysRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return null for no estimated completion', () => {
      const days = calculateDaysRemaining(undefined);
      expect(days).toBeNull();
    });

    it('should calculate correct days remaining', () => {
      const futureDate = new Date('2024-01-20T10:00:00Z'); // 5 days from now
      const days = calculateDaysRemaining(futureDate);
      expect(days).toBe(5);
    });

    it('should return 0 for past dates', () => {
      const pastDate = new Date('2024-01-10T10:00:00Z'); // 5 days ago
      const days = calculateDaysRemaining(pastDate);
      expect(days).toBe(0);
    });
  });

  describe('getOrderStatusFromMilestones', () => {
    it('should return CREATED for no milestones', () => {
      const status = getOrderStatusFromMilestones([]);
      expect(status).toBe(OrderStatus.CREATED);
    });

    it('should return IN_PRODUCTION for initial milestones', () => {
      mockMilestones = [createMilestone(MilestoneStage.CUTTING_STARTED)];
      const status = getOrderStatusFromMilestones(mockMilestones);
      expect(status).toBe(OrderStatus.IN_PRODUCTION);
    });

    it('should return FITTING_READY for fitting milestone', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED),
        createMilestone(MilestoneStage.INITIAL_ASSEMBLY),
        createMilestone(MilestoneStage.FITTING_READY)
      ];
      const status = getOrderStatusFromMilestones(mockMilestones);
      expect(status).toBe(OrderStatus.FITTING_READY);
    });

    it('should return READY_FOR_DELIVERY for final milestones', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED),
        createMilestone(MilestoneStage.INITIAL_ASSEMBLY),
        createMilestone(MilestoneStage.FITTING_READY),
        createMilestone(MilestoneStage.ADJUSTMENTS_COMPLETE),
        createMilestone(MilestoneStage.FINAL_PRESSING),
        createMilestone(MilestoneStage.READY_FOR_DELIVERY)
      ];
      const status = getOrderStatusFromMilestones(mockMilestones);
      expect(status).toBe(OrderStatus.READY_FOR_DELIVERY);
    });
  });

  describe('generateOrderProgressCalculation', () => {
    it('should generate comprehensive progress data', () => {
      mockMilestones = [
        createMilestone(MilestoneStage.FABRIC_SELECTED),
        createMilestone(MilestoneStage.CUTTING_STARTED)
      ];

      const calculation = generateOrderProgressCalculation(orderId, mockMilestones);

      expect(calculation.orderId).toBe(orderId);
      expect(calculation.progressPercentage).toBe(20); // CUTTING_STARTED weight
      expect(calculation.completedMilestones).toBe(2);
      expect(calculation.totalMilestones).toBe(7);
      expect(calculation.nextMilestone).toBe(MilestoneStage.INITIAL_ASSEMBLY);
      expect(calculation.currentStatus).toBe(OrderStatus.IN_PRODUCTION);
    });
  });

  describe('isMilestoneOverdue', () => {
    const orderCreatedAt = new Date('2024-01-01T10:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-20T10:00:00Z')); // 19 days after order created
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for overdue milestone', () => {
      // FABRIC_SELECTED should be done in 1 day, CUTTING_STARTED in 3 days total
      // But we're 19 days out and don't have CUTTING_STARTED completed
      const isOverdue = isMilestoneOverdue(
        MilestoneStage.CUTTING_STARTED,
        [],
        orderCreatedAt
      );
      expect(isOverdue).toBe(true);
    });

    it('should return false for completed milestone', () => {
      mockMilestones = [createMilestone(MilestoneStage.CUTTING_STARTED)];
      const isOverdue = isMilestoneOverdue(
        MilestoneStage.CUTTING_STARTED,
        mockMilestones,
        orderCreatedAt
      );
      expect(isOverdue).toBe(false);
    });

    it('should return false for future milestone', () => {
      vi.setSystemTime(new Date('2024-01-02T10:00:00Z')); // 1 day after order
      const isOverdue = isMilestoneOverdue(
        MilestoneStage.INITIAL_ASSEMBLY,
        [],
        orderCreatedAt
      );
      expect(isOverdue).toBe(false); // INITIAL_ASSEMBLY expected after 8 days
    });
  });

  describe('getMilestoneDisplayInfo', () => {
    it('should return correct display info for fabric selected', () => {
      const info = getMilestoneDisplayInfo(MilestoneStage.FABRIC_SELECTED);
      expect(info.name).toBe('Fabric Selected');
      expect(info.description).toContain('Fabric has been chosen');
      expect(info.icon).toBe('🧵');
      expect(info.color).toBe('#10B981');
    });

    it('should return correct display info for all milestone stages', () => {
      const allStages = [
        MilestoneStage.FABRIC_SELECTED,
        MilestoneStage.CUTTING_STARTED,
        MilestoneStage.INITIAL_ASSEMBLY,
        MilestoneStage.FITTING_READY,
        MilestoneStage.ADJUSTMENTS_COMPLETE,
        MilestoneStage.FINAL_PRESSING,
        MilestoneStage.READY_FOR_DELIVERY
      ];

      allStages.forEach(stage => {
        const info = getMilestoneDisplayInfo(stage);
        expect(info.name).toBeTruthy();
        expect(info.description).toBeTruthy();
        expect(info.icon).toBeTruthy();
        expect(info.color).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      });
    });
  });
});