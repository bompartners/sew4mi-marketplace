import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import sharp from 'sharp';

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

    // Verify user is a tailor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Access denied. Tailor role required.' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const titles = formData.getAll('titles') as string[];
    const descriptions = formData.getAll('descriptions') as string[];
    const categories = formData.getAll('categories') as string[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file count (max 5 per upload)
    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 files allowed per upload' },
        { status: 400 }
      );
    }

    // Check current portfolio count
    const { data: currentProfile } = await supabase
      .from('tailor_profiles')
      .select('portfolio_images')
      .eq('user_id', user.id)
      .single();

    const currentImages = currentProfile?.portfolio_images || [];

    if (currentImages.length + files.length > 20) {
      return NextResponse.json(
        { error: `Portfolio limit exceeded. You can add ${20 - currentImages.length} more items (max 20 total)` },
        { status: 400 }
      );
    }

    // Upload files and collect URLs
    const uploadedItems = [];
    const uploadErrors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        uploadErrors.push({
          file: file.name,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        });
        continue;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        uploadErrors.push({
          file: file.name,
          error: 'File too large. Maximum size is 5MB.'
        });
        continue;
      }

      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileName = `${timestamp}-${randomStr}.webp`; // Always convert to WebP
        const filePath = `${user.id}/${fileName}`;
        const thumbnailPath = `${user.id}/thumb_${fileName}`;

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        // Process image with Sharp
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        // Resize main image (max 1920x1920, maintain aspect ratio)
        const mainImage = await image
          .resize(1920, 1920, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 85 }) // Convert to WebP with 85% quality
          .toBuffer();

        // Create thumbnail (400x400)
        const thumbnail = await sharp(inputBuffer)
          .resize(400, 400, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toBuffer();

        // Upload main image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(filePath, mainImage, {
            contentType: 'image/webp',
            cacheControl: '31536000', // 1 year
            upsert: false
          });

        if (uploadError) {
          console.warn('Upload error for file:', file.name, uploadError);
          uploadErrors.push({
            file: file.name,
            error: uploadError.message
          });
          continue;
        }

        // Upload thumbnail
        const { error: thumbError } = await supabase.storage
          .from('portfolio-images')
          .upload(thumbnailPath, thumbnail, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false
          });

        if (thumbError) {
          console.warn('Thumbnail upload warning for file:', file.name, thumbError.message);
          // Don't fail the upload if thumbnail fails
        }

        // Get public URLs
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(uploadData.path);

        const { data: { publicUrl: thumbnailUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(thumbnailPath);

        // Create portfolio item
        uploadedItems.push({
          id: `portfolio-${timestamp}-${i}`,
          url: publicUrl,
          thumbnailUrl: thumbError ? publicUrl : thumbnailUrl, // Fallback to main if thumbnail failed
          title: titles[i] || `Portfolio Item ${currentImages.length + uploadedItems.length + 1}`,
          description: descriptions[i] || 'Custom tailored garment',
          category: categories[i] || 'Custom Work',
          tags: ['Custom', 'Tailored'],
          uploadedAt: new Date().toISOString(),
          storagePath: uploadData.path, // Store for deletion
          thumbnailPath: thumbError ? null : thumbnailPath,
          width: metadata.width,
          height: metadata.height,
          originalSize: file.size,
          compressedSize: mainImage.length
        });
      } catch (error) {
        console.warn('Error processing file:', file.name, error);
        uploadErrors.push({
          file: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // If no files were successfully uploaded
    if (uploadedItems.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to upload any files',
          details: uploadErrors
        },
        { status: 400 }
      );
    }

    // Update portfolio_images in database
    const updatedImages = [...currentImages, ...uploadedItems];

    const { error: updateError } = await supabase
      .from('tailor_profiles')
      .update({ portfolio_images: updatedImages })
      .eq('user_id', user.id);

    if (updateError) {
      console.warn('Error updating portfolio:', updateError.message);

      // Rollback: Delete uploaded files
      for (const item of uploadedItems) {
        if (item.storagePath) {
          await supabase.storage
            .from('portfolio-images')
            .remove([item.storagePath]);
        }
      }

      return NextResponse.json(
        { error: 'Failed to update portfolio. Upload rolled back.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedItems.length} file(s)`,
      uploadedCount: uploadedItems.length,
      items: uploadedItems,
      errors: uploadErrors.length > 0 ? uploadErrors : undefined
    });

  } catch (error) {
    console.warn('Error uploading portfolio files:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
