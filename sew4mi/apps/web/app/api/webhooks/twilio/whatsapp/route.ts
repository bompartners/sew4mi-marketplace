/**
 * Twilio WhatsApp Webhook Handler
 * Handles WhatsApp-specific events and message status updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { twilioService } from '@/lib/services/twilio.service';
import { createClient } from '@/lib/supabase/server';

/**
 * POST handler for Twilio WhatsApp webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-twilio-signature') || '';
    const body = await request.text();
    const url = request.url;

    // Validate webhook signature for security
    if (!twilioService.validateWebhookSignature(signature, url, body)) {
      console.error('Invalid Twilio WhatsApp webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' }, 
        { status: 401 }
      );
    }

    // Parse webhook data
    const params = new URLSearchParams(body);
    const webhookData = {
      MessageSid: params.get('MessageSid'),
      MessageStatus: params.get('MessageStatus'),
      To: params.get('To'),
      From: params.get('From'),
      Body: params.get('Body'),
      MediaUrl0: params.get('MediaUrl0'), // WhatsApp media
      MediaContentType0: params.get('MediaContentType0'),
      NumMedia: params.get('NumMedia'),
      ErrorCode: params.get('ErrorCode'),
      ErrorMessage: params.get('ErrorMessage'),
      ChannelToAddress: params.get('ChannelToAddress'),
      ChannelPrefix: params.get('ChannelPrefix'),
      ProfileName: params.get('ProfileName'), // WhatsApp profile name
      WaId: params.get('WaId'), // WhatsApp ID
      ButtonText: params.get('ButtonText'), // Interactive button responses
      ButtonPayload: params.get('ButtonPayload')
    };

    console.log('Twilio WhatsApp webhook received:', {
      ...webhookData,
      timestamp: new Date().toISOString()
    });

    // Handle WhatsApp-specific processing
    await processWhatsAppMessage(webhookData);

    // Store WhatsApp interaction data
    await storeWhatsAppInteraction(webhookData);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Twilio WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

/**
 * Process WhatsApp-specific message events
 */
async function processWhatsAppMessage(webhookData: any): Promise<void> {
  try {
    const isIncoming = webhookData.From?.startsWith('whatsapp:');
    const isOutgoing = webhookData.To?.startsWith('whatsapp:');

    if (isIncoming) {
      // Handle incoming WhatsApp message from customer
      await handleIncomingWhatsAppMessage(webhookData);
    }

    if (isOutgoing) {
      // Handle outgoing WhatsApp message status updates
      await handleOutgoingWhatsAppStatus(webhookData);
    }

    // Handle interactive button responses
    if (webhookData.ButtonText && webhookData.ButtonPayload) {
      await handleButtonResponse(webhookData);
    }

    // Handle media messages
    if (webhookData.NumMedia && parseInt(webhookData.NumMedia) > 0) {
      await handleMediaMessage(webhookData);
    }

  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
  }
}

/**
 * Handle incoming WhatsApp messages from customers
 */
