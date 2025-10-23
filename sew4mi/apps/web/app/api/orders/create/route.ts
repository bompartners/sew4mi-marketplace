import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { 
  CreateOrderInput, 
  CreateOrderResponse
} from '@sew4mi/shared/types';
import { CreateOrderInputSchema } from '@sew4mi/shared/schemas';
import { notificationService, NotificationType } from '@/lib/services/notification.service';

/**
 * POST /api/orders/create
 * Creates a new order with validation and escrow calculation
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

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
    console.log('Validating tailor with ID:', orderData.tailorId);
    const { data: tailor, error: tailorError } = await supabase
      .from('tailor_profiles')
      .select('id, user_id, vacation_mode')
      .eq('user_id', orderData.tailorId)
      .eq('vacation_mode', false)
      .single();

    if (tailorError || !tailor) {
      console.error('Tailor validation error:', tailorError);
      console.error('Tailor data:', tailor);
      return NextResponse.json(
        { success: false, errors: ['Selected tailor is not available'] },
        { status: 400 }
      );
    }
    
    console.log('Tailor validated successfully:', tailor.id);

    // Validate measurement profile exists and belongs to customer
    // For now, we'll skip this validation since measurement profiles are mock data
    // In production, this should validate against the actual measurement_profiles table
    // const { data: measurementProfile, error: profileError } = await supabase
    //   .from('measurement_profiles')
    //   .select('id, user_id')
    //   .eq('id', orderData.measurementProfileId)
    //   .eq('user_id', user.id)
    //   .single();

    // if (profileError || !measurementProfile) {
    //   console.error('Measurement profile validation error:', profileError);
    //   console.log('Attempted to find profile with ID:', orderData.measurementProfileId);
    //   return NextResponse.json(
    //     { success: false, errors: ['Invalid measurement profile'] },
    //     { status: 400 }
    //   );
    // }
    
    // TODO: Implement actual measurement profile validation once the feature is fully implemented
    console.log('Using measurement profile ID:', orderData.measurementProfileId);

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
    const orderInsertData = {
      order_number: orderNumber,
      customer_id: orderData.customerId,
      tailor_id: tailor.id, // Use tailor profile ID, not user_id
      measurement_profile_id: null, // TODO: Use real measurement profiles when implemented
      garment_type: orderData.garmentType,
      fabric_choice: orderData.fabricChoice,
      special_instructions: orderData.specialInstructions,
      urgency_level: orderData.urgencyLevel,
      status: 'SUBMITTED',  // Initial status when order is created, awaiting deposit
      total_amount: orderData.totalAmount,
      deposit_amount: depositAmount,
      fitting_payment_amount: fittingAmount,
      final_payment_amount: finalAmount,
      escrow_balance: 0,
      delivery_date: orderData.estimatedDelivery.toISOString().split('T')[0], // DATE format YYYY-MM-DD
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Attempting to insert order with data:', JSON.stringify(orderInsertData, null, 2));
    
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select('id, order_number')
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      console.error('Error details:', JSON.stringify(orderError, null, 2));
      return NextResponse.json(
        { success: false, errors: [orderError.message || 'Failed to create order'], details: orderError },
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

    // Send notifications to both tailor and customer
    try {
      // Get customer profile for notification
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number')
        .eq('id', orderData.customerId)
        .single();

      // Notify tailor about new order
      await notificationService.sendNotification({
        userId: orderData.tailorId,
        type: NotificationType.ORDER_UPDATE,
        title: 'New Order Received! 🎉',
        message: `You have a new order #${newOrder.order_number} for ${orderData.garmentType}. Total: GHS ${orderData.totalAmount}`,
        data: { 
          orderId: newOrder.id,
          orderNumber: newOrder.order_number,
          customerName: customerProfile?.full_name || 'Customer',
          garmentType: orderData.garmentType,
          totalAmount: orderData.totalAmount,
          estimatedDelivery: orderData.estimatedDelivery
        },
        channels: ['in-app', 'whatsapp'],
        priority: 'high'
      });

      // Notify customer about order confirmation
      await notificationService.sendNotification({
        userId: orderData.customerId,
        type: NotificationType.ORDER_UPDATE,
        title: 'Order Created Successfully',
        message: `Your order #${newOrder.order_number} has been created. Please pay the deposit of GHS ${depositAmount} to confirm.`,
        data: { 
          orderId: newOrder.id,
          orderNumber: newOrder.order_number,
          depositAmount: depositAmount,
          totalAmount: orderData.totalAmount
        },
        channels: ['in-app', 'whatsapp'],
        priority: 'high'
      });

      console.log(`Notifications sent for order ${newOrder.order_number}`);
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