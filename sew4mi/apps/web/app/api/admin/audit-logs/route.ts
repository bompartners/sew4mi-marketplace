import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { hasPermission, PERMISSIONS } from '@sew4mi/shared';

export async function GET(_request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user role' },
        { status: 403 }
      );
    }

    // Check if user has permission to view audit logs
    if (!hasPermission(userData.role, PERMISSIONS.VIEW_AUDIT_LOGS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const url = new URL(_request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500); // Max 500
    const table = url.searchParams.get('table');
    const action = url.searchParams.get('action');
    const search = url.searchParams.get('search');
    const timeframe = url.searchParams.get('timeframe'); // 1h, 24h, 7d, 30d

    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        performed_at,
        ip_address,
        user_agent,
        metadata,
        users!audit_logs_user_id_fkey(
          email,
          full_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (table && table !== 'all') {
      query = query.eq('table_name', table);
    }

    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    if (search) {
      // Search across multiple fields
      query = query.or(`
        table_name.ilike.%${search}%,
        action.ilike.%${search}%,
        metadata->>action_type.ilike.%${search}%
      `);
    }

    // Time-based filtering
    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let hoursBack: number;
      
      switch (timeframe) {
        case '1h':
          hoursBack = 1;
          break;
        case '24h':
          hoursBack = 24;
          break;
        case '7d':
          hoursBack = 7 * 24;
          break;
        case '30d':
          hoursBack = 30 * 24;
          break;
        default:
          hoursBack = 24 * 365; // 1 year default
      }
      
      const cutoffDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
      query = query.gte('performed_at', cutoffDate.toISOString());
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by performed_at descending (most recent first)
    query = query.order('performed_at', { ascending: false });

    const { data: logsData, error: logsError, count } = await query;

    if (logsError) {
      console.error('Failed to fetch audit logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logsData || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Audit logs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}