/**
 * Validation schemas for Group Order Management
 * Ensures data integrity for group order operations
 */

import { z } from 'zod';
import {
  MAX_ORDERS_PER_GROUP,
  VALIDATION_RULES,
  GROUP_ORDER_DEFAULTS,
} from '../constants/group-order';

/**
 * Event type enum schema
 */
export const EventTypeSchema = z.enum([
  'WEDDING',
  'FUNERAL',
  'NAMING_CEREMONY',
  'FESTIVAL',
  'CHURCH_EVENT',
  'FAMILY_REUNION',
  'BIRTHDAY',
  'OTHER',
]);

/**
 * Group order status enum schema
 */
export const GroupOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'IN_PROGRESS',
  'PARTIALLY_COMPLETED',
  'COMPLETED',
  'CANCELLED',
]);

/**
 * Payment mode enum schema
 */
export const PaymentModeSchema = z.enum([
  'SINGLE_PAYER',
  'SPLIT_PAYMENT',
]);

/**
 * Delivery strategy enum schema
 */
export const DeliveryStrategySchema = z.enum([
  'ALL_TOGETHER',
  'STAGGERED',
]);

/**
 * Payment status enum schema
 */
export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PARTIAL',
  'COMPLETED',
  'OVERDUE',
]);

/**
 * Delivery status enum schema
 */
export const DeliveryStatusSchema = z.enum([
  'SCHEDULED',
  'READY',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
]);

/**
 * Fabric source enum schema
 */
export const FabricSourceSchema = z.enum([
  'CUSTOMER_PROVIDED',
  'TAILOR_SOURCED',
]);

/**
 * Fabric details schema
 */
export const FabricDetailsSchema = z.object({
  fabricType: z.string().min(1, 'Fabric type is required'),
  fabricColor: z.string().min(1, 'Fabric color is required'),
  fabricPattern: z.string().optional(),
  totalYardage: z.number().positive('Total yardage must be positive'),
  costPerYard: z.number().nonnegative('Cost per yard cannot be negative'),
  totalFabricCost: z.number().nonnegative('Total fabric cost cannot be negative'),
  preferredVendor: z.string().optional(),
  fabricLot: z.string().optional(),
  fabricSource: FabricSourceSchema,
});

/**
 * Family member selection schema for group order creation
 */
export const FamilyMemberSelectionSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
  garmentType: z.string().min(1, 'Garment type is required'),
  measurements: z.record(z.string(), z.number()).optional(),
  specialInstructions: z.string().max(500, 'Special instructions too long').optional(),
  paymentResponsibility: z.string().uuid('Invalid user ID').optional(),
  deliveryPriority: z.number().int().min(1).max(10).optional(),
});

/**
 * Create group order request schema
 */
export const CreateGroupOrderRequestSchema = z.object({
  groupName: z.string()
    .min(VALIDATION_RULES.MIN_GROUP_NAME_LENGTH, `Group name must be at least ${VALIDATION_RULES.MIN_GROUP_NAME_LENGTH} characters`)
    .max(VALIDATION_RULES.MAX_GROUP_NAME_LENGTH, `Group name cannot exceed ${VALIDATION_RULES.MAX_GROUP_NAME_LENGTH} characters`),
  
  eventType: EventTypeSchema.optional(),
  
  eventDate: z.coerce.date().optional(),
  
  familyMemberProfiles: z.array(FamilyMemberSelectionSchema)
    .min(VALIDATION_RULES.MIN_PARTICIPANTS, `At least ${VALIDATION_RULES.MIN_PARTICIPANTS} participants required`)
    .max(MAX_ORDERS_PER_GROUP, `Cannot exceed ${MAX_ORDERS_PER_GROUP} orders per group`),
  
  sharedFabric: z.boolean(),
  
  fabricDetails: FabricDetailsSchema.partial().optional(),
  
  paymentMode: PaymentModeSchema.default(GROUP_ORDER_DEFAULTS.DEFAULT_PAYMENT_MODE),
  
  deliveryStrategy: DeliveryStrategySchema.default(GROUP_ORDER_DEFAULTS.DEFAULT_DELIVERY_STRATEGY),
  
  coordinationNotes: z.string()
    .max(VALIDATION_RULES.MAX_NOTES_LENGTH, `Coordination notes cannot exceed ${VALIDATION_RULES.MAX_NOTES_LENGTH} characters`)
    .optional(),
  
  tailorId: z.string().uuid('Invalid tailor ID').optional(),
  
  whatsappGroupId: z.string().optional(),
}).refine(
  (data) => {
    // If sharedFabric is true, fabricDetails must be provided
    if (data.sharedFabric && !data.fabricDetails) {
      return false;
    }
    return true;
  },
  {
    message: 'Fabric details required when using shared fabric',
    path: ['fabricDetails'],
  }
).refine(
  (data) => {
    // Event date must be at least MIN_ADVANCE_DAYS in the future
    if (data.eventDate) {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + VALIDATION_RULES.MIN_ADVANCE_DAYS);
      return data.eventDate >= minDate;
    }
    return true;
  },
  {
    message: `Event date must be at least ${VALIDATION_RULES.MIN_ADVANCE_DAYS} days in advance`,
    path: ['eventDate'],
  }
);

