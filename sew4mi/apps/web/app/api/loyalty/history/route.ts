/**
 * API Route for Story 4.3: Loyalty Transaction History
 * GET /api/loyalty/history - Get transaction history with pagination
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get transaction history
    const transactions = await loyaltyService.getTransactionHistory(user.id, limit);

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error('GET /api/loyalty/history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}
