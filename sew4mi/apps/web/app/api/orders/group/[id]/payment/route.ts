/**
 * Group Order Payment API Route
 * POST /api/orders/group/[id]/payment - Process group order payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { groupOrderService } from '@/lib/services/group-order.service';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { ProcessGroupPaymentRequestSchema } from '@sew4mi/shared/schemas/group-order.schema';

/**
 * POST /api/orders/group/[id]/payment
 * Process a payment for group order items
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupOrderId } = await params;
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ProcessGroupPaymentRequestSchema.safeParse({
      groupOrderId,
      payerId: body.payerId || user.id,
      orderIds: body.orderIds,
      amount: body.amount,
      paymentStage: body.paymentStage,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const paymentData = validationResult.data;
    
    // Verify group order exists and user has access
    const summary = await groupOrderService.getGroupOrderSummary(groupOrderId);
    if (!summary) {
      return NextResponse.json(
        { error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    // Verify user is the organizer or is paying for their own items
    const isOrganizer = summary.groupOrder.organizerId === user.id;
    const isPayer = paymentData.payerId === user.id;
    
    if (!isOrganizer && !isPayer) {
      return NextResponse.json(
        { error: 'Unauthorized to make payment for this group order' },
        { status: 403 }
      );
    }
    
    // Verify the order IDs belong to this group order
    const validOrderIds = summary.items.map(item => item.orderId);
    const invalidOrderIds = paymentData.orderIds.filter(id => !validOrderIds.includes(id));
    
    if (invalidOrderIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order IDs',
          invalidIds: invalidOrderIds,
        },
        { status: 400 }
      );
    }
    
    // Create or update payment tracking record
    const { error: paymentError } = await supabase
      .from('group_payment_tracking')
      .upsert({
        group_order_id: groupOrderId,
        payer_id: paymentData.payerId,
        payer_name: user.user_metadata?.full_name || user.email || 'Unknown',
        responsibility: paymentData.orderIds,
        total_responsible_amount: paymentData.amount,
        paid_amount: paymentData.amount,
        [`${paymentData.paymentStage.toLowerCase()}_paid`]: paymentData.amount,
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'group_order_id,payer_id',
      });
    
    if (paymentError) {
      console.error('Payment tracking error:', paymentError);
      throw new Error('Failed to record payment');
    }
    
    // In a real implementation, this would integrate with actual payment processing
    // (MTN MoMo, Vodafone Cash, etc.) and update order payment statuses
    
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      paymentId: `payment_${Date.now()}`,
      amount: paymentData.amount,
      paymentStage: paymentData.paymentStage,
      orderIds: paymentData.orderIds,
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing group payment:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

/**
 * GET /api/orders/group/[id]/payment
 * Get payment tracking for a group order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupOrderId } = await params;
    
    // Get group order summary with payment tracking
    const summary = await groupOrderService.getGroupOrderSummary(groupOrderId);
    
    if (!summary) {
      return NextResponse.json(
        { error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access
    if (summary.groupOrder.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to payment information' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      paymentTracking: summary.paymentTracking,
      totalAmount: summary.groupOrder.totalDiscountedAmount,
      paidAmount: summary.paymentTracking.reduce((sum, pt) => sum + pt.paidAmount, 0),
    });
    
  } catch (error) {
    console.error('Error fetching payment tracking:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

