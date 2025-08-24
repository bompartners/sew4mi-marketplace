import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EscrowService } from '../../../../lib/services/escrow.service';
import { EscrowRepository } from '../../../../lib/repositories/escrow.repository';
import { PaymentService } from '../../../../lib/services/payment.service';

// Mock the dependencies
vi.mock('../../../../lib/repositories/escrow.repository');
vi.mock('../../../../lib/services/payment.service');
vi.mock('../../../../lib/services/hubtel.service');
vi.mock('../../../../lib/config/env', () => ({
  validateHubtelEnvironment: vi.fn(),
  ENV_CONFIG: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    HUBTEL_CLIENT_ID: 'test-client-id',
    HUBTEL_CLIENT_SECRET: 'test-client-secret',
    HUBTEL_MERCHANT_ACCOUNT_ID: 'test-merchant-id',
    HUBTEL_WEBHOOK_SECRET: 'test-webhook-secret',
    HUBTEL_ENVIRONMENT: 'sandbox',
    HUBTEL_BASE_URL: 'https://sandbox-api.hubtel.com/v1',
    HUBTEL_CALLBACK_URL: 'https://test.com/webhook'
  }
}));

describe('EscrowService', () => {
  let escrowService: EscrowService;
  let mockEscrowRepository: any;
  let mockPaymentService: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock instances
    mockEscrowRepository = {
      updateEscrowAmounts: vi.fn(),
      updateEscrowStage: vi.fn(),
      createEscrowTransaction: vi.fn(),
      getEscrowStatus: vi.fn()
    };
    
    mockPaymentService = {
      initiatePayment: vi.fn()
    };

    // Mock the constructors
    (EscrowRepository as any).mockImplementation(() => mockEscrowRepository);
    (PaymentService as any).mockImplementation(() => mockPaymentService);

    escrowService = new EscrowService();
  });

  describe('calculateBreakdown', () => {
    it('should calculate correct escrow breakdown', () => {
      const breakdown = escrowService.calculateBreakdown(1000);
      
      expect(breakdown.totalAmount).toBe(1000);
      expect(breakdown.depositAmount).toBe(250);    // 25%
      expect(breakdown.fittingAmount).toBe(500);    // 50%
      expect(breakdown.finalAmount).toBe(250);      // 25%
    });

    it('should handle decimal amounts correctly', () => {
      const breakdown = escrowService.calculateBreakdown(123.45);
      
      const sum = breakdown.depositAmount + breakdown.fittingAmount + breakdown.finalAmount;
      expect(Math.abs(sum - 123.45)).toBeLessThanOrEqual(0.01);
    });
  });

  describe('getStageAmount', () => {
    it('should return correct amount for each stage', () => {
      expect(escrowService.getStageAmount(1000, 'DEPOSIT')).toBe(250);
      expect(escrowService.getStageAmount(1000, 'FITTING')).toBe(500);
      expect(escrowService.getStageAmount(1000, 'FINAL')).toBe(250);
      expect(escrowService.getStageAmount(1000, 'RELEASED')).toBe(0);
    });
  });

  describe('initiateEscrowPayment', () => {
    it('should successfully initiate escrow payment', async () => {
      // Setup mocks
      mockEscrowRepository.updateEscrowAmounts.mockResolvedValue(true);
      mockEscrowRepository.updateEscrowStage.mockResolvedValue(true);
      mockEscrowRepository.createEscrowTransaction.mockResolvedValue({
        id: 'txn-123',
        orderId: 'order-123'
      });
      
      mockPaymentService.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'payment-123',
        paymentUrl: 'https://pay.hubtel.com/123',
        message: 'Payment initiated',
        status: 'PENDING'
      });

      // Execute
      const result = await escrowService.initiateEscrowPayment(
        'order-123',
        1000,
        '+233241234567',
        'customer-123'
      );

      // Verify
      expect(result.paymentIntentId).toBe('payment-123');
      expect(result.depositAmount).toBe(250);
      expect(result.paymentUrl).toBe('https://pay.hubtel.com/123');
      expect(result.orderStatus).toBe('PENDING_DEPOSIT');

      // Verify repository calls
      expect(mockEscrowRepository.updateEscrowAmounts).toHaveBeenCalledWith(
        'order-123',
        250,  // deposit
        500,  // fitting
        250,  // final
        1000  // escrow balance
      );
      
      expect(mockEscrowRepository.updateEscrowStage).toHaveBeenCalledWith('order-123', 'DEPOSIT');
      
      expect(mockPaymentService.initiatePayment).toHaveBeenCalledWith({
        orderId: 'order-123',
        amount: 250,
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        description: 'Deposit payment for order order-123 (25% of 1000)'
      });
    });

    it('should handle payment service failure', async () => {
      // Setup mocks
      mockEscrowRepository.updateEscrowAmounts.mockResolvedValue(true);
      mockEscrowRepository.updateEscrowStage.mockResolvedValue(true);
      
      mockPaymentService.initiatePayment.mockResolvedValue({
        success: false,
        transactionId: 'failed-123',
        message: 'Payment failed',
        status: 'FAILED'
      });

      // Execute and verify
      await expect(
        escrowService.initiateEscrowPayment(
          'order-123',
          1000,
          '+233241234567',
          'customer-123'
        )
      ).rejects.toThrow('Payment initiation failed: Payment failed');
    });
  });

  describe('processDepositPayment', () => {
    it('should successfully process deposit payment', async () => {
      // Setup mocks
      mockEscrowRepository.updateEscrowStage.mockResolvedValue(true);
      mockEscrowRepository.createEscrowTransaction.mockResolvedValue({
        id: 'txn-123'
      });

      // Execute
      const result = await escrowService.processDepositPayment(
        'order-123',
        'payment-123',
        250
      );

      // Verify
      expect(result).toBe(true);
      expect(mockEscrowRepository.updateEscrowStage).toHaveBeenCalledWith(
        'order-123',
        'FITTING',
        250
      );
      expect(mockEscrowRepository.createEscrowTransaction).toHaveBeenCalledWith(
        'order-123',
        'DEPOSIT',
        250,
        'DEPOSIT',
        'FITTING',
        'payment-123',
        undefined,
        'Deposit payment confirmed, order ready for fitting'
      );
    });

    it('should handle repository errors gracefully', async () => {
      // Setup mocks
      mockEscrowRepository.updateEscrowStage.mockRejectedValue(new Error('Database error'));

      // Execute
      const result = await escrowService.processDepositPayment(
        'order-123',
        'payment-123',
        250
      );

      // Verify
      expect(result).toBe(false);
    });
  });

  describe('approveMilestone', () => {
    it('should approve fitting milestone correctly', async () => {
      // Setup mocks
      const mockEscrowStatus = {
        orderId: 'order-123',
        currentStage: 'FITTING' as const,
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 750,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);
      mockEscrowRepository.updateEscrowStage.mockResolvedValue(true);
      mockEscrowRepository.createEscrowTransaction.mockResolvedValue({
        id: 'txn-456'
      });

      // Execute
      const result = await escrowService.approveMilestone(
        'order-123',
        'FITTING',
        'customer-123',
        'Fitting approved'
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.amountReleased).toBe(500); // 50% of 1000
      expect(result.newStage).toBe('FINAL');
      expect(result.transactionId).toBe('txn-456');

      expect(mockEscrowRepository.updateEscrowStage).toHaveBeenCalledWith(
        'order-123',
        'FINAL',
        500
      );
    });

    it('should approve final milestone correctly', async () => {
      // Setup mocks
      const mockEscrowStatus = {
        orderId: 'order-123',
        currentStage: 'FINAL' as const,
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 500,
        finalPaid: 0,
        escrowBalance: 250,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);
      mockEscrowRepository.updateEscrowStage.mockResolvedValue(true);
      mockEscrowRepository.createEscrowTransaction.mockResolvedValue({
        id: 'txn-789'
      });

      // Execute
      const result = await escrowService.approveMilestone(
        'order-123',
        'FINAL',
        'customer-123',
        'Delivery confirmed'
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.amountReleased).toBe(250); // 25% of 1000
      expect(result.newStage).toBe('RELEASED');
      expect(result.transactionId).toBe('txn-789');
    });

    it('should reject invalid stage transitions', async () => {
      // Setup mocks
      const mockEscrowStatus = {
        orderId: 'order-123',
        currentStage: 'DEPOSIT' as const,
        totalAmount: 1000,
        depositPaid: 0,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 1000,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      // Execute
      const result = await escrowService.approveMilestone(
        'order-123',
        'FITTING', // Trying to approve fitting when still in deposit stage
        'customer-123'
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.amountReleased).toBe(0);
      expect(result.newStage).toBe('FITTING');
    });

    it('should handle non-existent orders', async () => {
      // Setup mocks
      mockEscrowRepository.getEscrowStatus.mockResolvedValue(null);

      // Execute
      const result = await escrowService.approveMilestone(
        'non-existent-order',
        'FITTING',
        'customer-123'
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.amountReleased).toBe(0);
    });
  });

  describe('validateEscrowState', () => {
    it('should validate correct escrow state', async () => {
      // Setup mocks
      const mockEscrowStatus = {
        orderId: 'order-123',
        currentStage: 'FITTING' as const,
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 750, // 1000 - 250 = 750
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      // Execute
      const result = await escrowService.validateEscrowState('order-123');

      // Verify
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect escrow balance mismatch', async () => {
      // Setup mocks
      const mockEscrowStatus = {
        orderId: 'order-123',
        currentStage: 'FITTING' as const,
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 500, // Should be 750, but showing 500 (mismatch)
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      // Execute
      const result = await escrowService.validateEscrowState('order-123');

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Escrow balance mismatch: 500 vs 750');
    });
  });
});