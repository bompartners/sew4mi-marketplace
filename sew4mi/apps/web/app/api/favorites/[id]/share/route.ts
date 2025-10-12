/**
 * API Route for Story 4.3: Share Favorite with Family
 * PUT /api/favorites/[id]/share - Share favorite with family profiles
 */

import { NextRequest, NextResponse } from 'next/server';
import { favoriteOrdersService } from '@/lib/services/favorite-orders.service';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    const { profileIds } = body;

    if (!Array.isArray(profileIds)) {
      return NextResponse.json(
        { error: 'profileIds must be an array' },
        { status: 400 }
      );
    }

    // Share favorite
    const favorite = await favoriteOrdersService.shareFavorite(user.id, id, profileIds);

    return NextResponse.json(favorite, { status: 200 });
  } catch (error) {
    console.error('PUT /api/favorites/[id]/share error:', error);

    const message = error instanceof Error ? error.message : 'Failed to share favorite';
    const status = message.includes('not found') ? 404 :
                   message.includes('invalid') ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
