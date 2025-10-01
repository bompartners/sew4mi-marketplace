import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/webhooks/hubtel/route';
import { paymentService } from '@/lib/services/payment.service';

// Mock dependencies
vi.mock('@/lib/services/payment.service');

const mockPaymentService = vi.mocked(paymentService);

// Test data shared across describe blocks
const validWebhookPayload = {
  transactionId: 'tx_123',
  hubtelTransactionId: 'hubtel_tx_123',
  status: 'success',
  amount: 100.50,
  customerPhoneNumber: '+233241234567',
  paymentMethod: 'MTN',
  timestamp: '2024-08-21T11:00:00Z',
  signature: 'valid_signature'
};

const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  const payloadString = JSON.stringify(body);
  return {
    text: vi.fn().mockResolvedValue(payloadString),
    headers: {
      get: vi.fn((key: string) => headers[key] || null)
    }
  } as any as NextRequest;
};

describe('/api/webhooks/hubtel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST', () => {

    it('should successfully process valid webhook', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'x-hubtel-signature': 'valid_signature'
      });

      mockPaymentService.processWebhook.mockResolvedValue({
        success: true,
        message: 'Webhook processed successfully',
        transactionId: 'tx_123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        message: 'Webhook processed successfully',
        transactionId: 'tx_123'
      });

      expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
        JSON.stringify(validWebhookPayload),
        'valid_signature'
      );
    });

    it('should reject webhook with invalid signature', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'x-hubtel-signature': 'invalid_signature'
      });

      mockPaymentService.processWebhook.mockResolvedValue({
        success: false,
        message: 'Invalid webhook signature'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid webhook signature');
    });

    it('should handle missing signature header', async () => {
      const request = createMockRequest(validWebhookPayload);

      mockPaymentService.processWebhook.mockResolvedValue({
        success: false,
        message: 'Invalid webhook signature'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid webhook signature');

      // Should pass empty signature to payment service
      expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
        expect.any(String),
        ''
      );
    });

    it('should handle different signature header names', async () => {
      const headerVariations = [
        'x-hubtel-signature',
        'x-signature',
        'signature'
      ];

      for (const headerName of headerVariations) {
        vi.clearAllMocks();

        const request = createMockRequest(validWebhookPayload, {
          [headerName]: 'test_signature'
        });

        mockPaymentService.processWebhook.mockResolvedValue({
          success: true,
          message: 'Webhook processed successfully',
          transactionId: 'tx_123'
        });

        await POST(request);

        expect(mockPaymentService.processWebhook).toHaveBeenCalledWith(
          expect.any(String),
          'test_signature'
        );
      }
    });

    it('should validate webhook payload structure', async () => {
      const invalidPayload = {
        transactionId: 'tx_123',
        // Missing required fields
        amount: 'invalid_amount', // Should be number
        customerPhoneNumber: '123456', // Invalid Ghana phone number
      };

      const request = createMockRequest(invalidPayload, {
        'x-hubtel-signature': 'valid_signature'
      });

      mockPaymentService.processWebhook.mockResolvedValue({
        success: true,
        message: 'Webhook signature verified',
        transactionId: 'tx_123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid webhook payload structure');
      expect(responseData.errors).toBeDefined();
    });

    it('should handle malformed JSON payload', async () => {
      const request = {
        text: vi.fn().mockResolvedValue('invalid json'),
        headers: {
          get: vi.fn(() => 'valid_signature')
        }
      } as any as NextRequest;

      mockPaymentService.processWebhook.mockResolvedValue({
        success: true,
        message: 'Webhook signature verified',
        transactionId: 'tx_123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid JSON payload');
    });

    it('should handle duplicate webhooks (idempotency)', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'x-hubtel-signature': 'valid_signature'
      });

      mockPaymentService.processWebhook.mockResolvedValue({
        success: true,
        message: 'Webhook processed successfully',
        transactionId: 'tx_123'
      });

      // First webhook
      const response1 = await POST(request);
      const responseData1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(responseData1.success).toBe(true);

      // Second identical webhook (should be ignored due to cache)
      vi.clearAllMocks();
      const response2 = await POST(request);
      const responseData2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(responseData2.message).toBe('Webhook already processed');
    });

    it('should handle payment service processing failures', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'x-hubtel-signature': 'valid_signature'
      });

      mockPaymentService.processWebhook.mockResolvedValue({
        success: true,
        message: 'Webhook signature verified',
        transactionId: 'tx_123'
      });

      // Mock the payment service to fail on the second call (database update)
      mockPaymentService.processWebhook.mockResolvedValueOnce({
        success: true,
        message: 'Webhook signature verified',
        transactionId: 'tx_123'
      }).mockResolvedValueOnce({
        success: false,
        message: 'Database update failed'
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Should still return success as webhook was verified
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.transactionId).toBe('tx_123');
    });

    it('should return 500 for unexpected errors to trigger Hubtel retry', async () => {
      const request = createMockRequest(validWebhookPayload, {
        'x-hubtel-signature': 'valid_signature'
      });

      mockPaymentService.processWebhook.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Webhook processing failed');
    });

    it('should handle text parsing errors', async () => {
      const request = {
        text: vi.fn().mockRejectedValue(new Error('Network error')),
        headers: {
          get: vi.fn(() => 'valid_signature')
        }
      } as any as NextRequest;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Webhook processing failed');
    });
  });

  describe('GET', () => {
    it('should return webhook health check', async () => {
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        message: 'Hubtel webhook endpoint is active',
        timestamp: expect.any(String),
        processedWebhooks: expect.any(Number)
      });
    });

    it('should handle health check errors gracefully', async () => {
      // Mock Date.toISOString to throw an error
      vi.spyOn(Date.prototype, 'toISOString').mockImplementationOnce(() => {
        throw new Error('Date error');
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Webhook endpoint health check failed');

      vi.restoreAllMocks();
    });
  });

  describe('webhook cache management', () => {
    it('should clean expired webhook cache entries', async () => {
      // This test verifies that the internal cache management works
      // We can't directly test the private cache, but we can test behavior
      
      const request = createMockRequest(validWebhookPayload, {
        'x-hubtel-signature': 'valid_signature'
      });

      mockPaymentService.processWebhook.mockResolvedValue({
        success: true,
        message: 'Webhook processed successfully',
        transactionId: 'tx_123'
      });

      // Process webhook
      await POST(request);

      // Mock time passing (more than 5 minutes = cache TTL)
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000);

      // Process same webhook again - should not be treated as duplicate
      vi.clearAllMocks();
      mockPaymentService.processWebhook.mockResolvedValue({
        success: true,
        message: 'Webhook processed successfully',
        transactionId: 'tx_123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Should process normally, not as duplicate
      expect(response.status).toBe(200);
      expect(responseData.message).not.toBe('Webhook already processed');

      vi.restoreAllMocks();
    });
  });
});