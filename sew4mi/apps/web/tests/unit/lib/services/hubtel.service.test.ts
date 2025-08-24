import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HubtelService } from '@/lib/services/hubtel.service';
import { ENV_CONFIG } from '@/lib/config/env';
import { validateGhanaPhoneNumber } from '@sew4mi/shared';

// Mock environment configuration
vi.mock('@/lib/config/env', () => ({
  ENV_CONFIG: {
    HUBTEL_CLIENT_ID: 'test_client_id',
    HUBTEL_CLIENT_SECRET: 'test_client_secret',
    HUBTEL_MERCHANT_ACCOUNT_ID: 'test_merchant_id',
    HUBTEL_WEBHOOK_SECRET: 'test_webhook_secret',
    HUBTEL_BASE_URL: 'https://api.hubtel.com/v1',
    HUBTEL_ENVIRONMENT: 'sandbox' as const,
    HUBTEL_CALLBACK_URL: 'https://test.com/webhook'
  },
  validateHubtelEnvironment: vi.fn()
}));

// Mock network service
vi.mock('@/lib/services/networkService', () => ({
  networkService: {
    withRetry: vi.fn((operation) => operation()),
  }
}));

describe('HubtelService', () => {
  let hubtelService: HubtelService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    hubtelService = new HubtelService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Ghana phone number validation', () => {
    it('should validate MTN phone numbers correctly', () => {
      const validMtnNumbers = [
        '+233241234567',
        '0241234567',
        '241234567',
        '+233541234567',
        '0551234567'
      ];

      validMtnNumbers.forEach(number => {
        const result = validateGhanaPhoneNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('MTN');
        expect(result.formattedNumber).toMatch(/^\+233(24|54|55|59)\d{7}$/);
      });
    });

    it('should validate Vodafone phone numbers correctly', () => {
      const validVodafoneNumbers = [
        '+233201234567',
        '0201234567',
        '+233501234567',
        '0501234567'
      ];

      validVodafoneNumbers.forEach(number => {
        const result = validateGhanaPhoneNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('VODAFONE');
        expect(result.formattedNumber).toMatch(/^\+233(20|50)\d{7}$/);
      });
    });

    it('should validate AirtelTigo phone numbers correctly', () => {
      const validAirtelTigoNumbers = [
        '+233271234567',
        '0271234567',
        '+233571234567',
        '0561234567'
      ];

      validAirtelTigoNumbers.forEach(number => {
        const result = validateGhanaPhoneNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('AIRTELTIGO');
        expect(result.formattedNumber).toMatch(/^\+233(27|57|26|56)\d{7}$/);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123456789',      // Too short
        '12345678901234', // Too long
        '+1234567890',    // Wrong country code
        '+233123456789',  // Invalid prefix
        'abc123456789',   // Contains letters
        '',               // Empty string
        null,             // Null
        undefined         // Undefined
      ];

      invalidNumbers.forEach(number => {
        const result = validateGhanaPhoneNumber(number as any);
        expect(result.isValid).toBe(false);
        expect(result.network).toBeUndefined();
        expect(result.formattedNumber).toBeUndefined();
      });
    });
  });

  describe('initiateMobileMoneyPayment', () => {
    it('should handle invalid phone numbers', async () => {
      const paymentRequest = {
        amount: 100.50,
        customerPhoneNumber: '123456789', // Invalid
        paymentMethod: 'MTN',
        transactionId: 'tx_123',
        description: 'Test payment'
      };

      await expect(hubtelService.initiateMobileMoneyPayment(paymentRequest))
        .rejects.toThrow('Invalid Ghana phone number: 123456789');
    });
  });

  describe('getTransactionStatus', () => {
    // API integration tests would go here
    // For unit tests, we focus on validation and error handling
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signatures', () => {
      const payload = JSON.stringify({ transactionId: 'tx_123', status: 'success' });
      
      // Create expected signature using the mocked webhook secret
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(payload)
        .digest('hex');

      const isValid = hubtelService.verifyWebhookSignature(payload, expectedSignature);
      expect(isValid).toBe(true);

      // Test with sha256= prefix
      const isValidWithPrefix = hubtelService.verifyWebhookSignature(payload, `sha256=${expectedSignature}`);
      expect(isValidWithPrefix).toBe(true);
    });

    it('should reject invalid webhook signatures', () => {
      const payload = JSON.stringify({ transactionId: 'tx_123', status: 'success' });
      const invalidSignature = 'invalid_signature';

      const isValid = hubtelService.verifyWebhookSignature(payload, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('should handle signature verification errors gracefully', () => {
      const payload = JSON.stringify({ transactionId: 'tx_123', status: 'success' });
      
      // Test with malformed signature that would cause an error
      const malformedSignature = 'not_hex_encoded!!!';
      
      const isValid = hubtelService.verifyWebhookSignature(payload, malformedSignature);
      expect(isValid).toBe(false);
    });
  });

  describe('status mapping', () => {
    it('should map Hubtel statuses correctly', () => {
      const testCases = [
        { hubtelStatus: '0000', expected: 'SUCCESS' },
        { hubtelStatus: 'success', expected: 'SUCCESS' },
        { hubtelStatus: 'paid', expected: 'SUCCESS' },
        { hubtelStatus: '0001', expected: 'PENDING' },
        { hubtelStatus: 'pending', expected: 'PENDING' },
        { hubtelStatus: 'processing', expected: 'PENDING' },
        { hubtelStatus: 'failed', expected: 'FAILED' },
        { hubtelStatus: 'declined', expected: 'FAILED' },
        { hubtelStatus: 'cancelled', expected: 'CANCELLED' },
        { hubtelStatus: 'unknown_status', expected: 'PENDING' }
      ];

      testCases.forEach(({ hubtelStatus, expected }) => {
        // Use reflection to test the private method
        const result = (hubtelService as any).mapHubtelStatus(hubtelStatus);
        expect(result).toBe(expected);
      });
    });
  });

  describe('channel mapping', () => {
    it('should map networks to correct Hubtel channels', () => {
      const testCases = [
        { network: 'MTN', expected: 'mtn-gh' },
        { network: 'VODAFONE', expected: 'vodafone-gh' },
        { network: 'AIRTELTIGO', expected: 'airteltigo-gh' }
      ];

      testCases.forEach(({ network, expected }) => {
        // Use reflection to test the private method
        const result = (hubtelService as any).getHubtelChannel(network);
        expect(result).toBe(expected);
      });
    });

    it('should throw error for unsupported network', () => {
      expect(() => {
        (hubtelService as any).getHubtelChannel('UNSUPPORTED');
      }).toThrow('Unsupported network: UNSUPPORTED');
    });
  });
});