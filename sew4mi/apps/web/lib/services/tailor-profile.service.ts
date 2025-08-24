import { tailorProfileRepository } from '@/lib/repositories/tailor-profile.repository';
import { 
  TailorProfile, 
  TailorProfileComplete,
  TailorReview, 
  TailorAvailability, 
  GarmentPricing,
  TailorSearchFilters,
  TailorStatistics,
  TailorPortfolio,
  CreateReviewDto,
  UpdateAvailabilityDto,
  UpdatePricingDto
} from '@sew4mi/shared';

import {
  TAILOR_SPECIALIZATIONS,
  GARMENT_TYPES,
  RESPONSE_TIME_RANGES,
  DELIVERY_TIME_RANGES
} from '@sew4mi/shared';

export class TailorProfileService {
  async getCompleteProfile(tailorId: string): Promise<TailorProfileComplete | null> {
    const profile = await tailorProfileRepository.findById(tailorId);
    if (!profile) return null;

    const [reviews, availability, pricing, portfolioImages] = await Promise.all([
      tailorProfileRepository.getReviews(tailorId, 10),
      tailorProfileRepository.getAvailability(tailorId, 
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      ),
      tailorProfileRepository.getPricing(tailorId),
      tailorProfileRepository.getPortfolioImages(tailorId)
    ]);

    const statistics = this.calculateStatistics(profile, reviews);
    const portfolio = this.buildPortfolio(portfolioImages, profile.specializations);

    return {
      ...profile,
      reviews,
      availability,
      pricing,
      portfolio,
      statistics,
      user: {
        id: profile.userId,
        fullName: '', // Will be populated from join
        phoneNumber: null,
        whatsappNumber: null,
      }
    };
  }

  async searchTailors(filters: TailorSearchFilters): Promise<TailorProfile[]> {
    return tailorProfileRepository.search(filters);
  }

  async getReviews(tailorId: string, page = 1, limit = 10): Promise<TailorReview[]> {
    const offset = (page - 1) * limit;
    return tailorProfileRepository.getReviews(tailorId, limit, offset);
  }

