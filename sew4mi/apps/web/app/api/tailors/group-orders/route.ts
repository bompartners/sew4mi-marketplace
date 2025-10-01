/**
 * Tailor Group Orders API Routes
 * GET /api/tailors/group-orders - Get all group orders assigned to tailor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { EnhancedGroupOrder } from '@sew4mi/shared/types/group-order';

/**
 * GET /api/tailors/group-orders
 * Get all group orders assigned to the authenticated tailor
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a tailor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'tailor') {
      return NextResponse.json(
        { error: 'Access denied. Tailor role required.' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');

    // Query group orders assigned to this tailor
    let query = supabase
      .from('group_orders')
      .select(`
        *,
        group_order_items (
          id,
          order_id,
          family_member_profile_id,
          family_member_name,
          garment_type,
          individual_discount,
          delivery_priority,
          payment_responsibility,
          individual_amount,
          discounted_amount,
          status,
          progress_percentage,
          estimated_delivery,
          actual_delivery,
          created_at,
          updated_at
        ),
        tailor_group_coordination (
          total_fabric_needed,
          fabric_buffer_percentage,
          production_priority,
          estimated_completion_date,
          coordination_notes
        )
      `)
      .eq('tailor_id', user.id)
      .order('event_date', { ascending: true, nullsFirst: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: groupOrders, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // Transform to EnhancedGroupOrder format with progress summary
    const enhancedOrders: EnhancedGroupOrder[] = (groupOrders || []).map((order: any) => {
      const items = order.group_order_items || [];
      
      // Calculate progress summary
      const totalItems = items.length;
      const completedItems = items.filter((i: any) => i.status === 'COMPLETED').length;
      const inProgressItems = items.filter((i: any) => 
        ['IN_PROGRESS', 'AWAITING_FITTING', 'AWAITING_FINAL_PAYMENT'].includes(i.status)
      ).length;
      const pendingItems = items.filter((i: any) => 
        ['PENDING', 'AWAITING_DEPOSIT', 'DEPOSIT_RECEIVED'].includes(i.status)
      ).length;
      const readyForDelivery = items.filter((i: any) => i.status === 'READY_FOR_DELIVERY').length;
      
      const overallProgressPercentage = totalItems > 0
        ? items.reduce((sum: number, item: any) => sum + (item.progress_percentage || 0), 0) / totalItems
        : 0;

      return {
        ...order,
        items,
        progressSummary: {
          totalItems,
          completedItems,
          inProgressItems,
          readyForDelivery,
          pendingItems,
          overallProgressPercentage,
          nextGroupMilestone: completedItems === totalItems ? 'All Complete' : 'In Progress'
        }
      };
    });
    
    return NextResponse.json({
      success: true,
      groupOrders: enhancedOrders,
      count: enhancedOrders.length
    });
    
  } catch (error) {
    console.error('Error fetching tailor group orders:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

