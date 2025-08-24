import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';
import { paymentInitiationRequestSchema } from '@sew4mi/shared/schemas';
import { RATE_LIMITS } from '@sew4mi/shared/constants';
import { createClient } from '@supabase/supabase-js';
import { ENV_CONFIG } from '@/lib/config/env';

// Use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (clientData.count >= RATE_LIMITS.PAYMENT_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  clientData.count++;
  return true;
}

/**
 * POST /api/payments/initiate
 * Initiates a payment using Hubtel gateway
 */
export async function POST(_request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = _request.headers.get('x-forwarded-for') || 
                    _request.headers.get('x-real-ip') || 
                    'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Rate limit exceeded. Maximum 10 payment requests per minute.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = paymentInitiationRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    const paymentRequest = validationResult.data;

    // Validate authentication (basic auth check)
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

    // Validate payment amount
    const amountValidation = paymentService.validateAmount(paymentRequest.amount);
    if (!amountValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: amountValidation.message
        },
        { status: 400 }
      );
    }

    // Initiate payment
    const result = await paymentService.initiatePayment(paymentRequest);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message
        },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        hubtelTransactionId: result.hubtelTransactionId,
        paymentUrl: result.paymentUrl,
        status: result.status,
        message: result.message,
        amount: paymentService.formatGhanaCedi(paymentRequest.amount)
      }
    });

  } catch (error) {
    console.error('Payment initiation endpoint error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/initiate
 * Returns supported payment methods and configuration
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        supportedMethods: ['MTN', 'VODAFONE', 'AIRTELTIGO', 'CARD'],
        currency: 'GHS',
        minAmount: 0.01,
        maxAmount: 100000,
        rateLimit: {
          requestsPerMinute: RATE_LIMITS.PAYMENT_REQUESTS_PER_MINUTE
        }
      }
    });
  } catch (error) {
    console.error('Payment configuration endpoint error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve payment configuration'
      },
      { status: 500 }
    );
  }
}