  async createReview(customerId: string, reviewData: CreateReviewDto): Promise<TailorReview | null> {
    // Verify customer can review this order
    const canReview = await this.canCustomerReviewOrder(customerId, reviewData.orderId);
    if (!canReview) {
      throw new Error('You cannot review this order');
    }

    return tailorProfileRepository.createReview({
      ...reviewData,
      customerId,
      isVerified: true, // Since we verified the order
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async getAvailability(tailorId: string, startDate: string, endDate: string): Promise<TailorAvailability[]> {
    return tailorProfileRepository.getAvailability(tailorId, startDate, endDate);
  }

  async updateAvailability(
    tailorUserId: string, 
    tailorId: string, 
    date: string, 
    update: UpdateAvailabilityDto
  ): Promise<TailorAvailability | null> {
    // Verify tailor owns this profile
    const profile = await tailorProfileRepository.findById(tailorId);
    if (!profile || profile.userId !== tailorUserId) {
      throw new Error('Unauthorized');
    }

    return tailorProfileRepository.updateAvailability(tailorId, date, update);
  }

  async getPricing(tailorId: string): Promise<GarmentPricing[]> {
    return tailorProfileRepository.getPricing(tailorId);
  }

  async updatePricing(
    tailorUserId: string,
    tailorId: string,
    garmentType: string,
    update: UpdatePricingDto
  ): Promise<GarmentPricing | null> {
    // Verify tailor owns this profile
    const profile = await tailorProfileRepository.findById(tailorId);
    if (!profile || profile.userId !== tailorUserId) {
      throw new Error('Unauthorized');
    }

    // Validate price consistency
    if (update.basePrice > update.maxPrice) {
      throw new Error('Base price cannot be higher than max price');
    }

    return tailorProfileRepository.updatePricing(tailorId, garmentType, update);
  }

  async updatePortfolio(
    tailorUserId: string,
    tailorId: string,
    images: string[]
  ): Promise<boolean> {
    // Verify tailor owns this profile
    const profile = await tailorProfileRepository.findById(tailorId);
    if (!profile || profile.userId !== tailorUserId) {
      throw new Error('Unauthorized');
    }

    // Validate image limits
    if (images.length > 20) {
      throw new Error('Maximum 20 portfolio images allowed');
    }

    return tailorProfileRepository.updatePortfolioImages(tailorId, images);
  }

  async updateProfile(
    tailorUserId: string,
    tailorId: string,
    updates: Partial<TailorProfile>
  ): Promise<TailorProfile | null> {
    // Verify tailor owns this profile
    const profile = await tailorProfileRepository.findById(tailorId);
    if (!profile || profile.userId !== tailorUserId) {
      throw new Error('Unauthorized');
    }

    // Validate specializations
    if (updates.specializations) {
      const validSpecializations = updates.specializations.every(spec => 
        TAILOR_SPECIALIZATIONS.includes(spec as any)
      );
      if (!validSpecializations) {
        throw new Error('Invalid specializations provided');
      }
    }

    return tailorProfileRepository.update(tailorId, updates);
  }

  async getBusinessStatistics(tailorId: string): Promise<TailorStatistics> {
    const profile = await tailorProfileRepository.findById(tailorId);
    if (!profile) {
      throw new Error('Tailor profile not found');
    }

    const reviews = await tailorProfileRepository.getReviews(tailorId, 100); // Get more reviews for stats

    return this.calculateStatistics(profile, reviews);
  }

  private calculateStatistics(profile: TailorProfile, reviews: TailorReview[]): TailorStatistics {
    const responseTimeAvg = profile.averageResponseHours || 0;
    const onTimeCount = reviews.filter(r => r.deliveryOnTime).length;
    const totalReviews = reviews.length;

    // Calculate rating breakdowns
    const qualityRatings = reviews.filter(r => r.qualityRating).map(r => r.qualityRating!);
    const communicationRatings = reviews.filter(r => r.communicationRating).map(r => r.communicationRating!);
    
    const avgQuality = qualityRatings.length > 0 
      ? qualityRatings.reduce((a, b) => a + b, 0) / qualityRatings.length 
      : 0;
      
    const avgCommunication = communicationRatings.length > 0 
      ? communicationRatings.reduce((a, b) => a + b, 0) / communicationRatings.length 
      : 0;

    return {
      responseTime: {
        average: responseTimeAvg,
        unit: responseTimeAvg < 24 ? 'hours' : 'days',
      },
      deliveryRate: {
        onTime: onTimeCount,
        total: totalReviews,
        percentage: totalReviews > 0 ? Math.round((onTimeCount / totalReviews) * 100) : 100,
      },
      orderCompletion: {
        completed: profile.completedOrders,
        total: profile.totalOrders,
        rate: profile.completionRate,
      },
      customerSatisfaction: {
        rating: profile.rating,
        totalReviews: profile.totalReviews,
        breakdown: {
          quality: Math.round(avgQuality * 10) / 10,
          communication: Math.round(avgCommunication * 10) / 10,
          timeliness: profile.onTimeDeliveryRate / 20, // Convert percentage to 5-star scale
          value: profile.rating, // Use overall rating as proxy for value
        },
      },
    };
  }

  private buildPortfolio(images: string[], specializations: string[]): TailorPortfolio {
    // Group images by category based on specializations
    const categories = ['All Work', ...specializations.slice(0, 5)];
    
    // Create featured work from first few images
    const featuredWork = images.slice(0, 6).map((imageUrl, index) => ({
      imageUrl,
      title: `Featured Work ${index + 1}`,
      description: `Quality craftsmanship in ${specializations[index % specializations.length] || 'custom tailoring'}`,
      garmentType: specializations[index % specializations.length] || 'Custom',
    }));

    return {
      images,
      categories,
      featuredWork,
    };
  }

  private async canCustomerReviewOrder(customerId: string, orderId: string): Promise<boolean> {
    // This would typically check if the order belongs to the customer and is completed
    // For now, we'll implement a basic check - in a real app, this would query the orders table
    return true; // Simplified for this implementation
  }

  // Helper method to get response time category
  getResponseTimeCategory(hours: number): keyof typeof RESPONSE_TIME_RANGES {
    if (hours <= 2) return 'EXCELLENT';
    if (hours <= 6) return 'GOOD';
    if (hours <= 24) return 'AVERAGE';
    if (hours <= 48) return 'SLOW';
    return 'VERY_SLOW';
  }

  // Helper method to get delivery time category
  getDeliveryTimeCategory(days: number): keyof typeof DELIVERY_TIME_RANGES {
    if (days <= 3) return 'EXPRESS';
    if (days <= 7) return 'FAST';
    if (days <= 14) return 'STANDARD';
    if (days <= 21) return 'EXTENDED';
    return 'CUSTOM';
  }

  // Method to validate WhatsApp contact request
  async validateWhatsAppContact(customerId: string, tailorId: string): Promise<boolean> {
    // Check rate limiting - max 5 contacts per customer per hour
    // This would typically use a cache like Redis
    return true; // Simplified implementation
  }
}

export const tailorProfileService = new TailorProfileService();