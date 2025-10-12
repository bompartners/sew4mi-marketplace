/**
 * API Route for Story 4.3: Reorder Preview
 * POST /api/orders/[id]/reorder-preview - Preview reorder with pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { reorderService } from '@/lib/services/reorder.service';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body for modifications
    const body = await request.json();
    const { modifications } = body;

    // Get reorder preview
    const preview = await reorderService.previewReorder(user.id, id, modifications);

    // Get alternative tailors if original is unavailable
    let alternativeTailors = [];
    if (!preview.tailor.availability.available) {
      alternativeTailors = await reorderService.getAlternativeTailors(
        preview.tailor.id,
        preview.order.garmentType,
        3
      );
    }

    return NextResponse.json(
      {
        ...preview,
        alternativeTailors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/orders/[id]/reorder-preview error:', error);

    const message = error instanceof Error ? error.message : 'Failed to preview reorder';
    const status = message.includes('not found') ? 404 :
                   message.includes('Cannot reorder') ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
