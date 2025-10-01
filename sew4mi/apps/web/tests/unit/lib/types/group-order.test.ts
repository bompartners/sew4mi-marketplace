/**
 * Unit tests for group order types, validation schemas, and business logic
 */

import { describe, it, expect } from 'vitest';
import {
  GroupOrderStatus,
  PaymentMode,
  DeliveryStrategy,
  PaymentStatus,
  DeliveryStatus,
  EventType,
} from '@sew4mi/shared/types/group-order';
import {
  CreateGroupOrderRequestSchema,
  CalculateBulkDiscountRequestSchema,
  ProcessGroupPaymentRequestSchema,
  GroupOrderProgressRequestSchema,
  UpdateDeliveryScheduleRequestSchema,
  FabricDetailsSchema,
} from '@sew4mi/shared/schemas/group-order.schema';
import {
  MIN_ORDERS_FOR_BULK_DISCOUNT,
  MAX_ORDERS_PER_GROUP,
  BULK_DISCOUNT_TIERS,
  VALIDATION_RULES,
  calculateBulkDiscountPercentage,
  calculateFabricWithBuffer,
  qualifiesForBulkDiscount,
  getEventTypeLabel,
  getCoordinationSuggestions,
  FABRIC_BUFFER_PERCENTAGE,
} from '@sew4mi/shared/constants/group-order';

