/**
 * API Route for Story 4.3: Recommendation Feedback
 * POST /api/recommendations/feedback - Track recommendation engagement
 */

import { NextRequest, NextResponse } from 'next/server';
import { recommendationEngineService } from '@/lib/services/recommendation-engine.service';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { RecommendationAction } from '@sew4mi/shared/types';

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
    const { recommendationId, action } = body;

    if (!recommendationId || !action) {
      return NextResponse.json(
        { error: 'recommendationId and action are required' },
        { status: 400 }
      );
    }

    // Validate action
    if (!['clicked', 'ordered', 'dismissed'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: clicked, ordered, dismissed' },
        { status: 400 }
      );
    }

    // Track engagement
    await recommendationEngineService.trackEngagement(
      user.id,
      recommendationId,
      action as RecommendationAction
    );

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/recommendations/feedback error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to track feedback' },
      { status: 500 }
    );
  }
}
