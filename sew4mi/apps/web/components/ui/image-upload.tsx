'use client';

/**
 * ImageUpload Component
 * Reusable image upload component with drag-and-drop, preview, and progress tracking
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Upload as UploadIcon, Image as ImageIcon } from 'lucide-react';
import { uploadMultipleImages, UploadProgress } from '@/lib/utils/image-upload';

export interface ImageUploadProps {
  /**
   * Supabase Storage bucket name
   */
  bucket: string;
  /**
   * Optional folder path within bucket
   */
  folder?: string;
  /**
   * Maximum number of images allowed
   */
  maxImages?: number;
  /**
   * Maximum file size in MB
   */
  maxSizeMB?: number;
  /**
   * Callback when images are uploaded
   */
  onUploadComplete?: (urls: string[]) => void;
  /**
   * Callback when images are removed
   */
  onRemove?: (url: string) => void;
  /**
   * Initial image URLs
   */
  initialImages?: string[];
  /**
   * Accept multiple files
   */
  multiple?: boolean;
  /**
   * Custom className
   */
  className?: string;
}

export function ImageUpload({
  bucket,
  folder = '',
  maxImages = 5,
  maxSizeMB = 5,
  onUploadComplete,
  onRemove,
  initialImages = [],
  multiple = true,
  className = ''
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialImages);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);

    // Validate max images
    const filesArray = Array.from(files);
    const totalImages = uploadedImages.length + filesArray.length;
    
    if (totalImages > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Upload files
    try {
      const urls = await uploadMultipleImages(filesArray, {
        bucket,
        folder,
        maxSizeMB,
        onProgress: (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [progress.fileName]: progress
          }));
        }
      });

      const newImages = [...uploadedImages, ...urls];
      setUploadedImages(newImages);
      setUploadProgress({});
      
      onUploadComplete?.(urls);
    } catch (err) {
      setError((err as Error).message);
      setUploadProgress({});
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemove = (url: string) => {
    setUploadedImages(prev => prev.filter(img => img !== url));
    onRemove?.(url);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const isUploading = Object.keys(uploadProgress).length > 0;
  const canUploadMore = uploadedImages.length < maxImages;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple={multiple}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          
          <p className="text-sm text-muted-foreground mb-4">
            {isDragging
              ? 'Drop images here'
              : 'Drag and drop images here, or click to select'}
          </p>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isUploading}
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            Choose Images
          </Button>
          
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG, WEBP up to {maxSizeMB}MB each ({uploadedImages.length}/{maxImages})
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          {Object.values(uploadProgress).map((progress) => (
            <div key={progress.fileName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{progress.fileName}</span>
                <span className="text-muted-foreground ml-2">
                  {progress.status === 'completed' ? '✓' : `${progress.progress}%`}
                </span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Uploaded Images Preview */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {uploadedImages.map((url, index) => (
            <div key={url} className="relative group aspect-square">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(url)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

