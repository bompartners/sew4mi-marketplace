/**
 * API endpoint for monitoring auto-approval system health
 * GET /api/admin/auto-approval-health
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MilestoneApprovalStatus } from '@sew4mi/shared/types';

// Admin validation function (unused - keeping for future implementation)

/**
 * GET handler - Get auto-approval system health metrics
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = (await createServiceRoleClient()) as SupabaseClient;
    
    // Simple admin validation - in production, use proper JWT validation
    const adminApiKey = _request.headers.get('x-admin-api-key');
    if (!adminApiKey || adminApiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      );
    }

    // Generating auto-approval system health report

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get pending milestones approaching deadline
    const { data: pendingMilestones, error: pendingError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        milestone,
        auto_approval_deadline,
        verified_at,
        orders!inner(id, customer_id)
      `)
      .eq('approval_status', MilestoneApprovalStatus.PENDING)
      .gte('auto_approval_deadline', now.toISOString())
      .order('auto_approval_deadline', { ascending: true });

    if (pendingError) {
      throw pendingError;
    }

    // Get overdue milestones (past deadline but not auto-approved)
    const { data: overdueMilestones, error: overdueError } = await supabase
      .from('order_milestones')
      .select(`
        id,
        milestone,
        auto_approval_deadline,
        verified_at
      `)
      .eq('approval_status', MilestoneApprovalStatus.PENDING)
      .lt('auto_approval_deadline', now.toISOString());

    if (overdueError) {
      throw overdueError;
    }

    // Get auto-approval statistics for last 24 hours
    const { data: recentAutoApprovals, error: autoApprovalError } = await supabase
      .from('milestone_approvals')
      .select('milestone_id, reviewed_at')
      .eq('action', 'AUTO_APPROVED')
      .gte('reviewed_at', last24Hours.toISOString());

    if (autoApprovalError) {
      throw autoApprovalError;
    }

    // Get notification reminder statistics
    const { data: reminderStats, error: reminderError } = await supabase
      .from('milestone_notifications')
      .select('notification_type, sent_at')
      .gte('sent_at', last24Hours.toISOString());

    if (reminderError) {
      throw reminderError;
    }

    // Get escrow transaction health
    const { data: escrowTransactions, error: escrowError } = await supabase
      .from('escrow_transactions')
      .select('id, status, transaction_type, created_at')
      .eq('transaction_type', 'MILESTONE_RELEASE')
      .gte('created_at', last7Days.toISOString());

    if (escrowError) {
      throw escrowError;
    }

    // Calculate urgency levels for pending milestones
    const urgentMilestones = pendingMilestones?.filter((m: any) => {
      const hoursLeft = (new Date(m.auto_approval_deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursLeft <= 6;
    }) || [];

    const criticalMilestones = pendingMilestones?.filter((m: any) => {
      const hoursLeft = (new Date(m.auto_approval_deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursLeft <= 2;
    }) || [];

    // Calculate notification metrics
    const firstReminders = reminderStats?.filter((r: any) => r.notification_type === 'first_reminder').length || 0;
    const finalReminders = reminderStats?.filter((r: any) => r.notification_type === 'final_reminder').length || 0;

    // Calculate escrow health metrics
    const completedTransactions = escrowTransactions?.filter((t: any) => t.status === 'COMPLETED').length || 0;
    const failedTransactions = escrowTransactions?.filter((t: any) => t.status === 'FAILED').length || 0;
    const pendingTransactions = escrowTransactions?.filter((t: any) => t.status === 'PROCESSING').length || 0;

    const escrowSuccessRate = escrowTransactions?.length 
      ? Math.round((completedTransactions / escrowTransactions.length) * 100) 
      : 100;

    // System health assessment
    const healthIssues: string[] = [];
    
    if (overdueMilestones && overdueMilestones.length > 0) {
      healthIssues.push(`${overdueMilestones.length} milestones are overdue for auto-approval`);
    }
    
    if (criticalMilestones.length > 5) {
      healthIssues.push(`${criticalMilestones.length} milestones are critically close to auto-approval`);
    }
    
    if (escrowSuccessRate < 90) {
      healthIssues.push(`Escrow success rate is ${escrowSuccessRate}% (below 90% threshold)`);
    }
    
    if (failedTransactions > 0) {
      healthIssues.push(`${failedTransactions} failed escrow transactions in the last 7 days`);
    }

    const overallHealth = healthIssues.length === 0 ? 'healthy' : 
                         healthIssues.length <= 2 ? 'warning' : 'critical';

    const healthReport = {
      timestamp: now.toISOString(),
      overallHealth,
      healthIssues,
      milestones: {
        totalPending: pendingMilestones?.length || 0,
        urgent: urgentMilestones.length,
        critical: criticalMilestones.length,
        overdue: overdueMilestones?.length || 0
      },
      autoApprovals: {
        last24Hours: recentAutoApprovals?.length || 0
      },
      notifications: {
        firstRemindersLast24h: firstReminders,
        finalRemindersLast24h: finalReminders
      },
      escrow: {
        successRate: escrowSuccessRate,
        completedLast7Days: completedTransactions,
        failedLast7Days: failedTransactions,
        pendingTransactions
      },
      upcomingDeadlines: pendingMilestones?.slice(0, 10).map((m: any) => ({
        milestoneId: m.id,
        orderId: m.orders.id,
        milestone: m.milestone,
        deadline: m.auto_approval_deadline,
        hoursRemaining: Math.floor(
          (new Date(m.auto_approval_deadline).getTime() - now.getTime()) / (1000 * 60 * 60)
        )
      })) || []
    };

    // Auto-approval health check completed

    return NextResponse.json({
      success: true,
      ...healthReport
    });

  } catch (error) {
    console.error('Error generating auto-approval health report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}