async function handleIncomingWhatsAppMessage(webhookData: any): Promise<void> {
  try {
    const customerNumber = webhookData.From.replace('whatsapp:', '');
    const message = webhookData.Body || '';
    const profileName = webhookData.ProfileName || 'Customer';

    console.log(`WhatsApp message from ${profileName} (${customerNumber}): ${message}`);

    // Extract potential order number from message
    const orderNumberMatch = message.match(/#(\w+)/);
    const orderNumber = orderNumberMatch ? orderNumberMatch[1] : null;

    // Auto-respond to common queries
    await handleAutoResponse(customerNumber, message, profileName, orderNumber);

    // Store customer interaction for support purposes
    await storeCustomerInteraction(customerNumber, message, profileName, orderNumber);

  } catch (error) {
    console.error('Error handling incoming WhatsApp message:', error);
  }
}

/**
 * Handle outgoing WhatsApp message status updates
 */
async function handleOutgoingWhatsAppStatus(webhookData: any): Promise<void> {
  try {
    const status = webhookData.MessageStatus;
    const customerNumber = webhookData.To?.replace('whatsapp:', '');

    switch (status) {
      case 'delivered':
        console.log(`WhatsApp message delivered to ${customerNumber}`);
        await updateMessageDeliveryStatus(webhookData.MessageSid, 'delivered');
        break;

      case 'read':
        console.log(`WhatsApp message read by ${customerNumber}`);
        await updateMessageDeliveryStatus(webhookData.MessageSid, 'read');
        break;

      case 'failed':
        console.error(`WhatsApp message failed to ${customerNumber}:`, {
          errorCode: webhookData.ErrorCode,
          errorMessage: webhookData.ErrorMessage
        });
        await updateMessageDeliveryStatus(webhookData.MessageSid, 'failed', webhookData.ErrorMessage);
        // Could implement fallback to SMS here
        break;
    }

  } catch (error) {
    console.error('Error handling outgoing WhatsApp status:', error);
  }
}

/**
 * Handle WhatsApp button/interactive responses
 */
async function handleButtonResponse(webhookData: any): Promise<void> {
  try {
    const buttonText = webhookData.ButtonText;
    const buttonPayload = webhookData.ButtonPayload;
    const customerNumber = webhookData.From.replace('whatsapp:', '');

    console.log(`WhatsApp button response from ${customerNumber}: ${buttonText} (${buttonPayload})`);

    // Handle different button actions
    switch (buttonPayload) {
      case 'view_order':
        // Could send order details or deep link
        await sendOrderDetails(customerNumber, buttonPayload);
        break;

      case 'approve_milestone':
        // Could handle milestone approval
        await handleMilestoneApproval(customerNumber, buttonPayload);
        break;

      case 'contact_support':
        // Could route to support team
        await routeToSupport(customerNumber, buttonText);
        break;

      default:
        console.log(`Unhandled button response: ${buttonPayload}`);
    }

  } catch (error) {
    console.error('Error handling button response:', error);
  }
}

/**
 * Handle WhatsApp media messages (images, documents, audio)
 */
async function handleMediaMessage(webhookData: any): Promise<void> {
  try {
    const mediaUrl = webhookData.MediaUrl0;
    const mediaType = webhookData.MediaContentType0;
    const numMedia = parseInt(webhookData.NumMedia);
    const customerNumber = webhookData.From.replace('whatsapp:', '');

    console.log(`WhatsApp media received from ${customerNumber}: ${mediaType} (${numMedia} items)`);

    // Could implement:
    // 1. Download and store media files
    // 2. Process images for orders (customer feedback photos)
    // 3. Extract text from documents using OCR
    // 4. Transcribe voice messages

    if (mediaType?.startsWith('image/')) {
      await handleImageMessage(customerNumber, mediaUrl, webhookData.Body);
    } else if (mediaType?.startsWith('audio/')) {
      await handleVoiceMessage(customerNumber, mediaUrl);
    } else if (mediaType?.includes('document') || mediaType?.includes('pdf')) {
      await handleDocumentMessage(customerNumber, mediaUrl, mediaType);
    }

  } catch (error) {
    console.error('Error handling media message:', error);
  }
}

/**
 * Store WhatsApp interaction data
 */
async function storeWhatsAppInteraction(webhookData: any): Promise<void> {
  try {
    const supabase = createClient();
    
    const interactionData = {
      twilio_sid: webhookData.MessageSid,
      customer_number: webhookData.From?.replace('whatsapp:', ''),
      customer_name: webhookData.ProfileName,
      whatsapp_id: webhookData.WaId,
      message_body: webhookData.Body,
      message_status: webhookData.MessageStatus,
      media_url: webhookData.MediaUrl0,
      media_type: webhookData.MediaContentType0,
      num_media: webhookData.NumMedia ? parseInt(webhookData.NumMedia) : 0,
      button_text: webhookData.ButtonText,
      button_payload: webhookData.ButtonPayload,
      error_code: webhookData.ErrorCode,
      error_message: webhookData.ErrorMessage,
      direction: webhookData.From?.startsWith('whatsapp:') ? 'inbound' : 'outbound',
      created_at: new Date()
    };

    const { error } = await supabase
      .from('whatsapp_interactions')
      .insert(interactionData);

    if (error) {
      console.error('Error storing WhatsApp interaction:', error);
    }

  } catch (error) {
    console.error('Error storing WhatsApp interaction:', error);
  }
}

/**
 * Handle auto-responses for common queries
 */
async function handleAutoResponse(
  customerNumber: string, 
  message: string, 
  profileName: string, 
  orderNumber: string | null
): Promise<void> {
  try {
    const lowerMessage = message.toLowerCase();

    // Common greeting response
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('good')) {
      const response = `Hello ${profileName}! 👋 Thank you for contacting Sew4Mi. How can we help you today?\n\nYou can ask about:\n• Order status\n• Payment information\n• Fitting appointments\n• General questions`;
      
      await sendAutoResponse(customerNumber, response);
      return;
    }

    // Status inquiry
    if (lowerMessage.includes('status') || lowerMessage.includes('update')) {
      const response = orderNumber 
        ? `Let me check the status of your order #${orderNumber}. Our team will respond shortly with an update! 📱`
        : `To check your order status, please include your order number (e.g., #ORD123) in your message. You can also check the Sew4Mi app for real-time updates! 📱`;
      
      await sendAutoResponse(customerNumber, response);
      return;
    }

    // Payment inquiry
    if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
      const response = `For payment information and options, please check the Sew4Mi app or our team will assist you shortly. We accept mobile money and bank transfers! 💳`;
      
      await sendAutoResponse(customerNumber, response);
      return;
    }

    // Thank you response
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      const response = `You're very welcome! 🙏 We're happy to help. If you need anything else, just send us a message!`;
      
      await sendAutoResponse(customerNumber, response);
      return;
    }

  } catch (error) {
    console.error('Error sending auto-response:', error);
  }
}

