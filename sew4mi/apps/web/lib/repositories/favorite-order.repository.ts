/**
 * Repository for Story 4.3: Favorite Orders Data Access Layer
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { FavoriteOrder } from '@sew4mi/shared/types';

export class FavoriteOrderRepository {
  /**
   * Get all favorite orders for a user
   */
  async getUserFavorites(userId: string): Promise<FavoriteOrder[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('favorite_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user favorites: ${error.message}`);
    }

    return (data || []).map(this.mapDatabaseToModel);
  }

  /**
   * Get a single favorite order by ID
   */
  async getFavoriteById(favoriteId: string, userId: string): Promise<FavoriteOrder | null> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('favorite_orders')
      .select('*')
      .eq('id', favoriteId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch favorite: ${error.message}`);
    }

    return this.mapDatabaseToModel(data);
  }

  /**
   * Check if an order is already favorited by user
   */
  async isOrderFavorited(orderId: string, userId: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('favorite_orders')
      .select('id')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check favorite status: ${error.message}`);
    }

    return data !== null;
  }

  /**
   * Add an order to favorites
   */
  async createFavorite(
    userId: string,
    orderId: string,
    nickname: string
  ): Promise<FavoriteOrder> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('favorite_orders')
      .insert({
        user_id: userId,
        order_id: orderId,
        nickname,
        shared_with_profiles: [],
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Order is already in favorites');
      }
      throw new Error(`Failed to create favorite: ${error.message}`);
    }

    return this.mapDatabaseToModel(data);
  }

  /**
   * Update favorite nickname
   */
  async updateNickname(
    favoriteId: string,
    userId: string,
    nickname: string
  ): Promise<FavoriteOrder> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('favorite_orders')
      .update({ nickname })
      .eq('id', favoriteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update favorite nickname: ${error.message}`);
    }

    return this.mapDatabaseToModel(data);
  }

  /**
   * Share favorite with family measurement profiles
   */
  async shareFavorite(
    favoriteId: string,
    userId: string,
    profileIds: string[]
  ): Promise<FavoriteOrder> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('favorite_orders')
      .update({ shared_with_profiles: profileIds })
      .eq('id', favoriteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to share favorite: ${error.message}`);
    }

    return this.mapDatabaseToModel(data);
  }

  /**
   * Remove an order from favorites
   */
  async deleteFavorite(favoriteId: string, userId: string): Promise<void> {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('favorite_orders')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete favorite: ${error.message}`);
    }
  }

  /**
   * Get favorites count for a user
   */
  async getFavoritesCount(userId: string): Promise<number> {
    const supabase = await createServerSupabaseClient();

    const { count, error } = await supabase
      .from('favorite_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to count favorites: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Map database row to FavoriteOrder model
   */
  private mapDatabaseToModel(row: any): FavoriteOrder {
    return {
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id,
      nickname: row.nickname,
      sharedWithProfiles: row.shared_with_profiles || [],
      createdAt: new Date(row.created_at),
    };
  }
}

export const favoriteOrderRepository = new FavoriteOrderRepository();
