/**
 * Design Suggestions API Routes
 * GET /api/tailors/group-orders/[id]/design-suggestions - Get design suggestions
 * POST /api/tailors/group-orders/[id]/design-suggestions - Submit design suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { TailorGroupCoordinationService } from '@/lib/services/tailor-group-coordination.service';
import { DesignSuggestionSubmission } from '@sew4mi/shared/types/group-order';

/**
 * GET /api/tailors/group-orders/[id]/design-suggestions
 * Get all design suggestions for a group order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupOrderId = params.id;

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const service = new TailorGroupCoordinationService(supabase);
    const suggestions = await service.getDesignSuggestions(groupOrderId);

    return NextResponse.json({
      success: true,
      suggestions
    });
    
  } catch (error) {
    console.error('Error fetching design suggestions:', error);
    return createErrorResponse(error as Error, 500);
  }
}

/**
 * POST /api/tailors/group-orders/[id]/design-suggestions
 * Submit a new design suggestion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupOrderId = params.id;
    const submission: DesignSuggestionSubmission = await request.json();

    const supabase = createServerSupabaseClient();
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

    const service = new TailorGroupCoordinationService(supabase);
    const suggestion = await service.submitDesignSuggestion(
      groupOrderId,
      user.id,
      submission
    );

    return NextResponse.json({
      success: true,
      suggestion,
      message: 'Design suggestion submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting design suggestion:', error);
    return createErrorResponse(error as Error, 500);
  }
}
