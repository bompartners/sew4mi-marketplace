/**
 * API endpoint for dispute analytics and pattern identification
 * GET /api/admin/disputes/analytics
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Analytics query schema
 */
const analyticsQuerySchema = z.object({
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  includePatterns: z.boolean().default(true),
  includeTrends: z.boolean().default(true),
  includePerformance: z.boolean().default(true)
});

/**
 * Analytics response interface
 */
interface DisputeAnalytics {
  overview: {
    totalDisputes: number;
    resolvedDisputes: number;
    averageResolutionTime: number;
    slaPerformance: number;
  };
  patterns: {
    topCategories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    problematicTailors: Array<{
      tailorId: string;
      tailorEmail: string;
      disputeCount: number;
      totalOrders: number;
      disputeRate: number;
    }>;
    frequentCustomers: Array<{
      customerId: string;
      customerEmail: string;
      disputeCount: number;
      totalOrders: number;
      disputeRate: number;
    }>;
    timePatterns: Array<{
      period: string;
      disputeCount: number;
      resolutionTime: number;
    }>;
  };
  trends: {
    monthly: Array<{
      month: string;
      disputes: number;
      resolved: number;
      avgResolutionTime: number;
    }>;
    categoryTrends: Array<{
      category: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      changePercent: number;
      currentMonth: number;
      previousMonth: number;
    }>;
  };
  performance: {
    adminPerformance: Array<{
      adminId: string;
      adminEmail: string;
      assignedDisputes: number;
      resolvedDisputes: number;
      avgResolutionTime: number;
      slaCompliance: number;
    }>;
    escalationPatterns: Array<{
      escalationReason: string;
      count: number;
      avgTimeToEscalation: number;
    }>;
  };
}

/**
 * GET handler - Fetch dispute analytics
 */
export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    
    // Parse and validate query parameters
    const queryParams = analyticsQuerySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      includePatterns: searchParams.get('includePatterns') !== 'false',
      includeTrends: searchParams.get('includeTrends') !== 'false',
      includePerformance: searchParams.get('includePerformance') !== 'false'
    });

    if (!queryParams.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: queryParams.error.issues
        },
        { status: 400 }
      );
    }

    const { startDate, endDate, includePatterns, includeTrends, includePerformance } = queryParams.data;

    const supabase = await createClient();
    
    // Get current user and verify admin role
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
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Set date range (default to last 90 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 90);

    const analysisStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const analysisEndDate = endDate ? new Date(endDate) : defaultEndDate;

    // Get overview analytics
    const overview = await getOverviewAnalytics(supabase, analysisStartDate, analysisEndDate);

    const analytics: DisputeAnalytics = {
      overview,
      patterns: { topCategories: [], problematicTailors: [], frequentCustomers: [], timePatterns: [] },
      trends: { monthly: [], categoryTrends: [] },
      performance: { adminPerformance: [], escalationPatterns: [] }
    };

    // Get pattern analysis if requested
    if (includePatterns) {
      analytics.patterns = await getPatternAnalysis(supabase, analysisStartDate, analysisEndDate);
    }

    // Get trend analysis if requested
    if (includeTrends) {
      analytics.trends = await getTrendAnalysis(supabase, analysisStartDate, analysisEndDate);
    }

    // Get performance analysis if requested
    if (includePerformance) {
      analytics.performance = await getPerformanceAnalysis(supabase, analysisStartDate, analysisEndDate);
    }

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Analytics API error:', error);
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
 * Get overview analytics
 */
async function getOverviewAnalytics(supabase: any, startDate: Date, endDate: Date) {
  const { data: overviewData } = await supabase
    .rpc('get_dispute_analytics', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    });

  if (overviewData && overviewData.length > 0) {
    const overview = overviewData[0];
    return {
      totalDisputes: overview.total_disputes || 0,
      resolvedDisputes: overview.resolved_disputes || 0,
      averageResolutionTime: overview.avg_resolution_time_hours || 0,
      slaPerformance: overview.sla_performance?.sla_performance_rate || 0
    };
  }

  return {
    totalDisputes: 0,
    resolvedDisputes: 0,
    averageResolutionTime: 0,
    slaPerformance: 0
  };
}

/**
 * Get pattern analysis
 */
