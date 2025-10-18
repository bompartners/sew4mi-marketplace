/**
 * GET /api/reviews/tailor/[id]
 * Get reviews for a specific tailor with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReviewService } from '@/lib/services/review.service';
import { reviewQuerySchema } from '@sew4mi/shared/types/review';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: tailorId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = {
      tailorId,
      sortBy: searchParams.get('sortBy') || 'newest',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Validate query parameters
    const validation = reviewQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Fetch reviews
    const service = new ReviewService();
    const result = await service.getReviewsForTailor(tailorId, validation.data);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tailor reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

