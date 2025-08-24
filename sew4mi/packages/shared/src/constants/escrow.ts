import { EscrowStage } from '../types/escrow';

export const ESCROW_PERCENTAGES = {
  DEPOSIT: 0.25,   // 25%
  FITTING: 0.50,   // 50%
  FINAL: 0.25      // 25%
} as const;

export const ESCROW_STAGES: Record<EscrowStage, string> = {
  DEPOSIT: 'Deposit',
  FITTING: 'Fitting Payment',
  FINAL: 'Final Payment',
  RELEASED: 'Released'
} as const;

export const ESCROW_STAGE_ORDER: EscrowStage[] = [
  'DEPOSIT',
  'FITTING', 
  'FINAL',
  'RELEASED'
] as const;

export const ESCROW_STAGE_DESCRIPTIONS: Record<EscrowStage, string> = {
  DEPOSIT: 'Initial payment to confirm order (25%)',
  FITTING: 'Payment released after fitting approval (50%)',
  FINAL: 'Final payment released upon delivery (25%)',
  RELEASED: 'All payments have been released to tailor'
} as const;

export const ESCROW_NOTIFICATION_TYPES = {
  DEPOSIT_DUE: 'deposit_due',
  FITTING_READY: 'fitting_ready',
  FINAL_DUE: 'final_due',
  MILESTONE_APPROVED: 'milestone_approved',
  PAYMENT_RELEASED: 'payment_released'
} as const;

export const ESCROW_VALIDATION_RULES = {
  MIN_ORDER_AMOUNT: 10.00,     // Minimum order amount for escrow
  MAX_ORDER_AMOUNT: 10000.00,  // Maximum order amount
  ROUNDING_TOLERANCE: 0.01     // 1 cent tolerance for rounding differences
} as const;