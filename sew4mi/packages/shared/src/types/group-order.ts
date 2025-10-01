/**
 * Group Order Management types for the Sew4Mi platform
 * Enables family event coordination with bulk discounts and coordinated fabric selection
 */

import { FabricType } from './order-creation';
import { OrderStatus } from './index';

/**
 * Core GroupOrder interface - base structure for family/group event orders
 */
export interface GroupOrder {
  id: string;
  groupName: string;
  organizerId: string;
  eventType: EventType | null;
  eventDate: Date | null;
  totalParticipants: number;
  totalOrders: number;
  groupDiscountPercentage: number;
  status: GroupOrderStatus;
  whatsappGroupId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced GroupOrder with fabric coordination, bulk pricing, and delivery management
 * Extends base GroupOrder with comprehensive group order management capabilities
 */
export interface EnhancedGroupOrder extends GroupOrder {
  /** Bulk discount percentage applied to orders (3+ items) */
  bulkDiscountPercentage: number;
  
  /** Original total amount before bulk discount */
  totalOriginalAmount: number;
  
  /** Final total amount after bulk discount applied */
  totalDiscountedAmount: number;
  
  /** Payment mode for the group order */
  paymentMode: PaymentMode;
  
  /** Delivery strategy for completed items */
  deliveryStrategy: DeliveryStrategy;
  
  /** Shared fabric details for coordinated orders */
  fabricDetails?: FabricDetails;
  
  /** Coordination notes from organizer or tailor */
  coordinationNotes?: string;
  
  /** Progress summary across all orders in the group */
  progressSummary: GroupProgressSummary;
  
  /** Individual orders within this group */
  items?: GroupOrderItem[];
  
  /** Tailor assigned to the group order (if single tailor) */
  tailorId?: string;
  
  /** Estimated completion date for entire group order */
  estimatedCompletionDate?: Date;
  
  /** Group order number for reference */
  groupOrderNumber?: string;
}

/**
 * Individual order item within a group order
 */
export interface GroupOrderItem {
  /** Unique identifier for the group order item */
  id: string;
  
  /** Reference to the parent group order */
  groupOrderId: string;
  
  /** Reference to the individual order */
  orderId: string;
  
  /** Family member profile associated with this order */
  familyMemberProfileId: string;
  
  /** Family member's name for display */
  familyMemberName: string;
  
  /** Garment type for this order */
  garmentType: string;
  
  /** Individual discount applied to this specific item */
  individualDiscount: number;
  
  /** Priority order for delivery (1 = highest priority) */
  deliveryPriority: number;
  
  /** User ID responsible for payment of this item */
  paymentResponsibility: string;
  
  /** Coordinated design notes specific to this item */
  coordinatedDesignNotes?: string;
  
  /** Individual amount before discount */
  individualAmount: number;
  
  /** Amount after discount applied */
  discountedAmount: number;
  
  /** Current status of this individual order */
  status: OrderStatus;
  
  /** Progress percentage for this item */
  progressPercentage: number;
  
  /** Estimated delivery date for this item */
  estimatedDelivery: Date;
  
  /** Actual delivery date (if completed) */
  actualDelivery?: Date;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Fabric coordination details for shared fabric across group orders
 */
export interface FabricDetails {
  /** Type of fabric being used */
  fabricType: FabricType;
  
  /** Color of the fabric */
  fabricColor: string;
  
  /** Pattern or design on fabric */
  fabricPattern?: string;
  
  /** Total yardage needed for all orders */
  totalYardage: number;
  
  /** Cost per yard of fabric */
  costPerYard: number;
  
  /** Total fabric cost */
  totalFabricCost: number;
  
  /** Preferred fabric vendor */
  preferredVendor?: string;
  
  /** Fabric lot number for consistency tracking */
  fabricLot?: string;
  
  /** Whether fabric is customer-provided or tailor-sourced */
  fabricSource: 'CUSTOMER_PROVIDED' | 'TAILOR_SOURCED';
}

/**
 * Progress summary aggregating status across all group order items
 */
export interface GroupProgressSummary {
  /** Total number of items in the group order */
  totalItems: number;
  
