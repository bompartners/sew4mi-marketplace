// Unit tests for dispute resolution API
// Story 2.4: Dispute Resolution Framework

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/admin/disputes/[id]/resolve/route';
import { NextRequest } from 'next/server';
import { DisputeResolutionType } from '@sew4mi/shared';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  })),
  rpc: vi.fn()
};

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabaseClient),
  createServiceRoleClient: vi.fn(() => mockSupabaseClient)
}));

describe('Dispute Resolution API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = {
    id: 'admin-id',
    email: 'admin@sew4mi.com'
  };

  const mockAdminProfile = {
    role: 'admin'
  };

  const mockDispute = {
    id: 'dispute-id',
    title: 'Test Dispute',
    status: 'OPEN',
    orders: {
      id: 'order-id',
      total_amount: 200,
      customer_id: 'customer-id',
      tailor_id: 'tailor-id',
      status: 'IN_PROGRESS'
    }
  };

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/admin/disputes/dispute-id/resolve', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  };

  it('should resolve dispute with full refund', async () => {
    // Setup mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockDispute,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'dispute_activities' || table === 'notifications') {
        return {
          insert: vi.fn().mockResolvedValue({
            error: null
          })
        };
      }
      return mockSupabaseClient.from();
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        dispute_id: 'dispute-id',
        resolution_id: 'resolution-id',
        resolution_type: 'FULL_REFUND',
        refund_amount: 200,
        resolved_at: '2024-08-24T12:00:00Z'
      },
      error: null
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.FULL_REFUND,
      outcome: 'Customer complaint validated. Full refund approved.',
      refundAmount: 200,
      reasonCode: 'QUALITY_ISSUE',
      adminNotes: 'Issue confirmed by quality review'
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-id' }) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.dispute.resolutionType).toBe('FULL_REFUND');
    expect(result.dispute.refundAmount).toBe(200);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'resolve_dispute_with_payment',
      expect.objectContaining({
        p_dispute_id: 'dispute-id',
        p_admin_id: 'admin-id',
        p_resolution_type: 'FULL_REFUND',
        p_refund_amount: 200
      })
    );
  });

  it('should resolve dispute with partial refund', async () => {
    // Setup mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockDispute,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'dispute_activities' || table === 'notifications') {
        return {
          insert: vi.fn().mockResolvedValue({
            error: null
          })
        };
      }
      return mockSupabaseClient.from();
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        dispute_id: 'dispute-id',
        resolution_id: 'resolution-id',
        resolution_type: 'PARTIAL_REFUND',
        refund_amount: 100,
        resolved_at: '2024-08-24T12:00:00Z'
      },
      error: null
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.PARTIAL_REFUND,
      outcome: 'Partial responsibility determined. 50% refund approved.',
      refundAmount: 100,
      reasonCode: 'SHARED_RESPONSIBILITY'
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-id' }) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.dispute.resolutionType).toBe('PARTIAL_REFUND');
    expect(result.dispute.refundAmount).toBe(100);
  });

  it('should resolve dispute with order completion', async () => {
    // Setup mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockDispute,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'dispute_activities' || table === 'notifications') {
        return {
          insert: vi.fn().mockResolvedValue({
            error: null
          })
        };
      }
      return mockSupabaseClient.from();
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        dispute_id: 'dispute-id',
        resolution_id: 'resolution-id',
        resolution_type: 'ORDER_COMPLETION',
        refund_amount: null,
        resolved_at: '2024-08-24T12:00:00Z'
      },
      error: null
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.ORDER_COMPLETION,
      outcome: 'Tailor to complete order as originally agreed. No refund required.',
      reasonCode: 'CUSTOMER_EXPECTATION_CLARIFIED'
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-id' }) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.dispute.resolutionType).toBe('ORDER_COMPLETION');
    expect(result.dispute.refundAmount).toBeNull();
  });

  it('should return 401 for unauthenticated user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.FULL_REFUND,
      outcome: 'Test resolution',
      refundAmount: 100
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-id' }) });
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe('Unauthorized');
  });

  it('should return 403 for non-admin user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'customer' },
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.FULL_REFUND,
      outcome: 'Test resolution',
      refundAmount: 100
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-id' }) });
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.error).toBe('Admin access required');
  });

  it('should return 400 for invalid refund amount', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockDispute,
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.FULL_REFUND,
      outcome: 'Test resolution',
      refundAmount: -50 // Invalid negative amount
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-id' }) });
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe('Invalid request data');
    expect(result.details).toBeDefined();
  });

  it('should return 404 for non-existent dispute', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Dispute not found')
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.FULL_REFUND,
      outcome: 'Test resolution',
      refundAmount: 100
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const result = await response.json();

    expect(response.status).toBe(404);
    expect(result.error).toBe('Dispute not found');
  });

  it('should return 409 for already resolved dispute', async () => {
    const resolvedDispute = {
      ...mockDispute,
      status: 'RESOLVED'
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: resolvedDispute,
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });

    const request = createMockRequest({
      resolutionType: DisputeResolutionType.FULL_REFUND,
      outcome: 'Test resolution',
      refundAmount: 100
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-id' }) });
    const result = await response.json();

    expect(response.status).toBe(409);
    expect(result.error).toBe('Dispute is already resolved');
  });
});