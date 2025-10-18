/**
 * ReviewStats Component (Story 4.5)
 * Displays aggregate review statistics for a tailor
 */

'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { ReviewStats as ReviewStatsType } from '@sew4mi/shared/types/review';
import { Progress } from '@/components/ui/progress';

interface ReviewStatsProps {
  stats: ReviewStatsType;
}

/**
 * Rating distribution bar
 */
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 w-16">
        <span className="text-sm font-medium">{stars}</span>
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      </div>
      <Progress value={percentage} className="flex-1 h-2" />
      <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
    </div>
  );
}

/**
 * Category rating display
 */
function CategoryRating({ label, rating }: { label: string; rating?: number }) {
  if (!rating) return null;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold">{rating.toFixed(1)}</span>
      </div>
    </div>
  );
}

/**
 * Review statistics component
 */
export function ReviewStats({ stats }: ReviewStatsProps) {
  if (stats.totalReviews === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div className="text-center p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="w-10 h-10 fill-yellow-400 text-yellow-400" />
          <span className="text-5xl font-bold">{stats.averageRating.toFixed(1)}</span>
        </div>
        <p className="text-gray-600">
          Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Rating Distribution */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm mb-3">Rating Distribution</h3>
        <RatingBar stars={5} count={stats.ratingDistribution[5]} total={stats.totalReviews} />
        <RatingBar stars={4} count={stats.ratingDistribution[4]} total={stats.totalReviews} />
        <RatingBar stars={3} count={stats.ratingDistribution[3]} total={stats.totalReviews} />
        <RatingBar stars={2} count={stats.ratingDistribution[2]} total={stats.totalReviews} />
        <RatingBar stars={1} count={stats.ratingDistribution[1]} total={stats.totalReviews} />
      </div>

      {/* Category Ratings */}
      <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-sm mb-3">Category Ratings</h3>
        <CategoryRating label="Fit & Measurements" rating={stats.ratingFitAvg} />
        <CategoryRating label="Quality & Craftsmanship" rating={stats.ratingQualityAvg} />
        <CategoryRating label="Communication" rating={stats.ratingCommunicationAvg} />
        <CategoryRating label="Timeliness" rating={stats.ratingTimelinessAvg} />
      </div>
    </div>
  );
}

