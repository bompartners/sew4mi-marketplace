import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/tailors/payments/dashboard/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabaseClient
}));

// Mock PaymentAnalyticsService
const mockPaymentService = {
  getTailorPaymentDashboard: vi.fn()
};

vi.mock('@/lib/services/payment-analytics.service', () => ({
  PaymentAnalyticsService: vi.fn(() => mockPaymentService)
}));

describe('GET /api/tailors/payments/dashboard', () => {
  const mockTailorUser = {
    id: 'tailor-123',
    email: 'tailor@example.com'
  };

  const mockDashboardData = {
    summary: {
      tailorId: 'tailor-123',
      period: '2024-08',
      totalEarnings: 1500.00,
      grossPayments: 2000.00,
      platformCommission: 400.00,
      netEarnings: 1600.00,
      pendingAmount: 200.00,
      completedAmount: 1800.00,
      disputedAmount: 0.00,
      refundedAmount: 0.00,
      totalOrders: 8,
      completedOrders: 7,
      averageOrderValue: 250.00,
      commissionRate: 0.2000,
      lastUpdated: new Date()
    },
    monthlyTrends: [
      {
        period: '2024-07',
        earnings: 1200.00,
        orders: 6,
        commission: 240.00
      }
    ],
    paymentStatusBreakdown: {
      pending: 200,
      completed: 1800,
      disputed: 0,
      refunded: 0
    },
    recentTransactions: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return dashboard data for authenticated tailor', async () => {
    // Mock authentication
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockTailorUser },
      error: null
    });

    // Mock user role verification
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { role: 'TAILOR' },
            error: null
          })
        })
      })
    });

    // Mock payment service
    mockPaymentService.getTailorPaymentDashboard.mockResolvedValueOnce(mockDashboardData);

    const request = new NextRequest('http://localhost:3000/api/tailors/payments/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({
      success: true,
      data: mockDashboardData
    });

    expect(mockPaymentService.getTailorPaymentDashboard).toHaveBeenCalledWith('tailor-123');
  });

  it('should return 401 for unauthenticated request', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    const request = new NextRequest('http://localhost:3000/api/tailors/payments/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Unauthorized'
    });
  });

  it('should return 403 for non-tailor users', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'customer-123' } },
      error: null
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { role: 'CUSTOMER' },
            error: null
          })
        })
      })
    });

    const request = new NextRequest('http://localhost:3000/api/tailors/payments/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Access denied. Tailor role required.'
    });
  });

  it('should handle service errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockTailorUser },
      error: null
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: { role: 'TAILOR' },
            error: null
          })
        })
      })
    });

    mockPaymentService.getTailorPaymentDashboard.mockRejectedValueOnce(
      new Error('Database connection failed')
    );

    const request = new NextRequest('http://localhost:3000/api/tailors/payments/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Failed to fetch payment dashboard',
      details: 'Database connection failed'
    });
  });

  it('should handle user role verification errors', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockTailorUser },
      error: null
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: null,
            error: { message: 'User not found' }
          })
        })
      })
    });

    const request = new NextRequest('http://localhost:3000/api/tailors/payments/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data).toEqual({
      error: 'Access denied. Tailor role required.'
    });
  });
});