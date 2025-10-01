/**
 * PhotoModal component for viewing milestone photos in full screen
 * Features zoom, navigation, and optimized accessibility
 * @file PhotoModal.tsx
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MilestoneStage } from '@sew4mi/shared';
import { getMilestoneDisplayInfo } from '@sew4mi/shared/utils/order-progress';
import { PhotoErrorBoundary, usePhotoErrorHandler } from './photo-error-boundary';

/**
 * Photo data interface for modal
 */
export interface ModalPhoto {
  id: string;
  milestone: MilestoneStage;
  photoUrl: string;
  cdnUrl?: string;
  notes?: string;
  verifiedAt: Date;
  verifiedBy: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

/**
 * Props for PhotoModal component
 */
interface PhotoModalProps {
  /** Photo to display */
  photo: ModalPhoto;
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Callback to go to previous photo */
  onPrevious?: () => void;
  /** Callback to go to next photo */
  onNext?: () => void;
  /** Whether previous photo is available */
  hasPrevious?: boolean;
  /** Whether next photo is available */
  hasNext?: boolean;
  /** Whether download option is available */
  allowDownload?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Photo loading states
 */
type LoadingState = 'loading' | 'loaded' | 'error';

/**
 * Zoom and pan state
 */
interface ViewState {
  zoom: number;
  position: { x: number; y: number };
}

/**
 * PhotoModal Component
 * Full-screen photo viewer with zoom, pan, and navigation
 */
export function PhotoModal({
  photo,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  allowDownload = false,
  className
}: PhotoModalProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, position: { x: 0, y: 0 } });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, positionX: 0, positionY: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const milestoneInfo = getMilestoneDisplayInfo(photo.milestone);
  
  // Error handling hooks
  const { handleImageError: handlePhotoError, handleImageLoad: handlePhotoLoad } = usePhotoErrorHandler();

  // Reset view state when photo changes
  useEffect(() => {
    setViewState({ zoom: 1, position: { x: 0, y: 0 } });
    setLoadingState('loading');
    setIsDragging(false);
  }, [photo.id]);

  const handleImageLoad = useCallback((event?: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadingState('loaded');
    if (event) {
      handlePhotoLoad(event, () => {
        console.log('Photo modal image loaded successfully:', photo.id);
      });
    }
  }, [handlePhotoLoad, photo.id]);

  const handleImageError = useCallback((event?: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadingState('error');
    if (event) {
      handlePhotoError(event, photo.photoUrl, milestoneInfo.name);
    }
  }, [handlePhotoError, photo.photoUrl, milestoneInfo.name]);

