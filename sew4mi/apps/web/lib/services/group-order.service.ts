/**
 * Group Order Management Service
 * Handles business logic for group orders, bulk discounts, and coordination
 * 
 * @remarks
 * This service follows the repository pattern for data access and implements
 * comprehensive business logic for group order management including bulk discounts,
 * fabric coordination, and payment tracking.
 */

import { createClient as createServerSupabaseClient } from '../supabase/server';
import { GroupOrderRepository } from '../repositories/groupOrderRepository';
import {
  EnhancedGroupOrder,
  GroupOrderItem,
  GroupProgressSummary,
  CreateGroupOrderRequest,
  CreateGroupOrderResponse,
  CalculateBulkDiscountRequest,
  CalculateBulkDiscountResponse,
  GroupOrderSummary,
  GroupPaymentTracking,
  DeliverySchedule,
  GroupOrderStatus,
  PaymentMode,
} from '@sew4mi/shared/types/group-order';
import {
  calculateBulkDiscountPercentage,
  calculateFabricWithBuffer,
  getCoordinationSuggestions,
} from '@sew4mi/shared/constants/group-order';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing group orders
 * Uses repository pattern for data access and implements business logic
 */
export class GroupOrderService {
  private repository: GroupOrderRepository;

  /**
   * Creates a new GroupOrderService instance
   */
  constructor() {
    const supabase = createServerSupabaseClient();
    this.repository = new GroupOrderRepository(supabase);
  }
  
