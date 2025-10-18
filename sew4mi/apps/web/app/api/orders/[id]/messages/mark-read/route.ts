/**
 * API Route: Mark Messages as Read
 * POST: Mark messages as read by the current user
 * Story 3.4: Real-time order messaging - read receipts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/orders/[id]/messages/mark-read
 * Mark all messages in an order as read by the current user
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
    const userId = body.userId || user.id;

    // Verify user has access to this order
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

    // Get all unread messages (where user is not in read_by array)
    const { data: unreadMessages, error: fetchError } = await supabase
      .from('order_messages')
      .select('id, read_by')
      .eq('order_id', orderId)
      .neq('sender_id', userId); // Don't mark own messages

    if (fetchError) {
      console.error('Error fetching unread messages:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!unreadMessages || unreadMessages.length === 0) {
      return NextResponse.json(
        { 
          success: true,
          marked_count: 0,
          message: 'No unread messages'
        },
        { status: 200 }
      );
    }

    // Filter messages where user hasn't read them yet
    const messagesToUpdate = unreadMessages.filter(msg => 
      !msg.read_by || !msg.read_by.includes(userId)
    );

    if (messagesToUpdate.length === 0) {
      return NextResponse.json(
        { 
          success: true,
          marked_count: 0,
          message: 'All messages already read'
        },
        { status: 200 }
      );
    }

    // Update each message to add user to read_by array
    const updatePromises = messagesToUpdate.map(msg => {
      const currentReadBy = msg.read_by || [];
      const newReadBy = [...currentReadBy, userId];
      
      return supabase
        .from('order_messages')
        .update({ 
          read_by: newReadBy,
          read_at: new Date().toISOString()
        })
        .eq('id', msg.id);
    });

    const results = await Promise.all(updatePromises);

    // Check if any updates failed
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Some messages failed to update:', errors);
      return NextResponse.json(
        { 
          error: 'Some messages failed to update',
          marked_count: results.length - errors.length,
          failed_count: errors.length
        },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json(
      { 
        success: true,
        marked_count: messagesToUpdate.length,
        message: `Marked ${messagesToUpdate.length} message(s) as read`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in POST /api/orders/[id]/messages/mark-read:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

