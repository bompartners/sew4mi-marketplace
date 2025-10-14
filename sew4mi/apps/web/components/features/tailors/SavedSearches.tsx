'use client';

import React, { useState } from 'react';
import {
  Heart, Trash2, Edit, Bell, BellOff, Search,
  Calendar, Clock, MapPin, Star, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { SavedSearchAlert } from './SavedSearchAlert';
import { SavedSearch, TailorSearchFilters } from '@sew4mi/shared';
import { formatDistanceToNow } from 'date-fns';

interface SavedSearchesProps {
  onLoadSearch?: (filters: TailorSearchFilters) => void;
  className?: string;
}

export function SavedSearches({ onLoadSearch, className }: SavedSearchesProps) {
  const {
    savedSearches,
    isLoading,
    error,
    deleteSavedSearch,
    checkMatches,
    refetch,
  } = useSavedSearches();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [checkingMatches, setCheckingMatches] = useState<Set<string>>(new Set());
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});

  // Handle delete confirmation
  const handleDeleteClick = (searchId: string) => {
    setSearchToDelete(searchId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!searchToDelete) return;

    try {
      await deleteSavedSearch(searchToDelete);
      setDeleteDialogOpen(false);
      setSearchToDelete(null);
    } catch (err) {
      console.error('Failed to delete saved search:', err);
      alert('Failed to delete search. Please try again.');
    }
  };

  // Handle edit
  const handleEditClick = (search: SavedSearch) => {
    setEditingSearch(search);
  };

  // Handle check matches
  const handleCheckMatches = async (search: SavedSearch) => {
    setCheckingMatches(prev => new Set([...prev, search.id]));

    try {
      const since = search.lastNotifiedAt ? new Date(search.lastNotifiedAt) : undefined;
      const matches = await checkMatches(search.id, since);
      setMatchCounts(prev => ({ ...prev, [search.id]: matches.length }));

      if (matches.length > 0) {
        alert(`Found ${matches.length} new matching tailors!`);
      } else {
        alert('No new matches found.');
      }
    } catch (err) {
      console.error('Failed to check matches:', err);
      alert('Failed to check for new matches. Please try again.');
    } finally {
      setCheckingMatches(prev => {
        const newSet = new Set(prev);
        newSet.delete(search.id);
        return newSet;
      });
    }
  };

  // Handle load search
  const handleLoadSearch = (search: SavedSearch) => {
    if (onLoadSearch) {
      onLoadSearch(search.filters);
    }
  };

  // Format alert frequency
  const getAlertFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'instant':
        return 'Instant';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      default:
        return frequency;
    }
  };

  // Render filter summary
  const renderFilterSummary = (filters: TailorSearchFilters) => {
    const parts: string[] = [];

    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.city) parts.push(filters.city);
    if (filters.region) parts.push(filters.region);
    if (filters.minRating) parts.push(`★ ${filters.minRating}+`);
    if (filters.occasions?.length) parts.push(`${filters.occasions.length} occasions`);
    if (filters.styleCategories?.length) parts.push(`${filters.styleCategories.length} styles`);
    if (filters.fabricPreferences?.length) parts.push(`${filters.fabricPreferences.length} fabrics`);
    if (filters.sizeRanges?.length) parts.push(`${filters.sizeRanges.length} sizes`);
    if (filters.languages?.length) parts.push(`${filters.languages.length} languages`);
    if (filters.deliveryTimeframeMin || filters.deliveryTimeframeMax) {
      parts.push(`${filters.deliveryTimeframeMin || 0}-${filters.deliveryTimeframeMax || '∞'} days`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading saved searches...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Searches</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (savedSearches.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Searches</h3>
          <p className="text-gray-600 mb-4">
            Save your search criteria to get notified when new matching tailors join the platform.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {savedSearches.map(search => (
          <Card key={search.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              {/* Search Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {search.name}
                  </h3>

                  {/* Alert Status Badge */}
                  {search.alertEnabled ? (
                    <Badge variant="default" className="flex items-center gap-1 text-xs">
                      <Bell className="h-3 w-3" />
                      {getAlertFrequencyLabel(search.alertFrequency)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <BellOff className="h-3 w-3" />
                      Off
                    </Badge>
                  )}

                  {/* New matches badge */}
                  {matchCounts[search.id] !== undefined && matchCounts[search.id] > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {matchCounts[search.id]} new
                    </Badge>
                  )}
                </div>

                {/* Filter Summary */}
                <p className="text-sm text-gray-600 mb-3 truncate">
                  {renderFilterSummary(search.filters)}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {formatDistanceToNow(new Date(search.createdAt), { addSuffix: true })}
                  </span>
                  {search.lastNotifiedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Notified {formatDistanceToNow(new Date(search.lastNotifiedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoadSearch(search)}
                  title="Load search"
                >
                  <Search className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCheckMatches(search)}
                  disabled={checkingMatches.has(search.id)}
                  title="Check for new matches"
                >
                  {checkingMatches.has(search.id) ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClick(search)}
                  title="Edit alert settings"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(search.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Delete search"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Search?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this saved search and disable any alerts.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Alert Dialog */}
      {editingSearch && (
        <SavedSearchAlert
          search={editingSearch}
          onClose={() => {
            setEditingSearch(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
