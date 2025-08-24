/**
 * API endpoint for sending milestone approval reminder notifications
 * GET /api/cron/notification-reminders
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { MilestoneApprovalStatus } from '@sew4mi/shared/types';

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
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === cronSecret;
}

/**
 * Gets milestone stage display name
 */
function getMilestoneDisplayName(stage: string): string {
  const stageNames: Record<string, string> = {
    'FABRIC_SELECTED': 'Fabric Selected',
    'CUTTING_STARTED': 'Cutting Started',
    'INITIAL_ASSEMBLY': 'Initial Assembly',
    'FITTING_READY': 'Fitting Ready',
    'ADJUSTMENTS_COMPLETE': 'Adjustments Complete',
    'FINAL_PRESSING': 'Final Pressing',
    'READY_FOR_DELIVERY': 'Ready for Delivery'
  };
  return stageNames[stage] || stage;
}

/**
 * Sends reminder notification
 */
async function sendReminderNotification(
  supabase: any,
  milestone: any,
  urgencyLevel: 'first' | 'final'
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const hoursLeft = Math.floor(
      (new Date(milestone.auto_approval_deadline).getTime() - Date.now()) / (1000 * 60 * 60)
    );
    
    const title = urgencyLevel === 'final' 
      ? 'Final Reminder: Milestone Auto-Approval Soon'
      : 'Reminder: Milestone Pending Your Review';
      
    const message = urgencyLevel === 'final'
      ? `URGENT: Milestone "${getMilestoneDisplayName(milestone.milestone)}" will be auto-approved in ${hoursLeft} hours. Please review now to avoid automatic approval.`
      : `Milestone "${getMilestoneDisplayName(milestone.milestone)}" is waiting for your review. It will be auto-approved in ${hoursLeft} hours if no action is taken.`;

    // Create in-app notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: milestone.orders.customer_id,
        type: urgencyLevel === 'final' ? 'MILESTONE_FINAL_REMINDER' : 'MILESTONE_REMINDER',
        title,
        message,
        data: {
          milestoneId: milestone.id,
          orderId: milestone.order_id,
          milestone: milestone.milestone,
          deadlineHours: hoursLeft,
          urgencyLevel
        },
        created_at: now
      });

    if (notificationError) {
      console.error('Failed to create reminder notification:', notificationError);
      return;
    }

    // In a real implementation, you would also:
    // 1. Send email notification
    // 2. Send WhatsApp message via WhatsApp Business API
    // 3. Send SMS if enabled
    
    console.log(`Sent ${urgencyLevel} reminder for milestone ${milestone.id} to customer ${milestone.orders.customer_id}`);

  } catch (error) {
    console.error('Error sending reminder notification:', error);
  }
}

/**
 * GET handler - Send reminder notifications for pending milestones
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
    
    console.log('Starting milestone reminder notification job...');

    const now = new Date();
    const firstReminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const finalReminderTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);  // 6 hours from now

    // Get milestones needing first reminder (24 hours before deadline)
    const { data: firstReminderMilestones, error: firstReminderError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        milestone,
        auto_approval_deadline,
        orders!inner(customer_id, status)
      `)
      .eq('approval_status', MilestoneApprovalStatus.PENDING)
      .gte('auto_approval_deadline', now.toISOString())
      .lte('auto_approval_deadline', firstReminderTime.toISOString())
      // Avoid sending duplicate reminders by checking if reminder was already sent
      .not('id', 'in', `(
        SELECT milestone_id FROM milestone_notifications 
        WHERE notification_type = 'first_reminder' 
        AND sent_at > '${new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()}'
      )`);

    if (firstReminderError) {
      console.error('Error fetching first reminder milestones:', firstReminderError);
    }

    // Get milestones needing final reminder (6 hours before deadline)
    const { data: finalReminderMilestones, error: finalReminderError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        order_id,
        milestone,
        auto_approval_deadline,
        orders!inner(customer_id, status)
      `)
      .eq('approval_status', MilestoneApprovalStatus.PENDING)
      .gte('auto_approval_deadline', now.toISOString())
      .lte('auto_approval_deadline', finalReminderTime.toISOString())
      // Avoid sending duplicate final reminders
      .not('id', 'in', `(
        SELECT milestone_id FROM milestone_notifications 
        WHERE notification_type = 'final_reminder' 
        AND sent_at > '${new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString()}'
      )`);

    if (finalReminderError) {
      console.error('Error fetching final reminder milestones:', finalReminderError);
    }

    let firstRemindersSent = 0;
    let finalRemindersSent = 0;
    const errors: string[] = [];

    // Send first reminders (24-hour warnings)
    if (firstReminderMilestones && firstReminderMilestones.length > 0) {
      console.log(`Sending first reminders for ${firstReminderMilestones.length} milestones`);
      
      for (const milestone of firstReminderMilestones) {
        try {
          await sendReminderNotification(supabase, milestone, 'first');
          
          // Track that we sent this reminder
          await supabase.from('milestone_notifications').insert({
            milestone_id: milestone.id,
            notification_type: 'first_reminder',
            sent_at: now.toISOString()
          });
          
          firstRemindersSent++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`First reminder for milestone ${milestone.id}: ${errorMessage}`);
        }
      }
    }

    // Send final reminders (6-hour warnings)
    if (finalReminderMilestones && finalReminderMilestones.length > 0) {
      console.log(`Sending final reminders for ${finalReminderMilestones.length} milestones`);
      
      for (const milestone of finalReminderMilestones) {
        try {
          await sendReminderNotification(supabase, milestone, 'final');
          
          // Track that we sent this reminder
          await supabase.from('milestone_notifications').insert({
            milestone_id: milestone.id,
            notification_type: 'final_reminder',
            sent_at: now.toISOString()
          });
          
          finalRemindersSent++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Final reminder for milestone ${milestone.id}: ${errorMessage}`);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    
    console.log(`Reminder notification job completed:`, {
      firstRemindersSent,
      finalRemindersSent,
      errors: errors.length,
      executionTimeMs: executionTime
    });

    if (errors.length > 0) {
      console.error('Reminder notification errors:', errors);
    }

    return NextResponse.json({
      success: true,
      firstRemindersSent,
      finalRemindersSent,
      errors: errors.length,
      errorDetails: errors,
      executionTimeMs: executionTime,
      message: `Sent ${firstRemindersSent} first reminders and ${finalRemindersSent} final reminders`
    });

  } catch (error) {
    console.error('Error in reminder notification job:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}