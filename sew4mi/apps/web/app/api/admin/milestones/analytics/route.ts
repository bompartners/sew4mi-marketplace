/**
 * Admin milestone analytics API endpoint
 * GET /api/admin/milestones/analytics
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { milestoneAuditService } from '@/lib/services/milestone-audit.service';

/**
 * Analytics query validation schema
 */
const analyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  tailorId: z.string().uuid().optional(),
  milestoneType: z.enum([
    'FABRIC_SELECTED', 'CUTTING_STARTED', 'INITIAL_ASSEMBLY',
    'FITTING_READY', 'ADJUSTMENTS_COMPLETE', 'FINAL_PRESSING',
    'READY_FOR_DELIVERY'
  ]).optional(),
  includeDetails: z.boolean().default(false)
});

/**
 * Interface for milestone analytics data
 */
interface MilestoneAnalytics {
  overview: {
    totalMilestones: number;
    approvedMilestones: number;
    rejectedMilestones: number;
    pendingMilestones: number;
    autoApprovedMilestones: number;
    averageApprovalTime: number; // in hours
    rejectionRate: number; // percentage
  };
  milestoneBreakdown: Array<{
    milestone: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    autoApproved: number;
    avgApprovalTime: number;
    rejectionRate: number;
  }>;
  tailorPerformance: Array<{
    tailorId: string;
    tailorName: string;
    totalMilestones: number;
    approvalRate: number;
    rejectionRate: number;
    avgApprovalTime: number;
    qualityScore: number; // calculated score based on approval/rejection patterns
  }>;
  timeSeriesData: Array<{
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
    autoApproved: number;
  }>;
  rejectionPatterns: Array<{
    milestone: string;
    commonReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  }>;
  alerts: Array<{
    type: 'HIGH_REJECTION_RATE' | 'SLOW_APPROVAL_TIME' | 'QUALITY_CONCERN';
    message: string;
    severity: 'low' | 'medium' | 'high';
    data: any;
  }>;
}


/**
 * Calculate quality score based on approval patterns
 */
function calculateQualityScore(
  approvalRate: number, 
  avgApprovalTime: number, 
  totalMilestones: number
): number {
  // Base score from approval rate (0-40 points)
  let score = Math.min(40, approvalRate * 0.4);
  
  // Speed bonus (0-20 points, optimal is 12-24 hours)
  const speedScore = avgApprovalTime <= 24 
    ? Math.max(0, 20 - (avgApprovalTime / 24) * 20)
    : Math.max(0, 20 - ((avgApprovalTime - 24) / 48) * 20);
  score += speedScore;
  
  // Volume bonus (0-20 points)
  const volumeScore = Math.min(20, (totalMilestones / 50) * 20);
  score += volumeScore;
  
  // Consistency bonus (0-20 points, penalize very low totals)
  const consistencyScore = totalMilestones >= 10 ? 20 : (totalMilestones / 10) * 20;
  score += consistencyScore;
  
  return Math.round(Math.min(100, score));
}

