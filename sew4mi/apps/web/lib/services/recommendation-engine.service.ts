/**
 * Service for Story 4.3: Recommendation Engine Business Logic
 */

import { orderAnalyticsRepository } from '@/lib/repositories/order-analytics.repository';
import { createServerSupabaseClient } from '@/lib/supabase';
import type {
  Recommendation,
  RecommendationType,
  RecommendationRequest,
  RecommendationResponse,
  OrderAnalytics,
  RecommendationAction,
} from '@sew4mi/shared/types';

export class RecommendationEngineService {
  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(userId: string, request?: RecommendationRequest): Promise<RecommendationResponse> {
    const { type, limit = 10 } = request || {};

    // Get or compute user analytics
    let analytics = await orderAnalyticsRepository.getUserAnalytics(userId);

    // If analytics are stale or don't exist, recompute
    const isStale = await orderAnalyticsRepository.areAnalyticsStale(userId);
    if (!analytics || isStale) {
      analytics = await orderAnalyticsRepository.computeAnalytics(userId);
    }

    // Generate recommendations based on type
    let recommendations: Recommendation[] = [];

    if (!type || type === 'garment') {
      const garmentRecs = await this.getGarmentRecommendations(userId, analytics, limit);
      recommendations.push(...garmentRecs);
    }

    if (!type || type === 'tailor') {
      const tailorRecs = await this.getTailorRecommendations(userId, analytics, limit);
      recommendations.push(...tailorRecs);
    }

    if (!type || type === 'fabric') {
      const fabricRecs = await this.getFabricRecommendations(userId, analytics, limit);
      recommendations.push(...fabricRecs);
    }

    // Sort by score and limit results
    recommendations.sort((a, b) => b.score - a.score);
    recommendations = recommendations.slice(0, limit);

    return {
      recommendations,
      analytics,
    };
  }

  /**
   * Get garment type recommendations
   */
  private async getGarmentRecommendations(
    userId: string,
    analytics: OrderAnalytics,
    limit: number
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // If user has no order history, return popular garments
    if (Object.keys(analytics.garmentTypeFrequency).length === 0) {
      return this.getPopularGarmentRecommendations(limit);
    }

    // Recommend garments based on seasonal patterns
    const currentSeason = this.getCurrentSeason();
    const seasonalGarments = analytics.seasonalPatterns[currentSeason] || [];

    for (const garmentType of seasonalGarments.slice(0, limit)) {
      const score = this.calculateGarmentScore(garmentType, analytics);
      recommendations.push({
        id: `garment-${garmentType}`,
        type: 'garment' as RecommendationType,
        itemId: garmentType,
        score,
        reason: `Popular choice for ${currentSeason} based on your past orders`,
        metadata: {
          garmentType,
          season: currentSeason,
        },
      });
    }

    // Add complementary garment recommendations
    const complementaryGarments = this.getComplementaryGarments(analytics.garmentTypeFrequency);
    for (const garmentType of complementaryGarments.slice(0, Math.max(0, limit - recommendations.length))) {
      const score = this.calculateGarmentScore(garmentType, analytics);
      recommendations.push({
        id: `garment-${garmentType}`,
        type: 'garment' as RecommendationType,
        itemId: garmentType,
        score,
        reason: `Pairs well with your frequently ordered garments`,
        metadata: {
          garmentType,
        },
      });
    }

    return recommendations;
  }

  /**
   * Get tailor recommendations
   */
  private async getTailorRecommendations(
    userId: string,
    analytics: OrderAnalytics,
    limit: number
  ): Promise<Recommendation[]> {
    const supabase = await createServerSupabaseClient();
    const recommendations: Recommendation[] = [];

    // Get user's preferred garment types
    const topGarmentTypes = Object.entries(analytics.garmentTypeFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    if (topGarmentTypes.length === 0) {
      return [];
    }

    // Find tailors specializing in user's preferred garment types
    const { data: tailors, error } = await supabase
      .from('tailor_profiles')
      .select('*')
      .eq('verification_status', 'VERIFIED')
      .eq('is_accepting_orders', true)
      .overlaps('specializations', topGarmentTypes)
      .not('id', 'in', `(${analytics.preferredTailors.join(',') || 'null'})`)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error || !tailors) {
      return [];
    }

    for (const tailor of tailors) {
      const score = this.calculateTailorScore(tailor, analytics);
      recommendations.push({
        id: `tailor-${tailor.id}`,
        type: 'tailor' as RecommendationType,
        itemId: tailor.id,
        score,
        reason: `Expert in ${topGarmentTypes[0]} with ${tailor.rating.toFixed(1)}/5 rating`,
        metadata: {
          tailorId: tailor.id,
          businessName: tailor.business_name,
          specializations: tailor.specializations,
          rating: tailor.rating,
        },
      });
    }

    return recommendations;
  }

  /**
   * Get fabric recommendations
   */
  private async getFabricRecommendations(
    userId: string,
    analytics: OrderAnalytics,
    limit: number
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Get user's top fabrics
    const topFabrics = Object.entries(analytics.fabricPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([fabric]) => fabric);

    // Recommend similar or complementary fabrics
    const currentSeason = this.getCurrentSeason();
    const seasonalFabrics = this.getSeasonalFabrics(currentSeason);

    for (const fabric of seasonalFabrics.slice(0, limit)) {
      // Skip if user already frequently orders this fabric
      if (topFabrics.includes(fabric)) continue;

      const score = this.calculateFabricScore(fabric, analytics);
      recommendations.push({
        id: `fabric-${fabric}`,
        type: 'fabric' as RecommendationType,
        itemId: fabric,
        score,
        reason: `Perfect for ${currentSeason} season, complements your style`,
        metadata: {
          fabric,
          season: currentSeason,
        },
      });
    }

    return recommendations;
  }

