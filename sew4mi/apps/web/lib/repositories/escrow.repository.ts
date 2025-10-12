import { createClient } from '@/lib/supabase/server';
import {
  EscrowTransaction,
  EscrowStage,
  EscrowTransactionType,
  EscrowStatus
} from '@sew4mi/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export class EscrowRepository {
  private supabase: SupabaseClient | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Get escrow status for an order
   */
  async getEscrowStatus(orderId: string): Promise<EscrowStatus | null> {
    const supabase = await this.getClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        escrow_stage,
        total_amount,
        deposit_amount,
        fitting_amount,
        final_amount,
        escrow_balance,
        deposit_paid_at,
        fitting_paid_at,
        final_paid_at
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return null;
    }

    // Get stage transition history
    const { data: transactions } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    const stageHistory = transactions?.map(t => ({
      stage: t.to_stage as EscrowStage,
      transitionedAt: t.created_at,
      amount: t.amount,
      transactionId: t.id,
      notes: t.notes
    })) || [];

    // Calculate next stage amount
    let nextStageAmount: number | undefined;
    switch (order.escrow_stage) {
      case 'DEPOSIT':
        nextStageAmount = order.deposit_amount;
        break;
      case 'FITTING':
        nextStageAmount = order.fitting_amount;
        break;
      case 'FINAL':
        nextStageAmount = order.final_amount;
        break;
      default:
        nextStageAmount = undefined;
    }

    return {
      orderId: order.id,
      currentStage: order.escrow_stage as EscrowStage,
      totalAmount: order.total_amount,
      depositPaid: order.deposit_paid_at ? order.deposit_amount : 0,
      fittingPaid: order.fitting_paid_at ? order.fitting_amount : 0,
      finalPaid: order.final_paid_at ? order.final_amount : 0,
      escrowBalance: order.escrow_balance,
      nextStageAmount,
      stageHistory
    };
  }

  /**
   * Update order escrow stage and amounts
   */
  async updateEscrowStage(
    orderId: string, 
    newStage: EscrowStage,
    paidAmount?: number
  ): Promise<boolean> {
    const supabase = await this.getClient();
    const updates: any = {
      escrow_stage: newStage,
      updated_at: new Date().toISOString()
    };

    // Set paid timestamp based on stage
    if (paidAmount && paidAmount > 0) {
      switch (newStage) {
        case 'FITTING':
          updates.deposit_paid_at = new Date().toISOString();
          break;
        case 'FINAL':
          updates.fitting_paid_at = new Date().toISOString();
          break;
        case 'RELEASED':
          updates.final_paid_at = new Date().toISOString();
          break;
      }
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    return !error;
  }

  /**
   * Create escrow transaction record
   */
  async createEscrowTransaction(
    orderId: string,
    transactionType: EscrowTransactionType,
    amount: number,
    fromStage: EscrowStage | null,
    toStage: EscrowStage,
    paymentTransactionId?: string,
    approvedBy?: string,
    notes?: string
  ): Promise<EscrowTransaction | null> {
    const supabase = await this.getClient();
    const transactionData = {
      order_id: orderId,
      transaction_type: transactionType,
      amount,
      from_stage: fromStage,
      to_stage: toStage,
      payment_transaction_id: paymentTransactionId,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('escrow_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      orderId: data.order_id,
      transactionType: data.transaction_type as EscrowTransactionType,
      amount: data.amount,
      fromStage: data.from_stage as EscrowStage | undefined,
      toStage: data.to_stage as EscrowStage,
      paymentTransactionId: data.payment_transaction_id,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Get escrow transactions for an order
   */
  async getEscrowTransactions(orderId: string): Promise<EscrowTransaction[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(t => ({
      id: t.id,
      orderId: t.order_id,
      transactionType: t.transaction_type as EscrowTransactionType,
      amount: t.amount,
      fromStage: t.from_stage as EscrowStage | undefined,
      toStage: t.to_stage as EscrowStage,
      paymentTransactionId: t.payment_transaction_id,
      approvedBy: t.approved_by,
      approvedAt: t.approved_at,
      notes: t.notes,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
  }

  /**
   * Get total escrow funds across all orders
   */
  async getTotalEscrowFunds(): Promise<number> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('orders')
      .select('escrow_balance')
      .gt('escrow_balance', 0);

    if (error || !data) {
      return 0;
    }

    return data.reduce((total, order) => total + order.escrow_balance, 0);
  }

  /**
   * Get escrow summary for admin reporting
   */
  async getEscrowSummary() {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from('escrow_summary')
      .select('*')
      .order('order_created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch escrow summary: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update order escrow amounts when total amount changes
   */
  async updateEscrowAmounts(
    orderId: string,
    depositAmount: number,
    fittingAmount: number,
    finalAmount: number,
    escrowBalance: number
  ): Promise<boolean> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from('orders')
      .update({
        deposit_amount: depositAmount,
        fitting_amount: fittingAmount,
        final_amount: finalAmount,
        escrow_balance: escrowBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    return !error;
  }

  /**
   * Get orders by escrow stage for processing
   */
  async getOrdersByEscrowStage(stage: EscrowStage): Promise<any[]> {
    const supabase = await this.getClient();
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        tailor_id,
        status,
        escrow_stage,
        total_amount,
        deposit_amount,
        fitting_amount,
        final_amount,
        escrow_balance,
        created_at,
        updated_at
      `)
      .eq('escrow_stage', stage)
      .gt('escrow_balance', 0);

    return data || [];
  }
}