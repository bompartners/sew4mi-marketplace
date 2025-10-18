/**
 * API endpoint for uploading dispute evidence files
 * POST /api/disputes/evidence/upload
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { uploadToSupabaseStorage } from '@/lib/services/storage.service';

/**
 * Evidence upload request validation schema
 */
const evidenceUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().regex(/^(image\/(jpeg|png|webp)|application\/pdf|text\/plain)$/),
  fileData: z.string().min(1), // Base64 encoded file data
  disputeId: z.string().min(1)
});

/**
 * Rate limiting map
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter for evidence uploads
 */
function checkEvidenceUploadRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 10; // Max 10 files per 5 minutes

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
 * Validates file type and size
 */
function validateFileData(fileData: string, fileType: string): { isValid: boolean; error?: string; sizeBytes?: number } {
  try {
    // Check if it's a valid base64 data URL
    if (!fileData.startsWith('data:')) {
      return { isValid: false, error: 'Invalid file data format' };
    }

    // Extract the base64 data
    const base64Data = fileData.split(',')[1];
    if (!base64Data) {
      return { isValid: false, error: 'Invalid base64 data' };
    }

    // Calculate file size (base64 is roughly 4/3 the size of original)
    const sizeBytes = Math.floor((base64Data.length * 3) / 4);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (sizeBytes > maxSize) {
      return { 
        isValid: false, 
        error: `File too large. Maximum size: ${Math.floor(maxSize / (1024 * 1024))}MB`,
        sizeBytes 
      };
    }

    // Validate file type matches data URL
    const dataUrlType = fileData.split(';')[0].split(':')[1];
    if (dataUrlType !== fileType) {
      return { isValid: false, error: 'File type mismatch' };
    }

    return { isValid: true, sizeBytes };
  } catch (error) {
    return { isValid: false, error: 'Invalid file data' };
  }
}

/**
 * POST handler - Upload dispute evidence file
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    if (!checkEvidenceUploadRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please wait before uploading more files.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const validationResult = evidenceUploadSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { fileName, fileType, fileData, disputeId } = validationResult.data;

    // Validate file data
    const fileValidation = validateFileData(fileData, fileType);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // Verify user has access to the dispute (if dispute exists)
    if (disputeId !== 'temp') {
      const { data: dispute, error: disputeError } = await supabase
        .from('milestone_disputes')
        .select('id, created_by, order_id')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        return NextResponse.json(
          { error: 'Dispute not found' },
          { status: 404 }
        );
      }

      // Get order details to check access
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('customer_id, tailor_id')
        .eq('id', dispute.order_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      // Check if user has access to this dispute
      if (dispute.created_by !== user.id && 
          order.customer_id !== user.id && 
          order.tailor_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden - not your dispute' },
          { status: 403 }
        );
      }
    }

    console.log(`Processing evidence upload: ${fileName} (${fileType}) for dispute ${disputeId}`);

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    
    // Define storage path
    const storagePath = disputeId === 'temp' 
      ? `temp-evidence/${user.id}/${uniqueFileName}`
      : `dispute-evidence/${disputeId}/${uniqueFileName}`;

    try {
      // Convert base64 to buffer
      const base64Data = fileData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to Supabase Storage
      const uploadResult = await uploadToSupabaseStorage({
        bucket: 'dispute-evidence',
        path: storagePath,
        buffer: buffer,
        contentType: fileType,
        options: {
          cacheControl: '3600',
          upsert: false
        }
      });

      console.log(`Successfully uploaded evidence file: ${uploadResult.publicUrl}`);

      // Create evidence record in database (if dispute exists)
      if (disputeId !== 'temp') {
        const { error: evidenceError } = await supabase
          .from('dispute_evidence')
          .insert({
            dispute_id: disputeId,
            file_name: fileName,
            file_type: fileType,
            file_size: fileValidation.sizeBytes,
            file_url: uploadResult.publicUrl,
            uploaded_by: user.id,
            uploaded_at: new Date().toISOString()
          });

        if (evidenceError) {
          console.error('Failed to create evidence record:', evidenceError);
          // Continue anyway - file is uploaded successfully
        }

        // Create activity log for evidence upload
        const { error: activityError } = await supabase
          .from('dispute_activities')
          .insert({
            dispute_id: disputeId,
            user_id: user.id,
            action: 'EVIDENCE_UPLOADED',
            description: `Uploaded evidence file: ${fileName}`,
            created_at: new Date().toISOString()
          });

        if (activityError) {
          console.error('Failed to create evidence upload activity:', activityError);
        }
      }

      return NextResponse.json({
        success: true,
        url: uploadResult.publicUrl,
        fileName: uniqueFileName,
        fileSize: fileValidation.sizeBytes,
        uploadedAt: new Date().toISOString()
      });

    } catch (uploadError) {
      console.error('Error uploading evidence file:', uploadError);
      throw new Error('Failed to upload file to storage');
    }

  } catch (error) {
    console.error('Error processing evidence upload:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}