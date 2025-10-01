/**
 * Fabric Allocation Service
 * Business logic for fabric allocation calculations and management
 */

import { TailorGroupOrderRepository } from '@/lib/repositories/tailor-group-order.repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  FabricAllocation,
  FabricQuantityCalculation
} from '@sew4mi/shared/types/group-order';

export class FabricAllocationService {
  private repository: TailorGroupOrderRepository;

  constructor(private supabase: SupabaseClient) {
    this.repository = new TailorGroupOrderRepository(supabase);
  }

  /**
   * Get fabric allocations for group order
   */
  async getFabricAllocations(groupOrderId: string): Promise<FabricAllocation[]> {
    return this.repository.getFabricAllocations(groupOrderId);
  }

  /**
   * Calculate total fabric needs with buffer
   */
  calculateFabricRequirements(
    allocations: FabricAllocation[],
    bufferPercentage: number = 10
  ): FabricQuantityCalculation {
    const totalYardsNeeded = allocations.reduce(
      (sum, alloc) => sum + alloc.yardsAllocated,
      0
    );

    const bufferAmount = (totalYardsNeeded * bufferPercentage) / 100;
    const recommendedPurchaseQuantity = totalYardsNeeded + bufferAmount;

    return {
      totalYardsNeeded,
      recommendedPurchaseQuantity,
      bufferPercentage,
      individualAllocations: allocations,
      estimatedWaste: bufferAmount
    };
  }

  /**
   * Save fabric allocation calculation
   */
  async saveFabricAllocation(
    groupOrderId: string,
    tailorId: string,
    calculation: FabricQuantityCalculation
  ): Promise<void> {
    // Validate calculation
    if (calculation.totalYardsNeeded <= 0) {
      throw new Error('Total yards needed must be greater than 0');
    }
    if (calculation.bufferPercentage < 0 || calculation.bufferPercentage > 50) {
      throw new Error('Buffer percentage must be between 0 and 50');
    }

    // Update coordination record with totals
    await this.repository.upsertCoordination(groupOrderId, tailorId, {
      totalFabricNeeded: calculation.totalYardsNeeded,
      fabricBufferPercentage: calculation.bufferPercentage
    });

    // Update individual allocations
    const allocationPromises = calculation.individualAllocations.map(alloc =>
      this.repository.upsertFabricAllocation({
        groupOrderId,
        groupOrderItemId: alloc.orderId,
        allocatedYardage: alloc.yardsAllocated,
        fabricLot: alloc.fabricLot || null
      })
    );

    await Promise.all(allocationPromises);
  }

  /**
   * Get fabric sourcing recommendation based on quantity
   */
  getFabricSourcingRecommendation(totalYards: number): {
    recommendation: string;
    details: string;
    estimatedCost: string;
  } {
    if (totalYards < 20) {
      return {
        recommendation: 'Local Fabric Store',
        details: 'Purchase from Makola Market or local fabric vendors',
        estimatedCost: 'GHS 15-25 per yard'
      };
    } else if (totalYards < 50) {
      return {
        recommendation: 'Wholesale Fabric Supplier',
        details: 'Contact wholesale suppliers for better rates on bulk orders',
        estimatedCost: 'GHS 12-20 per yard'
      };
    } else {
      return {
        recommendation: 'Direct Textile Importer',
        details: 'Consider ordering directly from textile importers for significant savings',
        estimatedCost: 'GHS 10-18 per yard'
      };
    }
  }

  /**
   * Update actual fabric usage
   */
  async updateActualUsage(
    allocationId: string,
    actualUsed: number,
    wasteAmount: number,
    notes?: string
  ): Promise<void> {
    await this.repository.upsertFabricAllocation({
      id: allocationId,
      actualUsed,
      wasteAmount,
      notes
    });
  }
}

