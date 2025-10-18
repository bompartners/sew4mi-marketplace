/**
 * Service for Story 4.3: Favorite Orders System Business Logic
 * Note: This is different from favorites.service.ts which handles favorite tailors
 */

import { favoriteOrderRepository } from '@/lib/repositories/favorite-order.repository';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import type { FavoriteOrder, AddToFavoritesRequest, FavoritesListResponse } from '@sew4mi/shared/types';

export class FavoriteOrdersService {
  /**
   * Maximum number of favorite orders per user
   */
  private readonly MAX_FAVORITES = 50;

  /**
   * Get all favorite orders for a user with order details
   */
  async getUserFavorites(userId: string): Promise<FavoritesListResponse> {
    const favorites = await favoriteOrderRepository.getUserFavorites(userId);

    // Fetch order details for each favorite
    const orderIds = favorites.map(f => f.orderId);
    const orders = await this.getOrdersByIds(orderIds);

    // Create map of orders keyed by ID
    const ordersMap: Record<string, any> = {};
    orders.forEach(order => {
      ordersMap[order.id] = order;
    });

    return {
      favorites,
      orders: ordersMap,
    };
  }

  /**
   * Add order to favorites
   */
  async addToFavorites(userId: string, request: AddToFavoritesRequest): Promise<FavoriteOrder> {
    const { orderId, nickname } = request;

    // Check if order exists and belongs to user
    await this.validateOrderOwnership(orderId, userId);

    // Check if already favorited
    const isAlreadyFavorited = await favoriteOrderRepository.isOrderFavorited(orderId, userId);
    if (isAlreadyFavorited) {
      throw new Error('Order is already in favorites');
    }

    // Check favorites limit
    const currentCount = await favoriteOrderRepository.getFavoritesCount(userId);
    if (currentCount >= this.MAX_FAVORITES) {
      throw new Error(`Maximum ${this.MAX_FAVORITES} favorites reached. Please remove some favorites before adding more.`);
    }

    // Create favorite
    return favoriteOrderRepository.createFavorite(userId, orderId, nickname);
  }

  /**
   * Update favorite nickname
   */
  async updateNickname(userId: string, favoriteId: string, nickname: string): Promise<FavoriteOrder> {
    // Verify ownership
    const favorite = await favoriteOrderRepository.getFavoriteById(favoriteId, userId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    return favoriteOrderRepository.updateNickname(favoriteId, userId, nickname);
  }

  /**
   * Share favorite with family members
   */
  async shareFavorite(userId: string, favoriteId: string, profileIds: string[]): Promise<FavoriteOrder> {
    // Verify ownership
    const favorite = await favoriteOrderRepository.getFavoriteById(favoriteId, userId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    // Validate profile IDs belong to user's family
    await this.validateFamilyProfiles(userId, profileIds);

    return favoriteOrderRepository.shareFavorite(favoriteId, userId, profileIds);
  }

  /**
   * Remove favorite
   */
  async removeFavorite(userId: string, favoriteId: string): Promise<void> {
    // Verify ownership
    const favorite = await favoriteOrderRepository.getFavoriteById(favoriteId, userId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    return favoriteOrderRepository.deleteFavorite(favoriteId, userId);
  }

  /**
   * Get a single favorite by ID
   */
  async getFavoriteById(userId: string, favoriteId: string): Promise<FavoriteOrder | null> {
    return favoriteOrderRepository.getFavoriteById(favoriteId, userId);
  }

  /**
   * Check if order can be favorited
   */
  async canFavoriteOrder(userId: string, orderId: string): Promise<{ canFavorite: boolean; reason?: string }> {
    // Check if order exists and belongs to user
    try {
      await this.validateOrderOwnership(orderId, userId);
    } catch (error) {
      return {
        canFavorite: false,
        reason: error instanceof Error ? error.message : 'Order validation failed',
      };
    }

    // Check if already favorited
    const isAlreadyFavorited = await favoriteOrderRepository.isOrderFavorited(orderId, userId);
    if (isAlreadyFavorited) {
      return {
        canFavorite: false,
        reason: 'Order is already in favorites',
      };
    }

    // Check favorites limit
    const currentCount = await favoriteOrderRepository.getFavoritesCount(userId);
    if (currentCount >= this.MAX_FAVORITES) {
      return {
        canFavorite: false,
        reason: `Maximum ${this.MAX_FAVORITES} favorites reached`,
      };
    }

    return { canFavorite: true };
  }

  /**
   * Validate order exists and belongs to user
   */
  private async validateOrderOwnership(orderId: string, userId: string): Promise<void> {
    const supabase = await createServerSupabaseClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, customer_id, status')
      .eq('id', orderId)
      .eq('customer_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate order: ${error.message}`);
    }

    if (!order) {
      throw new Error('Order not found or does not belong to you');
    }

    // Only allow favoriting completed orders
    if (order.status !== 'COMPLETED') {
      throw new Error('Only completed orders can be added to favorites');
    }
  }

  /**
   * Validate family profiles belong to user
   */
  private async validateFamilyProfiles(userId: string, profileIds: string[]): Promise<void> {
    if (profileIds.length === 0) return;

    const supabase = await createServerSupabaseClient();

    const { data: profiles, error } = await supabase
      .from('measurement_profiles')
      .select('id, user_id')
      .in('id', profileIds);

    if (error) {
      throw new Error(`Failed to validate family profiles: ${error.message}`);
    }

    if (!profiles || profiles.length !== profileIds.length) {
      throw new Error('Some profile IDs are invalid');
    }

    // Check all profiles belong to the user
    const allBelongToUser = profiles.every(p => p.user_id === userId);
    if (!allBelongToUser) {
      throw new Error('All profiles must belong to your family account');
    }
  }

  /**
   * Get orders by IDs
   */
  private async getOrdersByIds(orderIds: string[]): Promise<any[]> {
    if (orderIds.length === 0) return [];

    const supabase = await createServerSupabaseClient();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .in('id', orderIds);

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return orders || [];
  }
}

export const favoriteOrdersService = new FavoriteOrdersService();
