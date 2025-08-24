import {
  TailorSearchFilters,
  TailorSearchResult,
  AutocompleteResult,
  FeaturedTailor,
  FeaturedTailorFilters,
  SearchAnalytics,
  SEARCH_CONFIG,
  CACHE_CONFIG,
} from '@sew4mi/shared';
import { TailorSearchRepository } from '../repositories/tailor-search.repository';
import { getSupabaseClient } from '../supabase';
import { CacheService, createCacheService } from './cache.service';

export class TailorSearchService {
  private searchRepository: TailorSearchRepository;
  private cache: CacheService;

  constructor() {
    this.searchRepository = new TailorSearchRepository();
    this.cache = createCacheService();
  }

  /**
   * Search tailors with caching and analytics
   */
  async searchTailors(
    filters: TailorSearchFilters,
    userId?: string,
    sessionId?: string
  ): Promise<TailorSearchResult> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey('search', filters, userId);
    
    // Check cache
    const cached = await this.cache.get<TailorSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Validate filters
      this.validateSearchFilters(filters);

      // Perform search
      const result = await this.searchRepository.searchTailors(filters, userId);

      // Cache results
      await this.cache.set(cacheKey, result, CACHE_CONFIG.SEARCH_RESULTS_TTL_SECONDS);

      // Track analytics
      if (sessionId) {
        this.trackSearchAnalytics({
          query: filters.query || '',
          filters,
          resultsCount: result.tailors.length,
          searchTime: Date.now() - startTime,
          userId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions with caching
   */
  async getAutocomplete(query: string, limit: number = 10): Promise<AutocompleteResult> {
    if (query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return { suggestions: [], categories: { tailors: [], specializations: [], locations: [] } };
    }

    const cacheKey = `autocomplete:${query.toLowerCase()}:${limit}`;
    const cached = await this.cache.get<AutocompleteResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.searchRepository.getAutocomplete(query, limit);
      await this.cache.set(cacheKey, result, CACHE_CONFIG.AUTOCOMPLETE_TTL_SECONDS);
      return result;
    } catch (error) {
      console.error('Autocomplete failed:', error);
      // Return empty results on error to avoid breaking UI
      return { suggestions: [], categories: { tailors: [], specializations: [], locations: [] } };
    }
  }

  /**
   * Get featured tailors with caching
   */
  async getFeaturedTailors(filters: FeaturedTailorFilters = {}): Promise<FeaturedTailor[]> {
    const cacheKey = this.generateCacheKey('featured', filters);
    const cached = await this.cache.get<FeaturedTailor[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.searchRepository.getFeaturedTailors(filters);
      await this.cache.set(cacheKey, result, CACHE_CONFIG.FEATURED_TAILORS_TTL_SECONDS);
      return result;
    } catch (error) {
      console.error('Failed to get featured tailors:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get popular search queries
   */
  async getPopularSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    const cacheKey = `popular-searches:${limit}`;
    const cached = await this.cache.get<Array<{ query: string; count: number }>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('query')
        .not('query', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false })
        .limit(1000); // Get recent searches

      if (error) {
        throw error;
      }

      // Count query occurrences
      const queryCounts: Record<string, number> = {};
      data.forEach(item => {
        const query = item.query?.trim().toLowerCase();
        if (query && query.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH) {
          queryCounts[query] = (queryCounts[query] || 0) + 1;
        }
      });

      // Sort by count and take top results
      const result = Object.entries(queryCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      await this.cache.set(cacheKey, result, CACHE_CONFIG.POPULAR_SEARCHES_TTL_SECONDS);
      return result;
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Track search result clicks for analytics
   */
  async trackSearchClick(
    sessionId: string,
    tailorId: string,
    userId?: string
  ): Promise<void> {
    try {
      // Update the latest search record for this session
      const { error } = await supabase
        .from('search_analytics')
        .update({
          clicked_results: supabase.raw(`array_append(COALESCE(clicked_results, '{}'), '${tailorId}')`),
        })
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Failed to track search click:', error);
      }
    } catch (error) {
      console.error('Failed to track search click:', error);
    }
  }

  /**
   * Track search to order conversion
   */
  async trackSearchConversion(
    sessionId: string,
    tailorId: string,
    userId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('search_analytics')
        .update({
          converted_results: supabase.raw(`array_append(COALESCE(converted_results, '{}'), '${tailorId}')`),
        })
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Failed to track search conversion:', error);
      }
    } catch (error) {
      console.error('Failed to track search conversion:', error);
    }
  }

  /**
   * Get search analytics summary
   */
  async getSearchAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSearches: number;
    averageSearchTime: number;
    topQueries: Array<{ query: string; count: number }>;
    clickThroughRate: number;
    conversionRate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        throw error;
      }

      const totalSearches = data.length;
      const averageSearchTime = data.reduce((sum, item) => sum + (item.search_time_ms || 0), 0) / totalSearches;

      // Count queries
      const queryCounts: Record<string, number> = {};
      data.forEach(item => {
        if (item.query) {
          queryCounts[item.query] = (queryCounts[item.query] || 0) + 1;
        }
      });

      const topQueries = Object.entries(queryCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate rates
      const searchesWithClicks = data.filter(item => 
        item.clicked_results && item.clicked_results.length > 0
      ).length;
      
      const searchesWithConversions = data.filter(item => 
        item.converted_results && item.converted_results.length > 0
      ).length;

      const clickThroughRate = totalSearches > 0 ? searchesWithClicks / totalSearches : 0;
      const conversionRate = totalSearches > 0 ? searchesWithConversions / totalSearches : 0;

      return {
        totalSearches,
        averageSearchTime: Math.round(averageSearchTime),
        topQueries,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      throw error;
    }
  }

  /**
   * Validate search filters
   */
  private validateSearchFilters(filters: TailorSearchFilters): void {
    if (filters.limit && filters.limit > SEARCH_CONFIG.MAX_LIMIT) {
      throw new Error(`Limit cannot exceed ${SEARCH_CONFIG.MAX_LIMIT}`);
    }

    if (filters.query && filters.query.length > SEARCH_CONFIG.MAX_QUERY_LENGTH) {
      throw new Error(`Query cannot exceed ${SEARCH_CONFIG.MAX_QUERY_LENGTH} characters`);
    }

    if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
      throw new Error('minPrice cannot be greater than maxPrice');
    }

    if (filters.minRating && (filters.minRating < 0 || filters.minRating > 5)) {
      throw new Error('minRating must be between 0 and 5');
    }

    if (filters.location?.radius && filters.location.radius > SEARCH_CONFIG.MAX_RADIUS_KM) {
      throw new Error(`Search radius cannot exceed ${SEARCH_CONFIG.MAX_RADIUS_KM}km`);
    }
  }

  /**
   * Track search analytics
   */
  private async trackSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      // Use service role to insert analytics (bypasses RLS)
      await supabase
        .from('search_analytics')
        .insert({
          user_id: analytics.userId,
          session_id: analytics.sessionId,
          query: analytics.query,
          filters: analytics.filters,
          results_count: analytics.resultsCount,
          search_time_ms: analytics.searchTime,
          created_at: analytics.timestamp,
        });
    } catch (error) {
      console.error('Failed to track search analytics:', error);
      // Don't throw - analytics failure shouldn't break search
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(type: string, data: any, userId?: string): string {
    const hash = JSON.stringify({ type, data, userId });
    return Buffer.from(hash).toString('base64').slice(0, 50);
  }

  /**
   * Clear all cache
   */
  public async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}