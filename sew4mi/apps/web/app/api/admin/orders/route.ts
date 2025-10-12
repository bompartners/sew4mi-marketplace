import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Check if user has permission to view all orders
    if (!hasPermission(userData.role, PERMISSIONS.VIEW_ALL_ORDERS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const url = new URL(_request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        tailor_id,
        status,
        total_amount,
        created_at,
        updated_at,
        customer:users!customer_id (
          id,
          email,
          full_name
        ),
        tailor:tailor_profiles!tailor_id (
          id,
          business_name,
          user:users!user_id (
            email
          )
        )
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Note: payment_status filtering removed as it's not on orders table
    // Payment status should be derived from payment_transactions table

    if (search) {
      // Search by order number
      query = query.ilike('order_number', `%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by created_at descending (most recent first)
    query = query.order('created_at', { ascending: false });

    const { data: ordersData, error: ordersError, count } = await query;

    if (ordersError) {
      console.error('Failed to fetch orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Transform orders data to flatten nested structures
    const transformedOrders = (ordersData || []).map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      tailor_id: order.tailor_id,
      status: order.status,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      // payment_status can be derived from payment_transactions if needed
      customer: {
        full_name: order.customer?.full_name,
        email: order.customer?.email
      },
      tailor: {
        business_name: order.tailor?.business_name,
        email: order.tailor?.user?.email
      }
    }));

    return NextResponse.json({
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
