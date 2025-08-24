import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { 
  CreateOrderInput, 
  CreateOrderResponse,
  OrderStatus
} from '@sew4mi/shared/types';
import { CreateOrderInputSchema } from '@sew4mi/shared/schemas';

/**
 * POST /api/orders/create
 * Creates a new order with validation and escrow calculation
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, errors: ['Authentication required'] },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    let orderData: CreateOrderInput;

    try {
      orderData = CreateOrderInputSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errors = validationError.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return NextResponse.json(
          { success: false, errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, errors: ['Invalid request data'] },
        { status: 400 }
      );
    }

    // Verify user is customer and owns the order
    if (orderData.customerId !== user.id) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized - customer ID mismatch'] },
        { status: 403 }
      );
    }

    // Validate tailor exists and is active
    const { data: tailor, error: tailorError } = await supabase
      .from('tailor_profiles')
      .select('id, user_id, is_active')
      .eq('user_id', orderData.tailorId)
      .eq('is_active', true)
      .single();

    if (tailorError || !tailor) {
      return NextResponse.json(
        { success: false, errors: ['Selected tailor is not available'] },
        { status: 400 }
      );
    }

    // Validate measurement profile exists and belongs to customer
    const { data: measurementProfile, error: profileError } = await supabase
      .from('measurement_profiles')
      .select('id, user_id')
      .eq('id', orderData.measurementProfileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !measurementProfile) {
      return NextResponse.json(
        { success: false, errors: ['Invalid measurement profile'] },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate escrow breakdown with proper rounding
    const depositAmount = Math.round(orderData.totalAmount * 0.25 * 100) / 100;
    const fittingAmount = Math.round(orderData.totalAmount * 0.5 * 100) / 100;
    const finalAmount = Math.round(orderData.totalAmount * 0.25 * 100) / 100;

    // Verify total amounts match (accounting for rounding)
    const totalCalculated = depositAmount + fittingAmount + finalAmount;
    if (Math.abs(totalCalculated - orderData.totalAmount) > 0.01) {
      return NextResponse.json(
        { success: false, errors: ['Invalid amount calculation'] },
        { status: 400 }
      );
    }

    // Create order in database
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: orderData.customerId,
        tailor_id: orderData.tailorId,
        measurement_profile_id: orderData.measurementProfileId,
        garment_type: orderData.garmentType,
        fabric_choice: orderData.fabricChoice,
        special_instructions: orderData.specialInstructions,
        urgency_level: orderData.urgencyLevel,
        status: OrderStatus.PENDING_DEPOSIT,
        total_amount: orderData.totalAmount,
        deposit_amount: depositAmount,
        fitting_amount: fittingAmount,
        final_amount: finalAmount,
        escrow_balance: 0,
        estimated_delivery: orderData.estimatedDelivery.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, order_number')
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json(
        { success: false, errors: ['Failed to create order'] },
        { status: 500 }
      );
    }

    // Create initial milestone entries
    const milestones = [
      {
        order_id: newOrder.id,
        stage: 'DEPOSIT',
        amount: depositAmount,
        status: 'PENDING',
        required_action: 'CUSTOMER_PAYMENT'
      },
      {
        order_id: newOrder.id,
        stage: 'FITTING',
        amount: fittingAmount,
        status: 'PENDING',
        required_action: 'TAILOR_SUBMISSION'
      },
      {
        order_id: newOrder.id,
        stage: 'FINAL',
        amount: finalAmount,
        status: 'PENDING',
        required_action: 'TAILOR_SUBMISSION'
      }
    ];

    const { error: milestonesError } = await supabase
      .from('order_milestones')
      .insert(milestones);

    if (milestonesError) {
      console.error('Milestones creation error:', milestonesError);
      // Don't fail the entire order creation, but log the error
    }

    // Send notification to tailor (in real app, would use notification service)
    try {
      // This would be replaced with actual notification service
      console.log(`New order notification should be sent to tailor ${orderData.tailorId}`);
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Don't fail order creation due to notification issues
    }

    const response: CreateOrderResponse = {
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.order_number
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}