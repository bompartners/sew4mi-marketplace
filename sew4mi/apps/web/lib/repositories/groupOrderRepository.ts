/**
 * Group Order Repository
 * Data access layer for group orders following repository pattern
 */

import { Repository } from '@sew4mi/shared/types/repository';
import type { DbClient } from '@sew4mi/shared/types/repository';

/**
 * Database row type for group_orders table
 */
interface GroupOrderRow {
  id: string;
  group_name: string;
  organizer_id: string;
  event_type: string | null;
  event_date: string | null;
  total_participants: number;
  total_orders: number;
  group_discount_percentage: number;
  status: string;
  whatsapp_group_id: string | null;
  notes: string | null;
  bulk_discount_percentage: number;
  total_original_amount: number;
  total_discounted_amount: number;
  payment_mode: string;
  delivery_strategy: string;
  shared_fabric: boolean;
  fabric_type: string | null;
  fabric_color: string | null;
  fabric_pattern: string | null;
  total_yardage: number | null;
  cost_per_yard: number | null;
  total_fabric_cost: number | null;
  preferred_vendor: string | null;
  fabric_lot: string | null;
  fabric_source: string | null;
  coordination_notes: string | null;
  tailor_id: string | null;
  estimated_completion_date: string | null;
  group_order_number: string | null;
  completed_items: number;
  in_progress_items: number;
  ready_for_delivery: number;
  pending_items: number;
  overall_progress_percentage: number;
  estimated_days_remaining: number | null;
  next_group_milestone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for managing group order data access
 */
export class GroupOrderRepository extends Repository<GroupOrderRow> {
  constructor(client: DbClient) {
    super(client, 'group_orders');
  }

  /**
   * Find group order by ID
   * @param id Group order ID
   * @returns Group order data or null
   */
  async findById(id: string): Promise<GroupOrderRow | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch group order: ${error.message}`);
    }

    return data;
  }

  /**
   * Find all group orders for a specific user
   * @param userId User ID of the organizer
   * @returns Array of group orders
   */
  async findByOrganizer(userId: string): Promise<GroupOrderRow[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch group orders: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new group order
   * @param orderData Group order data
   * @returns Created group order
   */
  async create(orderData: Partial<GroupOrderRow>): Promise<GroupOrderRow> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(orderData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create group order: ${error?.message}`);
    }

    return data;
  }

  /**
   * Update group order
   * @param id Group order ID
   * @param updates Partial updates
   * @returns Updated group order
   */
  async update(id: string, updates: Partial<GroupOrderRow>): Promise<GroupOrderRow> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update group order: ${error?.message}`);
    }

    return data;
  }

  /**
   * Delete a group order
   * @param id Group order ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete group order: ${error.message}`);
    }
  }

  /**
   * Get count of group orders
   * @returns Total count
   */
  async count(): Promise<number> {
    const { count, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count group orders: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Find all items for a group order
   * @param groupOrderId Group order ID
   * @returns Array of group order items
   */
  async findItems(groupOrderId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('group_order_items')
      .select('*')
      .eq('group_order_id', groupOrderId);

    if (error) {
      throw new Error(`Failed to fetch group order items: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find payment tracking for a group order
   * @param groupOrderId Group order ID
   * @returns Array of payment tracking records
   */
  async findPaymentTracking(groupOrderId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('group_payment_tracking')
      .select('*')
      .eq('group_order_id', groupOrderId);

    if (error) {
      throw new Error(`Failed to fetch payment tracking: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find delivery schedules for a group order
   * @param groupOrderId Group order ID
   * @returns Array of delivery schedules
   */
  async findDeliverySchedules(groupOrderId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('group_delivery_schedules')
      .select('*')
      .eq('group_order_id', groupOrderId);

    if (error) {
      throw new Error(`Failed to fetch delivery schedules: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a group order item
   * @param itemData Group order item data
   * @returns Created item
   */
  async createItem(itemData: any): Promise<any> {
    const { data, error } = await this.client
      .from('group_order_items')
      .insert(itemData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create group order item: ${error?.message}`);
    }

    return data;
  }

  /**
   * Update group order progress summary
   * @param groupOrderId Group order ID
   * @param progressData Progress data
   */
  async updateProgress(groupOrderId: string, progressData: {
    completed_items: number;
    in_progress_items: number;
    ready_for_delivery: number;
    pending_items: number;
    overall_progress_percentage: number;
  }): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        ...progressData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupOrderId);

    if (error) {
      throw new Error(`Failed to update group order progress: ${error.message}`);
    }
  }

  /**
   * Get all data for a group order (for findAll)
   * @returns Array of group orders
   */
  async findAll(): Promise<GroupOrderRow[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch group orders: ${error.message}`);
    }

    return data || [];
  }
}

