/**
 * API Route for Story 4.3: Loyalty Account
 * GET /api/loyalty/account - Get loyalty account details and recent transactions
 */

import { NextResponse } from 'next/server';
import { loyaltyService } from '@/lib/services/loyalty.service';
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

    // Get loyalty account and recent transactions
    const account = await loyaltyService.getAccount(user.id);
    const recentTransactions = await loyaltyService.getRecentTransactions(user.id, 10);

    // Calculate points needed for next tier
    const pointsForNextTier = loyaltyService.getPointsForNextTier(
      account.lifetimePoints,
      account.tier
    );

    return NextResponse.json(
      {
        account,
        recentTransactions,
        pointsForNextTier,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/loyalty/account error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch loyalty account' },
      { status: 500 }
    );
  }
}
