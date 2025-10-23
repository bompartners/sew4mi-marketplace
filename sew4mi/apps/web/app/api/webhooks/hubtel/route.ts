import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';
import { hubtelWebhookPayloadSchema } from '@sew4mi/shared/schemas';
import { orderStatusService } from '@/lib/services/order-status.service';
import { createClient } from '@/lib/supabase/server';
import { verifyHubtelWebhookIp, logIpVerification } from '@/lib/utils/ip-whitelist';

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
 * Security: IP whitelisting (as per Hubtel recommendation)
 */
export async function POST(_request: NextRequest) {
  try {
    // Verify request is from Hubtel's callback IP addresses
    const ipVerification = verifyHubtelWebhookIp(_request);
    
    if (!ipVerification.isValid) {
      logIpVerification(ipVerification);
      console.error('Unauthorized webhook attempt from:', ipVerification.clientIp);
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Invalid source IP' },
        { status: 403 }
      );
    }

    // Get raw body for payload processing
    const rawBody = await _request.text();

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

    // Log successful IP verification
    logIpVerification(ipVerification, payload.transactionId);

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
      timestamp: payload.timestamp,
      sourceIp: ipVerification.clientIp
    });

    // Handle order status updates for successful payments
    if (payload.status === 'Success' || payload.status === 'PAID') {
      try {
        // Get order associated with this transaction
        const supabase = await createClient();
        
        // First check payment_transactions table
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('order_id, escrow_stage')
          .eq('transaction_id', payload.transactionId)
          .single();

        if (transaction?.order_id) {
          // Determine payment type from escrow stage
          let paymentType: 'deposit' | 'fitting' | 'final' = 'deposit';
          
          if (transaction.escrow_stage === 'FITTING') {
            paymentType = 'fitting';
          } else if (transaction.escrow_stage === 'FINAL') {
            paymentType = 'final';
          }

          // Process order status transition
          const statusResult = await orderStatusService.handlePaymentConfirmation(
            transaction.order_id,
            paymentType,
            payload.transactionId
          );

          if (statusResult.success) {
            console.log(`Order status updated: ${statusResult.message}`);
            console.log(`Notifications sent: ${statusResult.notifications?.join(', ')}`);
          } else {
            console.error(`Failed to update order status: ${statusResult.message}`);
          }
        } else {
          // Fallback: Try to find order by reference in metadata
          console.log('Transaction not found, checking order reference...');
          
          // Check if reference contains order ID (format: ORDER_[orderId]_[stage])
          const referenceMatch = payload.reference?.match(/ORDER_([a-f0-9-]+)_(\w+)/i);
          if (referenceMatch) {
            const [, orderId, stage] = referenceMatch;
            
            let paymentType: 'deposit' | 'fitting' | 'final' = 'deposit';
            if (stage === 'FITTING') paymentType = 'fitting';
            else if (stage === 'FINAL') paymentType = 'final';
            
            const statusResult = await orderStatusService.handlePaymentConfirmation(
              orderId,
              paymentType,
              payload.transactionId
            );
            
            if (statusResult.success) {
              console.log(`Order status updated via reference: ${statusResult.message}`);
            }
          }
        }
      } catch (orderUpdateError) {
        console.error('Failed to update order status:', orderUpdateError);
        // Don't fail the webhook - payment was successful
      }
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