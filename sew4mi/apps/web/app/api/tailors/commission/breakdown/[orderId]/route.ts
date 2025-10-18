import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CommissionService } from '@/lib/services/commission.service';
import { z } from 'zod';

const OrderIdParamSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID')
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a tailor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Access denied. Tailor role required.' },
        { status: 403 }
      );
    }

    // Validate order ID parameter
    const parsed = OrderIdParamSchema.safeParse({ orderId: (await params).orderId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const { orderId } = parsed.data;

    // Verify the order belongs to this tailor
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('tailor_id, total_amount, status')
      .eq('id', orderId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    if (orderData.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied. You can only view commission breakdown for your own orders.' },
        { status: 403 }
      );
    }

    // Get commission breakdown
    const commissionService = new CommissionService();
    const breakdown = await commissionService.getCommissionBreakdown(orderId);

    // Get commission record details
    const commissionRecords = await commissionService.getCommissionRecordsByTailor(user.id);
    const orderCommissionRecord = commissionRecords.find(record => record.orderId === orderId);

    return NextResponse.json({
      success: true,
      data: {
        breakdown,
        commissionRecord: orderCommissionRecord,
        orderInfo: {
          orderId,
          totalAmount: orderData.total_amount,
          status: orderData.status
        }
      }
    });

  } catch (error) {
    console.error('Error fetching commission breakdown:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch commission breakdown',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}