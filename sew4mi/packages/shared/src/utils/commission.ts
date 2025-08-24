/**
 * Shared commission calculation utilities for Sew4Mi platform
 * This is the client-side version of the commission utilities
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