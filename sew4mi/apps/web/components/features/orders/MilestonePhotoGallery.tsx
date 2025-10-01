/**
 * MilestonePhotoGallery component for displaying milestone photos
 * Features photo carousel, zoom functionality, and optimized loading for Ghana's connectivity
 * @file MilestonePhotoGallery.tsx
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MilestoneStage, OrderMilestone } from '@sew4mi/shared';
import { getMilestoneDisplayInfo } from '@sew4mi/shared/utils/order-progress';
import { PhotoErrorBoundary, usePhotoErrorHandler } from './photo-error-boundary';

/**
 * Photo data interface for gallery
 */
interface MilestonePhoto {
  id: string;
  milestone: MilestoneStage;
  photoUrl: string;
  thumbnailUrl?: string;
  cdnUrl?: string;
  notes?: string;
  verifiedAt: Date;
  verifiedBy: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

/**
 * Props for MilestonePhotoGallery component
 */
interface MilestonePhotoGalleryProps {
  /** Array of milestone data with photos */
  milestones: OrderMilestone[];
  /** Currently selected photo index */
  selectedIndex?: number;
  /** Callback when photo selection changes */
  onPhotoSelect?: (index: number) => void;
  /** Whether to show approval status badges */
  showApprovalStatus?: boolean;
  /** Whether photos are clickable */
  interactive?: boolean;
  /** Maximum height for the gallery */
  maxHeight?: string;
  /** Whether to show photo download option */
  allowDownload?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for PhotoModal component
 */
interface PhotoModalProps {
  photo: MilestonePhoto;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  allowDownload?: boolean;
}

/**
 * Photo loading states
 */
type LoadingState = 'loading' | 'loaded' | 'error';

/**
 * PhotoModal Component
 * Displays milestone photo in full-screen modal with zoom and navigation
 */
function PhotoModal({
  photo,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  allowDownload = false
}: PhotoModalProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const milestoneInfo = getMilestoneDisplayInfo(photo.milestone);

  // Reset zoom and position when photo changes
  useEffect(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    setLoadingState('loading');
  }, [photo.id]);

  const handleImageLoad = useCallback(() => {
    setLoadingState('loaded');
  }, []);

