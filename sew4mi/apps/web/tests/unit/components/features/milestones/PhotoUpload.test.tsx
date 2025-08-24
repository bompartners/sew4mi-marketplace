/**
 * Unit tests for PhotoUpload component
 * @file PhotoUpload.test.tsx
 */

import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUpload } from '@/components/features/milestones/PhotoUpload';

// Mock the image compression utils
vi.mock('@/lib/utils/image-compression', () => ({
  formatFileSize: vi.fn((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    if (bytes === 5242880) return '5 MB';
    return `${Math.round(bytes / 1024)} KB`;
  })
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  
  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,fake-base64-data`;
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }, 0);
  }
}

global.FileReader = MockFileReader as any;

describe('PhotoUpload Component', () => {
  const mockProps = {
    milestoneId: 'test-milestone-id',
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render upload zone with default content', () => {
      render(<PhotoUpload {...mockProps} />);
      
      expect(screen.getByText('Drop photo here or click to browse')).toBeInTheDocument();
      expect(screen.getByText(/Maximum.*• JPEG, PNG, WebP/)).toBeInTheDocument();
    });

    test('should render disabled state', () => {
      render(<PhotoUpload {...mockProps} disabled />);
      
      const dropZone = screen.getByText('Drop photo here or click to browse').closest('div');
      expect(dropZone).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    test('should render existing photo when provided', () => {
      render(<PhotoUpload {...mockProps} existingPhotoUrl="https://example.com/photo.jpg" />);
      
      expect(screen.getByText('Current Photo')).toBeInTheDocument();
      expect(screen.getByAltText('Current milestone photo')).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });
  });

  describe('File Selection', () => {
    test('should handle file selection via file input', async () => {
      const user = userEvent.setup();
      render(<PhotoUpload {...mockProps} />);
      
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument();
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    test('should handle drag and drop file selection', async () => {
      render(<PhotoUpload {...mockProps} />);
      
      const file = new File(['fake image data'], 'dropped.png', { type: 'image/png' });
      const dropZone = screen.getByText('Drop photo here or click to browse').closest('div')!;
      
      // Simulate drag enter
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { files: [file] }
      });
      
      expect(dropZone).toHaveClass('border-primary');
      
      // Simulate drop
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] }
      });
      
      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument();
        expect(screen.getByText('dropped.png')).toBeInTheDocument();
      });
    });

    test('should validate file type', async () => {
      const user = userEvent.setup();
      render(<PhotoUpload {...mockProps} />);
      
      const invalidFile = new File(['fake data'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      
      await user.upload(fileInput, invalidFile);
      
      await waitFor(() => {
        expect(screen.getByText(/Unsupported format/)).toBeInTheDocument();
      });
    });

    test('should validate file size', async () => {
      const user = userEvent.setup();
      render(<PhotoUpload {...mockProps} />);
      
      // Create a large file (6MB > 5MB limit)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
      
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      
      await user.upload(fileInput, largeFile);
      
      await waitFor(() => {
        expect(screen.getByText(/File too large/)).toBeInTheDocument();
      });
    });
  });

  describe('Upload Process', () => {
    test('should handle successful upload', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        success: true,
        photoUrl: 'https://example.com/uploaded.jpg',
        cdnUrl: 'https://cdn.example.com/uploaded.jpg',
        thumbnailUrl: 'https://cdn.example.com/uploaded_thumb.jpg',
        uploadedAt: new Date().toISOString()
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      render(<PhotoUpload {...mockProps} />);
      
      // Select file
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      });
      
      // Click upload button
      const uploadButton = screen.getByText('Upload Photo');
      await user.click(uploadButton);
      
      // Wait for upload to complete
      await waitFor(() => {
        expect(screen.getByText(/Photo uploaded successfully/)).toBeInTheDocument();
      });
      
      expect(mockProps.onUploadComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: mockResponse.photoUrl,
          cdnUrl: mockResponse.cdnUrl,
          thumbnailUrl: mockResponse.thumbnailUrl
        })
      );
    });

    test('should handle upload error', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' })
      });
      
      render(<PhotoUpload {...mockProps} />);
      
      // Select file
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      });
      
      // Click upload button
      const uploadButton = screen.getByText('Upload Photo');
      await user.click(uploadButton);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
      
      expect(mockProps.onUploadError).toHaveBeenCalledWith('Upload failed');
    });

    test('should show upload progress', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              photoUrl: 'https://example.com/uploaded.jpg',
              cdnUrl: 'https://cdn.example.com/uploaded.jpg',
              thumbnailUrl: 'https://cdn.example.com/uploaded_thumb.jpg',
              uploadedAt: new Date().toISOString()
            })
          }), 100)
        )
      );
      
      render(<PhotoUpload {...mockProps} />);
      
      // Select file
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      });
      
      // Click upload button
      const uploadButton = screen.getByText('Upload Photo');
      await user.click(uploadButton);
      
      // Check for uploading state
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/Photo uploaded successfully/)).toBeInTheDocument();
      });
    });
  });

  describe('Notes Input', () => {
    test('should handle notes input', async () => {
      const user = userEvent.setup();
      render(<PhotoUpload {...mockProps} />);
      
      // Select file first
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
      });
      
      const notesInput = screen.getByPlaceholderText('Add any notes about this milestone...');
      await user.type(notesInput, 'This is a test note');
      
      expect(notesInput).toHaveValue('This is a test note');
      expect(screen.getByText('19/1000 characters')).toBeInTheDocument();
    });

    test('should enforce character limit for notes', async () => {
      const user = userEvent.setup();
      render(<PhotoUpload {...mockProps} />);
      
      // Select file first
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Notes (optional)')).toBeInTheDocument();
      });
      
      const notesInput = screen.getByPlaceholderText('Add any notes about this milestone...');
      expect(notesInput).toHaveAttribute('maxLength', '1000');
    });
  });

  describe('Clear Functionality', () => {
    test('should clear selected file', async () => {
      const user = userEvent.setup();
      render(<PhotoUpload {...mockProps} />);
      
      // Select file
      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByAltText('Preview')).toBeInTheDocument();
      });
      
      // Click clear button
      const clearButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(clearButton);
      
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
      expect(screen.getByText('Drop photo here or click to browse')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<PhotoUpload {...mockProps} />);
      
      const fileInput = screen.getByRole('textbox', { hidden: true });
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    });

    test('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PhotoUpload {...mockProps} />);
      
      const dropZone = screen.getByText('Drop photo here or click to browse').closest('div')!;
      
      // Should be focusable and clickable
      expect(dropZone).toHaveClass('cursor-pointer');
      
      await user.click(dropZone);
      // File picker should open (mocked)
    });
  });
});