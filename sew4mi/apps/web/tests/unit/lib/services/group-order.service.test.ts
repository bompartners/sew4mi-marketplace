/**
 * Unit tests for GroupOrderService
 * Tests business logic for group order management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupOrderService } from '@/lib/services/group-order.service';
import { EventType, PaymentMode, DeliveryStrategy, GroupOrderStatus } from '@sew4mi/shared/types/group-order';

// Mock the repository and supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }),
}));

vi.mock('@/lib/repositories/groupOrderRepository', () => ({
  GroupOrderRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findById: vi.fn(),
    findByOrganizer: vi.fn(),
    findItems: vi.fn(),
    findPaymentTracking: vi.fn(),
    findDeliverySchedules: vi.fn(),
    updateProgress: vi.fn(),
    update: vi.fn(),
    createItem: vi.fn(),
  })),
}));

describe('GroupOrderService', () => {
  let service: GroupOrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GroupOrderService();
  });

  describe('calculateBulkDiscount', () => {
    it('should calculate 0% discount for less than 3 items', () => {
      const request = {
        itemCount: 2,
        orderAmounts: [200, 300],
      };

      const result = service.calculateBulkDiscount(request);

      expect(result.discountPercentage).toBe(0);
      expect(result.originalTotal).toBe(500);
      expect(result.finalTotal).toBe(500);
      expect(result.savings).toBe(0);
    });

    it('should calculate 15% discount for 3-5 items', () => {
      const request = {
        itemCount: 3,
        orderAmounts: [200, 250, 300],
      };

      const result = service.calculateBulkDiscount(request);

      expect(result.discountPercentage).toBe(15);
      expect(result.originalTotal).toBe(750);
      expect(result.discountAmount).toBeCloseTo(112.5, 2);
      expect(result.finalTotal).toBeCloseTo(637.5, 2);
      expect(result.savings).toBeCloseTo(112.5, 2);
    });

    it('should calculate 20% discount for 6-9 items', () => {
      const request = {
        itemCount: 6,
        orderAmounts: [200, 200, 200, 200, 200, 200],
      };

      const result = service.calculateBulkDiscount(request);

      expect(result.discountPercentage).toBe(20);
      expect(result.originalTotal).toBe(1200);
      expect(result.discountAmount).toBe(240);
      expect(result.finalTotal).toBe(960);
    });

    it('should calculate 25% discount for 10+ items', () => {
      const request = {
        itemCount: 10,
        orderAmounts: Array(10).fill(100),
      };

      const result = service.calculateBulkDiscount(request);

      expect(result.discountPercentage).toBe(25);
      expect(result.originalTotal).toBe(1000);
      expect(result.discountAmount).toBe(250);
      expect(result.finalTotal).toBe(750);
      expect(result.savings).toBe(250);
    });

    it('should return individual discounts for each item', () => {
      const request = {
        itemCount: 3,
        orderAmounts: [100, 200, 300],
      };

      const result = service.calculateBulkDiscount(request);

      expect(result.individualDiscounts).toHaveLength(3);
      expect(result.individualDiscounts[0].originalAmount).toBe(100);
      expect(result.individualDiscounts[0].discount).toBeCloseTo(15, 2);
      expect(result.individualDiscounts[0].finalAmount).toBeCloseTo(85, 2);
      
      expect(result.individualDiscounts[1].originalAmount).toBe(200);
      expect(result.individualDiscounts[1].discount).toBeCloseTo(30, 2);
      expect(result.individualDiscounts[1].finalAmount).toBeCloseTo(170, 2);
      
      expect(result.individualDiscounts[2].originalAmount).toBe(300);
      expect(result.individualDiscounts[2].discount).toBeCloseTo(45, 2);
      expect(result.individualDiscounts[2].finalAmount).toBeCloseTo(255, 2);
    });
  });

  describe('createGroupOrder', () => {
    it('should create group order with correct bulk discount calculation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const request = {
        groupName: 'Test Family Wedding',
        eventType: EventType.WEDDING,
        eventDate: futureDate,
        familyMemberProfiles: [
          { profileId: 'profile1', garmentType: 'Gown' },
          { profileId: 'profile2', garmentType: 'Suit' },
          { profileId: 'profile3', garmentType: 'Dress' },
        ],
        sharedFabric: false,
        paymentMode: PaymentMode.SINGLE_PAYER,
        deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
      };

      const mockGroupOrder = {
        id: 'test-group-id',
        group_name: request.groupName,
        bulk_discount_percentage: 15,
        status: GroupOrderStatus.DRAFT,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock repository create method
      const mockCreate = vi.fn().mockResolvedValue(mockGroupOrder);
      (service as any).repository.create = mockCreate;

      const result = await service.createGroupOrder(request, 'user123');

      expect(result.success).toBe(true);
      expect(result.bulkDiscount).toBe(15);
      expect(result.groupOrderNumber).toBeDefined();
      expect(result.coordinationSuggestions).toBeDefined();
      expect(result.coordinationSuggestions.length).toBeGreaterThan(0); // Wedding has suggestions
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should apply fabric buffer when shared fabric is used', async () => {
      const request = {
        groupName: 'Test Order',
        familyMemberProfiles: [
          { profileId: 'p1', garmentType: 'Gown' },
          { profileId: 'p2', garmentType: 'Suit' },
        ],
        sharedFabric: true,
        fabricDetails: {
          fabricType: 'KENTE',
          fabricColor: 'Blue',
          totalYardage: 10,
          costPerYard: 50,
          fabricSource: 'TAILOR_SOURCED' as const,
        },
        paymentMode: PaymentMode.SINGLE_PAYER,
        deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
      };

      const mockCreate = vi.fn().mockResolvedValue({
        id: 'test-id',
        status: GroupOrderStatus.DRAFT,
      });
      (service as any).repository.create = mockCreate;

      await service.createGroupOrder(request, 'user123');

      // Verify fabric buffer was applied (10 yards + 10% = 11 yards)
      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.total_yardage).toBe(11);
      expect(createCall.total_fabric_cost).toBe(550); // 11 * 50
    });

    it('should handle errors gracefully', async () => {
      const request = {
        groupName: 'Test Order',
        familyMemberProfiles: [
          { profileId: 'p1', garmentType: 'Gown' },
        ],
        sharedFabric: false,
        paymentMode: PaymentMode.SINGLE_PAYER,
        deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
      };

      const mockCreate = vi.fn().mockRejectedValue(new Error('Database error'));
      (service as any).repository.create = mockCreate;

      const result = await service.createGroupOrder(request, 'user123');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateGroupOrderProgress', () => {
    it('should calculate progress summary correctly', async () => {
      const mockItems = [
        { status: 'COMPLETED', progress_percentage: 100 },
        { status: 'IN_PROGRESS', progress_percentage: 50 },
        { status: 'PENDING', progress_percentage: 0 },
        { status: 'READY_FOR_DELIVERY', progress_percentage: 100 },
      ];

      const mockFindItems = vi.fn().mockResolvedValue(mockItems);
      const mockUpdateProgress = vi.fn().mockResolvedValue(undefined);
      (service as any).repository.findItems = mockFindItems;
      (service as any).repository.updateProgress = mockUpdateProgress;

      const result = await service.updateGroupOrderProgress('group123');

      expect(result).not.toBeNull();
      expect(result?.totalItems).toBe(4);
      expect(result?.completedItems).toBe(1);
      expect(result?.inProgressItems).toBe(1);
      expect(result?.readyForDelivery).toBe(1);
      expect(result?.pendingItems).toBe(1);
      expect(result?.overallProgressPercentage).toBe(62.5); // (100+50+0+100)/4
      expect(mockUpdateProgress).toHaveBeenCalled();
    });

    it('should return null when no items found', async () => {
      const mockFindItems = vi.fn().mockResolvedValue([]);
      (service as any).repository.findItems = mockFindItems;

      const result = await service.updateGroupOrderProgress('group123');

      expect(result).toBeNull();
    });
  });

  describe('getUserGroupOrders', () => {
    it('should return mapped group orders for user', async () => {
      const mockOrders = [
        {
          id: 'order1',
          group_name: 'Wedding Order',
          organizer_id: 'user123',
          status: GroupOrderStatus.IN_PROGRESS,
          total_orders: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'order2',
          group_name: 'Funeral Order',
          organizer_id: 'user123',
          status: GroupOrderStatus.COMPLETED,
          total_orders: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockFindByOrganizer = vi.fn().mockResolvedValue(mockOrders);
      (service as any).repository.findByOrganizer = mockFindByOrganizer;

      const result = await service.getUserGroupOrders('user123');

      expect(result).toHaveLength(2);
      expect(result[0].groupName).toBe('Wedding Order');
      expect(result[1].groupName).toBe('Funeral Order');
      expect(mockFindByOrganizer).toHaveBeenCalledWith('user123');
    });

    it('should return empty array on error', async () => {
      const mockFindByOrganizer = vi.fn().mockRejectedValue(new Error('DB error'));
      (service as any).repository.findByOrganizer = mockFindByOrganizer;

      const result = await service.getUserGroupOrders('user123');

      expect(result).toEqual([]);
    });
  });

  describe('getGroupOrderSummary', () => {
    it('should return complete group order summary', async () => {
      const mockGroupOrder = {
        id: 'group123',
        group_name: 'Test Order',
        organizer_id: 'user123',
        status: GroupOrderStatus.IN_PROGRESS,
        total_orders: 3,
        overall_progress_percentage: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockItems = [
        { id: 'item1', group_order_id: 'group123', status: 'PENDING' },
      ];

      const mockPaymentTracking = [
        { id: 'payment1', group_order_id: 'group123', paid_amount: 100 },
      ];

      const mockDeliverySchedules = [
        { id: 'schedule1', group_order_id: 'group123', status: 'SCHEDULED' },
      ];

      (service as any).repository.findById = vi.fn().mockResolvedValue(mockGroupOrder);
      (service as any).repository.findItems = vi.fn().mockResolvedValue(mockItems);
      (service as any).repository.findPaymentTracking = vi.fn().mockResolvedValue(mockPaymentTracking);
      (service as any).repository.findDeliverySchedules = vi.fn().mockResolvedValue(mockDeliverySchedules);

      const result = await service.getGroupOrderSummary('group123');

      expect(result).not.toBeNull();
      expect(result?.groupOrder.id).toBe('group123');
      expect(result?.items).toHaveLength(1);
      expect(result?.paymentTracking).toHaveLength(1);
      expect(result?.deliverySchedules).toHaveLength(1);
      expect(result?.progressPercentage).toBe(50);
    });

    it('should return null when group order not found', async () => {
      (service as any).repository.findById = vi.fn().mockResolvedValue(null);

      const result = await service.getGroupOrderSummary('nonexistent');

      expect(result).toBeNull();
    });
  });
});

