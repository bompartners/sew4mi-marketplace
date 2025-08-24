import { EscrowStage } from '@sew4mi/shared';

export class EscrowCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EscrowCalculationError';
  }
}

export interface EscrowBreakdown {
  totalAmount: number;
  depositAmount: number;      // 25%
  fittingAmount: number;      // 50% 
  finalAmount: number;        // 25%
  depositPercentage: number;
  fittingPercentage: number;
  finalPercentage: number;
}

export const ESCROW_PERCENTAGES = {
  DEPOSIT: 0.25,   // 25%
  FITTING: 0.50,   // 50%
  FINAL: 0.25      // 25%
} as const;

/**
 * Calculate escrow payment breakdown for a total order amount
 * Uses 25%-50%-25% split with proper decimal handling
 */
export function calculateEscrowBreakdown(totalAmount: number): EscrowBreakdown {
  if (!totalAmount || totalAmount <= 0) {
    throw new EscrowCalculationError('Total amount must be greater than 0');
  }

  if (!Number.isFinite(totalAmount)) {
    throw new EscrowCalculationError('Total amount must be a finite number');
  }

  // Round to 2 decimal places to avoid floating point issues
  const roundedTotal = Math.round(totalAmount * 100) / 100;

  // Calculate each amount using precise decimal arithmetic
  const depositAmount = Math.round(roundedTotal * ESCROW_PERCENTAGES.DEPOSIT * 100) / 100;
  const fittingAmount = Math.round(roundedTotal * ESCROW_PERCENTAGES.FITTING * 100) / 100;
  
  // Calculate final payment as remainder to ensure exact total, then round
  const finalAmount = Math.round((roundedTotal - depositAmount - fittingAmount) * 100) / 100;

  // Validation: ensure sum equals total (within 1 cent tolerance for rounding)
  const calculatedTotal = depositAmount + fittingAmount + finalAmount;
  const difference = Math.abs(calculatedTotal - roundedTotal);
  
  if (difference > 0.01) {
    throw new EscrowCalculationError(
      `Escrow breakdown sum (${calculatedTotal}) does not equal total amount (${roundedTotal})`
    );
  }

  return {
    totalAmount: roundedTotal,
    depositAmount,
    fittingAmount,
    finalAmount,
    depositPercentage: ESCROW_PERCENTAGES.DEPOSIT,
    fittingPercentage: ESCROW_PERCENTAGES.FITTING,
    finalPercentage: ESCROW_PERCENTAGES.FINAL
  };
}

/**
 * Calculate deposit amount (25% of total)
 */
export function calculateDepositAmount(totalAmount: number): number {
  const breakdown = calculateEscrowBreakdown(totalAmount);
  return breakdown.depositAmount;
}

/**
 * Calculate fitting payment amount (50% of total)
 */
export function calculateFittingAmount(totalAmount: number): number {
  const breakdown = calculateEscrowBreakdown(totalAmount);
  return breakdown.fittingAmount;
}

/**
 * Calculate final payment amount (25% of total)
 */
export function calculateFinalAmount(totalAmount: number): number {
  const breakdown = calculateEscrowBreakdown(totalAmount);
  return breakdown.finalAmount;
}

/**
 * Get the payment amount for a specific escrow stage
 */
export function getStageAmount(totalAmount: number, stage: EscrowStage): number {
  const breakdown = calculateEscrowBreakdown(totalAmount);
  
  switch (stage) {
    case 'DEPOSIT':
      return breakdown.depositAmount;
    case 'FITTING':
      return breakdown.fittingAmount;
    case 'FINAL':
      return breakdown.finalAmount;
    case 'RELEASED':
      return 0; // No payment needed, all funds released
    default:
      throw new EscrowCalculationError(`Invalid escrow stage: ${stage}`);
  }
}

/**
 * Validate that escrow breakdown is mathematically correct
 */
export function validateEscrowBreakdown(breakdown: EscrowBreakdown): boolean {
  try {
    const sum = breakdown.depositAmount + breakdown.fittingAmount + breakdown.finalAmount;
    const difference = Math.abs(sum - breakdown.totalAmount);
    return difference <= 0.01; // Allow 1 cent tolerance for rounding
  } catch {
    return false;
  }
}