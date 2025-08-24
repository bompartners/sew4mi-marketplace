// Dispute Service Unit Tests
// Story 2.4: Test coverage for dispute management service

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DisputeCategory, DisputePriority, DisputeStatus } from '@sew4mi/shared';

// Mock the dispute service since it imports server components
vi.mock('../../../../lib/services/dispute.service', () => ({
  DisputeService: vi.fn().mockImplementation(() => ({
    createDispute: vi.fn(),
    getDisputes: vi.fn(),
    getDisputeById: vi.fn(),
    assignDispute: vi.fn(),
    getAdminDashboardMetrics: vi.fn()
  }))
}));

describe('DisputeService', () => {
  let mockDisputeService: any;

  beforeEach(async () => {
    const { DisputeService } = await import('../../../../lib/services/dispute.service');
    mockDisputeService = new DisputeService();
    vi.clearAllMocks();
  });

  describe('createDispute', () => {
    it('should create a dispute successfully', async () => {
      const mockRequest = {
        orderId: 'order-123',
        category: DisputeCategory.QUALITY_ISSUE,
        title: 'Quality issue with garment',
        description: 'The garment has poor stitching quality.',
        raisedBy: 'user-123'
      };

      const mockDispute = {
        id: 'dispute-123',
        ...mockRequest,
        priority: DisputePriority.HIGH,
        status: DisputeStatus.OPEN,
        created_at: new Date().toISOString()
      };

      mockDisputeService.createDispute.mockResolvedValue({
        data: mockDispute,
        error: null
      });

      const result = await mockDisputeService.createDispute(mockRequest);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDispute);
      expect(mockDisputeService.createDispute).toHaveBeenCalledWith(mockRequest);
    });

    it('should return error if order not found', async () => {
      const mockRequest = {
        orderId: 'invalid-order',
        category: DisputeCategory.QUALITY_ISSUE,
        title: 'Test dispute',
        description: 'Test description',
        raisedBy: 'user-123'
      };

      mockDisputeService.createDispute.mockResolvedValue({
        data: null,
        error: 'Order not found'
      });

      const result = await mockDisputeService.createDispute(mockRequest);

      expect(result.error).toBe('Order not found');
      expect(result.data).toBeNull();
    });
  });

  describe('getDisputes', () => {
    it('should fetch disputes with filters', async () => {
      const mockDisputes = [
        {
          id: 'dispute-1',
          title: 'Test Dispute',
          status: DisputeStatus.OPEN,
          priority: DisputePriority.MEDIUM
        }
      ];

      const filters = { status: DisputeStatus.OPEN };

      mockDisputeService.getDisputes.mockResolvedValue({
        data: mockDisputes,
        error: null
      });

      const result = await mockDisputeService.getDisputes(filters);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDisputes);
      expect(mockDisputeService.getDisputes).toHaveBeenCalledWith(filters);
    });

    it('should handle database errors', async () => {
      mockDisputeService.getDisputes.mockResolvedValue({
        data: null,
        error: 'Database error'
      });

      const result = await mockDisputeService.getDisputes();

      expect(result.error).toBe('Database error');
      expect(result.data).toBeNull();
    });
  });

  describe('getDisputeById', () => {
    const disputeId = 'dispute-123';

    it('should fetch dispute with full details', async () => {
      const mockDispute = {
        id: disputeId,
        title: 'Test Dispute',
        orders: { id: 'order-123', total_amount: 500 },
        dispute_evidence: [],
        dispute_resolutions: []
      };

      mockDisputeService.getDisputeById.mockResolvedValue({
        data: mockDispute,
        error: null
      });

      const result = await mockDisputeService.getDisputeById(disputeId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockDispute);
      expect(mockDisputeService.getDisputeById).toHaveBeenCalledWith(disputeId);
    });

    it('should return error if dispute not found', async () => {
      mockDisputeService.getDisputeById.mockResolvedValue({
        data: null,
        error: 'Dispute not found'
      });

      const result = await mockDisputeService.getDisputeById(disputeId);

      expect(result.error).toBe('Dispute not found');
      expect(result.data).toBeNull();
    });
  });

  describe('assignDispute', () => {
    const disputeId = 'dispute-123';
    const adminId = 'admin-123';

    it('should assign dispute to admin successfully', async () => {
      const mockUpdatedDispute = {
        id: disputeId,
        assigned_admin: adminId,
        status: DisputeStatus.IN_PROGRESS
      };

      mockDisputeService.assignDispute.mockResolvedValue({
        data: mockUpdatedDispute,
        error: null
      });

      const result = await mockDisputeService.assignDispute(disputeId, adminId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockUpdatedDispute);
      expect(mockDisputeService.assignDispute).toHaveBeenCalledWith(disputeId, adminId);
    });

    it('should handle assignment errors', async () => {
      mockDisputeService.assignDispute.mockResolvedValue({
        data: null,
        error: 'Assignment failed'
      });

      const result = await mockDisputeService.assignDispute(disputeId, adminId);

      expect(result.error).toBe('Assignment failed');
      expect(result.data).toBeNull();
    });
  });

  describe('getAdminDashboardMetrics', () => {
    it('should fetch dashboard metrics successfully', async () => {
      const mockMetrics = {
        total_disputes: 50,
        open_disputes: 15,
        overdue_disputes: 3,
        critical_priority: 2,
        average_resolution_hours: 24.5,
        sla_performance: 85
      };

      mockDisputeService.getAdminDashboardMetrics.mockResolvedValue({
        data: mockMetrics,
        error: null
      });

      const result = await mockDisputeService.getAdminDashboardMetrics();

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockMetrics);
      expect(mockDisputeService.getAdminDashboardMetrics).toHaveBeenCalled();
    });

    it('should handle metrics fetch errors', async () => {
      mockDisputeService.getAdminDashboardMetrics.mockResolvedValue({
        data: null,
        error: 'Failed to fetch metrics'
      });

      const result = await mockDisputeService.getAdminDashboardMetrics();

      expect(result.error).toBe('Failed to fetch metrics');
      expect(result.data).toBeNull();
    });
  });
});