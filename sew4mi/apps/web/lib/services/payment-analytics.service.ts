import { createClient } from '@/lib/supabase';
import type { 
  TailorPaymentSummary, 
  PaymentDashboardData, 
  PaymentHistoryItem, 
  PaymentHistoryFilters 
} from '@sew4mi/shared';
import type { Database } from '@sew4mi/shared';

type DbPaymentTransaction = Database['public']['Tables']['payment_transactions']['Row'];
type DbPaymentSummary = Database['public']['Views']['tailor_payment_summary']['Row'];

export class PaymentAnalyticsService {
  private supabase = createClient();

  async getTailorPaymentDashboard(tailorId: string): Promise<PaymentDashboardData> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Get current month summary
    const { data: summaryData, error: summaryError } = await this.supabase
      .from('tailor_payment_summary')
      .select('*')
      .eq('tailor_id', tailorId)
      .eq('period', currentMonth)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch payment summary: ${summaryError.message}`);
    }

    // Get monthly trends for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const trendPeriod = twelveMonthsAgo.toISOString().slice(0, 7);

    const { data: trendsData, error: trendsError } = await this.supabase
      .from('tailor_payment_summary')
      .select('period, total_earnings, total_orders, platform_commission')
      .eq('tailor_id', tailorId)
      .gte('period', trendPeriod)
      .order('period', { ascending: true });

    if (trendsError) {
      throw new Error(`Failed to fetch trends data: ${trendsError.message}`);
    }

    // Get payment status breakdown
    const statusBreakdown = await this.getPaymentStatusBreakdown(tailorId);

    // Get recent transactions
    const recentTransactions = await this.getRecentPaymentHistory(tailorId, 10);

    const summary: TailorPaymentSummary = summaryData ? {
      tailorId: summaryData.tailor_id,
      period: summaryData.period,
      totalEarnings: summaryData.total_earnings,
      grossPayments: summaryData.gross_payments,
      platformCommission: summaryData.platform_commission,
      netEarnings: summaryData.net_earnings,
      pendingAmount: summaryData.pending_amount,
      completedAmount: summaryData.completed_amount,
      disputedAmount: summaryData.disputed_amount,
      refundedAmount: summaryData.refunded_amount,
      totalOrders: summaryData.total_orders,
      completedOrders: summaryData.completed_orders,
      averageOrderValue: summaryData.average_order_value,
      commissionRate: summaryData.commission_rate,
      lastUpdated: new Date(summaryData.last_updated)
    } : this.getEmptySummary(tailorId, currentMonth);

    return {
      summary,
      monthlyTrends: (trendsData || []).map(trend => ({
        period: trend.period,
        earnings: trend.total_earnings,
        orders: trend.total_orders,
        commission: trend.platform_commission
      })),
      paymentStatusBreakdown: statusBreakdown,
      recentTransactions
    };
  }

  async getPaymentHistory(
    tailorId: string, 
    filters: PaymentHistoryFilters = {},
    page = 1,
    limit = 25
  ): Promise<{ items: PaymentHistoryItem[], total: number, hasMore: boolean }> {
    let query = this.supabase
      .from('payment_transactions')
      .select(`
        id,
        transaction_id,
        amount,
        status,
        escrow_stage,
        completed_at,
        orders!inner(
          id,
          order_number,
          garment_type,
          total_amount,
          deposit_amount,
          fitting_payment_amount,
          final_payment_amount,
          users!orders_customer_id_fkey(full_name)
        )
      `)
      .eq('orders.tailor_id', tailorId)
      .order('completed_at', { ascending: false, nullsFirst: false });

    // Apply filters
    if (filters.dateFrom) {
      query = query.gte('completed_at', filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      query = query.lte('completed_at', filters.dateTo.toISOString());
    }
    if (filters.status && filters.status.length > 0) {
      const statusMap: Record<string, string> = {
        'PENDING': 'PENDING',
        'COMPLETED': 'SUCCESS',
        'DISPUTED': 'SUCCESS', // Will filter by order status later
        'REFUNDED': 'REFUNDED'
      };
      const dbStatuses = filters.status.map(s => statusMap[s]).filter(Boolean);
      if (dbStatuses.length > 0) {
        query = query.in('status', dbStatuses);
      }
    }
    if (filters.minAmount) {
      query = query.gte('amount', filters.minAmount);
    }
    if (filters.maxAmount) {
      query = query.lte('amount', filters.maxAmount);
    }

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true });
    const total = count || 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    const { data, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }

    const items: PaymentHistoryItem[] = (data || []).map(transaction => {
      const order = transaction.orders;
      const commissionAmount = transaction.amount * 0.20;
      const netAmount = transaction.amount - commissionAmount;

      return {
        id: transaction.id,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.users?.full_name || 'Unknown',
        garmentType: order.garment_type,
        totalAmount: transaction.amount,
        commissionAmount,
        netAmount,
        paymentDate: new Date(transaction.completed_at || transaction.created_at),
        status: this.mapTransactionStatus(transaction.status, order.status),
        escrowStage: transaction.escrow_stage as any,
        milestonePayments: {
          deposit: { 
            amount: order.deposit_amount, 
            paidAt: transaction.escrow_stage === 'DEPOSIT' ? new Date(transaction.completed_at) : undefined,
            status: transaction.escrow_stage === 'DEPOSIT' ? transaction.status : 'PENDING'
          },
          fitting: { 
            amount: order.fitting_payment_amount || 0,
            paidAt: transaction.escrow_stage === 'FITTING' ? new Date(transaction.completed_at) : undefined,
            status: transaction.escrow_stage === 'FITTING' ? transaction.status : 'PENDING'
          },
          final: { 
            amount: order.final_payment_amount || 0,
            paidAt: transaction.escrow_stage === 'FINAL' ? new Date(transaction.completed_at) : undefined,
            status: transaction.escrow_stage === 'FINAL' ? transaction.status : 'PENDING'
          }
        }
      };
    });

    return {
      items,
      total,
      hasMore: offset + limit < total
    };
  }

  async getMonthlyEarningsSummary(tailorId: string, period: string): Promise<TailorPaymentSummary | null> {
    const { data, error } = await this.supabase
      .from('tailor_payment_summary')
      .select('*')
      .eq('tailor_id', tailorId)
      .eq('period', period)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch monthly summary: ${error.message}`);
    }

    if (!data) return null;

    return {
      tailorId: data.tailor_id,
      period: data.period,
      totalEarnings: data.total_earnings,
      grossPayments: data.gross_payments,
      platformCommission: data.platform_commission,
      netEarnings: data.net_earnings,
      pendingAmount: data.pending_amount,
      completedAmount: data.completed_amount,
      disputedAmount: data.disputed_amount,
      refundedAmount: data.refunded_amount,
      totalOrders: data.total_orders,
      completedOrders: data.completed_orders,
      averageOrderValue: data.average_order_value,
      commissionRate: data.commission_rate,
      lastUpdated: new Date(data.last_updated)
    };
  }

  async calculateEarningsWithCommission(grossAmount: number, commissionRate = 0.20) {
    const commission = grossAmount * commissionRate;
    const netEarnings = grossAmount - commission;
    
    return {
      grossAmount,
      commissionAmount: commission,
      netEarnings,
      commissionRate
    };
  }

  private async getPaymentStatusBreakdown(tailorId: string) {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .select(`
        status,
        amount,
        orders!inner(tailor_id)
      `)
      .eq('orders.tailor_id', tailorId);

    if (error) {
      throw new Error(`Failed to fetch payment status breakdown: ${error.message}`);
    }

    const breakdown = {
      pending: 0,
      completed: 0,
      disputed: 0,
      refunded: 0
    };

    (data || []).forEach(transaction => {
      const amount = transaction.amount;
      switch (transaction.status) {
        case 'PENDING':
        case 'PROCESSING':
          breakdown.pending += amount;
          break;
        case 'SUCCESS':
          breakdown.completed += amount;
          break;
        case 'REFUNDED':
          breakdown.refunded += amount;
          break;
        case 'FAILED':
        default:
          // Handle disputed payments through order status
          break;
      }
    });

    return breakdown;
  }

  private async getRecentPaymentHistory(tailorId: string, limit: number): Promise<PaymentHistoryItem[]> {
    const result = await this.getPaymentHistory(tailorId, {}, 1, limit);
    return result.items;
  }

  private mapTransactionStatus(transactionStatus: string, orderStatus?: string): PaymentHistoryItem['status'] {
    if (orderStatus === 'DISPUTED') return 'DISPUTED';
    
    switch (transactionStatus) {
      case 'SUCCESS':
        return 'COMPLETED';
      case 'REFUNDED':
        return 'REFUNDED';
      case 'PENDING':
      case 'PROCESSING':
        return 'PENDING';
      default:
        return 'PENDING';
    }
  }

  private getEmptySummary(tailorId: string, period: string): TailorPaymentSummary {
    return {
      tailorId,
      period,
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
      lastUpdated: new Date()
    };
  }

  async refreshPaymentStatistics(): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_payment_statistics_cache');

    if (error) {
      throw new Error(`Failed to refresh payment statistics: ${error.message}`);
    }
  }
}