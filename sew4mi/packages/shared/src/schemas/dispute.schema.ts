// Dispute Resolution Framework Validation Schemas
// Story 2.4: Zod validation schemas for dispute system

import { z } from 'zod';

// Browser types for file validation
type FileType = {
  size: number;
  type: string;
  name: string;
};
import { 
  DisputeCategory, 
  DisputeStatus, 
  DisputePriority, 
  DisputeResolutionType,
  DisputeParticipantRole
} from '../types/dispute';
import { DISPUTE_CONSTANTS } from '../constants/dispute';

// Base validation schemas
export const disputeCategorySchema = z.nativeEnum(DisputeCategory);
export const disputeStatusSchema = z.nativeEnum(DisputeStatus);
export const disputePrioritySchema = z.nativeEnum(DisputePriority);
export const disputeResolutionTypeSchema = z.nativeEnum(DisputeResolutionType);
export const disputeParticipantRoleSchema = z.nativeEnum(DisputeParticipantRole);

// Core entity schemas
export const disputeSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
  createdBy: z.string().uuid(),
  category: disputeCategorySchema,
  title: z.string()
    .min(DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH, `Title must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH} characters`)
    .max(DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH, `Title must not exceed ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH} characters`)
    .trim(),
  description: z.string()
    .min(DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MIN_LENGTH, `Description must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MIN_LENGTH} characters`)
    .max(DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH, `Description must not exceed ${DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH} characters`)
    .trim(),
  status: disputeStatusSchema,
  priority: disputePrioritySchema,
  assignedAdmin: z.string().uuid().optional(),
  slaDeadline: z.date(),
  
  // Resolution fields
  resolutionType: disputeResolutionTypeSchema.optional(),
  resolutionDescription: z.string().max(1000).optional(),
  refundAmount: z.number().min(0).optional(),
  resolvedBy: z.string().uuid().optional(),
  resolvedAt: z.date().optional(),
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date()
}).refine((data) => {
  // If resolved, must have resolver and resolution time
  if (data.status === DisputeStatus.RESOLVED || data.status === DisputeStatus.CLOSED) {
    return data.resolvedBy && data.resolvedAt;
  }
  return true;
}, {
  message: "Resolved disputes must have resolvedBy and resolvedAt",
  path: ["resolvedBy"]
}).refine((data) => {
  // Refund amount must be provided for refund resolutions
  if (data.resolutionType === DisputeResolutionType.FULL_REFUND || 
      data.resolutionType === DisputeResolutionType.PARTIAL_REFUND) {
    return data.refundAmount && data.refundAmount > 0;
  }
  return true;
}, {
  message: "Refund amount is required for refund resolutions",
  path: ["refundAmount"]
});

export const disputeEvidenceSchema = z.object({
  id: z.string().uuid(),
  disputeId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  fileName: z.string().max(255),
  fileType: z.enum(DISPUTE_CONSTANTS.FILE_LIMITS.SUPPORTED_FILE_TYPES),
  fileSize: z.number().min(1).max(DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILE_SIZE),
  fileUrl: z.string().url(),
  description: z.string().max(500).optional(),
  uploadedAt: z.date()
});

export const disputeMessageSchema = z.object({
  id: z.string().uuid(),
  disputeId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderRole: disputeParticipantRoleSchema,
  senderName: z.string().max(100),
  message: z.string()
    .min(DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MIN_LENGTH)
    .max(DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MAX_LENGTH)
    .trim(),
  attachments: z.array(z.string().url()).max(DISPUTE_CONSTANTS.FILE_LIMITS.MAX_ATTACHMENTS_PER_MESSAGE).optional(),
  isInternal: z.boolean().default(false),
  readBy: z.array(z.string().uuid()).default([]),
  createdAt: z.date()
}).refine((data) => {
  // Only admins can send internal messages
  if (data.isInternal) {
    return data.senderRole === DisputeParticipantRole.ADMIN;
  }
  return true;
}, {
  message: "Only admins can send internal messages",
  path: ["isInternal"]
});

