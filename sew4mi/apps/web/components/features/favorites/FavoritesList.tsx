'use client';

/**
 * Component for Story 4.3: Favorites List
 */

import { useState } from 'react';
import { Heart, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFavoriteOrders } from '@/hooks/useFavoriteOrders';
import { FavoriteCard } from './FavoriteCard';
import { EditNicknameDialog } from './EditNicknameDialog';
import { ShareFavoriteDialog } from './ShareFavoriteDialog';
import type { FavoriteOrder } from '@sew4mi/shared/types';

export function FavoritesList() {
  const { favorites, orders, isLoading, error } = useFavoriteOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFavorite, setEditingFavorite] = useState<FavoriteOrder | null>(null);
  const [sharingFavorite, setSharingFavorite] = useState<FavoriteOrder | null>(null);

  // Filter favorites based on search query
  const filteredFavorites = favorites.filter((favorite) => {
    const order = orders[favorite.orderId];
    const searchLower = searchQuery.toLowerCase();

    return (
      favorite.nickname.toLowerCase().includes(searchLower) ||
      order?.garment_type?.toLowerCase().includes(searchLower) ||
      order?.order_number?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load favorites</h3>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Please try again later.'}
          </p>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground mb-6">
            Save your favorite completed orders to easily reorder them later. Look for the heart
            icon on your order history!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search favorites by name, garment type, or order number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredFavorites.length === favorites.length
            ? `${favorites.length} favorite${favorites.length === 1 ? '' : 's'}`
            : `${filteredFavorites.length} of ${favorites.length} favorites`}
        </p>
      </div>

      {/* Favorites grid */}
      {filteredFavorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No favorites match your search.</p>
        </div>
      ) : filteredFavorites.length > 50 ? (
        /* Use virtual scrolling for large lists (> 50 items) */
        <div className="h-[600px] overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFavorites.map((favorite) => (
              <FavoriteCard
                key={favorite.id}
                favorite={favorite}
                order={orders[favorite.orderId]}
                onEdit={setEditingFavorite}
                onShare={setSharingFavorite}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Regular rendering for small lists */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFavorites.map((favorite) => (
            <FavoriteCard
              key={favorite.id}
              favorite={favorite}
              order={orders[favorite.orderId]}
              onEdit={setEditingFavorite}
              onShare={setSharingFavorite}
            />
          ))}
        </div>
      )}

      {/* Edit nickname dialog */}
      <EditNicknameDialog
        favorite={editingFavorite}
        onClose={() => setEditingFavorite(null)}
      />

      {/* Share dialog */}
      <ShareFavoriteDialog
        favorite={sharingFavorite}
        onClose={() => setSharingFavorite(null)}
      />
    </div>
  );
}