  const handleZoomIn = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + 0.5, 4)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewState(prev => {
      const newZoom = Math.max(prev.zoom - 0.5, 0.25);
      // Reset position if zooming out to 1x or less
      const newPosition = newZoom <= 1 ? { x: 0, y: 0 } : prev.position;
      return {
        zoom: newZoom,
        position: newPosition
      };
    });
  }, []);

  const handleResetView = useCallback(() => {
    setViewState({ zoom: 1, position: { x: 0, y: 0 } });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewState.zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        positionX: viewState.position.x,
        positionY: viewState.position.y
      });
    }
  }, [viewState.zoom, viewState.position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && viewState.zoom > 1) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setViewState(prev => ({
        ...prev,
        position: {
          x: dragStart.positionX + deltaX,
          y: dragStart.positionY + deltaY
        }
      }));
    }
  }, [isDragging, dragStart, viewState.zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      setViewState(prev => {
        const newZoom = Math.max(0.25, Math.min(4, prev.zoom + delta));
        const newPosition = newZoom <= 1 ? { x: 0, y: 0 } : prev.position;
        return {
          zoom: newZoom,
          position: newPosition
        };
      });
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    
    try {
      setIsDownloading(true);
      const imageUrl = photo.cdnUrl || photo.photoUrl;
      const response = await fetch(imageUrl);
      
      if (!response.ok) throw new Error('Download failed');
      
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
      // Could add toast notification here
    } finally {
      setIsDownloading(false);
    }
  }, [photo, isDownloading]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (hasPrevious) onPrevious?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (hasNext) onNext?.();
        break;
      case 'Escape':
        onClose();
        break;
      case '+':
      case '=':
        e.preventDefault();
        handleZoomIn();
        break;
      case '-':
        e.preventDefault();
        handleZoomOut();
        break;
      case '0':
        e.preventDefault();
        handleResetView();
        break;
    }
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext, onClose, handleZoomIn, handleZoomOut, handleResetView]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          'max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden bg-black/95',
          className
        )}
        aria-describedby="photo-modal-description"
      >
        {/* Header */}
        <DialogHeader className="absolute top-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{milestoneInfo.icon}</span>
              <div>
                <DialogTitle className="text-lg text-white">{milestoneInfo.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={photo.approvalStatus === 'APPROVED' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {photo.approvalStatus}
                  </Badge>
                  <span className="text-sm text-gray-300">
                    {new Date(photo.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleZoomOut} 
                disabled={viewState.zoom <= 0.25}
                className="text-white hover:bg-white/10"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetView}
                className="text-white hover:bg-white/10 min-w-[3rem] text-center"
                title="Reset view (0)"
              >
                {Math.round(viewState.zoom * 100)}%
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleZoomIn} 
                disabled={viewState.zoom >= 4}
                className="text-white hover:bg-white/10"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              {/* Download Button */}
              {allowDownload && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="text-white hover:bg-white/10"
                  title="Download image"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {/* External Link */}
              <Button 
                size="sm" 
                variant="ghost" 
                asChild
                className="text-white hover:bg-white/10"
                title="Open in new tab"
              >
                <a href={photo.cdnUrl || photo.photoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              
              {/* Close Button */}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onClose}
                className="text-white hover:bg-white/10"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Image Container */}
        <div 
          ref={containerRef}
          className="relative flex-1 flex items-center justify-center pt-20 pb-20 overflow-hidden"
          onWheel={handleWheel}
          id="photo-modal-description"
        >
          {/* Loading State */}
          {loadingState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
          )}
          
          {/* Error State */}
          {loadingState === 'error' && (
            <div className="text-center text-gray-300">
              <AlertCircle className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg">Failed to load image</p>
              <p className="text-sm text-gray-400 mt-2">Please check your connection and try again</p>
            </div>
          )}
          
          {/* Image with Error Boundary */}
          <PhotoErrorBoundary
            photoUrl={photo.cdnUrl || photo.photoUrl}
            altText={`${milestoneInfo.name} verification photo from ${new Date(photo.verifiedAt).toLocaleDateString()}`}
            milestoneName={milestoneInfo.name}
            size="xl"
            allowRetry={true}
            onError={(error, errorType) => {
              console.error('Photo modal error boundary triggered:', { error, errorType, photoId: photo.id });
              handleImageError();
            }}
            onRetry={() => {
              console.log('Retrying photo modal image load:', photo.id);
              setLoadingState('loading');
            }}
            className="flex items-center justify-center w-full h-full"
          >
            <img
              ref={imageRef}
              src={photo.cdnUrl || photo.photoUrl}
              alt={`${milestoneInfo.name} verification photo from ${new Date(photo.verifiedAt).toLocaleDateString()}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={cn(
                'max-w-full max-h-full object-contain transition-transform select-none',
                viewState.zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
                loadingState !== 'loaded' && 'invisible'
              )}
              style={{
                transform: `scale(${viewState.zoom}) translate(${viewState.position.x / viewState.zoom}px, ${viewState.position.y / viewState.zoom}px)`,
                transformOrigin: 'center center'
              }}
              draggable={false}
            />
          </PhotoErrorBoundary>
        </div>

        {/* Footer Navigation and Notes */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm">
          <div className="p-4">
            {/* Notes */}
            {photo.notes && (
              <div className="text-center mb-4">
                <p className="text-sm text-gray-300 italic max-w-2xl mx-auto">
                  "{photo.notes}"
                </p>
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="text-white hover:bg-white/10 gap-2"
                title="Previous photo (←)"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="text-center text-sm text-gray-400">
                Use mouse wheel + Ctrl to zoom • Arrow keys to navigate
              </div>
              
              <Button
                variant="ghost" 
                onClick={onNext}
                disabled={!hasNext}
                className="text-white hover:bg-white/10 gap-2"
                title="Next photo (→)"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PhotoModal;