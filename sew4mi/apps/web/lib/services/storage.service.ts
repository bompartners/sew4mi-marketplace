/**
 * Supabase Storage service for milestone photo management
 * Handles secure upload, optimization, and CDN delivery
 * @file storage.service.ts
 */

import { createClient } from '@supabase/supabase-js';
import { 
  MILESTONE_PHOTOS_BUCKET, 
  MILESTONE_PHOTO_CACHE_DURATION,
  SUPPORTED_IMAGE_FORMATS 
} from '@sew4mi/shared/constants';
import { compressImage } from '../utils/image-compression';
// import { CompressedImageResult } from '../utils/image-compression'; // TODO: Use when needed

/**
 * Storage upload result
 */
export interface StorageUploadResult {
  /** Success status */
  success: boolean;
  /** Public URL of uploaded file */
  publicUrl: string;
  /** CDN-optimized URL */
  cdnUrl: string;
  /** Thumbnail URL */
  thumbnailUrl: string;
  /** File path in storage */
  path: string;
  /** Upload timestamp */
  uploadedAt: Date;
  /** Error message if upload failed */
  error?: string;
}

/**
 * Storage service configuration
 */
export interface StorageServiceConfig {
  /** Supabase URL */
  supabaseUrl: string;
  /** Supabase service role key */
  serviceKey: string;
}

/**
 * Supabase Storage Service for milestone photos
 */
export class StorageService {
  private supabase: ReturnType<typeof createClient>;

  constructor(config: StorageServiceConfig) {
    this.supabase = createClient(config.supabaseUrl, config.serviceKey);
  }

