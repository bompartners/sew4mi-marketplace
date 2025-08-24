/**
 * API endpoint for releasing milestone payment from escrow
 * POST /api/escrow/release-milestone-payment
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * Request validation schema
 */
const releaseRequestSchema = z.object({
  orderId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  reason: z.enum(['manual_approval', 'auto_approval']).optional().default('manual_approval')
});

/**
 * Validates internal service authorization
 */
function validateServiceAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not configured');
    return false;
  }
  
  // Check for Bearer token format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  return token === cronSecret;
}

/**
 * Calculates milestone payment amount based on order value and milestone stage
 */
function calculateMilestonePayment(orderAmount: number, milestoneStage: string): number {
  // Payment distribution based on milestone stages
  const paymentDistribution: Record<string, number> = {
    'FABRIC_SELECTED': 0.20,      // 20% - Material costs
    'CUTTING_STARTED': 0.15,      // 15% - Pattern and cutting
    'INITIAL_ASSEMBLY': 0.20,     // 20% - Basic construction
    'FITTING_READY': 0.20,        // 20% - Fitting and adjustments
    'ADJUSTMENTS_COMPLETE': 0.15, // 15% - Final adjustments
    'FINAL_PRESSING': 0.05,       // 5% - Finishing touches
    'READY_FOR_DELIVERY': 0.05    // 5% - Completion bonus
  };

  const percentage = paymentDistribution[milestoneStage] || 0;
  return Math.round(orderAmount * percentage * 100) / 100; // Round to 2 decimal places
}

/**
 * POST handler - Release milestone payment from escrow
 */
export async function POST(_request: NextRequest) {
  try {
    // Validate service authorization
    if (!validateServiceAuth(_request)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid service token' },
        { status: 401 }
      );
    }

    const supabase = await createServiceRoleClient();
    
    // Parse and validate request body
    const body = await _request.json();
    const validationResult = releaseRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { orderId, milestoneId, reason } = validationResult.data;

    console.log(`Processing milestone payment release: order=${orderId}, milestone=${milestoneId}, reason=${reason}`);

    // Get milestone and order details
    const { data: milestone, error: milestoneError } = await supabase
      .from('order_milestones')
      .select('id, milestone, approval_status, verified_at, order_id')
      .eq('id', milestoneId)
      .eq('order_id', orderId)
      .single();

    if (milestoneError || !milestone) {
      console.error('Milestone not found:', milestoneError);
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id, amount, status, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify milestone is approved
    if (milestone.approval_status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Milestone not approved for payment release' },
        { status: 409 }
      );
    }

    // Check if payment has already been released for this milestone
    const { data: existingPayments, error: paymentCheckError } = await supabase
      .from('escrow_transactions')
      .select('id')
      .eq('order_id', orderId)
      .eq('milestone_id', milestoneId)
      .eq('transaction_type', 'MILESTONE_RELEASE')
      .eq('status', 'COMPLETED')
      .limit(1);

    if (paymentCheckError) {
      throw paymentCheckError;
    }

    if (existingPayments && existingPayments.length > 0) {
      console.log(`Payment already released for milestone ${milestoneId}`);
      return NextResponse.json({
        success: true,
        message: 'Payment already released for this milestone',
        alreadyReleased: true
      });
    }

    // Calculate payment amount for this milestone
    const paymentAmount = calculateMilestonePayment(
      order.amount,
      milestone.milestone
    );

    if (paymentAmount <= 0) {
      console.error(`Invalid payment amount calculated: ${paymentAmount}`);
      return NextResponse.json(
        { error: 'Invalid milestone payment amount' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const transactionId = `mil_${milestoneId.slice(-8)}_${Date.now()}`;

    // Create escrow transaction record
    const { error: transactionError } = await supabase
      .from('escrow_transactions')
      .insert({
        id: transactionId,
        order_id: orderId,
        milestone_id: milestoneId,
        customer_id: order.customer_id,
        tailor_id: order.tailor_id,
        amount: paymentAmount,
        transaction_type: 'MILESTONE_RELEASE',
        status: 'PROCESSING',
        payment_method: 'escrow_release',
        description: `Milestone payment release: ${milestone.milestone}`,
        metadata: {
          milestoneStage: milestone.milestone,
          releaseReason: reason,
          approvedAt: milestone.verified_at
        },
        created_at: now,
        updated_at: now
      });

    if (transactionError) {
      throw transactionError;
    }

    console.log(`Created escrow transaction ${transactionId} for ${paymentAmount}`);

    // In a real implementation, here you would:
    // 1. Call payment processor to transfer funds
    // 2. Update transaction status based on result
    // For this demo, we'll simulate successful processing

    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time

    // Update transaction status to completed
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'COMPLETED',
        processed_at: now,
        updated_at: now
      })
      .eq('id', transactionId);

    if (updateError) {
      throw updateError;
    }

    // Create payment notification for tailor
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: order.tailor_id,
        type: 'MILESTONE_PAYMENT_RELEASED',
        title: 'Milestone Payment Released',
        message: `Payment of GH₵${paymentAmount} has been released for milestone: ${milestone.milestone}`,
        data: {
          orderId,
          milestoneId,
          transactionId,
          amount: paymentAmount,
          milestone: milestone.milestone
        },
        created_at: now
      });

    if (notificationError) {
      console.error('Failed to create payment notification:', notificationError);
    }

    console.log(`Successfully released milestone payment: ${paymentAmount} for milestone ${milestoneId}`);

    return NextResponse.json({
      success: true,
      transactionId,
      amount: paymentAmount,
      milestone: milestone.milestone,
      status: 'COMPLETED',
      message: `Payment of GH₵${paymentAmount} released successfully`
    });

  } catch (error) {
    console.error('Error releasing milestone payment:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}