  /**
   * Create a new group order with multiple items
   * 
   * @param request - Group order creation request with family member selections
   * @param userId - User ID of the organizer
   * @returns Created group order with response and coordination suggestions
   * 
   * @example
   * ```typescript
   * const service = new GroupOrderService();
   * const response = await service.createGroupOrder({
   *   groupName: "Smith Family Wedding",
   *   eventType: EventType.WEDDING,
   *   eventDate: new Date('2025-12-15'),
   *   familyMemberProfiles: [
   *     { profileId: 'profile_123', garmentType: 'Kente Gown' },
   *     { profileId: 'profile_456', garmentType: 'Agbada' },
   *     { profileId: 'profile_789', garmentType: 'Children Dress' }
   *   ],
   *   sharedFabric: true,
   *   fabricDetails: {
   *     fabricType: 'KENTE',
   *     fabricColor: 'Royal Blue and Gold',
   *     totalYardage: 30,
   *     costPerYard: 50,
   *     fabricSource: 'TAILOR_SOURCED'
   *   },
   *   paymentMode: PaymentMode.SINGLE_PAYER,
   *   deliveryStrategy: DeliveryStrategy.ALL_TOGETHER
   * }, 'user_123');
   * 
   * if (response.success) {
   *   console.log(`Created order ${response.groupOrderNumber} with ${response.bulkDiscount}% discount`);
   * }
   * ```
   */
  async createGroupOrder(
    request: CreateGroupOrderRequest,
    userId: string
  ): Promise<CreateGroupOrderResponse> {
    try {
      // Calculate bulk discount
      const itemCount = request.familyMemberProfiles.length;
      const bulkDiscountPercentage = calculateBulkDiscountPercentage(itemCount);
      
      // Calculate fabric details if shared fabric
      let fabricTotalCost = 0;
      let fabricDetails = request.fabricDetails;
      if (request.sharedFabric && fabricDetails) {
        const totalYardageWithBuffer = calculateFabricWithBuffer(fabricDetails.totalYardage);
        fabricTotalCost = totalYardageWithBuffer * fabricDetails.costPerYard;
        fabricDetails = {
          ...fabricDetails,
          totalYardage: totalYardageWithBuffer,
        };
      }
      
      // Generate group order number
      const groupOrderNumber = `GRP${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Create group order record using repository
      const groupOrderData = {
        id: uuidv4(),
        group_name: request.groupName,
        organizer_id: userId,
        event_type: request.eventType || null,
        event_date: request.eventDate ? request.eventDate.toISOString() : null,
        total_participants: itemCount,
        total_orders: itemCount,
        group_discount_percentage: bulkDiscountPercentage,
        status: GroupOrderStatus.DRAFT,
        whatsapp_group_id: request.whatsappGroupId || null,
        notes: request.coordinationNotes || null,
        bulk_discount_percentage: bulkDiscountPercentage,
        payment_mode: request.paymentMode,
        delivery_strategy: request.deliveryStrategy,
        shared_fabric: request.sharedFabric,
        fabric_type: fabricDetails?.fabricType || null,
        fabric_color: fabricDetails?.fabricColor || null,
        fabric_pattern: fabricDetails?.fabricPattern || null,
        total_yardage: fabricDetails?.totalYardage || null,
        cost_per_yard: fabricDetails?.costPerYard || null,
        total_fabric_cost: fabricTotalCost || null,
        preferred_vendor: fabricDetails?.preferredVendor || null,
        fabric_source: fabricDetails?.fabricSource || null,
        coordination_notes: request.coordinationNotes || null,
        tailor_id: request.tailorId || null,
        group_order_number: groupOrderNumber,
        total_original_amount: 0, // Will be updated after order creation
        total_discounted_amount: 0, // Will be updated after order creation
        completed_items: 0,
        in_progress_items: 0,
        ready_for_delivery: 0,
        pending_items: itemCount,
        overall_progress_percentage: 0,
      };
      
      // Use repository instead of direct Supabase call
      const groupOrder = await this.repository.create(groupOrderData);
      
      // Get coordination suggestions for the event type
      const coordinationSuggestions = request.eventType
        ? getCoordinationSuggestions(request.eventType)
        : [];
      
      return {
        success: true,
        groupOrder: this.mapDatabaseToEnhancedGroupOrder(groupOrder),
        groupOrderNumber,
        orders: [], // Orders will be created separately
        bulkDiscount: bulkDiscountPercentage,
        coordinationSuggestions,
      };
      
    } catch (error) {
      console.error('Error creating group order:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to create group order'],
      };
    }
  }
  
  /**
   * Calculate bulk discount for a set of order amounts
   * @param request Bulk discount calculation request
   * @returns Discount breakdown
   */
  calculateBulkDiscount(request: CalculateBulkDiscountRequest): CalculateBulkDiscountResponse {
    const { itemCount, orderAmounts } = request;
    
    // Calculate discount percentage based on item count
    const discountPercentage = calculateBulkDiscountPercentage(itemCount);
    
    // Calculate original total
    const originalTotal = orderAmounts.reduce((sum, amount) => sum + amount, 0);
    
    // Calculate discount amount
    const discountAmount = (originalTotal * discountPercentage) / 100;
    
    // Calculate final total
    const finalTotal = originalTotal - discountAmount;
    
    // Calculate individual discounts
    const individualDiscounts = orderAmounts.map((amount, index) => {
      const discount = (amount * discountPercentage) / 100;
      return {
        orderId: `item_${index}`,
        originalAmount: amount,
        discount,
        finalAmount: amount - discount,
      };
    });
    
    return {
      originalTotal,
      discountPercentage,
      discountAmount,
      finalTotal,
      savings: discountAmount,
      individualDiscounts,
    };
  }
  
  /**
   * Get comprehensive group order summary with all details
   * 
   * @param groupOrderId - Group order ID
   * @returns Complete group order summary with items, payments, and delivery schedules
   * 
   * @example
   * ```typescript
   * const service = new GroupOrderService();
   * const summary = await service.getGroupOrderSummary('group_123');
   * 
   * if (summary) {
   *   console.log(`Group: ${summary.groupOrder.groupName}`);
   *   console.log(`Progress: ${summary.progressPercentage}%`);
   *   console.log(`Items: ${summary.items.length}`);
   * }
   * ```
   */
  async getGroupOrderSummary(groupOrderId: string): Promise<GroupOrderSummary | null> {
    try {
      // Use repository methods instead of direct Supabase calls
      const groupOrder = await this.repository.findById(groupOrderId);
      
      if (!groupOrder) {
        throw new Error('Group order not found');
      }
      
      // Fetch related data using repository
      const items = await this.repository.findItems(groupOrderId);
      const paymentTracking = await this.repository.findPaymentTracking(groupOrderId);
      const deliverySchedules = await this.repository.findDeliverySchedules(groupOrderId);
      
      return {
        groupOrder: this.mapDatabaseToEnhancedGroupOrder(groupOrder),
        items: items.map(item => this.mapDatabaseToGroupOrderItem(item)),
        paymentTracking: paymentTracking.map(pt => this.mapDatabaseToPaymentTracking(pt)),
        deliverySchedules: deliverySchedules.map(ds => this.mapDatabaseToDeliverySchedule(ds)),
        progressPercentage: groupOrder.overall_progress_percentage || 0,
        nextMilestone: groupOrder.next_group_milestone || undefined,
      };
      
    } catch (error) {
      console.error('Error fetching group order summary:', error);
      return null;
    }
  }
  
  /**
   * Update group order progress based on item updates
   * Calculates aggregate progress from all items and updates the group order
   * 
   * @param groupOrderId - Group order ID
   * @returns Updated progress summary or null on error
   * 
   * @example
   * ```typescript
   * const service = new GroupOrderService();
   * const progress = await service.updateGroupOrderProgress('group_123');
   * 
   * if (progress) {
   *   console.log(`${progress.completedItems}/${progress.totalItems} items completed`);
   *   console.log(`Overall progress: ${progress.overallProgressPercentage}%`);
   * }
   * ```
   */
  async updateGroupOrderProgress(groupOrderId: string): Promise<GroupProgressSummary | null> {
    try {
      // Get all items using repository
      const items = await this.repository.findItems(groupOrderId);
      
      if (!items || items.length === 0) {
        throw new Error('No items found for group order');
      }
      
      // Calculate progress summary
      const totalItems = items.length;
      const completedItems = items.filter(item => 
        ['COMPLETED', 'DELIVERED'].includes(item.status)
      ).length;
      const inProgressItems = items.filter(item =>
        ['IN_PROGRESS', 'IN_PRODUCTION', 'FITTING_READY'].includes(item.status)
      ).length;
      const readyForDelivery = items.filter(item =>
        item.status === 'READY_FOR_DELIVERY'
      ).length;
      const pendingItems = items.filter(item =>
        ['PENDING', 'DRAFT', 'DEPOSIT_PAID'].includes(item.status)
      ).length;
      
      // Calculate overall progress percentage
      const overallProgressPercentage = items.reduce((sum, item) => 
        sum + (item.progress_percentage || 0), 0
      ) / totalItems;
      
      // Update group order using repository
      await this.repository.updateProgress(groupOrderId, {
        completed_items: completedItems,
        in_progress_items: inProgressItems,
        ready_for_delivery: readyForDelivery,
        pending_items: pendingItems,
        overall_progress_percentage: overallProgressPercentage,
      });
      
      return {
        totalItems,
        completedItems,
        inProgressItems,
        readyForDelivery,
        pendingItems,
        overallProgressPercentage,
      };
      
    } catch (error) {
      console.error('Error updating group order progress:', error);
      return null;
    }
  }
  
  /**
   * Add item to existing group order
   * 
   * @param groupOrderId - Group order ID
   * @param orderItemData - Group order item data without ID and timestamps
   * @returns Created group order item or null on error
   * 
   * @example
   * ```typescript
   * const service = new GroupOrderService();
   * const item = await service.addItemToGroupOrder('group_123', {
   *   orderId: 'order_456',
   *   familyMemberProfileId: 'profile_789',
   *   familyMemberName: 'Kwame - Son',
   *   garmentType: 'Children Traditional Wear',
   *   individualDiscount: 15,
   *   deliveryPriority: 3,
   *   paymentResponsibility: 'user_123',
   *   individualAmount: 150,
   *   discountedAmount: 127.50,
   *   status: 'PENDING',
   *   progressPercentage: 0,
   *   estimatedDelivery: new Date('2025-12-01')
   * });
   * ```
   */
  async addItemToGroupOrder(
    groupOrderId: string,
    orderItemData: Omit<GroupOrderItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GroupOrderItem | null> {
    try {
      const itemData = {
        id: uuidv4(),
        group_order_id: groupOrderId,
        order_id: orderItemData.orderId,
        family_member_profile_id: orderItemData.familyMemberProfileId,
        family_member_name: orderItemData.familyMemberName,
        garment_type: orderItemData.garmentType,
        individual_discount: orderItemData.individualDiscount,
        delivery_priority: orderItemData.deliveryPriority,
        payment_responsibility: orderItemData.paymentResponsibility,
        coordinated_design_notes: orderItemData.coordinatedDesignNotes || null,
        individual_amount: orderItemData.individualAmount,
        discounted_amount: orderItemData.discountedAmount,
        status: orderItemData.status,
        progress_percentage: orderItemData.progressPercentage,
        estimated_delivery: orderItemData.estimatedDelivery.toISOString(),
        actual_delivery: orderItemData.actualDelivery?.toISOString() || null,
      };
      
      // Use repository to create item
      const item = await this.repository.createItem(itemData);
      
      // Update group order totals
      await this.updateGroupOrderTotals(groupOrderId);
      
      return this.mapDatabaseToGroupOrderItem(item);
      
    } catch (error) {
      console.error('Error adding item to group order:', error);
      return null;
    }
  }
  
  /**
   * Update group order totals based on items
   * Private helper method to recalculate totals after items change
   * 
   * @param groupOrderId - Group order ID
   */
  private async updateGroupOrderTotals(groupOrderId: string): Promise<void> {
    try {
      // Get all items using repository
      const items = await this.repository.findItems(groupOrderId);
      
      if (!items) {
        throw new Error('Failed to fetch items');
      }
      
      // Calculate totals
      const totalOriginalAmount = items.reduce((sum, item) => sum + item.individual_amount, 0);
      const totalDiscountedAmount = items.reduce((sum, item) => sum + item.discounted_amount, 0);
      const totalOrders = items.length;
      
      // Update group order using repository
      await this.repository.update(groupOrderId, {
        total_original_amount: totalOriginalAmount,
        total_discounted_amount: totalDiscountedAmount,
        total_orders: totalOrders,
      });
      
    } catch (error) {
      console.error('Error updating group order totals:', error);
    }
  }
  
  /**
   * Get all group orders for a user
   * 
   * @param userId - User ID of the organizer
   * @returns Array of enhanced group orders sorted by creation date
   * 
   * @example
   * ```typescript
   * const service = new GroupOrderService();
   * const orders = await service.getUserGroupOrders('user_123');
   * 
   * orders.forEach(order => {
   *   console.log(`${order.groupName}: ${order.totalOrders} items, ${order.status}`);
   * });
   * ```
   */
  async getUserGroupOrders(userId: string): Promise<EnhancedGroupOrder[]> {
    try {
      // Use repository to find by organizer
      const groupOrders = await this.repository.findByOrganizer(userId);
      
      return groupOrders.map(go => this.mapDatabaseToEnhancedGroupOrder(go));
      
    } catch (error) {
      console.error('Error fetching user group orders:', error);
      return [];
    }
  }
  
  // Helper mapping functions
  
  private mapDatabaseToEnhancedGroupOrder(data: any): EnhancedGroupOrder {
    return {
      id: data.id,
      groupName: data.group_name,
      organizerId: data.organizer_id,
      eventType: data.event_type,
      eventDate: data.event_date ? new Date(data.event_date) : null,
      totalParticipants: data.total_participants,
      totalOrders: data.total_orders,
      groupDiscountPercentage: data.group_discount_percentage,
      status: data.status as GroupOrderStatus,
      whatsappGroupId: data.whatsapp_group_id,
      notes: data.notes,
      bulkDiscountPercentage: data.bulk_discount_percentage || 0,
      totalOriginalAmount: data.total_original_amount || 0,
      totalDiscountedAmount: data.total_discounted_amount || 0,
      paymentMode: data.payment_mode as PaymentMode,
      deliveryStrategy: data.delivery_strategy,
      fabricDetails: data.shared_fabric ? {
        fabricType: data.fabric_type,
        fabricColor: data.fabric_color,
        fabricPattern: data.fabric_pattern,
        totalYardage: data.total_yardage,
        costPerYard: data.cost_per_yard,
        totalFabricCost: data.total_fabric_cost,
        preferredVendor: data.preferred_vendor,
        fabricLot: data.fabric_lot,
        fabricSource: data.fabric_source,
      } : undefined,
      coordinationNotes: data.coordination_notes,
      progressSummary: {
        totalItems: data.total_orders,
        completedItems: data.completed_items || 0,
        inProgressItems: data.in_progress_items || 0,
        readyForDelivery: data.ready_for_delivery || 0,
        pendingItems: data.pending_items || 0,
        overallProgressPercentage: data.overall_progress_percentage || 0,
        estimatedDaysRemaining: data.estimated_days_remaining,
        nextGroupMilestone: data.next_group_milestone,
      },
      tailorId: data.tailor_id,
      estimatedCompletionDate: data.estimated_completion_date ? new Date(data.estimated_completion_date) : undefined,
      groupOrderNumber: data.group_order_number,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
  
  private mapDatabaseToGroupOrderItem(data: any): GroupOrderItem {
    return {
      id: data.id,
      groupOrderId: data.group_order_id,
      orderId: data.order_id,
      familyMemberProfileId: data.family_member_profile_id,
      familyMemberName: data.family_member_name,
      garmentType: data.garment_type,
      individualDiscount: data.individual_discount,
      deliveryPriority: data.delivery_priority,
      paymentResponsibility: data.payment_responsibility,
      coordinatedDesignNotes: data.coordinated_design_notes,
      individualAmount: data.individual_amount,
      discountedAmount: data.discounted_amount,
      status: data.status,
      progressPercentage: data.progress_percentage,
      estimatedDelivery: new Date(data.estimated_delivery),
      actualDelivery: data.actual_delivery ? new Date(data.actual_delivery) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
  
  private mapDatabaseToPaymentTracking(data: any): GroupPaymentTracking {
    return {
      id: data.id,
      groupOrderId: data.group_order_id,
      payerId: data.payer_id,
      payerName: data.payer_name,
      responsibility: data.responsibility,
      totalResponsibleAmount: data.total_responsible_amount,
      paidAmount: data.paid_amount,
      outstandingAmount: data.outstanding_amount,
      status: data.status,
      depositPaid: data.deposit_paid,
      fittingPaid: data.fitting_paid,
      finalPaid: data.final_paid,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
  
  private mapDatabaseToDeliverySchedule(data: any): DeliverySchedule {
    return {
      id: data.id,
      groupOrderId: data.group_order_id,
      orderItems: data.order_items,
      scheduledDate: new Date(data.scheduled_date),
      actualDate: data.actual_date ? new Date(data.actual_date) : undefined,
      status: data.status,
      notes: data.notes,
      notificationSent: data.notification_sent,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

// Export singleton instance
export const groupOrderService = new GroupOrderService();

