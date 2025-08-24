'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FavoritesList } from './FavoritesList';
import { Grid3X3, List, Heart, ArrowLeft } from 'lucide-react';

interface FavoritesPageProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export function FavoritesPage({ showBackButton = true, onBack }: FavoritesPageProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full">
                  <Heart className="h-6 w-6 text-red-500 fill-current" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Favorite Tailors</h1>
                  <p className="text-gray-600">Your saved tailor profiles</p>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="grid" className="flex items-center gap-1 px-3">
                  <Grid3X3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Grid</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-1 px-3">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <FavoritesList 
          viewMode={viewMode}
          showEmpty={true}
          className="max-w-7xl mx-auto"
        />
      </div>
    </div>
  );
}