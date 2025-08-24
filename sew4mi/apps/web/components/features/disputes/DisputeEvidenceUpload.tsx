/**
 * DisputeEvidenceUpload component for uploading evidence photos and documents
 * Features multiple file upload, preview, and validation
 * @file DisputeEvidenceUpload.tsx
 */

'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, File, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

/**
 * Upload status types
 */
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Evidence file interface
 */
interface EvidenceFile {
  id: string;
  file: File;
  url: string;
  type: 'image' | 'document';
  size: number;
  isValid: boolean;
  error?: string;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadedUrl?: string;
}

/**
 * Props for DisputeEvidenceUpload component
 */
interface DisputeEvidenceUploadProps {
  /** Dispute ID for file organization */
  disputeId?: string;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Callback when files are uploaded successfully */
  onUploadComplete?: (urls: string[]) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Existing evidence URLs */
  existingEvidence?: string[];
  /** Whether component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Supported file types
 */
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'text/plain'];
const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES];

/**
 * Default configuration
 */
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * DisputeEvidenceUpload Component
 * Provides multiple file upload with preview and validation for dispute evidence
 */
export function DisputeEvidenceUpload({
  disputeId,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  onUploadComplete,
  onUploadError,
  existingEvidence = [],
  disabled = false,
  className
}: DisputeEvidenceUploadProps) {
  // State management
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [globalUploadStatus, setGlobalUploadStatus] = useState<UploadStatus>('idle');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  /**
   * Generates unique file ID
   */
  const generateFileId = useCallback(() => {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Gets file type category
   */
  const getFileType = useCallback((mimeType: string): 'image' | 'document' => {
    return SUPPORTED_IMAGE_TYPES.includes(mimeType) ? 'image' : 'document';
  }, []);

  /**
   * Formats file size for display
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  /**
   * Validates uploaded file
   */
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file type
    if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Unsupported file type. Please use JPEG, PNG, WebP, PDF, or TXT files.'
      };
    }

    // Check file size
    if (file.size > maxFileSize) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${formatFileSize(maxFileSize)}`
      };
    }

    // Check total file count
    if (evidenceFiles.length >= maxFiles) {
      return {
        isValid: false,
        error: `Maximum ${maxFiles} files allowed`
      };
    }

    return { isValid: true };
  }, [evidenceFiles.length, maxFiles, maxFileSize, formatFileSize]);

  /**
   * Handles file selection
   */
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newEvidenceFiles: EvidenceFile[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file);
      const fileId = generateFileId();
      const objectUrl = URL.createObjectURL(file);

      const evidenceFile: EvidenceFile = {
        id: fileId,
        file,
        url: objectUrl,
        type: getFileType(file.type),
        size: file.size,
        isValid: validation.isValid,
        error: validation.error,
        uploadStatus: 'idle',
        uploadProgress: 0
      };

      newEvidenceFiles.push(evidenceFile);
    });

    setEvidenceFiles(prev => [...prev, ...newEvidenceFiles]);
  }, [validateFile, generateFileId, getFileType]);

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
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, handleFileSelect]);

  /**
   * Handles file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
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
   * Uploads a single file
   */
  const uploadSingleFile = useCallback(async (evidenceFile: EvidenceFile): Promise<string> => {
    // Update file status to uploading
    setEvidenceFiles(prev => prev.map(f => 
      f.id === evidenceFile.id 
        ? { ...f, uploadStatus: 'uploading', uploadProgress: 0 }
        : f
    ));

    try {
      // Convert file to base64
      const base64Data = await fileToBase64(evidenceFile.file);
      
      // Update progress
      setEvidenceFiles(prev => prev.map(f => 
        f.id === evidenceFile.id 
          ? { ...f, uploadProgress: 50 }
          : f
      ));

      // Prepare upload data
      const uploadData = {
        fileName: evidenceFile.file.name,
        fileType: evidenceFile.file.type,
        fileData: base64Data,
        disputeId: disputeId || 'temp'
      };

      // Make upload request
      const response = await fetch('/api/disputes/evidence/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Update file status to success
      setEvidenceFiles(prev => prev.map(f => 
        f.id === evidenceFile.id 
          ? { 
              ...f, 
              uploadStatus: 'success', 
              uploadProgress: 100,
              uploadedUrl: result.url
            }
          : f
      ));

      return result.url;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Update file status to error
      setEvidenceFiles(prev => prev.map(f => 
        f.id === evidenceFile.id 
          ? { 
              ...f, 
              uploadStatus: 'error', 
              uploadProgress: 0,
              error: errorMessage
            }
          : f
      ));

      throw error;
    }
  }, [disputeId, fileToBase64]);

  /**
   * Uploads all valid files
   */
  const handleUploadAll = useCallback(async () => {
    const validFiles = evidenceFiles.filter(f => f.isValid && f.uploadStatus === 'idle');
    
    if (validFiles.length === 0) {
      return;
    }

    setGlobalUploadStatus('uploading');

    try {
      const uploadPromises = validFiles.map(uploadSingleFile);
      const uploadedUrls = await Promise.all(uploadPromises);
      
      setGlobalUploadStatus('success');
      onUploadComplete?.(uploadedUrls);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setGlobalUploadStatus('error');
      onUploadError?.(errorMessage);
    }
  }, [evidenceFiles, uploadSingleFile, onUploadComplete, onUploadError]);

  /**
   * Removes a file from the list
   */
  const handleRemoveFile = useCallback((fileId: string) => {
    setEvidenceFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

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
      evidenceFiles.forEach(file => {
        URL.revokeObjectURL(file.url);
      });
    };
  }, [evidenceFiles]);

  const hasValidFiles = evidenceFiles.some(f => f.isValid && f.uploadStatus === 'idle');
  const hasUploadingFiles = evidenceFiles.some(f => f.uploadStatus === 'uploading');
  const hasUploadedFiles = evidenceFiles.some(f => f.uploadStatus === 'success');

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
          evidenceFiles.length > 0 && 'border-solid border-primary'
        )}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_SUPPORTED_TYPES.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          multiple
          className="hidden"
        />

        <div className="text-center space-y-4">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">Drop evidence files here or click to browse</p>
            <p className="text-sm text-muted-foreground">
              Maximum {maxFiles} files • {formatFileSize(maxFileSize)} each • Images, PDFs, Text files
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {evidenceFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Evidence Files ({evidenceFiles.length}/{maxFiles})</h4>
          <div className="space-y-2">
            {evidenceFiles.map((evidenceFile) => (
              <div
                key={evidenceFile.id}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg',
                  evidenceFile.isValid 
                    ? evidenceFile.uploadStatus === 'success'
                      ? 'border-green-200 bg-green-50'
                      : evidenceFile.uploadStatus === 'error'
                      ? 'border-red-200 bg-red-50'
                      : 'border-border'
                    : 'border-red-200 bg-red-50'
                )}
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {evidenceFile.type === 'image' ? (
                    <ImageIcon className="h-8 w-8 text-blue-500" />
                  ) : (
                    <File className="h-8 w-8 text-gray-500" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{evidenceFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(evidenceFile.size)} • {evidenceFile.file.type}
                  </p>
                  
                  {/* Upload Progress */}
                  {evidenceFile.uploadStatus === 'uploading' && (
                    <div className="mt-1">
                      <Progress value={evidenceFile.uploadProgress} className="h-1" />
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {evidenceFile.error && (
                    <p className="text-xs text-red-600 mt-1">{evidenceFile.error}</p>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {evidenceFile.uploadStatus === 'success' && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                  {evidenceFile.uploadStatus === 'uploading' && (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Uploading
                    </Badge>
                  )}
                  {evidenceFile.uploadStatus === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  {!evidenceFile.isValid && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(evidenceFile.id);
                  }}
                  disabled={disabled || evidenceFile.uploadStatus === 'uploading'}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Evidence */}
      {existingEvidence.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Existing Evidence</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {existingEvidence.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button size="sm" variant="outline" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Status */}
      {globalUploadStatus === 'success' && hasUploadedFiles && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Evidence files uploaded successfully!
          </AlertDescription>
        </Alert>
      )}

      {globalUploadStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some files failed to upload. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Button */}
      {hasValidFiles && (
        <Button
          onClick={handleUploadAll}
          disabled={disabled || hasUploadingFiles || globalUploadStatus === 'uploading'}
          className="w-full"
        >
          {hasUploadingFiles ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading Evidence...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Evidence Files
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default DisputeEvidenceUpload;