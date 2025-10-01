/**
 * Unit tests for auto-approval cron job API endpoint
 * @file auto-approve-milestones.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cron/auto-approve-milestones/route';
import { MilestoneApprovalAction } from '@sew4mi/shared/types';

// Mock Supabase service role client
const mockSupabaseRpc = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc
  }))
}));

// Mock global fetch
global.fetch = vi.fn();

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('/api/cron/auto-approve-milestones', () => {
  const mockCronSecret = 'test-cron-secret';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set environment variable
    process.env.CRON_SECRET = mockCronSecret;
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    
    // Default Supabase mocks
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('Authentication', () => {
    it('returns 401 for missing authorization header', async () => {
      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 for invalid authorization token', async () => {
      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': 'Bearer invalid-token'
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      
      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('accepts valid authorization token', async () => {
      // Mock no pending milestones
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Auto-approval processing', () => {
    const mockPendingMilestone = {
      id: 'milestone-123',
      order_id: 'order-456',
      milestone: 'FITTING_READY',
      auto_approval_deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      orders: {
        customer_id: 'customer-789',
        tailor_id: 'tailor-101',
        status: 'IN_PROGRESS'
      }
    };

    beforeEach(() => {
      // Mock successful escrow service call
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('Success')
      });
    });

    it('processes no milestones when none are overdue', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(0);
      expect(data.autoApproved).toBe(0);
      expect(data.message).toContain('No milestones found for auto-approval');
    });

    it('successfully auto-approves overdue milestones', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockPendingMilestone],
              error: null
            })
          })
        })
      });

      // Mock successful database function call
      mockSupabaseRpc.mockResolvedValue({
        error: null
      });

      // Mock successful notification insert
      mockSupabaseInsert.mockResolvedValue({
        error: null
      });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(1);
      expect(data.autoApproved).toBe(1);
      expect(data.failed).toBe(0);
      expect(data.approvedMilestoneIds).toContain('milestone-123');

      // Verify database function was called correctly
      expect(mockSupabaseRpc).toHaveBeenCalledWith('approve_milestone', {
        p_milestone_id: 'milestone-123',
        p_customer_id: 'customer-789',
        p_action: MilestoneApprovalAction.AUTO_APPROVED,
        p_comment: 'Automatically approved after 48-hour deadline'
      });

      // Verify escrow service was called
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/escrow/release-milestone-payment',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockCronSecret}`
          }),
          body: JSON.stringify({
            orderId: 'order-456',
            milestoneId: 'milestone-123',
            reason: 'auto_approval'
          })
        })
      );
    });

    it('handles database errors gracefully', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockPendingMilestone],
              error: null
            })
          })
        })
      });

      // Mock database function failure
      mockSupabaseRpc.mockResolvedValue({
        error: new Error('Database connection failed')
      });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(1);
      expect(data.autoApproved).toBe(0);
      expect(data.failed).toBe(1);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toContain('milestone-123');
    });

    it('continues processing other milestones when one fails', async () => {
      const secondMilestone = {
        ...mockPendingMilestone,
        id: 'milestone-456',
        order_id: 'order-789'
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockPendingMilestone, secondMilestone],
              error: null
            })
          })
        })
      });

      // Mock first call fails, second succeeds
      mockSupabaseRpc
        .mockResolvedValueOnce({ error: new Error('First milestone failed') })
        .mockResolvedValueOnce({ error: null });

      mockSupabaseInsert.mockResolvedValue({ error: null });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(2);
      expect(data.autoApproved).toBe(1);
      expect(data.failed).toBe(1);
      expect(data.approvedMilestoneIds).toContain('milestone-456');
      expect(data.errors).toHaveLength(1);
    });

    it('handles escrow service failures gracefully', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockPendingMilestone],
              error: null
            })
          })
        })
      });

      mockSupabaseRpc.mockResolvedValue({ error: null });
      mockSupabaseInsert.mockResolvedValue({ error: null });

      // Mock escrow service failure
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Escrow service error')
      });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.autoApproved).toBe(1);
      
      // Should still count as successful auto-approval even if escrow fails
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Payment release failed'),
        expect.any(String)
      );
    });

    it('processes multiple milestones in correct order', async () => {
      const olderMilestone = {
        ...mockPendingMilestone,
        id: 'milestone-older',
        auto_approval_deadline: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
      };

      const newerMilestone = {
        ...mockPendingMilestone,
        id: 'milestone-newer',
        auto_approval_deadline: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [olderMilestone, newerMilestone], // Should process in deadline order
              error: null
            })
          })
        })
      });

      mockSupabaseRpc.mockResolvedValue({ error: null });
      mockSupabaseInsert.mockResolvedValue({ error: null });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(2);
      expect(data.autoApproved).toBe(2);
      expect(data.approvedMilestoneIds).toEqual(['milestone-older', 'milestone-newer']);
    });
  });

  describe('POST endpoint (development only)', () => {
    it('blocks POST requests in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.assign(process.env, { NODE_ENV: 'production' });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Manual trigger not allowed in production');

      Object.assign(process.env, { NODE_ENV: originalEnv });
    });

    it('allows POST requests in development', async () => {
      Object.assign(process.env, { NODE_ENV: 'development' });

      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost/api/cron/auto-approve-milestones', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${mockCronSecret}`
        }
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });
  });
});