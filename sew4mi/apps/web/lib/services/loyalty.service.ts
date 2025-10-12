/**
 * Service for Story 4.3: Loyalty System Business Logic
 * Includes WhatsApp notifications for loyalty milestones
 */

import { loyaltyRepository } from '@/lib/repositories/loyalty.repository';
import { twilioService } from '@/lib/services/twilio.service';
import { MessageChannel } from '@/lib/services/twilio.service';
import type {
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyReward,
  LoyaltyTier,
  LoyaltyTransactionType,
  PointsEarning,
  LOYALTY_TIER_THRESHOLDS,
  LOYALTY_TIER_BONUSES,
  MILESTONE_BONUSES,
  POINTS_PER_GHS,
  REPEAT_TAILOR_BONUS_PERCENTAGE,
  GROUP_ORDER_BONUS_PERCENTAGE,
} from '@sew4mi/shared/types';
import {
  LOYALTY_TIER_THRESHOLDS as TIER_THRESHOLDS,
  LOYALTY_TIER_BONUSES as TIER_BONUSES,
  MILESTONE_BONUSES as MILESTONES,
  POINTS_PER_GHS as PTS_PER_GHS,
  REPEAT_TAILOR_BONUS_PERCENTAGE as REPEAT_BONUS,
  GROUP_ORDER_BONUS_PERCENTAGE as GROUP_BONUS,
} from '@sew4mi/shared/types';

export class LoyaltyService {
  /**
   * Calculate points earned from an order
   */
  async calculatePointsForOrder(
    userId: string,
    orderAmount: number,
    tailorId: string,
    isGroupOrder: boolean = false
  ): Promise<PointsEarning> {
    // Base points: 1 point per GHS
    let basePoints = Math.floor(orderAmount * PTS_PER_GHS);
    let bonusPoints = 0;
    const reasons: string[] = [];

    // Check for repeat tailor bonus (10% bonus if ordered from same tailor within 30 days)
    const hasRecentOrder = await loyaltyRepository.hasRecentOrderWithTailor(userId, tailorId, 30);
    if (hasRecentOrder) {
      const repeatBonus = Math.floor(basePoints * (REPEAT_BONUS / 100));
      bonusPoints += repeatBonus;
      reasons.push(`Repeat tailor bonus (+${REPEAT_BONUS}%)`);
    }

    // Group order bonus (5% bonus)
    if (isGroupOrder) {
      const groupBonus = Math.floor(basePoints * (GROUP_BONUS / 100));
      bonusPoints += groupBonus;
      reasons.push(`Group order bonus (+${GROUP_BONUS}%)`);
    }

    // Get user's loyalty account for tier bonus
    const account = await loyaltyRepository.getOrCreateAccount(userId);
    const tierBonus = TIER_BONUSES[account.tier];
    if (tierBonus > 0) {
      const tierBonusPoints = Math.floor((basePoints + bonusPoints) * (tierBonus / 100));
      bonusPoints += tierBonusPoints;
      reasons.push(`${account.tier} tier bonus (+${tierBonus}%)`);
    }

    const totalPoints = basePoints + bonusPoints;
    const reason = reasons.length > 0 ? reasons.join(', ') : 'Base points';

    return {
      basePoints,
      bonusPoints,
      totalPoints,
      reason,
    };
  }

  /**
   * Award points for a completed order
   */
  async awardPointsForOrder(
    userId: string,
    orderId: string,
    orderAmount: number,
    tailorId: string,
    isGroupOrder: boolean = false
  ): Promise<LoyaltyAccount> {
    // Calculate points
    const earning = await this.calculatePointsForOrder(userId, orderAmount, tailorId, isGroupOrder);

    // Get current account
    const account = await loyaltyRepository.getOrCreateAccount(userId);

    // Create transaction
    await loyaltyRepository.createTransaction(
      userId,
      'EARN' as LoyaltyTransactionType,
      earning.totalPoints,
      `Earned ${earning.totalPoints} points from order. ${earning.reason}`,
      orderId
    );

    // Update points
    const newTotalPoints = account.totalPoints + earning.totalPoints;
    const newAvailablePoints = account.availablePoints + earning.totalPoints;
    const newLifetimePoints = account.lifetimePoints + earning.totalPoints;

    // Check for tier upgrade
    const newTier = this.calculateTier(newLifetimePoints);

    // Check for milestone bonus
    const orderCount = await loyaltyRepository.getUserOrderCount(userId);
    const milestoneBonus = MILESTONES[orderCount] || 0;

    if (milestoneBonus > 0) {
      // Award milestone bonus
      await loyaltyRepository.createTransaction(
        userId,
        'BONUS' as LoyaltyTransactionType,
        milestoneBonus,
        `Milestone bonus for ${orderCount} completed orders`,
        orderId
      );

      return loyaltyRepository.updatePoints(
        userId,
        newTotalPoints + milestoneBonus,
        newAvailablePoints + milestoneBonus,
        newLifetimePoints + milestoneBonus,
        newTier
      );
    }

    return loyaltyRepository.updatePoints(
      userId,
      newTotalPoints,
      newAvailablePoints,
      newLifetimePoints,
      newTier
    );
  }

