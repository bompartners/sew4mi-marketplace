/**
 * Group Order Delivery API Route
 * POST /api/orders/group/[id]/delivery - Create delivery schedule
 * PUT /api/orders/group/[id]/delivery - Update delivery schedule
 * GET /api/orders/group/[id]/delivery - Get delivery schedules
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { groupOrderService } from '@/lib/services/group-order.service';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { UpdateDeliveryScheduleRequestSchema } from '@sew4mi/shared/schemas/group-order.schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/orders/group/[id]/delivery
 * Create a new delivery schedule for group order items
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
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
    const validationResult = UpdateDeliveryScheduleRequestSchema.safeParse({
      groupOrderId,
      deliveryStrategy: body.deliveryStrategy,
      schedules: body.schedules,
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
    
    const scheduleData = validationResult.data;
    
    // Verify group order exists and user has access
    const summary = await groupOrderService.getGroupOrderSummary(groupOrderId);
    if (!summary) {
      return NextResponse.json(
        { error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    // Only organizer can manage delivery schedules
    if (summary.groupOrder.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Only the group order organizer can manage delivery schedules' },
        { status: 403 }
      );
    }
    
    // Create delivery schedule records
    const scheduleRecords = scheduleData.schedules.map(schedule => ({
      id: uuidv4(),
      group_order_id: groupOrderId,
      order_items: schedule.orderItemIds,
      scheduled_date: schedule.scheduledDate.toISOString(),
      status: 'SCHEDULED',
      notes: schedule.notes || null,
      notification_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    const { data: createdSchedules, error: scheduleError } = await supabase
      .from('group_delivery_schedules')
      .insert(scheduleRecords)
      .select();
    
    if (scheduleError) {
      console.error('Delivery schedule creation error:', scheduleError);
      throw new Error('Failed to create delivery schedules');
    }
    
    // Update group order delivery strategy
    const { error: updateError } = await supabase
      .from('group_orders')
      .update({
        delivery_strategy: scheduleData.deliveryStrategy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupOrderId);
    
    if (updateError) {
      console.error('Group order update error:', updateError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Delivery schedules created successfully',
      schedules: createdSchedules,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating delivery schedules:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

/**
 * PUT /api/orders/group/[id]/delivery
 * Update an existing delivery schedule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupOrderId } = await params;
    const body = await request.json();
    
    // Verify group order exists and user has access
    const summary = await groupOrderService.getGroupOrderSummary(groupOrderId);
    if (!summary || summary.groupOrder.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized or group order not found' },
        { status: 403 }
      );
    }
    
    // Update delivery schedule
    const { scheduleId, status, actualDate, notes } = body;
    
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (status) updateData.status = status;
    if (actualDate) updateData.actual_date = new Date(actualDate).toISOString();
    if (notes !== undefined) updateData.notes = notes;
    
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('group_delivery_schedules')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('group_order_id', groupOrderId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Delivery schedule update error:', updateError);
      throw new Error('Failed to update delivery schedule');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Delivery schedule updated successfully',
      schedule: updatedSchedule,
    });
    
  } catch (error) {
    console.error('Error updating delivery schedule:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

/**
 * GET /api/orders/group/[id]/delivery
 * Get all delivery schedules for a group order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupOrderId } = await params;
    
    // Get group order summary with delivery schedules
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
        { error: 'Unauthorized access to delivery information' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      deliveryStrategy: summary.groupOrder.deliveryStrategy,
      schedules: summary.deliverySchedules,
      totalSchedules: summary.deliverySchedules.length,
    });
    
  } catch (error) {
    console.error('Error fetching delivery schedules:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

