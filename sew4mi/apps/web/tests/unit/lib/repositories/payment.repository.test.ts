import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentRepository } from '@/lib/repositories/payment.repository';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  lt: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

vi.mock('@/lib/config/env', () => ({
  ENV_CONFIG: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key'
  }
}));

describe('PaymentRepository', () => {
  let paymentRepository: PaymentRepository;
  
  beforeEach(() => {
    vi.clearAllMocks();
    paymentRepository = new PaymentRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCreateData = {
    id: 'tx_123',
    orderId: 'order_123',
    type: 'DEPOSIT' as const,
    amount: 100.50,
    provider: 'HUBTEL_MTN',
    providerTransactionId: 'provider_tx_123',
    hubtelTransactionId: 'hubtel_tx_123',
    paymentMethod: 'MTN',
    customerPhoneNumber: '+233241234567',
    status: 'PENDING' as const
  };

  const mockDatabaseRow = {
    id: 'tx_123',
    order_id: 'order_123',
    type: 'DEPOSIT',
    amount: 100.50,
    provider: 'HUBTEL_MTN',
    provider_transaction_id: 'provider_tx_123',
    hubtel_transaction_id: 'hubtel_tx_123',
    payment_method: 'MTN',
    customer_phone_number: '+233241234567',
    status: 'PENDING',
    webhook_received: false,
    retry_count: 0,
    created_at: '2024-08-21T10:00:00.000Z',
    updated_at: '2024-08-21T10:00:00.000Z'
  };

  const mockPaymentTransaction = {
    id: 'tx_123',
    orderId: 'order_123',
    type: 'DEPOSIT' as const,
    amount: 100.50,
    provider: 'HUBTEL_MTN',
    providerTransactionId: 'provider_tx_123',
    hubtelTransactionId: 'hubtel_tx_123',
    paymentMethod: 'MTN',
    customerPhoneNumber: '+233241234567',
    status: 'PENDING' as const,
    webhookReceived: false,
    retryCount: 0,
    createdAt: new Date('2024-08-21T10:00:00.000Z'),
    updatedAt: new Date('2024-08-21T10:00:00.000Z')
  };

  describe('create', () => {
    it('should successfully create payment transaction', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockDatabaseRow,
        error: null
      });

      const result = await paymentRepository.create(mockCreateData);

      expect(result).toEqual(mockPaymentTransaction);
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_transactions');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        id: 'tx_123',
        order_id: 'order_123',
        type: 'DEPOSIT',
        amount: 100.50,
        provider: 'HUBTEL_MTN',
        provider_transaction_id: 'provider_tx_123',
        hubtel_transaction_id: 'hubtel_tx_123',
        payment_method: 'MTN',
        customer_phone_number: '+233241234567',
        status: 'PENDING',
        webhook_received: false,
        retry_count: 0,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Unique constraint violation' }
      });

      const result = await paymentRepository.create(mockCreateData);

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Connection error'));

      const result = await paymentRepository.create(mockCreateData);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should successfully find payment transaction by ID', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockDatabaseRow,
        error: null
      });

      const result = await paymentRepository.findById('tx_123');

      expect(result).toEqual(mockPaymentTransaction);
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_transactions');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'tx_123');
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should return null when transaction not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      });

      const result = await paymentRepository.findById('nonexistent_tx');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await paymentRepository.findById('tx_123');

      expect(result).toBeNull();
    });
  });

  describe('findByProviderTransactionId', () => {
    it('should successfully find payment transaction by provider transaction ID', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockDatabaseRow,
        error: null
      });

      const result = await paymentRepository.findByProviderTransactionId('provider_tx_123');

      expect(result).toEqual(mockPaymentTransaction);
      expect(mockSupabase.eq).toHaveBeenCalledWith('provider_transaction_id', 'provider_tx_123');
    });
  });

  describe('findByHubtelTransactionId', () => {
    it('should successfully find payment transaction by Hubtel transaction ID', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockDatabaseRow,
        error: null
      });

      const result = await paymentRepository.findByHubtelTransactionId('hubtel_tx_123');

      expect(result).toEqual(mockPaymentTransaction);
      expect(mockSupabase.eq).toHaveBeenCalledWith('hubtel_transaction_id', 'hubtel_tx_123');
    });
  });

  describe('updateStatus', () => {
    const updateData = {
      status: 'SUCCESS' as const,
      hubtelTransactionId: 'new_hubtel_tx_123',
      webhookReceived: true,
      retryCount: 1
    };

    it('should successfully update payment transaction status', async () => {
      const updatedRow = {
        ...mockDatabaseRow,
        status: 'SUCCESS',
        hubtel_transaction_id: 'new_hubtel_tx_123',
        webhook_received: true,
        retry_count: 1,
        updated_at: '2024-08-21T11:00:00.000Z'
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedRow,
        error: null
      });

      const result = await paymentRepository.updateStatus('tx_123', updateData);

      expect(result).toEqual({
        ...mockPaymentTransaction,
        status: 'SUCCESS',
        hubtelTransactionId: 'new_hubtel_tx_123',
        webhookReceived: true,
        retryCount: 1,
        updatedAt: new Date('2024-08-21T11:00:00.000Z')
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'SUCCESS',
        hubtel_transaction_id: 'new_hubtel_tx_123',
        webhook_received: true,
        retry_count: 1,
        updated_at: expect.any(String)
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'tx_123');
    });

    it('should handle partial updates', async () => {
      const partialUpdateData = {
        status: 'SUCCESS' as const
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...mockDatabaseRow, status: 'SUCCESS' },
        error: null
      });

      const result = await paymentRepository.updateStatus('tx_123', partialUpdateData);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'SUCCESS',
        updated_at: expect.any(String)
      });
    });

    it('should handle update errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      });

      const result = await paymentRepository.updateStatus('tx_123', updateData);

      expect(result).toBeNull();
    });
  });

  describe('findByOrderId', () => {
    it('should successfully find payment transactions by order ID', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [mockDatabaseRow, { ...mockDatabaseRow, id: 'tx_124' }],
        error: null
      });

      const result = await paymentRepository.findByOrderId('order_123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockPaymentTransaction);
      expect(mockSupabase.eq).toHaveBeenCalledWith('order_id', 'order_123');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no transactions found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await paymentRepository.findByOrderId('order_123');

      expect(result).toEqual([]);
    });
  });

  describe('findPendingTransactions', () => {
    it('should successfully find pending transactions', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [mockDatabaseRow],
        error: null
      });

      const result = await paymentRepository.findPendingTransactions(10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPaymentTransaction);
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'PENDING');
      expect(mockSupabase.lt).toHaveBeenCalledWith('retry_count', 3);
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should use default limit when not specified', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      });

      await paymentRepository.findPendingTransactions();

      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('incrementRetryCount', () => {
    it('should successfully increment retry count', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await paymentRepository.incrementRetryCount('tx_123');

      expect(result).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        retry_count: 'retry_count + 1',
        updated_at: expect.any(String)
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'tx_123');
    });

    it('should handle increment errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      });

      const result = await paymentRepository.incrementRetryCount('tx_123');

      expect(result).toBe(false);
    });
  });

  describe('mapDatabaseToPaymentTransaction', () => {
    it('should correctly map database row to PaymentTransaction', () => {
      const result = (paymentRepository as any).mapDatabaseToPaymentTransaction(mockDatabaseRow);

      expect(result).toEqual(mockPaymentTransaction);
    });

    it('should handle null values correctly', () => {
      const rowWithNulls = {
        ...mockDatabaseRow,
        hubtel_transaction_id: null,
        customer_phone_number: null
      };

      const result = (paymentRepository as any).mapDatabaseToPaymentTransaction(rowWithNulls);

      expect(result.hubtelTransactionId).toBeNull();
      expect(result.customerPhoneNumber).toBeNull();
    });
  });
});