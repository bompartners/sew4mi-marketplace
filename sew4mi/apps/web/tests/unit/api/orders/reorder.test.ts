import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/orders/reorder/route';
import { reorderService } from '@/lib/services/reorder.service';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ReorderModifications } from '@sew4mi/shared/types';

// Mock dependencies
vi.mock('@/lib/services/reorder.service');
vi.mock('@/lib/supabase');

describe('POST /api/orders/reorder', () => {
  let mockSupabase: any;
  let mockRequest: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockNewOrder = {
    id: 'new-order-123',
    customer_id: mockUser.id,
    tailor_id: 'tailor-456',
    garment_type: 'suit',
    total_amount: 500,
    status: 'PENDING',
    metadata: {
      is_reorder: true,
      original_order_id: 'order-789',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase auth
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase);

    // Mock request
    mockRequest = {
      json: vi.fn(),
    };
  });

  it('should successfully create reorder', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
      modifications: {
        specialInstructions: 'Updated instructions',
      },
    });

    vi.mocked(reorderService.createReorder).mockResolvedValue(mockNewOrder);

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(data).toEqual(mockNewOrder);
    expect(reorderService.createReorder).toHaveBeenCalledWith(mockUser.id, {
      orderId: 'order-789',
      modifications: {
        specialInstructions: 'Updated instructions',
      },
    });
  });

  it('should create reorder without modifications', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
    });

    vi.mocked(reorderService.createReorder).mockResolvedValue(mockNewOrder);

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(data).toEqual(mockNewOrder);
    expect(reorderService.createReorder).toHaveBeenCalledWith(mockUser.id, {
      orderId: 'order-789',
      modifications: undefined,
    });
  });

  it('should return 401 when user not authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(reorderService.createReorder).not.toHaveBeenCalled();
  });

  it('should return 400 when orderId missing', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      modifications: {
        fabricChoice: 'silk',
      },
    });

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('orderId is required');
    expect(reorderService.createReorder).not.toHaveBeenCalled();
  });

  it('should return 404 when original order not found', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'invalid-order',
    });

    vi.mocked(reorderService.createReorder).mockRejectedValue(
      new Error('Order not found')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data.error).toBe('Order not found');
  });

  it('should return 400 when order cannot be reordered', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
    });

    vi.mocked(reorderService.createReorder).mockRejectedValue(
      new Error('Cannot reorder: Only completed orders can be reordered')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot reorder');
  });

  it('should return 409 when tailor not available', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
    });

    vi.mocked(reorderService.createReorder).mockRejectedValue(
      new Error('Tailor is not available: Tailor is at capacity')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(409);
    expect(data.error).toContain('not available');
  });

  it('should handle fabric modifications', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const modifications: ReorderModifications = {
      fabricChoice: 'silk',
      colorChoice: 'navy',
    };

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
      modifications,
    });

    vi.mocked(reorderService.createReorder).mockResolvedValue(mockNewOrder);

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(response.status).toBe(201);
    expect(reorderService.createReorder).toHaveBeenCalledWith(mockUser.id, {
      orderId: 'order-789',
      modifications,
    });
  });

  it('should handle measurement profile modifications', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const modifications: ReorderModifications = {
      measurementProfileId: 'new-profile-456',
      specialInstructions: 'New size requirements',
    };

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
      modifications,
    });

    vi.mocked(reorderService.createReorder).mockResolvedValue(mockNewOrder);

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(response.status).toBe(201);
    expect(reorderService.createReorder).toHaveBeenCalledWith(mockUser.id, {
      orderId: 'order-789',
      modifications,
    });
  });

  it('should return 500 for unexpected errors', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
    });

    vi.mocked(reorderService.createReorder).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Database connection failed');
  });

  it('should include reorder metadata in response', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'order-789',
    });

    vi.mocked(reorderService.createReorder).mockResolvedValue(mockNewOrder);

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(data.metadata.is_reorder).toBe(true);
    expect(data.metadata.original_order_id).toBe('order-789');
  });
});
