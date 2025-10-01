/**
 * Tailor Group Order Repository
 * Data access layer for tailor group order operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  EnhancedGroupOrder, 
  GroupOrderStatus,
  TailorGroupCoordination,
  DesignSuggestion,
  ProductionSchedule,
  FabricAllocation
} from '@sew4mi/shared/types/group-order';

export class TailorGroupOrderRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all group orders assigned to a tailor
   */
  async getAssignedGroupOrders(
    tailorId: string,
    filters?: {
      status?: GroupOrderStatus;
      eventType?: string;
    }
  ): Promise<EnhancedGroupOrder[]> {
    let query = this.supabase
      .from('group_orders')
      .select(`
        *,
        group_order_items (
          id,
          order_id,
          family_member_profile_id,
          family_member_name,
          garment_type,
          individual_discount,
          delivery_priority,
          payment_responsibility,
          individual_amount,
          discounted_amount,
          status,
          progress_percentage,
          estimated_delivery,
          actual_delivery,
          created_at,
          updated_at
        ),
        tailor_group_coordination (
          total_fabric_needed,
          fabric_buffer_percentage,
          production_priority,
          estimated_completion_date,
          coordination_notes
        )
      `)
      .eq('tailor_id', tailorId)
      .order('event_date', { ascending: true, nullsFirst: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    return this.transformToEnhancedGroupOrders(data || []);
  }

  /**
   * Get single group order with full details
   */
  async getGroupOrderById(groupOrderId: string, tailorId: string): Promise<EnhancedGroupOrder | null> {
    const { data, error } = await this.supabase
      .from('group_orders')
      .select(`
        *,
        group_order_items (*),
        tailor_group_coordination (*),
        design_suggestions (*),
        production_schedules (*),
        fabric_allocations (*)
      `)
      .eq('id', groupOrderId)
      .eq('tailor_id', tailorId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const enhanced = this.transformToEnhancedGroupOrders([data]);
    return enhanced[0] || null;
  }

  /**
   * Get tailor group coordination data
   */
  async getCoordination(groupOrderId: string): Promise<TailorGroupCoordination | null> {
    const { data, error } = await this.supabase
      .from('tailor_group_coordination')
      .select('*')
      .eq('group_order_id', groupOrderId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  }

  /**
   * Upsert coordination data
   */
  async upsertCoordination(
    groupOrderId: string,
    tailorId: string,
    coordination: Partial<TailorGroupCoordination>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('tailor_group_coordination')
      .upsert({
        group_order_id: groupOrderId,
        tailor_id: tailorId,
        ...coordination,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Get design suggestions for group order
   */
  async getDesignSuggestions(groupOrderId: string): Promise<DesignSuggestion[]> {
    const { data, error } = await this.supabase
      .from('design_suggestions')
      .select('*')
      .eq('group_order_id', groupOrderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create design suggestion
   */
  async createDesignSuggestion(
    groupOrderId: string,
    tailorId: string,
    suggestion: Omit<DesignSuggestion, 'id' | 'created_at'>
  ): Promise<DesignSuggestion> {
    const { data, error } = await this.supabase
      .from('design_suggestions')
      .insert({
        group_order_id: groupOrderId,
        tailor_id: tailorId,
        ...suggestion,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get production schedule
   */
  async getProductionSchedule(groupOrderId: string): Promise<ProductionSchedule | null> {
    const { data, error } = await this.supabase
      .from('production_schedules')
      .select('*')
      .eq('group_order_id', groupOrderId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Upsert production schedule
   */
  async upsertProductionSchedule(
    schedule: Partial<ProductionSchedule>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('production_schedules')
      .upsert({
        ...schedule,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Get fabric allocations
   */
  async getFabricAllocations(groupOrderId: string): Promise<FabricAllocation[]> {
    const { data, error } = await this.supabase
      .from('fabric_allocations')
      .select('*')
      .eq('group_order_id', groupOrderId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Upsert fabric allocation
   */
  async upsertFabricAllocation(allocation: Partial<FabricAllocation>): Promise<void> {
    const { error } = await this.supabase
      .from('fabric_allocations')
      .upsert({
        ...allocation,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Get coordination checklist
   */
  async getCoordinationChecklist(groupOrderId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('coordination_checklists')
      .select('*')
      .eq('group_order_id', groupOrderId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Upsert coordination checklist
   */
  async upsertCoordinationChecklist(
    groupOrderId: string,
    checklist: any
  ): Promise<void> {
    const { error } = await this.supabase
      .from('coordination_checklists')
      .upsert({
        group_order_id: groupOrderId,
        checklist_items: checklist.checklistItems,
        overall_notes: checklist.overallNotes,
        coordination_photos: checklist.coordinationPhotos,
        approved_for_completion: checklist.approvedForCompletion,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Transform raw data to EnhancedGroupOrder format
   */
  private transformToEnhancedGroupOrders(data: any[]): EnhancedGroupOrder[] {
    return data.map((order: any) => {
      const items = order.group_order_items || [];
      
      const totalItems = items.length;
      const completedItems = items.filter((i: any) => i.status === 'COMPLETED').length;
      const inProgressItems = items.filter((i: any) => 
        ['IN_PROGRESS', 'AWAITING_FITTING', 'AWAITING_FINAL_PAYMENT'].includes(i.status)
      ).length;
      const pendingItems = items.filter((i: any) => 
        ['PENDING', 'AWAITING_DEPOSIT', 'DEPOSIT_RECEIVED'].includes(i.status)
      ).length;
      const readyForDelivery = items.filter((i: any) => i.status === 'READY_FOR_DELIVERY').length;
      
      const overallProgressPercentage = totalItems > 0
        ? items.reduce((sum: number, item: any) => sum + (item.progress_percentage || 0), 0) / totalItems
        : 0;

      return {
        ...order,
        items,
        progressSummary: {
          totalItems,
          completedItems,
          inProgressItems,
          readyForDelivery,
          pendingItems,
          overallProgressPercentage,
          nextGroupMilestone: completedItems === totalItems ? 'All Complete' : 'In Progress'
        }
      };
    });
  }
}

