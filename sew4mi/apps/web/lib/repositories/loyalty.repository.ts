/**
 * Repository for Story 4.3: Loyalty System Data Access Layer
 */

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyReward,
  LoyaltyTier,
  LoyaltyTransactionType,
} from '@sew4mi/shared/types';

export class LoyaltyRepository {
  /**
   * Get or create loyalty account for user
   */
  async getOrCreateAccount(userId: string): Promise<LoyaltyAccount> {
    const supabase = await createServerSupabaseClient();

    // Try to get existing account (with retries for new users)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: existing, error: fetchError } = await supabase
        .from('loyalty_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch loyalty account: ${fetchError.message}`);
      }

      if (existing) {
        return this.mapAccountDatabaseToModel(existing);
      }

      // If this is not the first attempt, wait a bit for the trigger to complete
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }

      // First attempt: try to create new account if it doesn't exist
      const { data, error } = await supabase
        .from('loyalty_accounts')
        .insert({
          user_id: userId,
          total_points: 0,
          available_points: 0,
          lifetime_points: 0,
          tier: 'BRONZE',
        })
        .select()
        .single();

      if (error) {
        // If foreign key constraint error, the user doesn't exist yet - wait and retry
        if (error.code === '23503') {
          console.log('User profile not ready yet, waiting...');
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }
        
        // If duplicate key error, the trigger already created it - try to fetch again
        if (error.code === '23505') {
          console.log('Loyalty account already exists (created by trigger), fetching...');
          continue;
        }
        
        throw new Error(`Failed to create loyalty account: ${error.message}`);
      }

      return this.mapAccountDatabaseToModel(data);
    }

    // Final attempt to fetch after retries
    const { data: finalCheck, error: finalError } = await supabase
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (finalError) {
      throw new Error(`Failed to fetch loyalty account after retries: ${finalError.message}`);
    }

    if (!finalCheck) {
      throw new Error('Loyalty account could not be created or found after multiple attempts');
    }

    return this.mapAccountDatabaseToModel(finalCheck);
  }

  /**
   * Update loyalty account points
   */
  async updatePoints(
    userId: string,
    totalPoints: number,
    availablePoints: number,
    lifetimePoints: number,
    tier: LoyaltyTier
  ): Promise<LoyaltyAccount> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('loyalty_accounts')
      .update({
        total_points: totalPoints,
        available_points: availablePoints,
        lifetime_points: lifetimePoints,
        tier,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update loyalty points: ${error.message}`);
    }

    return this.mapAccountDatabaseToModel(data);
  }

  /**
   * Create a loyalty transaction
   */
  async createTransaction(
    userId: string,
    type: LoyaltyTransactionType,
    points: number,
    description: string,
    orderId?: string
  ): Promise<LoyaltyTransaction> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: userId,
        order_id: orderId,
        type,
        points,
        description,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    return this.mapTransactionDatabaseToModel(data);
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<LoyaltyTransaction[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }

    return (data || []).map(this.mapTransactionDatabaseToModel);
  }

  /**
   * Get recent transactions for a user
   */
  async getRecentTransactions(userId: string, limit: number = 10): Promise<LoyaltyTransaction[]> {
    return this.getTransactionHistory(userId, limit);
  }

  /**
   * Get all active rewards
   */
  async getActiveRewards(): Promise<LoyaltyReward[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error} = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active rewards: ${error.message}`);
    }

    return (data || []).map(this.mapRewardDatabaseToModel);
  }

  /**
   * Get a specific reward by ID
   */
  async getRewardById(rewardId: string): Promise<LoyaltyReward | null> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch reward: ${error.message}`);
    }

    return data ? this.mapRewardDatabaseToModel(data) : null;
  }

  /**
   * Get total orders count for milestone calculation
   */
  async getUserOrderCount(userId: string): Promise<number> {
    const supabase = await createServerSupabaseClient();

    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .eq('status', 'COMPLETED');

    if (error) {
      throw new Error(`Failed to count user orders: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Check if user has repeat order with same tailor within days
   */
  async hasRecentOrderWithTailor(
    userId: string,
    tailorId: string,
    withinDays: number
  ): Promise<boolean> {
    const supabase = await createServerSupabaseClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - withinDays);

    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', userId)
      .eq('tailor_id', tailorId)
      .gte('created_at', cutoffDate.toISOString())
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check repeat tailor orders: ${error.message}`);
    }

    return data !== null;
  }

  /**
   * Map database row to LoyaltyAccount model
   */
  private mapAccountDatabaseToModel(row: any): LoyaltyAccount {
    return {
      id: row.id,
      userId: row.user_id,
      totalPoints: row.total_points,
      availablePoints: row.available_points,
      lifetimePoints: row.lifetime_points,
      tier: row.tier as LoyaltyTier,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to LoyaltyTransaction model
   */
  private mapTransactionDatabaseToModel(row: any): LoyaltyTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id,
      type: row.type as LoyaltyTransactionType,
      points: row.points,
      description: row.description,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map database row to LoyaltyReward model
   */
  private mapRewardDatabaseToModel(row: any): LoyaltyReward {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      pointsCost: row.points_cost,
      discountPercentage: row.discount_percentage,
      discountAmount: row.discount_amount,
      rewardType: row.reward_type,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    };
  }
}

export const loyaltyRepository = new LoyaltyRepository();
