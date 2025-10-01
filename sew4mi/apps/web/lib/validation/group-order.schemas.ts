/**
 * Zod Validation Schemas for Group Order Operations
 * Provides request body validation for API routes
 */

import { z } from 'zod';
import { OrderStatus } from '@sew4mi/shared/types';

/**
 * Fabric Allocation Schema
 */
export const FabricAllocationSchema = z.object({
  totalYardsNeeded: z.number().positive('Total yards must be positive'),
  recommendedPurchaseQuantity: z.number().positive('Purchase quantity must be positive'),
  bufferPercentage: z.number().min(0).max(50, 'Buffer percentage must be between 0 and 50'),
  individualAllocations: z.array(
    z.object({
      orderId: z.string().uuid('Invalid order ID'),
      garmentType: z.string().min(1, 'Garment type is required'),
      yardsAllocated: z.number().positive('Yards allocated must be positive'),
      fabricLot: z.string().optional()
    })
  ).min(1, 'At least one allocation is required'),
  estimatedWaste: z.number().min(0)
});

export type FabricAllocationInput = z.infer<typeof FabricAllocationSchema>;

/**
 * Production Schedule Schema
 */
export const ProductionScheduleItemSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  familyMemberName: z.string().min(1, 'Family member name is required'),
  garmentType: z.string().min(1, 'Garment type is required'),
  priority: z.number().int().positive('Priority must be a positive integer'),
  estimatedStartDate: z.string().datetime('Invalid start date'),
  estimatedCompletionDate: z.string().datetime('Invalid completion date'),
  dependencies: z.array(z.string().uuid()).optional()
});

export const ProductionScheduleSchema = z.object({
  items: z.array(ProductionScheduleItemSchema).min(1, 'At least one item is required'),
  eventDate: z.string().datetime('Invalid event date')
});

export type ProductionScheduleInput = z.infer<typeof ProductionScheduleSchema>;

/**
 * Design Suggestion Schema
 */
export const DesignSuggestionSchema = z.object({
  suggestionText: z.string().min(10, 'Suggestion must be at least 10 characters'),
  referenceImages: z.array(z.string().url('Invalid image URL')).max(10, 'Maximum 10 images allowed'),
  colorPalette: z.object({
    primary: z.string().min(1, 'Primary color is required'),
    secondary: z.string().optional(),
    accent: z.string().optional()
  }),
  culturalTheme: z.string().min(1, 'Cultural theme is required')
});

export type DesignSuggestionInput = z.infer<typeof DesignSuggestionSchema>;

/**
 * Bulk Progress Update Schema
 */
export const BulkProgressUpdateSchema = z.object({
  selectedItemIds: z.array(z.string().uuid('Invalid item ID')).min(1, 'At least one item must be selected'),
  newStatus: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Invalid order status' })
  }),
  progressNotes: z.string().min(5, 'Progress notes must be at least 5 characters'),
  progressPhotos: z.array(z.string().url('Invalid photo URL')).max(20, 'Maximum 20 photos allowed'),
  notifyCustomers: z.boolean()
});

export type BulkProgressUpdateInput = z.infer<typeof BulkProgressUpdateSchema>;

/**
 * Group Message Schema
 */
export const GroupMessageSchema = z.object({
  recipientType: z.enum(['broadcast', 'individual'], {
    errorMap: () => ({ message: 'Recipient type must be broadcast or individual' })
  }),
  recipientId: z.string().uuid('Invalid recipient ID').optional(),
  content: z.string().min(1, 'Message content is required').max(1600, 'Message too long'),
  channel: z.enum(['whatsapp', 'sms'], {
    errorMap: () => ({ message: 'Channel must be whatsapp or sms' })
  })
}).refine(
  (data) => {
    // If individual, recipientId is required
    if (data.recipientType === 'individual' && !data.recipientId) {
      return false;
    }
    return true;
  },
  {
    message: 'Recipient ID is required for individual messages',
    path: ['recipientId']
  }
);

export type GroupMessageInput = z.infer<typeof GroupMessageSchema>;

/**
 * Coordination Checklist Schema
 */
export const ChecklistItemSchema = z.object({
  id: z.string().min(1, 'Checklist item ID is required'),
  category: z.enum(['fabric', 'color', 'quality', 'measurements', 'finishing']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  completed: z.boolean(),
  notes: z.string().optional()
});

export const CoordinationChecklistSchema = z.object({
  checklistItems: z.array(ChecklistItemSchema).min(1, 'At least one checklist item is required'),
  overallNotes: z.string().max(1000, 'Overall notes too long'),
  coordinationPhotos: z.array(z.string().url('Invalid photo URL')).max(20, 'Maximum 20 photos allowed'),
  approvedForCompletion: z.boolean()
});

export type CoordinationChecklistInput = z.infer<typeof CoordinationChecklistSchema>;

/**
 * Validation Helper Function
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod errors for API responses
 */
export function formatZodErrors(errors: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  errors.issues.forEach(issue => {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  });

  return formatted;
}

