import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { tailorProfileService } from '@/lib/services/tailor-profile.service';
import { WhatsAppContactSchema, WHATSAPP_MESSAGE_TEMPLATES } from '@sew4mi/shared';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const tailorId = (await params).id;
    const body = await _request.json();

    // Validate the request body
    const result = WhatsAppContactSchema.safeParse({
      ...body,
      tailorId,
      customerId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.errors },
        { status: 400 }
      );
    }

    // Validate rate limiting
    const canContact = await tailorProfileService.validateWhatsAppContact(user.id, tailorId);
    if (!canContact) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before contacting again.' },
        { status: 429 }
      );
    }

    // Get tailor profile to get WhatsApp number
    const profile = await tailorProfileService.getCompleteProfile(tailorId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Tailor profile not found' },
        { status: 404 }
      );
    }

    const whatsappNumber = profile.user.whatsappNumber;
    if (!whatsappNumber) {
      return NextResponse.json(
        { error: 'Tailor has not provided WhatsApp contact' },
        { status: 404 }
      );
    }

    // Format the message
    let message = result.data.message;
    if (result.data.orderContext) {
      message = WHATSAPP_MESSAGE_TEMPLATES.ORDER_INQUIRY
        .replace('{garmentType}', result.data.orderContext.garmentType)
        .replace('{budget}', result.data.orderContext.estimatedBudget.toString())
        .replace('{deliveryDate}', result.data.orderContext.deliveryDate);
    }

    // Create WhatsApp deep link
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      data: {
        whatsappUrl,
        message,
        tailorName: profile.businessName,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error creating WhatsApp contact:', error);
    return NextResponse.json(
      { error: 'Failed to create WhatsApp contact' },
      { status: 500 }
    );
  }
}