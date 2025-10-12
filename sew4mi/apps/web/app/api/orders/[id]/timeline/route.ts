import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { 
  OrderTimelineResponse,
  OrderStatus 
} from '@sew4mi/shared/types';
import { calculateOrderProgress } from '@sew4mi/shared/utils/order-progress';

/**
 * GET /api/orders/[id]/timeline
 * Gets complete order timeline with milestones and progress information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
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

    // Get order with basic information
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        tailor_id,
        status,
        total_amount,
        estimated_delivery,
        created_at,
        updated_at
      `)
      .eq('id', validatedOrderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, errors: ['Order not found'] },
        { status: 404 }
      );
    }

    // Verify user has access to this order
    const isCustomer = order.customer_id === user.id;
    const isTailor = order.tailor_id === user.id;
    
    if (!isCustomer && !isTailor) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized access to order'] },
        { status: 403 }
      );
    }

    // Get order milestones with photos and details
    const { data: milestones, error: milestonesError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        stage,
        status,
        amount,
        photo_url,
        notes,
        required_action,
        approved_by,
        approved_at,
        submitted_at,
        created_at,
        updated_at
      `)
      .eq('order_id', validatedOrderId)
      .order('created_at', { ascending: true });

    if (milestonesError) {
      console.error('Milestones fetch error:', milestonesError);
      return NextResponse.json(
        { success: false, errors: ['Failed to fetch milestones'] },
        { status: 500 }
      );
    }

    // Calculate progress using utility function
    const progressData = calculateOrderProgress(order.status as OrderStatus, milestones || []);

    // Determine next milestone
    const nextMilestone = milestones?.find(m => m.status === 'PENDING' || m.status === 'IN_PROGRESS');

    const response: OrderTimelineResponse = {
      orderId: validatedOrderId,
      currentStatus: order.status as OrderStatus,
      progressPercentage: progressData.progressPercentage,
      estimatedCompletion: order.estimated_delivery ? new Date(order.estimated_delivery) : undefined,
      milestones: milestones || [],
      nextMilestone: nextMilestone ? {
        type: nextMilestone.stage,
        estimatedDate: undefined, // Would calculate based on milestone timeline
        description: `Next step: ${nextMilestone.required_action?.replace('_', ' ').toLowerCase()}`
      } : undefined,
      daysRemaining: order.estimated_delivery ? 
        Math.ceil((new Date(order.estimated_delivery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
        undefined
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: ['Invalid order ID format'] },
        { status: 400 }
      );
    }

    console.error('Timeline fetch error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}