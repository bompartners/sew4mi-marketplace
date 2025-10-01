/**
 * Group Order Management Constants
 * Business rules and configuration for group orders
 */

/**
 * Minimum number of orders required to qualify for bulk discount
 */
export const MIN_ORDERS_FOR_BULK_DISCOUNT = 3;

/**
 * Maximum number of orders allowed in a single group order
 */
export const MAX_ORDERS_PER_GROUP = 20;

/**
 * Bulk discount tiers based on number of orders
 */
export const BULK_DISCOUNT_TIERS = {
  /** 3-5 orders: 15% discount */
  TIER_1: { min: 3, max: 5, discountPercentage: 15 },
  
  /** 6-9 orders: 20% discount */
  TIER_2: { min: 6, max: 9, discountPercentage: 20 },
  
  /** 10+ orders: 25% discount */
  TIER_3: { min: 10, max: Infinity, discountPercentage: 25 },
} as const;

/**
 * Fabric buffer percentage for bulk ordering (to account for waste)
 */
export const FABRIC_BUFFER_PERCENTAGE = 10;

/**
 * Default payment split configuration
 */
export const DEFAULT_PAYMENT_SPLIT = {
  /** Deposit percentage (25% of total) */
  DEPOSIT: 0.25,
  
  /** Fitting payment percentage (50% of total) */
  FITTING: 0.50,
  
  /** Final payment percentage (25% of total) */
  FINAL: 0.25,
} as const;

/**
 * Event type display names for Ghana cultural context
 */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: 'Wedding Ceremony',
  FUNERAL: 'Funeral Service',
  NAMING_CEREMONY: 'Outdooring/Naming Ceremony',
  FESTIVAL: 'Cultural Festival',
  CHURCH_EVENT: 'Church Event',
  FAMILY_REUNION: 'Family Reunion',
  BIRTHDAY: 'Birthday Celebration',
  OTHER: 'Other Event',
};

/**
 * Group order status labels
 */
export const GROUP_ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  PARTIALLY_COMPLETED: 'Partially Completed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Payment mode labels
 */
export const PAYMENT_MODE_LABELS: Record<string, string> = {
  SINGLE_PAYER: 'Single Payer',
  SPLIT_PAYMENT: 'Split Payment',
};

/**
 * Delivery strategy labels
 */
export const DELIVERY_STRATEGY_LABELS: Record<string, string> = {
  ALL_TOGETHER: 'Deliver All Together',
  STAGGERED: 'Staggered Delivery',
};

/**
 * Payment status labels
 */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PARTIAL: 'Partial Payment',
  COMPLETED: 'Fully Paid',
  OVERDUE: 'Overdue',
};

/**
 * Delivery status labels
 */
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  READY: 'Ready for Pickup',
  IN_TRANSIT: 'Out for Delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery Failed',
};

/**
 * Progress thresholds for group order completion
 */
export const PROGRESS_THRESHOLDS = {
  /** Percentage at which group is considered "mostly complete" */
  MOSTLY_COMPLETE: 75,
  
  /** Percentage at which to send reminder notifications */
  REMINDER_THRESHOLD: 50,
} as const;

/**
 * Notification templates for group orders
 */
export const GROUP_ORDER_NOTIFICATIONS = {
  /** When group order is confirmed */
  CONFIRMED: 'Your group order for {eventName} has been confirmed. {totalOrders} items for {finalAmount} GHS.',
  
  /** When first item is completed */
  FIRST_ITEM_COMPLETE: 'Great news! The first item in your group order is complete and ready for delivery.',
  
  /** When 50% of items are complete */
  HALFWAY_COMPLETE: 'Your group order is halfway complete! {completedItems} of {totalItems} items are done.',
  
  /** When all items are complete */
  ALL_COMPLETE: 'Excellent! All items in your group order for {eventName} are now complete.',
  
  /** Payment reminder for split payment */
  PAYMENT_REMINDER: 'Reminder: Payment of {amount} GHS is due for your items in group order {groupOrderNumber}.',
  
  /** Staggered delivery notification */
  READY_FOR_PICKUP: '{itemCount} item(s) from your group order are ready for pickup/delivery.',
} as const;