/**
 * Update group order request schema
 */
export const UpdateGroupOrderRequestSchema = z.object({
  id: z.string().uuid('Invalid group order ID'),
  updates: z.object({
    groupName: z.string()
      .min(VALIDATION_RULES.MIN_GROUP_NAME_LENGTH)
      .max(VALIDATION_RULES.MAX_GROUP_NAME_LENGTH)
      .optional(),
    eventType: EventTypeSchema.optional(),
    eventDate: z.coerce.date().optional(),
    paymentMode: PaymentModeSchema.optional(),
    deliveryStrategy: DeliveryStrategySchema.optional(),
    coordinationNotes: z.string().max(VALIDATION_RULES.MAX_NOTES_LENGTH).optional(),
    status: GroupOrderStatusSchema.optional(),
    whatsappGroupId: z.string().optional(),
  }),
});

/**
 * Add group order item request schema
 */
export const AddGroupOrderItemRequestSchema = z.object({
  groupOrderId: z.string().uuid('Invalid group order ID'),
  familyMember: FamilyMemberSelectionSchema,
});

/**
 * Calculate bulk discount request schema
 */
export const CalculateBulkDiscountRequestSchema = z.object({
  itemCount: z.number()
    .int()
    .min(1, 'At least one item required')
    .max(MAX_ORDERS_PER_GROUP, `Cannot exceed ${MAX_ORDERS_PER_GROUP} items`),
  
  orderAmounts: z.array(z.number().positive('Order amounts must be positive')),
  
  tailorId: z.string().uuid('Invalid tailor ID').optional(),
}).refine(
  (data) => data.itemCount === data.orderAmounts.length,
  {
    message: 'Item count must match number of order amounts',
    path: ['orderAmounts'],
  }
);

/**
 * Process group payment request schema
 */
export const ProcessGroupPaymentRequestSchema = z.object({
  groupOrderId: z.string().uuid('Invalid group order ID'),
  
  payerId: z.string().uuid('Invalid payer ID'),
  
  orderIds: z.array(z.string().uuid('Invalid order ID'))
    .min(1, 'At least one order ID required'),
  
  amount: z.number().positive('Payment amount must be positive'),
  
  paymentStage: z.enum(['DEPOSIT', 'FITTING', 'FINAL']),
  
  paymentMethod: z.string().min(1, 'Payment method is required'),
  
  paymentReference: z.string().optional(),
});

/**
 * Group order progress request schema
 */
export const GroupOrderProgressRequestSchema = z.object({
  groupOrderId: z.string().uuid('Invalid group order ID'),
  includeItems: z.boolean().optional(),
});

/**
 * Update delivery schedule request schema
 */
export const UpdateDeliveryScheduleRequestSchema = z.object({
  groupOrderId: z.string().uuid('Invalid group order ID'),
  
  deliveryStrategy: DeliveryStrategySchema,
  
  schedules: z.array(
    z.object({
      orderItemIds: z.array(z.string().uuid('Invalid order item ID'))
        .min(1, 'At least one order item required per schedule'),
      scheduledDate: z.coerce.date(),
      notes: z.string().max(500, 'Notes too long').optional(),
    })
  ).min(1, 'At least one delivery schedule required'),
});

/**
 * Group order item schema
 */
