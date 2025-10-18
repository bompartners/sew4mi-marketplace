/**
 * API Routes for Story 4.3: Individual Favorite Order Operations
 * PUT /api/favorites/[id] - Update favorite nickname
 * DELETE /api/favorites/[id] - Remove from favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { favoriteOrdersService } from '@/lib/services/favorite-orders.service';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

export async function PUT(
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

    // Parse request body
    const body = await request.json();
    const { nickname } = body;

    if (!nickname) {
      return NextResponse.json(
        { error: 'nickname is required' },
        { status: 400 }
      );
    }

    // Update nickname
    const favorite = await favoriteOrdersService.updateNickname(user.id, id, nickname);

    return NextResponse.json(favorite, { status: 200 });
  } catch (error) {
    console.error('PUT /api/favorites/[id] error:', error);

    const message = error instanceof Error ? error.message : 'Failed to update favorite';
    const status = message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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

    // Remove favorite
    await favoriteOrdersService.removeFavorite(user.id, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/favorites/[id] error:', error);

    const message = error instanceof Error ? error.message : 'Failed to delete favorite';
    const status = message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
