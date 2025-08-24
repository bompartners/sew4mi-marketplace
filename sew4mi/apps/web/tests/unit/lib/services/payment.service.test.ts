import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentService } from '@/lib/services/payment.service';
import { hubtelService } from '@/lib/services/hubtel.service';
import { paymentRepository } from '@/lib/repositories/payment.repository';
import { PaymentInitiationRequest, HubtelWebhookPayload } from '@sew4mi/shared/types';
import { validateGhanaPhoneNumber } from '@sew4mi/shared';

// Mock environment configuration first
vi.mock('@/lib/config/env', () => ({
  ENV_CONFIG: {
    HUBTEL_CLIENT_ID: 'test_client_id',
    HUBTEL_CLIENT_SECRET: 'test_client_secret',
    HUBTEL_MERCHANT_ACCOUNT_ID: 'test_merchant_id',
    HUBTEL_WEBHOOK_SECRET: 'test_webhook_secret',
    HUBTEL_BASE_URL: 'https://api.hubtel.com/v1',
    HUBTEL_ENVIRONMENT: 'sandbox' as const,
    HUBTEL_CALLBACK_URL: 'https://test.com/webhook',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test_anon_key'
  },
  validateHubtelEnvironment: vi.fn()
}));

// Mock dependencies
vi.mock('@/lib/services/hubtel.service');
vi.mock('@/lib/repositories/payment.repository');
vi.mock('@sew4mi/shared', () => ({
  validateGhanaPhoneNumber: vi.fn(),
  PAYMENT_PROVIDERS: {
    HUBTEL_MTN: 'HUBTEL_MTN',
    HUBTEL_VODAFONE: 'HUBTEL_VODAFONE',
    HUBTEL_AIRTELTIGO: 'HUBTEL_AIRTELTIGO',
    HUBTEL_CARD: 'HUBTEL_CARD',
  },
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    DELAYS: [2000, 5000, 10000]
  }
}));

const mockHubtelService = vi.mocked(hubtelService);
const mockPaymentRepository = vi.mocked(paymentRepository);
const mockValidateGhanaPhoneNumber = vi.mocked(validateGhanaPhoneNumber);

