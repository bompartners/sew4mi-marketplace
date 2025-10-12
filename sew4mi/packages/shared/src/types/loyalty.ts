/**
 * Types for Story 4.3: Reorder and Favorites - Loyalty System
 */

/**
 * Loyalty program tier levels
 */
export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

/**
 * Type of loyalty transaction
 */
export enum LoyaltyTransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  EXPIRE = 'EXPIRE',
  BONUS = 'BONUS',
}

/**
 * Type of loyalty reward
 */
export enum RewardType {
  DISCOUNT = 'DISCOUNT',
  PRIORITY = 'PRIORITY',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

/**
 * User's loyalty account
 */
export interface LoyaltyAccount {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Loyalty points transaction
 */
export interface LoyaltyTransaction {
  id: string;
  userId: string;
  orderId?: string;
  type: LoyaltyTransactionType;
  points: number;
  description: string;
  createdAt: Date;
}

/**
 * Loyalty reward from catalog
 */
export interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  discountPercentage: number | null;
  discountAmount: number | null;
  rewardType: RewardType;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Points earning calculation result
 */
export interface PointsEarning {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  reason: string;
}

/**
 * Tier benefits description
 */
export interface TierBenefits {
  tier: LoyaltyTier;
  pointsRequired: number;
  bonusPercentage: number;
  benefits: string[];
}

/**
 * Loyalty tier progression constants
 */
export const LOYALTY_TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  [LoyaltyTier.BRONZE]: 0,
  [LoyaltyTier.SILVER]: 1000,
  [LoyaltyTier.GOLD]: 5000,
  [LoyaltyTier.PLATINUM]: 15000,
};

/**
 * Loyalty tier bonus percentages
 */
export const LOYALTY_TIER_BONUSES: Record<LoyaltyTier, number> = {
  [LoyaltyTier.BRONZE]: 0,
  [LoyaltyTier.SILVER]: 5,
  [LoyaltyTier.GOLD]: 10,
  [LoyaltyTier.PLATINUM]: 15,
};

/**
 * Milestone bonus points
 */
export const MILESTONE_BONUSES: Record<number, number> = {
  5: 500,
  10: 1000,
  20: 2500,
};

/**
 * Points per GHS spent
 */
export const POINTS_PER_GHS = 1;

/**
 * Repeat tailor bonus percentage
 */
export const REPEAT_TAILOR_BONUS_PERCENTAGE = 10;

/**
 * Group order bonus percentage
 */
export const GROUP_ORDER_BONUS_PERCENTAGE = 5;

/**
 * Referral bonus points
 */
export const REFERRAL_BONUS_POINTS = 250;

/**
 * Points expiry period in months
 */
export const POINTS_EXPIRY_MONTHS = 12;

/**
 * Points expiry warning period in days
 */
export const POINTS_EXPIRY_WARNING_DAYS = 30;
