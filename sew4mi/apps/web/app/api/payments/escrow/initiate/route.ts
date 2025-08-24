import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  EscrowInitiatePaymentSchema,
  EscrowInitiateResponseSchema 
} from '@sew4mi/shared';
import { EscrowService } from '../../../../../lib/services/escrow.service';

/**
 * POST /api/payments/escrow/initiate
 * Initialize escrow payment for an order
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = EscrowInitiatePaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { orderId, totalAmount, customerPhone } = validationResult.data;
    // paymentMethod extracted but not used in current implementation

    // Verify user owns the order or is authorized
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id, status, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is customer or tailor for this order
    if (order.customer_id !== user.id && order.tailor_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Verify total amount matches order
    if (Math.abs(order.total_amount - totalAmount) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: 'Total amount mismatch with order'
        },
        { status: 400 }
      );
    }

    // Check if order is in valid state for escrow initiation
    const validStatuses = ['DRAFT', 'PENDING', 'CONFIRMED'];
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot initiate escrow for order with status: ${order.status}`
        },
        { status: 400 }
      );
    }

    // Initialize escrow payment
    const escrowService = new EscrowService();
    const result = await escrowService.initiateEscrowPayment(
      orderId,
      totalAmount,
      customerPhone,
      user.id
    );

    // Validate response against schema
    const responseData = {
      success: true as const,
      data: {
        paymentIntentId: result.paymentIntentId,
        depositAmount: result.depositAmount,
        paymentUrl: result.paymentUrl,
        orderStatus: result.orderStatus
      }
    };

    const validatedResponse = EscrowInitiateResponseSchema.parse(responseData);

    return NextResponse.json(validatedResponse, { status: 200 });

  } catch (error) {
    console.error('Error in escrow initiation:', error);

    // Handle specific error types
    if (error instanceof Error && error.message.includes('Payment initiation failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment service error',
          details: error.message
        },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message.includes('escrow calculation')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount for escrow calculation'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/escrow/initiate
 * Get escrow initiation requirements and validation
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(_request.url);
    const totalAmount = parseFloat(searchParams.get('totalAmount') || '0');

    if (totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid total amount required' },
        { status: 400 }
      );
    }

    const escrowService = new EscrowService();
    const breakdown = escrowService.calculateBreakdown(totalAmount);

    return NextResponse.json({
      success: true,
      data: {
        breakdown,
        requirements: {
          minAmount: 10.00,
          maxAmount: 10000.00,
          supportedPaymentMethods: ['MTN_MOMO', 'VODAFONE_CASH', 'AIRTELTIGO_MONEY'],
          phoneNumberFormat: '+233XXXXXXXXX'
        }
      }
    });

  } catch (error) {
    console.error('Error getting escrow requirements:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}