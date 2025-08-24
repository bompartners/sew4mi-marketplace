import { getSupabaseClient } from '../supabase';
import { CustomerFavorite, TailorSearchItem } from '@sew4mi/shared';

export class FavoritesRepository {
  /**
   * Add a tailor to user's favorites
   */
  async addFavorite(customerId: string, tailorId: string): Promise<CustomerFavorite> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('customer_favorites')
      .insert({
        customer_id: customerId,
        tailor_id: tailorId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Tailor is already in your favorites');
      }
      throw new Error(`Failed to add favorite: ${error.message}`);
    }

    return {
      id: data.id,
      customerId: data.customer_id,
      tailorId: data.tailor_id,
      createdAt: data.created_at,
    };
  }

  /**
   * Remove a tailor from user's favorites
   */
  async removeFavorite(customerId: string, tailorId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from('customer_favorites')
      .delete()
      .eq('customer_id', customerId)
      .eq('tailor_id', tailorId);

    if (error) {
      throw new Error(`Failed to remove favorite: ${error.message}`);
    }
  }

  /**
   * Get user's favorite tailors with full details
   */
  async getFavorites(
    customerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ favorites: TailorSearchItem[]; total: number }> {
    const supabase = await getSupabaseClient();
    // Get favorites with tailor details
    const { data: favoritesData, error } = await supabase
      .from('customer_favorites')
      .select(`
        id,
        created_at,
        tailor:tailor_profiles!customer_favorites_tailor_id_fkey(
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
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get favorites: ${error.message}`);
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('customer_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    if (countError) {
      throw new Error(`Failed to count favorites: ${countError.message}`);
    }

    // Process favorites
    const favorites = favoritesData
      .filter(favorite => favorite.tailor && favorite.tailor.verification_status === 'VERIFIED')
      .map(favorite => {
        const tailor = favorite.tailor;
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
          isFavorite: true,
          minPrice: this.calculateMinPrice(tailor.garment_pricing),
          maxPrice: this.calculateMaxPrice(tailor.garment_pricing),
        } as TailorSearchItem;
      });

    return {
      favorites,
      total: count || 0,
    };
  }

  /**
   * Check if a tailor is favorited by user
   */
  async isFavorite(customerId: string, tailorId: string): Promise<boolean> {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('customer_favorites')
      .select('id')
      .eq('customer_id', customerId)
      .eq('tailor_id', tailorId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check favorite status: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Get favorite tailors by IDs (for bulk checking)
   */
  async getFavoritesByTailorIds(
    customerId: string,
    tailorIds: string[]
  ): Promise<string[]> {
    if (tailorIds.length === 0) return [];

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('customer_favorites')
      .select('tailor_id')
      .eq('customer_id', customerId)
      .in('tailor_id', tailorIds);

    if (error) {
      throw new Error(`Failed to get favorites by IDs: ${error.message}`);
    }

    return data.map(item => item.tailor_id);
  }

  /**
   * Get favorite count for a tailor
   */
  async getFavoriteCount(tailorId: string): Promise<number> {
    const supabase = await getSupabaseClient();
    const { count, error } = await supabase
      .from('customer_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('tailor_id', tailorId);

    if (error) {
      throw new Error(`Failed to get favorite count: ${error.message}`);
    }

    return count || 0;
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
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('customer_favorites')
      .select(`
        tailor:tailor_profiles!customer_favorites_tailor_id_fkey(
          specializations,
          city,
          rating
        )
      `)
      .eq('customer_id', customerId);

    if (error) {
      throw new Error(`Failed to get favorites stats: ${error.message}`);
    }

    const tailors = data.filter(item => item.tailor).map(item => item.tailor);
    const total = tailors.length;

    // Calculate specializations
    const specializationCounts: Record<string, number> = {};
    tailors.forEach(tailor => {
      tailor.specializations?.forEach((spec: string) => {
        specializationCounts[spec] = (specializationCounts[spec] || 0) + 1;
      });
    });

    // Calculate locations
    const locationCounts: Record<string, number> = {};
    tailors.forEach(tailor => {
      if (tailor.city) {
        locationCounts[tailor.city] = (locationCounts[tailor.city] || 0) + 1;
      }
    });

    // Calculate average rating
    const totalRating = tailors.reduce((sum, tailor) => sum + (tailor.rating || 0), 0);
    const averageRating = total > 0 ? totalRating / total : 0;

    return {
      total,
      bySpecialization: Object.entries(specializationCounts)
        .map(([specialization, count]) => ({ specialization, count }))
        .sort((a, b) => b.count - a.count),
      byLocation: Object.entries(locationCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
      averageRating: Math.round(averageRating * 100) / 100,
    };
  }

  /**
   * Calculate minimum price from garment pricing
   */
  private calculateMinPrice(pricing: any[]): number | undefined {
    if (!pricing || pricing.length === 0) return undefined;
    const prices = pricing.map(p => p.base_price).filter(Boolean);
    return prices.length > 0 ? Math.min(...prices) : undefined;
  }

  /**
   * Calculate maximum price from garment pricing
   */
  private calculateMaxPrice(pricing: any[]): number | undefined {
    if (!pricing || pricing.length === 0) return undefined;
    const prices = pricing.map(p => p.max_price || p.base_price).filter(Boolean);
    return prices.length > 0 ? Math.max(...prices) : undefined;
  }
}