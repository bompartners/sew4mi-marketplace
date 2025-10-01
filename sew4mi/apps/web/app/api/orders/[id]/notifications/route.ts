import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { OrderNotificationPreferences } from '@sew4mi/shared/types';

/**
 * GET /api/orders/[id]/notifications
 * Gets notification preferences for a specific order and user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { id } = await params;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, errors: ['Authentication required'] },
        { status: 401 }
      );
    }

    // Validate order ID format
    const orderIdSchema = z.string().uuid();
    const validatedOrderId = orderIdSchema.parse(id);

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id')
      .eq('id', validatedOrderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, errors: ['Order not found'] },
        { status: 404 }
      );
    }

    const isCustomer = order.customer_id === user.id;
    const isTailor = order.tailor_id === user.id;
    
    if (!isCustomer && !isTailor) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized access to order'] },
        { status: 403 }
      );
    }

    // Get user's notification preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_notification_preferences')
      .select(`
        user_id,
        sms,
        email,
        whatsapp,
        order_status_updates,
        milestone_updates,
        payment_reminders,
        delivery_notifications,
        in_app_notifications,
        push_notifications
      `)
      .eq('user_id', user.id)
      .single();

    if (preferencesError) {
      // If no preferences exist, return defaults
      const defaultPreferences: OrderNotificationPreferences = {
        userId: user.id,
        sms: true,
        email: true,
        whatsapp: true,
        orderStatusUpdates: true,
        milestoneUpdates: true,
        paymentReminders: true,
        deliveryNotifications: true,
        inAppNotifications: true,
        pushNotifications: false
      };

      return NextResponse.json(defaultPreferences, { status: 200 });
    }

    const response: OrderNotificationPreferences = {
      userId: preferences.user_id,
      sms: preferences.sms,
      email: preferences.email,
      whatsapp: preferences.whatsapp,
      orderStatusUpdates: preferences.order_status_updates,
      milestoneUpdates: preferences.milestone_updates,
      paymentReminders: preferences.payment_reminders,
      deliveryNotifications: preferences.delivery_notifications,
      inAppNotifications: preferences.in_app_notifications,
      pushNotifications: preferences.push_notifications
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: ['Invalid order ID format'] },
        { status: 400 }
      );
    }

    console.error('Notification preferences fetch error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[id]/notifications
 * Updates notification preferences for a specific user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { id } = await params;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, errors: ['Authentication required'] },
        { status: 401 }
      );
    }

    // Validate order ID format
    const orderIdSchema = z.string().uuid();
    const validatedOrderId = orderIdSchema.parse(id);

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id')
      .eq('id', validatedOrderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, errors: ['Order not found'] },
        { status: 404 }
      );
    }

    const isCustomer = order.customer_id === user.id;
    const isTailor = order.tailor_id === user.id;
    
    if (!isCustomer && !isTailor) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized access to order'] },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const preferencesSchema = z.object({
      sms: z.boolean(),
      email: z.boolean(),
      whatsapp: z.boolean(),
      orderStatusUpdates: z.boolean(),
      milestoneUpdates: z.boolean(),
      paymentReminders: z.boolean(),
      deliveryNotifications: z.boolean(),
      inAppNotifications: z.boolean(),
      pushNotifications: z.boolean()
    });

    const preferences = preferencesSchema.parse(body);

    // Upsert user notification preferences
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: user.id,
        sms: preferences.sms,
        email: preferences.email,
        whatsapp: preferences.whatsapp,
        order_status_updates: preferences.orderStatusUpdates,
        milestone_updates: preferences.milestoneUpdates,
        payment_reminders: preferences.paymentReminders,
        delivery_notifications: preferences.deliveryNotifications,
        in_app_notifications: preferences.inAppNotifications,
        push_notifications: preferences.pushNotifications,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (updateError) {
      console.error('Notification preferences update error:', updateError);
      return NextResponse.json(
        { success: false, errors: ['Failed to update preferences'] },
        { status: 500 }
      );
    }

    const response: OrderNotificationPreferences = {
      userId: updatedPreferences.user_id,
      sms: updatedPreferences.sms,
      email: updatedPreferences.email,
      whatsapp: updatedPreferences.whatsapp,
      orderStatusUpdates: updatedPreferences.order_status_updates,
      milestoneUpdates: updatedPreferences.milestone_updates,
      paymentReminders: updatedPreferences.payment_reminders,
      deliveryNotifications: updatedPreferences.delivery_notifications,
      inAppNotifications: updatedPreferences.in_app_notifications,
      pushNotifications: updatedPreferences.push_notifications
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    console.error('Notification preferences update error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}