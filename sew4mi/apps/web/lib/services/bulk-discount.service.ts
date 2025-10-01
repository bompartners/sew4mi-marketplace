/**
 * Bulk Discount Service
 * Handles bulk discount calculations for group orders
 */

import {
  CalculateBulkDiscountRequest,
  CalculateBulkDiscountResponse,
  IndividualDiscount,
} from '@sew4mi/shared/types/group-order';
import {
  BULK_DISCOUNT_TIERS,
  calculateBulkDiscountPercentage,
  qualifiesForBulkDiscount,
} from '@sew4mi/shared/constants/group-order';

/**
 * Service for calculating bulk discounts for group orders
 */
export class BulkDiscountService {
  
  /**
   * Calculate bulk discount for a set of orders
   * @param request Bulk discount calculation request
   * @returns Detailed discount breakdown
   */
  calculateDiscount(request: CalculateBulkDiscountRequest): CalculateBulkDiscountResponse {
    const { itemCount, orderAmounts, tailorId } = request;
    
    // Check if qualifies for bulk discount
    if (!qualifiesForBulkDiscount(itemCount)) {
      return {
        originalTotal: orderAmounts.reduce((sum, amount) => sum + amount, 0),
        discountPercentage: 0,
        discountAmount: 0,
        finalTotal: orderAmounts.reduce((sum, amount) => sum + amount, 0),
        savings: 0,
        individualDiscounts: orderAmounts.map((amount, index) => ({
          orderId: `item_${index}`,
          originalAmount: amount,
          discount: 0,
          finalAmount: amount,
        })),
      };
    }
    
    // Get discount percentage based on tier
    let discountPercentage = calculateBulkDiscountPercentage(itemCount);
    
    // Apply tailor-specific discount adjustments if applicable
    if (tailorId) {
      discountPercentage = this.applyTailorDiscountAdjustment(discountPercentage, tailorId);
    }
    
    // Calculate totals
    const originalTotal = orderAmounts.reduce((sum, amount) => sum + amount, 0);
    const discountAmount = (originalTotal * discountPercentage) / 100;
    const finalTotal = originalTotal - discountAmount;
    
    // Calculate individual discounts
    const individualDiscounts: IndividualDiscount[] = orderAmounts.map((amount, index) => {
      const discount = (amount * discountPercentage) / 100;
      return {
        orderId: `item_${index}`,
        originalAmount: amount,
        discount: parseFloat(discount.toFixed(2)),
        finalAmount: parseFloat((amount - discount).toFixed(2)),
      };
    });
    
    return {
      originalTotal: parseFloat(originalTotal.toFixed(2)),
      discountPercentage,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalTotal: parseFloat(finalTotal.toFixed(2)),
      savings: parseFloat(discountAmount.toFixed(2)),
      individualDiscounts,
    };
  }
  
  /**
   * Apply tailor-specific discount adjustments
   * Tailors may offer additional discounts for group orders
   * @param baseDiscountPercentage Base discount percentage
   * @param tailorId Tailor ID
   * @returns Adjusted discount percentage
   * 
   * @example
   * ```typescript
   * const service = new BulkDiscountService();
   * const baseDiscount = 15; // 15% base discount for 3-5 items
   * const adjustedDiscount = service['applyTailorDiscountAdjustment'](baseDiscount, 'tailor-123');
   * // Returns adjusted discount (e.g., 17% if tailor offers 2% bonus)
   * ```
   */
  private applyTailorDiscountAdjustment(
    baseDiscountPercentage: number,
    tailorId: string
  ): number {
    /**
     * Tailor-specific group discount bonuses
     * In a full implementation, this would query the database for:
     * - tailor_profiles.pricing_tiers.group_discount_bonus
     * - tailor_profiles.promotion_settings
     * - Tailor's rating and completion rate to offer loyalty discounts
     * 
     * For now, we apply a simple rule-based adjustment:
     * - Verified tailors with high ratings (4.5+) get +2% bonus
     * - Long-term tailors (2+ years) get +1% bonus
     * - Maximum bonus is capped at 5% above base discount
     */
    
    // This would be replaced with actual database query in production
    // const tailorProfile = await tailorRepository.findById(tailorId);
    
    // Example of what a full implementation would look like:
    // let bonus = 0;
    // if (tailorProfile.rating >= 4.5 && tailorProfile.verification_status === 'VERIFIED') {
    //   bonus += 2;
    // }
    // if (tailorProfile.years_of_experience >= 2) {
    //   bonus += 1;
    // }
    // // Check if tailor has custom group discount settings
    // if (tailorProfile.pricing_tiers?.group_discount_bonus) {
    //   bonus += tailorProfile.pricing_tiers.group_discount_bonus;
    // }
    
    // Cap the bonus at 5%
    // const maxBonus = 5;
    // bonus = Math.min(bonus, maxBonus);
    
    // For now, return base discount (no adjustment)
    // In future iterations, this can be enhanced to pull real tailor settings
    return baseDiscountPercentage;
    
    // Future enhancement: Return adjusted discount
    // return Math.min(baseDiscountPercentage + bonus, 30); // Max 30% total discount
  }
  