  /**
   * Calculate recommendation score for garment
   */
  private calculateGarmentScore(garmentType: string, analytics: OrderAnalytics): number {
    let score = 0;

    // Type match (40%)
    const typeFrequency = analytics.garmentTypeFrequency[garmentType] || 0;
    const maxFrequency = Math.max(...Object.values(analytics.garmentTypeFrequency), 1);
    score += (typeFrequency / maxFrequency) * 40;

    // Seasonal relevance (30%)
    const currentSeason = this.getCurrentSeason();
    const seasonalGarments = analytics.seasonalPatterns[currentSeason] || [];
    if (seasonalGarments.includes(garmentType)) {
      score += 30;
    }

    // Recency bonus (30%)
    score += 30; // Simplified - would check order dates in production

    return Math.round(score);
  }

  /**
   * Calculate recommendation score for tailor
   */
  private calculateTailorScore(tailor: any, analytics: OrderAnalytics): number {
    let score = 0;

    // Specialization match (40%)
    const userTopGarments = Object.keys(analytics.garmentTypeFrequency).slice(0, 3);
    const matchingSpecs = (tailor.specializations || []).filter((spec: string) =>
      userTopGarments.includes(spec)
    );
    score += (matchingSpecs.length / Math.max(userTopGarments.length, 1)) * 40;

    // Rating (30%)
    score += (tailor.rating / 5) * 30;

    // Price range match (20%)
    if (tailor.base_price && Math.abs(tailor.base_price - analytics.avgOrderValue) <= analytics.avgOrderValue * 0.2) {
      score += 20;
    }

    // Location preference (10%)
    score += 10; // Simplified - would check user's preferred regions

    return Math.round(score);
  }

  /**
   * Calculate recommendation score for fabric
   */
  private calculateFabricScore(fabric: string, analytics: OrderAnalytics): number {
    let score = 0;

    // Fabric preference match (40%)
    const fabricPreference = analytics.fabricPreferences[fabric] || 0;
    const maxPreference = Math.max(...Object.values(analytics.fabricPreferences), 1);
    score += (fabricPreference / maxPreference) * 40;

    // Seasonal relevance (30%)
    const currentSeason = this.getCurrentSeason();
    const seasonalFabrics = this.getSeasonalFabrics(currentSeason);
    if (seasonalFabrics.includes(fabric)) {
      score += 30;
    }

    // Trend factor (30%)
    score += 30; // Simplified - would check current trends

    return Math.round(score);
  }

  /**
   * Get popular garments for new users
   */
  private async getPopularGarmentRecommendations(limit: number): Promise<Recommendation[]> {
    const popularGarments = [
      { type: 'Traditional Kente Outfit', reason: 'Most popular for special occasions' },
      { type: 'Custom Suit', reason: 'Perfect for professional events' },
      { type: 'Casual Shirt', reason: 'Everyday essential' },
      { type: 'Traditional Dress', reason: 'Elegant and timeless' },
      { type: 'Trousers', reason: 'Versatile wardrobe staple' },
    ];

    return popularGarments.slice(0, limit).map((garment, index) => ({
      id: `popular-garment-${index}`,
      type: 'garment' as RecommendationType,
      itemId: garment.type,
      score: 100 - index * 10,
      reason: garment.reason,
      metadata: {
        garmentType: garment.type,
        isPopular: true,
      },
    }));
  }

  /**
   * Get complementary garments based on order history
   */
  private getComplementaryGarments(garmentFrequency: Record<string, number>): string[] {
    const complementaryPairs: Record<string, string[]> = {
      'Custom Suit': ['Dress Shirt', 'Tie', 'Waistcoat'],
      'Trousers': ['Shirt', 'Blazer'],
      'Traditional Kente Outfit': ['Traditional Accessories', 'Head Wrap'],
      'Dress': ['Jacket', 'Shawl'],
      'Shirt': ['Trousers', 'Jacket'],
    };

    const complementary: string[] = [];
    for (const [garment, frequency] of Object.entries(garmentFrequency)) {
      if (complementaryPairs[garment]) {
        complementary.push(...complementaryPairs[garment]);
      }
    }

    // Remove duplicates
    return Array.from(new Set(complementary));
  }

  /**
   * Get current season
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  /**
   * Get seasonal fabric recommendations
   */
  private getSeasonalFabrics(season: string): string[] {
    const seasonalFabrics: Record<string, string[]> = {
      spring: ['Cotton', 'Linen', 'Light Wool'],
      summer: ['Linen', 'Cotton', 'Seersucker'],
      fall: ['Wool', 'Tweed', 'Corduroy'],
      winter: ['Wool', 'Velvet', 'Heavy Cotton'],
    };

    return seasonalFabrics[season] || seasonalFabrics.spring;
  }

  /**
   * Track recommendation engagement
   */
  async trackEngagement(
    userId: string,
    recommendationId: string,
    action: RecommendationAction
  ): Promise<void> {
    // In production, this would log to an analytics table for ML training
    console.log('Recommendation engagement:', {
      userId,
      recommendationId,
      action,
      timestamp: new Date().toISOString(),
    });

    // Future: Store in recommendation_feedback table for ML improvements
  }

  /**
   * Refresh analytics for a user (called after order completion)
   */
  async refreshUserAnalytics(userId: string): Promise<OrderAnalytics> {
    return orderAnalyticsRepository.computeAnalytics(userId);
  }
}

export const recommendationEngineService = new RecommendationEngineService();
