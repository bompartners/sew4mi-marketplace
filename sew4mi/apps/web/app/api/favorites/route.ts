/**
 * API Routes for Story 4.3: Favorite Orders
 * GET /api/favorites - Get user's favorite orders
 * POST /api/favorites - Add order to favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { favoriteOrdersService } from '@/lib/services/favorite-orders.service';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

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

    // Get user's favorites with order details
    const favorites = await favoriteOrdersService.getUserFavorites(user.id);

    return NextResponse.json(favorites, { status: 200 });
  } catch (error) {
    console.error('GET /api/favorites error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

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
    const { orderId, nickname } = body;

    if (!orderId || !nickname) {
      return NextResponse.json(
        { error: 'orderId and nickname are required' },
        { status: 400 }
      );
    }

    // Add to favorites
    const favorite = await favoriteOrdersService.addToFavorites(user.id, { orderId, nickname });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error('POST /api/favorites error:', error);

    const message = error instanceof Error ? error.message : 'Failed to add favorite';
    const status = message.includes('already in favorites') ? 409 :
                   message.includes('Maximum') ? 400 :
                   message.includes('completed') ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
