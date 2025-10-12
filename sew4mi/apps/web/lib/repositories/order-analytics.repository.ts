/**
 * Repository for Story 4.3: Order Analytics Data Access Layer
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { OrderAnalytics } from '@sew4mi/shared/types';

export class OrderAnalyticsRepository {
  /**
   * Get analytics for a user
   */
  async getUserAnalytics(userId: string): Promise<OrderAnalytics | null> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('order_analytics')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch order analytics: ${error.message}`);
    }

    return data ? this.mapDatabaseToModel(data) : null;
  }

  /**
   * Update or create analytics for a user
   */
  async upsertAnalytics(analytics: OrderAnalytics): Promise<OrderAnalytics> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('order_analytics')
      .upsert({
        user_id: analytics.userId,
        garment_type_frequency: analytics.garmentTypeFrequency,
        fabric_preferences: analytics.fabricPreferences,
        color_preferences: analytics.colorPreferences,
        avg_order_value: analytics.avgOrderValue,
        preferred_tailors: analytics.preferredTailors,
        seasonal_patterns: analytics.seasonalPatterns,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert order analytics: ${error.message}`);
    }

    return this.mapDatabaseToModel(data);
  }

  /**
   * Compute analytics from user's completed orders
   */
  async computeAnalytics(userId: string): Promise<OrderAnalytics> {
    const supabase = await createServerSupabaseClient();

    // Fetch all completed orders for the user
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .eq('status', 'COMPLETED');

    if (error) {
      throw new Error(`Failed to fetch orders for analytics: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      // Return empty analytics
      return {
        userId,
        garmentTypeFrequency: {},
        fabricPreferences: {},
        colorPreferences: {},
        avgOrderValue: 0,
        preferredTailors: [],
        seasonalPatterns: {},
        lastUpdated: new Date(),
      };
    }

    // Compute garment type frequency
    const garmentTypeFrequency: Record<string, number> = {};
    const fabricPreferences: Record<string, number> = {};
    const colorPreferences: Record<string, number> = {};
    const tailorCounts: Record<string, number> = {};
    const seasonalPatterns: Record<string, string[]> = {
      spring: [],
      summer: [],
      fall: [],
      winter: [],
    };
    let totalValue = 0;

    for (const order of orders) {
      // Garment type frequency
      const garmentType = order.garment_type || 'unknown';
      garmentTypeFrequency[garmentType] = (garmentTypeFrequency[garmentType] || 0) + 1;

      // Fabric preferences
      const fabric = order.fabric_choice || 'unknown';
      fabricPreferences[fabric] = (fabricPreferences[fabric] || 0) + 1;

      // Color preferences
      const color = order.color_choice || 'unknown';
      colorPreferences[color] = (colorPreferences[color] || 0) + 1;

      // Tailor counts
      const tailorId = order.tailor_id;
      if (tailorId) {
        tailorCounts[tailorId] = (tailorCounts[tailorId] || 0) + 1;
      }

      // Total value
      totalValue += order.total_amount || 0;

      // Seasonal patterns
      const season = this.getSeason(new Date(order.created_at));
      if (!seasonalPatterns[season].includes(garmentType)) {
        seasonalPatterns[season].push(garmentType);
      }
    }

    // Calculate average order value
    const avgOrderValue = orders.length > 0 ? totalValue / orders.length : 0;

    // Get top 3 preferred tailors
    const preferredTailors = Object.entries(tailorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tailorId]) => tailorId);

    const analytics: OrderAnalytics = {
      userId,
      garmentTypeFrequency,
      fabricPreferences,
      colorPreferences,
      avgOrderValue,
      preferredTailors,
      seasonalPatterns,
      lastUpdated: new Date(),
    };

    // Save computed analytics
    return this.upsertAnalytics(analytics);
  }

  /**
   * Check if analytics are stale (older than 24 hours)
   */
  async areAnalyticsStale(userId: string): Promise<boolean> {
    const analytics = await this.getUserAnalytics(userId);
    if (!analytics) return true;

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    return analytics.lastUpdated < twentyFourHoursAgo;
  }

  /**
   * Get season from date
   */
  private getSeason(date: Date): string {
    const month = date.getMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  /**
   * Map database row to OrderAnalytics model
   */
  private mapDatabaseToModel(row: any): OrderAnalytics {
    return {
      userId: row.user_id,
      garmentTypeFrequency: row.garment_type_frequency || {},
      fabricPreferences: row.fabric_preferences || {},
      colorPreferences: row.color_preferences || {},
      avgOrderValue: parseFloat(row.avg_order_value) || 0,
      preferredTailors: row.preferred_tailors || [],
      seasonalPatterns: row.seasonal_patterns || {},
      lastUpdated: new Date(row.last_updated),
    };
  }
}

export const orderAnalyticsRepository = new OrderAnalyticsRepository();
