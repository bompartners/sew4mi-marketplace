'use client';

/**
 * Component for Story 4.3: Edit Nickname Dialog
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFavoriteOrders } from '@/hooks/useFavoriteOrders';
import { useToast } from '@/hooks/use-toast';
import type { FavoriteOrder } from '@sew4mi/shared/types';

interface EditNicknameDialogProps {
  favorite: FavoriteOrder | null;
  onClose: () => void;
}

export function EditNicknameDialog({ favorite, onClose }: EditNicknameDialogProps) {
  const [nickname, setNickname] = useState('');
  const { updateNickname, isUpdating } = useFavoriteOrders();
  const { toast } = useToast();

  // Update nickname when favorite changes
  useEffect(() => {
    if (favorite) {
      setNickname(favorite.nickname);
    }
  }, [favorite]);

  const handleSave = async () => {
    if (!favorite || !nickname.trim()) {
      toast({
        title: 'Nickname required',
        description: 'Please enter a nickname for this favorite.',
        variant: 'destructive',
      });
      return;
    }

    if (nickname.trim() === favorite.nickname) {
      onClose();
      return;
    }

    try {
      await updateNickname(favorite.id, nickname.trim());
      toast({
        title: 'Nickname updated',
        description: `Favorite renamed to "${nickname.trim()}".`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to update nickname',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={!!favorite} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Nickname</DialogTitle>
          <DialogDescription>
            Update the nickname for this favorite order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-nickname">Nickname</Label>
            <Input
              id="edit-nickname"
              placeholder="e.g., My Wedding Suit, Sunday Dress"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nickname.trim()) {
                  handleSave();
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
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || !nickname.trim()}>
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
