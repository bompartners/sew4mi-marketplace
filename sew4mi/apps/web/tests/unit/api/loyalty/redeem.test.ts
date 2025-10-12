import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/loyalty/redeem/route';
import { loyaltyService } from '@/lib/services/loyalty.service';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { LoyaltyAccount, LoyaltyReward } from '@sew4mi/shared/types';

// Mock dependencies
vi.mock('@/lib/services/loyalty.service');
vi.mock('@/lib/supabase');

describe('POST /api/loyalty/redeem', () => {
  let mockSupabase: any;
  let mockRequest: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockAccount: LoyaltyAccount = {
    id: 'account-1',
    userId: mockUser.id,
    totalPoints: 500,
    availablePoints: 300,
    lifetimePoints: 1500,
    tier: 'SILVER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockReward: LoyaltyReward = {
    id: 'reward-1',
    name: '10% Discount',
    description: 'Get 10% off',
    pointsCost: 500,
    discountPercentage: 10,
    discountAmount: null,
    rewardType: 'DISCOUNT',
    isActive: true,
    createdAt: new Date().toISOString(),
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

  it('should successfully redeem reward with sufficient points', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'reward-1',
      orderId: 'order-123',
    });

    vi.mocked(loyaltyService.redeemReward).mockResolvedValue({
      account: mockAccount,
      reward: mockReward,
    });

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.account).toEqual(mockAccount);
    expect(data.reward).toEqual(mockReward);
    expect(data.discount).toEqual({
      type: 'DISCOUNT',
      percentage: 10,
      amount: null,
    });
    expect(loyaltyService.redeemReward).toHaveBeenCalledWith(mockUser.id, 'reward-1', 'order-123');
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
    expect(loyaltyService.redeemReward).not.toHaveBeenCalled();
  });

  it('should return 400 when rewardId missing', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      orderId: 'order-123',
      // Missing rewardId
    });

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('rewardId is required');
    expect(loyaltyService.redeemReward).not.toHaveBeenCalled();
  });

  it('should return 400 when user has insufficient points', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'reward-1',
    });

    vi.mocked(loyaltyService.redeemReward).mockRejectedValue(
      new Error('Insufficient points. You have 100 points, but need 500 points')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toContain('Insufficient points');
  });

  it('should return 404 when reward not found', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'invalid-reward',
    });

    vi.mocked(loyaltyService.redeemReward).mockRejectedValue(
      new Error('Reward not found')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data.error).toBe('Reward not found');
  });

  it('should return 410 when reward is no longer active', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'reward-1',
    });

    vi.mocked(loyaltyService.redeemReward).mockRejectedValue(
      new Error('Reward is no longer active')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(410);
    expect(data.error).toBe('Reward is no longer active');
  });

  it('should handle orderId as optional parameter', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'reward-1',
      // No orderId
    });

    vi.mocked(loyaltyService.redeemReward).mockResolvedValue({
      account: mockAccount,
      reward: mockReward,
    });

    // Act
    const response = await POST(mockRequest);

    // Assert
    expect(response.status).toBe(200);
    expect(loyaltyService.redeemReward).toHaveBeenCalledWith(mockUser.id, 'reward-1', undefined);
  });

  it('should return discount details when reward has fixed amount', async () => {
    // Arrange
    const fixedAmountReward: LoyaltyReward = {
      ...mockReward,
      discountPercentage: null,
      discountAmount: 50,
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'reward-1',
    });

    vi.mocked(loyaltyService.redeemReward).mockResolvedValue({
      account: mockAccount,
      reward: fixedAmountReward,
    });

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.discount).toEqual({
      type: 'DISCOUNT',
      percentage: null,
      amount: 50,
    });
  });

  it('should return null discount for non-discount rewards', async () => {
    // Arrange
    const priorityReward: LoyaltyReward = {
      ...mockReward,
      discountPercentage: null,
      discountAmount: null,
      rewardType: 'PRIORITY',
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'reward-1',
    });

    vi.mocked(loyaltyService.redeemReward).mockResolvedValue({
      account: mockAccount,
      reward: priorityReward,
    });

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.discount).toBeNull();
  });

  it('should return 500 for unexpected errors', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockRequest.json.mockResolvedValue({
      rewardId: 'reward-1',
    });

    vi.mocked(loyaltyService.redeemReward).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Database connection failed');
  });
});
