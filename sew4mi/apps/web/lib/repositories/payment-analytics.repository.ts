import { createClient } from '@/lib/supabase/server';
import type { Database } from '@sew4mi/shared';

type DbPaymentSummary = Database['public']['Views']['tailor_payment_summary']['Row'];
type DbPaymentStats = Database['public']['Tables']['payment_statistics']['Row'];

export class PaymentAnalyticsRepository {
  private supabase = createClient();

  async getTailorPaymentSummary(tailorId: string, period: string): Promise<DbPaymentSummary | null> {
    const { data, error } = await this.supabase
      .from('tailor_payment_summary')
      .select('*')
      .eq('tailor_id', tailorId)
      .eq('period', period)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch payment summary: ${error.message}`);
    }

    return data;
  }

  async getTailorPaymentTrends(
    tailorId: string, 
    fromPeriod: string, 
    toPeriod?: string
  ): Promise<DbPaymentSummary[]> {
    let query = this.supabase
      .from('tailor_payment_summary')
      .select('*')
      .eq('tailor_id', tailorId)
      .gte('period', fromPeriod)
      .order('period', { ascending: true });

    if (toPeriod) {
      query = query.lte('period', toPeriod);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch payment trends: ${error.message}`);
    }

    return data || [];
  }

  async getPaymentStatistics(tailorId: string, period?: string): Promise<DbPaymentStats | null> {
    let query = this.supabase
      .from('payment_statistics')
      .select('*')
      .eq('tailor_id', tailorId);

    if (period) {
      query = query.eq('period', period);
    }

    query = query
      .order('updated_at', { ascending: false })
      .limit(1);

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch payment statistics: ${error.message}`);
    }

    return data;
  }

  async getPaymentTransactionsByTailor(
    tailorId: string,
    filters?: {
      status?: string[];
      dateFrom?: string;
      dateTo?: string;
      escrowStage?: string[];
      minAmount?: number;
      maxAmount?: number;
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ): Promise<{
    data: any[];
    count: number;
  }> {
    let query = this.supabase
      .from('payment_transactions')
      .select(`
        *,
        orders!inner(
          id,
          order_number,
          tailor_id,
          garment_type,
          total_amount,
          status,
          users!orders_customer_id_fkey(full_name)
        )
      `, { count: 'exact' })
      .eq('orders.tailor_id', tailorId)
      .order('completed_at', { ascending: false, nullsFirst: false });

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('completed_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('completed_at', filters.dateTo);
    }

    if (filters?.escrowStage && filters.escrowStage.length > 0) {
      query = query.in('escrow_stage', filters.escrowStage);
    }

    if (filters?.minAmount) {
      query = query.gte('amount', filters.minAmount);
    }

    if (filters?.maxAmount) {
      query = query.lte('amount', filters.maxAmount);
    }

    // Apply pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch payment transactions: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0
    };
  }

  async getEarningsByPeriod(
    tailorId: string,
    periods: string[]
  ): Promise<Array<{
    period: string;
    earnings: number;
    commission: number;
    orders: number;
  }>> {
    const { data, error } = await this.supabase
      .from('tailor_payment_summary')
      .select('period, total_earnings, platform_commission, total_orders')
      .eq('tailor_id', tailorId)
      .in('period', periods)
      .order('period', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch earnings by period: ${error.message}`);
    }

    return (data || []).map(row => ({
      period: row.period,
      earnings: row.total_earnings,
      commission: row.platform_commission,
      orders: row.total_orders
    }));
  }

  async getPaymentStatusBreakdown(tailorId: string): Promise<{
    pending: number;
    completed: number;
    disputed: number;
    refunded: number;
  }> {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .select(`
        status,
        amount,
        orders!inner(tailor_id, status)
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

    (data || []).forEach((transaction: any) => {
      const amount = transaction.amount;
      
      if (transaction.orders?.status === 'DISPUTED') {
        breakdown.disputed += amount;
      } else {
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
        }
      }
    });

    return breakdown;
  }

  async refreshMaterializedViews(): Promise<void> {
    const { error } = await this.supabase
      .rpc('refresh_tailor_payment_summary');

    if (error) {
      throw new Error(`Failed to refresh materialized views: ${error.message}`);
    }
  }

  async updatePaymentStatsCache(): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_payment_statistics_cache');

    if (error) {
      throw new Error(`Failed to update payment statistics cache: ${error.message}`);
    }
  }

  async getTopEarningTailors(limit = 10, period?: string): Promise<Array<{
    tailorId: string;
    businessName: string;
    totalEarnings: number;
    totalOrders: number;
  }>> {
    let query = this.supabase
      .from('tailor_payment_summary')
      .select(`
        tailor_id,
        total_earnings,
        total_orders,
        tailor_profiles!inner(business_name)
      `)
      .order('total_earnings', { ascending: false })
      .limit(limit);

    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch top earning tailors: ${error.message}`);
    }

    return (data || []).map(row => ({
      tailorId: row.tailor_id,
      businessName: (row as any).tailor_profiles?.business_name,
      totalEarnings: row.total_earnings,
      totalOrders: row.total_orders
    }));
  }

  async getCommissionRecords(
    tailorId?: string,
    filters?: {
      status?: string[];
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    let query = this.supabase
      .from('tailor_commission_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (tailorId) {
      query = query.eq('tailor_id', tailorId);
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch commission records: ${error.message}`);
    }

    return data || [];
  }

  async getAggregatedStats(tailorId: string, period?: string) {
    // Get payment summary
    const paymentSummary = period 
      ? await this.getTailorPaymentSummary(tailorId, period)
      : null;

    // Get commission records count
    const { data: commissionData, error: commissionError } = await this.supabase
      .from('tailor_commission_records')
      .select('status', { count: 'exact' })
      .eq('tailor_id', tailorId);

    if (commissionError) {
      throw new Error(`Failed to fetch commission stats: ${commissionError.message}`);
    }

    // Get invoice count
    const { data: invoiceData, error: invoiceError } = await this.supabase
      .from('tax_invoices')
      .select('status', { count: 'exact' })
      .eq('tailor_id', tailorId);

    if (invoiceError) {
      throw new Error(`Failed to fetch invoice stats: ${invoiceError.message}`);
    }

    return {
      paymentSummary,
      commissionRecordsCount: commissionData?.length || 0,
      invoicesCount: invoiceData?.length || 0
    };
  }
}