  /** Number of completed items */
  completedItems: number;
  
  /** Number of items currently in progress */
  inProgressItems: number;
  
  /** Number of items ready for delivery */
  readyForDelivery: number;
  
  /** Number of items pending (not started) */
  pendingItems: number;
  
  /** Overall progress percentage across all items */
  overallProgressPercentage: number;
  
  /** Estimated days remaining until group completion */
  estimatedDaysRemaining?: number;
  
  /** Next milestone across the group */
  nextGroupMilestone?: string;
}

/**
 * Payment tracking for group orders with split or single payer support
 */
export interface GroupPaymentTracking {
  /** Unique identifier */
  id: string;
  
  /** Reference to group order */
  groupOrderId: string;
  
  /** User ID of the payer */
  payerId: string;
  
  /** Payer's name for display */
  payerName: string;
  
  /** Array of order IDs this payer is responsible for */
  responsibility: string[];
  
  /** Total amount this payer is responsible for */
  totalResponsibleAmount: number;
  
  /** Amount already paid by this payer */
  paidAmount: number;
  
  /** Outstanding amount to be paid */
  outstandingAmount: number;
  
  /** Payment status for this payer */
  status: PaymentStatus;
  
  /** Deposit amount paid */
  depositPaid: number;
  
  /** Fitting payment made */
  fittingPaid: number;
  
  /** Final payment made */
  finalPaid: number;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Delivery schedule for staggered delivery of completed items
 */
export interface DeliverySchedule {
  /** Unique identifier */
  id: string;
  
  /** Group order reference */
  groupOrderId: string;
  
  /** Order items in this delivery batch */
  orderItems: string[];
  
  /** Scheduled delivery date */
  scheduledDate: Date;
  
  /** Actual delivery date */
  actualDate?: Date;
  
  /** Delivery status */
  status: DeliveryStatus;
  
  /** Delivery notes */
  notes?: string;
  
  /** Notification sent status */
  notificationSent: boolean;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Tailor coordination for managing group orders
 */
export interface TailorGroupCoordination {
  /** Group order reference */
  groupOrderId: string;
  
  /** Tailor ID managing the group */
  tailorId: string;
  
  /** Design suggestions for coordination */
  designSuggestions: DesignSuggestion[];
  
  /** Fabric quantity calculations */
  fabricQuantityCalculation: FabricQuantityCalculation;
  
  /** Production schedule for group items */
  productionSchedule: ProductionScheduleItem[];
  
  /** Coordination notes from tailor */
  coordinationNotes?: string;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Design suggestion from tailor for coordinated outfits
 */
export interface DesignSuggestion {
  /** Unique identifier */
  id: string;
  
  /** Title of the suggestion */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** Category of suggestion */
  category: 'FABRIC' | 'COLOR' | 'PATTERN' | 'ACCESSORIES' | 'STYLE';
  
  /** Reference images */
  imageUrls?: string[];
  
  /** Applicable to specific order items */
  applicableItems?: string[];
  
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Fabric quantity calculation for bulk ordering
 */
export interface FabricQuantityCalculation {
  /** Total yards needed across all orders */
  totalYardsNeeded: number;
  
  /** Recommended purchase quantity (with buffer) */
  recommendedPurchaseQuantity: number;
  
  /** Buffer percentage applied */
  bufferPercentage: number;
  
  /** Individual allocations per order */
  individualAllocations: FabricAllocation[];
  
  /** Estimated waste */
  estimatedWaste: number;
}

/**
 * Fabric allocation for individual order
 */
export interface FabricAllocation {
  /** Order ID */
  orderId: string;
  
  /** Yards allocated */
  yardsAllocated: number;
  
  /** Garment type */
  garmentType: string;
}

/**
 * Production schedule item for group order management
 */
export interface ProductionScheduleItem {
  /** Order ID */
  orderId: string;
  
  /** Family member name */
  familyMemberName: string;
  
  /** Garment type */
  garmentType: string;
  
  /** Priority in production schedule */
  priority: number;
  
  /** Estimated start date */
  estimatedStartDate: Date;
  
  /** Estimated completion date */
  estimatedCompletionDate: Date;
  
