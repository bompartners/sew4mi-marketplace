/**
 * Individual Order API Routes
 * GET /api/orders/[id] - Get order details with progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OrderStatus } from '@sew4mi/shared/types/order-creation';

/**
 * GET /api/orders/[id]
 * Get detailed order information with progress data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the requesting user matches the authenticated user
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch order details with related data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:users!customer_id(id, full_name, phone_number, email),
        tailor_profile:tailor_profiles!tailor_id(id, business_name, user_id, location),
        measurements:measurement_profiles(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this order (customer or tailor)
    // Note: tailor_id in orders table is the tailor_profile id, not the user id
    const tailorUserId = order.tailor_profile?.user_id;
    if (order.customer_id !== userId && tailorUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this order' },
        { status: 403 }
      );
    }

    // Fetch milestones if order is in progress or completed
    let milestones = [];
    if (order.status !== 'DRAFT' && order.status !== 'CANCELLED') {
      const { data: milestonesData } = await supabase
        .from('order_milestones')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      milestones = milestonesData || [];
    }

    // Calculate progress
    const completedMilestones = milestones.filter(m => m.milestone_status === 'completed').length;
    const totalMilestones = milestones.length || 5; // Default to 5 stages if no milestones
    const progressPercentage = Math.round((completedMilestones / totalMilestones) * 100);

    // Transform order data to match OrderWithProgress type
    const orderWithProgress = {
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      customerName: order.customer?.full_name || 'Customer',
      customerPhone: order.customer?.phone_number,
      customerAvatar: null,
      customerLocation: null,
      tailorId: order.tailor_id,
      tailorName: order.tailor_profile?.business_name || 'Tailor',
      tailorPhone: null,
      tailorAvatar: null,
      tailorLocation: order.tailor_profile?.location,
      garmentType: order.garment_type,
      garmentCategory: 'Custom',
      size: 'Custom',
      fabric: order.fabric_choice || 'Custom fabric',
      specialInstructions: order.special_instructions,
      status: order.status,
      currentStatus: order.status, // Add currentStatus for OrderProgressTimeline
      basePrice: parseFloat(order.total_amount) || 0,
      customizationFee: 0,
      rushOrderFee: order.rush_fee ? parseFloat(order.rush_fee) : 0,
      totalPrice: parseFloat(order.total_amount) || 0,
      createdAt: order.created_at,
      estimatedStartDate: order.accepted_at,
      estimatedCompletionDate: order.delivery_date,
      estimatedCompletion: order.delivery_date ? new Date(order.delivery_date) : undefined,
      actualCompletionDate: order.completed_at,
      progressPercentage,
      milestones: milestones.map(m => ({
        id: m.id,
        stage: m.milestone_type,
        name: m.milestone_type,
        description: '',
        status: m.milestone_status,
        completedAt: m.completed_at || null,
        photos: [],
        notes: ''
      })),
      currentMilestone: milestones.find(m => m.milestone_status !== 'completed')?.milestone_type || null
    };

    return NextResponse.json(
      { 
        order: orderWithProgress,
        success: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

