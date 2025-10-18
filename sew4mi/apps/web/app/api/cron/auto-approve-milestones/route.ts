/**
 * API endpoint for auto-approval cron job
 * GET /api/cron/auto-approve-milestones
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AutoApprovalResult, MilestoneApprovalAction, MilestoneApprovalStatus } from '@sew4mi/shared/types';

/**
 * Validates cron job authorization
 */
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not configured');
    return false;
  }
  
  // Check for Bearer token format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  return token === cronSecret;
}

/**
 * Sends notification for auto-approved milestone
 */
async function notifyAutoApproval(
  supabase: any,
  milestoneId: string,
  orderId: string,
  customerId: string,
  tailorId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Create notifications for both customer and tailor
    const notifications = [
      {
        user_id: customerId,
        type: 'MILESTONE_AUTO_APPROVED',
        title: 'Milestone Auto-Approved',
        message: 'A milestone has been automatically approved after 48 hours without response.',
        data: {
          milestoneId,
          orderId,
          action: 'auto_approved'
        },
        created_at: now
      },
      {
        user_id: tailorId,
        type: 'MILESTONE_AUTO_APPROVED',
        title: 'Milestone Auto-Approved',
        message: 'Your milestone has been automatically approved and payment released.',
        data: {
          milestoneId,
          orderId,
          action: 'auto_approved'
        },
        created_at: now
      }
    ];

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Failed to create auto-approval notifications:', error);
    }
  } catch (error) {
    console.error('Error creating auto-approval notifications:', error);
  }
}

/**
 * Triggers escrow payment release for auto-approved milestone
 */
async function triggerEscrowRelease(
  milestoneId: string,
  orderId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/escrow/release-milestone-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}` // Internal service auth
      },
      body: JSON.stringify({
        orderId,
        milestoneId,
        reason: 'auto_approval'
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering escrow release:', error);
    return false;
  }
}

/**
 * GET handler - Process auto-approvals for milestones past deadline
 */
export async function GET(_request: NextRequest) {
  try {
    // Validate cron job authorization
    if (!validateCronAuth(_request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServiceRoleClient();
    const startTime = Date.now();
    
    console.log('Starting auto-approval cron job...');

    // Get all pending milestones past their auto-approval deadline
    const { data: pendingMilestones, error: fetchError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        milestone,
        auto_approval_deadline,
        orders!inner(customer_id, tailor_id, status)
      `)
      .eq('approval_status', MilestoneApprovalStatus.PENDING)
      .lt('auto_approval_deadline', new Date().toISOString())
      .order('auto_approval_deadline', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    const result: AutoApprovalResult = {
      processed: 0,
      autoApproved: 0,
      failed: 0,
      approvedMilestoneIds: [],
      errors: []
    };

    if (!pendingMilestones || pendingMilestones.length === 0) {
      console.log('No milestones found for auto-approval');
      return NextResponse.json({
        ...result,
        message: 'No milestones found for auto-approval',
        executionTimeMs: Date.now() - startTime
      });
    }

    console.log(`Found ${pendingMilestones.length} milestones for auto-approval`);

    // Process each milestone
    for (const milestone of pendingMilestones) {
      result.processed++;
      
      try {
        // const now = new Date().toISOString(); // Unused for now but may be needed for logging
        
        // Use database function for atomic operation
        const { error: approvalError } = await supabase
          .rpc('approve_milestone', {
            p_milestone_id: milestone.id,
            p_customer_id: milestone.orders[0].customer_id,
            p_action: MilestoneApprovalAction.AUTO_APPROVED,
            p_comment: 'Automatically approved after 48-hour deadline'
          });

        if (approvalError) {
          throw approvalError;
        }

        // Trigger payment release
        const paymentReleased = await triggerEscrowRelease(
          milestone.id,
          milestone.order_id
        );

        if (!paymentReleased) {
          console.warn(`Payment release failed for milestone ${milestone.id}`);
        }

        // Send notifications
        await notifyAutoApproval(
          supabase,
          milestone.id,
          milestone.order_id,
          milestone.orders[0].customer_id,
          milestone.orders[0].tailor_id
        );

        result.autoApproved++;
        result.approvedMilestoneIds.push(milestone.id);
        
        console.log(`Auto-approved milestone ${milestone.id} for order ${milestone.order_id}`);

      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Milestone ${milestone.id}: ${errorMessage}`);
        
        console.error(`Failed to auto-approve milestone ${milestone.id}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;
    
    console.log(`Auto-approval cron job completed:`, {
      processed: result.processed,
      autoApproved: result.autoApproved,
      failed: result.failed,
      executionTimeMs: executionTime
    });

    // Log significant failures
    if (result.failed > 0) {
      console.error('Auto-approval failures:', result.errors);
    }

    return NextResponse.json({
      success: true,
      ...result,
      executionTimeMs: executionTime,
      message: `Processed ${result.processed} milestones, auto-approved ${result.autoApproved}, failed ${result.failed}`
    });

  } catch (error) {
    console.error('Error in auto-approval cron job:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Manual trigger for testing (development only)
 */
export async function POST(_request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Manual trigger not allowed in production' },
      { status: 403 }
    );
  }

  // Use the same logic as GET but with different auth check
  const authHeader = _request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return GET(_request);
}