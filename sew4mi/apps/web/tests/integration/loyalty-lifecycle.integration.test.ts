/**
 * Integration test for loyalty points lifecycle
 * Tests the end-to-end loyalty workflow including:
 * - Points earning from orders
 * - Tier progression
 * - Milestone bonuses
 * - Points redemption
 * - Reward application
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { loyaltyService } from '@/lib/services/loyalty.service';
import { loyaltyRepository } from '@/lib/repositories/loyalty.repository';
import type { LoyaltyAccount, LoyaltyReward, LoyaltyTier } from '@sew4mi/shared/types';

// Mock repository
vi.mock('@/lib/repositories/loyalty.repository');

describe('Loyalty Lifecycle Integration Tests', () => {
  const mockUserId = 'user-loyalty-123';
  const mockTailorId = 'tailor-loyalty-456';

  let currentAccount: LoyaltyAccount;

  beforeAll(() => {
    // Initialize with Bronze tier account
    currentAccount = {
      id: 'account-1',
      userId: mockUserId,
      totalPoints: 0,
      availablePoints: 0,
      lifetimePoints: 0,
      tier: 'BRONZE' as LoyaltyTier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Loyalty Journey', () => {
    it('should earn points from first order (Bronze tier)', async () => {
      // Arrange
      const orderAmount = 500; // GHS
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as any);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(1); // First order
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...currentAccount,
        totalPoints: 500,
        availablePoints: 500,
        lifetimePoints: 500,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(
        mockUserId,
        'order-1',
        orderAmount,
        mockTailorId,
        false
      );

      // Assert
      expect(result.totalPoints).toBe(500); // 1 point per GHS
      expect(result.availablePoints).toBe(500);
      expect(result.lifetimePoints).toBe(500);
      expect(result.tier).toBe('BRONZE');
    });

    it('should apply repeat tailor bonus on second order', async () => {
      // Arrange
      const orderAmount = 300;
      currentAccount = {
        ...currentAccount,
        totalPoints: 500,
        availablePoints: 500,
        lifetimePoints: 500,
      };

      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(true); // Recent order with same tailor
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as any);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(2);
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...currentAccount,
        totalPoints: 830, // 500 + 300 base + 30 repeat bonus (10%)
        availablePoints: 830,
        lifetimePoints: 830,
      });

      // Act
      const earning = await loyaltyService.calculatePointsForOrder(
        mockUserId,
        orderAmount,
        mockTailorId,
        false
      );

      // Assert
      expect(earning.basePoints).toBe(300);
      expect(earning.bonusPoints).toBe(30); // 10% repeat tailor bonus
      expect(earning.totalPoints).toBe(330);
      expect(earning.reason).toContain('Repeat tailor bonus');
    });

    it('should upgrade to SILVER tier at 1000 lifetime points', async () => {
      // Arrange
      const orderAmount = 200;
      currentAccount = {
        ...currentAccount,
        totalPoints: 830,
        availablePoints: 830,
        lifetimePoints: 830,
        tier: 'BRONZE' as LoyaltyTier,
      };

      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as any);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(3);
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...currentAccount,
        totalPoints: 1030,
        availablePoints: 1030,
        lifetimePoints: 1030,
        tier: 'SILVER' as LoyaltyTier,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(
        mockUserId,
        'order-3',
        orderAmount,
        mockTailorId,
        false
      );

      // Assert
      expect(result.lifetimePoints).toBeGreaterThanOrEqual(1000);
      expect(result.tier).toBe('SILVER');
      expect(loyaltyRepository.updatePoints).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        'SILVER'
      );
    });

    it('should apply SILVER tier bonus (5%) on subsequent orders', async () => {
      // Arrange
      const orderAmount = 1000;
      currentAccount = {
        ...currentAccount,
        totalPoints: 1030,
        availablePoints: 1030,
        lifetimePoints: 1030,
        tier: 'SILVER' as LoyaltyTier,
      };

      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);

      // Act
      const earning = await loyaltyService.calculatePointsForOrder(
        mockUserId,
        orderAmount,
        mockTailorId,
        false
      );

      // Assert
      expect(earning.basePoints).toBe(1000);
      expect(earning.bonusPoints).toBe(50); // 5% tier bonus
      expect(earning.totalPoints).toBe(1050);
      expect(earning.reason).toContain('SILVER tier bonus');
    });

    it('should award milestone bonus on 5th order', async () => {
      // Arrange
      const orderAmount = 500;
      currentAccount = {
        ...currentAccount,
        totalPoints: 2080,
        availablePoints: 2080,
        lifetimePoints: 2080,
        tier: 'SILVER' as LoyaltyTier,
      };

      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as any);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(5); // 5th order
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...currentAccount,
        totalPoints: 3105, // 2080 + 525 (order) + 500 (milestone)
        availablePoints: 3105,
        lifetimePoints: 3105,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(
        mockUserId,
        'order-5',
        orderAmount,
        mockTailorId,
        false
      );

      // Assert
      expect(loyaltyRepository.createTransaction).toHaveBeenCalledWith(
        mockUserId,
        'BONUS',
        500,
        expect.stringContaining('Milestone bonus for 5 completed orders'),
        'order-5'
      );
      expect(result.totalPoints).toBe(3105);
    });

    it('should apply group order bonus', async () => {
      // Arrange
      const orderAmount = 800;
      currentAccount = {
        ...currentAccount,
        totalPoints: 3105,
        availablePoints: 3105,
        lifetimePoints: 3105,
        tier: 'SILVER' as LoyaltyTier,
      };

      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);

      // Act
      const earning = await loyaltyService.calculatePointsForOrder(
        mockUserId,
        orderAmount,
        mockTailorId,
        true // Group order
      );

      // Assert
      expect(earning.basePoints).toBe(800);
      // Group bonus: 5% of 800 = 40
      // Tier bonus: 5% of (800 + 40) = 42
      expect(earning.bonusPoints).toBe(82);
      expect(earning.reason).toContain('Group order bonus');
      expect(earning.reason).toContain('SILVER tier bonus');
    });

    it('should upgrade to GOLD tier at 5000 lifetime points', async () => {
      // Arrange
      const orderAmount = 2000;
      currentAccount = {
        ...currentAccount,
        totalPoints: 3987,
        availablePoints: 3987,
        lifetimePoints: 4200,
        tier: 'SILVER' as LoyaltyTier,
      };

      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as any);
      vi.mocked(loyaltyRepository.getUserOrderCount).mockResolvedValue(7);
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...currentAccount,
        totalPoints: 6087,
        availablePoints: 6087,
        lifetimePoints: 6300,
        tier: 'GOLD' as LoyaltyTier,
      });

      // Act
      const result = await loyaltyService.awardPointsForOrder(
        mockUserId,
        'order-7',
        orderAmount,
        mockTailorId,
        false
      );

      // Assert
      expect(result.lifetimePoints).toBeGreaterThanOrEqual(5000);
      expect(result.tier).toBe('GOLD');
    });
  });

  describe('Points Redemption Workflow', () => {
    it('should successfully redeem 500 points for 10% discount', async () => {
      // Arrange
      currentAccount = {
        ...currentAccount,
        totalPoints: 6087,
        availablePoints: 6087,
        lifetimePoints: 6300,
        tier: 'GOLD' as LoyaltyTier,
      };

      const mockReward: LoyaltyReward = {
        id: 'reward-10-percent',
        name: '10% Discount',
        description: 'Get 10% off your next order',
        pointsCost: 500,
        discountPercentage: 10,
        discountAmount: null,
        rewardType: 'DISCOUNT',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(loyaltyRepository.getRewardById).mockResolvedValue(mockReward);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(currentAccount);
      vi.mocked(loyaltyRepository.createTransaction).mockResolvedValue({} as any);
      vi.mocked(loyaltyRepository.updatePoints).mockResolvedValue({
        ...currentAccount,
        totalPoints: 5587, // 6087 - 500
        availablePoints: 5587,
        lifetimePoints: 6300, // Unchanged
      });

      // Act
      const result = await loyaltyService.redeemReward(mockUserId, mockReward.id);

      // Assert
      expect(result.account.availablePoints).toBe(5587);
      expect(result.account.lifetimePoints).toBe(6300); // Lifetime points never decrease
      expect(result.reward).toEqual(mockReward);
      expect(loyaltyRepository.createTransaction).toHaveBeenCalledWith(
        mockUserId,
        'REDEEM',
        -500,
        expect.stringContaining('Redeemed reward'),
        undefined
      );
    });

    it('should prevent redemption with insufficient points', async () => {
      // Arrange
      const poorAccount: LoyaltyAccount = {
        ...currentAccount,
        totalPoints: 200,
        availablePoints: 200,
        lifetimePoints: 6300,
      };

      const expensiveReward: LoyaltyReward = {
        id: 'reward-expensive',
        name: '20% Discount',
        description: 'Get 20% off',
        pointsCost: 1000,
        discountPercentage: 20,
        discountAmount: null,
        rewardType: 'DISCOUNT',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(loyaltyRepository.getRewardById).mockResolvedValue(expensiveReward);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(poorAccount);

      // Act & Assert
      await expect(
        loyaltyService.redeemReward(mockUserId, expensiveReward.id)
      ).rejects.toThrow(/Insufficient points/);
    });

    it('should calculate discount amount for percentage reward', () => {
      // Arrange
      const reward: LoyaltyReward = {
        id: 'reward-1',
        name: '15% Discount',
        description: '',
        pointsCost: 750,
        discountPercentage: 15,
        discountAmount: null,
        rewardType: 'DISCOUNT',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const orderAmount = 600;

      // Act
      const discount = loyaltyService.calculateDiscountAmount(reward, orderAmount);

      // Assert
      expect(discount).toBe(90); // 15% of 600
    });

    it('should calculate discount amount for fixed reward', () => {
      // Arrange
      const reward: LoyaltyReward = {
        id: 'reward-1',
        name: 'GHS 50 Off',
        description: '',
        pointsCost: 500,
        discountPercentage: null,
        discountAmount: 50,
        rewardType: 'DISCOUNT',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const orderAmount = 600;

      // Act
      const discount = loyaltyService.calculateDiscountAmount(reward, orderAmount);

      // Assert
      expect(discount).toBe(50);
    });
  });

  describe('Tier Progression', () => {
    it('should calculate points needed for next tier', () => {
      // Bronze to Silver (needs 1000 total)
      expect(loyaltyService.getPointsForNextTier(500, 'BRONZE' as LoyaltyTier)).toBe(500);

      // Silver to Gold (needs 5000 total)
      expect(loyaltyService.getPointsForNextTier(2000, 'SILVER' as LoyaltyTier)).toBe(3000);

      // Gold to Platinum (needs 15000 total)
      expect(loyaltyService.getPointsForNextTier(10000, 'GOLD' as LoyaltyTier)).toBe(5000);

      // Platinum (max tier)
      expect(loyaltyService.getPointsForNextTier(20000, 'PLATINUM' as LoyaltyTier)).toBeNull();
    });

    it('should maintain tier bonus as user progresses', async () => {
      // Bronze: no bonus
      const bronzeAccount: LoyaltyAccount = {
        ...currentAccount,
        tier: 'BRONZE' as LoyaltyTier,
        lifetimePoints: 500,
      };
      vi.mocked(loyaltyRepository.hasRecentOrderWithTailor).mockResolvedValue(false);
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(bronzeAccount);
      const bronzeEarning = await loyaltyService.calculatePointsForOrder(mockUserId, 100, mockTailorId, false);
      expect(bronzeEarning.totalPoints).toBe(100); // No bonus

      // Silver: 5% bonus
      const silverAccount: LoyaltyAccount = {
        ...currentAccount,
        tier: 'SILVER' as LoyaltyTier,
        lifetimePoints: 2000,
      };
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(silverAccount);
      const silverEarning = await loyaltyService.calculatePointsForOrder(mockUserId, 100, mockTailorId, false);
      expect(silverEarning.totalPoints).toBe(105); // 5% bonus

      // Gold: 10% bonus
      const goldAccount: LoyaltyAccount = {
        ...currentAccount,
        tier: 'GOLD' as LoyaltyTier,
        lifetimePoints: 7000,
      };
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(goldAccount);
      const goldEarning = await loyaltyService.calculatePointsForOrder(mockUserId, 100, mockTailorId, false);
      expect(goldEarning.totalPoints).toBe(110); // 10% bonus

      // Platinum: 15% bonus
      const platinumAccount: LoyaltyAccount = {
        ...currentAccount,
        tier: 'PLATINUM' as LoyaltyTier,
        lifetimePoints: 18000,
      };
      vi.mocked(loyaltyRepository.getOrCreateAccount).mockResolvedValue(platinumAccount);
      const platinumEarning = await loyaltyService.calculatePointsForOrder(mockUserId, 100, mockTailorId, false);
      expect(platinumEarning.totalPoints).toBe(115); // 15% bonus
    });
  });
});
