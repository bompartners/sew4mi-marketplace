/**
 * Image Upload Utilities
 * Handles image compression, validation, and upload to Supabase Storage
 */

import { createClientSupabaseClient } from '@/lib/supabase/client';

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export interface ImageUploadOptions {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): void {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File size must be less than ${maxSizeMB}MB`);
  }
}

/**
 * Compress image before upload
 */
export async function compressImage(
  file: File,
  maxWidthOrHeight: number = 1920
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not create blob'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          0.8 // Quality 80%
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload single image to Supabase Storage
 */
export async function uploadImage(
  file: File,
  options: ImageUploadOptions
): Promise<string> {
  const {
    bucket,
    folder = '',
    maxSizeMB = 5,
    maxWidthOrHeight = 1920,
    onProgress
  } = options;

  try {
    // Validate file
    validateImageFile(file, maxSizeMB);

    // Notify start
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: 'pending'
    });

    // Compress image
    onProgress?.({
      fileName: file.name,
      progress: 20,
      status: 'uploading'
    });

    const compressedFile = await compressImage(file, maxWidthOrHeight);

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = compressedFile.type.split('/')[1];
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    onProgress?.({
      fileName: file.name,
      progress: 50,
      status: 'uploading'
    });

    // Upload to Supabase Storage
    const supabase = createClientSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    onProgress?.({
      fileName: file.name,
      progress: 90,
      status: 'uploading'
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    onProgress?.({
      fileName: file.name,
      progress: 100,
      status: 'completed',
      url: urlData.publicUrl
    });

    return urlData.publicUrl;
  } catch (error) {
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: 'error',
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Upload multiple images with progress tracking
 */
export async function uploadMultipleImages(
  files: File[],
  options: ImageUploadOptions
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadImage(file, options));
  return Promise.all(uploadPromises);
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImage(
  bucket: string,
  filePath: string
): Promise<void> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) throw error;
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedImageUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): string {
  // Supabase Storage supports image transformations
  const params = new URLSearchParams();
  
  if (options?.width) params.append('width', options.width.toString());
  if (options?.height) params.append('height', options.height.toString());
  if (options?.quality) params.append('quality', options.quality.toString());

  return params.toString() ? `${url}?${params.toString()}` : url;
}

