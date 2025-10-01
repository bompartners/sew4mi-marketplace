import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/orders/create/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { OrderStatus, UrgencyLevel, FabricChoice } from '@sew4mi/shared/types';

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs');
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
};

const mockCreateRouteHandlerClient = createRouteHandlerClient as any;

const mockUser = {
  id: 'user-123',
  email: 'customer@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: null,
  confirmation_sent_at: null,
  confirmed_at: null,
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z'
};

const mockTailorProfile = {
  id: 'tailor-profile-123',
  user_id: 'tailor-123',
  is_active: true
};

const mockMeasurementProfile = {
  id: 'profile-123',
  user_id: 'user-123'
};

const validOrderData = {
  customerId: 'user-123',
  tailorId: 'tailor-123',
  measurementProfileId: 'profile-123',
  garmentType: 'custom-suit',
  fabricChoice: FabricChoice.TAILOR_SOURCED,
  specialInstructions: 'Please make it slim fit',
  totalAmount: 390.00,
  estimatedDelivery: new Date('2024-12-31'),
  urgencyLevel: UrgencyLevel.STANDARD
};

describe('/api/orders/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRouteHandlerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('creates order successfully with valid data', async () => {
    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock tailor profile lookup
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: mockTailorProfile,
        error: null
      })
    });

    // Mock measurement profile lookup
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: mockMeasurementProfile,
        error: null
      })
    });

    // Mock order creation
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'order-123',
          order_number: 'ORD-1234567890-ABC123'
        },
        error: null
      })
    });

    // Mock milestone creation
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    });

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(validOrderData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.success).toBe(true);
    expect(responseData.orderId).toBe('order-123');
    expect(responseData.orderNumber).toBe('ORD-1234567890-ABC123');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Authentication required')
    });

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(validOrderData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.success).toBe(false);
    expect(responseData.errors).toEqual(['Authentication required']);
  });

  it('returns 400 when request data is invalid', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const invalidData = {
      ...validOrderData,
      totalAmount: -100, // Invalid negative amount
      customerId: 'invalid-uuid' // Invalid UUID format
    };

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('customerId'),
        expect.stringContaining('totalAmount')
      ])
    );
  });

  it('returns 403 when customer ID does not match authenticated user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const invalidData = {
      ...validOrderData,
      customerId: 'different-user-123'
    };

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(403);
    expect(responseData.success).toBe(false);
    expect(responseData.errors).toEqual(['Unauthorized - customer ID mismatch']);
  });

  it('returns 400 when tailor is not available', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock tailor not found
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Tailor not found')
      })
    });

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(validOrderData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.errors).toEqual(['Selected tailor is not available']);
  });

  it('returns 400 when measurement profile is invalid', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock valid tailor
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: mockTailorProfile,
        error: null
      })
    });

    // Mock invalid measurement profile
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Profile not found')
      })
    });

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(validOrderData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.errors).toEqual(['Invalid measurement profile']);
  });

  it('calculates escrow breakdown correctly', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: mockTailorProfile,
        error: null
      })
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: mockMeasurementProfile,
        error: null
      })
    });

    const mockInsert = vi.fn().mockResolvedValue({
      data: {
        id: 'order-123',
        order_number: 'ORD-1234567890-ABC123'
      },
      error: null
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockReturnValue({
        data: {
          id: 'order-123',
          order_number: 'ORD-1234567890-ABC123'
        },
        error: null
      }),
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'order-123',
            order_number: 'ORD-1234567890-ABC123'
          },
          error: null
        })
      })
    });

    // Mock milestone creation
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    });

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(validOrderData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await POST(request);

    // Check that the order was inserted with correct escrow amounts
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        total_amount: 390.00,
        deposit_amount: 97.5,  // 25% of 390
        fitting_amount: 195,   // 50% of 390
        final_amount: 97.5,    // 25% of 390
        status: OrderStatus.PENDING_DEPOSIT
      })
    );
  });

  it('handles database errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: mockTailorProfile,
        error: null
      })
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: mockMeasurementProfile,
        error: null
      })
    });

    // Mock database error on order creation
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient,
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      })
    });

    const request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(validOrderData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.success).toBe(false);
    expect(responseData.errors).toEqual(['Failed to create order']);
  });
});