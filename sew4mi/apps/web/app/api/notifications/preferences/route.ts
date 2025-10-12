import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import { OrderNotificationPreferences } from '@sew4mi/shared/types';

/**
 * GET /api/notifications/preferences
 * Gets global notification preferences for the authenticated user
 */
export async function GET() {
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

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('Notification preferences fetch error:', preferencesError);
      return NextResponse.json(
        { success: false, errors: ['Failed to fetch preferences'] },
        { status: 500 }
      );
    }

    // If no preferences exist, return defaults
    if (!preferences) {
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
    console.error('Notification preferences fetch error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Updates global notification preferences for the authenticated user
 */
export async function POST(request: NextRequest) {
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