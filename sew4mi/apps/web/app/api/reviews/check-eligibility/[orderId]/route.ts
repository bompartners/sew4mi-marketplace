/**
 * GET /api/reviews/check-eligibility/[orderId]
 * Check if an order is eligible for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReviewService } from '@/lib/services/review.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
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

    const { orderId } = await params;

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only check eligibility for your own orders' },
        { status: 403 }
      );
    }

    // Check eligibility
    const service = new ReviewService();
    const eligibility = await service.checkEligibility(orderId);

    return NextResponse.json(eligibility, { status: 200 });
  } catch (error: any) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}

