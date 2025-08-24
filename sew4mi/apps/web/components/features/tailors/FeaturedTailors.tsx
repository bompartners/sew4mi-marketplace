'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TailorCard } from './TailorCard';
import { 
  Star, 
  Crown, 
  TrendingUp, 
  Clock, 
  Award,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { FeaturedTailor } from '@sew4mi/shared';
import { cn } from '@/lib/utils';

interface FeaturedTailorsProps {
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

export function FeaturedTailors({ 
  limit = 6, 
  showViewAll = true,
  className 
}: FeaturedTailorsProps) {
  const [featuredTailors, setFeaturedTailors] = useState<FeaturedTailor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch featured tailors
  useEffect(() => {
    const fetchFeaturedTailors = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/tailors/featured?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setFeaturedTailors(data.featuredTailors || []);
      } catch (err) {
        console.error('Failed to fetch featured tailors:', err);
        setError(err instanceof Error ? err.message : 'Failed to load featured tailors');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedTailors();
  }, [limit]);

  // Get icon for featured reason
  const getFeaturedIcon = (reason: string) => {
    switch (reason) {
      case 'HIGH_RATING':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'FAST_RESPONSE':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'NEW_TALENT':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'POPULAR':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'ADMIN_PICK':
        return <Award className="h-4 w-4 text-red-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get label for featured reason
  const getFeaturedLabel = (reason: string) => {
    switch (reason) {
      case 'HIGH_RATING':
        return 'Top Rated';
      case 'FAST_RESPONSE':
        return 'Fast Response';
      case 'NEW_TALENT':
        return 'New Talent';
      case 'POPULAR':
        return 'Most Popular';
      case 'ADMIN_PICK':
        return 'Editor\'s Choice';
      default:
        return 'Featured';
    }
  };

  // Carousel navigation
  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(featuredTailors.length / itemsPerSlide);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCurrentTailors = () => {
    const startIndex = currentSlide * itemsPerSlide;
    return featuredTailors.slice(startIndex, startIndex + itemsPerSlide);
  };

  // Error state
  if (error) {
    return (
      <Card className={cn('p-8 text-center bg-gray-50', className)}>
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
            <Award className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Featured Tailors</h3>
            <p className="text-gray-500 text-sm">
              Unable to load featured tailors at the moment
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-4">
                <Skeleton className="w-full h-48 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (featuredTailors.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <div className="space-y-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Featured Tailors</h3>
            <p className="text-gray-500">
              Check back soon for featured expert tailors in your area
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            Featured Tailors
          </h2>
          <p className="text-gray-600 mt-1">
            Discover top-rated and recommended expert tailors
          </p>
        </div>
        
        {showViewAll && (
          <Button variant="outline" className="hidden sm:flex">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Desktop Grid View */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTailors.map((tailor) => (
            <div key={tailor.id} className="relative">
              <TailorCard tailor={tailor} />
              
              {/* Featured Badge */}
              <div className="absolute -top-2 -right-2 z-10">
                <Badge 
                  className={cn(
                    'text-white text-xs px-2 py-1 shadow-md',
                    tailor.featuredReason === 'HIGH_RATING' && 'bg-yellow-500',
                    tailor.featuredReason === 'FAST_RESPONSE' && 'bg-blue-500',
                    tailor.featuredReason === 'NEW_TALENT' && 'bg-green-500',
                    tailor.featuredReason === 'POPULAR' && 'bg-purple-500',
                    tailor.featuredReason === 'ADMIN_PICK' && 'bg-red-500'
                  )}
                >
                  {getFeaturedIcon(tailor.featuredReason)}
                  <span className="ml-1">{getFeaturedLabel(tailor.featuredReason)}</span>
                </Badge>
              </div>
              
              {/* Promotional Badge */}
              {tailor.promotionalBadge && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="secondary" className="text-xs bg-white/90">
                    {tailor.promotionalBadge}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile/Tablet Carousel View */}
      <div className="lg:hidden">
        <div className="relative">
          {/* Carousel Container */}
          <div className="overflow-hidden rounded-lg">
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {Array.from({ length: totalSlides }, (_, slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
                    {featuredTailors
                      .slice(slideIndex * itemsPerSlide, (slideIndex + 1) * itemsPerSlide)
                      .map((tailor) => (
                        <div key={tailor.id} className="relative">
                          <TailorCard tailor={tailor} />
                          
                          {/* Featured Badge */}
                          <div className="absolute -top-2 -right-2 z-10">
                            <Badge 
                              className={cn(
                                'text-white text-xs px-2 py-1 shadow-md',
                                tailor.featuredReason === 'HIGH_RATING' && 'bg-yellow-500',
                                tailor.featuredReason === 'FAST_RESPONSE' && 'bg-blue-500',
                                tailor.featuredReason === 'NEW_TALENT' && 'bg-green-500',
                                tailor.featuredReason === 'POPULAR' && 'bg-purple-500',
                                tailor.featuredReason === 'ADMIN_PICK' && 'bg-red-500'
                              )}
                            >
                              {getFeaturedIcon(tailor.featuredReason)}
                              <span className="ml-1">{getFeaturedLabel(tailor.featuredReason)}</span>
                            </Badge>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Controls */}
          {totalSlides > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Carousel Indicators */}
        {totalSlides > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalSlides }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* View All Button (Mobile) */}
      {showViewAll && (
        <div className="flex justify-center sm:hidden">
          <Button variant="outline" className="w-full">
            View All Featured Tailors
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}