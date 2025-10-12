import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { tailorProfileService } from '@/lib/services/tailor-profile.service';
import { CreateReviewSchema } from '@sew4mi/shared';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(_request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const tailorId = (await params).id;
    const reviews = await tailorProfileService.getReviews(tailorId, page, limit);

    return NextResponse.json({
      data: reviews,
      pagination: {
        page,
        limit,
        hasMore: reviews.length === limit,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const tailorId = (await params).id;
    const body = await _request.json();

    // Validate the request body
    const result = CreateReviewSchema.safeParse({
      ...body,
      tailorId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.errors },
        { status: 400 }
      );
    }

    const reviewData = result.data;

    const review = await tailorProfileService.createReview(user.id, reviewData);

    if (!review) {
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: review,
      success: true,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    
    if (error instanceof Error && error.message === 'You cannot review this order') {
      return NextResponse.json(
        { error: 'You are not authorized to review this order' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}