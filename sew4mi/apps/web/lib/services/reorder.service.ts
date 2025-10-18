/**
 * Service for Story 4.3: Reorder System Business Logic
 */

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  ReorderRequest,
  ReorderModifications,
  ReorderPreview,
  ReorderValidation,
  TailorAvailability,
  ReorderPricingBreakdown,
} from '@sew4mi/shared/types';

export class ReorderService {
  /**
   * Create a reorder preview for an existing order
   */
  async previewReorder(userId: string, orderId: string, modifications?: ReorderModifications): Promise<ReorderPreview> {
    // Get original order
    const originalOrder = await this.getOrderById(orderId, userId);
    if (!originalOrder) {
      throw new Error('Order not found');
    }

    // Validate order can be reordered
    const validation = await this.validateReorder(orderId, userId);
    if (!validation.isValid) {
      throw new Error(`Cannot reorder: ${validation.errors.join(', ')}`);
    }

    // Check tailor availability
    const tailorAvailability = await this.checkTailorAvailability(originalOrder.tailor_id);

    // Calculate pricing with modifications
    const pricing = await this.calculateReorderPricing(originalOrder, modifications);

    // Calculate estimated delivery
    const estimatedDelivery = await this.calculateEstimatedDelivery(
      originalOrder.tailor_id,
      originalOrder.garment_type
    );

    // Get tailor details
    const tailor = await this.getTailorDetails(originalOrder.tailor_id);

    return {
      order: {
        id: originalOrder.id,
        garmentType: originalOrder.garment_type,
        fabricChoice: modifications?.fabricChoice || originalOrder.fabric_details?.fabric || 'Unknown',
        colorChoice: modifications?.colorChoice,
        specialInstructions: modifications?.specialInstructions || originalOrder.special_instructions,
        measurementProfileId: modifications?.measurementProfileId || originalOrder.measurement_profile_id,
      },
      tailor: {
        id: tailor.id,
        businessName: tailor.business_name,
        availability: tailorAvailability,
      },
      estimatedDelivery,
      pricing,
    };
  }

