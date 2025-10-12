'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FavoritesList } from '@/components/features/favorites/FavoritesList';
import { ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to view your favorites.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-[#CE1126]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
              <p className="mt-2 text-gray-600">
                Save and manage your favorite orders for quick reordering
              </p>
            </div>
          </div>
        </div>

        {/* Favorites List */}
        <FavoritesList />
      </div>
    </div>
  );
}
