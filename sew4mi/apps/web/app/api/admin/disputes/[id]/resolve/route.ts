/**
 * API endpoint for dispute resolution
 * POST /api/admin/disputes/[id]/resolve
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  resolveDisputeRequestSchema,
  DisputeResolutionType,
  DisputeStatus
} from '@sew4mi/shared';

/**
 * POST handler - Resolve dispute with payment adjustments
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = resolveDisputeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { resolutionType, outcome, refundAmount, reasonCode, adminNotes } = validationResult.data;

    // Get dispute details with order information
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(`
        *,
        orders!inner (
          id,
          total_amount,
          customer_id,
          tailor_id,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Check if dispute is already resolved
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      return NextResponse.json(
        { error: 'Dispute is already resolved' },
        { status: 409 }
      );
    }

    // Validate refund amount if required
    if ([DisputeResolutionType.FULL_REFUND, DisputeResolutionType.PARTIAL_REFUND].includes(resolutionType)) {
      if (!refundAmount || refundAmount <= 0) {
        return NextResponse.json(
          { error: 'Refund amount is required for refund resolutions' },
          { status: 400 }
        );
      }
      if (refundAmount > dispute.orders.total_amount) {
        return NextResponse.json(
          { error: 'Refund amount cannot exceed order amount' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    // Start transaction
    const { data: _, error: resolveError } = await supabase
      .rpc('resolve_dispute_with_payment', {
        p_dispute_id: id,
        p_admin_id: user.id,
        p_resolution_type: resolutionType,
        p_outcome: outcome,
        p_refund_amount: refundAmount || null,
        p_reason_code: reasonCode,
        p_admin_notes: adminNotes || null,
        p_resolved_at: now
      });

    if (resolveError) {
      console.error('Error resolving dispute:', resolveError);
      return NextResponse.json(
        { 
          error: 'Failed to resolve dispute',
          message: resolveError.message
        },
        { status: 500 }
      );
    }

    // Create activity log
    const { error: activityError } = await supabase
      .from('dispute_activities')
      .insert({
        dispute_id: id,
        user_id: user.id,
        action: 'RESOLVED',
        description: `Dispute resolved: ${resolutionType}${refundAmount ? ` - GH₵${refundAmount} refund` : ''}`,
        created_at: now
      });

    if (activityError) {
      console.error('Failed to create resolution activity log:', activityError);
    }

    // Send notifications to all participants
    try {
      const participantIds = [
        dispute.orders.customer_id,
        dispute.orders.tailor_id
      ].filter(Boolean);

      const notifications = participantIds.map(participantId => ({
        user_id: participantId,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved',
        message: `Your dispute "${dispute.title}" has been resolved by our support team.`,
        data: {
          disputeId: id,
          resolutionType,
          refundAmount: refundAmount || null,
          resolvedBy: user.id
        },
        created_at: now
      }));

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Failed to create resolution notifications:', notificationError);
        }
      }
    } catch (notificationError) {
      console.error('Error creating resolution notifications:', notificationError);
    }

    // Send email notifications (would integrate with email service)
    try {
      // TODO: Integrate with email service to notify participants
      console.log(`Dispute ${id} resolved by admin ${user.id}`);
    } catch (emailError) {
      console.error('Error sending resolution emails:', emailError);
    }

    return NextResponse.json({
      success: true,
      dispute: {
        id: id,
        status: DisputeStatus.RESOLVED,
        resolutionType,
        outcome,
        refundAmount,
        resolvedAt: now,
        resolvedBy: user.id
      }
    });

  } catch (error) {
    console.error('Error resolving dispute:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}