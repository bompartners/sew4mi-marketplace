/**
 * Group Order API Integration Tests
 * Tests all group order API endpoints with actual Supabase instance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@sew4mi/shared/types/database';
import { EventType, PaymentMode, DeliveryStrategy } from '@sew4mi/shared/types/group-order';

describe('Group Order API Integration Tests', () => {
  let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;
  let testUserId: string;
  let testGroupOrderId: string;
  let authToken: string;

  beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping integration tests: Missing Supabase environment variables');
      return;
    }

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

    // Create test user
    const testEmail = `test-group-order-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authData.user.id;
    authToken = authData.session?.access_token || '';
  });

  afterAll(async () => {
    // Clean up test data
    if (supabaseClient && testGroupOrderId) {
      try {
        await Promise.allSettled([
          supabaseClient.from('group_order_items').delete().eq('group_order_id', testGroupOrderId),
          supabaseClient.from('group_payment_tracking').delete().eq('group_order_id', testGroupOrderId),
          supabaseClient.from('group_delivery_schedules').delete().eq('group_order_id', testGroupOrderId),
          supabaseClient.from('group_orders').delete().eq('id', testGroupOrderId),
        ]);
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
  });

  describe('POST /api/orders/group', () => {
    it('should create a new group order with valid data', async () => {
      if (!supabaseClient) {
        console.warn('Skipping test: Supabase client not initialized');
        return;
      }

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const groupOrderData = {
        groupName: 'Test Family Wedding',
        eventType: EventType.WEDDING,
        eventDate: futureDate,
        familyMemberProfiles: [
          {
            profileId: '123e4567-e89b-12d3-a456-426614174000',
            garmentType: 'Kente Gown',
          },
          {
            profileId: '123e4567-e89b-12d3-a456-426614174001',
            garmentType: 'Agbada',
          },
          {
            profileId: '123e4567-e89b-12d3-a456-426614174002',
            garmentType: 'Children Dress',
          },
        ],
        sharedFabric: true,
        fabricDetails: {
          fabricType: 'KENTE',
          fabricColor: 'Royal Blue',
          totalYardage: 30,
          costPerYard: 50,
          fabricSource: 'TAILOR_SOURCED',
        },
        paymentMode: PaymentMode.SINGLE_PAYER,
        deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(groupOrderData),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.groupOrder).toBeDefined();
      expect(result.groupOrderNumber).toBeDefined();
      expect(result.bulkDiscount).toBe(15); // 3 items = 15% discount

      testGroupOrderId = result.groupOrder.id;
    });

    it('should reject group order with insufficient participants', async () => {
      const groupOrderData = {
        groupName: 'Too Small Group',
        familyMemberProfiles: [
          {
            profileId: '123e4567-e89b-12d3-a456-426614174000',
            garmentType: 'Kente Gown',
          },
        ],
        sharedFabric: false,
        paymentMode: PaymentMode.SINGLE_PAYER,
        deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(groupOrderData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });

    it('should require fabric details when sharedFabric is true', async () => {
      const groupOrderData = {
        groupName: 'Missing Fabric Details',
        familyMemberProfiles: [
          {
            profileId: '123e4567-e89b-12d3-a456-426614174000',
            garmentType: 'Kente Gown',
          },
          {
            profileId: '123e4567-e89b-12d3-a456-426614174001',
            garmentType: 'Agbada',
          },
        ],
        sharedFabric: true,
        // No fabricDetails
        paymentMode: PaymentMode.SINGLE_PAYER,
        deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(groupOrderData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('GET /api/orders/group', () => {
    it('should get all group orders for authenticated user', async () => {
      if (!authToken) {
        console.warn('Skipping test: No auth token available');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.groupOrders)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/orders/group/[id]', () => {
    it('should get group order summary with details', async () => {
      if (!testGroupOrderId) {
        console.warn('Skipping test: No test group order available');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/${testGroupOrderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.groupOrder).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.paymentTracking).toBeDefined();
      expect(result.deliverySchedules).toBeDefined();
    });

    it('should return 404 for non-existent group order', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174999';
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/${fakeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/orders/group/bulk-discount', () => {
    it('should calculate bulk discount correctly for 3 items (15%)', async () => {
      const discountRequest = {
        itemCount: 3,
        orderAmounts: [200, 250, 300],
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/bulk-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountRequest),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.discountPercentage).toBe(15);
      expect(result.originalTotal).toBe(750);
      expect(result.finalTotal).toBe(637.5);
      expect(result.savings).toBe(112.5);
    });

    it('should calculate bulk discount correctly for 6 items (20%)', async () => {
      const discountRequest = {
        itemCount: 6,
        orderAmounts: [200, 200, 200, 200, 200, 200],
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/bulk-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountRequest),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.discountPercentage).toBe(20);
      expect(result.originalTotal).toBe(1200);
      expect(result.finalTotal).toBe(960);
    });

    it('should calculate bulk discount correctly for 10 items (25%)', async () => {
      const discountRequest = {
        itemCount: 10,
        orderAmounts: Array(10).fill(100),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/bulk-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountRequest),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.discountPercentage).toBe(25);
      expect(result.originalTotal).toBe(1000);
      expect(result.finalTotal).toBe(750);
    });

    it('should reject mismatched itemCount and orderAmounts', async () => {
      const discountRequest = {
        itemCount: 5,
        orderAmounts: [200, 250, 300], // Only 3 amounts
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/bulk-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountRequest),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('GET /api/orders/group/[id]/progress', () => {
    it('should get progress summary for group order', async () => {
      if (!testGroupOrderId) {
        console.warn('Skipping test: No test group order available');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/${testGroupOrderId}/progress`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.progressSummary).toBeDefined();
      expect(result.progressSummary.totalItems).toBeGreaterThanOrEqual(0);
      expect(result.nextActions).toBeDefined();
      expect(Array.isArray(result.nextActions)).toBe(true);
    });
  });

  describe('GET /api/orders/group/[id]/items', () => {
    it('should get all items in a group order', async () => {
      if (!testGroupOrderId) {
        console.warn('Skipping test: No test group order available');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/${testGroupOrderId}/items`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.totalItems).toBeDefined();
    });
  });

  describe('GET /api/orders/group/[id]/payment', () => {
    it('should get payment tracking for group order', async () => {
      if (!testGroupOrderId) {
        console.warn('Skipping test: No test group order available');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/${testGroupOrderId}/payment`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.paymentTracking)).toBe(true);
      expect(result.totalAmount).toBeDefined();
      expect(result.paidAmount).toBeDefined();
    });
  });

  describe('GET /api/orders/group/[id]/delivery', () => {
    it('should get delivery schedules for group order', async () => {
      if (!testGroupOrderId) {
        console.warn('Skipping test: No test group order available');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/orders/group/${testGroupOrderId}/delivery`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.deliveryStrategy).toBeDefined();
      expect(Array.isArray(result.schedules)).toBe(true);
    });
  });
});

