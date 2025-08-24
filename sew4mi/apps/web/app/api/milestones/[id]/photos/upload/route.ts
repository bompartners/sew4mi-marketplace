/**
 * API endpoint for milestone photo upload
 * Handles secure upload with compression and validation
 * @file route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  milestonePhotoUploadRequestSchema,
  type MilestonePhotoUploadResponseFromSchema
} from '@sew4mi/shared/schemas';
import { base64ToBuffer, validateImageSize } from '@/lib/utils/image-compression';
import { createStorageService } from '@/lib/services/storage.service';
import { MilestoneRepository } from '@/lib/repositories/milestone.repository';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Rate limiting store (in production, use Redis)
 */
const uploadAttempts = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 60 * 60 * 1000 // 1 hour
};

/**
 * Validates route parameters
 */
const paramsSchema = z.object({
  id: z.string().uuid('Invalid milestone ID')
});

/**
 * Checks rate limiting for user
 * @param userId - User ID for rate limiting
 * @returns True if within rate limits
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(userId);

  if (!userAttempts || now > userAttempts.resetTime) {
    uploadAttempts.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    });
    return true;
  }

  if (userAttempts.count >= RATE_LIMIT.maxAttempts) {
    return false;
  }

  userAttempts.count++;
  return true;
}

/**
 * POST /api/milestones/[id]/photos/upload
 * Uploads milestone verification photo
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<MilestonePhotoUploadResponseFromSchema | { error: string }>> {
  try {
    // Validate route parameters
    const resolvedParams = await params;
    const validationResult = paramsSchema.safeParse(resolvedParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid milestone ID format' },
        { status: 400 }
      );
    }

    const { id: milestoneId } = validationResult.data;

    // Get authenticated user from Supabase session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = user.id;

    // Check rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await _request.json();
    const uploadData = milestonePhotoUploadRequestSchema.safeParse(body);

    if (!uploadData.success) {
      return NextResponse.json(
        { error: `Validation error: ${uploadData.error.errors.map(e => e.message).join(', ')}` },
        { status: 400 }
      );
    }

    const { imageData, filename, notes } = uploadData.data;
    // mimeType extracted but validation is handled by schema

    // Convert base64 to buffer
    let imageBuffer: Buffer;
    try {
      imageBuffer = base64ToBuffer(imageData);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      );
    }

    // Validate image size
    if (!validateImageSize(imageBuffer)) {
      return NextResponse.json(
        { error: 'Image size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate user has permission to upload to this milestone
    const milestoneRepo = new MilestoneRepository(supabase);
    const validation = await milestoneRepo.validateUserPermission(milestoneId, userId);
    
    if (!validation.canUpload) {
      return NextResponse.json(
        { error: validation.reason || 'Permission denied' },
        { status: validation.reason?.includes('not found') ? 404 : 403 }
      );
    }
    
    const milestone = validation.milestone!;
    const orderId = milestone.order.id;

    // Upload to storage
    const storageService = createStorageService();
    const uploadResult = await storageService.uploadMilestonePhoto(
      imageBuffer,
      orderId,
      milestoneId,
      filename
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }

    // Update milestone record in database with photo URL and notes
    try {
      await milestoneRepo.updateMilestoneWithPhoto(
        milestoneId,
        uploadResult.publicUrl,
        notes
      );
    } catch (dbError) {
      console.error('Failed to update milestone in database:', dbError);
      return NextResponse.json(
        { error: 'Failed to save milestone data' },
        { status: 500 }
      );
    }

    // Return success response
    const response: MilestonePhotoUploadResponseFromSchema = {
      success: true,
      photoUrl: uploadResult.publicUrl,
      cdnUrl: uploadResult.cdnUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      uploadedAt: uploadResult.uploadedAt
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Milestone photo upload error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/milestones/[id]/photos/upload
 * Returns upload configuration and limits
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Validate route parameters
    const resolvedParams = await params;
    const validationResult = paramsSchema.safeParse(resolvedParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid milestone ID format' },
        { status: 400 }
      );
    }

    // Return upload configuration
    return NextResponse.json({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      rateLimit: {
        maxAttempts: RATE_LIMIT.maxAttempts,
        windowMs: RATE_LIMIT.windowMs
      },
      compressionSettings: {
        quality: 80,
        maxWidth: 1200,
        maxHeight: 1200
      }
    });

  } catch (error) {
    console.error('Get upload config error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}