  /**
   * Uploads milestone photo with compression and optimization
   * @param buffer - Image buffer to upload
   * @param orderId - Associated order ID
   * @param milestoneId - Associated milestone ID
   * @param filename - Original filename
   * @returns Promise resolving to upload result
   */
  async uploadMilestonePhoto(
    buffer: Buffer,
    orderId: string,
    milestoneId: string,
    _filename: string
  ): Promise<StorageUploadResult> {
    try {
      // Compress image for optimal bandwidth usage
      const compressed = await compressImage(buffer);
      
      // Generate file paths
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(compressed.metadata.format);
      const basePath = `${orderId}/${milestoneId}/${timestamp}`;
      const mainPath = `${basePath}.${fileExtension}`;
      const thumbnailPath = `${basePath}_thumb.${fileExtension}`;

      // Upload main image
      const mainUpload = await this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .upload(mainPath, compressed.buffer, {
          contentType: this.getMimeType(compressed.metadata.format),
          cacheControl: `${MILESTONE_PHOTO_CACHE_DURATION}`,
          upsert: false
        });

      if (mainUpload.error) {
        return {
          success: false,
          publicUrl: '',
          cdnUrl: '',
          thumbnailUrl: '',
          path: '',
          uploadedAt: new Date(),
          error: `Main image upload failed: ${mainUpload.error.message}`
        };
      }

      // Upload thumbnail
      const thumbnailUpload = await this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .upload(thumbnailPath, compressed.thumbnail, {
          contentType: 'image/jpeg',
          cacheControl: `${MILESTONE_PHOTO_CACHE_DURATION}`,
          upsert: false
        });

      if (thumbnailUpload.error) {
        // Clean up main image if thumbnail upload fails
        await this.supabase.storage
          .from(MILESTONE_PHOTOS_BUCKET)
          .remove([mainPath]);

        return {
          success: false,
          publicUrl: '',
          cdnUrl: '',
          thumbnailUrl: '',
          path: '',
          uploadedAt: new Date(),
          error: `Thumbnail upload failed: ${thumbnailUpload.error.message}`
        };
      }

      // Generate public URLs
      const { data: mainUrl } = this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .getPublicUrl(mainPath);

      const { data: thumbnailUrl } = this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .getPublicUrl(thumbnailPath);

      return {
        success: true,
        publicUrl: mainUrl.publicUrl,
        cdnUrl: this.generateCdnUrl(mainUrl.publicUrl),
        thumbnailUrl: thumbnailUrl.publicUrl,
        path: mainPath,
        uploadedAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        publicUrl: '',
        cdnUrl: '',
        thumbnailUrl: '',
        path: '',
        uploadedAt: new Date(),
        error: `Upload processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generates signed URL for secure photo access
   * @param path - File path in storage
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Promise resolving to signed URL
   */
  async generateSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('Failed to generate signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  }

  /**
   * Deletes milestone photo and its thumbnail
   * @param path - Main image path
   * @returns Promise resolving to deletion result
   */
  async deleteMilestonePhoto(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate thumbnail path
      const thumbnailPath = path.replace(/\.([^.]+)$/, '_thumb.$1');
      
      // Delete both files
      const { error } = await this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .remove([path, thumbnailPath]);

      if (error) {
        return {
          success: false,
          error: `Deletion failed: ${error.message}`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Lists all photos for a specific milestone
   * @param orderId - Order ID
   * @param milestoneId - Milestone ID
   * @returns Promise resolving to list of photo URLs
   */
  async listMilestonePhotos(orderId: string, milestoneId: string): Promise<{
    success: boolean;
    photos: string[];
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .list(`${orderId}/${milestoneId}/`);

      if (error) {
        return {
          success: false,
          photos: [],
          error: `Failed to list photos: ${error.message}`
        };
      }

      // Filter out thumbnails and generate public URLs
      const mainPhotos = data
        .filter(file => !file.name.includes('_thumb'))
        .map(file => {
          const { data: url } = this.supabase.storage
            .from(MILESTONE_PHOTOS_BUCKET)
            .getPublicUrl(`${orderId}/${milestoneId}/${file.name}`);
          return url.publicUrl;
        });

      return {
        success: true,
        photos: mainPhotos
      };
    } catch (error) {
      return {
        success: false,
        photos: [],
        error: `Error listing photos: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Gets storage bucket usage stats
   * @returns Promise resolving to usage statistics
   */
  async getBucketStats(): Promise<{
    success: boolean;
    totalFiles: number;
    totalSize: number;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(MILESTONE_PHOTOS_BUCKET)
        .list();

      if (error) {
        return {
          success: false,
          totalFiles: 0,
          totalSize: 0,
          error: `Failed to get bucket stats: ${error.message}`
        };
      }

      // Calculate total files and size (recursive)
      let totalFiles = 0;
      let totalSize = 0;

      for (const item of data) {
        if (item.metadata?.size) {
          totalFiles++;
          totalSize += item.metadata.size;
        }
      }

      return {
        success: true,
        totalFiles,
        totalSize
      };
    } catch (error) {
      return {
        success: false,
        totalFiles: 0,
        totalSize: 0,
        error: `Error getting bucket stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validates file format support
   * @param mimeType - MIME type to validate
   * @returns True if format is supported
   */
  validateFileFormat(mimeType: string): boolean {
    return SUPPORTED_IMAGE_FORMATS.includes(mimeType as any);
  }

  /**
   * Gets file extension from format
   * @param format - Image format
   * @returns File extension
   */
  private getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      'jpeg': 'jpg',
      'png': 'png',
      'webp': 'webp'
    };
    return extensions[format] || 'jpg';
  }

  /**
   * Gets MIME type from format
   * @param format - Image format
   * @returns MIME type
   */
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp'
    };
    return mimeTypes[format] || 'image/jpeg';
  }

  /**
   * Generates CDN-optimized URL for Ghana delivery
   * @param publicUrl - Original public URL
   * @returns CDN-optimized URL
   */
  private generateCdnUrl(publicUrl: string): string {
    // Supabase automatically provides CDN optimization
    // Add any additional CDN parameters for Ghana market optimization
    const url = new URL(publicUrl);
    
    // Add cache headers for optimal mobile performance
    url.searchParams.set('cache', 'public');
    url.searchParams.set('max-age', MILESTONE_PHOTO_CACHE_DURATION.toString());
    
    return url.toString();
  }
}

/**
 * Creates configured storage service instance
 * @returns Configured StorageService instance
 */
export function createStorageService(): StorageService {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase configuration for storage service');
  }

  return new StorageService({
    supabaseUrl,
    serviceKey
  });
}

/**
 * Upload options for general file upload
 */
export interface UploadOptions {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
  options?: {
    cacheControl?: string;
    upsert?: boolean;
  };
}

/**
 * Upload result for general file upload
 */
export interface UploadResult {
  success: boolean;
  publicUrl: string;
  path: string;
  error?: string;
}

/**
 * General purpose file upload to Supabase Storage
 * @param uploadOptions - Upload configuration
 * @returns Promise resolving to upload result
 */
export async function uploadToSupabaseStorage(uploadOptions: UploadOptions): Promise<UploadResult> {
  const { bucket, path, buffer, contentType, options = {} } = uploadOptions;
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false
      });

    if (uploadError) {
      return {
        success: false,
        publicUrl: '',
        path: '',
        error: `Upload failed: ${uploadError.message}`
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      path: path
    };

  } catch (error) {
    return {
      success: false,
      publicUrl: '',
      path: '',
      error: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}