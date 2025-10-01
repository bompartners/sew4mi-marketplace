/**
 * Tailor Group Orders API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/tailors/group-orders/route';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn()
}));

describe('GET /api/tailors/group-orders', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    };

    (createServerSupabaseClient as any).mockReturnValue(mockSupabase);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = new Request('http://localhost:3000/api/tailors/group-orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not a tailor', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'customer' },
        error: null
      })
    });

    const request = new Request('http://localhost:3000/api/tailors/group-orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Tailor role required');
  });

  it('returns group orders for authenticated tailor', async () => {
    const mockGroupOrders = [
      {
        id: 'group-1',
        group_name: 'Test Group',
        tailor_id: 'tailor-1',
        status: 'IN_PROGRESS',
        event_date: new Date().toISOString(),
        group_order_items: [],
        tailor_group_coordination: []
      }
    ];

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'tailor-1' } },
      error: null
    });

    let selectCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'tailor' },
            error: null
          })
        };
      }
      
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockGroupOrders,
          error: null
        })
      };
    });

    const request = new Request('http://localhost:3000/api/tailors/group-orders');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.groupOrders).toBeDefined();
    expect(data.count).toBe(1);
  });

  it('applies status filter when provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'tailor-1' } },
      error: null
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'tailor' },
            error: null
          })
        };
      }
      
      const eqFn = vi.fn().mockReturnThis();
      return {
        select: vi.fn().mockReturnThis(),
        eq: eqFn,
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
    });

    const request = new Request('http://localhost:3000/api/tailors/group-orders?status=IN_PROGRESS');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('handles database errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'tailor-1' } },
      error: null
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'tailor' },
            error: null
          })
        };
      }
      
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      };
    });

    const request = new Request('http://localhost:3000/api/tailors/group-orders');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

