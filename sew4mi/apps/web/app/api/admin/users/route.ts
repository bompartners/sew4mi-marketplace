import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { hasPermission, PERMISSIONS } from '@sew4mi/shared';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    // Check if user has permission to view all users
    if (!hasPermission(userData.role, PERMISSIONS.VIEW_ALL_USERS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const url = new URL(_request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');

    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone_number,
        role,
        phone_verified,
        created_at,
        updated_at,
        metadata
      `, { count: 'exact' });

    // Apply filters
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data: usersData, error: usersError, count } = await query;

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Create admin client with service role for auth data access
    const adminClient = createServiceRoleClient();

    // Get auth data for each user from auth.users (admin only)
    const transformedUsers = await Promise.all(
      (usersData || []).map(async (user: any) => {
        // Try to get auth metadata - this might fail for some users
        let emailConfirmed = false;
        let lastSignInAt = null;

        try {
          const { data: authData } = await adminClient.auth.admin.getUserById(user.id);
          emailConfirmed = !!authData?.user?.email_confirmed_at;
          lastSignInAt = authData?.user?.last_sign_in_at || null;
        } catch (error) {
          // If auth lookup fails, continue with defaults
          console.error(`Failed to fetch auth data for user ${user.id}:`, error);
        }

        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          role: user.role,
          phone_verified: user.phone_verified,
          created_at: user.created_at,
          updated_at: user.updated_at,
          metadata: user.metadata || {},
          email_confirmed: emailConfirmed,
          last_sign_in_at: lastSignInAt
        };
      })
    );

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    // Check permissions for user management
    if (!hasPermission(userData.role, PERMISSIONS.VIEW_ALL_USERS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await _request.json();
    const { action, userIds } = body;

    // Handle bulk operations
    if (action && userIds && Array.isArray(userIds)) {
      // Implement bulk operations here
      return NextResponse.json(
        { message: 'Bulk operations not yet implemented' },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}