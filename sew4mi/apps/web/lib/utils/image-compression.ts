/**
 * Image compression utilities for milestone photo uploads
 * Optimized for Ghana's bandwidth constraints
 * @file image-compression.ts
 */

import sharp from 'sharp';
import { IMAGE_COMPRESSION_SETTINGS, MAX_PHOTO_SIZE_BYTES } from '@sew4mi/shared/constants';

/**
 * Compressed image result
 */
export interface CompressedImageResult {
  /** Compressed image buffer */
  buffer: Buffer;
  /** Optimized image metadata */
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  /** Thumbnail buffer */
  thumbnail: Buffer;
  /** Thumbnail metadata */
  thumbnailMetadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

/**
 * Image compression options
 */
export interface ImageCompressionOptions {
  /** Target quality (1-100) */
  quality?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Output format */
  format?: 'jpeg' | 'png' | 'webp';
  /** Thumbnail size */
  thumbnailSize?: number;
}

/**
 * Validates if file size is within limits
 * @param buffer - Image buffer to validate
 * @returns True if within limits
 */
export function validateImageSize(buffer: Buffer): boolean {
  return buffer.length <= MAX_PHOTO_SIZE_BYTES;
}

/**
 * Validates image format and basic structure
 * @param buffer - Image buffer to validate
 * @returns Promise resolving to validation result
 */
export async function validateImageFormat(buffer: Buffer): Promise<{
  isValid: boolean;
  format?: string;
  error?: string;
}> {
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.format) {
      return { isValid: false, error: 'Unable to determine image format' };
    }

    const supportedFormats = ['jpeg', 'png', 'webp'];
    if (!supportedFormats.includes(metadata.format)) {
      return { 
        isValid: false, 
        format: metadata.format,
        error: `Unsupported format: ${metadata.format}. Supported formats: ${supportedFormats.join(', ')}` 
      };
    }

    return { isValid: true, format: metadata.format };
  } catch (error) {
    return { 
      isValid: false, 
      error: `Invalid image file: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Compresses an image for milestone upload
 * Optimizes for Ghana's mobile-first, bandwidth-constrained environment
 * @param buffer - Original image buffer
 * @param options - Compression options
 * @returns Promise resolving to compressed image data
 */
export async function compressImage(
  buffer: Buffer,
  options: ImageCompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    quality = IMAGE_COMPRESSION_SETTINGS.quality,
    maxWidth = IMAGE_COMPRESSION_SETTINGS.maxWidth,
    maxHeight = IMAGE_COMPRESSION_SETTINGS.maxHeight,
    format = IMAGE_COMPRESSION_SETTINGS.format,
    thumbnailSize = IMAGE_COMPRESSION_SETTINGS.thumbnailSize
  } = options;

  try {
    // Validate input image
    const validation = await validateImageFormat(buffer);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Get original metadata
    const originalMetadata = await sharp(buffer).metadata();
    
    // Create Sharp instance for processing
    let image = sharp(buffer);

    // Apply rotation based on EXIF data
    image = image.rotate();

    // Resize if needed (maintain aspect ratio)
    if (originalMetadata.width && originalMetadata.height) {
      if (originalMetadata.width > maxWidth || originalMetadata.height > maxHeight) {
        image = image.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    // Apply format-specific compression
    switch (format) {
      case 'jpeg':
        image = image.jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true // Better compression for smaller files
        });
        break;
      case 'png':
        image = image.png({ 
          quality,
          compressionLevel: 9,
          progressive: true
        });
        break;
      case 'webp':
        image = image.webp({ 
          quality,
          effort: 6 // Higher effort for better compression
        });
        break;
    }

    // Generate compressed image
    const compressedBuffer = await image.toBuffer();
    const compressedMetadata = await sharp(compressedBuffer).metadata();

    // Generate thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .rotate()
      .resize(thumbnailSize, thumbnailSize, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

    return {
      buffer: compressedBuffer,
      metadata: {
        width: compressedMetadata.width || 0,
        height: compressedMetadata.height || 0,
        format: compressedMetadata.format || format,
        size: compressedBuffer.length
      },
      thumbnail: thumbnailBuffer,
      thumbnailMetadata: {
        width: thumbnailMetadata.width || 0,
        height: thumbnailMetadata.height || 0,
        format: thumbnailMetadata.format || 'jpeg',
        size: thumbnailBuffer.length
      }
    };
  } catch (error) {
    throw new Error(
      `Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Converts base64 image data to buffer
 * @param base64Data - Base64 encoded image data
 * @returns Image buffer
 */
export function base64ToBuffer(base64Data: string): Buffer {
  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(cleanBase64, 'base64');
}

/**
 * Converts buffer to base64 data URL
 * @param buffer - Image buffer
 * @param mimeType - MIME type for data URL
 * @returns Base64 data URL
 */
export function bufferToBase64DataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Generates progressive loading placeholder
 * Creates a tiny, blurred version for progressive loading
 * @param buffer - Original image buffer
 * @returns Promise resolving to base64 placeholder
 */
export async function generateProgressivePlaceholder(buffer: Buffer): Promise<string> {
  try {
    const placeholderBuffer = await sharp(buffer)
      .rotate()
      .resize(20, 20, { fit: 'cover' })
      .blur(2)
      .jpeg({ quality: 50 })
      .toBuffer();

    return bufferToBase64DataUrl(placeholderBuffer, 'image/jpeg');
  } catch (error) {
    throw new Error(
      `Placeholder generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculates compression ratio
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Compression ratio as percentage
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}