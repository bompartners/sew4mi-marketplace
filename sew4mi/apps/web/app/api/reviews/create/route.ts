/**
 * POST /api/reviews/create
 * Submit a new review for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReviewService } from '@/lib/services/review.service';
import { createReviewSchema } from '@sew4mi/shared/types/review';

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = createReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = validation.data;

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, tailor_id')
      .eq('id', input.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only review your own orders' },
        { status: 403 }
      );
    }

    // Create review using service
    const service = new ReviewService();
    const review = await service.submitReview(input, user.id, order.tailor_id);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    );
  }
}

