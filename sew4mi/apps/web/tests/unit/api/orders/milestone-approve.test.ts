import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../../../../app/api/orders/[id]/milestone/approve/route';

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis()
};

const mockEscrowService = {
  approveMilestone: vi.fn(),
  getEscrowStatus: vi.fn()
};

// Mock the dependencies
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: vi.fn(() => mockSupabase)
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

vi.mock('../../../../lib/services/escrow.service', () => ({
  EscrowService: vi.fn(() => mockEscrowService)
}));

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

describe('/api/orders/[id]/milestone/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/orders/[id]/milestone/approve', () => {
    it('should approve fitting milestone for customer', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          tailor_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'READY_FOR_FITTING',
          escrow_stage: 'FITTING'
        },
        error: null
      });

      mockEscrowService.approveMilestone.mockResolvedValue({
        success: true,
        amountReleased: 500,
        newStage: 'FINAL',
        transactionId: '550e8400-e29b-41d4-a716-446655440003'
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve', {
        method: 'POST',
        body: JSON.stringify({
          stage: 'FITTING',
          notes: 'Fitting approved by customer'
        })
      });

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.amountReleased).toBe(500);
      expect(responseData.data.newStage).toBe('FINAL');

      expect(mockEscrowService.approveMilestone).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'FITTING',
        '550e8400-e29b-41d4-a716-446655440001',
        'Fitting approved by customer'
      );

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'FITTING_APPROVED',
        updated_at: expect.any(String)
      });
    });

    it('should approve final milestone for delivery', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          tailor_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'READY_FOR_DELIVERY',
          escrow_stage: 'FINAL'
        },
        error: null
      });

      mockEscrowService.approveMilestone.mockResolvedValue({
        success: true,
        amountReleased: 250,
        newStage: 'RELEASED',
        transactionId: '550e8400-e29b-41d4-a716-446655440003'
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve', {
        method: 'POST',
        body: JSON.stringify({
          stage: 'FINAL',
          notes: 'Delivery confirmed'
        })
      });

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.amountReleased).toBe(250);
      expect(responseData.data.newStage).toBe('RELEASED');

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'COMPLETED',
        updated_at: expect.any(String)
      });
    });

    it('should reject unauthorized users', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized')
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve', {
        method: 'POST',
        body: JSON.stringify({ stage: 'FITTING' })
      });

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should reject invalid stage transitions', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          tailor_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'READY_FOR_FITTING',
          escrow_stage: 'DEPOSIT' // Wrong stage for fitting approval
        },
        error: null
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve', {
        method: 'POST',
        body: JSON.stringify({ stage: 'FITTING' })
      });

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Order is in DEPOSIT stage');
    });

    it('should reject insufficient permissions', async () => {
      // Setup mocks - user trying to approve fitting but is not customer
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'other-user-123' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          tailor_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'READY_FOR_FITTING',
          escrow_stage: 'FITTING'
        },
        error: null
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve', {
        method: 'POST',
        body: JSON.stringify({ stage: 'FITTING' })
      });

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Insufficient permissions to approve this milestone');
    });

    it('should handle invalid request data', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } },
        error: null
      });

      // Create request with invalid stage
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve', {
        method: 'POST',
        body: JSON.stringify({ stage: 'INVALID_STAGE' })
      });

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid request data');
    });

    it('should handle escrow service failures', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          tailor_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'READY_FOR_FITTING',
          escrow_stage: 'FITTING'
        },
        error: null
      });

      mockEscrowService.approveMilestone.mockResolvedValue({
        success: false,
        amountReleased: 0,
        newStage: 'FITTING'
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve', {
        method: 'POST',
        body: JSON.stringify({ stage: 'FITTING' })
      });

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Failed to approve milestone');
    });
  });

  describe('GET /api/orders/[id]/milestone/approve', () => {
    it('should return milestone approval information', async () => {
      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440001' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          tailor_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'READY_FOR_FITTING',
          escrow_stage: 'FITTING'
        },
        error: null
      });

      mockEscrowService.getEscrowStatus.mockResolvedValue({
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'FITTING',
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 750,
        nextStageAmount: 500,
        stageHistory: []
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve');

      // Execute
      const response = await GET(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.orderId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(responseData.data.currentStage).toBe('FITTING');
      expect(responseData.data.availableActions).toContain('APPROVE_FITTING');
      expect(responseData.data.canApprove).toBe(true);
    });

    it('should return empty actions for unauthorized users', async () => {
      // Setup mocks - tailor trying to view customer-only actions
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '550e8400-e29b-41d4-a716-446655440002' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          tailor_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'READY_FOR_FITTING',
          escrow_stage: 'FITTING' // Only customer can approve fitting
        },
        error: null
      });

      mockEscrowService.getEscrowStatus.mockResolvedValue({
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'FITTING',
        totalAmount: 1000,
        escrowBalance: 750,
        stageHistory: []
      });

      // Create request
      const request = new NextRequest('http://localhost/api/orders/550e8400-e29b-41d4-a716-446655440000/milestone/approve');

      // Execute
      const response = await GET(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) });
      const responseData = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(responseData.data.availableActions).toHaveLength(0);
      expect(responseData.data.canApprove).toBe(false);
    });
  });
});