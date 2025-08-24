import { getSupabaseClient } from '../supabase';
import {
  TailorSearchFilters,
  TailorSearchResult,
  TailorSearchItem,
  AutocompleteResult,
  AutocompleteSuggestion,
  FeaturedTailor,
  FeaturedTailorFilters,
} from '@sew4mi/shared';
import { SEARCH_CONFIG, FEATURED_TAILOR_CRITERIA } from '@sew4mi/shared';

export class TailorSearchRepository {
  /**
   * Search tailors with filters, sorting, and pagination
   */
  async searchTailors(
    filters: TailorSearchFilters,
    userId?: string
  ): Promise<TailorSearchResult> {
    const startTime = Date.now();
    
    let query = supabase
      .from('tailor_profiles')
      .select(`
        *,
        user:users!tailor_profiles_user_id_fkey(
          id,
          full_name,
          phone_number,
          whatsapp_number
        ),
        garment_pricing(
          garment_type,
          base_price,
          max_price
        ),
        _count_favorites:customer_favorites(count)
      `)
      .eq('verification_status', 'VERIFIED')
      .eq('vacation_mode', false);

    // Apply text search
    if (filters.query && filters.query.trim()) {
      query = query.textSearch('business_name,specializations', filters.query, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Apply location filters
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.region) {
      query = query.eq('region', filters.region);
    }

    // Apply rating filter
    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }

    // Apply specialization filters
    if (filters.specializations && filters.specializations.length > 0) {
      query = query.overlaps('specializations', filters.specializations);
    }

    // Apply rush orders filter
    if (filters.acceptsRushOrders !== undefined) {
      query = query.eq('accepts_rush_orders', filters.acceptsRushOrders);
    }

    // Apply cursor pagination
    if (filters.cursor) {
      const cursorData = this.decodeCursor(filters.cursor);
      if (cursorData) {
        query = query.gt('created_at', cursorData.createdAt);
      }
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'rating';
    const sortOrder = filters.sortOrder || 'desc';
    
    switch (sortBy) {
      case 'rating':
        query = query.order('rating', { ascending: sortOrder === 'asc' })
                    .order('total_reviews', { ascending: false });
        break;
      case 'responseTime':
        query = query.order('average_response_hours', { ascending: true, nullsLast: true });
        break;
      case 'price':
        // Will need to handle price sorting in post-processing
        query = query.order('rating', { ascending: false });
        break;
      case 'distance':
        // Distance sorting requires location calculation
        query = query.order('city', { ascending: true })
                    .order('rating', { ascending: false });
        break;
      default:
        query = query.order('rating', { ascending: false });
    }

    // Apply limit
    const limit = Math.min(filters.limit || SEARCH_CONFIG.DEFAULT_LIMIT, SEARCH_CONFIG.MAX_LIMIT);
    query = query.limit(limit + 1); // +1 to check if there are more results

    // Execute query
    const { data: tailors, error } = await query;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    // Check if there are more results
    const hasMore = tailors.length > limit;
    if (hasMore) {
      tailors.pop(); // Remove the extra record
    }

    // Process results
    const processedTailors = await Promise.all(
      tailors.map(async (tailor) => this.processTailorSearchItem(tailor, filters, userId))
    );

    // Apply price filtering after processing
    let filteredTailors = processedTailors;
    if (filters.minPrice || filters.maxPrice) {
      filteredTailors = processedTailors.filter(tailor => {
        if (!tailor.minPrice) return true;
        
        let matchesPrice = true;
        if (filters.minPrice && tailor.minPrice < filters.minPrice) {
          matchesPrice = false;
        }
        if (filters.maxPrice && tailor.minPrice > filters.maxPrice) {
          matchesPrice = false;
        }
        return matchesPrice;
      });
    }

    // Handle price sorting
    if (sortBy === 'price') {
      filteredTailors.sort((a, b) => {
        const aPrice = a.minPrice || 0;
        const bPrice = b.minPrice || 0;
        return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
      });
    }

    // Generate next cursor
    const nextCursor = hasMore && tailors.length > 0
      ? this.encodeCursor(tailors[tailors.length - 1].created_at)
      : undefined;

    const searchTime = Date.now() - startTime;

    return {
      tailors: filteredTailors,
      hasMore,
      nextCursor,
      total: filteredTailors.length, // This would need a separate count query for accuracy
      searchMeta: {
        query: filters.query,
        appliedFilters: this.getAppliedFilters(filters),
        searchTime,
      },
    };
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocomplete(query: string, limit: number = 10): Promise<AutocompleteResult> {
    if (query.length < 2) {
      return { suggestions: [], categories: { tailors: [], specializations: [], locations: [] } };
    }

    const { data, error } = await supabase.rpc('get_search_suggestions', {
      p_query: query,
      p_limit: limit
    });

    if (error) {
      throw new Error(`Autocomplete failed: ${error.message}`);
    }

    const suggestions: AutocompleteSuggestion[] = data.map((item: any) => ({
      id: `${item.type}_${item.suggestion}`,
      text: item.suggestion,
      type: item.type,
      meta: item.meta,
    }));

    const categorized = {
      tailors: suggestions.filter(s => s.type === 'tailor'),
      specializations: suggestions.filter(s => s.type === 'specialization'),
      locations: suggestions.filter(s => s.type === 'location'),
    };

    return {
      suggestions,
      categories: categorized,
    };
  }

  /**
   * Get featured tailors
   */
  async getFeaturedTailors(filters: FeaturedTailorFilters = {}): Promise<FeaturedTailor[]> {
    let query = supabase
      .from('featured_tailors')
      .select(`
        *,
        tailor:tailor_profiles!featured_tailors_tailor_id_fkey(
          *,
          user:users!tailor_profiles_user_id_fkey(
            id,
            full_name,
            phone_number,
            whatsapp_number
          ),
          garment_pricing(
            garment_type,
            base_price,
            max_price
          )
        )
      `)
      .eq('is_active', true)
      .or(`featured_until.is.null,featured_until.gt.${new Date().toISOString()}`);

    // Apply filters
    if (filters.city || filters.region || filters.specializations) {
      // These filters need to be applied to the joined tailor data
      // For now, we'll fetch all and filter in memory
    }

    query = query.order('sort_order', { ascending: true })
                 .limit(filters.limit || FEATURED_TAILOR_CRITERIA.DEFAULT_LIMIT);

    const { data: featuredData, error } = await query;

    if (error) {
      throw new Error(`Featured tailors fetch failed: ${error.message}`);
    }

    return featuredData
      .filter(item => item.tailor && item.tailor.verification_status === 'VERIFIED')
      .map(item => ({
        ...this.mapTailorToSearchItem(item.tailor),
        featuredReason: item.featured_reason,
        featuredUntil: item.featured_until,
        promotionalBadge: item.promotional_badge,
      }));
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Process tailor data into search item format
   */
  private async processTailorSearchItem(
    tailor: any,
    filters: TailorSearchFilters,
    userId?: string
  ): Promise<TailorSearchItem> {
    const searchItem = this.mapTailorToSearchItem(tailor);

    // Calculate distance if user location provided
    if (filters.location && tailor.location) {
      searchItem.distance = this.calculateDistance(
        filters.location.lat,
        filters.location.lng,
        tailor.location.lat,
        tailor.location.lng
      );
    }

    // Calculate price range from pricing data
    if (tailor.garment_pricing && tailor.garment_pricing.length > 0) {
      const prices = tailor.garment_pricing.map((p: any) => p.base_price).filter(Boolean);
      if (prices.length > 0) {
        searchItem.minPrice = Math.min(...prices);
        searchItem.maxPrice = Math.max(...tailor.garment_pricing.map((p: any) => p.max_price || p.base_price));
      }
    }

    // Check if favorited by current user
    if (userId) {
      const { data: favorite } = await supabase
        .from('customer_favorites')
        .select('id')
        .eq('customer_id', userId)
        .eq('tailor_id', tailor.id)
        .single();
      
      searchItem.isFavorite = !!favorite;
    }

    // Calculate search score
    searchItem.searchScore = await this.calculateSearchScore(
      tailor.id,
      filters.query,
      filters.location?.lat,
      filters.location?.lng
    );

    return searchItem;
  }

  /**
   * Map database tailor to search item
   */
  private mapTailorToSearchItem(tailor: any): TailorSearchItem {
    return {
      id: tailor.id,
      userId: tailor.user_id,
      businessName: tailor.business_name,
      bio: tailor.bio,
      profilePhoto: tailor.profile_photo,
      yearsOfExperience: tailor.years_of_experience,
      specializations: tailor.specializations || [],
      portfolioImages: tailor.portfolio_images || [],
      location: tailor.location,
      locationName: tailor.location_name,
      city: tailor.city,
      region: tailor.region,
      deliveryRadiusKm: tailor.delivery_radius_km || 0,
      verificationStatus: tailor.verification_status,
      rating: tailor.rating || 0,
      totalReviews: tailor.total_reviews || 0,
      completedOrders: tailor.completed_orders || 0,
      completionRate: tailor.completion_rate || 0,
      averageResponseHours: tailor.average_response_hours,
      averageDeliveryDays: tailor.average_delivery_days || 0,
      onTimeDeliveryRate: tailor.on_time_delivery_rate || 0,
      capacity: tailor.capacity || 0,
      vacationMode: tailor.vacation_mode || false,
      acceptsRushOrders: tailor.accepts_rush_orders || false,
      rushOrderFeePercentage: tailor.rush_order_fee_percentage || 0,
    };
  }

  /**
   * Calculate search score using database function
   */
  private async calculateSearchScore(
    tailorId: string,
    query?: string,
    userLat?: number,
    userLng?: number
  ): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_search_score', {
      p_tailor_id: tailorId,
      p_query: query,
      p_user_location_lat: userLat,
      p_user_location_lng: userLng
    });

    if (error) {
      console.warn(`Failed to calculate search score for tailor ${tailorId}:`, error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Encode cursor for pagination
   */
  private encodeCursor(createdAt: string): string {
    return Buffer.from(JSON.stringify({ createdAt })).toString('base64');
  }

  /**
   * Decode cursor for pagination
   */
  private decodeCursor(cursor: string): { createdAt: string } | null {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Get list of applied filters for analytics
   */
  private getAppliedFilters(filters: TailorSearchFilters): string[] {
    const applied: string[] = [];
    
    if (filters.query) applied.push('query');
    if (filters.city) applied.push('city');
    if (filters.region) applied.push('region');
    if (filters.specializations?.length) applied.push('specializations');
    if (filters.minRating) applied.push('minRating');
    if (filters.minPrice || filters.maxPrice) applied.push('priceRange');
    if (filters.location) applied.push('location');
    if (filters.verified !== undefined) applied.push('verified');
    if (filters.acceptsRushOrders !== undefined) applied.push('acceptsRushOrders');
    
    return applied;
  }
}