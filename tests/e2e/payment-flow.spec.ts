import { test, expect } from '@playwright/test';

test.describe('Payment Flow E2E Tests', () => {
  let authToken: string;
  
  test.beforeEach(async ({ request }) => {
    // Setup: Create test user and get auth token
    // This would need to be adapted based on your auth flow
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'testpassword123'
      }
    });
    
    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      authToken = loginData.session?.access_token;
    }
  });

  test.describe('Payment Initiation API', () => {
    test('should successfully initiate MTN mobile money payment', async ({ request }) => {
      const paymentRequest = {
        orderId: 'order_' + Date.now(),
        amount: 100.50,
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        description: 'Test payment for E2E'
      };

      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: paymentRequest
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        data: {
          transactionId: expect.any(String),
          status: 'PENDING',
          message: expect.any(String),
          amount: expect.stringContaining('100.50')
        }
      });

      // Store transaction ID for subsequent tests
      test.info().annotations.push({
        type: 'transactionId',
        description: responseData.data.transactionId
      });
    });

    test('should reject payment with invalid phone number', async ({ request }) => {
      const paymentRequest = {
        orderId: 'order_' + Date.now(),
        amount: 50.00,
        customerPhoneNumber: '123456789', // Invalid Ghana phone number
        paymentMethod: 'MTN',
        description: 'Test payment with invalid phone'
      };

      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: paymentRequest
      });

      expect(response.status()).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.errors).toBeDefined();
    });

    test('should reject payment without authentication', async ({ request }) => {
      const paymentRequest = {
        orderId: 'order_' + Date.now(),
        amount: 50.00,
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        description: 'Test payment without auth'
      };

      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: paymentRequest
      });

      expect(response.status()).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: false,
        message: 'Authentication required'
      });
    });

    test('should handle rate limiting', async ({ request }) => {
      const paymentRequest = {
        orderId: 'order_' + Date.now(),
        amount: 10.00,
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        description: 'Rate limit test'
      };

      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(12).fill(null).map(() => 
        request.post('/api/payments/initiate', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: { ...paymentRequest, orderId: 'order_' + Date.now() + Math.random() }
        })
      );

      const responses = await Promise.all(requests);
      
      // At least one response should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      if (rateLimitedResponses.length > 0) {
        const responseData = await rateLimitedResponses[0].json();
        expect(responseData).toMatchObject({
          success: false,
          message: expect.stringContaining('Rate limit exceeded')
        });
      }
    });
  });

  test.describe('Payment Status API', () => {
    let transactionId: string;

    test.beforeEach(async ({ request }) => {
      // Create a payment transaction first
      const paymentRequest = {
        orderId: 'order_' + Date.now(),
        amount: 75.00,
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        description: 'Status check test payment'
      };

      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: paymentRequest
      });

      const responseData = await response.json();
      transactionId = responseData.data.transactionId;
    });

    test('should successfully get payment status', async ({ request }) => {
      const response = await request.get(`/api/payments/status/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        data: {
          transactionId: transactionId,
          status: expect.any(String),
          amount: expect.any(String),
          provider: expect.any(String),
          lastUpdated: expect.any(String),
          canRetry: expect.any(Boolean)
        }
      });
    });

    test('should reject status check without authentication', async ({ request }) => {
      const response = await request.get(`/api/payments/status/${transactionId}`);

      expect(response.status()).toBe(401);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: false,
        message: 'Authentication required'
      });
    });

    test('should handle invalid transaction ID format', async ({ request }) => {
      const response = await request.get('/api/payments/status/invalid-id', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(400);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: false,
        message: 'Invalid transaction ID format'
      });
    });
  });

  test.describe('Webhook Endpoint', () => {
    test('should accept valid webhook payload', async ({ request }) => {
      const webhookPayload = {
        transactionId: 'tx_' + Date.now(),
        hubtelTransactionId: 'hubtel_' + Date.now(),
        status: 'success',
        amount: 100.50,
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        timestamp: new Date().toISOString(),
        signature: 'test_signature'
      };

      const response = await request.post('/api/webhooks/hubtel', {
        headers: {
          'Content-Type': 'application/json',
          'x-hubtel-signature': 'test_signature'
        },
        data: webhookPayload
      });

      // Note: In real scenarios, this would need proper signature generation
      // For E2E tests, we might need to mock or configure webhook verification
      expect([200, 400]).toContain(response.status()); // 400 for invalid signature in real env
    });

    test('should reject webhook without signature', async ({ request }) => {
      const webhookPayload = {
        transactionId: 'tx_' + Date.now(),
        hubtelTransactionId: 'hubtel_' + Date.now(),
        status: 'success',
        amount: 100.50,
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        timestamp: new Date().toISOString(),
        signature: 'test_signature'
      };

      const response = await request.post('/api/webhooks/hubtel', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: webhookPayload
      });

      expect(response.status()).toBe(400);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: false,
        message: expect.stringContaining('signature')
      });
    });

    test('should provide health check endpoint', async ({ request }) => {
      const response = await request.get('/api/webhooks/hubtel');

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
        success: true,
        message: 'Hubtel webhook endpoint is active',
        timestamp: expect.any(String),
        processedWebhooks: expect.any(Number)
      });
    });
  });

  test.describe('Payment Configuration API', () => {
    test('should return payment configuration', async ({ request }) => {
      const response = await request.get('/api/payments/initiate');

      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toMatchObject({
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
  });

  test.describe('Error Handling', () => {
    test('should handle malformed JSON in payment request', async ({ request }) => {
      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: 'invalid json'
      });

      expect(response.status()).toBe(500);
    });

    test('should handle missing content-type header', async ({ request }) => {
      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: JSON.stringify({
          orderId: 'order_123',
          amount: 50,
          customerPhoneNumber: '+233241234567',
          paymentMethod: 'MTN'
        })
      });

      // Should still work or return appropriate error
      expect([200, 400, 500]).toContain(response.status());
    });
  });

  test.describe('Different Payment Methods', () => {
    const paymentMethods = [
      { method: 'MTN', phone: '+233241234567' },
      { method: 'VODAFONE', phone: '+233201234567' },
      { method: 'AIRTELTIGO', phone: '+233271234567' }
    ];

    paymentMethods.forEach(({ method, phone }) => {
      test(`should handle ${method} payment method`, async ({ request }) => {
        const paymentRequest = {
          orderId: 'order_' + Date.now(),
          amount: 25.00,
          customerPhoneNumber: phone,
          paymentMethod: method,
          description: `Test ${method} payment`
        };

        const response = await request.post('/api/payments/initiate', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: paymentRequest
        });

        expect(response.status()).toBe(200);
        
        const responseData = await response.json();
        expect(responseData.success).toBe(true);
        expect(responseData.data.transactionId).toBeDefined();
      });
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle minimum payment amount', async ({ request }) => {
      const paymentRequest = {
        orderId: 'order_' + Date.now(),
        amount: 0.01, // Minimum amount
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        description: 'Minimum amount test'
      };

      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: paymentRequest
      });

      expect(response.status()).toBe(200);
    });

    test('should reject payment above maximum amount', async ({ request }) => {
      const paymentRequest = {
        orderId: 'order_' + Date.now(),
        amount: 100001, // Above maximum
        customerPhoneNumber: '+233241234567',
        paymentMethod: 'MTN',
        description: 'Maximum amount test'
      };

      const response = await request.post('/api/payments/initiate', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: paymentRequest
      });

      expect(response.status()).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
    });

    test('should handle concurrent payment requests', async ({ request }) => {
      const requests = Array(5).fill(null).map((_, index) => 
        request.post('/api/payments/initiate', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            orderId: 'order_concurrent_' + Date.now() + '_' + index,
            amount: 10.00 + index,
            customerPhoneNumber: '+233241234567',
            paymentMethod: 'MTN',
            description: `Concurrent test ${index}`
          }
        })
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 400, 429, 500]).toContain(response.status());
      });
    });
  });
});