// Admin Dispute Dashboard API
// Story 2.4: Dashboard data for dispute management

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { DisputeStatus } from '@sew4mi/shared';

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
    const supabase = await createClient();

    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Check if user is admin - check users table first, then profiles
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Build base query for disputes with all necessary joins
    // Note: Using existing schema columns (dispute_type, description, assigned_to)
    let disputesQuery = supabase
      .from('disputes')
      .select(`
        id,
        order_id,
        dispute_type,
        description,
        status,
        assigned_to,
        created_at,
        resolution_date,
        orders!inner (
          total_amount,
          customer_id,
          tailor_id
        )
      `, { count: 'exact' });

    // Apply filters based on existing schema
    if (queryParams.status.length > 0) {
      disputesQuery = disputesQuery.in('status', queryParams.status);
    }

    // Skip priority and category filters - not in current schema
    // if (queryParams.priority.length > 0) {
    //   disputesQuery = disputesQuery.in('priority', queryParams.priority);
    // }

    // if (queryParams.category.length > 0) {
    //   disputesQuery = disputesQuery.in('category', queryParams.category);
    // }

    if (queryParams.assignedAdmin) {
      if (queryParams.assignedAdmin === 'current-user') {
        disputesQuery = disputesQuery.eq('assigned_to', user.id);
      } else if (queryParams.assignedAdmin === 'unassigned') {
        disputesQuery = disputesQuery.is('assigned_to', null);
      } else {
        disputesQuery = disputesQuery.eq('assigned_to', queryParams.assignedAdmin);
      }
    }

    // Skip overdue filter - sla_deadline not in current schema
    // if (queryParams.overdue) {
    //   disputesQuery = disputesQuery
    //     .in('status', [DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS])
    //     .lt('sla_deadline', new Date().toISOString());
    // }

    if (queryParams.search) {
      const searchTerm = `%${queryParams.search}%`;
      disputesQuery = disputesQuery.or(`
        description.ilike.${searchTerm},
        dispute_type.ilike.${searchTerm}
      `);
    }

    // Apply pagination and ordering
    const offset = (queryParams.page - 1) * queryParams.limit;
    disputesQuery = disputesQuery
      .order('created_at', { ascending: false }) // Newest first
      .range(offset, offset + queryParams.limit - 1);

    // Execute query
    const { data: disputesData, error: disputesError, count: totalCount } = await disputesQuery;

    if (disputesError) {
      console.error('Error fetching disputes:', disputesError);
      return NextResponse.json(
        { error: 'Failed to fetch disputes', details: disputesError.message },
        { status: 500 }
      );
    }

    // Get user profiles for customer and tailor emails
    const disputes = await Promise.all((disputesData || []).map(async (dispute: any) => {
      // Fetch customer and tailor profiles
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', dispute.orders.customer_id)
        .single();

      const { data: tailorProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', dispute.orders.tailor_id)
        .single();

      const { data: adminProfile } = dispute.assigned_to ? await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', dispute.assigned_to)
        .single() : { data: null };

      // Calculate SLA info (use 48 hours as default)
      const slaDeadline = new Date(dispute.created_at);
      slaDeadline.setHours(slaDeadline.getHours() + 48);
      const now = new Date();
      const hoursUntilSla = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isOverdue = ['OPEN', 'IN_PROGRESS'].includes(dispute.status) && hoursUntilSla < 0;

      return {
        id: dispute.id,
        orderId: dispute.order_id,
        category: dispute.dispute_type,
        title: dispute.dispute_type.replace(/_/g, ' '),
        status: dispute.status,
        priority: 'MEDIUM', // Default since not in schema
        assignedAdmin: dispute.assigned_to,
        slaDeadline: slaDeadline.toISOString(),
        createdAt: dispute.created_at,
        resolvedAt: dispute.resolution_date,
        orderAmount: dispute.orders.total_amount || 0,
        customerEmail: customerProfile?.email || 'Unknown',
        tailorEmail: tailorProfile?.email || 'Unknown',
        adminEmail: adminProfile?.email || null,
        isOverdue,
        hoursUntilSla: Math.max(0, hoursUntilSla),
        messageCount: 0, // Not queried
        evidenceCount: dispute.evidence_urls?.length || 0
      };
    }));

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
    // Get overall dispute counts using existing schema
    const { data: disputeCounts } = await supabase
      .from('disputes')
      .select(`
        status,
        created_at,
        resolution_date
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

    // Count overdue disputes (48 hour SLA)
    const overdueDisputes = disputeCounts.filter((d: any) => {
      if (![DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS].includes(d.status)) return false;
      const slaDeadline = new Date(d.created_at);
      slaDeadline.setHours(slaDeadline.getHours() + 48);
      return slaDeadline < now;
    }).length;

    // Critical priority not tracked in current schema
    const criticalPriority = 0;

    // Calculate average resolution time (in hours)
    const resolvedDisputes = disputeCounts.filter((d: any) =>
      d.resolution_date && d.created_at
    );

    let averageResolutionTime = 0;
    if (resolvedDisputes.length > 0) {
      const totalResolutionTime = resolvedDisputes.reduce((sum: number, d: any) => {
        const createdAt = new Date(d.created_at);
        const resolvedAt = new Date(d.resolution_date);
        return sum + (resolvedAt.getTime() - createdAt.getTime());
      }, 0);

      averageResolutionTime = totalResolutionTime / (resolvedDisputes.length * 1000 * 60 * 60); // Convert to hours
    }

    // Calculate SLA performance (48 hour SLA)
    const disputesWithSLA = disputeCounts.filter((d: any) => d.resolution_date);
    let slaPerformance = 0;

    if (disputesWithSLA.length > 0) {
      const metSLA = disputesWithSLA.filter((d: any) => {
        const createdAt = new Date(d.created_at);
        const resolvedAt = new Date(d.resolution_date);
        const slaDeadline = new Date(createdAt);
        slaDeadline.setHours(slaDeadline.getHours() + 48);
        return resolvedAt <= slaDeadline;
      }).length;

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

    const supabase = await createClient();

    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Update dispute assignment (using existing schema column: assigned_to)
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        assigned_to: adminId,
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

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Assignment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}