  /**
   * Create a reorder from an existing order
   */
  async createReorder(userId: string, request: ReorderRequest): Promise<any> {
    const { orderId, modifications } = request;

    // Get original order
    const originalOrder = await this.getOrderById(orderId, userId);
    if (!originalOrder) {
      throw new Error('Order not found');
    }

    // Validate reorder
    const validation = await this.validateReorder(orderId, userId);
    if (!validation.isValid) {
      throw new Error(`Cannot reorder: ${validation.errors.join(', ')}`);
    }

    // Check tailor availability
    const tailorAvailability = await this.checkTailorAvailability(originalOrder.tailor_id);
    if (!tailorAvailability.available) {
      throw new Error(`Tailor is not available: ${tailorAvailability.reason}`);
    }

    // Calculate pricing
    const pricing = await this.calculateReorderPricing(originalOrder, modifications);

    // Calculate delivery date
    const estimatedDelivery = await this.calculateEstimatedDelivery(
      originalOrder.tailor_id,
      originalOrder.garment_type
    );

    // Create new order based on original
    const supabase = await createServerSupabaseClient();

    const newOrderData = {
      customer_id: userId,
      tailor_id: originalOrder.tailor_id,
      measurement_profile_id: modifications?.measurementProfileId || originalOrder.measurement_profile_id,
      garment_type: originalOrder.garment_type,
      style_preferences: originalOrder.style_preferences,
      fabric_details: modifications?.fabricChoice
        ? { ...originalOrder.fabric_details, fabric: modifications.fabricChoice }
        : originalOrder.fabric_details,
      quantity: originalOrder.quantity || 1,
      total_amount: pricing.totalAmount,
      deposit_amount: pricing.totalAmount * 0.3, // 30% deposit
      fitting_payment_amount: pricing.totalAmount * 0.3, // 30% fitting
      final_payment_amount: pricing.totalAmount * 0.4, // 40% final
      currency: originalOrder.currency || 'GHS',
      escrow_stage: 'DEPOSIT',
      escrow_balance: 0,
      delivery_method: originalOrder.delivery_method,
      delivery_address: originalOrder.delivery_address,
      delivery_date: estimatedDelivery.toISOString(),
      rush_order: false,
      special_instructions: modifications?.specialInstructions || originalOrder.special_instructions,
      reference_images: originalOrder.reference_images,
      status: 'PENDING',
      metadata: {
        is_reorder: true,
        original_order_id: orderId,
        reorder_modifications: modifications || {},
      },
    };

    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert(newOrderData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create reorder: ${error.message}`);
    }

    return newOrder;
  }

  /**
   * Validate if an order can be reordered
   */
  async validateReorder(orderId: string, userId: string): Promise<ReorderValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get order
    const order = await this.getOrderById(orderId, userId);
    if (!order) {
      errors.push('Order not found');
      return { isValid: false, errors, warnings };
    }

    // Check order belongs to user
    if (order.customer_id !== userId) {
      errors.push('Order does not belong to you');
    }

    // Check order is completed
    if (order.status !== 'COMPLETED') {
      errors.push('Only completed orders can be reordered');
    }

    // Check measurement profile still exists
    if (order.measurement_profile_id) {
      const profileExists = await this.checkMeasurementProfileExists(order.measurement_profile_id);
      if (!profileExists) {
        warnings.push('Original measurement profile no longer exists. You will need to select a new one.');
      }
    }

    // Check tailor still active
    const tailorActive = await this.checkTailorActive(order.tailor_id);
    if (!tailorActive) {
      warnings.push('Original tailor is no longer accepting orders. Alternative tailors will be suggested.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check tailor availability
   */
  private async checkTailorAvailability(tailorId: string): Promise<TailorAvailability> {
    const supabase = await createServerSupabaseClient();

    // Get tailor profile
    const { data: tailor, error } = await supabase
      .from('tailor_profiles')
      .select('*')
      .eq('id', tailorId)
      .maybeSingle();

    if (error || !tailor) {
      return {
        available: false,
        reason: 'Tailor not found',
      };
    }

    // Check verification status
    if (tailor.verification_status !== 'VERIFIED') {
      return {
        available: false,
        reason: 'Tailor is not currently verified',
      };
    }

    // Check if accepting orders
    if (!tailor.is_accepting_orders) {
      const nextAvailableDate = new Date();
      nextAvailableDate.setDate(nextAvailableDate.getDate() + 14); // Estimate 2 weeks

      return {
        available: false,
        reason: 'Tailor is not currently accepting new orders',
        nextAvailableDate,
      };
    }

    // Check capacity (simplified - in production would check actual workload)
    const { count: activeOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tailor_id', tailorId)
      .in('status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS']);

    const maxCapacity = tailor.max_concurrent_orders || 10;
    if ((activeOrders || 0) >= maxCapacity) {
      const nextAvailableDate = new Date();
      nextAvailableDate.setDate(nextAvailableDate.getDate() + 7);

      return {
        available: false,
        reason: 'Tailor is at capacity',
        nextAvailableDate,
      };
    }

    return {
      available: true,
    };
  }

  /**
   * Calculate pricing for reorder with modifications
   */
  private async calculateReorderPricing(
    originalOrder: any,
    modifications?: ReorderModifications
  ): Promise<ReorderPricingBreakdown> {
    let basePrice = originalOrder.total_amount;
    let fabricUpcharge = 0;
    let modificationFees = 0;

    // Fabric upcharge if changed to premium fabric
    if (modifications?.fabricChoice) {
      const fabricPrice = await this.getFabricPrice(modifications.fabricChoice);
      const originalFabricPrice = await this.getFabricPrice(
        originalOrder.fabric_details?.fabric || ''
      );
      if (fabricPrice > originalFabricPrice) {
        fabricUpcharge = fabricPrice - originalFabricPrice;
      }
    }

    // Modification fees (if measurement profile changed)
    if (modifications?.measurementProfileId &&
        modifications.measurementProfileId !== originalOrder.measurement_profile_id) {
      modificationFees = basePrice * 0.05; // 5% fee for new measurements
    }

    const totalAmount = basePrice + fabricUpcharge + modificationFees;

    return {
      basePrice,
      fabricUpcharge: fabricUpcharge > 0 ? fabricUpcharge : undefined,
      modificationFees: modificationFees > 0 ? modificationFees : undefined,
      totalAmount,
    };
  }

  /**
   * Calculate estimated delivery date
   */
  private async calculateEstimatedDelivery(tailorId: string, garmentType: string): Promise<Date> {
    const supabase = await createServerSupabaseClient();

    // Get tailor's average turnaround time
    const { data: tailor } = await supabase
      .from('tailor_profiles')
      .select('avg_turnaround_days')
      .eq('id', tailorId)
      .maybeSingle();

    const turnaroundDays = tailor?.avg_turnaround_days || 14; // Default 2 weeks

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + turnaroundDays);

    return deliveryDate;
  }

  /**
   * Get order by ID
   */
  private async getOrderById(orderId: string, userId: string): Promise<any> {
    const supabase = await createServerSupabaseClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('customer_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return order;
  }

  /**
   * Get tailor details
   */
  private async getTailorDetails(tailorId: string): Promise<any> {
    const supabase = await createServerSupabaseClient();

    const { data: tailor, error } = await supabase
      .from('tailor_profiles')
      .select('*')
      .eq('id', tailorId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch tailor: ${error.message}`);
    }

