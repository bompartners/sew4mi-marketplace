/**
 * Integration test for complete reorder workflow
 * Tests the end-to-end reorder process including:
 * - Order validation
 * - Tailor availability checking
 * - Pricing calculation with modifications
 * - New order creation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { reorderService } from '@/lib/services/reorder.service';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ReorderModifications } from '@sew4mi/shared/types';

// Mock Supabase
vi.mock('@/lib/supabase');

describe('Reorder Workflow Integration Tests', () => {
  let mockSupabase: any;
  const mockUserId = 'user-integration-123';
  const mockOrderId = 'order-integration-456';
  const mockTailorId = 'tailor-integration-789';

  const mockCompletedOrder = {
    id: mockOrderId,
    customer_id: mockUserId,
    tailor_id: mockTailorId,
    measurement_profile_id: 'profile-123',
    garment_type: 'suit',
    style_preferences: { fit: 'slim' },
    fabric_details: { fabric: 'wool', color: 'navy' },
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
    rating: 4.8,
  };

  beforeAll(() => {
    // Setup test environment
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      in: vi.fn(),
    };

    (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Reorder Flow', () => {
    it('should successfully complete reorder with no modifications', async () => {
      // Arrange
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null }) // getOrderById
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null }) // validate - getOrderById
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null }) // validate - profile exists
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // validate - tailor active
        .mockResolvedValueOnce({ data: mockTailor, error: null }) // checkTailorAvailability
        .mockResolvedValueOnce({ data: mockTailor, error: null }); // calculateEstimatedDelivery

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null }); // Tailor capacity

      const newOrder = { ...mockCompletedOrder, id: 'new-order-123', status: 'PENDING' };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      const result = await reorderService.createReorder(mockUserId, { orderId: mockOrderId });

      // Assert
      expect(result.id).toBe('new-order-123');
      expect(result.customer_id).toBe(mockUserId);
      expect(result.tailor_id).toBe(mockTailorId);
      expect(result.status).toBe('PENDING');
    });

    it('should handle fabric upgrade modification flow', async () => {
      // Arrange
      const modifications: ReorderModifications = {
        fabricChoice: 'silk', // Upgrade from wool
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null });

      const newOrder = {
        ...mockCompletedOrder,
        id: 'new-order-123',
        total_amount: 550, // Base 500 + 50 fabric upcharge
        fabric_details: { fabric: 'silk', color: 'navy' },
      };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      const result = await reorderService.createReorder(mockUserId, { orderId: mockOrderId, modifications });

      // Assert
      expect(result.fabric_details.fabric).toBe('silk');
      expect(result.total_amount).toBe(550); // Includes fabric upcharge
    });

    it('should handle measurement profile change with fee', async () => {
      // Arrange
      const modifications: ReorderModifications = {
        measurementProfileId: 'new-profile-456',
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null });

      const newOrder = {
        ...mockCompletedOrder,
        id: 'new-order-123',
        measurement_profile_id: 'new-profile-456',
        total_amount: 525, // Base 500 + 25 (5% modification fee)
      };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      const result = await reorderService.createReorder(mockUserId, { orderId: mockOrderId, modifications });

      // Assert
      expect(result.measurement_profile_id).toBe('new-profile-456');
      expect(result.total_amount).toBe(525); // Includes 5% modification fee
    });
  });

  describe('Validation Workflow', () => {
    it('should validate order ownership', async () => {
      // Arrange
      const otherUserOrder = { ...mockCompletedOrder, customer_id: 'other-user' };
      mockSupabase.maybeSingle.mockResolvedValue({ data: otherUserOrder, error: null });

      // Act
      const validation = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Order does not belong to you');
    });

    it('should validate order is completed', async () => {
      // Arrange
      const pendingOrder = { ...mockCompletedOrder, status: 'PENDING' };
      mockSupabase.maybeSingle.mockResolvedValue({ data: pendingOrder, error: null });

      // Act
      const validation = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Only completed orders can be reordered');
    });

    it('should warn when measurement profile deleted', async () => {
      // Arrange
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: null, error: null }) // Profile doesn't exist
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      // Act
      const validation = await reorderService.validateReorder(mockOrderId, mockUserId);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('measurement profile no longer exists');
    });
  });

  describe('Tailor Availability Workflow', () => {
    it('should check tailor capacity before reorder', async () => {
      // Arrange
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 10, error: null }); // At capacity

      // Act & Assert
      await expect(
        reorderService.createReorder(mockUserId, { orderId: mockOrderId })
      ).rejects.toThrow('not available');
    });

    it('should reject when tailor not accepting orders', async () => {
      // Arrange
      const notAcceptingTailor = { ...mockTailor, is_accepting_orders: false };
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: notAcceptingTailor, error: null });

      // Act & Assert
      await expect(
        reorderService.createReorder(mockUserId, { orderId: mockOrderId })
      ).rejects.toThrow('not available');
    });
  });

  describe('Pricing Calculation Workflow', () => {
    it('should calculate escrow breakdown correctly (30/30/40)', async () => {
      // Arrange
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null });

      const newOrder = { ...mockCompletedOrder, id: 'new-order-123' };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      const result = await reorderService.createReorder(mockUserId, { orderId: mockOrderId });

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          total_amount: 500,
          deposit_amount: 150, // 30%
          fitting_payment_amount: 150, // 30%
          final_payment_amount: 200, // 40%
        })
      );
    });

    it('should stack multiple modification fees', async () => {
      // Arrange
      const modifications: ReorderModifications = {
        fabricChoice: 'silk', // +50 upcharge
        measurementProfileId: 'new-profile', // +25 (5% fee)
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null });

      const newOrder = {
        ...mockCompletedOrder,
        id: 'new-order-123',
        total_amount: 575, // 500 + 50 + 25
      };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      const result = await reorderService.createReorder(mockUserId, { orderId: mockOrderId, modifications });

      // Assert
      expect(result.total_amount).toBe(575);
    });
  });

  describe('Reorder Metadata', () => {
    it('should tag order as reorder with original order reference', async () => {
      // Arrange
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: mockCompletedOrder, error: null })
        .mockResolvedValueOnce({ data: { id: 'profile-123' }, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null })
        .mockResolvedValueOnce({ data: mockTailor, error: null });

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        head: true,
      });
      mockSupabase.in.mockResolvedValue({ count: 5, error: null });

      const newOrder = { ...mockCompletedOrder, id: 'new-order-123' };
      mockSupabase.single.mockResolvedValue({ data: newOrder, error: null });

      // Act
      await reorderService.createReorder(mockUserId, { orderId: mockOrderId });

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            is_reorder: true,
            original_order_id: mockOrderId,
          }),
        })
      );
    });
  });
});
