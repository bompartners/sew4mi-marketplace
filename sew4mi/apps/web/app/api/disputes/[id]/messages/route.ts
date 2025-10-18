/**
 * API endpoint for dispute messaging
 * GET/POST /api/disputes/[id]/messages
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Message creation validation schema
 */
const messageCreateSchema = z.object({
  message: z.string().min(1).max(1000),
  isInternal: z.boolean().default(false)
});

/**
 * Message read validation schema
 */
const messageReadSchema = z.object({
  messageIds: z.array(z.string().uuid())
});

/**
 * Rate limiting map
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter for messaging
 */
function checkMessagingRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // Max 10 messages per minute

  const current = rateLimitMap.get(identifier);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Gets user role from user data
 */
function getUserRole(userData: any): 'customer' | 'tailor' | 'admin' {
  const role = userData?.raw_user_meta_data?.role;
  if (role === 'admin') return 'admin';
  if (role === 'tailor') return 'tailor';
  return 'customer';
}

/**
 * GET handler - Fetch dispute messages
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = getUserRole(user);

    // Verify dispute exists and user has access
    const { data: dispute, error: disputeError } = await supabase
      .from('milestone_disputes')
      .select(`
        id,
        created_by,
        order_id,
        status,
        orders!inner(customer_id, tailor_id)
      `)
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this dispute
    const hasAccess = userRole === 'admin' || 
                     dispute.created_by === user.id || 
                     dispute.orders[0]?.customer_id === user.id || 
                     dispute.orders[0]?.tailor_id === user.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - not your dispute' },
        { status: 403 }
      );
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('dispute_messages')
      .select(`
        id,
        dispute_id,
        sender_id,
        sender_role,
        sender_name,
        message,
        is_internal,
        read_by,
        created_at
      `)
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Filter messages based on user role
    const filteredMessages = (messages || []).filter(message => {
      // Admin can see all messages including internal notes
      if (userRole === 'admin') {
        return true;
      }
      
      // Customer and tailor cannot see internal admin notes
      return !message.is_internal;
    });

    // Transform messages
    const transformedMessages = filteredMessages.map(message => ({
      id: message.id,
      disputeId: message.dispute_id,
      senderId: message.sender_id,
      senderRole: message.sender_role,
      senderName: message.sender_name,
      message: message.message,
      isInternal: message.is_internal,
      readBy: message.read_by || [],
      sentAt: new Date(message.created_at)
    }));

    return NextResponse.json({
      disputeId: id,
      messages: transformedMessages,
      userRole
    });

  } catch (error) {
    console.error('Error fetching dispute messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Send dispute message
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    if (!checkMessagingRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many messages. Please wait before sending another message.' },
        { status: 429 }
      );
    }

    const userRole = getUserRole(user);

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = messageCreateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { message, isInternal } = validationResult.data;

    // Only admins can send internal notes
    if (isInternal && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can send internal notes' },
        { status: 403 }
      );
    }

    // Verify dispute exists and user has access
    const { data: dispute, error: disputeError } = await supabase
      .from('milestone_disputes')
      .select(`
        id,
        created_by,
        order_id,
        status,
        orders!inner(customer_id, tailor_id)
      `)
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this dispute
    const hasAccess = userRole === 'admin' || 
                     dispute.created_by === user.id || 
                     dispute.orders[0]?.customer_id === user.id || 
                     dispute.orders[0]?.tailor_id === user.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - not your dispute' },
        { status: 403 }
      );
    }

    // Check if dispute is still open for messaging
    if (dispute.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot send messages to closed disputes' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Get user name from profile or use fallback
    const userName = user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    `${userRole.charAt(0).toUpperCase()}${userRole.slice(1)}`;

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: id,
        sender_id: user.id,
        sender_role: userRole,
        sender_name: userName,
        message: message,
        is_internal: isInternal,
        read_by: [user.id], // Sender has read the message
        created_at: now
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Create activity log
    const { error: activityError } = await supabase
      .from('dispute_activities')
      .insert({
        dispute_id: id,
        user_id: user.id,
        action: isInternal ? 'INTERNAL_NOTE_ADDED' : 'MESSAGE_SENT',
        description: isInternal 
          ? 'Added internal note' 
          : `Sent message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        created_at: now
      });

    if (activityError) {
      console.error('Failed to create message activity log:', activityError);
    }

    // Send notifications to other participants (except for internal notes)
    if (!isInternal) {
      try {
        const participantIds = [
          dispute.orders[0]?.customer_id,
          dispute.orders[0]?.tailor_id
        ].filter(id => id !== user.id); // Exclude sender

        const notifications = participantIds.map(participantId => ({
          user_id: participantId,
          type: 'DISPUTE_MESSAGE_RECEIVED',
          title: 'New Dispute Message',
          message: `New message from ${userName} in dispute`,
          data: {
            disputeId: id,
            messageId: newMessage.id,
            senderRole: userRole
          },
          created_at: now
        }));

        if (notifications.length > 0) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notificationError) {
            console.error('Failed to create message notifications:', notificationError);
          }
        }
      } catch (notificationError) {
        console.error('Error creating message notifications:', notificationError);
      }
    }

    console.log(`New dispute message sent: ${newMessage.id} by ${userRole} ${user.id}`);

    return NextResponse.json({
      success: true,
      message: {
        id: newMessage.id,
        disputeId: newMessage.dispute_id,
        senderId: newMessage.sender_id,
        senderRole: newMessage.sender_role,
        senderName: newMessage.sender_name,
        message: newMessage.message,
        isInternal: newMessage.is_internal,
        readBy: newMessage.read_by,
        sentAt: new Date(newMessage.created_at)
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error sending dispute message:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - Mark messages as read
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: _id } = await params; // Intentionally unused in current implementation
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = messageReadSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { messageIds } = validationResult.data;

    if (messageIds.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0 });
    }

    // Update read status for messages
    const { error: updateError } = await supabase
      .rpc('mark_dispute_messages_read', {
        p_message_ids: messageIds,
        p_user_id: user.id
      });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      updatedCount: messageIds.length
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}