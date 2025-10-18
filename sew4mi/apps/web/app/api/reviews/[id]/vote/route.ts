/**
 * POST /api/reviews/[id]/vote
 * Submit a helpful/unhelpful vote on a review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReviewService } from '@/lib/services/review.service';
import { voteReviewSchema } from '@sew4mi/shared/types/review';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reviewId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = voteReviewSchema.safeParse({
      ...body,
      reviewId,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Submit vote
    const service = new ReviewService();
    const vote = await service.voteOnReview(reviewId, user.id, validation.data.voteType);

    return NextResponse.json({ vote }, { status: 200 });
  } catch (error: any) {
    console.error('Error submitting vote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit vote' },
      { status: 500 }
    );
  }
}

