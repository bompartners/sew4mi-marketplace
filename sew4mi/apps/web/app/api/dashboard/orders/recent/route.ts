import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/dashboard/orders/recent
 * Fetch recent orders for the authenticated user
 * Returns last 5 orders with tailor and status information
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

    // Fetch recent orders with tailor information
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        garment_type,
        total_amount,
        created_at,
        delivery_date,
        completed_at,
        tailor_id,
        tailor_profiles (
          id,
          business_name
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.error('Failed to fetch recent orders:', ordersError);
      console.error('Error details:', JSON.stringify(ordersError, null, 2));
      // Return empty array instead of error if it's just a query issue
      return NextResponse.json({ orders: [] }, {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    // Transform data for frontend
    const recentOrders = (orders || []).map(order => {
      const tailorProfiles: any = order.tailor_profiles;
      const tailorName = (tailorProfiles && tailorProfiles.business_name)
        ? tailorProfiles.business_name
        : 'Unknown Tailor';

      return {
      id: order.id,
      tailorName,
      garmentType: order.garment_type || 'Custom Garment',
      status: order.status,
      orderDate: order.created_at,
      estimatedDelivery: order.delivery_date,
      completedDate: order.completed_at,
      amount: order.total_amount || 0,
      };
    });

    return NextResponse.json({ orders: recentOrders }, {
      headers: {
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute (more dynamic data)
      },
    });
  } catch (error) {
    console.error('Dashboard recent orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent orders' },
      { status: 500 }
    );
  }
}
