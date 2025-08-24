'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedWork {
  imageUrl: string;
  title: string;
  description: string;
  garmentType: string;
}

interface PortfolioGalleryProps {
  images: string[];
  featuredWork?: FeaturedWork[];
  categories?: string[];
}

export function PortfolioGallery({ images, featuredWork = [], categories = ['All Work'] }: PortfolioGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Work');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (src: string) => {
    setLoadedImages(prev => new Set(prev).add(src));
  };

  const handleImageError = (src: string) => {
    console.warn(`Failed to load image: ${src}`);
  };

  const openLightbox = useCallback((index: number) => {
    setSelectedImage(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (selectedImage === null) return;
    
    const allImages = [...featuredWork.map(fw => fw.imageUrl), ...images.filter(img => !featuredWork.some(fw => fw.imageUrl === img))];
    const newIndex = direction === 'prev' 
      ? (selectedImage - 1 + allImages.length) % allImages.length
      : (selectedImage + 1) % allImages.length;
    
    setSelectedImage(newIndex);
  }, [selectedImage, images, featuredWork]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage === null) return;
      
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          navigateImage('prev');
          break;
        case 'ArrowRight':
          navigateImage('next');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, navigateImage, closeLightbox]);

  if (!images.length && !featuredWork.length) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Portfolio Images</h3>
        <p className="text-gray-600">This tailor hasn't uploaded any portfolio images yet.</p>
      </div>
    );
  }

  const allImages = [...featuredWork.map(fw => fw.imageUrl), ...images.filter(img => !featuredWork.some(fw => fw.imageUrl === img))];

  return (
    <div className="space-y-6">
      {/* Featured Work */}
      {featuredWork.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Featured Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredWork.map((work, index) => (
              <Card key={index} className="group cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <Image
                      src={work.imageUrl}
                      alt={work.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      onLoad={() => handleImageLoad(work.imageUrl)}
                      onError={() => handleImageError(work.imageUrl)}
                      onClick={() => openLightbox(allImages.indexOf(work.imageUrl))}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{work.title}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {work.garmentType}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{work.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'transition-colors',
                selectedCategory === category && 'bg-green-600 hover:bg-green-700'
              )}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* All Portfolio Images */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Portfolio Gallery</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
              onClick={() => openLightbox(index)}
            >
              <Image
                src={image}
                alt={`Portfolio image ${index + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-110"
                onLoad={() => handleImageLoad(image)}
                onError={() => handleImageError(image)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Loading placeholder */}
              {!loadedImages.has(image) && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Image count */}
      <div className="text-center text-sm text-gray-500">
        Showing {allImages.length} portfolio {allImages.length === 1 ? 'image' : 'images'}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedImage !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black">
          {selectedImage !== null && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Navigation buttons */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateImage('prev')}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateImage('next')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Current image */}
              <div className="relative w-full h-full flex items-center justify-center p-8">
                <Image
                  src={allImages[selectedImage]}
                  alt={`Portfolio image ${selectedImage + 1}`}
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Image counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black bg-opacity-50 rounded-full text-white text-sm">
                {selectedImage + 1} / {allImages.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}