describe('Group Order Enums', () => {
  describe('GroupOrderStatus', () => {
    it('should contain all expected group order statuses', () => {
      expect(GroupOrderStatus.DRAFT).toBe('DRAFT');
      expect(GroupOrderStatus.CONFIRMED).toBe('CONFIRMED');
      expect(GroupOrderStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(GroupOrderStatus.PARTIALLY_COMPLETED).toBe('PARTIALLY_COMPLETED');
      expect(GroupOrderStatus.COMPLETED).toBe('COMPLETED');
      expect(GroupOrderStatus.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('PaymentMode', () => {
    it('should contain all expected payment modes', () => {
      expect(PaymentMode.SINGLE_PAYER).toBe('SINGLE_PAYER');
      expect(PaymentMode.SPLIT_PAYMENT).toBe('SPLIT_PAYMENT');
    });
  });

  describe('DeliveryStrategy', () => {
    it('should contain all expected delivery strategies', () => {
      expect(DeliveryStrategy.ALL_TOGETHER).toBe('ALL_TOGETHER');
      expect(DeliveryStrategy.STAGGERED).toBe('STAGGERED');
    });
  });

  describe('EventType', () => {
    it('should contain all expected event types', () => {
      expect(EventType.WEDDING).toBe('WEDDING');
      expect(EventType.FUNERAL).toBe('FUNERAL');
      expect(EventType.NAMING_CEREMONY).toBe('NAMING_CEREMONY');
      expect(EventType.FESTIVAL).toBe('FESTIVAL');
      expect(EventType.CHURCH_EVENT).toBe('CHURCH_EVENT');
      expect(EventType.FAMILY_REUNION).toBe('FAMILY_REUNION');
      expect(EventType.BIRTHDAY).toBe('BIRTHDAY');
      expect(EventType.OTHER).toBe('OTHER');
    });
  });

  describe('PaymentStatus', () => {
    it('should contain all expected payment statuses', () => {
      expect(PaymentStatus.PENDING).toBe('PENDING');
      expect(PaymentStatus.PARTIAL).toBe('PARTIAL');
      expect(PaymentStatus.COMPLETED).toBe('COMPLETED');
      expect(PaymentStatus.OVERDUE).toBe('OVERDUE');
    });
  });

  describe('DeliveryStatus', () => {
    it('should contain all expected delivery statuses', () => {
      expect(DeliveryStatus.SCHEDULED).toBe('SCHEDULED');
      expect(DeliveryStatus.READY).toBe('READY');
      expect(DeliveryStatus.IN_TRANSIT).toBe('IN_TRANSIT');
      expect(DeliveryStatus.DELIVERED).toBe('DELIVERED');
      expect(DeliveryStatus.FAILED).toBe('FAILED');
    });
  });
});

describe('Group Order Constants and Business Rules', () => {
  describe('Bulk Discount Tiers', () => {
    it('should have correct tier structure', () => {
      expect(MIN_ORDERS_FOR_BULK_DISCOUNT).toBe(3);
      expect(BULK_DISCOUNT_TIERS.TIER_1.min).toBe(3);
      expect(BULK_DISCOUNT_TIERS.TIER_1.max).toBe(5);
      expect(BULK_DISCOUNT_TIERS.TIER_1.discountPercentage).toBe(15);
      
      expect(BULK_DISCOUNT_TIERS.TIER_2.min).toBe(6);
      expect(BULK_DISCOUNT_TIERS.TIER_2.max).toBe(9);
      expect(BULK_DISCOUNT_TIERS.TIER_2.discountPercentage).toBe(20);
      
      expect(BULK_DISCOUNT_TIERS.TIER_3.min).toBe(10);
      expect(BULK_DISCOUNT_TIERS.TIER_3.discountPercentage).toBe(25);
    });
  });

  describe('calculateBulkDiscountPercentage', () => {
    it('should return 0% for orders below minimum threshold', () => {
      expect(calculateBulkDiscountPercentage(1)).toBe(0);
      expect(calculateBulkDiscountPercentage(2)).toBe(0);
    });

    it('should return 15% for Tier 1 (3-5 items)', () => {
      expect(calculateBulkDiscountPercentage(3)).toBe(15);
      expect(calculateBulkDiscountPercentage(4)).toBe(15);
      expect(calculateBulkDiscountPercentage(5)).toBe(15);
    });

    it('should return 20% for Tier 2 (6-9 items)', () => {
      expect(calculateBulkDiscountPercentage(6)).toBe(20);
      expect(calculateBulkDiscountPercentage(7)).toBe(20);
      expect(calculateBulkDiscountPercentage(9)).toBe(20);
    });

    it('should return 25% for Tier 3 (10+ items)', () => {
      expect(calculateBulkDiscountPercentage(10)).toBe(25);
      expect(calculateBulkDiscountPercentage(15)).toBe(25);
      expect(calculateBulkDiscountPercentage(20)).toBe(25);
    });
  });

  describe('qualifiesForBulkDiscount', () => {
    it('should return false for orders below minimum', () => {
      expect(qualifiesForBulkDiscount(1)).toBe(false);
      expect(qualifiesForBulkDiscount(2)).toBe(false);
    });

    it('should return true for orders at or above minimum', () => {
      expect(qualifiesForBulkDiscount(3)).toBe(true);
      expect(qualifiesForBulkDiscount(5)).toBe(true);
      expect(qualifiesForBulkDiscount(10)).toBe(true);
    });
  });

  describe('calculateFabricWithBuffer', () => {
    it('should calculate fabric quantity with correct buffer', () => {
      const baseYardage = 10;
      const expected = baseYardage * (1 + FABRIC_BUFFER_PERCENTAGE / 100);
      expect(calculateFabricWithBuffer(baseYardage)).toBe(expected);
      expect(calculateFabricWithBuffer(10)).toBe(11); // 10 + 10% = 11
    });

    it('should handle different base yardages correctly', () => {
      expect(calculateFabricWithBuffer(20)).toBeCloseTo(22, 2); // 20 + 10% = 22
      expect(calculateFabricWithBuffer(50)).toBeCloseTo(55, 2); // 50 + 10% = 55
      expect(calculateFabricWithBuffer(5.5)).toBeCloseTo(6.05, 2); // 5.5 + 10% = 6.05
    });
  });

  describe('getEventTypeLabel', () => {
    it('should return correct labels for event types', () => {
      expect(getEventTypeLabel('WEDDING')).toBe('Wedding Ceremony');
      expect(getEventTypeLabel('FUNERAL')).toBe('Funeral Service');
      expect(getEventTypeLabel('NAMING_CEREMONY')).toBe('Outdooring/Naming Ceremony');
      expect(getEventTypeLabel('FESTIVAL')).toBe('Cultural Festival');
    });

    it('should return the event type itself if no label found', () => {
      expect(getEventTypeLabel('UNKNOWN_EVENT')).toBe('UNKNOWN_EVENT');
    });
  });

  describe('getCoordinationSuggestions', () => {
    it('should return suggestions for wedding events', () => {
      const suggestions = getCoordinationSuggestions('WEDDING');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('gold'))).toBe(true);
    });

    it('should return suggestions for funeral events', () => {
      const suggestions = getCoordinationSuggestions('FUNERAL');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('black'))).toBe(true);
    });

    it('should return suggestions for naming ceremonies', () => {
      const suggestions = getCoordinationSuggestions('NAMING_CEREMONY');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('celebratory'))).toBe(true);
    });

    it('should return empty array for unknown event types', () => {
      const suggestions = getCoordinationSuggestions('UNKNOWN_EVENT');
      expect(suggestions).toEqual([]);
    });
  });
});

