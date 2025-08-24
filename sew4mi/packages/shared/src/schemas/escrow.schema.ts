import { z } from 'zod';
import { ESCROW_VALIDATION_RULES } from '../constants/escrow';

export const EscrowStageSchema = z.enum(['DEPOSIT', 'FITTING', 'FINAL', 'RELEASED']);

export const EscrowTransactionTypeSchema = z.enum(['DEPOSIT', 'FITTING_PAYMENT', 'FINAL_PAYMENT', 'REFUND']);

export const EscrowBreakdownSchema = z.object({
  totalAmount: z.number().min(ESCROW_VALIDATION_RULES.MIN_ORDER_AMOUNT).max(ESCROW_VALIDATION_RULES.MAX_ORDER_AMOUNT),
  depositAmount: z.number().min(0),
  fittingAmount: z.number().min(0),
  finalAmount: z.number().min(0),
  depositPercentage: z.number().min(0).max(1),
  fittingPercentage: z.number().min(0).max(1),
  finalPercentage: z.number().min(0).max(1)
});

export const EscrowStatusSchema = z.object({
  orderId: z.string().uuid(),
  currentStage: EscrowStageSchema,
  totalAmount: z.number().min(0),
  depositPaid: z.number().min(0),
  fittingPaid: z.number().min(0),
  finalPaid: z.number().min(0),
  escrowBalance: z.number().min(0),
  nextStageAmount: z.number().min(0).optional(),
  stageHistory: z.array(z.object({
    stage: EscrowStageSchema,
    transitionedAt: z.string().datetime(),
    amount: z.number().min(0),
    transactionId: z.string().optional(),
    notes: z.string().optional()
  }))
});

export const EscrowMilestoneApprovalSchema = z.object({
  orderId: z.string().uuid(),
  stage: EscrowStageSchema,
  approvedBy: z.string().uuid(),
  approvedAt: z.string().datetime(),
  amount: z.number().min(0),
  notes: z.string().optional()
});

export const EscrowInitiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  totalAmount: z.number().min(ESCROW_VALIDATION_RULES.MIN_ORDER_AMOUNT).max(ESCROW_VALIDATION_RULES.MAX_ORDER_AMOUNT),
  customerPhone: z.string().regex(/^\+233[0-9]{9}$/, 'Invalid Ghana phone number'),
  paymentMethod: z.string().optional()
});

export const EscrowMilestoneApproveSchema = z.object({
  stage: EscrowStageSchema,
  notes: z.string().optional()
});

export const EscrowReconciliationSchema = z.object({
  totalEscrowFunds: z.number().min(0),
  pendingReleases: z.number().min(0),
  completedReleases: z.number().min(0),
  orderCount: z.number().min(0),
  reconciliationDate: z.string().datetime(),
  discrepancies: z.array(z.object({
    orderId: z.string().uuid(),
    expectedAmount: z.number(),
    actualAmount: z.number(),
    difference: z.number(),
    reason: z.string()
  }))
});

export const EscrowTransactionSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  transactionType: EscrowTransactionTypeSchema,
  amount: z.number().min(0),
  fromStage: EscrowStageSchema.optional(),
  toStage: EscrowStageSchema,
  paymentTransactionId: z.string().uuid().optional(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.string().datetime(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// API Response schemas
export const EscrowCalculationResponseSchema = z.object({
  success: z.literal(true),
  data: EscrowBreakdownSchema
});

export const EscrowStatusResponseSchema = z.object({
  success: z.literal(true),
  data: EscrowStatusSchema
});

export const EscrowInitiateResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    paymentIntentId: z.string(),
    depositAmount: z.number().min(0),
    paymentUrl: z.string().url().optional(),
    orderStatus: z.string()
  })
});

export const EscrowApprovalResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    orderId: z.string().uuid(),
    stage: EscrowStageSchema,
    amountReleased: z.number().min(0),
    newStage: EscrowStageSchema,
    transactionId: z.string().optional()
  })
});

// Type exports for Zod inference
export type EscrowStageFromSchema = z.infer<typeof EscrowStageSchema>;
export type EscrowTransactionTypeFromSchema = z.infer<typeof EscrowTransactionTypeSchema>;
export type EscrowBreakdownFromSchema = z.infer<typeof EscrowBreakdownSchema>;
export type EscrowStatusFromSchema = z.infer<typeof EscrowStatusSchema>;
export type EscrowMilestoneApprovalFromSchema = z.infer<typeof EscrowMilestoneApprovalSchema>;
export type EscrowInitiatePaymentFromSchema = z.infer<typeof EscrowInitiatePaymentSchema>;
export type EscrowMilestoneApproveFromSchema = z.infer<typeof EscrowMilestoneApproveSchema>;
export type EscrowReconciliationFromSchema = z.infer<typeof EscrowReconciliationSchema>;
export type EscrowTransactionFromSchema = z.infer<typeof EscrowTransactionSchema>;