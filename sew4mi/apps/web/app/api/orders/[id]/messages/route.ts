import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import {
  OrderMessage,
  OrderMessageType,
  OrderParticipantRole,
  SendOrderMessageRequest,
  SendOrderMessageResponse
} from '@sew4mi/shared/types';
import { sanitizeMessage, sanitizeUrl } from '@/lib/utils/sanitize';

/**
 * GET /api/orders/[id]/messages
 * Gets all messages for an order between customer and tailor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, errors: ['Authentication required'] },
        { status: 401 }
      );
    }

    // Validate order ID format
    const orderIdSchema = z.string().uuid();
    const validatedOrderId = orderIdSchema.parse(id);

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id')
      .eq('id', validatedOrderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, errors: ['Order not found'] },
        { status: 404 }
      );
    }

    const isCustomer = order.customer_id === user.id;
    const isTailor = order.tailor_id === user.id;
    
    if (!isCustomer && !isTailor) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized access to order'] },
        { status: 403 }
      );
    }

    // Get messages with sender information
    const { data: messages, error: messagesError } = await supabase
      .from('order_messages')
      .select(`
        id,
        order_id,
        sender_id,
        sender_type,
        sender_name,
        message,
        message_type,
        media_url,
        is_internal,
        read_by,
        sent_at,
        read_at,
        delivered_at
      `)
      .eq('order_id', validatedOrderId)
      .order('sent_at', { ascending: true });

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
      return NextResponse.json(
        { success: false, errors: ['Failed to fetch messages'] },
        { status: 500 }
      );
    }

    // Mark messages as read for current user
    if (messages && messages.length > 0) {
      const unreadMessages = messages.filter(msg => 
        msg.sender_id !== user.id && 
        (!msg.read_by || !msg.read_by.includes(user.id))
      );

      if (unreadMessages.length > 0) {
        const readUpdates = unreadMessages.map(msg => ({
          id: msg.id,
          read_by: [...(msg.read_by || []), user.id],
          read_at: msg.sender_id !== user.id ? new Date().toISOString() : msg.read_at
        }));

        await supabase
          .from('order_messages')
          .upsert(readUpdates, { onConflict: 'id' });
      }
    }

    return NextResponse.json(messages || [], { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: ['Invalid order ID format'] },
        { status: 400 }
      );
    }

    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/messages
 * Send a new message in an order conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, errors: ['Authentication required'] },
        { status: 401 }
      );
    }

    // Validate order ID format
    const orderIdSchema = z.string().uuid();
    const validatedOrderId = orderIdSchema.parse(id);

    // Parse and validate request body
    const body = await request.json();
    const messageSchema = z.object({
      message: z.string().min(1).max(1000),
      messageType: z.enum(['TEXT', 'IMAGE', 'VOICE']),
      mediaUrl: z.string().url().optional()
    });

    const { message: rawMessage, messageType, mediaUrl: rawMediaUrl } = messageSchema.parse(body);

    // Sanitize message content to prevent XSS attacks
    const message = sanitizeMessage(rawMessage);
    const mediaUrl = rawMediaUrl ? sanitizeUrl(rawMediaUrl) : undefined;

    // Validate sanitized message is not empty
    if (!message.trim()) {
      return NextResponse.json(
        { success: false, errors: ['Message content cannot be empty after sanitization'] },
        { status: 400 }
      );
    }

    // Verify user has access to this order and get user details
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, 
        customer_id, 
        tailor_id,
        customer:user_profiles!orders_customer_id_fkey(first_name, last_name),
        tailor:user_profiles!orders_tailor_id_fkey(first_name, last_name)
      `)
      .eq('id', validatedOrderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { success: false, errors: ['Order not found'] },
        { status: 404 }
      );
    }

    const isCustomer = orderData.customer_id === user.id;
    const isTailor = orderData.tailor_id === user.id;
    
    if (!isCustomer && !isTailor) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized access to order'] },
        { status: 403 }
      );
    }

    // Determine sender information
    const senderType = isCustomer ? OrderParticipantRole.CUSTOMER : OrderParticipantRole.TAILOR;
    const senderName = isCustomer 
      ? `${orderData.customer?.first_name} ${orderData.customer?.last_name}`
      : `${orderData.tailor?.first_name} ${orderData.tailor?.last_name}`;

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from('order_messages')
      .insert({
        order_id: validatedOrderId,
        sender_id: user.id,
        sender_type: senderType,
        sender_name: senderName.trim(),
        message,
        message_type: messageType,
        media_url: mediaUrl,
        is_internal: false,
        read_by: [user.id], // Sender has read their own message
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString() // Instant delivery for now
      })
      .select('id, sent_at, delivered_at')
      .single();

    if (messageError) {
      console.error('Message creation error:', messageError);
      return NextResponse.json(
        { success: false, errors: ['Failed to send message'] },
        { status: 500 }
      );
    }

    // TODO: Send real-time notification to other participant
    // This would integrate with the notification service and real-time subscriptions

    const response: SendOrderMessageResponse = {
      messageId: newMessage.id,
      sentAt: new Date(newMessage.sent_at),
      deliveredAt: newMessage.delivered_at ? new Date(newMessage.delivered_at) : undefined
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    console.error('Message send error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}