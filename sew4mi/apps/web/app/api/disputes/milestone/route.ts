/**
 * API endpoint for creating milestone disputes
 * POST /api/disputes/milestone
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
// MilestoneDisputeRequest type available but not used in this implementation

/**
 * Dispute request validation schema
 */
const disputeRequestSchema = z.object({
  milestoneId: z.string().uuid(),
  orderId: z.string().uuid(),
  reason: z.string().min(10).max(1000),
  evidence: z.string().max(2000).optional(),
  evidenceUrls: z.array(z.string().url()).max(5).optional()
});

/**
 * Rate limiting map (in production, use Redis or database)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiter for dispute creation
 */
function checkDisputeRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 3; // Max 3 disputes per hour

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
 * POST handler - Create milestone dispute
 */
export async function POST(_request: NextRequest) {
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

    // Rate limiting for dispute creation
    if (!checkDisputeRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many dispute requests. Please wait before creating another dispute.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = disputeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { milestoneId, orderId, reason, evidence, evidenceUrls } = validationResult.data;

    // Verify milestone exists and user has access
    const { data: milestone, error: milestoneError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        milestone,
        approval_status
      `)
      .eq('id', milestoneId)
      .eq('order_id', orderId)
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
      .select('customer_id, tailor_id, status')
      .eq('id', orderId)
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

    // Check if milestone can be disputed (typically only rejected milestones)
    if (milestone.approval_status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Only rejected milestones can be disputed' },
        { status: 409 }
      );
    }

    // Check if dispute already exists for this milestone
    const { data: existingDisputes, error: existingDisputeError } = await supabase
      .from('milestone_disputes')
      .select('id')
      .eq('milestone_id', milestoneId)
      .eq('status', 'OPEN');

    if (existingDisputeError) {
      console.error('Error checking existing disputes:', existingDisputeError);
      // Continue execution as this is not a critical error
    }

    if (existingDisputes && existingDisputes.length > 0) {
      return NextResponse.json(
        { error: 'An active dispute already exists for this milestone' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Create dispute record
    const { data: dispute, error: disputeError } = await supabase
      .from('milestone_disputes')
      .insert({
        milestone_id: milestoneId,
        order_id: orderId,
        created_by: user.id,
        reason: reason,
        evidence: evidence || null,
        evidence_urls: evidenceUrls || null,
        status: 'OPEN',
        priority: 'MEDIUM',
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (disputeError) {
      throw disputeError;
    }

    // Create dispute activity log
    const { error: activityError } = await supabase
      .from('dispute_activities')
      .insert({
        dispute_id: dispute.id,
        user_id: user.id,
        action: 'CREATED',
        description: 'Dispute created for rejected milestone',
        created_at: now
      });

    if (activityError) {
      // Log error but don't fail the dispute creation
      console.error('Failed to create dispute activity log:', activityError);
    }

    // Notify admin and other party about new dispute
    try {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: order.tailor_id,
            type: 'MILESTONE_DISPUTE_CREATED',
            title: 'Milestone Dispute Created',
            message: `A dispute has been created for a milestone in order ${orderId}`,
            data: {
              disputeId: dispute.id,
              milestoneId: milestoneId,
              orderId: orderId
            },
            created_at: now
          }
        ]);

      if (notificationError) {
        console.error('Failed to create dispute notification:', notificationError);
      }
    } catch (notificationError) {
      console.error('Error creating dispute notification:', notificationError);
    }

    // Update milestone status to indicate dispute
    const { error: milestoneUpdateError } = await supabase
      .from('order_milestones')
      .update({
        updated_at: now
      })
      .eq('id', milestoneId);

    if (milestoneUpdateError) {
      console.error('Failed to update milestone after dispute creation:', milestoneUpdateError);
    }

    return NextResponse.json({
      success: true,
      disputeId: dispute.id,
      status: dispute.status,
      createdAt: dispute.created_at,
      message: 'Dispute created successfully. An admin will review your case within 24 hours.'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating milestone dispute:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Get dispute status for a milestone
 */
export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const milestoneId = searchParams.get('milestoneId');

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Milestone ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get dispute for milestone
    const { data: dispute, error: disputeError } = await supabase
      .from('milestone_disputes')
      .select(`
        id,
        milestone_id,
        order_id,
        status,
        priority,
        reason,
        resolution,
        created_at,
        resolved_at
      `)
      .eq('milestone_id', milestoneId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (disputeError) {
      return NextResponse.json(
        { error: 'No dispute found for this milestone' },
        { status: 404 }
      );
    }

    // Get order details to check access
    const { data: disputeOrder, error: disputeOrderError } = await supabase
      .from('orders')
      .select('customer_id, tailor_id')
      .eq('id', dispute.order_id)
      .single();

    if (disputeOrderError || !disputeOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this dispute
    if (disputeOrder.customer_id !== user.id && disputeOrder.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - not your dispute' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      disputeId: dispute.id,
      milestoneId: dispute.milestone_id,
      orderId: dispute.order_id,
      status: dispute.status,
      priority: dispute.priority,
      reason: dispute.reason,
      resolution: dispute.resolution,
      createdAt: dispute.created_at,
      resolvedAt: dispute.resolved_at
    });

  } catch (error) {
    console.error('Error fetching dispute status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}