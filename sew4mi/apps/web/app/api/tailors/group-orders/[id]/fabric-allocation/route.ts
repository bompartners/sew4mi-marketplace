/**
 * Fabric Allocation API Routes
 * GET /api/tailors/group-orders/[id]/fabric-allocation - Get fabric calculations
 * POST /api/tailors/group-orders/[id]/fabric-allocation - Create/update fabric allocation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { FabricQuantityCalculation } from '@sew4mi/shared/types/group-order';

/**
 * GET /api/tailors/group-orders/[id]/fabric-allocation
 * Get fabric allocation calculations for a group order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get fabric allocations
    const { data: allocations, error: queryError } = await supabase
      .from('fabric_allocations')
      .select('*')
      .eq('group_order_id', groupOrderId);

    if (queryError) {
      throw queryError;
    }

    // Get coordination info for buffer percentage
    const { data: coordination } = await supabase
      .from('tailor_group_coordination')
      .select('fabric_buffer_percentage, total_fabric_needed')
      .eq('group_order_id', groupOrderId)
      .single();

    return NextResponse.json({
      success: true,
      allocations: allocations || [],
      coordination
    });
    
  } catch (error) {
    console.error('Error fetching fabric allocation:', error);
    return createErrorResponse(error as Error, 500);
  }
}

/**
 * POST /api/tailors/group-orders/[id]/fabric-allocation
 * Create or update fabric allocation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    const body: FabricQuantityCalculation = await request.json();

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify tailor owns this group order
    const { data: groupOrder, error: verifyError } = await supabase
      .from('group_orders')
      .select('tailor_id')
      .eq('id', groupOrderId)
      .single();

    if (verifyError || groupOrder?.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update coordination record
    const { error: coordError } = await supabase
      .from('tailor_group_coordination')
      .upsert({
        group_order_id: groupOrderId,
        tailor_id: user.id,
        total_fabric_needed: body.totalYardsNeeded,
        fabric_buffer_percentage: body.bufferPercentage,
        updated_at: new Date().toISOString()
      });

    if (coordError) {
      throw coordError;
    }

    // Update individual allocations
    const allocationPromises = body.individualAllocations.map(alloc =>
      supabase
        .from('fabric_allocations')
        .upsert({
          group_order_id: groupOrderId,
          group_order_item_id: alloc.orderId,
          allocated_yardage: alloc.yardsAllocated,
          updated_at: new Date().toISOString()
        })
    );

    await Promise.all(allocationPromises);

    return NextResponse.json({
      success: true,
      message: 'Fabric allocation saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving fabric allocation:', error);
    return createErrorResponse(error as Error, 500);
  }
}

