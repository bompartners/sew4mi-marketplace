/**
 * Production Schedule API Routes
 * GET /api/tailors/group-orders/[id]/production-schedule - Get production schedule
 * POST /api/tailors/group-orders/[id]/production-schedule - Create/update production schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { ProductionScheduleService } from '@/lib/services/production-schedule.service';
import { ProductionScheduleItem } from '@sew4mi/shared/types/group-order';

/**
 * GET /api/tailors/group-orders/[id]/production-schedule
 * Get production schedule for a group order
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

    const service = new ProductionScheduleService(supabase);
    const schedule = await service.getProductionSchedule(groupOrderId);

    return NextResponse.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('Error fetching production schedule:', error);
    return createErrorResponse(error as Error, 500);
  }
}

/**
 * POST /api/tailors/group-orders/[id]/production-schedule
 * Create or update production schedule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupOrderId } = await params;
    const body: { items: ProductionScheduleItem[]; eventDate: string } = await request.json();

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
      .select('tailor_id, event_date')
      .eq('id', groupOrderId)
      .single();

    if (verifyError || groupOrder?.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const service = new ProductionScheduleService(supabase);
    const eventDate = new Date(body.eventDate || groupOrder.event_date);

    await service.saveProductionSchedule(
      groupOrderId,
      user.id,
      body.items,
      eventDate
    );

    return NextResponse.json({
      success: true,
      message: 'Production schedule saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving production schedule:', error);
    return createErrorResponse(error as Error, 500);
  }
}
