/**
 * POST /api/reviews/[id]/response
 * Tailor response to a review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReviewService } from '@/lib/services/review.service';
import { createResponseSchema } from '@sew4mi/shared/types/review';

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
    const validation = createResponseSchema.safeParse({
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

    // Get tailor profile for user
    const { data: tailorProfile, error: profileError } = await supabase
      .from('tailor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !tailorProfile) {
      return NextResponse.json(
        { error: 'You must be a tailor to respond to reviews' },
        { status: 403 }
      );
    }

    // Verify review is for this tailor
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('tailor_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.tailor_id !== tailorProfile.id) {
      return NextResponse.json(
        { error: 'You can only respond to your own reviews' },
        { status: 403 }
      );
    }

    // Create response
    const service = new ReviewService();
    const response = await service.respondToReview(
      reviewId,
      tailorProfile.id,
      validation.data.responseText
    );

    return NextResponse.json({ response }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating response:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create response' },
      { status: 500 }
    );
  }
}

