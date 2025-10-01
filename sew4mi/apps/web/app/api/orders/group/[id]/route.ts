/**
 * Individual Group Order API Routes
 * GET /api/orders/group/[id] - Get group order summary
 * PUT /api/orders/group/[id] - Update group order
 * DELETE /api/orders/group/[id] - Cancel group order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { groupOrderService } from '@/lib/services/group-order.service';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { UpdateGroupOrderRequestSchema } from '@sew4mi/shared/schemas/group-order.schema';

/**
 * GET /api/orders/group/[id]
 * Get group order summary with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    
    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get group order summary
    const groupOrderSummary = await groupOrderService.getGroupOrderSummary(groupOrderId);
    
    if (!groupOrderSummary) {
      return NextResponse.json(
        { error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this group order
    if (groupOrderSummary.groupOrder.organizerId !== user.id) {
      // Check if user is a participant
      const isParticipant = groupOrderSummary.items.some(
        item => item.paymentResponsibility === user.id
      );
      
      if (!isParticipant) {
        return NextResponse.json(
          { error: 'Forbidden - You do not have access to this group order' },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      ...groupOrderSummary,
    });
    
  } catch (error) {
    console.error('Error fetching group order:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

/**
 * PUT /api/orders/group/[id]
 * Update group order details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    
    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify user is organizer
    const { data: groupOrder, error: fetchError } = await supabase
      .from('group_orders')
      .select('organizer_id')
      .eq('id', groupOrderId)
      .single();
    
    if (fetchError || !groupOrder) {
      return NextResponse.json(
        { error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    if (groupOrder.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Only organizer can update group order' },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateGroupOrderRequestSchema.safeParse({
      id: groupOrderId,
      updates: body,
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Update group order
    const { error: updateError } = await supabase
      .from('group_orders')
      .update({
        ...validationResult.data.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupOrderId);
    
    if (updateError) {
      throw new Error(`Failed to update group order: ${updateError.message}`);
    }
    
    // Get updated group order
    const updatedGroupOrder = await groupOrderService.getGroupOrderSummary(groupOrderId);
    
    return NextResponse.json({
      success: true,
      groupOrder: updatedGroupOrder?.groupOrder,
    });
    
  } catch (error) {
    console.error('Error updating group order:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

/**
 * DELETE /api/orders/group/[id]
 * Cancel group order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    
    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify user is organizer
    const { data: groupOrder, error: fetchError } = await supabase
      .from('group_orders')
      .select('organizer_id, status')
      .eq('id', groupOrderId)
      .single();
    
    if (fetchError || !groupOrder) {
      return NextResponse.json(
        { error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    if (groupOrder.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Only organizer can cancel group order' },
        { status: 403 }
      );
    }
    
    // Check if group order can be cancelled
    if (['COMPLETED', 'CANCELLED'].includes(groupOrder.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel a completed or already cancelled group order' },
        { status: 400 }
      );
    }
    
    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('group_orders')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupOrderId);
    
    if (updateError) {
      throw new Error(`Failed to cancel group order: ${updateError.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Group order cancelled successfully',
    });
    
  } catch (error) {
    console.error('Error cancelling group order:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

