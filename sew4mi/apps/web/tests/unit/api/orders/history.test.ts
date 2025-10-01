import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../../../app/api/orders/history/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  or: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  in: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  range: vi.fn()
};

// Mock the createRouteHandlerClient
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabaseClient)
}));

// Mock the cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

describe('/api/orders/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: 'customer-123',
    email: 'customer@test.com'
  };

  const mockOrders = [
    {
      id: 'order-1',
      order_number: 'ORD-001',
      customer_id: 'customer-123',
      tailor_id: 'tailor-123',
      garment_type: 'Suit',
      status: 'COMPLETED',
      total_amount: 200.00,
      created_at: '2025-07-01T10:00:00Z',
      estimated_delivery: '2025-07-15T10:00:00Z',
      customer: { first_name: 'John', last_name: 'Doe' },
      tailor: { first_name: 'Jane', last_name: 'Smith' },
      milestones: [
        { status: 'APPROVED' },
        { status: 'APPROVED' },
        { status: 'APPROVED' }
      ]
    },
    {
      id: 'order-2',
      order_number: 'ORD-002',
      customer_id: 'customer-123',
      tailor_id: 'tailor-456',
      garment_type: 'Dress',
      status: 'IN_PRODUCTION',
      total_amount: 150.00,
      created_at: '2025-08-01T10:00:00Z',
      estimated_delivery: '2025-08-20T10:00:00Z',
      customer: { first_name: 'John', last_name: 'Doe' },
      tailor: { first_name: 'Bob', last_name: 'Wilson' },
      milestones: [
        { status: 'APPROVED' },
        { status: 'IN_PROGRESS' },
        { status: 'PENDING' }
      ]
    }
  ];

  it('should return paginated order history for authenticated user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: mockOrders,
      error: null,
      count: 2
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData).toMatchObject({
      orders: expect.arrayContaining([
        expect.objectContaining({
          id: 'order-1',
          orderNumber: 'ORD-001',
          customerName: 'John Doe',
          tailorName: 'Jane Smith',
          garmentType: 'Suit',
          status: 'COMPLETED',
          progressPercentage: 100,
          totalAmount: 200.00
        })
      ]),
      totalCount: 2,
      hasMore: false
    });
  });

  it('should handle pagination parameters correctly', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: [mockOrders[0]],
      error: null,
      count: 10
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history?limit=1&offset=0');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.orders).toHaveLength(1);
    expect(responseData.totalCount).toBe(10);
    expect(responseData.hasMore).toBe(true);
    expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 0);
  });

  it('should filter by status when provided', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: [mockOrders[1]],
      error: null,
      count: 1
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history?status=IN_PRODUCTION');

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['IN_PRODUCTION']);
  });

  it('should filter by multiple statuses', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: mockOrders,
      error: null,
      count: 2
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history?status=COMPLETED,IN_PRODUCTION');

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['COMPLETED', 'IN_PRODUCTION']);
  });

  it('should apply sorting parameters', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: mockOrders,
      error: null,
      count: 2
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history?sortBy=updated_at&sortOrder=asc');

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('updated_at', { ascending: true });
  });

  it('should filter by customerId when user matches', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: mockOrders,
      error: null,
      count: 2
    });

    const request = new NextRequest(`http://localhost:3000/api/orders/history?customerId=${mockUser.id}`);

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('customer_id', mockUser.id);
  });

  it('should filter by tailorId when user matches', async () => {
    const tailorUser = { id: 'tailor-123', email: 'tailor@test.com' };
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: tailorUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: [mockOrders[0]],
      error: null,
      count: 1
    });

    const request = new NextRequest(`http://localhost:3000/api/orders/history?tailorId=${tailorUser.id}`);

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tailor_id', tailorUser.id);
  });

  it('should calculate progress percentage correctly', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: [mockOrders[1]], // Has 1/3 approved milestones
      error: null,
      count: 1
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.orders[0].progressPercentage).toBe(33); // 1/3 * 100 rounded
  });

  it('should return 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.errors).toContain('Authentication required');
  });

  it('should return 400 for invalid query parameters', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history?limit=invalid');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.errors).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
      count: null
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.errors).toContain('Failed to fetch order history');
  });

  it('should enforce maximum limit parameter', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history?limit=100');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.errors).toBeDefined();
  });

  it('should handle empty order history', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: [],
      error: null,
      count: 0
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData).toMatchObject({
      orders: [],
      totalCount: 0,
      hasMore: false
    });
  });

  it('should handle orders without milestones', async () => {
    const orderWithoutMilestones = {
      ...mockOrders[0],
      milestones: null
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.range.mockResolvedValue({
      data: [orderWithoutMilestones],
      error: null,
      count: 1
    });

    const request = new NextRequest('http://localhost:3000/api/orders/history');

    const response = await GET(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.orders[0].progressPercentage).toBe(0);
  });
});