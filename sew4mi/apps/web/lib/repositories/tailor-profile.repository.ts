import { createClient } from '@/lib/supabase/server';
import type { 
  TailorProfile, 
  TailorReview, 
  TailorAvailability, 
  GarmentPricing,
  TailorSearchFilters 
} from '@sew4mi/shared';

export class TailorProfileRepository {
  async findById(id: string): Promise<TailorProfile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tailor_profiles')
      .select(`
        *,
        users!inner(
          id,
          full_name,
          phone_number,
          whatsapp_number
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    
    return this.mapToTailorProfile(data);
  }

  async findByUserId(userId: string): Promise<TailorProfile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tailor_profiles')
      .select(`
        *,
        users!inner(
          id,
          full_name,
          phone_number,
          whatsapp_number
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    
    return this.mapToTailorProfile(data);
  }

  async search(filters: TailorSearchFilters): Promise<TailorProfile[]> {
    const supabase = await createClient();
    let query = supabase
      .from('tailor_profiles')
      .select(`
        *,
        users!inner(
          id,
          full_name,
          phone_number,
          whatsapp_number
        )
      `)
      .eq('verification_status', 'VERIFIED');

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.region) {
      query = query.eq('region', filters.region);
    }

    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }

    if (filters.verified !== undefined) {
      query = query.eq('verification_status', filters.verified ? 'VERIFIED' : 'PENDING');
    }

    if (filters.acceptsRushOrders) {
      query = query.eq('accepts_rush_orders', filters.acceptsRushOrders);
    }

    if (filters.specializations?.length) {
      query = query.contains('specializations', filters.specializations);
    }

    // Apply sorting
    if (filters.sortBy) {
      const order = filters.sortOrder || 'desc';
      switch (filters.sortBy) {
        case 'rating':
          query = query.order('rating', { ascending: order === 'asc' });
          break;
        case 'popularity':
          query = query.order('total_orders', { ascending: order === 'asc' });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }
    } else {
      query = query.order('rating', { ascending: false });
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map(this.mapToTailorProfile);
  }

  async update(id: string, updates: Partial<TailorProfile>): Promise<TailorProfile | null> {
    const supabase = await createClient();
    const dbUpdates = this.mapToDbFormat(updates);
    
    const { data, error } = await supabase
      .from('tailor_profiles')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    
    return this.mapToTailorProfile(data);
  }

  async getReviews(tailorId: string, limit = 10, offset = 0): Promise<TailorReview[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tailor_reviews')
      .select(`
        *,
        users!customer_id(
          id,
          full_name,
          avatar_url
        ),
        orders(
          id,
          order_number,
          garment_type
        )
      `)
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) return [];

