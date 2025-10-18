/**
 * PATCH /api/reviews/[id]/moderate
 * Moderate a review (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReviewService } from '@/lib/services/review.service';
import { moderateReviewSchema } from '@sew4mi/shared/types/review';

export async function PATCH(
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

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You must be an admin to moderate reviews' },
        { status: 403 }
      );
    }

    const { id: reviewId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = moderateReviewSchema.safeParse({
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

    // Moderate review
    const service = new ReviewService();
    const review = await service.moderateReview(
      reviewId,
      validation.data.status,
      user.id,
      validation.data.reason
    );

    return NextResponse.json({ review }, { status: 200 });
  } catch (error: any) {
    console.error('Error moderating review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to moderate review' },
      { status: 500 }
    );
  }
}