describe('Group Order Schema Validation', () => {
  describe('FabricDetailsSchema', () => {
    const validFabricDetails = {
      fabricType: 'KENTE',
      fabricColor: 'Royal Blue and Gold',
      totalYardage: 30,
      costPerYard: 50,
      totalFabricCost: 1500,
      fabricSource: 'TAILOR_SOURCED' as const,
    };

    it('should validate complete fabric details', () => {
      const result = FabricDetailsSchema.safeParse(validFabricDetails);
      expect(result.success).toBe(true);
    });

    it('should require fabric type', () => {
      const invalid = { ...validFabricDetails, fabricType: '' };
      const result = FabricDetailsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require fabric color', () => {
      const invalid = { ...validFabricDetails, fabricColor: '' };
      const result = FabricDetailsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate positive total yardage', () => {
      const invalid = { ...validFabricDetails, totalYardage: -5 };
      const result = FabricDetailsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate non-negative cost per yard', () => {
      const invalid = { ...validFabricDetails, costPerYard: -10 };
      const result = FabricDetailsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept optional fabric pattern', () => {
      const withPattern = { ...validFabricDetails, fabricPattern: 'Adinkra' };
      const result = FabricDetailsSchema.safeParse(withPattern);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateGroupOrderRequestSchema', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20); // 20 days in future

    const validGroupOrderRequest = {
      groupName: 'Family Wedding Order',
      eventType: 'WEDDING' as const,
      eventDate: futureDate,
      familyMemberProfiles: [
        {
          profileId: '123e4567-e89b-12d3-a456-426614174000',
          garmentType: 'Traditional Kente Gown',
          deliveryPriority: 1,
        },
        {
          profileId: '123e4567-e89b-12d3-a456-426614174001',
          garmentType: 'Agbada',
          deliveryPriority: 2,
        },
        {
          profileId: '123e4567-e89b-12d3-a456-426614174002',
          garmentType: "Children's Traditional Wear",
          deliveryPriority: 3,
        },
      ],
      sharedFabric: true,
      fabricDetails: {
        fabricType: 'KENTE',
        fabricColor: 'Royal Blue and Gold',
        totalYardage: 30,
        costPerYard: 50,
        totalFabricCost: 1500,
        fabricSource: 'TAILOR_SOURCED' as const,
      },
      paymentMode: 'SINGLE_PAYER' as const,
      deliveryStrategy: 'ALL_TOGETHER' as const,
      coordinationNotes: 'All outfits should match traditional Ashanti wedding theme',
    };

    it('should validate a complete valid group order request', () => {
      const result = CreateGroupOrderRequestSchema.safeParse(validGroupOrderRequest);
      expect(result.success).toBe(true);
    });

    it('should require group name with minimum length', () => {
      const invalid = { ...validGroupOrderRequest, groupName: 'AB' };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum group name length', () => {
      const invalid = { ...validGroupOrderRequest, groupName: 'A'.repeat(101) };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require minimum number of participants', () => {
      const invalid = {
        ...validGroupOrderRequest,
        familyMemberProfiles: [validGroupOrderRequest.familyMemberProfiles[0]],
      };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum orders per group', () => {
      const tooManyProfiles = Array(MAX_ORDERS_PER_GROUP + 1).fill({
        profileId: '123e4567-e89b-12d3-a456-426614174000',
        garmentType: 'Test Garment',
      });
      const invalid = { ...validGroupOrderRequest, familyMemberProfiles: tooManyProfiles };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require fabric details when sharedFabric is true', () => {
      const invalid = { ...validGroupOrderRequest, fabricDetails: undefined };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should allow missing fabric details when sharedFabric is false', () => {
      const valid = {
        ...validGroupOrderRequest,
        sharedFabric: false,
        fabricDetails: undefined,
      };
      const result = CreateGroupOrderRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate event date is in the future', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const invalid = { ...validGroupOrderRequest, eventDate: pastDate };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require event date at least MIN_ADVANCE_DAYS in advance', () => {
      const tooSoonDate = new Date();
      tooSoonDate.setDate(tooSoonDate.getDate() + 5); // Only 5 days, but MIN_ADVANCE_DAYS is 14
      const invalid = { ...validGroupOrderRequest, eventDate: tooSoonDate };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate family member profile IDs are UUIDs', () => {
      const invalid = {
        ...validGroupOrderRequest,
        familyMemberProfiles: [
          { ...validGroupOrderRequest.familyMemberProfiles[0], profileId: 'invalid-uuid' },
          validGroupOrderRequest.familyMemberProfiles[1],
        ],
      };
      const result = CreateGroupOrderRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CalculateBulkDiscountRequestSchema', () => {
    const validDiscountRequest = {
      itemCount: 5,
      orderAmounts: [200, 250, 300, 150, 180],
    };

    it('should validate a valid bulk discount request', () => {
      const result = CalculateBulkDiscountRequestSchema.safeParse(validDiscountRequest);
      expect(result.success).toBe(true);
    });

    it('should require item count to match order amounts length', () => {
      const invalid = { ...validDiscountRequest, itemCount: 3 };
      const result = CalculateBulkDiscountRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate positive order amounts', () => {
      const invalid = { ...validDiscountRequest, orderAmounts: [200, -100, 300, 150, 180] };
      const result = CalculateBulkDiscountRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum items per group', () => {
      const tooManyAmounts = Array(MAX_ORDERS_PER_GROUP + 1).fill(100);
      const invalid = {
        itemCount: MAX_ORDERS_PER_GROUP + 1,
        orderAmounts: tooManyAmounts,
      };
      const result = CalculateBulkDiscountRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ProcessGroupPaymentRequestSchema', () => {
    const validPaymentRequest = {
      groupOrderId: '123e4567-e89b-12d3-a456-426614174000',
      payerId: '123e4567-e89b-12d3-a456-426614174001',
      orderIds: [
        '123e4567-e89b-12d3-a456-426614174002',
        '123e4567-e89b-12d3-a456-426614174003',
      ],
      amount: 500,
      paymentStage: 'DEPOSIT' as const,
      paymentMethod: 'MTN_MOMO',
      paymentReference: 'REF12345',
    };

    it('should validate a valid payment request', () => {
      const result = ProcessGroupPaymentRequestSchema.safeParse(validPaymentRequest);
      expect(result.success).toBe(true);
    });

    it('should require valid UUID for groupOrderId', () => {
      const invalid = { ...validPaymentRequest, groupOrderId: 'invalid-uuid' };
      const result = ProcessGroupPaymentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require at least one order ID', () => {
      const invalid = { ...validPaymentRequest, orderIds: [] };
      const result = ProcessGroupPaymentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate positive payment amount', () => {
      const invalid = { ...validPaymentRequest, amount: -100 };
      const result = ProcessGroupPaymentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate payment stage enum', () => {
      const invalid = { ...validPaymentRequest, paymentStage: 'INVALID_STAGE' };
      const result = ProcessGroupPaymentRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('GroupOrderProgressRequestSchema', () => {
    it('should validate valid progress request', () => {
      const valid = {
        groupOrderId: '123e4567-e89b-12d3-a456-426614174000',
        includeItems: true,
      };
      const result = GroupOrderProgressRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require valid UUID for groupOrderId', () => {
      const invalid = {
        groupOrderId: 'invalid-uuid',
        includeItems: false,
      };
      const result = GroupOrderProgressRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should allow optional includeItems', () => {
      const valid = {
        groupOrderId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = GroupOrderProgressRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateDeliveryScheduleRequestSchema', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const validDeliveryScheduleRequest = {
      groupOrderId: '123e4567-e89b-12d3-a456-426614174000',
      deliveryStrategy: 'STAGGERED' as const,
      schedules: [
        {
          orderItemIds: [
            '123e4567-e89b-12d3-a456-426614174001',
            '123e4567-e89b-12d3-a456-426614174002',
          ],
          scheduledDate: futureDate,
          notes: 'First batch delivery',
        },
      ],
    };

    it('should validate a valid delivery schedule request', () => {
      const result = UpdateDeliveryScheduleRequestSchema.safeParse(validDeliveryScheduleRequest);
      expect(result.success).toBe(true);
    });

    it('should require at least one schedule', () => {
      const invalid = { ...validDeliveryScheduleRequest, schedules: [] };
      const result = UpdateDeliveryScheduleRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require at least one order item per schedule', () => {
      const invalid = {
        ...validDeliveryScheduleRequest,
        schedules: [
          {
            orderItemIds: [],
            scheduledDate: futureDate,
          },
        ],
      };
      const result = UpdateDeliveryScheduleRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate UUID format for order item IDs', () => {
      const invalid = {
        ...validDeliveryScheduleRequest,
        schedules: [
          {
            orderItemIds: ['invalid-uuid'],
            scheduledDate: futureDate,
          },
        ],
      };
      const result = UpdateDeliveryScheduleRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum notes length', () => {
      const invalid = {
        ...validDeliveryScheduleRequest,
        schedules: [
          {
            ...validDeliveryScheduleRequest.schedules[0],
            notes: 'A'.repeat(501),
          },
        ],
      };
      const result = UpdateDeliveryScheduleRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

describe('Group Order Validation Rules', () => {
  it('should have correct validation constants', () => {
    expect(VALIDATION_RULES.MIN_GROUP_NAME_LENGTH).toBe(3);
    expect(VALIDATION_RULES.MAX_GROUP_NAME_LENGTH).toBe(100);
    expect(VALIDATION_RULES.MAX_NOTES_LENGTH).toBe(1000);
    expect(VALIDATION_RULES.MIN_PARTICIPANTS).toBe(2);
    expect(VALIDATION_RULES.MIN_ADVANCE_DAYS).toBe(14);
  });

  it('should enforce minimum participants for group orders', () => {
    expect(VALIDATION_RULES.MIN_PARTICIPANTS).toBeGreaterThan(1);
  });

  it('should require reasonable advance notice for events', () => {
    expect(VALIDATION_RULES.MIN_ADVANCE_DAYS).toBeGreaterThanOrEqual(14);
  });
});

