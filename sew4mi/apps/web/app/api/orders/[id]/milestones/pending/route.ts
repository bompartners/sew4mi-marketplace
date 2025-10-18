/**
 * API endpoint for fetching pending milestone approvals for an order
 * GET /api/orders/[id]/milestones/pending
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MilestoneApprovalStatus } from '@sew4mi/shared/types';

/**
 * GET handler - Get pending milestone approvals for an order
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get order details and verify user access
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id, status')
      .eq('id', (await params).id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this order (customer or tailor)
    if (order.customer_id !== user.id && order.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - not your order' },
        { status: 403 }
      );
    }

    // Get pending milestone approvals
    const { data: pendingMilestones, error: milestonesError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        milestone,
        photo_url,
        notes,
        verified_at,
        verified_by,
        approval_status,
        customer_reviewed_at,
        auto_approval_deadline,
        rejection_reason,
        created_at,
        updated_at
      `)
      .eq('order_id', (await params).id)
      .eq('approval_status', MilestoneApprovalStatus.PENDING)
      .order('created_at', { ascending: true });

    if (milestonesError) {
      throw milestonesError;
    }

    // Transform data to match interface
    const transformedMilestones = pendingMilestones?.map(milestone => ({
      id: milestone.id,
      orderId: milestone.order_id,
      milestone: milestone.milestone,
      photoUrl: milestone.photo_url,
      notes: milestone.notes,
      verifiedAt: new Date(milestone.verified_at),
      verifiedBy: milestone.verified_by,
      approvalStatus: milestone.approval_status,
      customerReviewedAt: milestone.customer_reviewed_at ? new Date(milestone.customer_reviewed_at) : undefined,
      autoApprovalDeadline: new Date(milestone.auto_approval_deadline),
      rejectionReason: milestone.rejection_reason,
      createdAt: new Date(milestone.created_at),
      updatedAt: new Date(milestone.updated_at)
    })) || [];

    // Calculate urgency for each milestone
    const now = new Date();
    const milestonesWithUrgency = transformedMilestones.map(milestone => {
      const timeLeft = milestone.autoApprovalDeadline.getTime() - now.getTime();
      const hoursLeft = timeLeft / (1000 * 60 * 60);
      
      return {
        ...milestone,
        urgency: hoursLeft <= 6 ? 'high' : hoursLeft <= 24 ? 'medium' : 'low',
        hoursUntilAutoApproval: Math.max(0, Math.floor(hoursLeft))
      };
    });

    return NextResponse.json({
      orderId: (await params).id,
      pendingMilestones: milestonesWithUrgency,
      count: milestonesWithUrgency.length,
      hasUrgent: milestonesWithUrgency.some(m => m.urgency === 'high')
    });

  } catch (error) {
    console.error('Error fetching pending milestone approvals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}