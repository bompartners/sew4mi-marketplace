import { createClient } from '@/lib/supabase';
import type { TailorCommissionRecord, CommissionBreakdown } from '@sew4mi/shared';
import type { Database } from '@sew4mi/shared';

type DbCommissionRecord = Database['public']['Tables']['tailor_commission_records']['Row'];
type DbCommissionInsert = Database['public']['Tables']['tailor_commission_records']['Insert'];

export class CommissionService {
  private supabase = createClient();
  private readonly DEFAULT_COMMISSION_RATE = 0.20; // 20%

  async createCommissionRecord(data: {
    tailorId: string;
    orderId: string;
    orderAmount: number;
    paymentTransactionId?: string;
    commissionRate?: number;
  }): Promise<TailorCommissionRecord> {
    const commissionRate = data.commissionRate || this.DEFAULT_COMMISSION_RATE;
    const commissionAmount = data.orderAmount * commissionRate;
    const netPayment = data.orderAmount - commissionAmount;

    const insertData: DbCommissionInsert = {
      tailor_id: data.tailorId,
      order_id: data.orderId,
      payment_transaction_id: data.paymentTransactionId || null,
      order_amount: data.orderAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      net_payment: netPayment,
      status: 'PENDING'
    };

    const { data: record, error } = await this.supabase
      .from('tailor_commission_records')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create commission record: ${error.message}`);
    }

    return this.mapDbRecordToCommissionRecord(record);
  }

  async getCommissionRecordsByTailor(
    tailorId: string,
    status?: 'PENDING' | 'PROCESSED' | 'DISPUTED'
  ): Promise<TailorCommissionRecord[]> {
    let query = this.supabase
      .from('tailor_commission_records')
      .select('*')
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch commission records: ${error.message}`);
    }

    return (data || []).map(this.mapDbRecordToCommissionRecord);
  }

  async getCommissionBreakdown(orderId: string): Promise<CommissionBreakdown> {
    // Get commission record for the order
    const { data: commissionRecord, error: commissionError } = await this.supabase
      .from('tailor_commission_records')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (commissionError) {
      throw new Error(`Failed to fetch commission record: ${commissionError.message}`);
    }

    // Get order details
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('total_amount, currency')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error(`Failed to fetch order details: ${orderError.message}`);
    }

    // Calculate breakdown
    const platformCommissionAmount = commissionRecord.commission_amount;
    const processingFeeRate = 0.025; // 2.5% processing fee estimate
    const processingFeeAmount = order.total_amount * processingFeeRate;
    
    const breakdown: CommissionBreakdown = {
      orderId,
      orderAmount: order.total_amount,
      commissionRate: commissionRecord.commission_rate,
      commissionAmount: platformCommissionAmount,
      platformFees: platformCommissionAmount,
      processingFees: processingFeeAmount,
      netAmount: commissionRecord.net_payment,
      breakdown: [
        {
          type: 'PLATFORM_COMMISSION',
          amount: platformCommissionAmount,
          percentage: commissionRecord.commission_rate * 100,
          description: `Sew4Mi platform commission (${(commissionRecord.commission_rate * 100).toFixed(1)}%)`
        },
        {
          type: 'PROCESSING_FEE',
          amount: processingFeeAmount,
          percentage: processingFeeRate * 100,
          description: 'Payment processing fees (estimated)'
        }
      ]
    };

    return breakdown;
  }

  async processCommissionRecord(recordId: string): Promise<TailorCommissionRecord> {
    const { data, error } = await this.supabase
      .from('tailor_commission_records')
      .update({
        status: 'PROCESSED',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to process commission record: ${error.message}`);
    }

    return this.mapDbRecordToCommissionRecord(data);
  }

  async disputeCommissionRecord(recordId: string, _reason?: string): Promise<TailorCommissionRecord> {
    const { data, error } = await this.supabase
      .from('tailor_commission_records')
      .update({
        status: 'DISPUTED',
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to dispute commission record: ${error.message}`);
    }

    // Could create a dispute record here if needed
    // await this.createDisputeRecord(recordId, reason);

    return this.mapDbRecordToCommissionRecord(data);
  }

  async calculateCommission(
    orderAmount: number,
    commissionRate?: number
  ): Promise<{
    grossAmount: number;
    commissionRate: number;
    commissionAmount: number;
    netAmount: number;
    breakdown: Array<{
      type: string;
      amount: number;
      percentage: number;
      description: string;
    }>;
  }> {
    const rate = commissionRate || this.DEFAULT_COMMISSION_RATE;
    const commissionAmount = orderAmount * rate;
    const netAmount = orderAmount - commissionAmount;

    return {
      grossAmount: orderAmount,
      commissionRate: rate,
      commissionAmount,
      netAmount,
      breakdown: [
        {
          type: 'PLATFORM_COMMISSION',
          amount: commissionAmount,
          percentage: rate * 100,
          description: `Sew4Mi platform commission (${(rate * 100).toFixed(1)}%)`
        }
      ]
    };
  }

  async getCommissionStats(tailorId: string, period?: string) {
    let query = this.supabase
      .from('tailor_commission_records')
      .select('*')
      .eq('tailor_id', tailorId);

    if (period) {
      // Filter by period (YYYY-MM format)
      const startDate = `${period}-01`;
      const endDate = new Date(period + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      
      query = query
        .gte('created_at', startDate)
        .lt('created_at', endDate.toISOString().slice(0, 10));
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch commission stats: ${error.message}`);
    }

    const records = data || [];
    const totalCommission = records.reduce((sum, record) => sum + record.commission_amount, 0);
    const totalNetPayments = records.reduce((sum, record) => sum + record.net_payment, 0);
    const averageCommissionRate = records.length > 0 
      ? records.reduce((sum, record) => sum + record.commission_rate, 0) / records.length
      : this.DEFAULT_COMMISSION_RATE;

    const statusCounts = records.reduce((counts, record) => {
      counts[record.status] = (counts[record.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalRecords: records.length,
      totalCommission,
      totalNetPayments,
      averageCommissionRate,
      statusBreakdown: {
        pending: statusCounts.PENDING || 0,
        processed: statusCounts.PROCESSED || 0,
        disputed: statusCounts.DISPUTED || 0
      }
    };
  }

  private mapDbRecordToCommissionRecord(record: DbCommissionRecord): TailorCommissionRecord {
    return {
      id: record.id,
      tailorId: record.tailor_id,
      orderId: record.order_id,
      orderAmount: record.order_amount,
      commissionRate: record.commission_rate,
      commissionAmount: record.commission_amount,
      netPayment: record.net_payment,
      processedAt: record.processed_at ? new Date(record.processed_at) : null,
      status: record.status as 'PENDING' | 'PROCESSED' | 'DISPUTED',
      invoiceId: record.invoice_id || undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }

  async updateCommissionRate(newRate: number): Promise<void> {
    // This would typically be an admin-only function
    // For now, just validate the rate
    if (newRate < 0 || newRate > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }

    // In a real implementation, you might update a settings table
    // or configuration that affects future commission calculations
    // TODO: Implement admin-only commission rate updates with proper audit logging
  }

  getCurrentCommissionRate(): number {
    return this.DEFAULT_COMMISSION_RATE;
  }
}