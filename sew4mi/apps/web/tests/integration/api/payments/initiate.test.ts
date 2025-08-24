import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/payments/initiate/route';
import { paymentService } from '@/lib/services/payment.service';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('@/lib/services/payment.service');
vi.mock('@supabase/supabase-js');

const mockPaymentService = vi.mocked(paymentService);
const mockCreateClient = vi.mocked(createClient);

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  }
};

describe('/api/payments/initiate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);
    
    // Default mocks
    mockPaymentService.validateAmount.mockReturnValue({ isValid: true });
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user_123' } },
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST', () => {
    const validPaymentRequest = {
      orderId: 'order_123',
      amount: 100.50,
      customerPhoneNumber: '+233241234567',
      paymentMethod: 'MTN',
      description: 'Test payment'
    };

    const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
      return {
        json: vi.fn().mockResolvedValue(body),
        headers: {
          get: vi.fn((key: string) => headers[key] || null)
        }
      } as any as NextRequest;
    };

    it('should successfully initiate payment with valid request', async () => {
      const request = createMockRequest(validPaymentRequest, {
        'authorization': 'Bearer valid_token',
        'x-forwarded-for': '192.168.1.1'
      });

      mockPaymentService.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'tx_123',
        hubtelTransactionId: 'hubtel_tx_123',
        paymentUrl: 'https://checkout.hubtel.com/test',
        message: 'Payment initiated successfully',
        status: 'PENDING'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: {
          transactionId: 'tx_123',
          hubtelTransactionId: 'hubtel_tx_123',
          paymentUrl: 'https://checkout.hubtel.com/test',
          status: 'PENDING',
          message: 'Payment initiated successfully',
          amount: expect.stringMatching(/GHS?\s?100\.50/) // Allow different currency formatting
        }
      });

      expect(mockPaymentService.initiatePayment).toHaveBeenCalledWith(validPaymentRequest);
      expect(mockPaymentService.validateAmount).toHaveBeenCalledWith(100.50);
    });

    it('should reject requests without authentication', async () => {
      const request = createMockRequest(validPaymentRequest, {
        'x-forwarded-for': '192.168.1.1'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Authentication required');
    });

    it('should reject requests with invalid token', async () => {
      const request = createMockRequest(validPaymentRequest, {
        'authorization': 'Bearer invalid_token',
        'x-forwarded-for': '192.168.1.1'
      });

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid authentication token');
    });

    it('should validate request data', async () => {
      const invalidRequest = {
        orderId: 'invalid-uuid',
        amount: -50,
        customerPhoneNumber: '123456',
        paymentMethod: 'INVALID_METHOD'
      };

      const request = createMockRequest(invalidRequest, {
        'authorization': 'Bearer valid_token',
        'x-forwarded-for': '192.168.1.1'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid request data');
      expect(responseData.errors).toBeDefined();
    });

    it('should validate payment amount', async () => {
      const request = createMockRequest({
        ...validPaymentRequest,
        amount: -10
      }, {
        'authorization': 'Bearer valid_token',
        'x-forwarded-for': '192.168.1.1'
      });

      mockPaymentService.validateAmount.mockReturnValue({
        isValid: false,
        message: 'Amount must be greater than 0'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Amount must be greater than 0');
    });

    it('should handle payment service failures', async () => {
      const request = createMockRequest(validPaymentRequest, {
        'authorization': 'Bearer valid_token',
        'x-forwarded-for': '192.168.1.1'
      });

      mockPaymentService.initiatePayment.mockResolvedValue({
        success: false,
        transactionId: 'tx_123',
        message: 'Payment initiation failed',
        status: 'FAILED'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Payment initiation failed');
    });

    it('should handle rate limiting', async () => {
      // Simulate multiple requests from same IP
      const request = createMockRequest(validPaymentRequest, {
        'authorization': 'Bearer valid_token',
        'x-forwarded-for': '192.168.1.1'
      });

      // Make 11 requests (exceeding the limit of 10)
      const responses = [];
      for (let i = 0; i < 11; i++) {
        responses.push(await POST(request));
      }

      // The 11th request should be rate limited
      const lastResponse = responses[10];
      const responseData = await lastResponse.json();

      expect(lastResponse.status).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('Rate limit exceeded');
    });

    it('should handle internal server errors gracefully', async () => {
      const request = createMockRequest(validPaymentRequest, {
        'authorization': 'Bearer valid_token',
        'x-forwarded-for': '192.168.1.1'
      });

      mockPaymentService.initiatePayment.mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Internal server error. Please try again later.');
    });

    it('should handle malformed JSON', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: {
          get: vi.fn((key: string) => ({
            'authorization': 'Bearer valid_token',
            'x-forwarded-for': '192.168.1.1'
          }[key] || null))
        }
      } as any as NextRequest;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Internal server error. Please try again later.');
    });
  });

  describe('GET', () => {
    it('should return payment configuration', async () => {
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: {
          supportedMethods: ['MTN', 'VODAFONE', 'AIRTELTIGO', 'CARD'],
          currency: 'GHS',
          minAmount: 0.01,
          maxAmount: 100000,
          rateLimit: {
            requestsPerMinute: 10
          }
        }
      });
    });

    it('should handle errors gracefully', async () => {
      // Force an error by mocking a dependency to throw
      vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('JSON error');
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Failed to retrieve payment configuration');

      vi.restoreAllMocks();
    });
  });
});