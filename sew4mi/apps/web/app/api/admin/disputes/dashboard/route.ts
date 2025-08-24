// Admin Dispute Dashboard API
// Story 2.4: Dashboard data for dispute management

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { 
  DisputeStatus, 
  DisputePriority
} from '@sew4mi/shared';

// Dashboard stats interface
interface DashboardStats {
  totalDisputes: number;
  openDisputes: number;
  overdueDisputes: number;
  criticalPriority: number;
  averageResolutionTime: number;
  slaPerformance: number;
}

// Dashboard response interface
interface DashboardResponse {
  disputes: any[];
  stats: DashboardStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    
    // Parse and validate query parameters
    const queryParams = {
      status: searchParams.getAll('status'),
      priority: searchParams.getAll('priority'),
      category: searchParams.getAll('category'),
      assignedAdmin: searchParams.get('assignedAdmin'),
      overdue: searchParams.get('overdue') === 'true',
      search: searchParams.get('search'),
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '25'), 100)
    };

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }

    // Build base query for disputes with all necessary joins
    let disputesQuery = supabase
      .from('disputes')
      .select(`
        id,
        order_id,
        category,
        title,
        status,
        priority,
        assigned_admin,
        sla_deadline,
        created_at,
        resolved_at,
        orders!inner (
          total_amount,
          customer_id,
          tailor_id,
          profiles_customer:profiles!customer_id (
            email,
            full_name
          ),
          profiles_tailor:profiles!tailor_id (
            email,
            full_name
          )
        ),
        profiles_admin:profiles!assigned_admin (
          email,
          full_name
        ),
        dispute_messages!left (
          id
        ),
        dispute_evidence!left (
          id
        )
      `);

    // Apply filters
    if (queryParams.status.length > 0) {
      disputesQuery = disputesQuery.in('status', queryParams.status);
    }

    if (queryParams.priority.length > 0) {
      disputesQuery = disputesQuery.in('priority', queryParams.priority);
    }

    if (queryParams.category.length > 0) {
      disputesQuery = disputesQuery.in('category', queryParams.category);
    }

    if (queryParams.assignedAdmin) {
      if (queryParams.assignedAdmin === 'current-user') {
        disputesQuery = disputesQuery.eq('assigned_admin', user.id);
      } else if (queryParams.assignedAdmin === 'unassigned') {
        disputesQuery = disputesQuery.is('assigned_admin', null);
      } else {
        disputesQuery = disputesQuery.eq('assigned_admin', queryParams.assignedAdmin);
      }
    }

    if (queryParams.overdue) {
      disputesQuery = disputesQuery
        .in('status', [DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS])
        .lt('sla_deadline', new Date().toISOString());
    }

    if (queryParams.search) {
      const searchTerm = `%${queryParams.search}%`;
      disputesQuery = disputesQuery.or(`
        title.ilike.${searchTerm},
        orders.profiles_customer.email.ilike.${searchTerm},
        orders.profiles_customer.full_name.ilike.${searchTerm},
        orders.profiles_tailor.email.ilike.${searchTerm},
        orders.profiles_tailor.full_name.ilike.${searchTerm}
      `);
    }

    // Count total results for pagination - use a separate query for counting
    const countQuery = supabase
      .from('disputes')
      .select('*', { count: 'exact', head: true });
    
    // Apply the same filters to count query
    if (queryParams.status.length > 0) {
      countQuery.in('status', queryParams.status);
    }
    if (queryParams.priority.length > 0) {
      countQuery.in('priority', queryParams.priority);
    }
    if (queryParams.category.length > 0) {
      countQuery.in('category', queryParams.category);
    }
    if (queryParams.assignedAdmin) {
      if (queryParams.assignedAdmin === 'current-user') {
        countQuery.eq('assigned_admin', user.id);
      } else if (queryParams.assignedAdmin === 'unassigned') {
        countQuery.is('assigned_admin', null);
      } else {
        countQuery.eq('assigned_admin', queryParams.assignedAdmin);
      }
    }
    if (queryParams.overdue) {
      countQuery
        .in('status', [DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS])
        .lt('sla_deadline', new Date().toISOString());
    }
    
    const { count: totalCount } = await countQuery;

    // Apply pagination and ordering
    const offset = (queryParams.page - 1) * queryParams.limit;
    disputesQuery = disputesQuery
      .order('priority', { ascending: false }) // Critical first
      .order('sla_deadline', { ascending: true }) // Most urgent first
      .order('created_at', { ascending: false }) // Newest first
      .range(offset, offset + queryParams.limit - 1);

    // Execute query
    const { data: disputesData, error: disputesError } = await disputesQuery;

    if (disputesError) {
      console.error('Error fetching disputes:', disputesError);
      return NextResponse.json(
        { error: 'Failed to fetch disputes' }, 
        { status: 500 }
      );
    }

    // Transform disputes data
    const disputes = (disputesData || []).map((dispute: any) => {
      const now = new Date();
      const slaDeadline = new Date(dispute.sla_deadline);
      const hoursUntilSla = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isOverdue = ['OPEN', 'IN_PROGRESS'].includes(dispute.status) && hoursUntilSla < 0;

      return {
        id: dispute.id,
        orderId: dispute.order_id,
        category: dispute.category,
        title: dispute.title,
        status: dispute.status,
        priority: dispute.priority,
        assignedAdmin: dispute.assigned_admin,
        slaDeadline: dispute.sla_deadline,
        createdAt: dispute.created_at,
        resolvedAt: dispute.resolved_at,
        orderAmount: dispute.orders.total_amount,
        customerEmail: dispute.orders.profiles_customer?.email || 'Unknown',
        tailorEmail: dispute.orders.profiles_tailor?.email || 'Unknown',
        adminEmail: dispute.profiles_admin?.email || null,
        isOverdue,
        hoursUntilSla: Math.max(0, hoursUntilSla),
        messageCount: dispute.dispute_messages?.length || 0,
        evidenceCount: dispute.dispute_evidence?.length || 0
      };
    });

    // Calculate dashboard statistics
    const stats = await calculateDashboardStats(supabase);

    // Prepare response
    const response: DashboardResponse = {
      disputes,
      stats,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: totalCount || 0,
        hasMore: (totalCount || 0) > (queryParams.page * queryParams.limit)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Dashboard API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Calculate dashboard statistics
async function calculateDashboardStats(supabase: any): Promise<DashboardStats> {
  try {
    // Get overall dispute counts
    const { data: disputeCounts } = await supabase
      .from('disputes')
      .select(`
        status,
        priority,
        sla_deadline,
        created_at,
        resolved_at
      `);

    if (!disputeCounts) {
      return {
        totalDisputes: 0,
        openDisputes: 0,
        overdueDisputes: 0,
        criticalPriority: 0,
        averageResolutionTime: 0,
        slaPerformance: 0
      };
    }

    const now = new Date();
    const totalDisputes = disputeCounts.length;
    
    // Count open disputes
    const openDisputes = disputeCounts.filter((d: any) => 
      [DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS].includes(d.status)
    ).length;

    // Count overdue disputes
    const overdueDisputes = disputeCounts.filter((d: any) => 
      [DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS].includes(d.status) &&
      new Date(d.sla_deadline) < now
    ).length;

    // Count critical priority disputes
    const criticalPriority = disputeCounts.filter((d: any) => 
      d.priority === DisputePriority.CRITICAL
    ).length;

    // Calculate average resolution time (in hours)
    const resolvedDisputes = disputeCounts.filter((d: any) => 
      d.resolved_at && d.created_at
    );
    
    let averageResolutionTime = 0;
    if (resolvedDisputes.length > 0) {
      const totalResolutionTime = resolvedDisputes.reduce((sum: number, d: any) => {
        const createdAt = new Date(d.created_at);
        const resolvedAt = new Date(d.resolved_at);
        return sum + (resolvedAt.getTime() - createdAt.getTime());
      }, 0);
      
      averageResolutionTime = totalResolutionTime / (resolvedDisputes.length * 1000 * 60 * 60); // Convert to hours
    }

    // Calculate SLA performance
    const disputesWithSLA = disputeCounts.filter((d: any) => d.resolved_at);
    let slaPerformance = 0;
    
    if (disputesWithSLA.length > 0) {
      const metSLA = disputesWithSLA.filter((d: any) => 
        new Date(d.resolved_at) <= new Date(d.sla_deadline)
      ).length;
      
      slaPerformance = Math.round((metSLA / disputesWithSLA.length) * 100);
    }

    return {
      totalDisputes,
      openDisputes,
      overdueDisputes,
      criticalPriority,
      averageResolutionTime: Math.round(averageResolutionTime * 10) / 10, // Round to 1 decimal
      slaPerformance
    };

  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    return {
      totalDisputes: 0,
      openDisputes: 0,
      overdueDisputes: 0,
      criticalPriority: 0,
      averageResolutionTime: 0,
      slaPerformance: 0
    };
  }
}

// Handle dispute assignment
export async function POST(_request: NextRequest) {
  try {
    const { disputeId, adminId } = await _request.json();

    if (!disputeId || !adminId) {
      return NextResponse.json(
        { error: 'Dispute ID and Admin ID are required' }, 
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }

    // Update dispute assignment
    const { error: updateError } = await supabase
      .from('disputes')
      .update({ 
        assigned_admin: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', disputeId);

    if (updateError) {
      console.error('Error assigning dispute:', updateError);
      return NextResponse.json(
        { error: 'Failed to assign dispute' }, 
        { status: 500 }
      );
    }

    // Log the assignment activity
    await supabase
      .from('dispute_activities')
      .insert({
        dispute_id: disputeId,
        user_id: user.id,
        action: 'ASSIGNED',
        description: `Dispute assigned to admin ${adminId}`
      });

    // Create notification for assigned admin
    if (adminId !== user.id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: adminId,
          type: 'DISPUTE_ASSIGNED',
          title: 'Dispute Assigned',
          message: `You have been assigned a new dispute to resolve.`,
          data: {
            disputeId: disputeId,
            assignedBy: user.id
          }
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Assignment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}