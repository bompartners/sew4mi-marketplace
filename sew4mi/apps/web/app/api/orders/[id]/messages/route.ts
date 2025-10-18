/**
 * API Route: Order Messages
 * GET: Fetch messages for an order
 * POST: Send a new message
 * Story 3.4: Real-time order messaging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/orders/[id]/messages
 * Fetch all messages for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this order (customer or tailor)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is the customer
    const isCustomer = order.customer_id === user.id;
    
    // Check if user is the tailor (need to look up tailor profile)
    let isTailor = false;
    if (order.tailor_id) {
      const { data: tailorProfile } = await supabase
        .from('tailor_profiles')
        .select('user_id')
        .eq('id', order.tailor_id)
        .single();
      
      isTailor = tailorProfile?.user_id === user.id;
    }

    if (!isCustomer && !isTailor) {
      console.error('Authorization failed:', { userId: user.id, customerId: order.customer_id, tailorId: order.tailor_id, isTailor });
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this order' },
        { status: 403 }
      );
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('sent_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase for frontend
    const transformedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      orderId: msg.order_id,
      senderId: msg.sender_id,
      senderType: msg.sender_type,
      senderName: msg.sender_name,
      message: msg.message,
      messageType: msg.message_type,
      mediaUrl: msg.media_url,
      isInternal: msg.is_internal,
      sentAt: msg.sent_at,
      readBy: msg.read_by,
      readAt: msg.read_at,
      metadata: msg.metadata
    }));

    return NextResponse.json(
      { 
        messages: transformedMessages,
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in GET /api/orders/[id]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/messages
 * Send a new message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, messageType, message_type, mediaUrl, media_url } = body;

    // Support both camelCase (from frontend) and snake_case
    const finalMessageType = messageType || message_type || 'TEXT';
    const finalMediaUrl = mediaUrl || media_url || null;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this order and get user details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, tailor_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is the customer
    const isCustomer = order.customer_id === user.id;
    
    // Check if user is the tailor (need to look up tailor profile)
    let isTailor = false;
    if (order.tailor_id) {
      const { data: tailorProfile } = await supabase
        .from('tailor_profiles')
        .select('user_id')
        .eq('id', order.tailor_id)
        .single();
      
      isTailor = tailorProfile?.user_id === user.id;
    }

    if (!isCustomer && !isTailor) {
      console.error('Authorization failed:', { userId: user.id, customerId: order.customer_id, tailorId: order.tailor_id, isTailor });
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this order' },
        { status: 403 }
      );
    }

    const senderType = isCustomer ? 'CUSTOMER' : 'TAILOR';

    // Get sender name from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 500 }
      );
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from('order_messages')
      .insert({
        order_id: orderId,
        sender_id: user.id,
        sender_type: senderType,
        sender_name: userData.full_name,
        message: message.trim(),
        message_type: finalMessageType,
        media_url: finalMediaUrl,
        is_internal: false,
        read_by: [user.id] // Sender has read their own message
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message', details: insertError.message },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase for frontend
    const transformedMessage = {
      id: newMessage.id,
      orderId: newMessage.order_id,
      senderId: newMessage.sender_id,
      senderType: newMessage.sender_type,
      senderName: newMessage.sender_name,
      message: newMessage.message,
      messageType: newMessage.message_type,
      mediaUrl: newMessage.media_url,
      isInternal: newMessage.is_internal,
      sentAt: newMessage.sent_at,
      readBy: newMessage.read_by,
      readAt: newMessage.read_at,
      metadata: newMessage.metadata
    };

    return NextResponse.json(
      { 
        message: transformedMessage,
        success: true 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in POST /api/orders/[id]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
