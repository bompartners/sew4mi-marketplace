/**
 * API Route for Story 4.3: Reorder
 * POST /api/orders/reorder - Create a reorder from an existing order
 */

import { NextRequest, NextResponse } from 'next/server';
import { reorderService } from '@/lib/services/reorder.service';
import { createServerSupabaseClient } from '@/lib/supabase';

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

    // Parse request body
    const body = await request.json();
    const { orderId, modifications } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    // Create reorder
    const newOrder = await reorderService.createReorder(user.id, { orderId, modifications });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders/reorder error:', error);

    const message = error instanceof Error ? error.message : 'Failed to create reorder';
    const status = message.includes('not found') ? 404 :
                   message.includes('Cannot reorder') ? 400 :
                   message.includes('not available') ? 409 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
