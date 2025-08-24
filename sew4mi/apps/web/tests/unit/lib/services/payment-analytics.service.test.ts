import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PaymentAnalyticsService } from '@/lib/services/payment-analytics.service';

// Create a comprehensive mock for Supabase query builder
const createMockQuery = (data: any, error: any = null, count: number | null = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  range: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockResolvedValue({ data, error })
});

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabaseClient
}));

describe('PaymentAnalyticsService', () => {
  let service: PaymentAnalyticsService;

  beforeEach(() => {
    service = new PaymentAnalyticsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getTailorPaymentDashboard', () => {
    const mockTailorId = 'tailor-123';
    const currentMonth = new Date().toISOString().slice(0, 7);

    it('should return payment dashboard data successfully', async () => {
      const mockSummaryData = {
        tailor_id: mockTailorId,
        period: currentMonth,
        total_earnings: 1500.00,
        gross_payments: 2000.00,
        platform_commission: 400.00,
        net_earnings: 1600.00,
        pending_amount: 200.00,
        completed_amount: 1800.00,
        disputed_amount: 0.00,
        refunded_amount: 0.00,
        total_orders: 8,
        completed_orders: 7,
        average_order_value: 250.00,
        commission_rate: 0.2000,
        last_updated: new Date().toISOString()
      };

      const mockTrendsData = [
        {
          period: '2024-07',
          total_earnings: 1200.00,
          total_orders: 6,
          platform_commission: 240.00
        },
        {
          period: currentMonth,
          total_earnings: 1500.00,
          total_orders: 8,
          platform_commission: 400.00
        }
      ];

      const mockTransactionData = [
        {
          id: 'trans-1',
          transaction_id: 'tx-001',
          amount: 300,
          status: 'SUCCESS',
          escrow_stage: 'DEPOSIT',
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          orders: {
            id: 'order-1',
            order_number: 'ORD-001',
            garment_type: 'Dress',
            total_amount: 300,
            deposit_amount: 150,
            fitting_payment_amount: 100,
            final_payment_amount: 50,
            status: 'COMPLETED',
            users: { full_name: 'Jane Doe' }
          }
        }
      ];

      // Mock summary query
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery(mockSummaryData)
      );

      // Mock trends query
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery(mockTrendsData)
      );

      // Mock payment status breakdown query
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery([
          { status: 'SUCCESS', amount: 1500 },
          { status: 'PENDING', amount: 200 }
        ])
      );

      // Mock payment history count query
      mockSupabaseClient.from.mockReturnValueOnce({
        ...createMockQuery(null, null, 1),
        select: vi.fn().mockResolvedValue({ count: 1, error: null })
      });

      // Mock payment history data query
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery(mockTransactionData)
      );

      const result = await service.getTailorPaymentDashboard(mockTailorId);

      expect(result).toEqual({
        summary: {
          tailorId: mockTailorId,
          period: currentMonth,
          totalEarnings: 1500.00,
          grossPayments: 2000.00,
          platformCommission: 400.00,
          netEarnings: 1600.00,
          pendingAmount: 200.00,
          completedAmount: 1800.00,
          disputedAmount: 0.00,
          refundedAmount: 0.00,
          totalOrders: 8,
          completedOrders: 7,
          averageOrderValue: 250.00,
          commissionRate: 0.2000,
          lastUpdated: expect.any(Date)
        },
        monthlyTrends: [
          {
            period: '2024-07',
            earnings: 1200.00,
            orders: 6,
            commission: 240.00
          },
          {
            period: currentMonth,
            earnings: 1500.00,
            orders: 8,
            commission: 400.00
          }
        ],
        paymentStatusBreakdown: {
          pending: 200,
          completed: 1500,
          disputed: 0,
          refunded: 0
        },
        recentTransactions: expect.arrayContaining([
          expect.objectContaining({
            id: 'trans-1',
            orderNumber: 'ORD-001',
            customerName: 'Jane Doe',
            garmentType: 'Dress',
            totalAmount: 300,
            commissionAmount: 60, // 20% of 300
            netAmount: 240,
            status: 'COMPLETED'
          })
        ])
      });
    });

    it('should return empty summary when no data exists', async () => {
      // Mock empty summary query
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery(null, { code: 'PGRST116' })
      );

      // Mock empty trends query
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery([])
      );

      // Mock empty status breakdown
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery([])
      );

      // Mock empty transaction count
      mockSupabaseClient.from.mockReturnValueOnce({
        ...createMockQuery(null, null, 0),
        select: vi.fn().mockResolvedValue({ count: 0, error: null })
      });

      // Mock empty transaction data
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery([])
      );

      const result = await service.getTailorPaymentDashboard(mockTailorId);

      expect(result.summary).toEqual({
        tailorId: mockTailorId,
        period: currentMonth,
        totalEarnings: 0,
        grossPayments: 0,
        platformCommission: 0,
        netEarnings: 0,
        pendingAmount: 0,
        completedAmount: 0,
        disputedAmount: 0,
        refundedAmount: 0,
        totalOrders: 0,
        completedOrders: 0,
        averageOrderValue: 0,
        commissionRate: 0.20,
        lastUpdated: expect.any(Date)
      });
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery(null, { message: 'Database connection failed', code: 'DB_ERROR' })
      );

      await expect(service.getTailorPaymentDashboard(mockTailorId))
        .rejects
        .toThrow('Failed to fetch payment summary: Database connection failed');
    });
  });

  describe('getPaymentHistory', () => {
    const mockTailorId = 'tailor-123';

    it('should return paginated payment history with filters', async () => {
      const mockData = [
        {
          id: 'trans-1',
          transaction_id: 'tx-001',
          amount: 300,
          status: 'SUCCESS',
          escrow_stage: 'DEPOSIT',
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          orders: {
            id: 'order-1',
            order_number: 'ORD-001',
            garment_type: 'Dress',
            total_amount: 300,
            deposit_amount: 150,
            fitting_payment_amount: 100,
            final_payment_amount: 50,
            status: 'COMPLETED',
            users: { full_name: 'Jane Doe' }
          }
        }
      ];

      // Mock count query
      mockSupabaseClient.from.mockReturnValueOnce({
        ...createMockQuery(null, null, 1),
        select: vi.fn().mockResolvedValue({ count: 1, error: null })
      });

      // Mock data query  
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQuery(mockData)
      );

      const result = await service.getPaymentHistory(mockTailorId, {}, 1, 25);

      expect(result).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'trans-1',
            orderNumber: 'ORD-001',
            customerName: 'Jane Doe',
            garmentType: 'Dress',
            totalAmount: 300,
            commissionAmount: 60,
            netAmount: 240,
            status: 'COMPLETED',
            escrowStage: 'DEPOSIT'
          })
        ]),
        total: 1,
        hasMore: false
      });
    });
  });

  describe('calculateEarningsWithCommission', () => {
    it('should calculate correct commission and earnings', async () => {
      const result = await service.calculateEarningsWithCommission(1000, 0.20);

      expect(result).toEqual({
        grossAmount: 1000,
        commissionAmount: 200,
        netEarnings: 800,
        commissionRate: 0.20
      });
    });

    it('should use default commission rate when not provided', async () => {
      const result = await service.calculateEarningsWithCommission(1000);

      expect(result.commissionRate).toBe(0.20);
      expect(result.commissionAmount).toBe(200);
    });
  });

  describe('refreshPaymentStatistics', () => {
    it('should call the refresh RPC function', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        error: null
      });

      await service.refreshPaymentStatistics();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_payment_statistics_cache');
    });

    it('should handle RPC errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        error: { message: 'Function not found' }
      });

      await expect(service.refreshPaymentStatistics())
        .rejects
        .toThrow('Failed to refresh payment statistics: Function not found');
    });
  });
});