import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../../../app/api/orders/[id]/timeline/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  single: vi.fn()
};

// Mock the createRouteHandlerClient
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabaseClient)
}));

// Mock the cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

// Mock utility function
vi.mock('@sew4mi/shared/utils/order-progress', () => ({
  calculateOrderProgress: vi.fn(() => ({
    progressPercentage: 65,
    completedMilestones: 2,
    totalMilestones: 3
  }))
}));

describe('/api/orders/[id]/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: 'customer-123',
    email: 'customer@test.com'
  };

  const mockOrder = {
    id: 'order-123',
    order_number: 'ORD-12345',
    customer_id: 'customer-123',
    tailor_id: 'tailor-123',
    status: 'IN_PRODUCTION',
    total_amount: 150.00,
    estimated_delivery: '2025-09-01T10:00:00Z',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-08-15T10:00:00Z'
  };

  const mockMilestones = [
    {
      id: 'milestone-1',
      order_id: 'order-123',
      stage: 'DEPOSIT',
      status: 'APPROVED',
      amount: 37.50,
      photo_url: null,
      notes: null,
      required_action: 'CUSTOMER_PAYMENT',
      approved_by: 'customer-123',
      approved_at: '2025-08-05T10:00:00Z',
      submitted_at: '2025-08-02T10:00:00Z',
      created_at: '2025-08-01T10:00:00Z',
      updated_at: '2025-08-05T10:00:00Z'
    },
    {
      id: 'milestone-2',
      order_id: 'order-123',
      stage: 'FITTING',
      status: 'IN_PROGRESS',
      amount: 75.00,
      photo_url: 'https://example.com/photo.jpg',
      notes: 'Fitting in progress',
      required_action: 'TAILOR_SUBMISSION',
      approved_by: null,
      approved_at: null,
      submitted_at: null,
      created_at: '2025-08-01T10:00:00Z',
      updated_at: '2025-08-15T10:00:00Z'
    }
  ];

  it('should return order timeline for authorized customer', async () => {
    // Setup mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: mockOrder, error: null })
      .mockResolvedValueOnce({ data: mockMilestones, error: null });

    const request = new NextRequest('http://localhost:3000/api/orders/order-123/timeline');
    const params = Promise.resolve({ id: 'order-123' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData).toMatchObject({
      orderId: 'order-123',
      currentStatus: 'IN_PRODUCTION',
      progressPercentage: 65,
      estimatedCompletion: expect.any(String),
      milestones: mockMilestones,
      nextMilestone: {
        type: 'FITTING',
        description: 'Next step: tailor submission'
      },
      daysRemaining: expect.any(Number)
    });
  });

  it('should return order timeline for authorized tailor', async () => {
    const tailorUser = { id: 'tailor-123', email: 'tailor@test.com' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: tailorUser },
      error: null
    });

    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: mockOrder, error: null })
      .mockResolvedValueOnce({ data: mockMilestones, error: null });

    const request = new NextRequest('http://localhost:3000/api/orders/order-123/timeline');
    const params = Promise.resolve({ id: 'order-123' });

    const response = await GET(request, { params });

    expect(response.status).toBe(200);
  });

  it('should return 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = new NextRequest('http://localhost:3000/api/orders/order-123/timeline');
    const params = Promise.resolve({ id: 'order-123' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.errors).toContain('Authentication required');
  });

  it('should return 400 for invalid order ID format', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const request = new NextRequest('http://localhost:3000/api/orders/invalid-id/timeline');
    const params = Promise.resolve({ id: 'invalid-id' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.errors).toContain('Invalid order ID format');
  });

  it('should return 404 when order is not found', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: new Error('Order not found')
    });

    const request = new NextRequest('http://localhost:3000/api/orders/nonexistent-123/timeline');
    const params = Promise.resolve({ id: 'nonexistent-123' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.errors).toContain('Order not found');
  });

  it('should return 403 when user is not authorized to access order', async () => {
    const unauthorizedUser = { id: 'other-user-123', email: 'other@test.com' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: unauthorizedUser },
      error: null
    });

    mockSupabaseClient.single.mockResolvedValue({
      data: mockOrder,
      error: null
    });

    const request = new NextRequest('http://localhost:3000/api/orders/order-123/timeline');
    const params = Promise.resolve({ id: 'order-123' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.errors).toContain('Unauthorized access to order');
  });

  it('should handle timeline calculation with no milestones', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: mockOrder, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const request = new NextRequest('http://localhost:3000/api/orders/order-123/timeline');
    const params = Promise.resolve({ id: 'order-123' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.milestones).toEqual([]);
    expect(responseData.nextMilestone).toBeUndefined();
  });

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: mockOrder, error: null })
      .mockResolvedValueOnce({ 
        data: null, 
        error: new Error('Database error') 
      });

    const request = new NextRequest('http://localhost:3000/api/orders/order-123/timeline');
    const params = Promise.resolve({ id: 'order-123' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.errors).toContain('Failed to fetch milestones');
  });

  it('should calculate days remaining correctly', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    
    const orderWithFutureDate = {
      ...mockOrder,
      estimated_delivery: futureDate.toISOString()
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: orderWithFutureDate, error: null })
      .mockResolvedValueOnce({ data: mockMilestones, error: null });

    const request = new NextRequest('http://localhost:3000/api/orders/order-123/timeline');
    const params = Promise.resolve({ id: 'order-123' });

    const response = await GET(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.daysRemaining).toBeGreaterThan(0);
    expect(responseData.daysRemaining).toBeLessThanOrEqual(5);
  });
});