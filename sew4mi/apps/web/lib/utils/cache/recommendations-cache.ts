/**
 * Utility functions for managing recommendations cache
 * Used when user actions require cache invalidation (e.g., completing orders)
 */

import { createCacheService } from '@/lib/services/cache.service';

const cacheService = createCacheService();

/**
 * Invalidate recommendations cache for a user
 * Call this when user completes a new order
 *
 * @param userId - User ID to invalidate cache for
 * @example
 * // In order completion webhook/API:
 * await invalidateRecommendationsCache(order.customerId);
 */
export async function invalidateRecommendationsCache(userId: string): Promise<void> {
  try {
    // Delete all recommendation cache keys for this user
    const types = ['all', 'garment', 'tailor', 'fabric'];
    const limits = [5, 10, 20, 50]; // Common limit values

    for (const type of types) {
      for (const limit of limits) {
        const cacheKey = `recommendations:${userId}:${type}:${limit}`;
        await cacheService.delete(cacheKey);
      }
    }
  } catch (error) {
    console.error('Failed to invalidate recommendations cache:', error);
    // Don't throw - cache invalidation failure shouldn't break the app
  }
}
