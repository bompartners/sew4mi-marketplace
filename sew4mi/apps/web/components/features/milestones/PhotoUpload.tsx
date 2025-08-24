/**
 * PhotoUpload component for milestone verification
 * Features drag-and-drop, image preview, and compression
 * @file PhotoUpload.tsx
 */

'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MAX_PHOTO_SIZE_BYTES, 
  SUPPORTED_IMAGE_FORMATS,
  IMAGE_COMPRESSION_SETTINGS 
} from '@sew4mi/shared/constants';
import { formatFileSize } from '@/lib/utils/image-compression';

/**
 * Upload status types
 */
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Upload state interface
 */
interface UploadState {
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: {
    photoUrl: string;
    cdnUrl: string;
    thumbnailUrl: string;
    uploadedAt: Date;
  };
}

/**
 * Props for PhotoUpload component
 */
interface PhotoUploadProps {
  /** Milestone ID for upload */
  milestoneId: string;
  /** Callback when upload completes successfully */
  onUploadComplete?: (result: UploadState['result']) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Whether component is disabled */
  disabled?: boolean;
  /** Existing photo URL if editing */
  existingPhotoUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Preview image interface
 */
interface PreviewImage {
  file: File;
  url: string;
  size: number;
  isValid: boolean;
  error?: string;
}

/**
 * PhotoUpload Component
 * Provides drag-and-drop photo upload with compression and validation
 */
export function PhotoUpload({
  milestoneId,
  onUploadComplete,
  onUploadError,
  disabled = false,
  existingPhotoUrl,
  className
}: PhotoUploadProps) {
  // State management
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0
  });
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [notes, setNotes] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  /**
   * Validates uploaded file
   */
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file type
    if (!SUPPORTED_IMAGE_FORMATS.includes(file.type as any)) {
      return {
        isValid: false,
        error: `Unsupported format. Please use: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`
      };
    }

    // Check file size
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${formatFileSize(MAX_PHOTO_SIZE_BYTES)}`
      };
    }

    return { isValid: true };
  }, []);

  /**
   * Handles file selection
   */
  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file);
    const objectUrl = URL.createObjectURL(file);

    const preview: PreviewImage = {
      file,
      url: objectUrl,
      size: file.size,
      isValid: validation.isValid,
      error: validation.error
    };

    setPreviewImage(preview);
    setUploadState({ status: 'idle', progress: 0 });
  }, [validateFile]);

  /**
   * Handles drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      handleFileSelect(imageFile);
    }
  }, [disabled, handleFileSelect]);

  /**
   * Handles file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  /**
   * Converts file to base64
   */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Uploads the selected image
   */
  const handleUpload = useCallback(async () => {
    if (!previewImage?.isValid || !previewImage.file || uploadState.status === 'uploading') {
      return;
    }

    try {
      setUploadState({ status: 'uploading', progress: 0 });

      // Convert file to base64
      const base64Data = await fileToBase64(previewImage.file);
      
      // Simulate progress during base64 conversion
      setUploadState(prev => ({ ...prev, progress: 25 }));

      // Prepare upload data
      const uploadData = {
        imageData: base64Data,
        filename: previewImage.file.name,
        mimeType: previewImage.file.type,
        notes: notes.trim() || undefined
      };

      // Simulate progress during preparation
      setUploadState(prev => ({ ...prev, progress: 50 }));

      // Make upload request
      const response = await fetch(`/api/milestones/${milestoneId}/photos/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      });

      setUploadState(prev => ({ ...prev, progress: 75 }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadState({
        status: 'success',
        progress: 100,
        result: {
          ...result,
          uploadedAt: new Date(result.uploadedAt)
        }
      });

      // Clean up preview
      URL.revokeObjectURL(previewImage.url);
      setPreviewImage(null);
      setNotes('');

      // Call success callback
      onUploadComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState({
        status: 'error',
        progress: 0,
        error: errorMessage
      });

      onUploadError?.(errorMessage);
    }
  }, [previewImage, notes, milestoneId, fileToBase64, onUploadComplete, onUploadError, uploadState.status]);

  /**
   * Clears the current selection
   */
  const handleClear = useCallback(() => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage.url);
      setPreviewImage(null);
    }
    setUploadState({ status: 'idle', progress: 0 });
    setNotes('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewImage]);

  /**
   * Opens file picker
   */
  const openFilePicker = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage.url);
      }
    };
  }, [previewImage]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          isDragOver && !disabled
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed',
          previewImage && 'border-solid border-primary'
        )}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_IMAGE_FORMATS.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        {/* Preview or Drop Zone Content */}
        {previewImage ? (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative">
              <img
                src={previewImage.url}
                alt="Preview"
                className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="absolute top-2 right-2"
                disabled={disabled || uploadState.status === 'uploading'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* File Info */}
            <div className="text-sm text-muted-foreground text-center">
              <p>{previewImage.file.name}</p>
              <p>{formatFileSize(previewImage.size)}</p>
            </div>

            {/* Validation Error */}
            {previewImage.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{previewImage.error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Drop photo here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                Maximum {formatFileSize(MAX_PHOTO_SIZE_BYTES)} • JPEG, PNG, WebP
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes Input */}
      {previewImage && previewImage.isValid && (
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this milestone..."
            rows={3}
            maxLength={1000}
            disabled={disabled || uploadState.status === 'uploading'}
          />
          <p className="text-xs text-muted-foreground text-right">
            {notes.length}/1000 characters
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState.status === 'uploading' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
          <Progress value={uploadState.progress} className="w-full" />
        </div>
      )}

      {/* Upload Status */}
      {uploadState.status === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Photo uploaded successfully! Customer will be notified for approval.
          </AlertDescription>
        </Alert>
      )}

      {uploadState.status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Button */}
      {previewImage && previewImage.isValid && uploadState.status !== 'success' && (
        <Button
          onClick={handleUpload}
          disabled={disabled || uploadState.status === 'uploading'}
          className="w-full"
        >
          {uploadState.status === 'uploading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </>
          )}
        </Button>
      )}

      {/* Existing Photo Display */}
      {existingPhotoUrl && !previewImage && (
        <div className="space-y-2">
          <Label>Current Photo</Label>
          <div className="relative">
            <img
              src={existingPhotoUrl}
              alt="Current milestone photo"
              className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;