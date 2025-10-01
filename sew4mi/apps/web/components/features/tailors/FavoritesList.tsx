'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TailorCard } from './TailorCard';
import { FavoriteButton } from './FavoriteButton';
import { 
  Heart, 
  HeartOff, 
  Star, 
  MapPin, 
  Clock,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import { CustomerFavorite, TailorSearchItem } from '@sew4mi/shared';

// Extended favorite type with populated tailor data
interface CustomerFavoriteWithTailor extends CustomerFavorite {
  tailor: TailorSearchItem;
}

interface FavoritesListProps {
  viewMode?: 'grid' | 'list';
  showEmpty?: boolean;
  className?: string;
  limit?: number;
}

export function FavoritesList({ 
  viewMode = 'grid', 
  showEmpty = true, 
  className,
  limit 
}: FavoritesListProps) {
  const { favorites, isLoading, error, refetch } = useFavorites();

  const displayFavorites = limit ? favorites.slice(0, limit) : favorites;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
        ) : (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('p-8 text-center border-red-200 bg-red-50', className)}>
        <div className="space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Unable to Load Favorites</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Empty state
  if (displayFavorites.length === 0) {
    if (!showEmpty) return null;

    return (
      <Card className={cn('p-12 text-center', className)}>
        <div className="space-y-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <HeartOff className="h-10 w-10 text-gray-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Favorite Tailors Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Start building your collection of favorite tailors. Save profiles you like for quick access later.
            </p>
            <div className="space-y-4">
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>Click the heart icon on any tailor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span>Quick access to your preferred tailors</span>
                </div>
              </div>
              <Button 
                onClick={() => window.location.href = '/tailors/search'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Browse Tailors
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-full">
            <Heart className="h-5 w-5 text-red-500 fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Favorite Tailors ({favorites.length})
            </h2>
            <p className="text-gray-600 text-sm">
              Your saved tailor profiles
            </p>
          </div>
        </div>
        
        {limit && favorites.length > limit && (
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard/favorites'}
            className="text-sm"
          >
            View All ({favorites.length})
          </Button>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayFavorites.map((favorite) => {
            const favoriteWithTailor = favorite as CustomerFavoriteWithTailor;
            return (
            <div key={favorite.id} className="relative">
              <TailorCard 
                tailor={favoriteWithTailor.tailor} 
                showDistance={false}
                className="hover:shadow-lg transition-shadow"
              />
              
              {/* Favorite indicator */}
              <div className="absolute -top-2 -right-2 z-10">
                <div className="bg-red-500 rounded-full p-1.5 shadow-md">
                  <Heart className="h-3 w-3 text-white fill-current" />
                </div>
              </div>
              
              {/* Date added */}
              {favorite.createdAt && (
                <div className="absolute bottom-2 left-2 z-10">
                  <Badge variant="secondary" className="text-xs bg-white/90">
                    Added {new Date(favorite.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {displayFavorites.map((favorite) => (
            <FavoriteListItem key={favorite.id} favorite={favorite as CustomerFavoriteWithTailor} />
          ))}
        </div>
      )}
    </div>
  );
}

// List item component for favorite tailors
interface FavoriteListItemProps {
  favorite: CustomerFavoriteWithTailor;
}

function FavoriteListItem({ favorite }: FavoriteListItemProps) {
  const tailor = favorite.tailor;

  const handleViewProfile = () => {
    window.open(`/tailors/${tailor.id}`, '_blank');
  };

  const handleContact = () => {
    // WhatsApp contact functionality would need additional API integration
    // For now, redirect to the tailor's profile page
    window.open(`/tailors/${tailor.id}`, '_blank');
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Profile Image */}
        <div className="flex-shrink-0 relative">
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
          
          {/* Favorite heart */}
          <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
            <Heart className="h-3 w-3 text-white fill-current" />
          </div>
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
              {tailor.specializations.slice(0, 3).map(spec => (
                <Badge key={spec} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
              {tailor.specializations.length > 3 && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  +{tailor.specializations.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Date added */}
          <div className="text-sm text-gray-500 mb-3">
            <p>Added on {new Date(favorite.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button 
            size="sm" 
            onClick={handleViewProfile}
            className="min-w-[100px]"
          >
            View Profile
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleContact}
            className="min-w-[100px]"
          >
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