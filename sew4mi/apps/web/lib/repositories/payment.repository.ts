import { createClient } from '@supabase/supabase-js';
import { ENV_CONFIG } from '../config/env';
import { PaymentTransaction } from '@sew4mi/shared/types';

export interface CreatePaymentTransactionData {
  id: string;
  orderId: string;
  type: 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND';
  amount: number;
  provider: string;
  providerTransactionId: string;
  hubtelTransactionId?: string;
  paymentMethod: string;
  customerPhoneNumber?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
}

export interface UpdatePaymentStatusData {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  hubtelTransactionId?: string;
  webhookReceived?: boolean;
  retryCount?: number;
}

export class PaymentRepository {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient(ENV_CONFIG.SUPABASE_URL, ENV_CONFIG.SUPABASE_ANON_KEY);
  }

  /**
   * Create a new payment transaction record
   */
  async create(data: CreatePaymentTransactionData): Promise<PaymentTransaction | null> {
    try {
      const { data: result, error } = await this.supabase
        .from('payment_transactions')
        .insert({
          id: data.id,
          order_id: data.orderId,
          type: data.type,
          amount: data.amount,
          provider: data.provider,
          provider_transaction_id: data.providerTransactionId,
          hubtel_transaction_id: data.hubtelTransactionId,
          payment_method: data.paymentMethod,
          customer_phone_number: data.customerPhoneNumber,
          status: data.status,
          webhook_received: false,
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create payment transaction:', error);
        return null;
      }

      return this.mapDatabaseToPaymentTransaction(result);
    } catch (error) {
      console.error('PaymentRepository.create error:', error);
      return null;
    }
  }

  /**
   * Find payment transaction by transaction ID
   */
  async findById(transactionId: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('Failed to find payment transaction:', error);
        return null;
      }

      return this.mapDatabaseToPaymentTransaction(data);
    } catch (error) {
      console.error('PaymentRepository.findById error:', error);
      return null;
    }
  }

  /**
   * Find payment transaction by provider transaction ID
   */
  async findByProviderTransactionId(providerTransactionId: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('provider_transaction_id', providerTransactionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('Failed to find payment transaction by provider ID:', error);
        return null;
      }

      return this.mapDatabaseToPaymentTransaction(data);
    } catch (error) {
      console.error('PaymentRepository.findByProviderTransactionId error:', error);
      return null;
    }
  }

  /**
   * Find payment transaction by Hubtel transaction ID
   */
  async findByHubtelTransactionId(hubtelTransactionId: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('hubtel_transaction_id', hubtelTransactionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('Failed to find payment transaction by Hubtel ID:', error);
        return null;
      }

      return this.mapDatabaseToPaymentTransaction(data);
    } catch (error) {
      console.error('PaymentRepository.findByHubtelTransactionId error:', error);
      return null;
    }
  }

  /**
   * Update payment transaction status
   */
  async updateStatus(transactionId: string, updateData: UpdatePaymentStatusData): Promise<PaymentTransaction | null> {
    try {
      const updateFields: any = {
        status: updateData.status,
        updated_at: new Date().toISOString()
      };

      if (updateData.hubtelTransactionId !== undefined) {
        updateFields.hubtel_transaction_id = updateData.hubtelTransactionId;
      }

      if (updateData.webhookReceived !== undefined) {
        updateFields.webhook_received = updateData.webhookReceived;
      }

      if (updateData.retryCount !== undefined) {
        updateFields.retry_count = updateData.retryCount;
      }

      const { data, error } = await this.supabase
        .from('payment_transactions')
        .update(updateFields)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update payment transaction:', error);
        return null;
      }

      return this.mapDatabaseToPaymentTransaction(data);
    } catch (error) {
      console.error('PaymentRepository.updateStatus error:', error);
      return null;
    }
  }

  /**
   * Get all payment transactions for an order
   */
  async findByOrderId(orderId: string): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to find payment transactions by order ID:', error);
        return [];
      }

      return data.map(item => this.mapDatabaseToPaymentTransaction(item));
    } catch (error) {
      console.error('PaymentRepository.findByOrderId error:', error);
      return [];
    }
  }

  /**
   * Get pending payment transactions that need status checking
   */
  async findPendingTransactions(limit: number = 50): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('status', 'PENDING')
        .lt('retry_count', 3) // Only get transactions that haven't exceeded retry limit
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Failed to find pending payment transactions:', error);
        return [];
      }

      return data.map(item => this.mapDatabaseToPaymentTransaction(item));
    } catch (error) {
      console.error('PaymentRepository.findPendingTransactions error:', error);
      return [];
    }
  }

  /**
   * Increment retry count for a transaction
   */
  async incrementRetryCount(transactionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('payment_transactions')
        .update({
          retry_count: 'retry_count + 1',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) {
        console.error('Failed to increment retry count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('PaymentRepository.incrementRetryCount error:', error);
      return false;
    }
  }

  /**
   * Map database row to PaymentTransaction type
   */
  private mapDatabaseToPaymentTransaction(dbRow: any): PaymentTransaction {
    return {
      id: dbRow.id,
      orderId: dbRow.order_id,
      type: dbRow.type,
      amount: dbRow.amount,
      provider: dbRow.provider,
      providerTransactionId: dbRow.provider_transaction_id,
      hubtelTransactionId: dbRow.hubtel_transaction_id,
      paymentMethod: dbRow.payment_method,
      customerPhoneNumber: dbRow.customer_phone_number,
      status: dbRow.status,
      webhookReceived: dbRow.webhook_received,
      retryCount: dbRow.retry_count,
      createdAt: new Date(dbRow.created_at),
      updatedAt: new Date(dbRow.updated_at)
    };
  }
}

// Singleton instance
export const paymentRepository = new PaymentRepository();