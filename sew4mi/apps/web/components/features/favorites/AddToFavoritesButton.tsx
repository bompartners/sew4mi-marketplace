'use client';

/**
 * Component for Story 4.3: Add to Favorites Button
 */

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFavoriteOrders } from '@/hooks/useFavoriteOrders';
import { useToast } from '@/hooks/use-toast';

interface AddToFavoritesButtonProps {
  orderId: string;
  orderName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export function AddToFavoritesButton({
  orderId,
  orderName = 'this order',
  variant = 'outline',
  size = 'default',
  showText = true,
}: AddToFavoritesButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const { addToFavorites, isAdding } = useFavoriteOrders();
  const { toast } = useToast();

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setNickname(''); // Reset nickname
  };

  const handleAddToFavorites = async () => {
    if (!nickname.trim()) {
      toast({
        title: 'Nickname required',
        description: 'Please enter a nickname for this favorite.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addToFavorites(orderId, nickname.trim());
      toast({
        title: 'Added to favorites!',
        description: `"${nickname}" has been saved to your favorites.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Failed to add favorite',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenDialog}
        disabled={isAdding}
      >
        <Heart className="h-4 w-4" />
        {showText && <span className="ml-2">Add to Favorites</span>}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add to Favorites</DialogTitle>
            <DialogDescription>
              Give {orderName} a memorable name so you can easily find it later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                placeholder="e.g., My Wedding Suit, Sunday Dress"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nickname.trim()) {
                    handleAddToFavorites();
                  }
                }}
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                {nickname.length}/100 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToFavorites}
              disabled={isAdding || !nickname.trim()}
            >
              {isAdding ? 'Adding...' : 'Add to Favorites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
