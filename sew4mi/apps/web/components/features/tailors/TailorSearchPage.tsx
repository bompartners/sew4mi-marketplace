'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { FilterPanel } from './FilterPanel';
import { SortSelector } from './SortSelector';
import { TailorSearchResults } from './TailorSearchResults';
import { FeaturedTailors } from './FeaturedTailors';
import { SaveSearchDialog } from './SaveSearchDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Grid3X3, List, Map, Heart } from 'lucide-react';
import { useTailorSearch } from '@/hooks/useTailorSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  TailorSearchFilters,
  DISPLAY_MODES,
  SEARCH_CONFIG,
} from '@sew4mi/shared';

interface TailorSearchPageProps {
  initialQuery?: string;
  showFeatured?: boolean;
}

export function TailorSearchPage({ 
  initialQuery = '', 
  showFeatured = true 
}: TailorSearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Search state
  const [filters, setFilters] = useState<TailorSearchFilters>(() => ({
    query: initialQuery || searchParams.get('query') || '',
    city: searchParams.get('city') || undefined,
    minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
    specializations: searchParams.get('specializations')?.split(',').filter(Boolean) || [],
    sortBy: (searchParams.get('sortBy') as any) || 'rating',
    sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    limit: SEARCH_CONFIG.DEFAULT_LIMIT,
  }));

  const [displayMode, setDisplayMode] = useState<string>(DISPLAY_MODES.GRID);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);

  // Location hook for distance-based search
  const { location, requestLocation, locationError } = useGeolocation();

  // Search hook
  const {
    results,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useTailorSearch(filters);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: TailorSearchFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.query) params.set('query', newFilters.query);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.minRating) params.set('minRating', newFilters.minRating.toString());
    if (newFilters.specializations?.length) {
      params.set('specializations', newFilters.specializations.join(','));
    }
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder) params.set('sortOrder', newFilters.sortOrder);

    const queryString = params.toString();
    router.replace(`/tailors/search${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<TailorSearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, cursor: undefined };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
    
    if (!hasSearched && (newFilters.query || Object.keys(newFilters).length > 1)) {
      setHasSearched(true);
    }
  }, [filters, updateURL, hasSearched]);

  // Handle location-based search
  const handleLocationSearch = useCallback(async () => {
    if (!location) {
      await requestLocation();
      return;
    }

    const locationFilters = {
      ...filters,
      location: {
        lat: location.lat,
        lng: location.lng,
        radius: 25, // 25km default radius
      },
      sortBy: 'distance' as const,
      cursor: undefined,
    };

    setFilters(locationFilters);
    updateURL(locationFilters);
    setHasSearched(true);
  }, [location, requestLocation, filters, updateURL]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    handleFiltersChange({ query, cursor: undefined });
  }, [handleFiltersChange]);

  // Handle sort change
  const handleSortChange = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    handleFiltersChange({ sortBy: sortBy as any, sortOrder, cursor: undefined });
  }, [handleFiltersChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters: TailorSearchFilters = {
      sortBy: 'rating',
      sortOrder: 'desc',
      limit: SEARCH_CONFIG.DEFAULT_LIMIT,
    };
    setFilters(clearedFilters);
    updateURL(clearedFilters);
    setHasSearched(false);
  }, [updateURL]);

  // Apply location on mount if available
  useEffect(() => {
    if (location && filters.sortBy === 'distance' && !filters.location) {
      setFilters(prev => ({
        ...prev,
        location: {
          lat: location.lat,
          lng: location.lng,
          radius: 25,
        },
      }));
    }
  }, [location, filters.sortBy, filters.location]);

  const showResults = hasSearched || filters.query || filters.city || filters.specializations?.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Find Expert Tailors</h1>
            
            {/* Search Bar */}
            <SearchBar
              initialQuery={filters.query}
              onSearch={handleSearch}
              placeholder="Search by tailor name, specialization, or location..."
            />

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLocationSearch}
                disabled={!!locationError}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                {location ? 'Search Nearby' : 'Use My Location'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
                {(filters.city || filters.minRating || filters.specializations?.length) && (
                  <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {[filters.city, filters.minRating, ...(filters.specializations || [])].filter(Boolean).length}
                  </span>
                )}
              </Button>

              {/* Story 4.4: Save Search Button */}
              {hasSearched && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveSearchDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  Save Search
                </Button>
              )}

              {hasSearched && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Filters */}
          {(showFilters || !hasSearched) && (
            <div className="lg:w-64 flex-shrink-0">
              <Card className="p-4">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClear={clearFilters}
                />
              </Card>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {!showResults ? (
              /* Featured Tailors - Show when no search */
              showFeatured && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured Tailors</h2>
                    <FeaturedTailors />
                  </div>
                  
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Discover Expert Tailors in Ghana
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Search by location, specialization, or browse our featured tailors
                    </p>
                  </div>
                </div>
              )
            ) : (
              /* Search Results */
              <div className="space-y-4">
                {/* Results Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {results?.tailors.length || 0} Tailors Found
                      {filters.query && ` for "${filters.query}"`}
                    </h2>
                    
                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Searching...
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Sort Selector */}
                    <SortSelector
                      sortBy={filters.sortBy || 'rating'}
                      sortOrder={filters.sortOrder || 'desc'}
                      onSortChange={handleSortChange}
                    />

                    {/* View Mode Tabs */}
                    <Tabs value={displayMode} onValueChange={setDisplayMode} className="hidden sm:block">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value={DISPLAY_MODES.GRID} className="flex items-center gap-1">
                          <Grid3X3 className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value={DISPLAY_MODES.LIST} className="flex items-center gap-1">
                          <List className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value={DISPLAY_MODES.MAP} className="flex items-center gap-1">
                          <Map className="h-4 w-4" />
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Error State */}
                {error && (
                  <Card className="p-6 border-red-200 bg-red-50">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-red-900 mb-2">Search Error</h3>
                      <p className="text-red-700 mb-4">{error}</p>
                      <Button onClick={refetch} variant="outline">
                        Try Again
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Results */}
                {!error && (
                  <TailorSearchResults
                    results={results}
                    displayMode={displayMode}
                    isLoading={isLoading}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    userLocation={location}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Story 4.4: Save Search Dialog */}
      <SaveSearchDialog
        filters={filters}
        open={showSaveSearchDialog}
        onClose={() => setShowSaveSearchDialog(false)}
      />
    </div>
  );
}