import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/dashboard/stats
 * Fetch dashboard statistics for the authenticated user
 * Returns order counts, measurements, and activity metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Fetch dashboard statistics in parallel for performance
    const [ordersResult, measurementsResult] = await Promise.all([
      // Get order statistics
      supabase
        .from('orders')
        .select('id, status', { count: 'exact' })
        .eq('customer_id', user.id),

      // Get measurement profiles count
      supabase
        .from('measurement_profiles')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id),
    ]);

    if (ordersResult.error) {
      console.error('Failed to fetch orders:', ordersResult.error);
    }

    if (measurementsResult.error) {
      console.error('Failed to fetch measurements:', measurementsResult.error);
    }

    // Calculate order statistics
    const orders = ordersResult.data || [];
    const stats = {
      orders: {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        inProgress: orders.filter(o => ['IN_PROGRESS', 'MEASUREMENT_REVIEW', 'IN_PRODUCTION'].includes(o.status || '')).length,
        completed: orders.filter(o => o.status === 'COMPLETED').length,
      },
      measurements: {
        profiles: measurementsResult.count || 0,
      },
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
