/**
 * Individual Tailor Group Order API Routes
 * GET /api/tailors/group-orders/[id] - Get detailed group order with coordination data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/utils/api-error-handler';

/**
 * GET /api/tailors/group-orders/[id]
 * Get detailed group order information with coordination data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupOrderId = params.id;

    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query group order with all related data
    const { data: groupOrder, error: queryError } = await supabase
      .from('group_orders')
      .select(`
        *,
        group_order_items (
          *,
          orders (
            customer_id,
            measurements,
            special_instructions
          )
        ),
        tailor_group_coordination (*),
        design_suggestions (*),
        fabric_allocations (*),
        production_schedules (*)
      `)
      .eq('id', groupOrderId)
      .eq('tailor_id', user.id)
      .single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Group order not found or access denied' },
          { status: 404 }
        );
      }
      throw queryError;
    }

    return NextResponse.json({
      success: true,
      groupOrder
    });
    
  } catch (error) {
    console.error('Error fetching group order details:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

