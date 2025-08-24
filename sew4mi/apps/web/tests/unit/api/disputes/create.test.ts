// Integration test for dispute creation API endpoint
// Story 2.4: Test dispute creation API functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/disputes/create/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn()
};

vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabaseClient
}));

describe('/api/disputes/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create dispute successfully', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    // Mock order verification
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: {
        id: 'order-123',
        customer_id: 'user-123',
        total_amount: 500
      },
      error: null
    });

    // Mock dispute creation
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: {
        id: 'dispute-123',
        order_id: 'order-123',
        category: 'QUALITY_ISSUE',
        title: 'Poor stitching quality',
        description: 'The garment has loose threads',
        raised_by: 'user-123',
        status: 'OPEN',
        priority: 'HIGH'
      },
      error: null
    });

    const requestBody = {
      orderId: 'order-123',
      category: 'QUALITY_ISSUE',
      title: 'Poor stitching quality',
      description: 'The garment has loose threads and poor finishing'
    };

    const request = new NextRequest('http://localhost/api/disputes/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.dispute).toBeDefined();
    expect(data.dispute.title).toBe('Poor stitching quality');
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
  });

  it('should return 401 for unauthenticated user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const requestBody = {
      orderId: 'order-123',
      category: 'QUALITY_ISSUE',
      title: 'Test dispute',
      description: 'Test description'
    };

    const request = new NextRequest('http://localhost/api/disputes/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 for missing required fields', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    const requestBody = {
      orderId: 'order-123',
      // Missing required fields
    };

    const request = new NextRequest('http://localhost/api/disputes/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent order', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    // Mock order not found
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Order not found')
    });

    const requestBody = {
      orderId: 'invalid-order',
      category: 'QUALITY_ISSUE',
      title: 'Test dispute',
      description: 'Test description'
    };

    const request = new NextRequest('http://localhost/api/disputes/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
  });

  it('should return 403 for unauthorized user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-456' } },
      error: null
    });

    // Mock order owned by different user
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: {
        id: 'order-123',
        customer_id: 'user-123', // Different user
        total_amount: 500
      },
      error: null
    });

    const requestBody = {
      orderId: 'order-123',
      category: 'QUALITY_ISSUE',
      title: 'Test dispute',
      description: 'Test description'
    };

    const request = new NextRequest('http://localhost/api/disputes/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: {
        id: 'order-123',
        customer_id: 'user-123',
        total_amount: 500
      },
      error: null
    });

    // Mock database error
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Database connection failed')
    });

    const requestBody = {
      orderId: 'order-123',
      category: 'QUALITY_ISSUE',
      title: 'Test dispute',
      description: 'Test description'
    };

    const request = new NextRequest('http://localhost/api/disputes/create', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});