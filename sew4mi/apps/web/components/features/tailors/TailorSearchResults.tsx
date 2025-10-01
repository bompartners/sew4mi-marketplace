'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapView } from './MapView';
import { TailorCard } from './TailorCard';
import { FavoriteButton } from './FavoriteButton';
import { 
  MapPin, 
  Star, 
  Clock, 
  MessageCircle,
  ExternalLink,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  TailorSearchResult,
  TailorSearchItem,
  DISPLAY_MODES 
} from '@sew4mi/shared';

interface TailorSearchResultsProps {
  results: TailorSearchResult | null;
  displayMode: string;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

export function TailorSearchResults({
  results,
  displayMode,
  isLoading,
  hasMore,
  onLoadMore,
  userLocation,
  className,
}: TailorSearchResultsProps) {
  const [selectedTailorId, setSelectedTailorId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (isLoading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [isLoading, hasMore, onLoadMore]);

  // Handle tailor selection from map
  const handleTailorSelect = useCallback((tailor: TailorSearchItem | null) => {
    setSelectedTailorId(tailor?.id || null);
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback((tailor: TailorSearchItem) => {
    setSelectedTailorId(tailor.id);
  }, []);

  const tailors = results?.tailors || [];

  // Empty state
  if (!isLoading && tailors.length === 0) {
    return (
      <Card className={cn('p-12 text-center', className)}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tailors Found</h3>
            <p className="text-gray-500 mb-4">
              We couldn't find any tailors matching your search criteria.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Try adjusting your filters:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Expand your location search area</li>
                <li>Remove some specialization filters</li>
                <li>Lower the minimum rating requirement</li>
                <li>Increase your budget range</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Map view
  if (displayMode === DISPLAY_MODES.MAP) {
    return (
      <div className={cn('space-y-4', className)}>
        <MapView
          tailors={tailors}
          userLocation={userLocation}
          selectedTailorId={selectedTailorId}
          onTailorSelect={handleTailorSelect}
          onMarkerClick={handleMarkerClick}
          height={600}
        />
        
        {/* Tailor count info */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {tailors.length} tailor{tailors.length !== 1 ? 's' : ''} on map
          </span>
          {results?.searchMeta && (
            <span>
              Search completed in {results.searchMeta.searchTime}ms
            </span>
          )}
        </div>

        {/* Load more for infinite scroll */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="flex justify-center py-4"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading more tailors...
              </div>
            ) : (
              <Button 
                onClick={onLoadMore} 
                variant="outline"
                className="text-sm"
              >
                Load More Tailors
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid view
  if (displayMode === DISPLAY_MODES.GRID) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tailors.map((tailor) => (
            <TailorCard
              key={tailor.id}
              tailor={tailor}
              showDistance={!!userLocation}
              isSelected={tailor.id === selectedTailorId}
              onSelect={() => setSelectedTailorId(tailor.id)}
            />
          ))}
          
          {/* Loading skeletons */}
          {isLoading && (
            <>
              {[...Array(6)].map((_, i) => (
                <Card key={`skeleton-${i}`} className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Load more section */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="flex justify-center py-6"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading more tailors...
              </div>
            ) : (
              <Button onClick={onLoadMore} variant="outline">
                Load More Tailors
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // List view (default)
  return (
    <div className={cn('space-y-4', className)}>
      {tailors.map((tailor) => (
        <TailorListItem
          key={tailor.id}
          tailor={tailor}
          userLocation={userLocation}
          isSelected={tailor.id === selectedTailorId}
          onSelect={() => setSelectedTailorId(tailor.id)}
        />
      ))}
      
      {/* Loading skeletons */}
      {isLoading && (
        <>
          {[...Array(5)].map((_, i) => (
            <Card key={`skeleton-${i}`} className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Load more section */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex justify-center py-6"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading more tailors...
            </div>
          ) : (
            <Button onClick={onLoadMore} variant="outline" size="lg">
              Load More Tailors
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// List item component
interface TailorListItemProps {
  tailor: TailorSearchItem;
  userLocation?: { lat: number; lng: number } | null;
  isSelected?: boolean;
  onSelect?: () => void;
}

function TailorListItem({
  tailor,
  isSelected,
  onSelect,
}: TailorListItemProps) {
  const handleContact = useCallback(() => {
    // TODO: TailorSearchItem doesn't include user.whatsappNumber
    // Redirect to tailor profile where full contact info is available
    console.log('Contact tailor:', tailor.id);
    window.open(`/tailors/${tailor.id}`, '_blank');
  }, [tailor.id]);

  const handleViewProfile = useCallback(() => {
    window.open(`/tailors/${tailor.id}`, '_blank');
  }, [tailor.id]);

  return (
    <Card 
      className={cn(
        'p-6 cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-blue-500 shadow-md'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          {tailor.profilePhoto ? (
            <img
              src={tailor.profilePhoto}
              alt={tailor.businessName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {tailor.businessName}
              </h3>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600">
                    {tailor.rating.toFixed(1)} ({tailor.totalReviews} reviews)
                  </span>
                </div>
                {tailor.averageResponseHours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Responds in {tailor.averageResponseHours}h
                    </span>
                  </div>
                )}
                {tailor.distance && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {tailor.distance.toFixed(1)} km away
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Verification Badge */}
            {tailor.verificationStatus === 'VERIFIED' && (
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                ✓ Verified
              </Badge>
            )}
          </div>

          {/* Location */}
          {tailor.city && (
            <div className="flex items-center gap-1 mb-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{tailor.city}</span>
            </div>
          )}

          {/* Specializations */}
          {tailor.specializations && tailor.specializations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tailor.specializations.slice(0, 4).map(spec => (
                <Badge key={spec} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
              {tailor.specializations.length > 4 && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  +{tailor.specializations.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {/* Bio excerpt */}
          {tailor.bio && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {tailor.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{tailor.completedOrders} orders completed</span>
            <span>{(tailor.onTimeDeliveryRate * 100).toFixed(0)}% on-time delivery</span>
            {tailor.minPrice && (
              <span>From ₵{tailor.minPrice}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 ml-4">
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleViewProfile();
            }}
            className="min-w-[100px]"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View Profile
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleContact();
            }}
            className="min-w-[100px]"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Contact
          </Button>
          <FavoriteButton
            tailor={tailor}
            variant="ghost"
            size="sm"
            showText={true}
            className="min-w-[100px] justify-start"
          />
        </div>
      </div>
    </Card>
  );
}