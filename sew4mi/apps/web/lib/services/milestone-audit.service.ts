/**
 * Milestone Audit Service
 * Provides comprehensive audit trail and analytics for milestone verification system
 * Story 2.3: Task 7 - Audit Trail and Reporting
 */

import { createClient } from '../supabase/server';
import type { 
  MilestoneApprovalHistory, 
  TailorPerformanceMetrics, 
  MilestoneRejectionPattern 
} from '@sew4mi/shared/types/milestone';

export interface MilestoneAuditFilters {
  timeRange?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  tailorId?: string;
  milestoneType?: string;
  orderStatus?: string;
}

export interface AnalyticsOverview {
  totalMilestones: number;
  approvedMilestones: number;
  rejectedMilestones: number;
  pendingMilestones: number;
  autoApprovedMilestones: number;
  averageApprovalTime: number; // in hours
  rejectionRate: number; // percentage
}

export interface MilestoneBreakdownStats {
  milestone: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  autoApproved: number;
  avgApprovalTime: number;
  rejectionRate: number;
}

export interface TimeSeriesData {
  date: string;
  submitted: number;
  approved: number;
  rejected: number;
  autoApproved: number;
}

export interface HighRejectionAlert {
  tailorId: string;
  tailorName: string;
  rejectionRate: number;
  totalMilestones: number;
  recentRejections: number;
  alertLevel: 'WARNING' | 'CRITICAL';
}

export class MilestoneAuditService {
  private async getSupabase() {
    return await createClient();
  }

  /**
   * Get comprehensive milestone approval history for an order
   */
  async getMilestoneApprovalHistory(orderId: string): Promise<MilestoneApprovalHistory[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('milestone_approvals')
      .select(`
        *,
        milestone:order_milestones (
          id,
          milestone,
          photo_url,
          notes,
          verified_at,
          approval_status,
          auto_approval_deadline
        ),
        customer:customer_id (
          id,
          email,
          profiles (full_name)
        )
      `)
      .eq('order_id', orderId)
      .order('reviewed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get milestone approval history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get milestone analytics overview with filtering
   */
  async getAnalyticsOverview(filters: MilestoneAuditFilters): Promise<AnalyticsOverview> {
    const supabase = await this.getSupabase();
    const timeFilter = this.buildTimeRangeFilter(filters);
    const tailorFilter = filters.tailorId ? ` AND o.tailor_id = '${filters.tailorId}'` : '';
    const milestoneFilter = filters.milestoneType ? ` AND om.milestone = '${filters.milestoneType}'` : '';

    const { data, error } = await supabase
      .rpc('get_milestone_analytics_overview', {
        p_time_range_filter: timeFilter,
        p_tailor_filter: tailorFilter,
        p_milestone_filter: milestoneFilter
      });

    if (error) {
      throw new Error(`Failed to get analytics overview: ${error.message}`);
    }

    const result = data?.[0] || {};
    return {
      totalMilestones: Number(result.total_milestones || 0),
      approvedMilestones: Number(result.approved_milestones || 0),
      rejectedMilestones: Number(result.rejected_milestones || 0),
      pendingMilestones: Number(result.pending_milestones || 0),
      autoApprovedMilestones: Number(result.auto_approved_milestones || 0),
      averageApprovalTime: Number(result.average_approval_time || 0),
      rejectionRate: Number(result.rejection_rate || 0)
    };
  }

  /**
   * Get milestone breakdown statistics by milestone type
   */
  async getMilestoneBreakdownStats(filters: MilestoneAuditFilters): Promise<MilestoneBreakdownStats[]> {
    const supabase = await this.getSupabase();
    const timeFilter = this.buildTimeRangeFilter(filters);
    const tailorFilter = filters.tailorId ? ` AND o.tailor_id = '${filters.tailorId}'` : '';

    const { data, error } = await supabase
      .rpc('get_milestone_breakdown_stats', {
        p_time_range_filter: timeFilter,
        p_tailor_filter: tailorFilter
      });

    if (error) {
      throw new Error(`Failed to get milestone breakdown stats: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      milestone: row.milestone,
      total: Number(row.total),
      approved: Number(row.approved),
      rejected: Number(row.rejected),
      pending: Number(row.pending),
      autoApproved: Number(row.auto_approved),
      avgApprovalTime: Number(row.avg_approval_time),
      rejectionRate: Number(row.rejection_rate)
    }));
  }

  /**
   * Get tailor performance metrics
   */
  async getTailorPerformanceStats(filters: MilestoneAuditFilters): Promise<TailorPerformanceMetrics[]> {
    const supabase = await this.getSupabase();
    const timeFilter = this.buildTimeRangeFilter(filters);
    const milestoneFilter = filters.milestoneType ? ` AND om.milestone = '${filters.milestoneType}'` : '';

    const { data, error } = await supabase
      .rpc('get_tailor_performance_stats', {
        p_time_range_filter: timeFilter,
        p_milestone_filter: milestoneFilter
      });

    if (error) {
      throw new Error(`Failed to get tailor performance stats: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      tailorId: row.tailor_id,
      tailorName: row.tailor_name,
      totalMilestones: Number(row.total_milestones),
      approvalRate: Number(row.approval_rate),
      rejectionRate: Number(row.rejection_rate),
      avgApprovalTime: Number(row.avg_approval_time)
    }));
  }

  /**
   * Get time series data for milestone trends
   */
  async getMilestoneTimeSeries(filters: MilestoneAuditFilters): Promise<TimeSeriesData[]> {
    const supabase = await this.getSupabase();
    const timeFilter = this.buildTimeRangeFilter(filters);
    const tailorFilter = filters.tailorId ? ` AND o.tailor_id = '${filters.tailorId}'` : '';

    const { data, error } = await supabase
      .rpc('get_milestone_time_series', {
        p_time_range_filter: timeFilter,
        p_tailor_filter: tailorFilter
      });

    if (error) {
      throw new Error(`Failed to get milestone time series: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      date: row.date,
      submitted: Number(row.submitted),
      approved: Number(row.approved),
      rejected: Number(row.rejected),
      autoApproved: Number(row.auto_approved)
    }));
  }

  /**
   * Get milestone rejection patterns for analysis
   */
  async getMilestoneRejectionPatterns(filters: MilestoneAuditFilters): Promise<MilestoneRejectionPattern[]> {
    const supabase = await this.getSupabase();
    const timeFilter = this.buildTimeRangeFilter(filters);
    const tailorFilter = filters.tailorId ? ` AND o.tailor_id = '${filters.tailorId}'` : '';

    const { data, error } = await supabase
      .rpc('get_milestone_rejection_patterns', {
        p_time_range_filter: timeFilter,
        p_tailor_filter: tailorFilter
      });

    if (error) {
      throw new Error(`Failed to get milestone rejection patterns: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      milestone: row.milestone,
      commonReasons: row.common_reasons || []
    }));
  }