export const disputeResolutionSchema = z.object({
  id: z.string().uuid(),
  disputeId: z.string().uuid(),
  resolutionType: disputeResolutionTypeSchema,
  outcome: z.string().max(1000),
  refundAmount: z.number().min(0).optional(),
  reasonCode: z.string().max(50),
  adminNotes: z.string().max(2000).optional(),
  customerNotified: z.boolean().default(false),
  tailorNotified: z.boolean().default(false),
  paymentProcessed: z.boolean().default(false),
  resolvedBy: z.string().uuid(),
  resolvedAt: z.date()
}).refine((data) => {
  // Refund resolutions must have refund amount
  if (data.resolutionType === DisputeResolutionType.FULL_REFUND || 
      data.resolutionType === DisputeResolutionType.PARTIAL_REFUND) {
    return data.refundAmount && data.refundAmount > 0;
  }
  return true;
}, {
  message: "Refund amount is required for refund resolutions",
  path: ["refundAmount"]
});

// Request validation schemas
export const createDisputeRequestSchema = z.object({
  orderId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
  category: disputeCategorySchema,
  title: z.string()
    .min(DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH)
    .max(DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH)
    .trim(),
  description: z.string()
    .min(DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MIN_LENGTH)
    .max(DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH)
    .trim()
});

// Alias for compatibility
export const createDisputeSchema = createDisputeRequestSchema;

export const uploadEvidenceRequestSchema = z.object({
  disputeId: z.string().uuid(),
  file: z.any().refine((file: FileType) => {
    // eslint-disable-next-line no-undef
    if (typeof globalThis !== 'undefined' && typeof File !== 'undefined' && !(file instanceof File)) return false;
    if (file.size > DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILE_SIZE) return false;
    if (!(DISPUTE_CONSTANTS.FILE_LIMITS.SUPPORTED_FILE_TYPES as readonly string[]).includes(file.type)) return false;
    return true;
  }, {
    message: "Invalid file: must be under 10MB and of supported type (image, PDF, or text)"
  }),
  description: z.string().max(500).optional()
});

export const sendMessageRequestSchema = z.object({
  disputeId: z.string().uuid(),
  message: z.string()
    .min(DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MIN_LENGTH)
    .max(DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MAX_LENGTH)
    .trim(),
  attachments: z.array(z.string().url()).max(DISPUTE_CONSTANTS.FILE_LIMITS.MAX_ATTACHMENTS_PER_MESSAGE).optional(),
  isInternal: z.boolean().default(false)
});

export const assignDisputeRequestSchema = z.object({
  disputeId: z.string().uuid(),
  adminId: z.string().uuid()
});

export const resolveDisputeRequestSchema = z.object({
  disputeId: z.string().uuid(),
  resolutionType: disputeResolutionTypeSchema,
  outcome: z.string().min(10).max(1000).trim(),
  refundAmount: z.number().min(0).optional(),
  reasonCode: z.string().max(50).default('ADMIN_DECISION'),
  adminNotes: z.string().max(2000).optional()
}).refine((data) => {
  // Refund resolutions must have refund amount
  if (data.resolutionType === DisputeResolutionType.FULL_REFUND || 
      data.resolutionType === DisputeResolutionType.PARTIAL_REFUND) {
    return data.refundAmount && data.refundAmount > 0;
  }
  return true;
}, {
  message: "Refund amount is required for refund resolutions",
  path: ["refundAmount"]
});

export const markMessagesReadRequestSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1)
});

// Query validation schemas
export const disputeFiltersSchema = z.object({
  status: z.array(disputeStatusSchema).optional(),
  priority: z.array(disputePrioritySchema).optional(),
  category: z.array(disputeCategorySchema).optional(),
  assignedAdmin: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date()
  }).optional(),
  isOverdue: z.boolean().optional()
}).refine((data) => {
  if (data.dateRange) {
    return data.dateRange.start <= data.dateRange.end;
  }
  return true;
}, {
  message: "Start date must be before or equal to end date",
  path: ["dateRange"]
});