/**
 * Maximum time (in hours) to hold a draft group order before expiration
 */
export const DRAFT_EXPIRATION_HOURS = 72;

/**
 * Default coordination suggestions for common event types
 */
export const DEFAULT_COORDINATION_SUGGESTIONS: Record<string, string[]> = {
  WEDDING: [
    'Consider matching gold or silver accessories across all outfits',
    'Coordinate embroidery patterns for a unified look',
    'Choose complementary colors for bridal party coordination',
    'Plan fabric selection for consistent sheen and texture',
  ],
  FUNERAL: [
    'Traditional black or dark colors are customary',
    'Consider matching black and red fabric combinations',
    'Coordinate respectful traditional patterns',
    'Ensure modest and appropriate styling for all garments',
  ],
  NAMING_CEREMONY: [
    'Bright, celebratory colors work well',
    'Consider traditional Kente patterns for family unity',
    'Coordinate parent outfits for photo opportunities',
    'Plan matching accessories for immediate family',
  ],
  FESTIVAL: [
    'Vibrant traditional fabrics showcase cultural pride',
    'Coordinate patterns and colors for group photos',
    'Consider matching headwear and accessories',
    'Plan for comfort in outdoor settings',
  ],
};

/**
 * Validation rules for group orders
 */
export const VALIDATION_RULES = {
  /** Minimum group name length */
  MIN_GROUP_NAME_LENGTH: 3,
  
  /** Maximum group name length */
  MAX_GROUP_NAME_LENGTH: 100,
  
  /** Maximum coordination notes length */
  MAX_NOTES_LENGTH: 1000,
  
  /** Minimum participants for a group order */
  MIN_PARTICIPANTS: 2,
  
  /** Days in advance required for group orders */
  MIN_ADVANCE_DAYS: 14,
} as const;

/**
 * Default values for group order creation
 */
export const GROUP_ORDER_DEFAULTS = {
  /** Default event type if not specified */
  DEFAULT_EVENT_TYPE: null,
  
  /** Default payment mode */
  DEFAULT_PAYMENT_MODE: 'SINGLE_PAYER' as const,
  
  /** Default delivery strategy */
  DEFAULT_DELIVERY_STRATEGY: 'ALL_TOGETHER' as const,
  
  /** Default discount percentage before tier calculation */
  DEFAULT_DISCOUNT_PERCENTAGE: 0,
  
  /** Default delivery priority */
  DEFAULT_DELIVERY_PRIORITY: 5,
} as const;

/**
 * Helper function to calculate bulk discount tier
 * @param itemCount Number of items in the group order
 * @returns Discount percentage based on tier
 */
export function calculateBulkDiscountPercentage(itemCount: number): number {
  if (itemCount < MIN_ORDERS_FOR_BULK_DISCOUNT) {
    return 0;
  }
  
  const tiers = Object.values(BULK_DISCOUNT_TIERS);
  for (const tier of tiers) {
    if (itemCount >= tier.min && itemCount <= tier.max) {
      return tier.discountPercentage;
    }
  }
  
  return 0;
}

/**
 * Helper function to calculate fabric quantity with buffer
 * @param baseYardage Base yardage needed
 * @returns Total yardage including buffer
 */
export function calculateFabricWithBuffer(baseYardage: number): number {
  return baseYardage * (1 + FABRIC_BUFFER_PERCENTAGE / 100);
}

/**
 * Helper function to check if group order qualifies for bulk discount
 * @param itemCount Number of items in the group order
 * @returns True if qualifies for bulk discount
 */
export function qualifiesForBulkDiscount(itemCount: number): boolean {
  return itemCount >= MIN_ORDERS_FOR_BULK_DISCOUNT;
}

/**
 * Helper function to get event type label
 * @param eventType Event type enum value
 * @returns Display label for event type
 */
export function getEventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] || eventType;
}

/**
 * Helper function to get coordination suggestions for event type
 * @param eventType Event type enum value
 * @returns Array of coordination suggestions
 */
export function getCoordinationSuggestions(eventType: string): string[] {
  return DEFAULT_COORDINATION_SUGGESTIONS[eventType] || [];
}