/**
 * Send automatic response via WhatsApp
 */
async function sendAutoResponse(customerNumber: string, message: string): Promise<void> {
  try {
    await twilioService.sendWhatsApp({
      channel: 'whatsapp' as any,
      to: customerNumber,
      body: message,
      statusCallback: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/twilio/whatsapp`
    });

  } catch (error) {
    console.error('Error sending auto-response:', error);
  }
}

// Placeholder functions for future implementation
async function updateMessageDeliveryStatus(sid: string, status: string, errorMessage?: string) {
  // Implementation would update database with message status
  console.log(`Update message ${sid} status: ${status}`, errorMessage ? { error: errorMessage } : '');
}

async function storeCustomerInteraction(number: string, message: string, name: string, orderNumber: string | null) {
  // Implementation would store customer interaction in support system
  console.log(`Store customer interaction from ${name} (${number}): ${message}`, orderNumber ? { orderNumber } : '');
}

async function sendOrderDetails(number: string, payload: string) {
  console.log(`Send order details to ${number} for ${payload}`);
}

async function handleMilestoneApproval(number: string, payload: string) {
  console.log(`Handle milestone approval from ${number}: ${payload}`);
}

async function routeToSupport(number: string, buttonText: string) {
  console.log(`Route to support: ${number} clicked ${buttonText}`);
}

async function handleImageMessage(number: string, url: string, caption?: string) {
  console.log(`Handle image from ${number}: ${url}`, caption ? { caption } : '');
}

async function handleVoiceMessage(number: string, url: string) {
  console.log(`Handle voice message from ${number}: ${url}`);
}

async function handleDocumentMessage(number: string, url: string, type: string) {
  console.log(`Handle document from ${number}: ${url} (${type})`);
}