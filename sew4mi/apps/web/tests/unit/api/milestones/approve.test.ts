/**
 * Unit tests for milestone approval API endpoint
 * @file approve.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/milestones/[id]/approve/route';
import { MilestoneApprovalStatus, MilestoneApprovalAction } from '@sew4mi/shared/types';

// Mock Supabase client
const mockSupabaseSelect = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseAuth = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: mockSupabaseAuth
    },
    from: mockSupabaseFrom
  })
}));

// Mock global fetch
global.fetch = vi.fn();

describe('/api/milestones/[id]/approve', () => {
  const mockUserId = 'user-123';
  const mockMilestoneId = 'milestone-456';
  const mockOrderId = 'order-789';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockSupabaseAuth.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });

    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
      insert: mockSupabaseInsert
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/milestones/[id]/approve', () => {
    it('returns milestone approval status for authorized user', async () => {
      // Mock milestone data
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockMilestoneId,
              order_id: mockOrderId,
              approval_status: MilestoneApprovalStatus.PENDING,
              customer_reviewed_at: null,
              auto_approval_deadline: new Date().toISOString(),
              rejection_reason: null,
              orders: { customer_id: mockUserId }
            },
            error: null
          })
        })
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve');
      const response = await GET(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(mockMilestoneId);
      expect(data.orderId).toBe(mockOrderId);
      expect(data.approvalStatus).toBe(MilestoneApprovalStatus.PENDING);
    });

    it('returns 401 for unauthenticated user', async () => {
      mockSupabaseAuth.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve');
      const response = await GET(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 for non-existent milestone', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Not found')
          })
        })
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve');
      const response = await GET(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Milestone not found');
    });

    it('returns 403 for unauthorized user (not customer)', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockMilestoneId,
              orders: { customer_id: 'other-user' }
            },
            error: null
          })
        })
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve');
      const response = await GET(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - not your order');
    });
  });

  describe('POST /api/milestones/[id]/approve', () => {
    const validRequestBody = {
      action: MilestoneApprovalAction.APPROVED,
      comment: 'Looks great!'
    };

    beforeEach(() => {
      // Mock milestone data for approval
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockMilestoneId,
              order_id: mockOrderId,
              milestone: 'FITTING_READY',
              approval_status: MilestoneApprovalStatus.PENDING,
              auto_approval_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              orders: { 
                customer_id: mockUserId,
                status: 'IN_PROGRESS' 
              }
            },
            error: null
          })
        })
      });

      // Mock successful update
      mockSupabaseUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockMilestoneId },
              error: null
            })
          })
        })
      });

      // Mock successful audit insert
      mockSupabaseInsert.mockReturnValue({
        error: null
      });

      // Mock successful escrow service call
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('Success')
      });
    });

    it('successfully approves milestone', async () => {
      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.approvalStatus).toBe(MilestoneApprovalStatus.APPROVED);
      expect(data.paymentTriggered).toBe(true);

      // Verify milestone was updated
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        approval_status: MilestoneApprovalStatus.APPROVED,
        customer_reviewed_at: expect.any(String),
        rejection_reason: null,
        updated_at: expect.any(String)
      });

      // Verify audit record was created
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        milestone_id: mockMilestoneId,
        order_id: mockOrderId,
        customer_id: mockUserId,
        action: MilestoneApprovalAction.APPROVED,
        comment: 'Looks great!',
        reviewed_at: expect.any(String)
      });
    });

    it('successfully rejects milestone', async () => {
      const rejectionRequest = {
        action: MilestoneApprovalAction.REJECTED,
        comment: 'Quality needs improvement'
      };

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(rejectionRequest)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.approvalStatus).toBe(MilestoneApprovalStatus.REJECTED);
      expect(data.paymentTriggered).toBeUndefined();

      // Verify milestone was updated with rejection
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        approval_status: MilestoneApprovalStatus.REJECTED,
        customer_reviewed_at: expect.any(String),
        rejection_reason: 'Quality needs improvement',
        updated_at: expect.any(String)
      });
    });

    it('returns 400 for invalid request data', async () => {
      const invalidRequest = {
        action: 'INVALID_ACTION',
        comment: 'x'.repeat(501) // Too long
      };

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('returns 401 for unauthenticated user', async () => {
      mockSupabaseAuth.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 409 for already reviewed milestone', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockMilestoneId,
              approval_status: MilestoneApprovalStatus.APPROVED, // Already reviewed
              orders: { customer_id: mockUserId }
            },
            error: null
          })
        })
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Milestone already reviewed');
    });

    it('returns 409 for milestone past auto-approval deadline', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockMilestoneId,
              approval_status: MilestoneApprovalStatus.PENDING,
              auto_approval_deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
              orders: { customer_id: mockUserId }
            },
            error: null
          })
        })
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Auto-approval deadline has passed');
    });

    it('handles rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 15 }, () => {
        const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
          method: 'POST',
          body: JSON.stringify(validRequestBody)
        });
        return POST(request, { params: { id: mockMilestoneId } });
      });

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('handles escrow service failure gracefully', async () => {
      // Mock failed escrow service call
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Escrow service error')
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      // Approval should still succeed even if escrow call fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.paymentTriggered).toBe(false);
    });

    it('handles database update errors', async () => {
      mockSupabaseUpdate.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      });

      const request = new NextRequest('http://localhost/api/milestones/milestone-456/approve', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request, { params: { id: mockMilestoneId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});