export const GroupOrderItemSchema = z.object({
  id: z.string().uuid(),
  groupOrderId: z.string().uuid(),
  orderId: z.string().uuid(),
  familyMemberProfileId: z.string().uuid(),
  familyMemberName: z.string().min(1),
  garmentType: z.string().min(1),
  individualDiscount: z.number().nonnegative(),
  deliveryPriority: z.number().int().min(1).max(10),
  paymentResponsibility: z.string().uuid(),
  coordinatedDesignNotes: z.string().optional(),
  individualAmount: z.number().positive(),
  discountedAmount: z.number().positive(),
  status: z.string(),
  progressPercentage: z.number().min(0).max(100),
  estimatedDelivery: z.coerce.date(),
  actualDelivery: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Group progress summary schema
 */
export const GroupProgressSummarySchema = z.object({
  totalItems: z.number().int().nonnegative(),
  completedItems: z.number().int().nonnegative(),
  inProgressItems: z.number().int().nonnegative(),
  readyForDelivery: z.number().int().nonnegative(),
  pendingItems: z.number().int().nonnegative(),
  overallProgressPercentage: z.number().min(0).max(100),
  estimatedDaysRemaining: z.number().int().nonnegative().optional(),
  nextGroupMilestone: z.string().optional(),
});

/**
 * Group payment tracking schema
 */
export const GroupPaymentTrackingSchema = z.object({
  id: z.string().uuid(),
  groupOrderId: z.string().uuid(),
  payerId: z.string().uuid(),
  payerName: z.string().min(1),
  responsibility: z.array(z.string().uuid()),
  totalResponsibleAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  outstandingAmount: z.number().nonnegative(),
  status: PaymentStatusSchema,
  depositPaid: z.number().nonnegative(),
  fittingPaid: z.number().nonnegative(),
  finalPaid: z.number().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Delivery schedule schema
 */
export const DeliveryScheduleSchema = z.object({
  id: z.string().uuid(),
  groupOrderId: z.string().uuid(),
  orderItems: z.array(z.string().uuid()),
  scheduledDate: z.coerce.date(),
  actualDate: z.coerce.date().optional(),
  status: DeliveryStatusSchema,
  notes: z.string().optional(),
  notificationSent: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Enhanced group order schema
 */
export const EnhancedGroupOrderSchema = z.object({
  id: z.string().uuid(),
  groupName: z.string(),
  organizerId: z.string().uuid(),
  eventType: EventTypeSchema.nullable(),
  eventDate: z.coerce.date().nullable(),
  totalParticipants: z.number().int().nonnegative(),
  totalOrders: z.number().int().nonnegative(),
  groupDiscountPercentage: z.number().min(0).max(100),
  status: GroupOrderStatusSchema,
  whatsappGroupId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  bulkDiscountPercentage: z.number().min(0).max(100),
  totalOriginalAmount: z.number().nonnegative(),
  totalDiscountedAmount: z.number().nonnegative(),
  paymentMode: PaymentModeSchema,
  deliveryStrategy: DeliveryStrategySchema,
  fabricDetails: FabricDetailsSchema.optional(),
  coordinationNotes: z.string().optional(),
  progressSummary: GroupProgressSummarySchema,
  items: z.array(GroupOrderItemSchema).optional(),
  tailorId: z.string().uuid().optional(),
  estimatedCompletionDate: z.coerce.date().optional(),
  groupOrderNumber: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Type exports for validation schemas
 */
export type CreateGroupOrderRequestInput = z.infer<typeof CreateGroupOrderRequestSchema>;
export type UpdateGroupOrderRequestInput = z.infer<typeof UpdateGroupOrderRequestSchema>;
export type AddGroupOrderItemRequestInput = z.infer<typeof AddGroupOrderItemRequestSchema>;
export type CalculateBulkDiscountRequestInput = z.infer<typeof CalculateBulkDiscountRequestSchema>;
export type ProcessGroupPaymentRequestInput = z.infer<typeof ProcessGroupPaymentRequestSchema>;
export type GroupOrderProgressRequestInput = z.infer<typeof GroupOrderProgressRequestSchema>;
export type UpdateDeliveryScheduleRequestInput = z.infer<typeof UpdateDeliveryScheduleRequestSchema>;
export type EnhancedGroupOrderInput = z.infer<typeof EnhancedGroupOrderSchema>;

