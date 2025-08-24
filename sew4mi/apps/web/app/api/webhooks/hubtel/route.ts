import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';
import { hubtelWebhookPayloadSchema } from '@sew4mi/shared/schemas';

// Webhook processing cache to prevent duplicate processing
const processedWebhooks = new Map<string, { timestamp: number; status: string }>();
const WEBHOOK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clean expired webhook cache entries
 */
function cleanWebhookCache() {
  const now = Date.now();
  for (const [key, value] of processedWebhooks.entries()) {
    if (now - value.timestamp > WEBHOOK_CACHE_TTL) {
      processedWebhooks.delete(key);
    }
  }
}

/**
 * Check if webhook has already been processed (idempotency)
 */
function isWebhookProcessed(transactionId: string, status: string): boolean {
  cleanWebhookCache();
  const cached = processedWebhooks.get(transactionId);
  return cached?.status === status;
}

/**
 * Mark webhook as processed
 */
function markWebhookProcessed(transactionId: string, status: string) {
  processedWebhooks.set(transactionId, {
    timestamp: Date.now(),
    status
  });
}

/**
 * POST /api/webhooks/hubtel
 * Handles Hubtel payment status callbacks
 */
export async function POST(_request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await _request.text();
    const signature = _request.headers.get('x-hubtel-signature') || 
                     _request.headers.get('x-signature') ||
                     _request.headers.get('signature') || '';

    // Verify webhook signature
    const webhookResult = await paymentService.processWebhook(rawBody, signature);
    
    if (!webhookResult.success) {
      console.error('Webhook verification failed:', webhookResult.message);
      return NextResponse.json(
        { success: false, message: webhookResult.message },
        { status: 400 }
      );
    }

    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Webhook payload parse error:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate webhook data structure
    const validationResult = hubtelWebhookPayloadSchema.safeParse(webhookData);
    
    if (!validationResult.success) {
      console.error('Webhook validation error:', validationResult.error);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid webhook payload structure',
          errors: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    const payload = validationResult.data;

    // Check for duplicate webhook (idempotency)
    if (isWebhookProcessed(payload.transactionId, payload.status)) {
      console.log(`Duplicate webhook ignored: ${payload.transactionId} - ${payload.status}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook already processed' 
      });
    }

    // Log webhook for audit trail
    console.log('Processing webhook:', {
      transactionId: payload.transactionId,
      hubtelTransactionId: payload.hubtelTransactionId,
      status: payload.status,
      amount: payload.amount,
      timestamp: payload.timestamp
    });

    // Process webhook through payment service (includes database update)
    const processResult = await paymentService.processWebhook(rawBody, signature);
    
    if (!processResult.success) {
      console.error('Payment service webhook processing failed:', processResult.message);
      // Continue processing as signature was already verified
    }
    
    // Mark webhook as processed to prevent duplicates
    markWebhookProcessed(payload.transactionId, payload.status);

    // Return success response (Hubtel expects 200 OK)
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      transactionId: payload.transactionId
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return 500 to trigger Hubtel retry
    return NextResponse.json(
      {
        success: false,
        message: 'Webhook processing failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/hubtel
 * Webhook endpoint health check
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Hubtel webhook endpoint is active',
      timestamp: new Date().toISOString(),
      processedWebhooks: processedWebhooks.size
    });
  } catch (error) {
    console.error('Webhook health check error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Webhook endpoint health check failed'
      },
      { status: 500 }
    );
  }
}