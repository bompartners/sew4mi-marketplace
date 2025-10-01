'use client';

import React, { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton } from './FavoriteButton';
import { 
  Star, 
  MapPin, 
  Clock, 
  MessageCircle, 
  ExternalLink,
  CheckCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TailorSearchItem } from '@sew4mi/shared';

interface TailorCardProps {
  tailor: TailorSearchItem;
  showDistance?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function TailorCard({
  tailor,
  showDistance = false,
  isSelected = false,
  onSelect,
  className,
}: TailorCardProps) {
  const handleViewProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/tailors/${tailor.id}`, '_blank');
  }, [tailor.id]);

  const handleContact = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // TODO: TailorSearchItem doesn't include user.whatsappNumber
    // Need to either fetch full profile or redirect to profile page for contact
    console.log('Contact tailor:', tailor.id);
    // Redirect to tailor profile where full contact info is available
    window.open(`/tailors/${tailor.id}`, '_blank');
  }, [tailor.id]);


  const handleCardClick = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1',
        isSelected && 'ring-2 ring-blue-500 shadow-lg',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Image/Avatar Section */}
      <div className="relative">
        {tailor.profilePhoto ? (
          <img
            src={tailor.profilePhoto}
            alt={tailor.businessName}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-blue-200 rounded-full flex items-center justify-center">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-blue-600 font-medium">{tailor.businessName}</p>
            </div>
          </div>
        )}

        {/* Favorite Button */}
        <div className="absolute top-2 right-2">
          <FavoriteButton
            tailor={tailor}
            variant="ghost"
            size="sm"
            className="bg-white/80 hover:bg-white transition-colors"
          />
        </div>

        {/* Verification Badge */}
        {tailor.verificationStatus === 'VERIFIED' && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-green-600 text-white text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        )}

        {/* Distance Badge */}
        {showDistance && tailor.distance && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {tailor.distance.toFixed(1)} km
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {tailor.businessName}
          </h3>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-900">
                {tailor.rating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                ({tailor.totalReviews})
              </span>
            </div>
            
            {tailor.averageResponseHours && tailor.averageResponseHours <= 2 && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                Fast Response
              </Badge>
            )}
          </div>
        </div>

        {/* Location */}
        {tailor.city && (
          <div className="flex items-center gap-1 mb-3">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{tailor.city}</span>
            {tailor.averageResponseHours && (
              <>
                <span className="text-gray-400">•</span>
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {tailor.averageResponseHours}h response
                </span>
              </>
            )}
          </div>
        )}

        {/* Specializations */}
        {tailor.specializations && tailor.specializations.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {tailor.specializations.slice(0, 3).map(spec => (
                <Badge 
                  key={spec} 
                  variant="outline" 
                  className="text-xs text-blue-700 border-blue-200 bg-blue-50"
                >
                  {spec}
                </Badge>
              ))}
              {tailor.specializations.length > 3 && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  +{tailor.specializations.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
          <span>{tailor.completedOrders} orders</span>
          <span>{(tailor.onTimeDeliveryRate * 100).toFixed(0)}% on-time</span>
          {tailor.minPrice && (
            <span className="font-medium text-gray-900">From ₵{tailor.minPrice}</span>
          )}
        </div>

        {/* Bio Preview */}
        {tailor.bio && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {tailor.bio}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleViewProfile}
            className="flex-1 h-8 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Profile
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleContact}
            className="flex-1 h-8 text-xs"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Contact
          </Button>
        </div>

        {/* Additional Info (appears on hover) */}
        <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {tailor.yearsOfExperience ? `${tailor.yearsOfExperience} years exp.` : 'New tailor'}
            </span>
            {tailor.rushOrderFeePercentage > 0 && (
              <span>Rush orders: +{tailor.rushOrderFeePercentage}%</span>
            )}
          </div>
          
          {tailor.portfolioImages && tailor.portfolioImages.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500">Portfolio:</span>
              <div className="flex -space-x-1">
                {tailor.portfolioImages.slice(0, 3).map((image, idx) => (
                  <img
                    key={idx}
                    src={image}
                    alt={`Portfolio ${idx + 1}`}
                    className="w-6 h-6 rounded object-cover border border-white"
                  />
                ))}
                {tailor.portfolioImages.length > 3 && (
                  <div className="w-6 h-6 rounded bg-gray-100 border border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600">+{tailor.portfolioImages.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
    </Card>
  );
}