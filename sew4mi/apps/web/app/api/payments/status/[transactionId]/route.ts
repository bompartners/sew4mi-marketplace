import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';
import { createClient } from '@supabase/supabase-js';
import { ENV_CONFIG } from '@/lib/config/env';

// Use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

/**
 * GET /api/payments/status/[transactionId]
 * Gets payment status for a transaction
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    // Validate transaction ID format
    if (!transactionId || transactionId.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid transaction ID format'
        },
        { status: 400 }
      );
    }

    // Validate authentication
    const authHeader = _request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract and validate JWT token
    const token = authHeader.substring(7);
    const supabase = createClient(ENV_CONFIG.SUPABASE_URL, ENV_CONFIG.SUPABASE_ANON_KEY);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get Hubtel transaction ID from query params if provided
    const url = new URL(_request.url);
    const hubtelTransactionId = url.searchParams.get('hubtelTransactionId');

    // Verify payment status
    const statusResult = await paymentService.verifyPaymentStatus(
      transactionId, 
      hubtelTransactionId || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        transactionId: statusResult.transactionId,
        status: statusResult.status,
        amount: paymentService.formatGhanaCedi(statusResult.amount),
        provider: statusResult.provider,
        lastUpdated: statusResult.updatedAt.toISOString(),
        canRetry: paymentService.shouldContinuePolling(statusResult.status, 0)
      }
    });

  } catch (error) {
    console.error('Payment status endpoint error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve payment status. Please try again later.'
      },
      { status: 500 }
    );
  }
}