  /**
   * Detect tailors with high rejection rates requiring alerts
   */
  async getHighRejectionAlerts(filters: MilestoneAuditFilters): Promise<HighRejectionAlert[]> {
    // const supabase = await this.getSupabase(); // TODO: Use for advanced analytics
    const performanceStats = await this.getTailorPerformanceStats(filters);
    
    const alerts: HighRejectionAlert[] = [];
    
    performanceStats.forEach(tailor => {
      // Only consider tailors with at least 5 milestones for statistical relevance
      if (tailor.totalMilestones >= 5) {
        const rejectionRate = tailor.rejectionRate;
        const recentRejections = Math.round(tailor.totalMilestones * (rejectionRate / 100));
        
        // Critical alert: >30% rejection rate
        if (rejectionRate > 30) {
          alerts.push({
            tailorId: tailor.tailorId,
            tailorName: tailor.tailorName,
            rejectionRate,
            totalMilestones: tailor.totalMilestones,
            recentRejections,
            alertLevel: 'CRITICAL'
          });
        }
        // Warning alert: >15% rejection rate
        else if (rejectionRate > 15) {
          alerts.push({
            tailorId: tailor.tailorId,
            tailorName: tailor.tailorName,
            rejectionRate,
            totalMilestones: tailor.totalMilestones,
            recentRejections,
            alertLevel: 'WARNING'
          });
        }
      }
    });

    return alerts.sort((a, b) => b.rejectionRate - a.rejectionRate);
  }

