import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { PaymentAnalyticsService } from '@/lib/services/payment-analytics.service';
import { z } from 'zod';

const PaymentHistoryQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => Math.max(1, parseInt(val) || 1)),
  limit: z.string().optional().default('25').transform(val => Math.min(100, Math.max(1, parseInt(val) || 25))),
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
  status: z.string().optional().transform(val => 
    val ? val.split(',').filter(s => ['PENDING', 'COMPLETED', 'DISPUTED', 'REFUNDED'].includes(s)) : undefined
  ),
  orderNumber: z.string().optional(),
  customerName: z.string().optional(),
  minAmount: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxAmount: z.string().optional().transform(val => val ? parseFloat(val) : undefined)
});

export async function GET(_request: NextRequest) {
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

    // Parse and validate query parameters
    const url = new URL(_request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const parsed = PaymentHistoryQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, dateFrom, dateTo, status, orderNumber, customerName, minAmount, maxAmount } = parsed.data;

    // Build filters
    const filters = {
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(status && { status: status as ('PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED')[] }),
      ...(orderNumber && { orderNumber }),
      ...(customerName && { customerName }),
      ...(minAmount && { minAmount }),
      ...(maxAmount && { maxAmount })
    };

    // Get payment history
    const paymentService = new PaymentAnalyticsService();
    const historyData = await paymentService.getPaymentHistory(user.id, filters, page, limit);

    return NextResponse.json({
      success: true,
      data: historyData,
      meta: {
        page,
        limit,
        total: historyData.total,
        hasMore: historyData.hasMore,
        filters
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment history',
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