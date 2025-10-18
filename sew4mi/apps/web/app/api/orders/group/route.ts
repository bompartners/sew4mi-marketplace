/**
 * Group Orders API Routes
 * GET /api/orders/group - Get all group orders for current user
 * POST /api/orders/group - Create new group order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { groupOrderService } from '@/lib/services/group-order.service';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { CreateGroupOrderRequestSchema } from '@sew4mi/shared/schemas/group-order.schema';
import type { CreateGroupOrderRequest } from '@sew4mi/shared/types/group-order';

/**
 * GET /api/orders/group
 * Get all group orders for the authenticated user
 */
export async function GET() {
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
    
    // Get group orders
    const groupOrders = await groupOrderService.getUserGroupOrders(user.id);
    
    return NextResponse.json({
      success: true,
      groupOrders,
    });
    
  } catch (error) {
    console.error('Error fetching group orders:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

/**
 * POST /api/orders/group
 * Create a new group order
 */
export async function POST(request: NextRequest) {
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
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreateGroupOrderRequestSchema.safeParse(body);
    
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
    
    const groupOrderRequest: CreateGroupOrderRequest = validationResult.data;
    
    // Create group order
    const result = await groupOrderService.createGroupOrder(groupOrderRequest, user.id);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create group order',
          errors: result.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result, { status: 201 });
    
  } catch (error) {
    console.error('Error creating group order:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

