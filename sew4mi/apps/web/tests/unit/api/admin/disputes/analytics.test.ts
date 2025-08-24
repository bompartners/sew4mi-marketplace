// Unit tests for dispute analytics API
// Story 2.4: Dispute Resolution Framework - Analytics

import { GET } from '@/app/api/admin/disputes/analytics/route';
import { NextRequest } from 'next/server';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({
          order: jest.fn()
        }))
      })),
      not: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn()
        }))
      }))
    }))
  })),
  rpc: jest.fn()
};

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('Dispute Analytics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAdminUser = {
    id: 'admin-id',
    email: 'admin@sew4mi.com'
  };

  const mockAdminProfile = {
    role: 'admin'
  };

  const mockAnalyticsData = [
    {
      total_disputes: 25,
      resolved_disputes: 20,
      avg_resolution_time_hours: 24.5,
      sla_performance: {
        sla_performance_rate: 85
      }
    }
  ];

  const mockCategoryData = [
    { category: 'QUALITY_ISSUE' },
    { category: 'QUALITY_ISSUE' },
    { category: 'DELIVERY_DELAY' },
    { category: 'PAYMENT_PROBLEM' },
    { category: 'QUALITY_ISSUE' }
  ];

  const createMockRequest = (params = {}) => {
    const url = new URL('http://localhost:3000/api/admin/disputes/analytics');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    
    return new NextRequest(url.toString(), {
      method: 'GET'
    });
  };

  it('should return comprehensive analytics data', async () => {
    // Setup mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({
                  data: mockCategoryData,
                  error: null
                })
              }))
            }))
          }))
        };
      } else if (table === 'orders') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn().mockResolvedValue({
                  count: 10,
                  error: null
                })
              }))
            })),
            count: 'exact',
            head: true
          }))
        };
      }
      return mockSupabaseClient.from();
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: mockAnalyticsData,
      error: null
    });

    const request = createMockRequest();
    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toHaveProperty('overview');
    expect(result).toHaveProperty('patterns');
    expect(result).toHaveProperty('trends');
    expect(result).toHaveProperty('performance');

    // Check overview data
    expect(result.overview.totalDisputes).toBe(25);
    expect(result.overview.resolvedDisputes).toBe(20);
    expect(result.overview.averageResolutionTime).toBe(24.5);
    expect(result.overview.slaPerformance).toBe(85);

    // Check that RPC function was called
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'get_dispute_analytics',
      expect.objectContaining({
        p_start_date: expect.any(String),
        p_end_date: expect.any(String)
      })
    );
  });

  it('should handle date range parameters', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        }))
      };
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: mockAnalyticsData,
      error: null
    });

    const request = createMockRequest({
      startDate: '2024-01-01',
      endDate: '2024-08-24'
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    // Verify RPC was called with correct dates
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'get_dispute_analytics',
      expect.objectContaining({
        p_start_date: '2024-01-01',
        p_end_date: '2024-08-24'
      })
    );
  });

  it('should respect includePatterns parameter', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: mockCategoryData,
                error: null
              })
            }))
          }))
        }))
      };
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: mockAnalyticsData,
      error: null
    });

    const request = createMockRequest({
      includePatterns: 'false',
      includeTrends: 'false',
      includePerformance: 'false'
    });

    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.patterns.topCategories).toEqual([]);
    expect(result.trends.monthly).toEqual([]);
    expect(result.performance.adminPerformance).toEqual([]);
  });

  it('should return 401 for unauthenticated user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = createMockRequest();
    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe('Unauthorized');
  });

  it('should return 403 for non-admin user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { role: 'customer' },
                error: null
              })
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });

    const request = createMockRequest();
    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.error).toBe('Admin access required');
  });

  it('should return 400 for invalid query parameters', async () => {
    const request = createMockRequest({
      startDate: 'invalid-date'
    });

    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe('Invalid query parameters');
  });

  it('should handle empty analytics data gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        }))
      };
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: [],
      error: null
    });

    const request = createMockRequest();
    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.overview.totalDisputes).toBe(0);
    expect(result.overview.resolvedDisputes).toBe(0);
    expect(result.overview.averageResolutionTime).toBe(0);
    expect(result.overview.slaPerformance).toBe(0);
  });

  it('should calculate category percentages correctly', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null
              })
            }))
          }))
        };
      } else if (table === 'disputes') {
        return {
          select: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({
                  data: mockCategoryData, // 3 QUALITY_ISSUE, 1 DELIVERY_DELAY, 1 PAYMENT_PROBLEM
                  error: null
                })
              }))
            }))
          }))
        };
      }
      return mockSupabaseClient.from();
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: mockAnalyticsData,
      error: null
    });

    const request = createMockRequest();
    const response = await GET(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.patterns.topCategories).toBeDefined();
    expect(result.patterns.topCategories.length).toBeGreaterThan(0);
    
    // Check that QUALITY_ISSUE has the highest count (3 out of 5 = 60%)
    const qualityCategory = result.patterns.topCategories.find(
      (cat: any) => cat.category === 'QUALITY_ISSUE'
    );
    expect(qualityCategory).toBeDefined();
    expect(qualityCategory.count).toBe(3);
    expect(qualityCategory.percentage).toBe(60);
  });
});