async function getPatternAnalysis(supabase: any, startDate: Date, endDate: Date) {
  // Get category breakdown
  const { data: categoryData } = await supabase
    .from('disputes')
    .select('category')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const totalDisputes = categoryData?.length || 0;
  const categoryMap = new Map();
  
  categoryData?.forEach((dispute: any) => {
    const count = categoryMap.get(dispute.category) || 0;
    categoryMap.set(dispute.category, count + 1);
  });

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count: count as number,
      percentage: totalDisputes > 0 ? Math.round(((count as number) / totalDisputes) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get problematic tailors
  const { data: tailorData } = await supabase
    .from('disputes')
    .select(`
      id,
      orders!inner (
        tailor_id,
        profiles_tailor:profiles!tailor_id (
          email
        )
      )
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const tailorMap = new Map();
  tailorData?.forEach((dispute: any) => {
    const tailorId = dispute.orders.tailor_id;
    if (tailorId) {
      const current = tailorMap.get(tailorId) || { count: 0, email: dispute.orders.profiles_tailor?.email || 'Unknown' };
      tailorMap.set(tailorId, { ...current, count: current.count + 1 });
    }
  });

  // Get tailor order counts for dispute rates
  const problematicTailors: any[] = [];
  for (const [tailorId, data] of tailorMap.entries()) {
    const { data: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tailor_id', tailorId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalOrders = orderCount || 0;
    const disputeRate = totalOrders > 0 ? Math.round(((data as any).count / totalOrders) * 100) : 0;

    if ((data as any).count >= 2) { // Only include tailors with 2+ disputes
      problematicTailors.push({
        tailorId,
        tailorEmail: (data as any).email,
        disputeCount: (data as any).count,
        totalOrders,
        disputeRate
      });
    }
  }

  problematicTailors.sort((a, b) => b.disputeRate - a.disputeRate);

  // Get frequent customer disputes
  const { data: customerData } = await supabase
    .from('disputes')
    .select(`
      id,
      orders!inner (
        customer_id,
        profiles_customer:profiles!customer_id (
          email
        )
      )
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const customerMap = new Map();
  customerData?.forEach((dispute: any) => {
    const customerId = dispute.orders.customer_id;
    if (customerId) {
      const current = customerMap.get(customerId) || { count: 0, email: dispute.orders.profiles_customer?.email || 'Unknown' };
      customerMap.set(customerId, { ...current, count: current.count + 1 });
    }
  });

  const frequentCustomers = Array.from(customerMap.entries())
    .filter(([_, data]) => (data as any).count >= 2)
    .map(([customerId, data]) => ({
      customerId,
      customerEmail: (data as any).email,
      disputeCount: (data as any).count,
      totalOrders: 0, // Would need additional query
      disputeRate: 0
    }))
    .sort((a, b) => b.disputeCount - a.disputeCount)
    .slice(0, 10);

  return {
    topCategories,
    problematicTailors: problematicTailors.slice(0, 10),
    frequentCustomers,
    timePatterns: [] // Would implement time-based pattern analysis
  };
}

/**
 * Get trend analysis
 */
async function getTrendAnalysis(supabase: any, startDate: Date, endDate: Date) {
  // Get monthly trends
  const { data: monthlyData } = await supabase
    .from('disputes')
    .select(`
      created_at,
      resolved_at,
      status
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at');

  const monthlyMap = new Map();
  
  monthlyData?.forEach((dispute: any) => {
    const month = new Date(dispute.created_at).toISOString().slice(0, 7); // YYYY-MM
    const current = monthlyMap.get(month) || { disputes: 0, resolved: 0, totalResolutionTime: 0 };
    
    current.disputes++;
    if (dispute.resolved_at) {
      current.resolved++;
      const resolutionTime = (new Date(dispute.resolved_at).getTime() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60);
      current.totalResolutionTime += resolutionTime;
    }
    
    monthlyMap.set(month, current);
  });

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      disputes: (data as any).disputes,
      resolved: (data as any).resolved,
      avgResolutionTime: (data as any).resolved > 0 ? Math.round((data as any).totalResolutionTime / (data as any).resolved) : 0
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    monthly,
    categoryTrends: [] // Would implement category trend analysis
  };
}

/**
 * Get performance analysis
 */
async function getPerformanceAnalysis(supabase: any, startDate: Date, endDate: Date) {
  // Get admin performance
  const { data: adminData } = await supabase
    .from('disputes')
    .select(`
      assigned_admin,
      resolved_at,
      created_at,
      sla_deadline,
      status,
      profiles_admin:profiles!assigned_admin (
        email
      )
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .not('assigned_admin', 'is', null);

  const adminMap = new Map();
  
  adminData?.forEach((dispute: any) => {
    const adminId = dispute.assigned_admin;
    if (adminId) {
      const current = adminMap.get(adminId) || {
        email: dispute.profiles_admin?.email || 'Unknown',
        assignedDisputes: 0,
        resolvedDisputes: 0,
        totalResolutionTime: 0,
        slaCompliant: 0
      };

      current.assignedDisputes++;
      
      if (dispute.resolved_at) {
        current.resolvedDisputes++;
        const resolutionTime = (new Date(dispute.resolved_at).getTime() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60);
        current.totalResolutionTime += resolutionTime;
        
        if (new Date(dispute.resolved_at) <= new Date(dispute.sla_deadline)) {
          current.slaCompliant++;
        }
      }
      
      adminMap.set(adminId, current);
    }
  });

  const adminPerformance = Array.from(adminMap.entries())
    .map(([adminId, data]) => ({
      adminId,
      adminEmail: (data as any).email,
      assignedDisputes: (data as any).assignedDisputes,
      resolvedDisputes: (data as any).resolvedDisputes,
      avgResolutionTime: (data as any).resolvedDisputes > 0 
        ? Math.round((data as any).totalResolutionTime / (data as any).resolvedDisputes) 
        : 0,
      slaCompliance: (data as any).resolvedDisputes > 0 
        ? Math.round(((data as any).slaCompliant / (data as any).resolvedDisputes) * 100) 
        : 0
    }))
    .sort((a, b) => b.slaCompliance - a.slaCompliance);

  return {
    adminPerformance,
    escalationPatterns: [] // Would implement escalation pattern analysis
  };
}