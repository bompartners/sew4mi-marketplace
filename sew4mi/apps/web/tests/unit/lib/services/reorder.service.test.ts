import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ReorderService } from '@/lib/services/reorder.service';
import { createServerSupabaseClient } from '@/lib/supabase';
import type {
  ReorderRequest,
  ReorderModifications,
  TailorAvailability,
} from '@sew4mi/shared/types';

// Mock Supabase
vi.mock('@/lib/supabase');

describe('ReorderService', () => {
  let reorderService: ReorderService;
  let mockSupabase: any;

  const mockUserId = 'user-123';
  const mockOrderId = 'order-456';
  const mockTailorId = 'tailor-789';

  const mockOrder = {
    id: mockOrderId,
    customer_id: mockUserId,
    tailor_id: mockTailorId,
    measurement_profile_id: 'profile-123',
    garment_type: 'suit',
    style_preferences: {},
    fabric_details: { fabric: 'wool' },
    quantity: 1,
    total_amount: 500,
    currency: 'GHS',
    delivery_method: 'PICKUP',
    delivery_address: null,
    special_instructions: 'Original instructions',
    reference_images: [],
    status: 'COMPLETED',
  };

  const mockTailor = {
    id: mockTailorId,
    business_name: 'Elite Tailors',
    verification_status: 'VERIFIED',
    is_accepting_orders: true,
    max_concurrent_orders: 10,
    avg_turnaround_days: 14,
    specializations: ['suits', 'formal wear'],
    city: 'Accra',
    region: 'Greater Accra',
    rating: 4.8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    reorderService = new ReorderService();

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    };

    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabase);
  });

  describe('validateReorder', () => {
    it('should validate successfully for completed order', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockOrder, error: null });
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null }); // Measurement profile exists
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockTailor, error: null }); // Tailor active

      // Act
      const result = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when order not found', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      // Act
      const result = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order not found');
    });

    it('should fail validation when order belongs to different user', async () => {
      // Arrange
      const otherUserOrder = { ...mockOrder, customer_id: 'other-user' };
      mockSupabase.maybeSingle.mockResolvedValue({ data: otherUserOrder, error: null });

      // Act
      const result = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order does not belong to you');
    });

    it('should fail validation when order not completed', async () => {
      // Arrange
      const pendingOrder = { ...mockOrder, status: 'PENDING' };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: pendingOrder, error: null });

      // Act
      const result = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only completed orders can be reordered');
    });

    it('should add warning when measurement profile no longer exists', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockOrder, error: null });
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // Profile doesn't exist
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockTailor, error: null });

      // Act
      const result = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(result.isValid).toBe(true); // Still valid, just warning
      expect(result.warnings).toContain(expect.stringContaining('measurement profile no longer exists'));
    });

    it('should add warning when tailor no longer active', async () => {
      // Arrange
      const inactiveTailor = { ...mockTailor, verification_status: 'SUSPENDED' };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: mockOrder, error: null });
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null });
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: inactiveTailor, error: null });

      // Act
      const result = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('tailor is no longer accepting orders'));
    });
  });

  describe('checkTailorAvailability', () => {
    it('should return available when tailor is verified and accepting orders', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockTailor, error: null });
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      // Mock count response
      const countResponse = { count: 5, error: null };
      mockSupabase.in.mockResolvedValue(countResponse);

      // Act
      const result = await (reorderService as any).checkTailorAvailability(mockTailorId);

      // Assert
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return unavailable when tailor not found', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      // Act
      const result: TailorAvailability = await (reorderService as any).checkTailorAvailability(mockTailorId);

      // Assert
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Tailor not found');
    });

    it('should return unavailable when tailor not verified', async () => {
      // Arrange
      const unverifiedTailor = { ...mockTailor, verification_status: 'PENDING' };
      mockSupabase.maybeSingle.mockResolvedValue({ data: unverifiedTailor, error: null });

      // Act
      const result: TailorAvailability = await (reorderService as any).checkTailorAvailability(mockTailorId);

      // Assert
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Tailor is not currently verified');
    });

    it('should return unavailable when tailor not accepting orders', async () => {
      // Arrange
      const notAcceptingTailor = { ...mockTailor, is_accepting_orders: false };
      mockSupabase.maybeSingle.mockResolvedValue({ data: notAcceptingTailor, error: null });

      // Act
      const result: TailorAvailability = await (reorderService as any).checkTailorAvailability(mockTailorId);

      // Assert
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Tailor is not currently accepting new orders');
      expect(result.nextAvailableDate).toBeDefined();
    });

    it('should return unavailable when tailor at capacity', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockTailor, error: null });
      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      // Mock count at capacity
      const countResponse = { count: 10, error: null }; // max_concurrent_orders = 10
      mockSupabase.in.mockResolvedValue(countResponse);

      // Act
      const result: TailorAvailability = await (reorderService as any).checkTailorAvailability(mockTailorId);

      // Assert
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Tailor is at capacity');
      expect(result.nextAvailableDate).toBeDefined();
    });
  });

  describe('calculateReorderPricing', () => {
    it('should return base price when no modifications', async () => {
      // Act
      const result = await (reorderService as any).calculateReorderPricing(mockOrder, undefined);

      // Assert
      expect(result.basePrice).toBe(500);
      expect(result.totalAmount).toBe(500);
      expect(result.fabricUpcharge).toBeUndefined();
      expect(result.modificationFees).toBeUndefined();
    });

    it('should calculate fabric upcharge when upgrading to premium fabric', async () => {
      // Arrange
      const modifications: ReorderModifications = {
        fabricChoice: 'silk', // Premium fabric (150) vs wool (100)
      };

      // Act
      const result = await (reorderService as any).calculateReorderPricing(mockOrder, modifications);

      // Assert
      expect(result.basePrice).toBe(500);
      expect(result.fabricUpcharge).toBe(50); // 150 - 100
      expect(result.totalAmount).toBe(550);
    });

    it('should not charge upcharge when downgrading fabric', async () => {
      // Arrange
      const modifications: ReorderModifications = {
        fabricChoice: 'cotton', // Cheaper fabric (50) vs wool (100)
      };

      // Act
      const result = await (reorderService as any).calculateReorderPricing(mockOrder, modifications);

      // Assert
      expect(result.basePrice).toBe(500);
      expect(result.fabricUpcharge).toBeUndefined();
      expect(result.totalAmount).toBe(500); // No upcharge for downgrade
    });

    it('should add 5% fee when changing measurement profile', async () => {
      // Arrange
      const modifications: ReorderModifications = {
        measurementProfileId: 'new-profile-456', // Different from original
      };

      // Act
      const result = await (reorderService as any).calculateReorderPricing(mockOrder, modifications);

      // Assert
      expect(result.basePrice).toBe(500);
      expect(result.modificationFees).toBe(25); // 5% of 500
      expect(result.totalAmount).toBe(525);
    });

    it('should combine all fees when multiple modifications', async () => {
      // Arrange
      const modifications: ReorderModifications = {
        fabricChoice: 'silk', // +50 upcharge
        measurementProfileId: 'new-profile-456', // +5% fee
      };

      // Act
      const result = await (reorderService as any).calculateReorderPricing(mockOrder, modifications);

      // Assert
      expect(result.basePrice).toBe(500);
      expect(result.fabricUpcharge).toBe(50);
      expect(result.modificationFees).toBe(25); // 5% of 500
      expect(result.totalAmount).toBe(575); // 500 + 50 + 25
    });
  });

  describe('previewReorder', () => {
    it('should generate preview with original order details', async () => {
      // Arrange
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockOrder, error: null }) // getOrderById
        .mockResolvedValueOnce({ data: mockOrder, error: null }) // validate - getOrderById
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null }) // validate - checkMeasurementProfile
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // validate - checkTailorActive
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // checkTailorAvailability
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // calculateEstimatedDelivery
        .mockResolvedValueOnce({ data: mockTailor, error: null }); // getTailorDetails

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null }); // Tailor capacity check

      // Act
      const result = await reorderService.previewReorder(mockUserId, mockOrderId);

      // Assert
      expect(result.order.id).toBe(mockOrderId);
      expect(result.order.garmentType).toBe('suit');
      expect(result.tailor.id).toBe(mockTailorId);
      expect(result.tailor.availability.available).toBe(true);
      expect(result.pricing.basePrice).toBe(500);
      expect(result.estimatedDelivery).toBeInstanceOf(Date);
    });

    it('should throw error when order not found', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      // Act & Assert
      await expect(reorderService.previewReorder(mockUserId, mockOrderId)).rejects.toThrow('Order not found');
    });

    it('should throw error when validation fails', async () => {
      // Arrange
      const pendingOrder = { ...mockOrder, status: 'PENDING' };
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: pendingOrder, error: null }) // getOrderById
        .mockResolvedValueOnce({ data: pendingOrder, error: null }); // validate - getOrderById

      // Act & Assert
      await expect(reorderService.previewReorder(mockUserId, mockOrderId)).rejects.toThrow('Cannot reorder');
    });
  });

  describe('createReorder', () => {
    it('should create new order with same tailor', async () => {
      // Arrange
      const request: ReorderRequest = {
        orderId: mockOrderId,
        modifications: {
          specialInstructions: 'Updated instructions',
        },
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockOrder, error: null }) // getOrderById
        .mockResolvedValueOnce({ data: mockOrder, error: null }) // validate - getOrderById
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null }) // validate - checkMeasurementProfile
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // validate - checkTailorActive
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // checkTailorAvailability
        .mockResolvedValueOnce({ data: mockTailor, error: null }); // calculateEstimatedDelivery

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null });

      const newOrder = { ...mockOrder, id: 'new-order-123' };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      const result = await reorderService.createReorder(mockUserId, request);

      // Assert
      expect(result.id).toBe('new-order-123');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: mockUserId,
          tailor_id: mockTailorId,
          special_instructions: 'Updated instructions',
          metadata: expect.objectContaining({
            is_reorder: true,
            original_order_id: mockOrderId,
          }),
        })
      );
    });

    it('should throw error when tailor unavailable', async () => {
      // Arrange
      const request: ReorderRequest = {
        orderId: mockOrderId,
      };

      const unavailableTailor = { ...mockTailor, is_accepting_orders: false };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockOrder, error: null }) // getOrderById
        .mockResolvedValueOnce({ data: mockOrder, error: null }) // validate - getOrderById
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null }) // validate - checkMeasurementProfile
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // validate - checkTailorActive
        .mockResolvedValueOnce({ data: unavailableTailor, error: null }); // checkTailorAvailability

      // Act & Assert
      await expect(reorderService.createReorder(mockUserId, request)).rejects.toThrow('Tailor is not available');
    });

    it('should apply escrow breakdown (30/30/40 split)', async () => {
      // Arrange
      const request: ReorderRequest = {
        orderId: mockOrderId,
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null });

      const newOrder = { ...mockOrder, id: 'new-order-123' };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      await reorderService.createReorder(mockUserId, request);

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          total_amount: 500,
          deposit_amount: 150, // 30% of 500
          fitting_payment_amount: 150, // 30% of 500
          final_payment_amount: 200, // 40% of 500
        })
      );
    });
  });

  describe('getAlternativeTailors', () => {
    it('should find alternative tailors in same region with similar specializations', async () => {
      // Arrange
      const alternativeTailors = [
        { ...mockTailor, id: 'alt-tailor-1', business_name: 'Alternative Tailor 1' },
        { ...mockTailor, id: 'alt-tailor-2', business_name: 'Alternative Tailor 2' },
      ];

      mockSupabase.maybeSingle.mockResolvedValue({ data: mockTailor, error: null });
      mockSupabase.limit.mockResolvedValue({ data: alternativeTailors, error: null });

      // Act
      const result = await reorderService.getAlternativeTailors(mockTailorId, 'suit', 3);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('alt-tailor-1');
      expect(mockSupabase.neq).toHaveBeenCalledWith('id', mockTailorId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('verification_status', 'VERIFIED');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_accepting_orders', true);
    });

    it('should return empty array when original tailor not found', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      // Act
      const result = await reorderService.getAlternativeTailors(mockTailorId, 'suit');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: mockTailor, error: null });
      mockSupabase.limit.mockResolvedValue({ data: null, error: new Error('Database error') });

      // Act
      const result = await reorderService.getAlternativeTailors(mockTailorId, 'suit');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('calculateEstimatedDelivery', () => {
    it('should use tailor average turnaround days', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: { avg_turnaround_days: 10 }, error: null });

      // Act
      const result = await (reorderService as any).calculateEstimatedDelivery(mockTailorId, 'suit');

      // Assert
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 10);
      expect(result.getDate()).toBe(expectedDate.getDate());
    });

    it('should use default 14 days when tailor has no turnaround data', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValue({ data: { avg_turnaround_days: null }, error: null });

      // Act
      const result = await (reorderService as any).calculateEstimatedDelivery(mockTailorId, 'suit');

      // Assert
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 14);
      expect(result.getDate()).toBe(expectedDate.getDate());
    });
  });
});
