/**
 * Production Schedule Service
 * Business logic for production schedule planning and conflict detection
 */

import { TailorGroupOrderRepository } from '@/lib/repositories/tailor-group-order.repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  ProductionSchedule,
  ProductionScheduleItem
} from '@sew4mi/shared/types/group-order';
import { differenceInDays, addDays, isAfter, isBefore } from 'date-fns';

export class ProductionScheduleService {
  private repository: TailorGroupOrderRepository;

  constructor(private supabase: SupabaseClient) {
    this.repository = new TailorGroupOrderRepository(supabase);
  }

  /**
   * Get production schedule for group order
   */
  async getProductionSchedule(groupOrderId: string): Promise<ProductionSchedule | null> {
    return this.repository.getProductionSchedule(groupOrderId);
  }

  /**
   * Create or update production schedule
   */
  async saveProductionSchedule(
    groupOrderId: string,
    tailorId: string,
    items: ProductionScheduleItem[],
    eventDate: Date
  ): Promise<void> {
    // Validate schedule
    const conflicts = this.detectScheduleConflicts(items, eventDate);
    if (conflicts.hasConflict && conflicts.conflictType === 'deadline') {
      throw new Error(conflicts.message || 'Schedule conflict detected');
    }

    // Calculate total capacity needed
    const totalCapacityHours = this.calculateTotalCapacity(items);

    // Save schedule
    await this.repository.upsertProductionSchedule({
      groupOrderId,
      tailorId,
      scheduledStartDate: items[0]?.estimatedStartDate || new Date(),
      scheduledCompletionDate: items[items.length - 1]?.estimatedCompletionDate || eventDate,
      priority: 5,
      capacityHours: totalCapacityHours
    });

    // Update coordination with estimated completion
    await this.repository.upsertCoordination(groupOrderId, tailorId, {
      estimatedCompletionDate: items[items.length - 1]?.estimatedCompletionDate || eventDate
    });
  }

  /**
   * Detect scheduling conflicts
   */
  detectScheduleConflicts(
    items: ProductionScheduleItem[],
    eventDate: Date
  ): {
    hasConflict: boolean;
    conflictType?: 'deadline' | 'capacity' | 'dependency';
    message?: string;
    affectedItems?: string[];
  } {
    // Check deadline conflicts
    const lateItems = items.filter(item =>
      isAfter(new Date(item.estimatedCompletionDate), eventDate)
    );

    if (lateItems.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'deadline',
        message: `${lateItems.length} item(s) scheduled to complete after the event date`,
        affectedItems: lateItems.map(i => i.orderId)
      };
    }

    // Check dependency conflicts
    for (const item of items) {
      if (item.dependencies && item.dependencies.length > 0) {
        const dependencyIndex = items.findIndex(i => i.orderId === item.dependencies![0]);
        const currentIndex = items.findIndex(i => i.orderId === item.orderId);

        if (dependencyIndex > currentIndex) {
          return {
            hasConflict: true,
            conflictType: 'dependency',
            message: 'Some items are scheduled before their dependencies'
          };
        }
      }
    }

    return { hasConflict: false };
  }

  /**
   * Recalculate schedule dates based on priority order
   */
  recalculateSchedule(
    items: ProductionScheduleItem[],
    daysPerGarment: number = 3
  ): ProductionScheduleItem[] {
    return items.map((item, index) => {
      const startDate = index === 0
        ? new Date()
        : addDays(new Date(items[index - 1].estimatedCompletionDate), 1);

      const completionDate = addDays(startDate, daysPerGarment);

      return {
        ...item,
        estimatedStartDate: startDate,
        estimatedCompletionDate: completionDate
      };
    });
  }

  /**
   * Calculate schedule health percentage
   */
  calculateScheduleHealth(items: ProductionScheduleItem[], eventDate: Date): {
    percentage: number;
    status: 'healthy' | 'warning' | 'critical';
  } {
    const totalItems = items.length;
    const onTimeItems = items.filter(item =>
      isBefore(new Date(item.estimatedCompletionDate), eventDate)
    ).length;

    const healthPercentage = (onTimeItems / totalItems) * 100;

    return {
      percentage: healthPercentage,
      status: healthPercentage === 100 ? 'healthy' : healthPercentage >= 80 ? 'warning' : 'critical'
    };
  }

  /**
   * Calculate total capacity hours needed
   */
  private calculateTotalCapacity(items: ProductionScheduleItem[]): number {
    // Estimate 8 hours per garment on average
    return items.length * 8;
  }

  /**
   * Get optimal production order suggestion
   */
  suggestOptimalOrder(items: ProductionScheduleItem[]): ProductionScheduleItem[] {
    // Sort by: dependencies first, then simpler items, then by estimated complexity
    const sorted = [...items].sort((a, b) => {
      // Items with dependencies should come after their dependencies
      if (a.dependencies?.includes(b.orderId)) return 1;
      if (b.dependencies?.includes(a.orderId)) return -1;

      // Prioritize children's garments (typically simpler)
      if (a.familyMemberName.toLowerCase().includes('child') && 
          !b.familyMemberName.toLowerCase().includes('child')) {
        return -1;
      }
      if (b.familyMemberName.toLowerCase().includes('child') && 
          !a.familyMemberName.toLowerCase().includes('child')) {
        return 1;
      }

      return 0;
    });

    // Reassign priorities
    return sorted.map((item, index) => ({
      ...item,
      priority: index + 1
    }));
  }
}