  /** Dependencies on other orders */
  dependencies?: string[];
}

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Group order status lifecycle
 */
export enum GroupOrderStatus {
  /** Draft state - being created */
  DRAFT = 'DRAFT',
  
  /** Confirmed and awaiting deposit */
  CONFIRMED = 'CONFIRMED',
  
  /** Orders are being processed */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** Some items completed, others in progress */
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  
  /** All items completed */
  COMPLETED = 'COMPLETED',
  
  /** Group order cancelled */
  CANCELLED = 'CANCELLED',
}

/**
 * Payment mode for group orders
 */
export enum PaymentMode {
  /** Single person pays for entire group */
  SINGLE_PAYER = 'SINGLE_PAYER',
  
  /** Split payment among participants */
  SPLIT_PAYMENT = 'SPLIT_PAYMENT',
}

/**
 * Delivery strategy for completed items
 */
export enum DeliveryStrategy {
  /** All items delivered together when complete */
  ALL_TOGETHER = 'ALL_TOGETHER',
  
  /** Items delivered as they complete */
  STAGGERED = 'STAGGERED',
}

/**
 * Payment status for tracking
 */
export enum PaymentStatus {
  /** No payment made yet */
  PENDING = 'PENDING',
  
  /** Partial payment received */
  PARTIAL = 'PARTIAL',
  
  /** Full payment received */
  COMPLETED = 'COMPLETED',
  
  /** Payment overdue */
  OVERDUE = 'OVERDUE',
}

/**
 * Delivery status for tracking
 */
export enum DeliveryStatus {
  /** Scheduled for future delivery */
  SCHEDULED = 'SCHEDULED',
  
  /** Ready for pickup/delivery */
  READY = 'READY',
  
  /** Out for delivery */
  IN_TRANSIT = 'IN_TRANSIT',
  
  /** Successfully delivered */
  DELIVERED = 'DELIVERED',
  
  /** Delivery failed */
  FAILED = 'FAILED',
}

/**
 * Event types for group orders
 */
export enum EventType {
  /** Wedding ceremony */
  WEDDING = 'WEDDING',
  
  /** Funeral/memorial service */
  FUNERAL = 'FUNERAL',
  
  /** Child naming ceremony */
  NAMING_CEREMONY = 'NAMING_CEREMONY',
  
  /** Cultural festival */
  FESTIVAL = 'FESTIVAL',
  
  /** Church event */
  CHURCH_EVENT = 'CHURCH_EVENT',
  
  /** Family reunion */
  FAMILY_REUNION = 'FAMILY_REUNION',
  
  /** Birthday celebration */
  BIRTHDAY = 'BIRTHDAY',
  
  /** Other event */
  OTHER = 'OTHER',
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to create a new group order
 */
export interface CreateGroupOrderRequest {
  /** Name/title for the group order */
  groupName: string;
  
  /** Event type */
  eventType?: EventType;
  
  /** Event date */
  eventDate?: Date;
  
  /** Family member profiles and their garment selections */
  familyMemberProfiles: FamilyMemberSelection[];
  
  /** Whether orders share the same fabric */
  sharedFabric: boolean;
  
  /** Fabric details if shared fabric */
  fabricDetails?: Omit<FabricDetails, 'totalFabricCost' | 'fabricLot'>;
  
  /** Payment mode selection */
  paymentMode: PaymentMode;
  
  /** Delivery strategy */
  deliveryStrategy: DeliveryStrategy;
  
  /** Coordination notes */
  coordinationNotes?: string;
  
  /** Tailor ID if already selected */
  tailorId?: string;
  
  /** WhatsApp group ID for coordination */
  whatsappGroupId?: string;
}

/**
 * Family member selection for group order
 */
export interface FamilyMemberSelection {
  /** Family member profile ID */
  profileId: string;
  
  /** Garment type selected */
  garmentType: string;
  
  /** Specific measurements (can override profile) */
  measurements?: Record<string, number>;
  
  /** Special instructions for this item */
  specialInstructions?: string;
  
  /** User responsible for payment */
  paymentResponsibility?: string;
  