  /**
   * Get discount tier information for a given item count
   * @param itemCount Number of items
   * @returns Tier information
   */
  getDiscountTierInfo(itemCount: number): {
    tierName: string;
    discountPercentage: number;
    minItems: number;
    maxItems: number;
    nextTierAt?: number;
    nextTierDiscount?: number;
  } | null {
    if (!qualifiesForBulkDiscount(itemCount)) {
      return {
        tierName: 'No Discount',
        discountPercentage: 0,
        minItems: 0,
        maxItems: 2,
        nextTierAt: BULK_DISCOUNT_TIERS.TIER_1.min,
        nextTierDiscount: BULK_DISCOUNT_TIERS.TIER_1.discountPercentage,
      };
    }
    
    // Determine which tier
    const tiers = Object.entries(BULK_DISCOUNT_TIERS);
    for (let i = 0; i < tiers.length; i++) {
      const [tierName, tier] = tiers[i];
      if (itemCount >= tier.min && itemCount <= tier.max) {
        const nextTier = tiers[i + 1];
        return {
          tierName: tierName.replace('TIER_', 'Tier '),
          discountPercentage: tier.discountPercentage,
          minItems: tier.min,
          maxItems: tier.max,
          nextTierAt: nextTier ? nextTier[1].min : undefined,
          nextTierDiscount: nextTier ? nextTier[1].discountPercentage : undefined,
        };
      }
    }
    
    // Shouldn't reach here, but return tier 3 info as fallback
    return {
      tierName: 'Tier 3',
      discountPercentage: BULK_DISCOUNT_TIERS.TIER_3.discountPercentage,
      minItems: BULK_DISCOUNT_TIERS.TIER_3.min,
      maxItems: Infinity,
    };
  }
  
  /**
   * Calculate potential savings if more items are added
   * @param currentItemCount Current number of items
   * @param currentTotal Current order total
   * @returns Potential savings information
   */
  calculatePotentialSavings(
    currentItemCount: number,
    currentTotal: number
  ): {
    currentDiscount: number;
    currentSavings: number;
    nextTierAt?: number;
    nextTierDiscount?: number;
    nextTierPotentialSavings?: number;
  } {
    const currentDiscount = calculateBulkDiscountPercentage(currentItemCount);
    const currentSavings = (currentTotal * currentDiscount) / 100;
    
    const tierInfo = this.getDiscountTierInfo(currentItemCount);
    
    if (tierInfo?.nextTierAt && tierInfo?.nextTierDiscount) {
      const nextTierPotentialSavings = (currentTotal * tierInfo.nextTierDiscount) / 100;
      
      return {
        currentDiscount,
        currentSavings: parseFloat(currentSavings.toFixed(2)),
        nextTierAt: tierInfo.nextTierAt,
        nextTierDiscount: tierInfo.nextTierDiscount,
        nextTierPotentialSavings: parseFloat(nextTierPotentialSavings.toFixed(2)),
      };
    }
    
    return {
      currentDiscount,
      currentSavings: parseFloat(currentSavings.toFixed(2)),
    };
  }
  
  /**
   * Apply discount to individual order amounts
   * @param orderAmounts Array of order amounts
   * @param discountPercentage Discount percentage to apply
   * @returns Array of discounted amounts
   */
  applyDiscountToAmounts(
    orderAmounts: number[],
    discountPercentage: number
  ): number[] {
    return orderAmounts.map(amount => {
      const discount = (amount * discountPercentage) / 100;
      return parseFloat((amount - discount).toFixed(2));
    });
  }
  
  /**
   * Validate discount request
   * @param request Discount calculation request
   * @returns Validation result
   */
  validateDiscountRequest(request: CalculateBulkDiscountRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (request.itemCount !== request.orderAmounts.length) {
      errors.push('Item count must match the number of order amounts');
    }
    
    if (request.orderAmounts.some(amount => amount <= 0)) {
      errors.push('All order amounts must be positive');
    }
    
    if (request.itemCount < 1) {
      errors.push('Item count must be at least 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const bulkDiscountService = new BulkDiscountService();

