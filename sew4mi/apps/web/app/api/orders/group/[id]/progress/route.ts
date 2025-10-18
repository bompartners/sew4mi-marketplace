/**
 * Group Order Progress Tracking API Route
 * GET /api/orders/group/[id]/progress - Get group order progress summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { groupOrderService } from '@/lib/services/group-order.service';
import { createErrorResponse } from '@/lib/utils/api-error-handler';

/**
 * GET /api/orders/group/[id]/progress
 * Get group order progress summary with individual item status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeItems = searchParams.get('includeItems') === 'true';
    
    // Verify user has access to this group order
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
    
    // Check if user is organizer or participant
    const isOrganizer = groupOrder.organizer_id === user.id;
    
    if (!isOrganizer) {
      // Check if user is a participant
      const { data: items } = await supabase
        .from('group_order_items')
        .select('payment_responsibility')
        .eq('group_order_id', groupOrderId);
      
      const isParticipant = items?.some(item => item.payment_responsibility === user.id);
      
      if (!isParticipant) {
        return NextResponse.json(
          { error: 'Forbidden - You do not have access to this group order' },
          { status: 403 }
        );
      }
    }
    
    // Update and get progress summary
    const progressSummary = await groupOrderService.updateGroupOrderProgress(groupOrderId);
    
    if (!progressSummary) {
      return NextResponse.json(
        { error: 'Failed to fetch progress summary' },
        { status: 500 }
      );
    }
    
    // Get items if requested
    let items = null;
    if (includeItems) {
      const { data: itemsData } = await supabase
        .from('group_order_items')
        .select('*')
        .eq('group_order_id', groupOrderId)
        .order('delivery_priority', { ascending: true });
      
      items = itemsData;
    }
    
    // Calculate next actions
    const nextActions: string[] = [];
    
    if (progressSummary.pendingItems > 0) {
      nextActions.push('Complete deposit payment for pending items');
    }
    
    if (progressSummary.readyForDelivery > 0) {
      nextActions.push(`${progressSummary.readyForDelivery} item(s) ready for pickup/delivery`);
    }
    
    if (progressSummary.completedItems === progressSummary.totalItems) {
      nextActions.push('All items completed - Ready for final review');
    }
    
    return NextResponse.json({
      success: true,
      groupOrderId,
      progressSummary,
      items,
      nextActions,
    });
    
  } catch (error) {
    console.error('Error fetching group order progress:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

