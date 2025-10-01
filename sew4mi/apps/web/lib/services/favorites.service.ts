import { CustomerFavorite, TailorSearchItem } from '@sew4mi/shared';
import { FavoritesRepository } from '../repositories/favorites.repository';

export class FavoritesService {
  private favoritesRepository: FavoritesRepository;
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.favoritesRepository = new FavoritesRepository();
  }

  /**
   * Add a tailor to user's favorites with optimistic updates
   */
  async addFavorite(customerId: string, tailorId: string): Promise<CustomerFavorite> {
    try {
      // Validate inputs
      if (!customerId || !tailorId) {
        throw new Error('Customer ID and Tailor ID are required');
      }

      const favorite = await this.favoritesRepository.addFavorite(customerId, tailorId);
      
      // Clear related cache
      this.clearUserCache(customerId);
      
      return favorite;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      throw error;
    }
  }

  /**
   * Remove a tailor from user's favorites
   */
  async removeFavorite(customerId: string, tailorId: string): Promise<void> {
    try {
      if (!customerId || !tailorId) {
        throw new Error('Customer ID and Tailor ID are required');
      }

      await this.favoritesRepository.removeFavorite(customerId, tailorId);
      
      // Clear related cache
      this.clearUserCache(customerId);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status (add if not favorited, remove if favorited)
   */
  async toggleFavorite(customerId: string, tailorId: string): Promise<{ isFavorited: boolean; favorite?: CustomerFavorite }> {
    try {
      const isFavorited = await this.isFavorite(customerId, tailorId);
      
      if (isFavorited) {
        await this.removeFavorite(customerId, tailorId);
        return { isFavorited: false };
      } else {
        const favorite = await this.addFavorite(customerId, tailorId);
        return { isFavorited: true, favorite };
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  }

  /**
   * Get user's favorite tailors with pagination
   */
  async getFavorites(
    customerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ favorites: TailorSearchItem[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      const cacheKey = `favorites:${customerId}:${page}:${limit}`;
      
      // Check cache - skip cache for now to avoid type issues
      // const cached = this.getFromCache(cacheKey);
      // if (cached) {
      //   return cached;
      // }

      const result = await this.favoritesRepository.getFavorites(customerId, limit, offset);
      
      const response = {
        favorites: result.favorites,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      };

      // Cache results
      this.setCache(cacheKey, response);
      
      return response;
    } catch (error) {
      console.error('Failed to get favorites:', error);
      throw error;
    }
  }

  /**
   * Check if a tailor is favorited by user
   */
  async isFavorite(customerId: string, tailorId: string): Promise<boolean> {
    try {
      const cacheKey = `is-favorite:${customerId}:${tailorId}`;
      
      // Skip cache for now to avoid type issues
      // const cached = this.getFromCache(cacheKey);
      // if (cached !== null) {
      //   return cached;
      // }

      const result = await this.favoritesRepository.isFavorite(customerId, tailorId);
      
      // Cache result
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Failed to check favorite status:', error);
      return false; // Fail gracefully
    }
  }

  /**
   * Bulk check favorite status for multiple tailors
   */
  async getFavoriteStatuses(
    customerId: string,
    tailorIds: string[]
  ): Promise<Record<string, boolean>> {
    try {
      if (tailorIds.length === 0) return {};

      const favorites = await this.favoritesRepository.getFavoritesByTailorIds(customerId, tailorIds);
      
      // Create a map of tailor ID to favorite status
      const statuses: Record<string, boolean> = {};
      tailorIds.forEach(id => {
        statuses[id] = favorites.includes(id);
      });

      return statuses;
    } catch (error) {
      console.error('Failed to get favorite statuses:', error);
      // Return all false on error
      return tailorIds.reduce((acc, id) => {
        acc[id] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }
  }

  /**
   * Get favorite count for a tailor
   */
  async getFavoriteCount(tailorId: string): Promise<number> {
    try {
      const cacheKey = `favorite-count:${tailorId}`;
      
      // Skip cache for now to avoid type issues  
      // const cached = this.getFromCache(cacheKey);
      // if (cached !== null) {
      //   return cached;
      // }

      const count = await this.favoritesRepository.getFavoriteCount(tailorId);
      
      // Cache result
      this.setCache(cacheKey, count);
      
      return count;
    } catch (error) {
      console.error('Failed to get favorite count:', error);
      return 0; // Fail gracefully
    }
  }

  /**
   * Get favorites statistics for a customer
   */
  async getFavoritesStats(customerId: string): Promise<{
    total: number;
    bySpecialization: Array<{ specialization: string; count: number }>;
    byLocation: Array<{ city: string; count: number }>;
    averageRating: number;
  }> {
    try {
      const cacheKey = `favorites-stats:${customerId}`;
      
      // Skip cache for now to avoid type issues
      // const cached = this.getFromCache(cacheKey);
      // if (cached) {
      //   return cached;
      // }

      const stats = await this.favoritesRepository.getFavoritesStats(customerId);
      
      // Cache results
      this.setCache(cacheKey, stats);
      
      return stats;
    } catch (error) {
      console.error('Failed to get favorites stats:', error);
      return {
        total: 0,
        bySpecialization: [],
        byLocation: [],
        averageRating: 0,
      };
    }
  }

  /**
   * Get recent favorites for a customer
   */
  async getRecentFavorites(customerId: string, limit: number = 5): Promise<TailorSearchItem[]> {
    try {
      const result = await this.getFavorites(customerId, 1, limit);
      return result.favorites;
    } catch (error) {
      console.error('Failed to get recent favorites:', error);
      return [];
    }
  }

  /**
   * Search within user's favorites
   */
  async searchFavorites(
    customerId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ favorites: TailorSearchItem[]; total: number }> {
    try {
      // Get all favorites first
      const allFavorites = await this.getFavorites(customerId, 1, 1000); // Get all
      
      // Filter by query
      const filtered = allFavorites.favorites.filter(tailor => {
        const searchText = `${tailor.businessName} ${tailor.city} ${tailor.specializations.join(' ')}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedResults = filtered.slice(offset, offset + limit);

      return {
        favorites: paginatedResults,
        total: filtered.length,
      };
    } catch (error) {
      console.error('Failed to search favorites:', error);
      return { favorites: [], total: 0 };
    }
  }

  /**
   * Export favorites data (for data portability)
   */
  async exportFavorites(customerId: string): Promise<{
    exportDate: string;
    favorites: Array<{
      tailorName: string;
      city: string;
      specializations: string[];
      rating: number;
      addedDate: string;
    }>;
  }> {
    try {
      const result = await this.getFavorites(customerId, 1, 1000); // Get all
      
      return {
        exportDate: new Date().toISOString(),
        favorites: result.favorites.map(tailor => ({
          tailorName: tailor.businessName,
          city: tailor.city || '',
          specializations: tailor.specializations,
          rating: tailor.rating,
          addedDate: new Date().toISOString(), // Would need to store this in the favorites table
        })),
      };
    } catch (error) {
      console.error('Failed to export favorites:', error);
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  // Commented out until cache is re-enabled
  // private _getFromCache<T>(key: string): T | null {
  //   const cached = this.cache.get(key);
  //   if (cached && cached.expires > Date.now()) {
  //     return cached.data;
  //   }
  //   if (cached) {
  //     this.cache.delete(key);
  //   }
  //   return null;
  // }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any): void {
    const expires = Date.now() + this.CACHE_TTL;
    this.cache.set(key, { data, expires });

    // Clean expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanExpiredCache();
    }
  }

  /**
   * Clear cache for a specific user
   */
  private clearUserCache(customerId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(customerId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}