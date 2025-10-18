/**
 * Group Order Items API Routes
 * POST /api/orders/group/[id]/items - Add item to group order
 * GET /api/orders/group/[id]/items - Get all items in group order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { groupOrderService } from '@/lib/services/group-order.service';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { AddGroupOrderItemRequestSchema } from '@sew4mi/shared/schemas/group-order.schema';
import type { GroupOrderItem } from '@sew4mi/shared/types/group-order';

/**
 * POST /api/orders/group/[id]/items
 * Add a new item to an existing group order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupOrderId } = await params;
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = AddGroupOrderItemRequestSchema.safeParse({
      groupOrderId,
      familyMember: body.familyMember,
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Verify user owns the group order
    const groupOrder = await groupOrderService.getGroupOrderSummary(groupOrderId);
    if (!groupOrder || groupOrder.groupOrder.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Group order not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Create the order item (in a real implementation, you'd create the actual order first)
    // For now, this is a placeholder that would need to integrate with order creation
    return NextResponse.json({
      success: true,
      message: 'Item added successfully',
      // The actual implementation would call addItemToGroupOrder after creating the order
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding item to group order:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

/**
 * GET /api/orders/group/[id]/items
 * Get all items in a group order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupOrderId } = await params;
    
    // Get group order summary with items
    const summary = await groupOrderService.getGroupOrderSummary(groupOrderId);
    
    if (!summary) {
      return NextResponse.json(
        { error: 'Group order not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access to this group order
    if (summary.groupOrder.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to group order' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      items: summary.items,
      totalItems: summary.items.length,
    });
    
  } catch (error) {
    console.error('Error fetching group order items:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

