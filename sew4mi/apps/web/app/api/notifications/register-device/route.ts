import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

/**
 * POST /api/notifications/register-device
 * Registers a device for push notifications
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const deviceSchema = z.object({
      deviceToken: z.string().min(1),
      platform: z.enum(['ios', 'android', 'web']),
      enabled: z.boolean().default(true)
    });

    const { deviceToken, platform, enabled } = deviceSchema.parse(body);

    // Check if device is already registered
    const { data: existingDevice } = await supabase
      .from('user_push_devices')
      .select('id, enabled')
      .eq('user_id', user.id)
      .eq('device_token', deviceToken)
      .single();

    if (existingDevice) {
      // Update existing device
      const { error: updateError } = await supabase
        .from('user_push_devices')
        .update({
          enabled,
          platform,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDevice.id);

      if (updateError) {
        console.error('Device update error:', updateError);
        return NextResponse.json(
          { success: false, errors: ['Failed to update device'] },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Device updated successfully',
        deviceId: existingDevice.id
      }, { status: 200 });
    }

    // Register new device
    const { data: newDevice, error: insertError } = await supabase
      .from('user_push_devices')
      .insert({
        user_id: user.id,
        device_token: deviceToken,
        platform,
        enabled,
        registered_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Device registration error:', insertError);
      return NextResponse.json(
        { success: false, errors: ['Failed to register device'] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      deviceId: newDevice.id
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    console.error('Device registration error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/register-device
 * Unregisters a device from push notifications
 */
export async function DELETE(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const deviceToken = searchParams.get('deviceToken');

    if (!deviceToken) {
      return NextResponse.json(
        { success: false, errors: ['Device token is required'] },
        { status: 400 }
      );
    }

    // Remove device registration
    const { error: deleteError } = await supabase
      .from('user_push_devices')
      .delete()
      .eq('user_id', user.id)
      .eq('device_token', deviceToken);

    if (deleteError) {
      console.error('Device unregistration error:', deleteError);
      return NextResponse.json(
        { success: false, errors: ['Failed to unregister device'] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device unregistered successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Device unregistration error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}