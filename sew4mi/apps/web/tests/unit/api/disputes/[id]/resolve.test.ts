// Integration test for dispute resolution API endpoint
// Story 2.4: Test dispute resolution API functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/disputes/[id]/resolve/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn()
};

// Mock services
vi.mock('@/lib/services/dispute-resolution.service', () => ({
  DisputeResolutionService: vi.fn(() => ({
    resolveDispute: vi.fn()
  }))
}));

vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabaseClient
}));

describe('/api/disputes/[id]/resolve', () => {
  let mockResolutionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { DisputeResolutionService } = require('@/lib/services/dispute-resolution.service');
    mockResolutionService = new DisputeResolutionService();
  });

  const createRequest = (disputeId: string, body: any) => {
    return new NextRequest(`http://localhost/api/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  };

  it('should resolve dispute successfully with refund', async () => {
    // Mock authenticated admin
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null
    });

    // Mock admin role check
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    });

    // Mock dispute resolution
    mockResolutionService.resolveDispute.mockResolvedValue({
      data: {
        id: 'resolution-123',
        dispute_id: 'dispute-123',
        resolution_type: 'FULL_REFUND',
        outcome: 'Customer will receive full refund',
        refund_amount: 500
      },
      error: null
    });

    const requestBody = {
      resolutionType: 'FULL_REFUND',
      outcome: 'Customer will receive full refund',
      reasonCode: 'QUALITY_ISSUE_CONFIRMED',
      adminNotes: 'Product quality did not meet standards',
      refundAmount: 500
    };

    const request = createRequest('dispute-123', requestBody);

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resolution).toBeDefined();
    expect(data.resolution.resolution_type).toBe('FULL_REFUND');
    expect(mockResolutionService.resolveDispute).toHaveBeenCalledWith({
      disputeId: 'dispute-123',
      resolutionType: 'FULL_REFUND',
      outcome: 'Customer will receive full refund',
      reasonCode: 'QUALITY_ISSUE_CONFIRMED',
      adminNotes: 'Product quality did not meet standards',
      refundAmount: 500
    });
  });

  it('should resolve dispute without refund', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null
    });

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    });

    mockResolutionService.resolveDispute.mockResolvedValue({
      data: {
        id: 'resolution-456',
        dispute_id: 'dispute-123',
        resolution_type: 'MEDIATED_SOLUTION',
        outcome: 'Tailor will rework the garment',
        refund_amount: null
      },
      error: null
    });

    const requestBody = {
      resolutionType: 'MEDIATED_SOLUTION',
      outcome: 'Tailor will rework the garment at no additional cost',
      reasonCode: 'CUSTOMER_SATISFACTION',
      adminNotes: 'Both parties agreed to rework solution'
    };

    const request = createRequest('dispute-123', requestBody);

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resolution.resolution_type).toBe('MEDIATED_SOLUTION');
    expect(data.resolution.refund_amount).toBeNull();
  });

  it('should return 401 for unauthenticated user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const requestBody = {
      resolutionType: 'FULL_REFUND',
      outcome: 'Test resolution',
      reasonCode: 'ADMIN_DECISION'
    };

    const request = createRequest('dispute-123', requestBody);

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 403 for non-admin user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    // Mock non-admin role
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { role: 'customer' },
      error: null
    });

    const requestBody = {
      resolutionType: 'FULL_REFUND',
      outcome: 'Test resolution',
      reasonCode: 'ADMIN_DECISION'
    };

    const request = createRequest('dispute-123', requestBody);

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-123' }) });

    expect(response.status).toBe(403);
  });

  it('should return 400 for missing required fields', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null
    });

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    });

    const requestBody = {
      resolutionType: 'FULL_REFUND',
      // Missing outcome and reasonCode
    };

    const request = createRequest('dispute-123', requestBody);

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-123' }) });

    expect(response.status).toBe(400);
  });

  it('should return 400 for refund without amount', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null
    });

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    });

    const requestBody = {
      resolutionType: 'FULL_REFUND',
      outcome: 'Customer will receive full refund',
      reasonCode: 'QUALITY_ISSUE_CONFIRMED'
      // Missing refundAmount for refund type
    };

    const request = createRequest('dispute-123', requestBody);

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-123' }) });

    expect(response.status).toBe(400);
  });

  it('should handle resolution service errors', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-123' } },
      error: null
    });

    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    });

    // Mock service error
    mockResolutionService.resolveDispute.mockResolvedValue({
      data: null,
      error: 'Failed to process refund'
    });

    const requestBody = {
      resolutionType: 'FULL_REFUND',
      outcome: 'Customer will receive full refund',
      reasonCode: 'QUALITY_ISSUE_CONFIRMED',
      refundAmount: 500
    };

    const request = createRequest('dispute-123', requestBody);

    const response = await POST(request, { params: Promise.resolve({ id: 'dispute-123' }) });

    expect(response.status).toBe(400);
  });
});