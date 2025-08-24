/**
 * Zod validation schemas for milestone verification system
 * @file milestone.schema.ts
 */

import { z } from 'zod';

/**
 * Schema for milestone stages
 */
export const milestoneStageSchema = z.enum([
  'FABRIC_SELECTED',
  'CUTTING_STARTED', 
  'INITIAL_ASSEMBLY',
  'FITTING_READY',
  'ADJUSTMENTS_COMPLETE',
  'FINAL_PRESSING',
  'READY_FOR_DELIVERY'
]);

/**
 * Schema for milestone approval status
 */
export const milestoneApprovalStatusSchema = z.enum([
  'PENDING',
  'APPROVED', 
  'REJECTED'
]);

/**
 * Schema for milestone approval actions
 */
export const milestoneApprovalActionSchema = z.enum([
  'APPROVED',
  'REJECTED',
  'AUTO_APPROVED'
]);

/**
 * Schema for order milestone with verification fields
 */
export const orderMilestoneSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  milestone: milestoneStageSchema,
  photoUrl: z.string().url(),
  notes: z.string().max(1000).optional().default(''),
  verifiedAt: z.date(),
  verifiedBy: z.string().uuid(),
  approvalStatus: milestoneApprovalStatusSchema,
  customerReviewedAt: z.date().optional(),
  autoApprovalDeadline: z.date(),
  rejectionReason: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

/**
 * Schema for milestone approval audit record
 */
export const milestoneApprovalSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  action: milestoneApprovalActionSchema,
  comment: z.string().max(500).optional(),
  reviewedAt: z.date()
});

/**
 * Schema for milestone photo upload request
 */
export const milestonePhotoUploadRequestSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  filename: z.string().min(1, 'Filename is required').max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Only JPEG, PNG, and WebP images are allowed' })
  }),
  notes: z.string().max(1000).optional()
}).refine(
  (data) => {
    // Validate base64 image data
    try {
      const base64Data = data.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      // eslint-disable-next-line no-undef
      const buffer = typeof Buffer !== 'undefined' && Buffer.from ? Buffer.from(base64Data, 'base64') : new Uint8Array();
      // Check file size (5MB limit)
      return buffer.length <= 5 * 1024 * 1024;
    } catch {
      return false;
    }
  },
  {
    message: 'Invalid image data or file size exceeds 5MB limit',
    path: ['imageData']
  }
);

/**
 * Schema for milestone photo upload response
 */
export const milestonePhotoUploadResponseSchema = z.object({
  success: z.boolean(),
  photoUrl: z.string().url(),
  cdnUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  uploadedAt: z.date()
});

/**
 * Schema for milestone approval request
 */
export const milestoneApprovalRequestSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(500).optional()
}).refine(
  (data) => {
    // Require comment for rejections
    if (data.action === 'REJECTED' && (!data.comment || data.comment.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Comment is required when rejecting a milestone',
    path: ['comment']
  }
);

/**
 * Schema for milestone approval response
 */
export const milestoneApprovalResponseSchema = z.object({
  success: z.boolean(),
  approvalStatus: milestoneApprovalStatusSchema,
  reviewedAt: z.date(),
  paymentTriggered: z.boolean().optional()
});

/**
 * Schema for milestone progress data
 */
export const milestoneProgressSchema = z.object({
  currentStage: milestoneStageSchema,
  completedMilestones: z.array(orderMilestoneSchema),
  pendingApproval: z.array(orderMilestoneSchema),
  progressPercentage: z.number().min(0).max(100),
  nextMilestone: milestoneStageSchema.optional()
});

/**
 * Schema for milestone dispute request
 */
export const milestoneDisputeRequestSchema = z.object({
  milestoneId: z.string().uuid(),
  orderId: z.string().uuid(),
  reason: z.string().min(10, 'Dispute reason must be at least 10 characters').max(1000),
  evidence: z.string().max(2000).optional(),
  evidenceUrls: z.array(z.string().url()).max(5, 'Maximum 5 evidence files allowed').optional()
});

/**
 * Schema for auto-approval cron job result
 */
export const autoApprovalResultSchema = z.object({
  processed: z.number().int().min(0),
  autoApproved: z.number().int().min(0),
  failed: z.number().int().min(0),
  approvedMilestoneIds: z.array(z.string().uuid()),
  errors: z.array(z.string())
});

// Type exports for TypeScript inference
export type MilestoneStageFromSchema = z.infer<typeof milestoneStageSchema>;
export type MilestoneApprovalStatusFromSchema = z.infer<typeof milestoneApprovalStatusSchema>;
export type MilestoneApprovalActionFromSchema = z.infer<typeof milestoneApprovalActionSchema>;
export type OrderMilestoneFromSchema = z.infer<typeof orderMilestoneSchema>;
export type MilestoneApprovalFromSchema = z.infer<typeof milestoneApprovalSchema>;
export type MilestonePhotoUploadRequestFromSchema = z.infer<typeof milestonePhotoUploadRequestSchema>;
export type MilestonePhotoUploadResponseFromSchema = z.infer<typeof milestonePhotoUploadResponseSchema>;
export type MilestoneApprovalRequestFromSchema = z.infer<typeof milestoneApprovalRequestSchema>;
export type MilestoneApprovalResponseFromSchema = z.infer<typeof milestoneApprovalResponseSchema>;
export type MilestoneProgressFromSchema = z.infer<typeof milestoneProgressSchema>;
export type MilestoneDisputeRequestFromSchema = z.infer<typeof milestoneDisputeRequestSchema>;
export type AutoApprovalResultFromSchema = z.infer<typeof autoApprovalResultSchema>;

/**
 * Validation helper functions
 */
export const milestoneValidationHelpers = {
  /**
   * Validates if a milestone stage is valid
   */
  isValidMilestoneStage: (stage: string): boolean => {
    return milestoneStageSchema.safeParse(stage).success;
  },

  /**
   * Validates if an approval status is valid
   */
  isValidApprovalStatus: (status: string): boolean => {
    return milestoneApprovalStatusSchema.safeParse(status).success;
  },

  /**
   * Validates if an approval action is valid
   */
  isValidApprovalAction: (action: string): boolean => {
    return milestoneApprovalActionSchema.safeParse(action).success;
  },

  /**
   * Validates milestone photo upload data
   */
  validatePhotoUpload: (data: unknown) => {
    return milestonePhotoUploadRequestSchema.safeParse(data);
  },

  /**
   * Validates milestone approval request
   */
  validateApprovalRequest: (data: unknown) => {
    return milestoneApprovalRequestSchema.safeParse(data);
  },

  /**
   * Validates milestone dispute request
   */
  validateDisputeRequest: (data: unknown) => {
    return milestoneDisputeRequestSchema.safeParse(data);
  }
};