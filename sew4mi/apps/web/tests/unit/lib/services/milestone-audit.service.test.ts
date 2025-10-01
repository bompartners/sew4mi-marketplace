/**
 * Tests for Milestone Audit Service
 * Comprehensive testing for audit trail and analytics functionality
 * Story 2.3: Task 7 - Audit Trail and Reporting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Supabase client before importing service
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

// Mock createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));

import { MilestoneAuditService } from '@/lib/services/milestone-audit.service';

describe('MilestoneAuditService', () => {
  let service: MilestoneAuditService;
  let mockQuery: any;

  beforeEach(() => {
    service = new MilestoneAuditService();
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis()
    };
    mockSupabaseClient.from.mockReturnValue(mockQuery);
    mockSupabaseClient.rpc.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMilestoneApprovalHistory', () => {
    it('should fetch milestone approval history for an order', async () => {
      const orderId = 'test-order-id';
      const mockHistory = [
        {
          id: 'approval-1',
          milestone: {
            id: 'milestone-1',
            milestone: 'FABRIC_SELECTED',
            photoUrl: 'https://example.com/photo1.jpg',
            notes: 'Fabric selected successfully',
            verifiedAt: new Date('2024-01-01'),
            approvalStatus: 'APPROVED',
            autoApprovalDeadline: new Date('2024-01-03')
          },
          customer: {
            id: 'customer-1',
            email: 'customer@example.com',
            profiles: { fullName: 'John Customer' }
          },
          action: 'APPROVED',
          comment: 'Looks good!',
          reviewedAt: new Date('2024-01-02')
        }
      ];

      mockQuery.select.mockResolvedValue({
        data: mockHistory,
        error: null
      });

      const result = await service.getMilestoneApprovalHistory(orderId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('milestone_approvals');
      expect(mockQuery.eq).toHaveBeenCalledWith('order_id', orderId);
      expect(result).toEqual(mockHistory);
    });

    it('should throw error when database query fails', async () => {
      const orderId = 'test-order-id';
      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(service.getMilestoneApprovalHistory(orderId))
        .rejects.toThrow('Failed to get milestone approval history: Database error');
    });
  });

  describe('getAnalyticsOverview', () => {
    it('should fetch analytics overview with filters', async () => {
      const mockOverviewData = [{
        total_milestones: 100,
        approved_milestones: 80,
        rejected_milestones: 15,
        pending_milestones: 5,
        auto_approved_milestones: 20,
        average_approval_time: 24.5,
        rejection_rate: 15.0
      }];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockOverviewData,
        error: null
      });

      const filters = {
        timeRange: 'last_30_days' as const,
        tailorId: 'tailor-123'
      };

      const result = await service.getAnalyticsOverview(filters);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_milestone_analytics_overview',
        expect.objectContaining({
          p_time_range_filter: expect.stringContaining('om.verified_at >='),
          p_tailor_filter: " AND o.tailor_id = 'tailor-123'",
          p_milestone_filter: ''
        })
      );

      expect(result).toEqual({
        totalMilestones: 100,
        approvedMilestones: 80,
        rejectedMilestones: 15,
        pendingMilestones: 5,
        autoApprovedMilestones: 20,
        averageApprovalTime: 24.5,
        rejectionRate: 15.0
      });
    });

    it('should handle empty analytics data', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await service.getAnalyticsOverview({});

      expect(result).toEqual({
        totalMilestones: 0,
        approvedMilestones: 0,
        rejectedMilestones: 0,
        pendingMilestones: 0,
        autoApprovedMilestones: 0,
        averageApprovalTime: 0,
        rejectionRate: 0
      });
    });
  });

  describe('getMilestoneBreakdownStats', () => {
    it('should fetch milestone breakdown statistics', async () => {
      const mockBreakdownData = [
        {
          milestone: 'FABRIC_SELECTED',
          total: 50,
          approved: 40,
          rejected: 8,
          pending: 2,
          auto_approved: 10,
          avg_approval_time: 18.5,
          rejection_rate: 16.0
        },
        {
          milestone: 'CUTTING_STARTED',
          total: 30,
          approved: 25,
          rejected: 3,
          pending: 2,
          auto_approved: 5,
          avg_approval_time: 22.1,
          rejection_rate: 10.0
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockBreakdownData,
        error: null
      });

      const result = await service.getMilestoneBreakdownStats({});

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_milestone_breakdown_stats',
        expect.any(Object)
      );

      expect(result).toHaveLength(2);
      expect(result[0].milestone).toBe('FABRIC_SELECTED');
      expect(result[0].total).toBe(50);
      expect(result[1].milestone).toBe('CUTTING_STARTED');
    });
  });

  describe('getTailorPerformanceStats', () => {
    it('should fetch tailor performance metrics', async () => {
      const mockPerformanceData = [
        {
          tailor_id: 'tailor-1',
          tailor_name: 'John Tailor',
          total_milestones: 25,
          approval_rate: 88.0,
          rejection_rate: 12.0,
          avg_approval_time: 20.5
        },
        {
          tailor_id: 'tailor-2',
          tailor_name: 'Jane Tailor',
          total_milestones: 30,
          approval_rate: 93.3,
          rejection_rate: 6.7,
          avg_approval_time: 18.2
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockPerformanceData,
        error: null
      });

      const result = await service.getTailorPerformanceStats({});

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        tailorId: 'tailor-1',
        tailorName: 'John Tailor',
        totalMilestones: 25,
        approvalRate: 88.0,
        rejectionRate: 12.0,
        avgApprovalTime: 20.5
      });
    });
  });

  describe('getMilestoneTimeSeries', () => {
    it('should fetch time series data', async () => {
      const mockTimeSeriesData = [
        {
          date: '2024-01-01',
          submitted: 10,
          approved: 8,
          rejected: 2,
          auto_approved: 3
        },
        {
          date: '2024-01-02',
          submitted: 12,
          approved: 10,
          rejected: 1,
          auto_approved: 4
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockTimeSeriesData,
        error: null
      });

      const result = await service.getMilestoneTimeSeries({});

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].submitted).toBe(10);
    });
  });

  describe('getMilestoneRejectionPatterns', () => {
    it('should fetch rejection patterns', async () => {
      const mockRejectionData = [
        {
          milestone: 'FABRIC_SELECTED',
          common_reasons: [
            { reason: 'Wrong color', count: 5, percentage: 50.0 },
            { reason: 'Poor quality', count: 3, percentage: 30.0 }
          ]
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockRejectionData,
        error: null
      });

      const result = await service.getMilestoneRejectionPatterns({});

      expect(result).toHaveLength(1);
      expect(result[0].milestone).toBe('FABRIC_SELECTED');
      expect(result[0].commonReasons).toHaveLength(2);
    });
  });

  describe('getHighRejectionAlerts', () => {
    it('should detect high rejection rate alerts', async () => {
      // Mock getTailorPerformanceStats to return tailors with high rejection rates
      vi.spyOn(service, 'getTailorPerformanceStats').mockResolvedValue([
        {
          tailorId: 'tailor-1',
          tailorName: 'High Rejection Tailor',
          totalMilestones: 20,
          approvalRate: 60.0,
          rejectionRate: 40.0, // Critical level
          avgApprovalTime: 24.0
        },
        {
          tailorId: 'tailor-2',
          tailorName: 'Warning Level Tailor',
          totalMilestones: 15,
          approvalRate: 80.0,
          rejectionRate: 20.0, // Warning level
          avgApprovalTime: 18.0
        },
        {
          tailorId: 'tailor-3',
          tailorName: 'Good Tailor',
          totalMilestones: 10,
          approvalRate: 95.0,
          rejectionRate: 5.0, // Good level
          avgApprovalTime: 16.0
        }
      ]);

      const result = await service.getHighRejectionAlerts({});

      expect(result).toHaveLength(2); // Only high rejection tailors
      expect(result[0].alertLevel).toBe('CRITICAL');
      expect(result[0].rejectionRate).toBe(40.0);
      expect(result[1].alertLevel).toBe('WARNING');
      expect(result[1].rejectionRate).toBe(20.0);
    });

    it('should filter out tailors with insufficient data', async () => {
      vi.spyOn(service, 'getTailorPerformanceStats').mockResolvedValue([
        {
          tailorId: 'tailor-1',
          tailorName: 'New Tailor',
          totalMilestones: 3, // Below threshold
          approvalRate: 33.3,
          rejectionRate: 66.7, // High but not enough data
          avgApprovalTime: 24.0
        }
      ]);

      const result = await service.getHighRejectionAlerts({});

      expect(result).toHaveLength(0); // Should be filtered out
    });
  });

  describe('exportAuditData', () => {
    it('should export comprehensive audit data', async () => {
      const mockMilestones = [
        {
          id: 'milestone-1',
          milestone: 'FABRIC_SELECTED',
          order: { id: 'order-1', customer_id: 'customer-1' }
        }
      ];

      const mockApprovals = [
        {
          id: 'approval-1',
          action: 'APPROVED',
          milestone: { milestone: 'FABRIC_SELECTED' }
        }
      ];

      const mockDisputes = [
        {
          id: 'dispute-1',
          reason: 'Quality issue',
          milestone: { milestone: 'FABRIC_SELECTED' }
        }
      ];

      // Mock sequential database calls
      mockQuery.select
        .mockResolvedValueOnce({ data: mockMilestones, error: null })
        .mockResolvedValueOnce({ data: mockApprovals, error: null })
        .mockResolvedValueOnce({ data: mockDisputes, error: null });

      const result = await service.exportAuditData({});

      expect(result.milestones).toEqual(mockMilestones);
      expect(result.approvals).toEqual(mockApprovals);
      expect(result.disputes).toEqual(mockDisputes);
      expect(result.exportDate).toBeDefined();
      expect(result.filters).toBeDefined();
    });
  });

  describe('getSystemHealthMetrics', () => {
    it('should calculate system health metrics', async () => {
      // Mock overdue milestones query
      mockQuery.select.mockResolvedValue({
        data: [{ id: 'milestone-1' }, { id: 'milestone-2' }],
        error: null
      });

      // Mock analytics calls for 24h and 48h periods
      vi.spyOn(service, 'getAnalyticsOverview')
        .mockResolvedValueOnce({
          totalMilestones: 20,
          approvedMilestones: 15,
          rejectedMilestones: 3,
          pendingMilestones: 2,
          autoApprovedMilestones: 8,
          averageApprovalTime: 18.5,
          rejectionRate: 15.0
        })
        .mockResolvedValueOnce({
          totalMilestones: 18,
          approvedMilestones: 14,
          rejectedMilestones: 2,
          pendingMilestones: 2,
          autoApprovedMilestones: 6,
          averageApprovalTime: 16.2,
          rejectionRate: 11.1
        });

      const result = await service.getSystemHealthMetrics();

      expect(result.pendingMilestonesOverdue).toBe(2);
      expect(result.avgApprovalTime24h).toBe(18.5);
      expect(result.rejectionRateIncrease).toBe(false); // 15% vs 11.1% * 1.5 = 16.65%
      expect(result.autoApprovalRate24h).toBe(40); // 8/20 * 100
      expect(result.systemStatus).toBe('HEALTHY');
    });

    it('should detect critical system status', async () => {
      // Mock many overdue milestones
      mockQuery.select.mockResolvedValue({
        data: Array(60).fill({ id: 'milestone' }), // 60 overdue milestones
        error: null
      });

      vi.spyOn(service, 'getAnalyticsOverview')
        .mockResolvedValue({
          totalMilestones: 100,
          approvedMilestones: 60,
          rejectedMilestones: 35, // High rejection rate
          pendingMilestones: 5,
          autoApprovedMilestones: 85, // Very high auto-approval rate
          averageApprovalTime: 48.0,
          rejectionRate: 35.0
        });

      const result = await service.getSystemHealthMetrics();

      expect(result.systemStatus).toBe('CRITICAL');
    });
  });

  describe('buildTimeRangeFilter', () => {
    it('should build correct time range filters', () => {
      const service = new MilestoneAuditService();
      const testCases = [
        { timeRange: 'last_7_days', expectedDays: 7 },
        { timeRange: 'last_30_days', expectedDays: 30 },
        { timeRange: 'last_90_days', expectedDays: 90 },
        { timeRange: 'last_year', expectedDays: 365 }
      ];

      testCases.forEach(({ timeRange }) => {
        const filter = (service as any).buildTimeRangeFilter({ timeRange });
        expect(filter).toContain('om.verified_at >=');
        expect(filter).toContain('om.verified_at <=');
      });
    });

    it('should handle custom date ranges', () => {
      const service = new MilestoneAuditService();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const filter = (service as any).buildTimeRangeFilter({
        timeRange: 'custom',
        startDate,
        endDate
      });

      expect(filter).toContain('2024-01-01');
      expect(filter).toContain('2024-01-31');
    });

    it('should return empty string for invalid filters', () => {
      const service = new MilestoneAuditService();
      const filter = (service as any).buildTimeRangeFilter({});
      expect(filter).toBe('');
    });
  });
});

describe('MilestoneAuditService Error Handling', () => {
  let service: MilestoneAuditService;

  beforeEach(() => {
    service = new MilestoneAuditService();
  });

  it('should handle database connection errors', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Connection timeout' }
    });

    await expect(service.getAnalyticsOverview({}))
      .rejects.toThrow('Failed to get analytics overview: Connection timeout');
  });

  it('should handle malformed data gracefully', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: [{ invalid_field: 'value' }],
      error: null
    });

    const result = await service.getAnalyticsOverview({});

    // Should use default values for missing fields
    expect(result.totalMilestones).toBe(0);
    expect(result.approvedMilestones).toBe(0);
  });

  it('should handle network errors in export function', async () => {
    const mockQuery = {
      select: vi.fn().mockRejectedValue(new Error('Network error')),
      neq: vi.fn().mockReturnThis()
    };
    mockSupabaseClient.from.mockReturnValue(mockQuery);

    await expect(service.exportAuditData({}))
      .rejects.toThrow('Failed to export milestone data: Network error');
  });
});