/**
 * GET handler - Fetch milestone analytics
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role from user metadata or database
    let userRole = user.user_metadata?.role || user.app_metadata?.role;

    // If not in metadata, fetch from database
    if (!userRole) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Unable to verify user permissions' },
          { status: 403 }
        );
      }
      userRole = userData.role;
    }

    // Check if user has admin role
    if (userRole?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const searchParams = _request.nextUrl.searchParams;
    const queryParams = {
      timeRange: searchParams.get('timeRange') || '30d',
      tailorId: searchParams.get('tailorId') || undefined,
      milestoneType: searchParams.get('milestoneType') || undefined,
      includeDetails: searchParams.get('includeDetails') === 'true'
    };

    const validationResult = analyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { timeRange, tailorId, milestoneType, includeDetails } = validationResult.data;

    // Calculate date range for queries
    let dateFilter = '';
    const now = new Date();
    if (timeRange !== 'all') {
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      dateFilter = startDate.toISOString();
    }

    // Build query for order milestones
    // Schema: id, order_id, milestone_type, milestone_status, started_at, completed_at,
    // completed_by, photo_urls, video_url, notes, customer_approved, customer_approved_at
    let query = supabase
      .from('order_milestones')
      .select(`
        *,
        orders!inner(
          id,
          tailor_id,
          tailor_profiles!inner(
            id,
            business_name
          )
        )
      `);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    if (tailorId) {
      query = query.eq('orders.tailor_id', tailorId);
    }

    if (milestoneType) {
      query = query.eq('milestone_type', milestoneType);
    }

    const { data: milestonesData, error: milestonesError } = await query;

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
      throw milestonesError;
    }

    // Calculate analytics from the raw data
    const milestones = milestonesData || [];

    const totalMilestones = milestones.length;
    const approvedMilestones = milestones.filter(m => m.milestone_status === 'COMPLETED' && m.customer_approved).length;
    const rejectedMilestones = milestones.filter(m => m.milestone_status === 'REJECTED').length;
    const pendingMilestones = milestones.filter(m => m.milestone_status === 'PENDING' || m.milestone_status === 'IN_PROGRESS').length;
    const autoApprovedMilestones = 0; // This would need a flag in the schema

    // Calculate average approval time (in hours)
    const approvedWithTime = milestones.filter(m =>
      m.milestone_status === 'COMPLETED' && m.customer_approved_at && m.started_at
    );
    const averageApprovalTime = approvedWithTime.length > 0
      ? approvedWithTime.reduce((sum, m) => {
          const approvedAt = new Date(m.customer_approved_at).getTime();
          const startedAt = new Date(m.started_at).getTime();
          return sum + (approvedAt - startedAt) / (1000 * 60 * 60); // Convert to hours
        }, 0) / approvedWithTime.length
      : 0;

    const rejectionRate = totalMilestones > 0
      ? (rejectedMilestones / totalMilestones) * 100
      : 0;

    // Overview data
    const overviewData = [{
      total_milestones: totalMilestones,
      approved_milestones: approvedMilestones,
      rejected_milestones: rejectedMilestones,
      pending_milestones: pendingMilestones,
      auto_approved_milestones: autoApprovedMilestones,
      average_approval_time: averageApprovalTime,
      rejection_rate: rejectionRate
    }];

    // Milestone breakdown by type
    const milestoneTypes = [...new Set(milestones.map(m => m.milestone_type))];
    const milestoneBreakdown = milestoneTypes.map(milestone => {
      const milestonesOfType = milestones.filter(m => m.milestone_type === milestone);
      const approved = milestonesOfType.filter(m => m.milestone_status === 'COMPLETED' && m.customer_approved).length;
      const rejected = milestonesOfType.filter(m => m.milestone_status === 'REJECTED').length;
      const pending = milestonesOfType.filter(m => m.milestone_status === 'PENDING' || m.milestone_status === 'IN_PROGRESS').length;
      const autoApproved = 0;

      const approvedWithTime = milestonesOfType.filter(m =>
        m.milestone_status === 'COMPLETED' && m.customer_approved_at && m.started_at
      );
      const avgApprovalTime = approvedWithTime.length > 0
        ? approvedWithTime.reduce((sum, m) => {
            const approvedAt = new Date(m.customer_approved_at).getTime();
            const startedAt = new Date(m.started_at).getTime();
            return sum + (approvedAt - startedAt) / (1000 * 60 * 60);
          }, 0) / approvedWithTime.length
        : 0;

      return {
        milestone,
        total: milestonesOfType.length,
        approved,
        rejected,
        pending,
        auto_approved: autoApproved,
        avg_approval_time: avgApprovalTime,
        rejection_rate: milestonesOfType.length > 0
          ? (rejected / milestonesOfType.length) * 100
          : 0
      };
    });

    // Tailor performance
    const tailorIds = [...new Set(milestones.map(m => m.orders?.tailor_id).filter(Boolean))];
    const tailorPerformance = tailorIds.map(tId => {
      const tailorMilestones = milestones.filter(m => m.orders?.tailor_id === tId);
      const approved = tailorMilestones.filter(m => m.milestone_status === 'COMPLETED' && m.customer_approved).length;
      const rejected = tailorMilestones.filter(m => m.milestone_status === 'REJECTED').length;

      const approvedWithTime = tailorMilestones.filter(m =>
        m.milestone_status === 'COMPLETED' && m.customer_approved_at && m.started_at
      );
      const avgApprovalTime = approvedWithTime.length > 0
        ? approvedWithTime.reduce((sum, m) => {
            const approvedAt = new Date(m.customer_approved_at).getTime();
            const startedAt = new Date(m.started_at).getTime();
            return sum + (approvedAt - startedAt) / (1000 * 60 * 60);
          }, 0) / approvedWithTime.length
        : 0;

      const tailorName = tailorMilestones[0]?.orders?.tailor_profiles?.business_name || 'Unknown Tailor';

      return {
        tailor_id: tId,
        tailor_name: tailorName,
        total_milestones: tailorMilestones.length,
        approval_rate: tailorMilestones.length > 0
          ? (approved / tailorMilestones.length) * 100
          : 0,
        rejection_rate: tailorMilestones.length > 0
          ? (rejected / tailorMilestones.length) * 100
          : 0,
        avg_approval_time: avgApprovalTime
      };
    });

    // Calculate quality scores for tailors
    const enhancedTailorPerformance = tailorPerformance.map((tailor: any) => ({
      ...tailor,
      qualityScore: calculateQualityScore(
        tailor.approval_rate,
        tailor.avg_approval_time,
        tailor.total_milestones
      )
    }));

    // Time series data (simplified - group by date)
    const timeSeriesData: any[] = [];

    // Rejection patterns (simplified)
    const rejectionPatterns: any[] = [];

    // Generate alerts based on analytics data
    const alerts: MilestoneAnalytics['alerts'] = [];

    // Check for high rejection rates
    enhancedTailorPerformance.forEach((tailor: any) => {
      if (tailor.rejection_rate > 30 && tailor.total_milestones >= 5) {
        alerts.push({
          type: 'HIGH_REJECTION_RATE',
          message: `Tailor ${tailor.tailor_name} has a ${tailor.rejection_rate.toFixed(1)}% rejection rate`,
          severity: tailor.rejection_rate > 50 ? 'high' : 'medium',
          data: { tailorId: tailor.tailor_id, rejectionRate: tailor.rejection_rate }
        });
      }
    });

    // Check for slow approval times
    if (overviewData?.[0]?.average_approval_time > 36) {
      alerts.push({
        type: 'SLOW_APPROVAL_TIME',
        message: `Average approval time is ${overviewData[0].average_approval_time.toFixed(1)} hours`,
        severity: overviewData[0].average_approval_time > 48 ? 'high' : 'medium',
        data: { avgApprovalTime: overviewData[0].average_approval_time }
      });
    }

    // Check for quality concerns
    (enhancedTailorPerformance || []).forEach((tailor: any) => {
      if (tailor.qualityScore < 60 && tailor.total_milestones >= 10) {
        alerts.push({
          type: 'QUALITY_CONCERN',
          message: `Tailor ${tailor.tailor_name} has a quality score of ${tailor.qualityScore}`,
          severity: tailor.qualityScore < 40 ? 'high' : 'medium',
          data: { tailorId: tailor.tailor_id, qualityScore: tailor.qualityScore }
        });
      }
    });

    // Build response
    const analytics: MilestoneAnalytics = {
      overview: {
        totalMilestones: overviewData?.[0]?.total_milestones || 0,
        approvedMilestones: overviewData?.[0]?.approved_milestones || 0,
        rejectedMilestones: overviewData?.[0]?.rejected_milestones || 0,
        pendingMilestones: overviewData?.[0]?.pending_milestones || 0,
        autoApprovedMilestones: overviewData?.[0]?.auto_approved_milestones || 0,
        averageApprovalTime: overviewData?.[0]?.average_approval_time || 0,
        rejectionRate: overviewData?.[0]?.rejection_rate || 0
      },
      milestoneBreakdown: (milestoneBreakdown || []).map((item: any) => ({
        milestone: item.milestone,
        total: item.total,
        approved: item.approved,
        rejected: item.rejected,
        pending: item.pending,
        autoApproved: item.auto_approved,
        avgApprovalTime: item.avg_approval_time,
        rejectionRate: item.rejection_rate
      })),
      tailorPerformance: enhancedTailorPerformance.map((tailor: any) => ({
        tailorId: tailor.tailor_id,
        tailorName: tailor.tailor_name,
        totalMilestones: tailor.total_milestones,
        approvalRate: tailor.approval_rate,
        rejectionRate: tailor.rejection_rate,
        avgApprovalTime: tailor.avg_approval_time,
        qualityScore: tailor.qualityScore
      })),
      timeSeriesData: (timeSeriesData || []).map((item: any) => ({
        date: item.date,
        submitted: item.submitted,
        approved: item.approved,
        rejected: item.rejected,
        autoApproved: item.auto_approved
      })),
      rejectionPatterns: (rejectionPatterns || []).map((pattern: any) => ({
        milestone: pattern.milestone,
        commonReasons: pattern.common_reasons || []
      })),
      alerts
    };

    // Handle export request
    if (searchParams.get('export') === 'true') {
      const filters = {
        timeRange: (timeRange === '7d' ? 'last_7_days' : 
                   timeRange === '30d' ? 'last_30_days' :
                   timeRange === '90d' ? 'last_90_days' :
                   timeRange === '1y' ? 'last_year' : 'last_30_days') as "last_7_days" | "last_30_days" | "last_90_days" | "last_year" | "custom",
        tailorId,
        milestoneType
      };
      
      const exportData = await milestoneAuditService.exportAuditData(filters);
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="milestone-audit-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers
      });
    }

    console.log(`Milestone analytics generated for timeRange: ${timeRange}, ${alerts.length} alerts found`);

    return NextResponse.json({
      success: true,
      data: analytics,
      metadata: {
        timeRange,
        tailorId,
        milestoneType,
        generatedAt: new Date().toISOString(),
        includeDetails
      }
    });

  } catch (error) {
    console.error('Error generating milestone analytics:', error);
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
 * POST /api/admin/milestones/analytics
 *
 * Create custom analytics reports or trigger specific analysis
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role from user metadata or database
    let userRole = user.user_metadata?.role || user.app_metadata?.role;

    // If not in metadata, fetch from database
    if (!userRole) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Unable to verify user permissions' },
          { status: 403 }
        );
      }
      userRole = userData.role;
    }

    // Check if user has admin role
    if (userRole?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await _request.json();
    const { reportType, filters, parameters } = body;

    switch (reportType) {
      case 'milestone_history':
        if (!parameters?.orderId) {
          return NextResponse.json(
            { error: 'Order ID required for milestone history report' },
            { status: 400 }
          );
        }
        
        const history = await milestoneAuditService.getMilestoneApprovalHistory(parameters.orderId);
        return NextResponse.json({
          success: true,
          data: { history }
        });

      case 'system_health_check':
        const healthMetrics = await milestoneAuditService.getSystemHealthMetrics();
        return NextResponse.json({
          success: true,
          data: { healthMetrics }
        });

      case 'high_rejection_alerts':
        const alerts = await milestoneAuditService.getHighRejectionAlerts(filters || {});
        return NextResponse.json({
          success: true,
          data: { alerts }
        });

      case 'custom_export':
        const exportData = await milestoneAuditService.exportAuditData(filters || {});
        return NextResponse.json({
          success: true,
          data: exportData
        });

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Milestone analytics POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom analytics report' },
      { status: 500 }
    );
  }
}