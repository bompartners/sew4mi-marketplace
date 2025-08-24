'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TailorSearchItem } from '@sew4mi/shared';
import { useFavorites } from '@/hooks/useFavorites';
import { useSearchAnalytics } from '@/hooks/useSearchAnalytics';

interface FavoriteButtonProps {
  tailor: TailorSearchItem;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function FavoriteButton({
  tailor,
  variant = 'ghost',
  size = 'sm',
  showText = false,
  className,
}: FavoriteButtonProps) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const { trackFavorite } = useSearchAnalytics();
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const favorited = isFavorite(tailor.id);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    try {
      setIsLoading(true);
      const wasFavorited = favorited;
      await toggleFavorite(tailor);
      
      // Track the favorite action
      trackFavorite(tailor.id, wasFavorited ? 'removed' : 'added');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Could show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (!showText) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        onClick={handleToggleFavorite}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={isLoading}
        className={cn(
          'transition-colors',
          favorited && variant === 'ghost' && 'text-red-500 hover:text-red-600',
          favorited && variant === 'outline' && 'border-red-300 text-red-600 hover:bg-red-50',
          className
        )}
        aria-label={favorited ? `Remove ${tailor.businessName} from favorites` : `Add ${tailor.businessName} to favorites`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Heart
              className={cn(
                'h-4 w-4',
                favorited ? 'fill-current text-red-500' : 'text-gray-400 hover:text-red-500',
                showText && 'mr-2'
              )}
            />
            {showText && (
              <span className={cn(favorited && 'text-red-600')}>
                {favorited ? 'Saved' : 'Save'}
              </span>
            )}
          </>
        )}
      </Button>

      {/* Tooltip */}
      {showTooltip && !showText && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
          {favorited ? 'Remove from favorites' : 'Add to favorites'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
}