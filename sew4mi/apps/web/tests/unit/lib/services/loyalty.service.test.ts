import { describe, it, expect, beforeEach, vi, type MockedObject } from 'vitest';
import { LoyaltyService } from '@/lib/services/loyalty.service';
import { loyaltyRepository } from '@/lib/repositories/loyalty.repository';
import type {
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyReward,
  LoyaltyTier,
} from '@sew4mi/shared/types';

// Mock the repository
vi.mock('@/lib/repositories/loyalty.repository');

describe('LoyaltyService', () => {
  let loyaltyService: LoyaltyService;
  let mockRepository: typeof loyaltyRepository;

  const mockUserId = 'user-123';
  const mockTailorId = 'tailor-456';
  const mockOrderId = 'order-789';

  const mockAccount: LoyaltyAccount = {
    id: 'account-1',
    userId: mockUserId,
    totalPoints: 1000,
    availablePoints: 800,
    lifetimePoints: 1500,
    tier: 'SILVER' as LoyaltyTier,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockReward: LoyaltyReward = {
    id: 'reward-1',
    name: '10% Discount',
    description: 'Get 10% off your next order',
    pointsCost: 500,
    discountPercentage: 10,
    discountAmount: null,
    rewardType: 'DISCOUNT',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loyaltyService = new LoyaltyService();
    mockRepository = loyaltyRepository as unknown as typeof loyaltyRepository;
  });

  describe('calculatePointsForOrder', () => {
    it('should calculate base points correctly (1 point per GHS)', async () => {
      // Arrange
      const orderAmount = 100;
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount);

      // Act
      const result = await loyaltyService.calculatePointsForOrder(mockUserId, orderAmount, mockTailorId, false);

      // Assert
      expect(result.basePoints).toBe(100); // 1 point per GHS
      expect(result.totalPoints).toBeGreaterThanOrEqual(result.basePoints);
    });

    it('should apply repeat tailor bonus (10%) when ordering from same tailor within 30 days', async () => {
      // Arrange
      const orderAmount = 100;
      const bronzeAccount: LoyaltyAccount = { ...mockAccount, tier: 'BRONZE' as LoyaltyTier };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(true);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(bronzeAccount);

      // Act
      const result = await loyaltyService.calculatePointsForOrder(mockUserId, orderAmount, mockTailorId, false);

      // Assert
      const expectedRepeatBonus = Math.floor(100 * 0.10); // 10% of 100 = 10
      expect(result.bonusPoints).toBe(expectedRepeatBonus);
      expect(result.reason).toContain('Repeat tailor bonus');
    });

    it('should apply group order bonus (5%) for group orders', async () => {
      // Arrange
      const orderAmount = 100;
      const bronzeAccount: LoyaltyAccount = { ...mockAccount, tier: 'BRONZE' as LoyaltyTier };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(bronzeAccount);

      // Act
      const result = await loyaltyService.calculatePointsForOrder(mockUserId, orderAmount, mockTailorId, true);

      // Assert
      const expectedGroupBonus = Math.floor(100 * 0.05); // 5% of 100 = 5
      expect(result.bonusPoints).toBe(expectedGroupBonus);
      expect(result.reason).toContain('Group order bonus');
    });

    it('should apply SILVER tier bonus (5%) to base + other bonuses', async () => {
      // Arrange
      const orderAmount = 100;
      const silverAccount: LoyaltyAccount = { ...mockAccount, tier: 'SILVER' as LoyaltyTier };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(silverAccount);

      // Act
      const result = await loyaltyService.calculatePointsForOrder(mockUserId, orderAmount, mockTailorId, false);

      // Assert
      // Base: 100, Tier bonus: 5% of 100 = 5
      expect(result.bonusPoints).toBe(5);
      expect(result.totalPoints).toBe(105);
      expect(result.reason).toContain('SILVER tier bonus');
    });

    it('should apply GOLD tier bonus (10%)', async () => {
      // Arrange
      const orderAmount = 100;
      const goldAccount: LoyaltyAccount = { ...mockAccount, tier: 'GOLD' as LoyaltyTier, lifetimePoints: 5000 };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(goldAccount);

      // Act
      const result = await loyaltyService.calculatePointsForOrder(mockUserId, orderAmount, mockTailorId, false);

      // Assert
      // Base: 100, Tier bonus: 10% of 100 = 10
      expect(result.bonusPoints).toBe(10);
      expect(result.totalPoints).toBe(110);
      expect(result.reason).toContain('GOLD tier bonus');
    });

    it('should apply PLATINUM tier bonus (15%)', async () => {
      // Arrange
      const orderAmount = 100;
      const platinumAccount: LoyaltyAccount = { ...mockAccount, tier: 'PLATINUM' as LoyaltyTier, lifetimePoints: 15000 };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(platinumAccount);

      // Act
      const result = await loyaltyService.calculatePointsForOrder(mockUserId, orderAmount, mockTailorId, false);

      // Assert
      // Base: 100, Tier bonus: 15% of 100 = 15
      expect(result.bonusPoints).toBe(15);
      expect(result.totalPoints).toBe(115);
      expect(result.reason).toContain('PLATINUM tier bonus');
    });

    it('should stack all bonuses correctly (repeat + group + tier)', async () => {
      // Arrange
      const orderAmount = 100;
      const goldAccount: LoyaltyAccount = { ...mockAccount, tier: 'GOLD' as LoyaltyTier, lifetimePoints: 5000 };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(true);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(goldAccount);

      // Act
      const result = await loyaltyService.calculatePointsForOrder(mockUserId, orderAmount, mockTailorId, true);

      // Assert
      // Base: 100
      // Repeat bonus: 10% of 100 = 10
      // Group bonus: 5% of 100 = 5
      // Tier bonus: 10% of (100 + 10 + 5) = 11 (rounded down)
      // Total: 100 + 10 + 5 + 11 = 126
      expect(result.basePoints).toBe(100);
      expect(result.totalPoints).toBe(126);
      expect(result.reason).toContain('Repeat tailor bonus');
      expect(result.reason).toContain('Group order bonus');
      expect(result.reason).toContain('GOLD tier bonus');
    });
  });

  describe('awardPointsForOrder', () => {
    it('should award points and create transaction', async () => {
      // Arrange
      const orderAmount = 100;
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as LoyaltyTransaction);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(3); // No milestone
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...mockAccount,
        totalPoints: 1105,
        availablePoints: 905,
        lifetimePoints: 1605,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(mockUserId, mockOrderId, orderAmount, mockTailorId, false);

      // Assert
      expect(loyaltyRepository.createTransaction).toHaveBeenCalledWith(
        mockUserId,
        'EARN',
        expect.any(Number),
        expect.stringContaining('Earned'),
        mockOrderId
      );
      expect(loyaltyRepository.updatePoints).toHaveBeenCalled();
      expect(result.totalPoints).toBeGreaterThan(mockAccount.totalPoints);
    });

    it('should award milestone bonus for 5th order', async () => {
      // Arrange
      const orderAmount = 100;
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as LoyaltyTransaction);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(5); // 5th order milestone
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...mockAccount,
        totalPoints: 1605,
        availablePoints: 1405,
        lifetimePoints: 2105,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(mockUserId, mockOrderId, orderAmount, mockTailorId, false);

      // Assert
      // Should create 2 transactions: one for earning, one for milestone
      expect(loyaltyRepository.createTransaction).toHaveBeenCalledTimes(2);
      expect(loyaltyRepository.createTransaction).toHaveBeenCalledWith(
        mockUserId,
        'BONUS',
        500, // 5th order milestone bonus
        expect.stringContaining('Milestone bonus for 5 completed orders'),
        mockOrderId
      );
    });

    it('should award milestone bonus for 10th order', async () => {
      // Arrange
      const orderAmount = 100;
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as LoyaltyTransaction);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(10); // 10th order milestone
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...mockAccount,
        totalPoints: 2105,
        availablePoints: 1905,
        lifetimePoints: 2605,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(mockUserId, mockOrderId, orderAmount, mockTailorId, false);

      // Assert
      expect(loyaltyRepository.createTransaction).toHaveBeenCalledWith(
        mockUserId,
        'BONUS',
        1000, // 10th order milestone bonus
        expect.stringContaining('Milestone bonus for 10 completed orders'),
        mockOrderId
      );
    });

    it('should upgrade tier when crossing threshold', async () => {
      // Arrange
      const orderAmount = 1000;
      const nearSilverAccount: LoyaltyAccount = {
        ...mockAccount,
        tier: 'BRONZE' as LoyaltyTier,
        lifetimePoints: 950, // Just below SILVER threshold (1000)
        totalPoints: 950,
        availablePoints: 950,
      };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(nearSilverAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as LoyaltyTransaction);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(3);
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...nearSilverAccount,
        tier: 'SILVER' as LoyaltyTier,
        totalPoints: 1950,
        availablePoints: 1950,
        lifetimePoints: 1950,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(mockUserId, mockOrderId, orderAmount, mockTailorId, false);

      // Assert
      expect(loyaltyRepository.updatePoints).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        'SILVER' // New tier
      );
    });
  });

  describe('redeemReward', () => {
    it('should successfully redeem reward with sufficient points', async () => {
      // Arrange
      vi.mocked(loyaltyRepository.getRewardById).mockResolvedValue(mockReward);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as LoyaltyTransaction);
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...mockAccount,
        totalPoints: 500,
        availablePoints: 300,
      });

      // Act
      const result = await loyaltyService.redeemReward(mockUserId, mockReward.id, mockOrderId);

      // Assert
      expect(result.account.availablePoints).toBe(300); // 800 - 500
      expect(result.reward).toEqual(mockReward);
      expect(loyaltyRepository.createTransaction).toHaveBeenCalledWith(
        mockUserId,
        'REDEEM',
        -500,
        expect.stringContaining('Redeemed reward'),
        mockOrderId
      );
    });

    it('should throw error when reward not found', async () => {
      // Arrange
      vi.mocked(loyaltyRepository.getRewardById).mockResolvedValue(null);

      // Act & Assert
      await expect(loyaltyService.redeemReward(mockUserId, 'invalid-reward', mockOrderId)).rejects.toThrow(
        'Reward not found'
      );
    });

    it('should throw error when reward is inactive', async () => {
      // Arrange
      const inactiveReward = { ...mockReward, isActive: false };
      vi.mocked(loyaltyRepository.getRewardById).mockResolvedValue(inactiveReward);

      // Act & Assert
      await expect(loyaltyService.redeemReward(mockUserId, mockReward.id, mockOrderId)).rejects.toThrow(
        'Reward is no longer active'
      );
    });

    it('should throw error when user has insufficient points', async () => {
      // Arrange
      const poorAccount: LoyaltyAccount = { ...mockAccount, availablePoints: 100 };
      vi.mocked(loyaltyRepository.getRewardById).mockResolvedValue(mockReward);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(poorAccount);

      // Act & Assert
      await expect(loyaltyService.redeemReward(mockUserId, mockReward.id, mockOrderId)).rejects.toThrow(
        /Insufficient points/
      );
    });

    it('should not decrease lifetime points when redeeming', async () => {
      // Arrange
      vi.mocked(loyaltyRepository.getRewardById).mockResolvedValue(mockReward);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as LoyaltyTransaction);
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...mockAccount,
        totalPoints: 500,
        availablePoints: 300,
        lifetimePoints: 1500, // Unchanged
      });

      // Act
      await loyaltyService.redeemReward(mockUserId, mockReward.id, mockOrderId);

      // Assert
      expect(loyaltyRepository.updatePoints).toHaveBeenCalledWith(
        mockUserId,
        500, // totalPoints decreased
        300, // availablePoints decreased
        1500, // lifetimePoints UNCHANGED
        mockAccount.tier
      );
    });
  });

  describe('getAffordableRewards', () => {
    it('should return only rewards user can afford', async () => {
      // Arrange
      const allRewards: LoyaltyReward[] = [
        { ...mockReward, id: 'reward-1', pointsCost: 500 },
        { ...mockReward, id: 'reward-2', pointsCost: 800 },
        { ...mockReward, id: 'reward-3', pointsCost: 1000 }, // Too expensive
      ];
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount); // 800 available points
      vi.mocked(loyaltyRepository.getActiveRewards).mockResolvedValue(allRewards);

      // Act
      const result = await loyaltyService.getAffordableRewards(mockUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['reward-1', 'reward-2']);
    });
  });

  describe('calculateTier', () => {
    it('should return BRONZE for points below 1000', () => {
      // Act
      const result = (loyaltyService as any).calculateTier(500);

      // Assert
      expect(result).toBe('BRONZE');
    });

    it('should return SILVER for points 1000-4999', () => {
      // Act
      const result1 = (loyaltyService as any).calculateTier(1000);
      const result2 = (loyaltyService as any).calculateTier(4999);

      // Assert
      expect(result1).toBe('SILVER');
      expect(result2).toBe('SILVER');
    });

    it('should return GOLD for points 5000-14999', () => {
      // Act
      const result1 = (loyaltyService as any).calculateTier(5000);
      const result2 = (loyaltyService as any).calculateTier(14999);

      // Assert
      expect(result1).toBe('GOLD');
      expect(result2).toBe('GOLD');
    });

    it('should return PLATINUM for points 15000+', () => {
      // Act
      const result1 = (loyaltyService as any).calculateTier(15000);
      const result2 = (loyaltyService as any).calculateTier(50000);

      // Assert
      expect(result1).toBe('PLATINUM');
      expect(result2).toBe('PLATINUM');
    });
  });

  describe('getPointsForNextTier', () => {
    it('should calculate points needed for BRONZE to SILVER', () => {
      // Act
      const result = loyaltyService.getPointsForNextTier(500, 'BRONZE' as LoyaltyTier);

      // Assert
      expect(result).toBe(500); // 1000 - 500
    });

    it('should calculate points needed for SILVER to GOLD', () => {
      // Act
      const result = loyaltyService.getPointsForNextTier(2000, 'SILVER' as LoyaltyTier);

      // Assert
      expect(result).toBe(3000); // 5000 - 2000
    });

    it('should calculate points needed for GOLD to PLATINUM', () => {
      // Act
      const result = loyaltyService.getPointsForNextTier(10000, 'GOLD' as LoyaltyTier);

      // Assert
      expect(result).toBe(5000); // 15000 - 10000
    });

    it('should return null for PLATINUM tier (already at max)', () => {
      // Act
      const result = loyaltyService.getPointsForNextTier(20000, 'PLATINUM' as LoyaltyTier);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('calculateDiscountAmount', () => {
    it('should calculate discount from percentage', () => {
      // Arrange
      const reward: LoyaltyReward = {
        ...mockReward,
        discountPercentage: 10,
        discountAmount: null,
      };
      const orderAmount = 500;

      // Act
      const result = loyaltyService.calculateDiscountAmount(reward, orderAmount);

      // Assert
      expect(result).toBe(50); // 10% of 500
    });

    it('should calculate discount from fixed amount', () => {
      // Arrange
      const reward: LoyaltyReward = {
        ...mockReward,
        discountPercentage: null,
        discountAmount: 100,
      };
      const orderAmount = 500;

      // Act
      const result = loyaltyService.calculateDiscountAmount(reward, orderAmount);

      // Assert
      expect(result).toBe(100);
    });

    it('should cap discount at order amount', () => {
      // Arrange
      const reward: LoyaltyReward = {
        ...mockReward,
        discountPercentage: null,
        discountAmount: 600, // More than order amount
      };
      const orderAmount = 500;

      // Act
      const result = loyaltyService.calculateDiscountAmount(reward, orderAmount);

      // Assert
      expect(result).toBe(500); // Capped at order amount
    });

    it('should return 0 when no discount configured', () => {
      // Arrange
      const reward: LoyaltyReward = {
        ...mockReward,
        discountPercentage: null,
        discountAmount: null,
      };
      const orderAmount = 500;

      // Act
      const result = loyaltyService.calculateDiscountAmount(reward, orderAmount);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getAccount', () => {
    it('should get or create account for user', async () => {
      // Arrange
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(mockAccount);

      // Act
      const result = await loyaltyService.getAccount(mockUserId);

      // Assert
      expect(result).toEqual(mockAccount);
      expect(loyaltyRepository.getOrCreateAccount).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getTransactionHistory', () => {
    it('should fetch transaction history with default limit', async () => {
      // Arrange
      const mockTransactions: LoyaltyTransaction[] = [];
      vi.mocked(loyaltyRepository.getTransactionHistory).mockResolvedValue(mockTransactions);

      // Act
      await loyaltyService.getTransactionHistory(mockUserId);

      // Assert
      expect(loyaltyRepository.getTransactionHistory).toHaveBeenCalledWith(mockUserId, 50);
    });

    it('should fetch transaction history with custom limit', async () => {
      // Arrange
      const mockTransactions: LoyaltyTransaction[] = [];
      vi.mocked(loyaltyRepository.getTransactionHistory).mockResolvedValue(mockTransactions);

      // Act
      await loyaltyService.getTransactionHistory(mockUserId, 100);

      // Assert
      expect(loyaltyRepository.getTransactionHistory).toHaveBeenCalledWith(mockUserId, 100);
    });
  });
});
