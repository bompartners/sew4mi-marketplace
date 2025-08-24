import { NextRequest, NextResponse } from 'next/server';
import { createDisputeSchema } from '@sew4mi/shared/schemas';
import { DisputeService } from '@/lib/services/dispute.service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await _request.json();
    const validationResult = createDisputeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    // Verify authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, tailor_id')
      .eq('id', validationResult.data.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is either customer or tailor for this order
    if (order.customer_id !== user.id && order.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check for existing open disputes for this order
    const { data: existingDispute } = await supabase
      .from('disputes')
      .select('id')
      .eq('order_id', validationResult.data.orderId)
      .in('status', ['OPEN', 'IN_PROGRESS', 'ESCALATED'])
      .single();

    if (existingDispute) {
      return NextResponse.json(
        { error: 'An active dispute already exists for this order' },
        { status: 409 }
      );
    }

    // Create dispute
    const disputeService = new DisputeService();
    const result = await disputeService.createDispute({
      ...validationResult.data
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Dispute created successfully',
        dispute: result.data 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create dispute error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}