/**
 * API endpoint for milestone approval/rejection
 * POST /api/milestones/[id]/approve
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';
import { MilestoneApprovalAction, MilestoneApprovalStatus } from '@sew4mi/shared/types';

/**
 * Request validation schema
 */
const approvalRequestSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(500).optional()
});

/**
 * Rate limiting map (in production, use Redis or database)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiter
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  const current = rateLimitMap.get(identifier);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * GET handler - Get milestone approval status
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

    // Get milestone details
    const { data: milestone, error: milestoneError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        milestone,
        approval_status,
        customer_reviewed_at,
        auto_approval_deadline,
        rejection_reason
      `)
      .eq('id', (await params).id)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Get order details to check access
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', milestone.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is the customer for this order
    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - not your order' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: milestone.id,
      orderId: milestone.order_id,
      approvalStatus: milestone.approval_status,
      customerReviewedAt: milestone.customer_reviewed_at,
      autoApprovalDeadline: milestone.auto_approval_deadline,
      rejectionReason: milestone.rejection_reason
    });

  } catch (error) {
    console.error('Error fetching milestone approval status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Submit milestone approval/rejection
 */
export async function POST(
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

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = approvalRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { action, comment } = validationResult.data;

    // Get milestone details with order information
    const { data: milestone, error: milestoneError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        milestone,
        approval_status,
        auto_approval_deadline
      `)
      .eq('id', (await params).id)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    // Get order details to check access
    const { data: postOrder, error: postOrderError } = await supabase
      .from('orders')
      .select('customer_id, status')
      .eq('id', milestone.order_id)
      .single();

    if (postOrderError || !postOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is the customer for this order
    if (postOrder.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - not your order' },
        { status: 403 }
      );
    }

    // Check if milestone is still pending
    if (milestone.approval_status !== MilestoneApprovalStatus.PENDING) {
      return NextResponse.json(
        { error: 'Milestone already reviewed' },
        { status: 409 }
      );
    }

    // Check if auto-approval deadline has passed
    if (new Date() > new Date(milestone.auto_approval_deadline)) {
      return NextResponse.json(
        { error: 'Auto-approval deadline has passed' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    let paymentTriggered = false;

    // Start transaction
    const { error: updateError } = await supabase
      .from('order_milestones')
      .update({
        approval_status: action === 'APPROVED' ? MilestoneApprovalStatus.APPROVED : MilestoneApprovalStatus.REJECTED,
        customer_reviewed_at: now,
        rejection_reason: action === 'REJECTED' ? comment : null,
        updated_at: now
      })
      .eq('id', (await params).id);

    if (updateError) {
      throw updateError;
    }

    // Create approval audit record
    const { error: auditError } = await supabase
      .from('milestone_approvals')
      .insert({
        milestone_id: (await params).id,
        order_id: milestone.order_id,
        customer_id: user.id,
        action: action as MilestoneApprovalAction,
        comment: comment || null,
        reviewed_at: now
      });

    if (auditError) {
      throw auditError;
    }

    // If approved, trigger payment release
    if (action === 'APPROVED') {
      try {
        // Call escrow service to release payment for this milestone
        const escrowResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/escrow/release-milestone-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.id}` // Internal service auth
          },
          body: JSON.stringify({
            orderId: milestone.order_id,
            milestoneId: (await params).id
          })
        });

        if (escrowResponse.ok) {
          paymentTriggered = true;
        } else {
          // Log error but don't fail the approval
          console.error('Failed to trigger milestone payment release:', await escrowResponse.text());
        }
      } catch (escrowError) {
        // Log error but don't fail the approval
        console.error('Error calling escrow service:', escrowError);
      }
    }

    // Send real-time update notification
    try {
      await supabase
        .from('milestone_approvals')
        .insert({
          milestone_id: (await params).id,
          order_id: milestone.order_id,
          customer_id: user.id,
          action: `NOTIFICATION_${action}` as any, // Custom notification action
          comment: `Milestone ${action.toLowerCase()} by customer`,
          reviewed_at: now
        });
    } catch (notificationError) {
      // Log error but don't fail the approval
      console.error('Failed to send real-time notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      approvalStatus: action === 'APPROVED' ? MilestoneApprovalStatus.APPROVED : MilestoneApprovalStatus.REJECTED,
      reviewedAt: now,
      paymentTriggered
    });

  } catch (error) {
    console.error('Error processing milestone approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}