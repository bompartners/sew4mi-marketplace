/**
 * Types for Story 4.3: Reorder and Favorites - Reorder System
 */

/**
 * Modifications to apply when reordering
 */
export interface ReorderModifications {
  fabricChoice?: string;
  colorChoice?: string;
  measurementProfileId?: string;
  specialInstructions?: string;
}

/**
 * Request to reorder an existing order
 */
export interface ReorderRequest {
  orderId: string;
  modifications?: ReorderModifications;
}

/**
 * Pricing breakdown for reorder preview
 */
export interface ReorderPricingBreakdown {
  basePrice: number;
  fabricUpcharge?: number;
  modificationFees?: number;
  loyaltyDiscount?: number;
  totalAmount: number;
}

/**
 * Tailor availability for reorder
 */
export interface TailorAvailability {
  available: boolean;
  reason?: string;
  nextAvailableDate?: Date;
  alternativeTailors?: string[];
}

/**
 * Reorder preview response
 */
export interface ReorderPreview {
  order: {
    id: string;
    garmentType: string;
    fabricChoice: string;
    colorChoice?: string;
    specialInstructions?: string;
    measurementProfileId: string;
  };
  tailor: {
    id: string;
    businessName: string;
    availability: TailorAvailability;
  };
  estimatedDelivery: Date;
  pricing: ReorderPricingBreakdown;
}

/**
 * Reorder validation result
 */
export interface ReorderValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