  const handleImageError = useCallback(() => {
    console.warn('Failed to load milestone photo:', photo.photoUrl);
    setLoadingState('error');
  }, [photo.photoUrl]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoomLevel, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(photo.cdnUrl || photo.photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milestone-${photo.milestone}-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [photo]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        if (hasPrevious) onPrevious?.();
        break;
      case 'ArrowRight':
        if (hasNext) onNext?.();
        break;
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
    }
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext, onClose, handleZoomIn, handleZoomOut]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{milestoneInfo.icon}</span>
              <div>
                <DialogTitle className="text-lg">{milestoneInfo.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={photo.approvalStatus === 'APPROVED' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {photo.approvalStatus}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(photo.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button size="sm" variant="ghost" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button size="sm" variant="ghost" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              {/* Download Button */}
              {allowDownload && (
                <Button size="sm" variant="ghost" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              {/* External Link */}
              <Button size="sm" variant="ghost" asChild>
                <a href={photo.cdnUrl || photo.photoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              
              {/* Close Button */}
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Image Container */}
        <div className="relative flex-1 flex items-center justify-center bg-black/5 pt-20 pb-16">
          {loadingState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="w-96 h-96" />
            </div>
          )}
          
          {loadingState === 'error' && (
            <div className="text-center text-muted-foreground">
              <p>Failed to load image</p>
            </div>
          )}
          
          <img
            ref={imageRef}
            src={photo.cdnUrl || photo.photoUrl}
            alt={`${milestoneInfo.name} photo`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={cn(
              'max-w-full max-h-full object-contain transition-transform',
              zoomLevel > 1 ? 'cursor-grab' : 'cursor-default',
              isDragging && 'cursor-grabbing',
              loadingState !== 'loaded' && 'invisible'
            )}
            style={{
              transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
              transformOrigin: 'center center'
            }}
            draggable={false}
          />
        </div>

        {/* Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {photo.notes && (
              <div className="flex-1 text-center px-4">
                <p className="text-sm text-muted-foreground italic">"{photo.notes}"</p>
              </div>
            )}
            
            <Button
              variant="ghost" 
              onClick={onNext}
              disabled={!hasNext}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * MilestonePhotoGallery Component
 * Displays milestone photos in a responsive grid with modal viewing
 */
export function MilestonePhotoGallery({
  milestones,
  selectedIndex,
  onPhotoSelect,
  showApprovalStatus = true,
  interactive = true,
  maxHeight = '400px',
  allowDownload = false,
  className
}: MilestonePhotoGalleryProps) {
  const [modalPhoto, setModalPhoto] = useState<MilestonePhoto | null>(null);
  const [modalIndex, setModalIndex] = useState<number>(0);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, LoadingState>>({});
  
  // Error handling hooks
  const { handleImageError: handlePhotoError, handleImageLoad: handlePhotoLoad } = usePhotoErrorHandler();

  // Convert milestones to photo data
  const photos: MilestonePhoto[] = milestones
    .filter(m => m.photoUrl)
    .map(milestone => ({
      id: milestone.id,
      milestone: milestone.milestone,
      photoUrl: milestone.photoUrl,
      thumbnailUrl: milestone.photoUrl, // Use same URL for now
      cdnUrl: milestone.photoUrl,
      notes: milestone.notes,
      verifiedAt: milestone.verifiedAt,
      verifiedBy: milestone.verifiedBy,
      approvalStatus: milestone.approvalStatus
    }));

  const handleImageLoad = useCallback((photoId: string, event?: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoadingStates(prev => ({ ...prev, [photoId]: 'loaded' }));
    if (event) {
      handlePhotoLoad(event, () => {
        console.log('Photo loaded successfully:', photoId);
      });
    }
  }, [handlePhotoLoad]);

  const handleImageError = useCallback((photoId: string, event?: React.SyntheticEvent<HTMLImageElement>, photoUrl?: string, milestoneName?: string) => {
    setImageLoadingStates(prev => ({ ...prev, [photoId]: 'error' }));
    if (event) {
      handlePhotoError(event, photoUrl, milestoneName);
    }
  }, [handlePhotoError]);

  const openModal = useCallback((photo: MilestonePhoto, index: number) => {
    if (interactive) {
      setModalPhoto(photo);
      setModalIndex(index);
      onPhotoSelect?.(index);
    }
  }, [interactive, onPhotoSelect]);

  const closeModal = useCallback(() => {
    setModalPhoto(null);
  }, []);

  const goToPrevious = useCallback(() => {
    const prevIndex = modalIndex > 0 ? modalIndex - 1 : photos.length - 1;
    setModalIndex(prevIndex);
    setModalPhoto(photos[prevIndex]);
    onPhotoSelect?.(prevIndex);
  }, [modalIndex, photos, onPhotoSelect]);

  const goToNext = useCallback(() => {
    const nextIndex = modalIndex < photos.length - 1 ? modalIndex + 1 : 0;
    setModalIndex(nextIndex);
    setModalPhoto(photos[nextIndex]);
    onPhotoSelect?.(nextIndex);
  }, [modalIndex, photos, onPhotoSelect]);

  if (photos.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-muted-foreground">No milestone photos available yet</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Gallery Grid */}
      <div 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto"
        style={{ maxHeight }}
      >
        {photos.map((photo, index) => {
          const milestoneInfo = getMilestoneDisplayInfo(photo.milestone);
          const loadingState = imageLoadingStates[photo.id] || 'loading';
          const isSelected = selectedIndex === index;
          
          return (
            <PhotoErrorBoundary
              key={photo.id}
              photoUrl={photo.photoUrl}
              altText={`${milestoneInfo.name} photo`}
              milestoneName={milestoneInfo.name}
              size="md"
              allowRetry={true}
              onError={(error, errorType) => {
                console.error('Photo error boundary triggered:', { error, errorType, photoId: photo.id });
                handleImageError(photo.id, undefined, photo.photoUrl, milestoneInfo.name);
              }}
              onRetry={() => {
                console.log('Retrying photo load:', photo.id);
                setImageLoadingStates(prev => ({ ...prev, [photo.id]: 'loading' }));
              }}
            >
              <div
                data-photo-container
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden bg-muted group',
                  interactive && 'cursor-pointer hover:ring-2 hover:ring-primary/20',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => openModal(photo, index)}
              >
              {/* Loading State */}
              {loadingState === 'loading' && (
                <Skeleton className="absolute inset-0" />
              )}
              
              {/* Error State */}
              {loadingState === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  Failed to load
                </div>
              )}
              
              {/* Image */}
              <img
                src={photo.thumbnailUrl || photo.photoUrl}
                alt={`${milestoneInfo.name} photo`}
                onLoad={(e) => handleImageLoad(photo.id, e)}
                onError={(e) => handleImageError(photo.id, e, photo.photoUrl, milestoneInfo.name)}
                className={cn(
                  'w-full h-full object-cover transition-transform group-hover:scale-105',
                  loadingState !== 'loaded' && 'invisible'
                )}
              />
              
              {/* Overlay with milestone info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{milestoneInfo.icon}</span>
                      <div className="text-white">
                        <p className="text-sm font-medium truncate">{milestoneInfo.name}</p>
                        <p className="text-xs opacity-75">
                          {new Date(photo.verifiedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {showApprovalStatus && (
                      <Badge 
                        variant={photo.approvalStatus === 'APPROVED' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {photo.approvalStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Hover overlay */}
              {interactive && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              )}
              </div>
            </PhotoErrorBoundary>
          );
        })}
      </div>
      
      {/* Photo Modal */}
      {modalPhoto && (
        <PhotoModal
          photo={modalPhoto}
          isOpen={true}
          onClose={closeModal}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={photos.length > 1}
          hasNext={photos.length > 1}
          allowDownload={allowDownload}
        />
      )}
    </div>
  );
}

export default MilestonePhotoGallery;