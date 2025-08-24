/**
 * Commission calculation utilities for Sew4Mi platform
 * Handles 20% platform fee calculations with proper rounding
 */

export const DEFAULT_COMMISSION_RATE = 0.20; // 20%

export interface CommissionCalculation {
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  breakdown: Array<{
    type: 'PLATFORM_COMMISSION' | 'PROCESSING_FEE' | 'TAX_DEDUCTION';
    amount: number;
    percentage: number;
    description: string;
  }>;
}

/**
 * Calculate commission for a given order amount
 * @param orderAmount - The gross order amount
 * @param commissionRate - Optional custom commission rate (defaults to 20%)
 * @returns Commission calculation breakdown
 */
export function calculateCommission(
  orderAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): CommissionCalculation {
  if (orderAmount < 0) {
    throw new Error('Order amount cannot be negative');
  }

  if (commissionRate < 0 || commissionRate > 1) {
    throw new Error('Commission rate must be between 0 and 1');
  }

  // Calculate commission with proper rounding (Ghana Cedis has 2 decimal places)
  const commissionAmount = Math.round(orderAmount * commissionRate * 100) / 100;
  const netAmount = Math.round((orderAmount - commissionAmount) * 100) / 100;

  return {
    grossAmount: orderAmount,
    commissionRate,
    commissionAmount,
    netAmount,
    breakdown: [
      {
        type: 'PLATFORM_COMMISSION',
        amount: commissionAmount,
        percentage: commissionRate * 100,
        description: `Sew4Mi platform commission (${(commissionRate * 100).toFixed(1)}%)`
      }
    ]
  };
}

/**
 * Calculate commission for milestone payments
 * @param milestoneAmount - Amount for this specific milestone
 * @param commissionRate - Commission rate to apply
 * @returns Milestone commission calculation
 */
export function calculateMilestoneCommission(
  milestoneAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
) {
  return calculateCommission(milestoneAmount, commissionRate);
}

/**
 * Calculate total commission for an order with multiple milestone payments
 * @param milestones - Array of milestone amounts
 * @param commissionRate - Commission rate to apply
 * @returns Total commission across all milestones
 */
export function calculateTotalOrderCommission(
  milestones: number[],
  commissionRate: number = DEFAULT_COMMISSION_RATE
): {
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  milestoneBreakdown: CommissionCalculation[];
} {
  const milestoneBreakdown = milestones.map(amount => 
    calculateCommission(amount, commissionRate)
  );

  const totalGross = milestones.reduce((sum, amount) => sum + amount, 0);
  const totalCommission = milestoneBreakdown.reduce((sum, calc) => sum + calc.commissionAmount, 0);
  const totalNet = totalGross - totalCommission;

  return {
    totalGross,
    totalCommission,
    totalNet,
    milestoneBreakdown
  };
}

/**
 * Calculate commission with processing fees (for display purposes)
 * @param orderAmount - Gross order amount
 * @param commissionRate - Platform commission rate
 * @param processingFeeRate - Payment processing fee rate (optional)
 * @returns Extended calculation including processing fees
 */
export function calculateCommissionWithFees(
  orderAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE,
  processingFeeRate: number = 0.025 // 2.5% typical processing fee
): CommissionCalculation {
  if (orderAmount < 0) {
    throw new Error('Order amount cannot be negative');
  }

  const platformCommission = Math.round(orderAmount * commissionRate * 100) / 100;
  const processingFee = Math.round(orderAmount * processingFeeRate * 100) / 100;
  const totalDeductions = platformCommission + processingFee;
  const netAmount = Math.round((orderAmount - totalDeductions) * 100) / 100;

  return {
    grossAmount: orderAmount,
    commissionRate,
    commissionAmount: totalDeductions,
    netAmount,
    breakdown: [
      {
        type: 'PLATFORM_COMMISSION',
        amount: platformCommission,
        percentage: commissionRate * 100,
        description: `Sew4Mi platform commission (${(commissionRate * 100).toFixed(1)}%)`
      },
      {
        type: 'PROCESSING_FEE',
        amount: processingFee,
        percentage: processingFeeRate * 100,
        description: `Payment processing fee (${(processingFeeRate * 100).toFixed(1)}%)`
      }
    ]
  };
}

/**
 * Calculate expected tailor earnings for an order
 * @param orderAmount - Total order amount
 * @param commissionRate - Commission rate
 * @returns Expected net earnings for tailor
 */
export function calculateTailorEarnings(
  orderAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): number {
  const calculation = calculateCommission(orderAmount, commissionRate);
  return calculation.netAmount;
}

/**
 * Calculate platform revenue from an order
 * @param orderAmount - Total order amount
 * @param commissionRate - Commission rate
 * @returns Platform revenue (commission amount)
 */
export function calculatePlatformRevenue(
  orderAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): number {
  const calculation = calculateCommission(orderAmount, commissionRate);
  return calculation.commissionAmount;
}

/**
 * Format commission calculation for display in Ghana Cedis
 * @param calculation - Commission calculation result
 * @returns Formatted strings for display
 */
export function formatCommissionDisplay(calculation: CommissionCalculation) {
  const formatCurrency = (amount: number) => 
    `GHS ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  return {
    grossAmount: formatCurrency(calculation.grossAmount),
    commissionAmount: formatCurrency(calculation.commissionAmount),
    netAmount: formatCurrency(calculation.netAmount),
    commissionPercentage: `${(calculation.commissionRate * 100).toFixed(1)}%`,
    breakdown: calculation.breakdown.map(item => ({
      ...item,
      formattedAmount: formatCurrency(item.amount),
      formattedPercentage: `${item.percentage.toFixed(1)}%`
    }))
  };
}

/**
 * Validate commission rate
 * @param rate - Commission rate to validate
 * @returns True if valid, false otherwise
 */
export function isValidCommissionRate(rate: number): boolean {
  return rate >= 0 && rate <= 1 && !isNaN(rate) && isFinite(rate);
}

/**
 * Get commission rate from percentage (e.g., 20% -> 0.20)
 * @param percentage - Percentage value (e.g., 20)
 * @returns Decimal rate (e.g., 0.20)
 */
export function percentageToRate(percentage: number): number {
  return percentage / 100;
}

/**
 * Get percentage from commission rate (e.g., 0.20 -> 20)
 * @param rate - Decimal rate (e.g., 0.20)
 * @returns Percentage value (e.g., 20)
 */
export function rateToPercentage(rate: number): number {
  return rate * 100;
}

/**
 * Calculate commission impact of a dispute resolution
 * @param originalAmount - Original order amount
 * @param resolvedAmount - Amount after dispute resolution
 * @param commissionRate - Commission rate
 * @returns Commission adjustment needed
 */
export function calculateDisputeCommissionAdjustment(
  originalAmount: number,
  resolvedAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): {
  originalCommission: number;
  newCommission: number;
  adjustmentAmount: number;
  adjustmentType: 'REFUND' | 'ADDITIONAL';
} {
  const originalCommission = calculateCommission(originalAmount, commissionRate).commissionAmount;
  const newCommission = calculateCommission(resolvedAmount, commissionRate).commissionAmount;
  const adjustmentAmount = Math.abs(originalCommission - newCommission);
  const adjustmentType = originalCommission > newCommission ? 'REFUND' : 'ADDITIONAL';

  return {
    originalCommission,
    newCommission,
    adjustmentAmount,
    adjustmentType
  };
}