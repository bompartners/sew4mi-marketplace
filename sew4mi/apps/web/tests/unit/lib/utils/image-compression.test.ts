/**
 * Unit tests for image compression utilities
 * @file image-compression.test.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  validateImageSize,
  validateImageFormat,
  compressImage,
  base64ToBuffer,
  bufferToBase64DataUrl,
  generateProgressivePlaceholder,
  calculateCompressionRatio,
  formatFileSize
} from '@/lib/utils/image-compression';
import { MAX_PHOTO_SIZE_BYTES } from '@sew4mi/shared/constants';

// Mock Sharp for testing
let mockMetadata: any = {
  width: 1920,
  height: 1080,
  format: 'jpeg'
};

let mockToBufferResolves = true;
let mockMetadataResolves = true;

const mockSharpInstance = {
  metadata: vi.fn(() => {
    if (!mockMetadataResolves) {
      return Promise.reject(new Error('Invalid image'));
    }
    return Promise.resolve(mockMetadata);
  }),
  rotate: vi.fn().mockReturnThis(),
  resize: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  blur: vi.fn().mockReturnThis(),
  toBuffer: vi.fn(() => {
    if (!mockToBufferResolves) {
      return Promise.reject(new Error('Compression failed'));
    }
    return Promise.resolve(Buffer.from('compressed-image-data'));
  })
};

vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => mockSharpInstance);
  return { default: mockSharp };
});

describe('Image Compression Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockToBufferResolves = true;
    mockMetadataResolves = true;
    mockMetadata = {
      width: 1920,
      height: 1080,
      format: 'jpeg'
    };
  });

  describe('validateImageSize', () => {
    test('should return true for valid image size', () => {
      const validBuffer = Buffer.alloc(1024 * 1024); // 1MB
      expect(validateImageSize(validBuffer)).toBe(true);
    });

    test('should return false for oversized image', () => {
      const oversizedBuffer = Buffer.alloc(MAX_PHOTO_SIZE_BYTES + 1);
      expect(validateImageSize(oversizedBuffer)).toBe(false);
    });

    test('should return true for exactly max size', () => {
      const maxSizeBuffer = Buffer.alloc(MAX_PHOTO_SIZE_BYTES);
      expect(validateImageSize(maxSizeBuffer)).toBe(true);
    });

    test('should return true for empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(validateImageSize(emptyBuffer)).toBe(true);
    });
  });

  describe('validateImageFormat', () => {
    test('should return valid for JPEG format', async () => {
      mockMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg'
      };

      const buffer = Buffer.from('fake-jpeg-data');
      const result = await validateImageFormat(buffer);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('jpeg');
      expect(result.error).toBeUndefined();
    });

    test('should return valid for PNG format', async () => {
      mockMetadata = {
        width: 800,
        height: 600,
        format: 'png'
      };

      const buffer = Buffer.from('fake-png-data');
      const result = await validateImageFormat(buffer);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('png');
    });

    test('should return valid for WebP format', async () => {
      mockMetadata = {
        width: 1200,
        height: 800,
        format: 'webp'
      };

      const buffer = Buffer.from('fake-webp-data');
      const result = await validateImageFormat(buffer);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('webp');
    });

    test('should return invalid for unsupported format', async () => {
      mockMetadata = {
        width: 1000,
        height: 1000,
        format: 'gif'
      };

      const buffer = Buffer.from('fake-gif-data');
      const result = await validateImageFormat(buffer);
      
      expect(result.isValid).toBe(false);
      expect(result.format).toBe('gif');
      expect(result.error).toContain('Unsupported format');
    });

    test('should return invalid for corrupted image', async () => {
      mockMetadataResolves = false;

      const buffer = Buffer.from('corrupted-data');
      const result = await validateImageFormat(buffer);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid image file');
    });
  });

  describe('compressImage', () => {
    test('should compress image with default settings', async () => {
      const inputBuffer = Buffer.from('original-image-data');
      const result = await compressImage(inputBuffer);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.thumbnail).toBeInstanceOf(Buffer);
      expect(result.metadata).toHaveProperty('width');
      expect(result.metadata).toHaveProperty('height');
      expect(result.metadata).toHaveProperty('format');
      expect(result.metadata).toHaveProperty('size');
      expect(result.thumbnailMetadata).toHaveProperty('width');
      expect(result.thumbnailMetadata).toHaveProperty('height');
    });

    test('should compress image with custom options', async () => {
      const inputBuffer = Buffer.from('original-image-data');
      const options = {
        quality: 90,
        maxWidth: 800,
        maxHeight: 600,
        format: 'webp' as const,
        thumbnailSize: 200
      };

      const result = await compressImage(inputBuffer, options);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.thumbnail).toBeInstanceOf(Buffer);
    });

    test('should handle compression errors gracefully', async () => {
      mockMetadataResolves = false;

      const inputBuffer = Buffer.from('invalid-data');
      
      await expect(compressImage(inputBuffer)).rejects.toThrow('Image compression failed');
    });
  });

  describe('base64ToBuffer', () => {
    test('should convert base64 to buffer', () => {
      const base64 = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ=';
      const buffer = base64ToBuffer(base64);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('Hello World');
    });

    test('should handle base64 without data URL prefix', () => {
      const base64 = 'SGVsbG8gV29ybGQ=';
      const buffer = base64ToBuffer(base64);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('Hello World');
    });
  });

  describe('bufferToBase64DataUrl', () => {
    test('should convert buffer to base64 data URL', () => {
      const buffer = Buffer.from('Hello World');
      const mimeType = 'image/jpeg';
      const dataUrl = bufferToBase64DataUrl(buffer, mimeType);
      
      expect(dataUrl).toBe('data:image/jpeg;base64,SGVsbG8gV29ybGQ=');
    });

    test('should handle different MIME types', () => {
      const buffer = Buffer.from('Test');
      const mimeType = 'image/png';
      const dataUrl = bufferToBase64DataUrl(buffer, mimeType);
      
      expect(dataUrl).toBe('data:image/png;base64,VGVzdA==');
    });
  });

  describe('generateProgressivePlaceholder', () => {
    test('should generate placeholder image', async () => {
      const inputBuffer = Buffer.from('original-image-data');
      const placeholder = await generateProgressivePlaceholder(inputBuffer);
      
      expect(placeholder).toMatch(/^data:image\/jpeg;base64,/);
    });

    test('should handle placeholder generation errors', async () => {
      mockToBufferResolves = false;

      const inputBuffer = Buffer.from('invalid-data');
      
      await expect(generateProgressivePlaceholder(inputBuffer)).rejects.toThrow('Placeholder generation failed');
    });
  });

  describe('calculateCompressionRatio', () => {
    test('should calculate compression ratio correctly', () => {
      const originalSize = 1000;
      const compressedSize = 300;
      const ratio = calculateCompressionRatio(originalSize, compressedSize);
      
      expect(ratio).toBe(70); // 70% compression
    });

    test('should handle zero original size', () => {
      const ratio = calculateCompressionRatio(0, 100);
      expect(ratio).toBe(0);
    });

    test('should handle no compression', () => {
      const originalSize = 1000;
      const compressedSize = 1000;
      const ratio = calculateCompressionRatio(originalSize, compressedSize);
      
      expect(ratio).toBe(0);
    });

    test('should handle compression larger than original', () => {
      const originalSize = 500;
      const compressedSize = 800;
      const ratio = calculateCompressionRatio(originalSize, compressedSize);
      
      expect(ratio).toBe(-60); // Negative indicates increase
    });
  });

  describe('formatFileSize', () => {
    test('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('should format with decimals when needed', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    test('should handle large file sizes', () => {
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });

    test('should handle small file sizes', () => {
      expect(formatFileSize(512)).toBe('512 Bytes');
      expect(formatFileSize(1)).toBe('1 Bytes');
    });
  });
});