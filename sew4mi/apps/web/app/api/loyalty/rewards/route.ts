/**
 * API Route for Story 4.3: Loyalty Rewards
 * GET /api/loyalty/rewards - Get available rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { loyaltyService } from '@/lib/services/loyalty.service';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    // Get query parameter to filter affordable rewards
    const { searchParams } = new URL(request.url);
    const affordableOnly = searchParams.get('affordable') === 'true';

    // Get rewards
    const rewards = affordableOnly
      ? await loyaltyService.getAffordableRewards(user.id)
      : await loyaltyService.getActiveRewards();

    return NextResponse.json({ rewards }, { status: 200 });
  } catch (error) {
    console.error('GET /api/loyalty/rewards error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}