  /** Delivery priority */
  deliveryPriority?: number;
}

/**
 * Response from creating a group order
 */
export interface CreateGroupOrderResponse {
  /** Success status */
  success: boolean;
  
  /** Created group order */
  groupOrder?: EnhancedGroupOrder;
  
  /** Group order number */
  groupOrderNumber?: string;
  
  /** Individual orders created */
  orders?: GroupOrderItem[];
  
  /** Bulk discount applied */
  bulkDiscount?: number;
  
  /** Coordination suggestions from tailor */
  coordinationSuggestions?: string[];
  
  /** Errors if any */
  errors?: string[];
}

/**
 * Request to update group order
 */
export interface UpdateGroupOrderRequest {
  /** Group order ID */
  id: string;
  
  /** Fields to update */
  updates: Partial<EnhancedGroupOrder>;
}

/**
 * Request to add item to existing group order
 */
export interface AddGroupOrderItemRequest {
  /** Group order ID */
  groupOrderId: string;
  
  /** Family member selection */
  familyMember: FamilyMemberSelection;
}

/**
 * Request to calculate bulk discount
 */
export interface CalculateBulkDiscountRequest {
  /** Number of items in the group */
  itemCount: number;
  
  /** Individual order amounts */
  orderAmounts: number[];
  
  /** Tailor ID for tailor-specific discounts */
  tailorId?: string;
}

/**
 * Response with bulk discount calculation
 */
export interface CalculateBulkDiscountResponse {
  /** Original total before discount */
  originalTotal: number;
  
  /** Discount percentage applied */
  discountPercentage: number;
  
  /** Total discount amount */
  discountAmount: number;
  
  /** Final total after discount */
  finalTotal: number;
  
  /** Savings amount */
  savings: number;
  
  /** Individual discounted amounts */
  individualDiscounts: IndividualDiscount[];
}

/**
 * Individual discount breakdown
 */
export interface IndividualDiscount {
  /** Order ID or index */
  orderId: string;
  
  /** Original amount */
  originalAmount: number;
  
  /** Discount applied */
  discount: number;
  
  /** Final amount */
  finalAmount: number;
}

/**
 * Request to process group payment
 */
export interface ProcessGroupPaymentRequest {
  /** Group order ID */
  groupOrderId: string;
  
  /** Payer user ID */
  payerId: string;
  
  /** Order IDs being paid for */
  orderIds: string[];
  
  /** Payment amount */
  amount: number;
  
  /** Payment stage */
  paymentStage: 'DEPOSIT' | 'FITTING' | 'FINAL';
  
  /** Payment method */
  paymentMethod: string;
  
  /** Payment reference */
  paymentReference?: string;
}

/**
 * Request for group order progress
 */
export interface GroupOrderProgressRequest {
  /** Group order ID */
  groupOrderId: string;
  
  /** Include individual item details */
  includeItems?: boolean;
}

/**
 * Response with group order progress
 */
export interface GroupOrderProgressResponse {
  /** Group order ID */
  groupOrderId: string;
  
  /** Progress summary */
  progressSummary: GroupProgressSummary;
  
  /** Individual item progress */
  items?: GroupOrderItem[];
  
  /** Next actions required */
  nextActions?: string[];
}

/**
 * Request to update delivery schedule
 */
export interface UpdateDeliveryScheduleRequest {
  /** Group order ID */
  groupOrderId: string;
  
  /** Delivery strategy */
  deliveryStrategy: DeliveryStrategy;
  
  /** Delivery schedules for items */
  schedules: Array<{
    orderItemIds: string[];
    scheduledDate: Date;
    notes?: string;
  }>;
}

/**
 * Group order summary for display
 */
export interface GroupOrderSummary {
  /** Group order details */
  groupOrder: EnhancedGroupOrder;
  
  /** Items in the group */
  items: GroupOrderItem[];
  
  /** Payment tracking */
  paymentTracking: GroupPaymentTracking[];
  
  /** Delivery schedules */
  deliverySchedules: DeliverySchedule[];
  
  /** Progress percentage */
  progressPercentage: number;
  
  /** Next milestone */
  nextMilestone?: string;
}