describe('PaymentService', () => {
  let paymentService: PaymentService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    paymentService = new PaymentService();
    
    // Default mock implementations
    mockValidateGhanaPhoneNumber.mockReturnValue({
      isValid: true,
      network: 'MTN',
      formattedNumber: '+233241234567'
    });

    // Mock the delay function to avoid timeouts
    vi.spyOn(paymentService as any, 'delay').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initiatePayment', () => {
    const mockPaymentRequest: PaymentInitiationRequest = {
      orderId: 'order_123',
      amount: 100.50,
      customerPhoneNumber: '0241234567',
      paymentMethod: 'MTN',
      description: 'Test payment'
    };

    it('should successfully initiate payment', async () => {
      // Mock Hubtel service response
      mockHubtelService.initiateMobileMoneyPayment.mockResolvedValue({
        transactionId: 'tx_123',
        hubtelTransactionId: 'hubtel_tx_123',
        status: 'PENDING',
        paymentUrl: 'https://checkout.hubtel.com/test',
        message: 'Payment initiated successfully'
      });

      // Mock repository response
      mockPaymentRepository.create.mockResolvedValue({
        id: 'tx_123',
        orderId: 'order_123',
        type: 'DEPOSIT' as const,
        amount: 100.50,
        provider: 'HUBTEL_MTN' as const,
        providerTransactionId: 'tx_123',
        hubtelTransactionId: 'hubtel_tx_123',
        paymentMethod: 'MTN',
        customerPhoneNumber: '+233241234567',
        status: 'PENDING' as const,
        webhookReceived: false,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await paymentService.initiatePayment(mockPaymentRequest);

      expect(result).toEqual({
        success: true,
        transactionId: 'tx_123',
        hubtelTransactionId: 'hubtel_tx_123',
        paymentUrl: 'https://checkout.hubtel.com/test',
        message: 'Payment initiated successfully',
        status: 'PENDING'
      });

      expect(mockPaymentRepository.create).toHaveBeenCalledWith({
        id: expect.any(String),
        orderId: 'order_123',
        type: 'DEPOSIT',
        amount: 100.50,
        provider: 'HUBTEL_MTN' as const,
        providerTransactionId: expect.any(String),
        hubtelTransactionId: 'hubtel_tx_123',
        paymentMethod: 'MTN',
        customerPhoneNumber: '+233241234567',
        status: 'PENDING'
      });
    });

    it('should handle invalid phone numbers', async () => {
      mockValidateGhanaPhoneNumber.mockReturnValue({
        isValid: false
      });

      const invalidRequest = {
        ...mockPaymentRequest,
        customerPhoneNumber: '123456789'
      };

      const result = await paymentService.initiatePayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid phone number format');
      expect(result.status).toBe('FAILED');
    });

    it('should handle Hubtel API errors', async () => {
      mockHubtelService.initiateMobileMoneyPayment.mockRejectedValue(
        new Error('Hubtel API error')
      );

      const result = await paymentService.initiatePayment(mockPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Hubtel API error');
      expect(result.status).toBe('FAILED');
    });

    it('should handle database save failures gracefully', async () => {
      mockHubtelService.initiateMobileMoneyPayment.mockResolvedValue({
        transactionId: 'tx_123',
        hubtelTransactionId: 'hubtel_tx_123',
        status: 'PENDING',
        paymentUrl: 'https://checkout.hubtel.com/test',
        message: 'Payment initiated successfully'
      });

      // Mock repository failure
      mockPaymentRepository.create.mockResolvedValue(null);

      const result = await paymentService.initiatePayment(mockPaymentRequest);

      // Should still return success as Hubtel call succeeded
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx_123');
    });
  });

  describe('verifyPaymentStatus', () => {
    const mockPaymentTransaction = {
      id: 'tx_123',
      orderId: 'order_123',
      type: 'DEPOSIT' as const,
      amount: 100.50,
      provider: 'HUBTEL_MTN' as const,
      providerTransactionId: 'tx_123',
      hubtelTransactionId: 'hubtel_tx_123',
      paymentMethod: 'MTN',
      customerPhoneNumber: '+233241234567',
      status: 'PENDING' as const,
      webhookReceived: false,
      retryCount: 0,
      createdAt: new Date('2024-08-21T10:00:00Z'),
      updatedAt: new Date('2024-08-21T10:00:00Z')
    };

    it('should successfully verify payment status', async () => {
      mockPaymentRepository.findById.mockResolvedValue(mockPaymentTransaction);
      mockHubtelService.getTransactionStatus.mockResolvedValue({
        transactionId: 'hubtel_tx_123',
        hubtelTransactionId: 'hubtel_tx_123',
        status: 'SUCCESS',
        amount: 100.50,
        customerPhoneNumber: '+233241234567',
        message: 'Payment completed',
        timestamp: '2024-08-21T11:00:00Z'
      });

      mockPaymentRepository.updateStatus.mockResolvedValue({
        ...mockPaymentTransaction,
        status: 'SUCCESS'
      });

      const result = await paymentService.verifyPaymentStatus('tx_123', 'hubtel_tx_123');

      expect(result).toEqual({
        transactionId: 'tx_123',
        status: 'SUCCESS',
        amount: 100.50,
        provider: 'HUBTEL_MTN' as const,
        createdAt: new Date('2024-08-21T10:00:00Z'),
        updatedAt: expect.any(Date)
      });

      expect(mockPaymentRepository.updateStatus).toHaveBeenCalledWith('tx_123', {
        status: 'SUCCESS',
        hubtelTransactionId: 'hubtel_tx_123',
        retryCount: 0
      });
    });

    it('should handle transaction not found', async () => {
      mockPaymentRepository.findById.mockResolvedValue(null);

      const result = await paymentService.verifyPaymentStatus('nonexistent_tx');

      expect(result.status).toBe('FAILED');
      expect(result.amount).toBe(0);
      expect(result.provider).toBe('UNKNOWN');
    });

    it('should implement retry logic for failures', async () => {
      mockPaymentRepository.findById.mockResolvedValue(mockPaymentTransaction);
      mockHubtelService.getTransactionStatus.mockRejectedValue(
        new Error('Network error')
      );
      mockPaymentRepository.incrementRetryCount.mockResolvedValue(true);

      // Mock delay to make test faster
      vi.spyOn(paymentService as any, 'delay').mockResolvedValue(undefined);

      const result = await paymentService.verifyPaymentStatus('tx_123');

      expect(mockPaymentRepository.incrementRetryCount).toHaveBeenCalledWith('tx_123');
      expect(result.status).toBe('FAILED');
    });

    it('should not update status if unchanged', async () => {
      const pendingTransaction = {
        ...mockPaymentTransaction,
        status: 'PENDING' as const
      };

      mockPaymentRepository.findById.mockResolvedValue(pendingTransaction);
      mockHubtelService.getTransactionStatus.mockResolvedValue({
        transactionId: 'hubtel_tx_123',
        hubtelTransactionId: 'hubtel_tx_123',
        status: 'PENDING', // Same status
        amount: 100.50,
        customerPhoneNumber: '+233241234567',
        message: 'Payment pending',
        timestamp: '2024-08-21T11:00:00Z'
      });

      await paymentService.verifyPaymentStatus('tx_123');

      expect(mockPaymentRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('processWebhook', () => {
    const mockWebhookPayload: HubtelWebhookPayload = {
      transactionId: 'tx_123',
      hubtelTransactionId: 'hubtel_tx_123',
      status: 'success',
      amount: 100.50,
      customerPhoneNumber: '+233241234567',
      paymentMethod: 'MTN',
      timestamp: '2024-08-21T11:00:00Z',
      signature: 'valid_signature'
    };

    it('should successfully process webhook', async () => {
      const payload = JSON.stringify(mockWebhookPayload);
      const signature = 'valid_signature';

      mockHubtelService.verifyWebhookSignature.mockReturnValue(true);

      // Mock updatePaymentFromWebhook method
      vi.spyOn(paymentService as any, 'updatePaymentFromWebhook').mockResolvedValue({
        success: true
      });

      const result = await paymentService.processWebhook(payload, signature);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx_123');
      expect(mockHubtelService.verifyWebhookSignature).toHaveBeenCalledWith(payload, signature);
    });

    it('should reject webhooks with invalid signatures', async () => {
      const payload = JSON.stringify(mockWebhookPayload);
      const signature = 'invalid_signature';

      mockHubtelService.verifyWebhookSignature.mockReturnValue(false);

      const result = await paymentService.processWebhook(payload, signature);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
    });

    it('should handle malformed JSON payload', async () => {
      const payload = 'invalid json';
      const signature = 'valid_signature';

      mockHubtelService.verifyWebhookSignature.mockReturnValue(true);

      const result = await paymentService.processWebhook(payload, signature);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not valid JSON');
    });
  });

  describe('updatePaymentFromWebhook', () => {
    const mockWebhookData: HubtelWebhookPayload = {
      transactionId: 'tx_123',
      hubtelTransactionId: 'hubtel_tx_123',
      status: 'success',
      amount: 100.50,
      customerPhoneNumber: '+233241234567',
      paymentMethod: 'MTN',
      timestamp: '2024-08-21T11:00:00Z',
      signature: 'valid_signature'
    };

    const mockPaymentTransaction = {
      id: 'tx_123',
      orderId: 'order_123',
      type: 'DEPOSIT' as const,
      amount: 100.50,
      provider: 'HUBTEL_MTN' as const,
      providerTransactionId: 'tx_123',
      hubtelTransactionId: 'hubtel_tx_123',
      paymentMethod: 'MTN',
      customerPhoneNumber: '+233241234567',
      status: 'PENDING' as const,
      webhookReceived: false,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should successfully update payment from webhook', async () => {
      mockPaymentRepository.findByProviderTransactionId.mockResolvedValue(mockPaymentTransaction);
      mockPaymentRepository.updateStatus.mockResolvedValue({
        ...mockPaymentTransaction,
        status: 'SUCCESS',
        webhookReceived: true
      });

      const result = await (paymentService as any).updatePaymentFromWebhook(mockWebhookData);

      expect(result.success).toBe(true);
      expect(mockPaymentRepository.updateStatus).toHaveBeenCalledWith('tx_123', {
        status: 'SUCCESS',
        hubtelTransactionId: 'hubtel_tx_123',
        webhookReceived: true
      });
    });

    it('should find transaction by Hubtel ID if not found by provider ID', async () => {
      mockPaymentRepository.findByProviderTransactionId.mockResolvedValue(null);
      mockPaymentRepository.findByHubtelTransactionId.mockResolvedValue(mockPaymentTransaction);
      mockPaymentRepository.updateStatus.mockResolvedValue({
        ...mockPaymentTransaction,
        status: 'SUCCESS'
      });

      const result = await (paymentService as any).updatePaymentFromWebhook(mockWebhookData);

      expect(result.success).toBe(true);
      expect(mockPaymentRepository.findByHubtelTransactionId).toHaveBeenCalledWith('hubtel_tx_123');
    });

    it('should handle transaction not found', async () => {
      mockPaymentRepository.findByProviderTransactionId.mockResolvedValue(null);
      mockPaymentRepository.findByHubtelTransactionId.mockResolvedValue(null);

      const result = await (paymentService as any).updatePaymentFromWebhook(mockWebhookData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment transaction not found');
    });

    it('should handle database update failures', async () => {
      mockPaymentRepository.findByProviderTransactionId.mockResolvedValue(mockPaymentTransaction);
      mockPaymentRepository.updateStatus.mockResolvedValue(null);

      const result = await (paymentService as any).updatePaymentFromWebhook(mockWebhookData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update payment transaction status');
    });
  });

  describe('utility methods', () => {
    describe('validateAmount', () => {
      it('should validate correct amounts', () => {
        const validAmounts = [0.01, 1.50, 100, 50000];
        
        validAmounts.forEach(amount => {
          const result = paymentService.validateAmount(amount);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid amounts', () => {
        const invalidAmounts = [
          { amount: 0, expectedMessage: 'Amount must be greater than 0' },
          { amount: -5, expectedMessage: 'Amount must be greater than 0' },
          { amount: 0.001, expectedMessage: 'Minimum amount is GH₵0.01' },
          { amount: 100001, expectedMessage: 'Maximum amount is GH₵100,000' }
        ];
        
        invalidAmounts.forEach(({ amount, expectedMessage }) => {
          const result = paymentService.validateAmount(amount);
          expect(result.isValid).toBe(false);
          expect(result.message).toBe(expectedMessage);
        });
      });
    });

    describe('formatGhanaCedi', () => {
      it('should format amounts correctly', () => {
        const testCases = [
          { amount: 100.50, expected: /GH₵\s?100\.50/ }, // Ghana Cedi symbol
          { amount: 1, expected: /GH₵\s?1\.00/ },
          { amount: 0.01, expected: /GH₵\s?0\.01/ }
        ];
        
        testCases.forEach(({ amount, expected }) => {
          const result = paymentService.formatGhanaCedi(amount);
          expect(result).toMatch(expected);
        });
      });
    });

    describe('shouldContinuePolling', () => {
      it('should stop polling for final statuses', () => {
        const finalStatuses = ['SUCCESS', 'FAILED', 'CANCELLED'];
        
        finalStatuses.forEach(status => {
          const result = paymentService.shouldContinuePolling(status, 0);
          expect(result).toBe(false);
        });
      });

      it('should continue polling for pending status within retry limit', () => {
        const result = paymentService.shouldContinuePolling('PENDING', 1);
        expect(result).toBe(true);
      });

      it('should stop polling after max retries', () => {
        const result = paymentService.shouldContinuePolling('PENDING', 5);
        expect(result).toBe(false);
      });
    });
  });
});