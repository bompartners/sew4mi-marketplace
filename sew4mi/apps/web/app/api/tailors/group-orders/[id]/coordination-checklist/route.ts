/**
 * Coordination Checklist API Routes
 * GET /api/tailors/group-orders/[id]/coordination-checklist - Get checklist
 * PUT /api/tailors/group-orders/[id]/coordination-checklist - Update checklist completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { TailorGroupOrderRepository } from '@/lib/repositories/tailor-group-order.repository';

interface CompletedChecklist {
  checklistItems: any[];
  overallNotes: string;
  coordinationPhotos: string[];
  approvedForCompletion: boolean;
}

/**
 * GET /api/tailors/group-orders/[id]/coordination-checklist
 * Get coordination checklist for a group order
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

    const repository = new TailorGroupOrderRepository(supabase);
    const checklist = await repository.getCoordinationChecklist(groupOrderId);

    return NextResponse.json({
      success: true,
      checklist
    });
    
  } catch (error) {
    console.error('Error fetching coordination checklist:', error);
    return createErrorResponse(error as Error, 500);
  }
}

/**
 * PUT /api/tailors/group-orders/[id]/coordination-checklist
 * Update checklist completion status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    const checklist: CompletedChecklist = await request.json();

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

    const repository = new TailorGroupOrderRepository(supabase);
    await repository.upsertCoordinationChecklist(groupOrderId, checklist);

    // If approved for completion, update group order status
    if (checklist.approvedForCompletion) {
      await supabase
        .from('group_orders')
        .update({
          status: 'COMPLETED',
          updated_at: new Date().toISOString()
        })
        .eq('id', groupOrderId);

      // Send completion notifications to all customers
      const { data: items } = await supabase
        .from('group_order_items')
        .select('payment_responsibility, family_member_name')
        .eq('group_order_id', groupOrderId);

      if (items) {
        // TODO: Send completion notifications via notification service
        console.log('Completion notifications would be sent to:', items);
      }
    }

    return NextResponse.json({
      success: true,
      message: checklist.approvedForCompletion 
        ? 'Group order marked as complete' 
        : 'Checklist saved successfully'
    });
    
  } catch (error) {
    console.error('Error updating coordination checklist:', error);
    return createErrorResponse(error as Error, 500);
  }
}
