import { describe, it, expect } from 'vitest';
import {
  calculateEscrowBreakdown,
  calculateDepositAmount,
  calculateFittingAmount,
  calculateFinalAmount,
  getStageAmount,
  validateEscrowBreakdown,
  EscrowCalculationError,
  ESCROW_PERCENTAGES
} from '../../../../lib/utils/escrow-calculator';

describe('EscrowCalculator', () => {
  describe('calculateEscrowBreakdown', () => {
    it('should calculate correct breakdown for round amounts', () => {
      const result = calculateEscrowBreakdown(100);
      
      expect(result.totalAmount).toBe(100);
      expect(result.depositAmount).toBe(25);    // 25%
      expect(result.fittingAmount).toBe(50);    // 50%
      expect(result.finalAmount).toBe(25);      // 25%
      expect(result.depositPercentage).toBe(0.25);
      expect(result.fittingPercentage).toBe(0.50);
      expect(result.finalPercentage).toBe(0.25);
    });

    it('should handle amounts with decimals correctly', () => {
      const result = calculateEscrowBreakdown(123.45);
      
      expect(result.totalAmount).toBe(123.45);
      expect(result.depositAmount).toBe(30.86);   // 25% = 30.8625 -> 30.86
      expect(result.fittingAmount).toBe(61.73);   // 50% = 61.725 -> 61.73
      expect(result.finalAmount).toBe(30.86);     // Remainder = 30.86
      
      // Verify sum equals total (within tolerance)
      const sum = result.depositAmount + result.fittingAmount + result.finalAmount;
      expect(Math.abs(sum - result.totalAmount)).toBeLessThanOrEqual(0.01);
    });

    it('should handle edge case amounts correctly', () => {
      const result = calculateEscrowBreakdown(10.01);
      
      expect(result.totalAmount).toBe(10.01);
      const sum = result.depositAmount + result.fittingAmount + result.finalAmount;
      expect(Math.abs(sum - 10.01)).toBeLessThanOrEqual(0.01);
    });

    it('should throw error for invalid amounts', () => {
      expect(() => calculateEscrowBreakdown(0)).toThrow(EscrowCalculationError);
      expect(() => calculateEscrowBreakdown(-100)).toThrow(EscrowCalculationError);
      expect(() => calculateEscrowBreakdown(NaN)).toThrow(EscrowCalculationError);
      expect(() => calculateEscrowBreakdown(Infinity)).toThrow(EscrowCalculationError);
    });

    it('should ensure sum always equals total amount', () => {
      const testAmounts = [10.01, 99.99, 1000.33, 2500.67, 5000.01];
      
      testAmounts.forEach(amount => {
        const result = calculateEscrowBreakdown(amount);
        const sum = result.depositAmount + result.fittingAmount + result.finalAmount;
        const difference = Math.abs(sum - amount);
        expect(difference).toBeLessThanOrEqual(0.01);
      });
    });
  });

  describe('individual calculation functions', () => {
    it('should calculate deposit amount correctly', () => {
      expect(calculateDepositAmount(100)).toBe(25);
      expect(calculateDepositAmount(200)).toBe(50);
    });

    it('should calculate fitting amount correctly', () => {
      expect(calculateFittingAmount(100)).toBe(50);
      expect(calculateFittingAmount(200)).toBe(100);
    });

    it('should calculate final amount correctly', () => {
      expect(calculateFinalAmount(100)).toBe(25);
      expect(calculateFinalAmount(200)).toBe(50);
    });
  });

  describe('getStageAmount', () => {
    const totalAmount = 1000;

    it('should return correct amount for each stage', () => {
      expect(getStageAmount(totalAmount, 'DEPOSIT')).toBe(250);
      expect(getStageAmount(totalAmount, 'FITTING')).toBe(500);
      expect(getStageAmount(totalAmount, 'FINAL')).toBe(250);
      expect(getStageAmount(totalAmount, 'RELEASED')).toBe(0);
    });

    it('should throw error for invalid stage', () => {
      expect(() => getStageAmount(totalAmount, 'INVALID' as any)).toThrow(EscrowCalculationError);
    });
  });

  describe('validateEscrowBreakdown', () => {
    it('should validate correct breakdown', () => {
      const breakdown = calculateEscrowBreakdown(100);
      expect(validateEscrowBreakdown(breakdown)).toBe(true);
    });

    it('should reject invalid breakdown', () => {
      const invalidBreakdown = {
        totalAmount: 100,
        depositAmount: 30,
        fittingAmount: 50,
        finalAmount: 25, // Sum = 105, not 100
        depositPercentage: 0.25,
        fittingPercentage: 0.50,
        finalPercentage: 0.25
      };
      expect(validateEscrowBreakdown(invalidBreakdown)).toBe(false);
    });

    it('should handle malformed breakdown gracefully', () => {
      const malformedBreakdown = {
        totalAmount: NaN,
        depositAmount: 'invalid' as any,
        fittingAmount: 50,
        finalAmount: 25,
        depositPercentage: 0.25,
        fittingPercentage: 0.50,
        finalPercentage: 0.25
      };
      expect(validateEscrowBreakdown(malformedBreakdown)).toBe(false);
    });
  });

  describe('precision and rounding edge cases', () => {
    it('should handle floating point precision issues', () => {
      // These amounts historically cause floating point issues
      const testAmounts = [0.1, 0.2, 0.3, 1.1, 2.2, 3.3];
      
      testAmounts.forEach(amount => {
        const result = calculateEscrowBreakdown(amount);
        expect(validateEscrowBreakdown(result)).toBe(true);
      });
    });

    it('should handle very small amounts', () => {
      const result = calculateEscrowBreakdown(1);
      expect(result.totalAmount).toBe(1);
      expect(validateEscrowBreakdown(result)).toBe(true);
    });

    it('should handle amounts that create rounding differences', () => {
      // Amount that creates rounding challenges: 33.33 / 4 = 8.3325
      const result = calculateEscrowBreakdown(33.33);
      expect(validateEscrowBreakdown(result)).toBe(true);
      
      const sum = result.depositAmount + result.fittingAmount + result.finalAmount;
      expect(Math.abs(sum - 33.33)).toBeLessThanOrEqual(0.01);
    });
  });

  describe('constants validation', () => {
    it('should have correct escrow percentages', () => {
      expect(ESCROW_PERCENTAGES.DEPOSIT).toBe(0.25);
      expect(ESCROW_PERCENTAGES.FITTING).toBe(0.50);
      expect(ESCROW_PERCENTAGES.FINAL).toBe(0.25);
      
      // Verify percentages sum to 100%
      const total = ESCROW_PERCENTAGES.DEPOSIT + ESCROW_PERCENTAGES.FITTING + ESCROW_PERCENTAGES.FINAL;
      expect(total).toBe(1.0);
    });
  });
});