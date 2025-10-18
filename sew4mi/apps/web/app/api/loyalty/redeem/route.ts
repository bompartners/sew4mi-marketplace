/**
 * API Route for Story 4.3: Redeem Loyalty Points
 * POST /api/loyalty/redeem - Redeem points for a reward
 * Rate Limited: 5 requests per hour per user
 */

import { NextRequest, NextResponse } from 'next/server';
import { loyaltyService } from '@/lib/services/loyalty.service';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit, loyaltyRedemptionRateLimit } from '@/lib/middleware/rate-limit';

async function handler(request: NextRequest): Promise<NextResponse> {
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
    const { rewardId, orderId } = body;

    if (!rewardId) {
      return NextResponse.json(
        { error: 'rewardId is required' },
        { status: 400 }
      );
    }

    // Redeem reward
    const result = await loyaltyService.redeemReward(user.id, rewardId, orderId);

    // Calculate discount details
    let discount = null;
    if (result.reward.discountPercentage || result.reward.discountAmount) {
      discount = {
        type: result.reward.rewardType,
        percentage: result.reward.discountPercentage,
        amount: result.reward.discountAmount,
      };
    }

    return NextResponse.json(
      {
        account: result.account,
        reward: result.reward,
        discount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/loyalty/redeem error:', error);

    const message = error instanceof Error ? error.message : 'Failed to redeem reward';
    const status = message.includes('not found') ? 404 :
                   message.includes('Insufficient points') ? 400 :
                   message.includes('no longer active') ? 410 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// Export rate-limited POST handler
export const POST = withRateLimit(handler, loyaltyRedemptionRateLimit);
