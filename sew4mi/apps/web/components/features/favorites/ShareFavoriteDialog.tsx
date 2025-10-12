'use client';

/**
 * Component for Story 4.3: Share Favorite Dialog
 */

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFavoriteOrders } from '@/hooks/useFavoriteOrders';
import { useToast } from '@/hooks/use-toast';
import type { FavoriteOrder } from '@sew4mi/shared/types';

interface ShareFavoriteDialogProps {
  favorite: FavoriteOrder | null;
  onClose: () => void;
}

export function ShareFavoriteDialog({ favorite, onClose }: ShareFavoriteDialogProps) {
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const { shareFavorite, isSharing } = useFavoriteOrders();
  const { toast } = useToast();

  // Load family profiles when dialog opens
  useEffect(() => {
    if (favorite) {
      loadFamilyProfiles();
      setSelectedProfiles(favorite.sharedWithProfiles);
    }
  }, [favorite]);

  const loadFamilyProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      // In production, fetch from /api/profiles/family
      const response = await fetch('/api/profiles/family');
      if (response.ok) {
        const data = await response.json();
        setFamilyProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Failed to load family profiles:', error);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleToggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleShare = async () => {
    if (!favorite) return;

    try {
      await shareFavorite(favorite.id, selectedProfiles);
      toast({
        title: 'Sharing updated',
        description: `"${favorite.nickname}" is now shared with ${selectedProfiles.length} family member(s).`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to update sharing',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={!!favorite} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share with Family</DialogTitle>
          <DialogDescription>
            Choose which family members can see and reorder this favorite.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoadingProfiles ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : familyProfiles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No family members found. Add family members in your profile to share favorites.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {familyProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`profile-${profile.id}`}
                    checked={selectedProfiles.includes(profile.id)}
                    onCheckedChange={() => handleToggleProfile(profile.id)}
                  />
                  <Label
                    htmlFor={`profile-${profile.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium">{profile.profile_name}</p>
                      {profile.relationship && (
                        <p className="text-sm text-muted-foreground">
                          {profile.relationship}
                        </p>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing || isLoadingProfiles}
          >
            {isSharing ? 'Updating...' : 'Update Sharing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