  /**
   * Export audit data for compliance purposes
   */
  async exportAuditData(filters: MilestoneAuditFilters): Promise<{
    milestones: any[];
    approvals: any[];
    disputes: any[];
    exportDate: string;
    filters: MilestoneAuditFilters;
  }> {
    const timeFilter = this.buildTimeRangeFilter(filters);
    const whereConditions = ['1=1'];
    
    if (timeFilter) {
      whereConditions.push(timeFilter.replace('AND ', ''));
    }
    
    if (filters.tailorId) {
      whereConditions.push(`o.tailor_id = '${filters.tailorId}'`);
    }

    // Get milestone data
    const supabase = await this.getSupabase();
    const { data: milestones, error: milestonesError } = await supabase
      .from('order_milestones')
      .select(`
        *,
        order:orders (
          id,
          customer_id,
          tailor_id,
          status,
          created_at
        )
      `)
      .neq('verified_at', null);

    if (milestonesError) {
      throw new Error(`Failed to export milestone data: ${milestonesError.message}`);
    }

    // Get approval data
    const { data: approvals, error: approvalsError } = await supabase
      .from('milestone_approvals')
      .select(`
        *,
        milestone:order_milestones (
          milestone,
          photo_url,
          verified_at
        )
      `);

    if (approvalsError) {
      throw new Error(`Failed to export approval data: ${approvalsError.message}`);
    }

    // Get dispute data
    const { data: disputes, error: disputesError } = await supabase
      .from('milestone_disputes')
      .select(`
        *,
        milestone:order_milestones (
          milestone,
          photo_url
        ),
        activities:dispute_activities (
          action,
          description,
          created_at,
          user_id
        )
      `);

    if (disputesError) {
      throw new Error(`Failed to export dispute data: ${disputesError.message}`);
    }

    return {
      milestones: milestones || [],
      approvals: approvals || [],
      disputes: disputes || [],
      exportDate: new Date().toISOString(),
      filters
    };
  }

  /**
   * Build SQL time range filter based on filter options
   */
  private buildTimeRangeFilter(filters: MilestoneAuditFilters): string {
    if (!filters.timeRange) return '';

    const now = new Date();
    let startDate: Date;

    switch (filters.timeRange) {
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'last_year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (filters.startDate) {
          startDate = filters.startDate;
        } else {
          return '';
        }
        break;
      default:
        return '';
    }

    const endDate = filters.timeRange === 'custom' && filters.endDate ? filters.endDate : now;
    
    return ` AND om.verified_at >= '${startDate.toISOString()}' AND om.verified_at <= '${endDate.toISOString()}'`;
  }

  /**
   * Get milestone verification health metrics for system monitoring
   */
  async getSystemHealthMetrics(): Promise<{
    pendingMilestonesOverdue: number;
    avgApprovalTime24h: number;
    rejectionRateIncrease: boolean;
    autoApprovalRate24h: number;
    systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  }> {
    const supabase = await this.getSupabase();
    // Get overdue milestones
    const { data: overdueData, error: overdueError } = await supabase
      .from('order_milestones')
      .select('id')
      .eq('approval_status', 'PENDING')
      .lt('auto_approval_deadline', new Date().toISOString());

    if (overdueError) {
      throw new Error(`Failed to get overdue milestones: ${overdueError.message}`);
    }

    // Get 24h metrics
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const filters24h: MilestoneAuditFilters = {
      timeRange: 'custom',
      startDate: yesterday,
      endDate: new Date()
    };

    const filters48h: MilestoneAuditFilters = {
      timeRange: 'custom',
      startDate: last48h,
      endDate: yesterday
    };

    const [metrics24h, metrics48h] = await Promise.all([
      this.getAnalyticsOverview(filters24h),
      this.getAnalyticsOverview(filters48h)
    ]);

    const pendingMilestonesOverdue = overdueData?.length || 0;
    const avgApprovalTime24h = metrics24h.averageApprovalTime;
    const rejectionRateIncrease = metrics24h.rejectionRate > metrics48h.rejectionRate * 1.5; // 50% increase
    const autoApprovalRate24h = metrics24h.totalMilestones > 0 
      ? (metrics24h.autoApprovedMilestones / metrics24h.totalMilestones) * 100 
      : 0;

    // Determine system status
    let systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    if (pendingMilestonesOverdue > 50 || metrics24h.rejectionRate > 30 || autoApprovalRate24h > 80) {
      systemStatus = 'CRITICAL';
    } else if (pendingMilestonesOverdue > 20 || rejectionRateIncrease || autoApprovalRate24h > 60) {
      systemStatus = 'WARNING';
    }

    return {
      pendingMilestonesOverdue,
      avgApprovalTime24h,
      rejectionRateIncrease,
      autoApprovalRate24h,
      systemStatus
    };
  }
}

// Export singleton instance
export const milestoneAuditService = new MilestoneAuditService();