export const disputeSortOptionsSchema = z.object({
  field: z.enum(['createdAt', 'slaDeadline', 'priority', 'status', 'updatedAt']),
  direction: z.enum(['asc', 'desc'])
});

export const disputePaginationOptionsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  filters: disputeFiltersSchema.optional(),
  sort: disputeSortOptionsSchema.optional()
});

// Admin dashboard query schema
export const adminDashboardQuerySchema = z.object({
  status: z.array(disputeStatusSchema).optional(),
  priority: z.array(disputePrioritySchema).optional(),
  assignedAdmin: z.string().uuid().optional(),
  overdue: z.boolean().optional(),
  search: z.string().max(100).optional(),
  limit: z.number().min(1).max(100).default(50)
});

// Analytics query schema
export const disputeAnalyticsQuerySchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  category: z.array(disputeCategorySchema).optional(),
  priority: z.array(disputePrioritySchema).optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: "Start date must be before or equal to end date",
  path: ["startDate"]
});

// File upload validation
export const validateFileUpload = (file: FileType): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (file.size > DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILE_SIZE) {
    errors.push(`File size must be under ${DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  if (!(DISPUTE_CONSTANTS.FILE_LIMITS.SUPPORTED_FILE_TYPES as readonly string[]).includes(file.type)) {
    errors.push(`File type ${file.type} is not supported. Supported types: ${DISPUTE_CONSTANTS.FILE_LIMITS.SUPPORTED_FILE_TYPES.join(', ')}`);
  }
  
  if (file.name.length > 255) {
    errors.push('File name must be less than 255 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Form validation helpers
export const validateDisputeTitle = (title: string): string | undefined => {
  if (!title || title.trim().length < DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH) {
    return `Title must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH} characters`;
  }
  if (title.length > DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH) {
    return `Title must not exceed ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH} characters`;
  }
  return undefined;
};

export const validateDisputeDescription = (description: string): string | undefined => {
  if (!description || description.trim().length < DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MIN_LENGTH) {
    return `Description must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MIN_LENGTH} characters`;
  }
  if (description.length > DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH) {
    return `Description must not exceed ${DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH} characters`;
  }
  return undefined;
};

export const validateMessage = (message: string): string | undefined => {
  if (!message || message.trim().length < DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MIN_LENGTH) {
    return `Message must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MIN_LENGTH} character`;
  }
  if (message.length > DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MAX_LENGTH) {
    return `Message must not exceed ${DISPUTE_CONSTANTS.TEXT_LIMITS.MESSAGE_MAX_LENGTH} characters`;
  }
  return undefined;
};

// Export types from schemas - these types are used internally by the validation schemas
// The public types are available from ../types/dispute.ts
export type CreateDisputeRequestInternal = z.infer<typeof createDisputeRequestSchema>;
export type UploadEvidenceRequestInternal = z.infer<typeof uploadEvidenceRequestSchema>;
export type SendMessageRequestInternal = z.infer<typeof sendMessageRequestSchema>;
export type AssignDisputeRequestInternal = z.infer<typeof assignDisputeRequestSchema>;
export type ResolveDisputeRequestInternal = z.infer<typeof resolveDisputeRequestSchema>;
export type MarkMessagesReadRequestInternal = z.infer<typeof markMessagesReadRequestSchema>;
export type DisputeFiltersInternal = z.infer<typeof disputeFiltersSchema>;
export type DisputeSortOptionsInternal = z.infer<typeof disputeSortOptionsSchema>;
export type DisputePaginationOptionsInternal = z.infer<typeof disputePaginationOptionsSchema>;
export type AdminDashboardQueryInternal = z.infer<typeof adminDashboardQuerySchema>;
export type DisputeAnalyticsQueryInternal = z.infer<typeof disputeAnalyticsQuerySchema>;