  /**
   * Redeem points for a reward
   */
  async redeemReward(
    userId: string,
    rewardId: string,
    orderId?: string
  ): Promise<{ account: LoyaltyAccount; reward: LoyaltyReward }> {
    // Get reward
    const reward = await loyaltyRepository.getRewardById(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (!reward.isActive) {
      throw new Error('Reward is no longer active');
    }

    // Get account
    const account = await loyaltyRepository.getOrCreateAccount(userId);

    // Check if user has enough points
    if (account.availablePoints < reward.pointsCost) {
      throw new Error(
        `Insufficient points. You have ${account.availablePoints} points, but need ${reward.pointsCost} points`
      );
    }

    // Create redemption transaction
    await loyaltyRepository.createTransaction(
      userId,
      'REDEEM' as LoyaltyTransactionType,
      -reward.pointsCost,
      `Redeemed reward: ${reward.name}`,
      orderId
    );

    // Update points
    const updatedAccount = await loyaltyRepository.updatePoints(
      userId,
      account.totalPoints - reward.pointsCost,
      account.availablePoints - reward.pointsCost,
      account.lifetimePoints, // Lifetime points don't decrease
      account.tier
    );

    return { account: updatedAccount, reward };
  }

  /**
   * Get loyalty account for user
   */
  async getAccount(userId: string): Promise<LoyaltyAccount> {
    return loyaltyRepository.getOrCreateAccount(userId);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<LoyaltyTransaction[]> {
    return loyaltyRepository.getTransactionHistory(userId, limit);
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(userId: string, limit: number = 10): Promise<LoyaltyTransaction[]> {
    return loyaltyRepository.getRecentTransactions(userId, limit);
  }

  /**
   * Get all active rewards
   */
  async getActiveRewards(): Promise<LoyaltyReward[]> {
    return loyaltyRepository.getActiveRewards();
  }

  /**
   * Get rewards user can afford
   */
  async getAffordableRewards(userId: string): Promise<LoyaltyReward[]> {
    const account = await this.getAccount(userId);
    const allRewards = await this.getActiveRewards();
    return allRewards.filter(reward => reward.pointsCost <= account.availablePoints);
  }

  /**
   * Calculate tier from lifetime points
   */
  private calculateTier(lifetimePoints: number): LoyaltyTier {
    if (lifetimePoints >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM' as LoyaltyTier;
    if (lifetimePoints >= TIER_THRESHOLDS.GOLD) return 'GOLD' as LoyaltyTier;
    if (lifetimePoints >= TIER_THRESHOLDS.SILVER) return 'SILVER' as LoyaltyTier;
    return 'BRONZE' as LoyaltyTier;
  }

  /**
   * Get points needed for next tier
   */
  getPointsForNextTier(currentPoints: number, currentTier: LoyaltyTier): number | null {
    const tiers: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const currentIndex = tiers.indexOf(currentTier);

    if (currentIndex === tiers.length - 1) {
      return null; // Already at highest tier
    }

    const nextTier = tiers[currentIndex + 1];
    return TIER_THRESHOLDS[nextTier] - currentPoints;
  }

  /**
   * Calculate discount amount from reward
   */
  calculateDiscountAmount(reward: LoyaltyReward, orderAmount: number): number {
    if (reward.discountPercentage) {
      return Math.floor(orderAmount * (reward.discountPercentage / 100));
    }
    if (reward.discountAmount) {
      return Math.min(reward.discountAmount, orderAmount);
    }
    return 0;
  }

  /**
   * Send WhatsApp notification for points earned
   */
  private async sendPointsEarnedNotification(
    phoneNumber: string,
    points: number,
    orderNumber: string,
    totalPoints: number
  ): Promise<void> {
    try {
      const message = `🎉 You've earned ${points} loyalty points!\n\nOrder #${orderNumber}\nTotal Points: ${totalPoints}\n\nRedeem rewards at: https://sew4mi.com/loyalty`;

      await twilioService.sendWhatsApp({
        channel: MessageChannel.WHATSAPP,
        to: phoneNumber,
        body: message,
      });
    } catch (error) {
      console.error('Failed to send points earned notification:', error);
      // Don't throw - notification failure shouldn't block the transaction
    }
  }

  /**
   * Send WhatsApp notification for tier upgrade
   */
  private async sendTierUpgradeNotification(
    phoneNumber: string,
    newTier: LoyaltyTier,
    tierBonus: number
  ): Promise<void> {
    try {
      const benefits = this.getTierBenefits(newTier);
      const message = `🏆 Congratulations! You've reached ${newTier} tier!\n\nNew benefits unlocked:\n${benefits}\n\nYour orders now earn ${tierBonus}% bonus points!\n\nExplore perks: https://sew4mi.com/loyalty`;

      await twilioService.sendWhatsApp({
        channel: MessageChannel.WHATSAPP,
        to: phoneNumber,
        body: message,
      });
    } catch (error) {
      console.error('Failed to send tier upgrade notification:', error);
    }
  }

  /**
   * Send WhatsApp notification for milestone bonus
   */
  private async sendMilestoneBonusNotification(
    phoneNumber: string,
    orderCount: number,
    bonusPoints: number
  ): Promise<void> {
    try {
      const message = `🎊 Milestone Achievement!\n\nYou've completed ${orderCount} orders!\nBonus: +${bonusPoints} points\n\nThank you for your loyalty. Keep ordering to unlock more rewards!\n\nhttps://sew4mi.com/loyalty`;

      await twilioService.sendWhatsApp({
        channel: MessageChannel.WHATSAPP,
        to: phoneNumber,
        body: message,
      });
    } catch (error) {
      console.error('Failed to send milestone bonus notification:', error);
    }
  }

  /**
   * Send WhatsApp notification for reward availability
   */
  private async sendRewardAvailableNotification(
    phoneNumber: string,
    rewardName: string,
    pointsCost: number,
    availablePoints: number
  ): Promise<void> {
    try {
      const message = `💎 You can now redeem: ${rewardName}!\n\nPoints Required: ${pointsCost}\nYour Points: ${availablePoints}\n\nRedeem now: https://sew4mi.com/loyalty`;

      await twilioService.sendWhatsApp({
        channel: MessageChannel.WHATSAPP,
        to: phoneNumber,
        body: message,
      });
    } catch (error) {
      console.error('Failed to send reward available notification:', error);
    }
  }

  /**
   * Get tier benefits description
   */
  private getTierBenefits(tier: LoyaltyTier): string {
    const benefits: Record<LoyaltyTier, string> = {
      BRONZE: '- Earn 1 point per GHS\n- Access to basic rewards',
      SILVER: '- 5% bonus on all points\n- Priority customer support\n- Exclusive seasonal offers',
      GOLD: '- 10% bonus on all points\n- Priority service\n- Early access to new tailors\n- Birthday rewards',
      PLATINUM: '- 15% bonus on all points\n- VIP priority service\n- Access to exclusive tailors\n- Personal styling consultation\n- Special event invitations',
    };
    return benefits[tier];
  }

  /**
   * Send loyalty notifications (called after points are awarded)
   * Pass phone number from user profile
   */
  async sendLoyaltyNotifications(
    phoneNumber: string,
    account: LoyaltyAccount,
    earning: PointsEarning,
    orderNumber: string,
    oldTier?: LoyaltyTier,
    milestoneBonus?: { orderCount: number; points: number }
  ): Promise<void> {
    // Send points earned notification
    await this.sendPointsEarnedNotification(
      phoneNumber,
      earning.totalPoints,
      orderNumber,
      account.totalPoints
    );

    // Send tier upgrade notification if tier changed
    if (oldTier && oldTier !== account.tier) {
      const tierBonus = TIER_BONUSES[account.tier];
      await this.sendTierUpgradeNotification(phoneNumber, account.tier, tierBonus);
    }

    // Send milestone bonus notification if milestone reached
    if (milestoneBonus) {
      await this.sendMilestoneBonusNotification(
        phoneNumber,
        milestoneBonus.orderCount,
        milestoneBonus.points
      );
    }

    // Check if user can now afford any new rewards
    const affordableRewards = await this.getAffordableRewards(account.userId);
    // Notify about the most valuable newly affordable reward
    if (affordableRewards.length > 0) {
      const topReward = affordableRewards.sort((a, b) => b.pointsCost - a.pointsCost)[0];
      // Only notify if they just became able to afford it (within 100 points)
      if (account.availablePoints >= topReward.pointsCost &&
          account.availablePoints - earning.totalPoints < topReward.pointsCost) {
        await this.sendRewardAvailableNotification(
          phoneNumber,
          topReward.name,
          topReward.pointsCost,
          account.availablePoints
        );
      }
    }
  }
}

export const loyaltyService = new LoyaltyService();