    return tailor;
  }

  /**
   * Check if measurement profile exists
   */
  private async checkMeasurementProfileExists(profileId: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('measurement_profiles')
      .select('id')
      .eq('id', profileId)
      .maybeSingle();

    return !error && data !== null;
  }

  /**
   * Check if tailor is active
   */
  private async checkTailorActive(tailorId: string): Promise<boolean> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('tailor_profiles')
      .select('verification_status, is_accepting_orders')
      .eq('id', tailorId)
      .maybeSingle();

    return !error && data?.verification_status === 'VERIFIED' && data?.is_accepting_orders === true;
  }

  /**
   * Get fabric price (simplified - in production would fetch from fabric catalog)
   */
  private async getFabricPrice(fabricName: string): Promise<number> {
    // In production, this would query a fabrics catalog table
    // For now, return default prices based on common fabrics
    const fabricPrices: Record<string, number> = {
      cotton: 50,
      linen: 75,
      silk: 150,
      wool: 100,
      polyester: 40,
      velvet: 120,
      satin: 90,
      denim: 60,
    };

    const fabricKey = fabricName.toLowerCase();
    return fabricPrices[fabricKey] || 50; // Default price
  }

  /**
   * Get alternative tailors if original is unavailable
   */
  async getAlternativeTailors(originalTailorId: string, garmentType: string, limit: number = 3): Promise<any[]> {
    const supabase = await createServerSupabaseClient();

    // Get original tailor's specializations
    const { data: originalTailor } = await supabase
      .from('tailor_profiles')
      .select('specializations, city, region')
      .eq('id', originalTailorId)
      .maybeSingle();

    if (!originalTailor) {
      return [];
    }

    // Find tailors with similar specializations in same region
    const { data: alternativeTailors, error } = await supabase
      .from('tailor_profiles')
      .select('*')
      .neq('id', originalTailorId)
      .eq('verification_status', 'VERIFIED')
      .eq('is_accepting_orders', true)
      .eq('region', originalTailor.region)
      .overlaps('specializations', originalTailor.specializations || [])
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch alternative tailors:', error);
      return [];
    }

    return alternativeTailors || [];
  }
}

export const reorderService = new ReorderService();
