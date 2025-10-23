import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { orderStatusService } from '@/lib/services/order-status.service';
import { notificationService, NotificationType } from '@/lib/services/notification.service';

/**
 * Schema for milestone upload request
 */
const MilestoneUploadSchema = z.object({
  milestone: z.enum([
    'FABRIC_SELECTED',
    'CUTTING_STARTED',
    'SEWING_IN_PROGRESS',
    'FITTING_READY',
    'ADJUSTMENTS_COMPLETE',
    'FINAL_INSPECTION',
    'READY_FOR_DELIVERY'
  ]),
  photoUrls: z.array(z.string().url()).min(1).max(5),
  notes: z.string().optional(),
  requestFitting: z.boolean().optional()
});

/**
 * POST /api/orders/[id]/milestone/upload
 * Upload milestone photos for an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const orderId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = MilestoneUploadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request data',
          errors: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { milestone, photoUrls, notes, requestFitting } = validationResult.data;

    // Get order and verify tailor ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        tailor:tailor_profiles!inner(user_id),
        customer:profiles!orders_customer_id_fkey(
          id,
          full_name,
          email,
          phone_number
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify the user is the tailor for this order
    if (order.tailor.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - not the assigned tailor' },
        { status: 403 }
      );
    }

    // Validate order status allows milestone uploads
    const validStatuses = ['DEPOSIT_PAID', 'ACCEPTED', 'MEASUREMENT_CONFIRMED', 'FABRIC_SOURCED', 
                          'CUTTING_STARTED', 'SEWING_IN_PROGRESS', 'FITTING_SCHEDULED', 
                          'FITTING_COMPLETED', 'ADJUSTMENTS_IN_PROGRESS', 'FINAL_INSPECTION'];
    if (!validStatuses.includes(order.status)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Cannot upload milestones in status: ${order.status}` 
        },
        { status: 400 }
      );
    }

    // Check if milestone already exists
    const { data: existingMilestone } = await supabase
      .from('order_milestones')
      .select('id')
      .eq('order_id', orderId)
      .eq('stage', milestone)
      .single();

    let milestoneId;

    if (existingMilestone) {
      // Update existing milestone
      const { data: updatedMilestone, error: updateError } = await supabase
        .from('order_milestones')
        .update({
          photo_urls: photoUrls,
          notes: notes || null,
          updated_at: new Date().toISOString(),
          status: 'SUBMITTED'
        })
        .eq('id', existingMilestone.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update milestone:', updateError);
        return NextResponse.json(
          { success: false, message: 'Failed to update milestone' },
          { status: 500 }
        );
      }

      milestoneId = updatedMilestone.id;
    } else {
      // Create new milestone
      const { data: newMilestone, error: createError } = await supabase
        .from('order_milestones')
        .insert({
          order_id: orderId,
          stage: milestone,
          photo_urls: photoUrls,
          notes: notes || null,
          status: 'SUBMITTED',
          submitted_by: user.id,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create milestone:', createError);
        return NextResponse.json(
          { success: false, message: 'Failed to create milestone' },
          { status: 500 }
        );
      }

      milestoneId = newMilestone.id;
    }

    // Handle status transitions based on milestone
    let statusUpdateResult = null;
    
    if (milestone === 'FITTING_READY' && requestFitting && order.status === 'SEWING_IN_PROGRESS') {
      // Transition to FITTING_SCHEDULED status
      statusUpdateResult = await orderStatusService.transitionOrder(
        {
          orderId,
          currentStatus: order.status,
          triggeredBy: 'tailor',
          metadata: { milestone, milestoneId }
        },
        'onFittingScheduled'
      );
    } else if (milestone === 'READY_FOR_DELIVERY' && order.status === 'FINAL_INSPECTION') {
      // Transition to READY_FOR_DELIVERY status
      statusUpdateResult = await orderStatusService.transitionOrder(
        {
          orderId,
          currentStatus: order.status,
          triggeredBy: 'tailor',
          metadata: { milestone, milestoneId }
        },
        'onReadyForDelivery'
      );
    }

    // Send notification to customer about new milestone
    await notificationService.sendNotification({
      userId: order.customer_id,
      type: NotificationType.MILESTONE_UPDATE,
      title: 'New Progress Update! 📸',
      message: `Your tailor has uploaded ${photoUrls.length} new photo${photoUrls.length > 1 ? 's' : ''} for "${milestone.replace(/_/g, ' ').toLowerCase()}" stage.`,
      data: {
        orderId,
        orderNumber: order.order_number,
        milestone,
        photoCount: photoUrls.length,
        milestoneId
      },
      channels: ['in-app', 'whatsapp'],
      priority: milestone === 'FITTING_READY' ? 'high' : 'normal'
    });

    // Special notification for fitting ready
    if (milestone === 'FITTING_READY' && requestFitting) {
      await notificationService.sendNotification({
        userId: order.customer_id,
        type: NotificationType.FITTING_REMINDER,
        title: 'Fitting Photos Ready for Review! 👔',
        message: `Please review the fitting photos for order #${order.order_number} and approve to continue. Your approval will release the next payment.`,
        data: {
          orderId,
          orderNumber: order.order_number,
          milestoneId
        },
        channels: ['in-app', 'whatsapp', 'email'],
        priority: 'high'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone uploaded successfully',
      data: {
        milestoneId,
        milestone,
        photoCount: photoUrls.length,
        statusUpdated: statusUpdateResult?.success || false,
        newStatus: statusUpdateResult?.newStatus
      }
    });

  } catch (error) {
    console.error('Milestone upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[id]/milestone/upload
 * Get all milestones for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const orderId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get order to verify access
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, tailor_profiles!inner(user_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify user is either customer or tailor
    const isTailor = order.tailor_profiles.user_id === user.id;
    const isCustomer = order.customer_id === user.id;

    if (!isTailor && !isCustomer) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all milestones for the order
    const { data: milestones, error: milestonesError } = await supabase
      .from('order_milestones')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (milestonesError) {
      console.error('Failed to fetch milestones:', milestonesError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch milestones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: milestones || []
    });

  } catch (error) {
    console.error('Milestone fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
