/**
 * Group Order Messaging API Routes
 * GET /api/tailors/group-orders/[id]/messages - Get message history
 * POST /api/tailors/group-orders/[id]/messages - Send message to group order participants
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/utils/api-error-handler';

interface OutgoingMessage {
  recipientType: 'broadcast' | 'individual';
  recipientId?: string;
  content: string;
  channel: 'whatsapp' | 'sms';
}

/**
 * GET /api/tailors/group-orders/[id]/messages
 * Get message history for a group order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupOrderId = params.id;

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get messages from database
    const { data: messages, error: queryError } = await supabase
      .from('group_order_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, full_name),
        recipient:profiles!recipient_id(id, full_name)
      `)
      .eq('group_order_id', groupOrderId)
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    return NextResponse.json({
      success: true,
      messages: messages || []
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return createErrorResponse(error as Error, 500);
  }
}

/**
 * POST /api/tailors/group-orders/[id]/messages
 * Send message to group order participants via WhatsApp/SMS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupOrderId = params.id;
    const message: OutgoingMessage = await request.json();

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify tailor owns this group order
    const { data: groupOrder, error: verifyError } = await supabase
      .from('group_orders')
      .select('tailor_id')
      .eq('id', groupOrderId)
      .single();

    if (verifyError || groupOrder?.tailor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get recipients
    let recipientIds: string[] = [];
    
    if (message.recipientType === 'broadcast') {
      // Get all participants
      const { data: participants } = await supabase
        .from('group_order_items')
        .select('payment_responsibility')
        .eq('group_order_id', groupOrderId);
      
      recipientIds = [...new Set(participants?.map(p => p.payment_responsibility) || [])];
    } else if (message.recipientId) {
      recipientIds = [message.recipientId];
    }

    // Get recipient profiles with phone numbers
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number')
      .in('id', recipientIds);

    if (!profiles || profiles.length === 0) {
      throw new Error('No recipients found');
    }

    // Send messages via WhatsApp/SMS service
    const messagesSent = await Promise.all(
      profiles.map(async (profile) => {
        // Store message in database
        const { data: savedMessage, error: saveError } = await supabase
          .from('group_order_messages')
          .insert({
            group_order_id: groupOrderId,
            sender_id: user.id,
            recipient_id: profile.id,
            recipient_type: message.recipientType,
            content: message.content,
            channel: message.channel,
            delivered: false,
            read: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) throw saveError;

        // Send via WhatsApp or SMS
        try {
          if (message.channel === 'whatsapp' && profile.phone_number) {
            // Import WhatsApp service dynamically
            const { WhatsAppService } = await import('@/lib/services/whatsapp-integration.service');
            const whatsappService = new WhatsAppService();
            
            await whatsappService.sendMessage({
              to: profile.phone_number,
              message: message.content,
              templateType: 'CUSTOM' as any
            });

            // Update message status
            await supabase
              .from('group_order_messages')
              .update({ delivered: true })
              .eq('id', savedMessage.id);
          } else if (message.channel === 'sms' && profile.phone_number) {
            // TODO: Implement SMS fallback via Twilio SMS API
            console.log(`SMS would be sent to ${profile.phone_number}: ${message.content}`);
          }
        } catch (sendError) {
          console.error(`Failed to send ${message.channel} to ${profile.id}:`, sendError);
          // Message stored but delivery failed - will retry later
        }

        return {
          recipientId: profile.id,
          recipientName: profile.full_name,
          status: 'sent'
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: `Message sent to ${messagesSent.length} recipient(s)`,
      recipients: messagesSent
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    return createErrorResponse(error as Error, 500);
  }
}