    return data.map(this.mapToTailorReview);
  }

  async createReview(review: Omit<TailorReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<TailorReview | null> {
    const supabase = await createClient();
    const dbReview = {
      tailor_id: review.tailorId,
      customer_id: review.customerId,
      order_id: review.orderId,
      rating: review.rating,
      review_text: review.reviewText,
      review_photos: review.reviewPhotos,
      response_time: review.responseTime,
      delivery_on_time: review.deliveryOnTime,
      quality_rating: review.qualityRating,
      communication_rating: review.communicationRating,
      is_verified: review.isVerified,
    };

    const { data, error } = await supabase
      .from('tailor_reviews')
      .insert(dbReview)
      .select()
      .single();

    if (error || !data) return null;

    return this.mapToTailorReview(data);
  }

  async getAvailability(tailorId: string, startDate: string, endDate: string): Promise<TailorAvailability[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tailor_availability')
      .select('*')
      .eq('tailor_id', tailorId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error || !data) return [];

    return data.map(this.mapToTailorAvailability);
  }

  async updateAvailability(
    tailorId: string,
    date: string,
    update: Partial<TailorAvailability>
  ): Promise<TailorAvailability | null> {
    const supabase = await createClient();
    const dbUpdate = {
      status: update.status,
      capacity: update.capacity,
      current_load: update.currentLoad,
      notes: update.notes,
    };

    const { data, error } = await supabase
      .from('tailor_availability')
      .upsert({
        tailor_id: tailorId,
        date,
        ...dbUpdate,
      })
      .select()
      .single();

    if (error || !data) return null;

    return this.mapToTailorAvailability(data);
  }

  async getPricing(tailorId: string): Promise<GarmentPricing[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('garment_pricing')
      .select('*')
      .eq('tailor_id', tailorId)
      .eq('is_active', true)
      .order('garment_type', { ascending: true });

    if (error || !data) return [];

    return data.map(this.mapToGarmentPricing);
  }

  async updatePricing(
    tailorId: string,
    garmentType: string,
    update: Partial<GarmentPricing>
  ): Promise<GarmentPricing | null> {
    const supabase = await createClient();
    const dbUpdate = {
      base_price: update.basePrice,
      max_price: update.maxPrice,
      price_factors: update.priceFactors,
      is_active: update.isActive,
      last_updated: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('garment_pricing')
      .upsert({
        tailor_id: tailorId,
        garment_type: garmentType,
        ...dbUpdate,
      })
      .select()
      .single();

    if (error || !data) return null;

    return this.mapToGarmentPricing(data);
  }

  async getPortfolioImages(tailorId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tailor_profiles')
      .select('portfolio_images')
      .eq('id', tailorId)
      .single();

    if (error || !data) return [];

    return data.portfolio_images || [];
  }

  async updatePortfolioImages(tailorId: string, images: string[]): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('tailor_profiles')
      .update({ portfolio_images: images })
      .eq('id', tailorId);

    return !error;
  }

  private mapToTailorProfile(data: any): TailorProfile {
    return {
      id: data.id,
      userId: data.user_id,
      businessName: data.business_name,
      bio: data.bio,
      profilePhoto: data.profile_photo,
      yearsOfExperience: data.years_of_experience,
      specializations: data.specializations || [],
      portfolioUrl: data.portfolio_url,
      portfolioImages: data.portfolio_images || [],
      location: data.location,
      locationName: data.location_name,
      city: data.city,
      region: data.region,
      deliveryRadiusKm: data.delivery_radius_km,
      verificationStatus: data.verification_status,
      verificationDate: data.verification_date,
      verifiedBy: data.verified_by,
      rating: data.rating,
      totalReviews: data.total_reviews,
      totalOrders: data.total_orders,
      completedOrders: data.completed_orders,
      completionRate: data.completion_rate,
      responseTimeHours: data.response_time_hours,
      averageResponseHours: data.average_response_hours,
      averageDeliveryDays: data.average_delivery_days,
      onTimeDeliveryRate: data.on_time_delivery_rate,
      capacity: data.capacity,
      pricingTiers: data.pricing_tiers || {},
      workingHours: data.working_hours || {},
      vacationMode: data.vacation_mode,
      vacationMessage: data.vacation_message,
      acceptsRushOrders: data.accepts_rush_orders,
      rushOrderFeePercentage: data.rush_order_fee_percentage,
      instagramHandle: data.instagram_handle,
      facebookPage: data.facebook_page,
      tiktokHandle: data.tiktok_handle,
      bankAccountDetails: data.bank_account_details,
      mobileMoneyDetails: data.mobile_money_details,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToDbFormat(profile: Partial<TailorProfile>): any {
    const mapped: any = {};
    
    if (profile.businessName !== undefined) mapped.business_name = profile.businessName;
    if (profile.bio !== undefined) mapped.bio = profile.bio;
    if (profile.profilePhoto !== undefined) mapped.profile_photo = profile.profilePhoto;
    if (profile.yearsOfExperience !== undefined) mapped.years_of_experience = profile.yearsOfExperience;
    if (profile.specializations !== undefined) mapped.specializations = profile.specializations;
    if (profile.portfolioUrl !== undefined) mapped.portfolio_url = profile.portfolioUrl;
    if (profile.portfolioImages !== undefined) mapped.portfolio_images = profile.portfolioImages;
    if (profile.location !== undefined) mapped.location = profile.location;
    if (profile.locationName !== undefined) mapped.location_name = profile.locationName;
    if (profile.city !== undefined) mapped.city = profile.city;
    if (profile.region !== undefined) mapped.region = profile.region;
    if (profile.deliveryRadiusKm !== undefined) mapped.delivery_radius_km = profile.deliveryRadiusKm;
    if (profile.workingHours !== undefined) mapped.working_hours = profile.workingHours;
    if (profile.vacationMode !== undefined) mapped.vacation_mode = profile.vacationMode;
    if (profile.vacationMessage !== undefined) mapped.vacation_message = profile.vacationMessage;
    if (profile.acceptsRushOrders !== undefined) mapped.accepts_rush_orders = profile.acceptsRushOrders;
    if (profile.rushOrderFeePercentage !== undefined) mapped.rush_order_fee_percentage = profile.rushOrderFeePercentage;
    if (profile.instagramHandle !== undefined) mapped.instagram_handle = profile.instagramHandle;
    if (profile.facebookPage !== undefined) mapped.facebook_page = profile.facebookPage;
    if (profile.tiktokHandle !== undefined) mapped.tiktok_handle = profile.tiktokHandle;
    
    return mapped;
  }

  private mapToTailorReview(data: any): TailorReview {
    return {
      id: data.id,
      tailorId: data.tailor_id,
      customerId: data.customer_id,
      orderId: data.order_id,
      rating: data.rating,
      reviewText: data.review_text,
      reviewPhotos: data.review_photos || [],
      responseTime: data.response_time,
      deliveryOnTime: data.delivery_on_time,
      qualityRating: data.quality_rating,
      communicationRating: data.communication_rating,
      isVerified: data.is_verified,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      customer: data.users ? {
        id: data.users.id,
        fullName: data.users.full_name,
        avatarUrl: data.users.avatar_url,
      } : undefined,
      order: data.orders ? {
        id: data.orders.id,
        orderNumber: data.orders.order_number,
        garmentType: data.orders.garment_type,
      } : undefined,
    };
  }

  private mapToTailorAvailability(data: any): TailorAvailability {
    return {
      id: data.id,
      tailorId: data.tailor_id,
      date: data.date,
      status: data.status,
      capacity: data.capacity,
      currentLoad: data.current_load,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToGarmentPricing(data: any): GarmentPricing {
    return {
      id: data.id,
      tailorId: data.tailor_id,
      garmentType: data.garment_type,
      basePrice: data.base_price,
      maxPrice: data.max_price,
      priceFactors: data.price_factors || [],
      isActive: data.is_active,
      lastUpdated: data.last_updated,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const tailorProfileRepository = new TailorProfileRepository();