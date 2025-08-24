/**
 * Tests for Admin Milestone Analytics API
 * Comprehensive testing for analytics endpoint functionality
 * Story 2.3: Task 7 - Audit Trail and Reporting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/milestones/analytics/route';

// Mock dependencies
const mockCreateClient = vi.fn();
const mockMilestoneAuditService = {
  getAnalyticsOverview: vi.fn(),
  getMilestoneBreakdownStats: vi.fn(),
  getTailorPerformanceStats: vi.fn(),
  getMilestoneTimeSeries: vi.fn(),
  getMilestoneRejectionPatterns: vi.fn(),
  getHighRejectionAlerts: vi.fn(),
  getSystemHealthMetrics: vi.fn(),
  exportAuditData: vi.fn(),
  getMilestoneApprovalHistory: vi.fn()
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient
}));

vi.mock('@/lib/services/milestone-audit.service', () => ({
  milestoneAuditService: mockMilestoneAuditService
}));

describe('Admin Milestone Analytics API', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn()
          })
        })
      })
    };
    mockCreateClient.mockReturnValue(mockSupabaseClient);

    // Reset all mocks
    Object.values(mockMilestoneAuditService).forEach(mock => {
      mock.mockReset();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/milestones/analytics', () => {
    it('should return analytics data for authenticated admin', async () => {
      // Mock admin authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      });

      // Mock analytics service responses
      const mockOverview = {
        totalMilestones: 100,
        approvedMilestones: 80,
        rejectedMilestones: 15,
        pendingMilestones: 5,
        autoApprovedMilestones: 20,
        averageApprovalTime: 24.5,
        rejectionRate: 15.0
      };

      const mockMilestoneBreakdown = [
        {
          milestone: 'FABRIC_SELECTED',
          total: 50,
          approved: 40,
          rejected: 8,
          pending: 2,
          autoApproved: 10,
          avgApprovalTime: 18.5,
          rejectionRate: 16.0
        }
      ];

      const mockTailorPerformance = [
        {
          tailorId: 'tailor-1',
          tailorName: 'John Tailor',
          totalMilestones: 25,
          approvalRate: 88.0,
          rejectionRate: 12.0,
          avgApprovalTime: 20.5,
          qualityScore: 85
        }
      ];

      const mockTimeSeries = [
        {
          date: '2024-01-01',
          submitted: 10,
          approved: 8,
          rejected: 2,
          autoApproved: 3
        }
      ];

      const mockRejectionPatterns = [
        {
          milestone: 'FABRIC_SELECTED',
          commonReasons: [
            { reason: 'Wrong color', count: 5, percentage: 50.0 }
          ]
        }
      ];

      const mockAlerts = [
        {
          type: 'HIGH_REJECTION_RATE',
          message: 'Tailor John has a high rejection rate',
          severity: 'medium',
          data: { tailorId: 'tailor-1' }
        }
      ];

      const mockSystemHealth = {
        pendingMilestonesOverdue: 3,
        avgApprovalTime24h: 22.1,
        rejectionRateIncrease: false,
        autoApprovalRate24h: 35.0,
        systemStatus: 'HEALTHY'
      };

      mockMilestoneAuditService.getAnalyticsOverview.mockResolvedValue(mockOverview);
      mockMilestoneAuditService.getMilestoneBreakdownStats.mockResolvedValue(mockMilestoneBreakdown);
      mockMilestoneAuditService.getTailorPerformanceStats.mockResolvedValue(mockTailorPerformance);
      mockMilestoneAuditService.getMilestoneTimeSeries.mockResolvedValue(mockTimeSeries);
      mockMilestoneAuditService.getMilestoneRejectionPatterns.mockResolvedValue(mockRejectionPatterns);
      mockMilestoneAuditService.getHighRejectionAlerts.mockResolvedValue(mockAlerts);
      mockMilestoneAuditService.getSystemHealthMetrics.mockResolvedValue(mockSystemHealth);

      const url = 'http://localhost:3000/api/admin/milestones/analytics?timeRange=30d';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overview).toEqual(mockOverview);
      expect(data.data.milestoneBreakdown).toEqual(mockMilestoneBreakdown);
      expect(data.data.tailorPerformance).toEqual(mockTailorPerformance);
      expect(data.data.timeSeries).toEqual(mockTimeSeries);
      expect(data.data.rejectionPatterns).toEqual(mockRejectionPatterns);
      expect(data.data.alerts.highRejectionRates).toEqual(mockAlerts);
      expect(data.data.alerts.systemHealth).toEqual(mockSystemHealth);
      expect(data.data.metadata).toBeDefined();
    });

    it('should handle export request', async () => {
      // Mock admin authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      });

      const mockExportData = {
        milestones: [{ id: 'milestone-1' }],
        approvals: [{ id: 'approval-1' }],
        disputes: [{ id: 'dispute-1' }],
        exportDate: '2024-01-01T00:00:00.000Z',
        filters: { timeRange: 'last_30_days' }
      };

      mockMilestoneAuditService.exportAuditData.mockResolvedValue(mockExportData);

      const url = 'http://localhost:3000/api/admin/milestones/analytics?export=true&timeRange=30d';
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('milestone-audit-export-');

      const exportedData = await response.json();
      expect(exportedData).toEqual(mockExportData);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' }
      });

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 for non-admin users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { role: 'customer' },
        error: null
      });

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should validate query parameters', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      });

      const url = 'http://localhost:3000/api/admin/milestones/analytics?timeRange=invalid&tailorId=not-uuid';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.details).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      });

      mockMilestoneAuditService.getAnalyticsOverview.mockRejectedValue(
        new Error('Database connection failed')
      );

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch milestone analytics');
    });
  });

  describe('POST /api/admin/milestones/analytics', () => {
    beforeEach(() => {
      // Mock admin authentication for all POST tests
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      });
    });

    it('should handle milestone history report request', async () => {
      const mockHistory = [
        {
          id: 'approval-1',
          action: 'APPROVED',
          milestone: { milestone: 'FABRIC_SELECTED' },
          reviewedAt: '2024-01-01'
        }
      ];

      mockMilestoneAuditService.getMilestoneApprovalHistory.mockResolvedValue(mockHistory);

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = {
        reportType: 'milestone_history',
        parameters: { orderId: 'order-123' }
      };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.history).toEqual(mockHistory);
      expect(mockMilestoneAuditService.getMilestoneApprovalHistory)
        .toHaveBeenCalledWith('order-123');
    });

    it('should handle system health check request', async () => {
      const mockHealthMetrics = {
        pendingMilestonesOverdue: 5,
        avgApprovalTime24h: 28.5,
        rejectionRateIncrease: true,
        autoApprovalRate24h: 45.0,
        systemStatus: 'WARNING'
      };

      mockMilestoneAuditService.getSystemHealthMetrics.mockResolvedValue(mockHealthMetrics);

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = { reportType: 'system_health_check' };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.healthMetrics).toEqual(mockHealthMetrics);
    });

    it('should handle high rejection alerts request', async () => {
      const mockAlerts = [
        {
          tailorId: 'tailor-1',
          tailorName: 'Problem Tailor',
          rejectionRate: 45.0,
          totalMilestones: 20,
          recentRejections: 9,
          alertLevel: 'CRITICAL'
        }
      ];

      mockMilestoneAuditService.getHighRejectionAlerts.mockResolvedValue(mockAlerts);

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = {
        reportType: 'high_rejection_alerts',
        filters: { timeRange: 'last_30_days' }
      };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.alerts).toEqual(mockAlerts);
    });

    it('should handle custom export request', async () => {
      const mockExportData = {
        milestones: [{ id: 'milestone-1' }],
        approvals: [{ id: 'approval-1' }],
        disputes: [],
        exportDate: '2024-01-01T00:00:00.000Z',
        filters: { timeRange: 'custom' }
      };

      mockMilestoneAuditService.exportAuditData.mockResolvedValue(mockExportData);

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = {
        reportType: 'custom_export',
        filters: { timeRange: 'custom', startDate: '2024-01-01', endDate: '2024-01-31' }
      };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockExportData);
    });

    it('should return 400 for invalid report type', async () => {
      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = { reportType: 'invalid_report_type' };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid report type');
    });

    it('should return 400 for milestone history without orderId', async () => {
      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = {
        reportType: 'milestone_history',
        parameters: {} // Missing orderId
      };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order ID required for milestone history report');
    });

    it('should return 401 for unauthenticated POST requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' }
      });

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = { reportType: 'system_health_check' };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle service errors in POST requests', async () => {
      mockMilestoneAuditService.getSystemHealthMetrics.mockRejectedValue(
        new Error('Database error')
      );

      const url = 'http://localhost:3000/api/admin/milestones/analytics';
      const body = { reportType: 'system_health_check' };

      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate custom analytics report');
    });
  });

  describe('Query Parameter Validation', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      });

      // Mock service calls to prevent actual execution
      Object.values(mockMilestoneAuditService).forEach(mock => {
        mock.mockResolvedValue({});
      });
    });

    it('should accept valid time range values', async () => {
      const validTimeRanges = ['7d', '30d', '90d', '1y', 'all'];

      for (const timeRange of validTimeRanges) {
        const url = `http://localhost:3000/api/admin/milestones/analytics?timeRange=${timeRange}`;
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });

    it('should accept valid milestone type values', async () => {
      const validMilestones = [
        'FABRIC_SELECTED',
        'CUTTING_STARTED',
        'INITIAL_ASSEMBLY',
        'FITTING_READY',
        'ADJUSTMENTS_COMPLETE',
        'FINAL_PRESSING',
        'READY_FOR_DELIVERY'
      ];

      for (const milestoneType of validMilestones) {
        const url = `http://localhost:3000/api/admin/milestones/analytics?milestoneType=${milestoneType}`;
        const request = new NextRequest(url);

        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });

    it('should accept valid UUID for tailorId', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const url = `http://localhost:3000/api/admin/milestones/analytics?tailorId=${validUuid}`;
      const request = new NextRequest(url);

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});