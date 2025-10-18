/**
 * API Route: Upload Message Attachments
 * POST: Upload a file attachment for order messages
 * Story 3.4: Real-time order messaging - file attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/orders/messages/upload
 * Upload a file attachment for order messages
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const orderId = formData.get('orderId') as string;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'audio/webm',
      'audio/mpeg',
      'audio/wav'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Supported types: images, PDFs, documents, audio' },
        { status: 400 }
      );
    }

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
    
    // Check if user is the tailor
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
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this order' },
        { status: 403 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop();
    const fileName = `${orderId}/${timestamp}-${randomString}.${fileExt}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('order-messages')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('order-messages')
      .getPublicUrl(fileName);

    return NextResponse.json(
      { 
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in POST /api/orders/messages/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

