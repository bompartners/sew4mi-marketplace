'use client';

/**
 * Component for Story 4.3: Favorite Card
 */

import { useState } from 'react';
import { MoreVertical, Edit2, Trash2, Share2, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { useFavoriteOrders } from '@/hooks/useFavoriteOrders';
import { useReorder } from '@/hooks/useReorder';
import { useToast } from '@/hooks/use-toast';
import type { FavoriteOrder } from '@sew4mi/shared/types';

interface FavoriteCardProps {
  favorite: FavoriteOrder;
  order: any;
  onEdit: (favorite: FavoriteOrder) => void;
  onShare: (favorite: FavoriteOrder) => void;
}

export function FavoriteCard({ favorite, order, onEdit, onShare }: FavoriteCardProps) {
  const { removeFavorite, isRemoving } = useFavoriteOrders();
  const { previewReorder } = useReorder();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this from favorites?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await removeFavorite(favorite.id);
      toast({
        title: 'Removed from favorites',
        description: `"${favorite.nickname}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to remove',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReorder = async () => {
    try {
      await previewReorder(order.id);
      toast({
        title: 'Reorder preview ready',
        description: 'Review and modify your order.',
      });
      // In production, navigate to reorder wizard
    } catch (error) {
      toast({
        title: 'Failed to preview reorder',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Optimized order image thumbnail */}
      {order.image_url && (
        <div className="relative h-48 w-full">
          <OptimizedImage
            src={order.image_url}
            alt={favorite.nickname}
            fill
            objectFit="cover"
            quality={75}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-1">{favorite.nickname}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Order #{order.order_number || 'N/A'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(favorite)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Nickname
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(favorite)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share with Family
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRemove}
                disabled={isDeleting || isRemoving}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Order details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Garment Type:</span>
            <span className="font-medium">{order.garment_type || 'N/A'}</span>
          </div>
          {order.fabric_details?.fabric && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fabric:</span>
              <span className="font-medium">{order.fabric_details.fabric}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">GHS {order.total_amount?.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        {/* Shared status */}
        {favorite.sharedWithProfiles.length > 0 && (
          <Badge variant="secondary" className="w-fit">
            Shared with {favorite.sharedWithProfiles.length} family member(s)
          </Badge>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <Button onClick={handleReorder} className="w-full">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Reorder
        </Button>
      </CardFooter>
    </Card>
  );
}
