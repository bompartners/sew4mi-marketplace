/**
 * Twilio SMS/WhatsApp Webhook Handler
 * Handles delivery status updates from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
// Import not needed since we'll access headers from request
import { twilioService, MessageStatus } from '@/lib/services/twilio.service';
import { createClient } from '@/lib/supabase/server';

/**
 * POST handler for Twilio webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-twilio-signature') || '';
    const body = await request.text();
    const url = request.url;

    // Validate webhook signature for security
    if (!twilioService.validateWebhookSignature(signature, url, body)) {
      console.error('Invalid Twilio webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' }, 
        { status: 401 }
      );
    }

    // Parse webhook data
    const params = new URLSearchParams(body);
    const webhookData = {
      MessageSid: params.get('MessageSid') || params.get('SmsSid'),
      MessageStatus: params.get('MessageStatus') || params.get('SmsStatus'),
      To: params.get('To'),
      From: params.get('From'),
      Body: params.get('Body'),
      ErrorCode: params.get('ErrorCode'),
      ErrorMessage: params.get('ErrorMessage'),
      Price: params.get('Price'),
      PriceUnit: params.get('PriceUnit'),
      Uri: params.get('Uri'),
      AccountSid: params.get('AccountSid'),
      DateSent: params.get('DateSent'),
      DateUpdated: params.get('DateUpdated'),
      Direction: params.get('Direction'),
      Channel: params.get('From')?.startsWith('whatsapp:') ? 'whatsapp' : 'sms'
    };

    console.log('Twilio webhook received:', webhookData);

    // Store delivery status in database
    await storeMessageStatus(webhookData);

    // Handle specific status updates
    await handleStatusUpdate(webhookData);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Twilio webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

/**
 * Store message delivery status in database
 */
async function storeMessageStatus(webhookData: any): Promise<void> {
  try {
    const supabase = createClient();
    
    const messageData = {
      twilio_sid: webhookData.MessageSid,
      status: webhookData.MessageStatus,
      to_number: webhookData.To,
      from_number: webhookData.From,
      message_body: webhookData.Body,
      channel: webhookData.Channel,
      error_code: webhookData.ErrorCode,
      error_message: webhookData.ErrorMessage,
      price: webhookData.Price ? parseFloat(webhookData.Price) : null,
      price_unit: webhookData.PriceUnit,
      account_sid: webhookData.AccountSid,
      date_sent: webhookData.DateSent ? new Date(webhookData.DateSent) : null,
      date_updated: webhookData.DateUpdated ? new Date(webhookData.DateUpdated) : null,
      direction: webhookData.Direction,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Try to update existing record first
    const { data: existing, error: fetchError } = await supabase
      .from('message_delivery_status')
      .select('id')
      .eq('twilio_sid', webhookData.MessageSid)
      .single();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('message_delivery_status')
        .update({
          status: messageData.status,
          error_code: messageData.error_code,
          error_message: messageData.error_message,
          date_updated: messageData.date_updated,
          updated_at: messageData.updated_at
        })
        .eq('twilio_sid', webhookData.MessageSid);

      if (updateError) {
        console.error('Error updating message status:', updateError);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('message_delivery_status')
        .insert(messageData);

      if (insertError) {
        console.error('Error inserting message status:', insertError);
      }
    }

  } catch (error) {
    console.error('Error storing message status:', error);
  }
}

/**
 * Handle specific status updates and trigger actions
 */
async function handleStatusUpdate(webhookData: any): Promise<void> {
  try {
    const status = webhookData.MessageStatus as MessageStatus;

    switch (status) {
      case MessageStatus.DELIVERED:
        console.log(`Message ${webhookData.MessageSid} successfully delivered to ${webhookData.To}`);
        // Could trigger analytics or update user engagement metrics
        break;

      case MessageStatus.UNDELIVERED:
      case MessageStatus.FAILED:
        console.error(`Message ${webhookData.MessageSid} failed to deliver:`, {
          errorCode: webhookData.ErrorCode,
          errorMessage: webhookData.ErrorMessage,
          to: webhookData.To
        });
        
        // Could implement retry logic or fallback notification method
        await handleFailedMessage(webhookData);
        break;

      case MessageStatus.SENT:
        console.log(`Message ${webhookData.MessageSid} sent successfully`);
        break;

      case MessageStatus.RECEIVED:
        console.log(`Incoming message received: ${webhookData.MessageSid}`);
        // Could handle incoming customer messages
        await handleIncomingMessage(webhookData);
        break;

      default:
        console.log(`Message ${webhookData.MessageSid} status: ${status}`);
    }

  } catch (error) {
    console.error('Error handling status update:', error);
  }
}

/**
 * Handle failed message delivery
 */
async function handleFailedMessage(webhookData: any): Promise<void> {
  try {
    // Log failure for analytics
    console.error('Message delivery failed:', {
      messageSid: webhookData.MessageSid,
      to: webhookData.To,
      channel: webhookData.Channel,
      errorCode: webhookData.ErrorCode,
      errorMessage: webhookData.ErrorMessage
    });

    // Could implement:
    // 1. Retry with different channel (SMS -> WhatsApp or vice versa)
    // 2. Update user preferences to disable failed channel
    // 3. Send alert to admin about delivery issues
    // 4. Update order status if it was a critical notification

    // Example: Try alternative channel for order notifications
    if (webhookData.Body?.includes('Order #') && webhookData.Channel === 'whatsapp') {
      console.log('Attempting to resend critical order notification via SMS');
      // Could implement retry logic here
    }

  } catch (error) {
    console.error('Error handling failed message:', error);
  }
}

/**
 * Handle incoming messages from customers
 */
async function handleIncomingMessage(webhookData: any): Promise<void> {
  try {
    // Log incoming message
    console.log('Incoming message:', {
      from: webhookData.From,
      to: webhookData.To,
      body: webhookData.Body,
      channel: webhookData.Channel
    });

    // Could implement:
    // 1. Auto-responder for common questions
    // 2. Route to customer support system
    // 3. Extract order number and update order chat
    // 4. Sentiment analysis for customer satisfaction

    // Example: Auto-respond to common queries
    if (webhookData.Body?.toLowerCase().includes('status')) {
      // Could send order status automatically
      console.log('Customer asking for order status - could auto-respond');
    }

  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}