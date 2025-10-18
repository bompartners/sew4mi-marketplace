/**
 * ReviewsList Component (Story 4.5)
 * Displays paginated list of reviews with sorting and filtering
 */

'use client';

import React from 'react';
import { Review, ReviewsPage } from '@sew4mi/shared/types/review';
import { ReviewCard } from './ReviewCard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ReviewsListProps {
  reviews: Review[];
  total: number;
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
  onSortChange?: (sortBy: string) => void;
  onVote?: (reviewId: string, voteType: 'HELPFUL' | 'UNHELPFUL') => void;
  sortBy?: string;
}

/**
 * Reviews list with pagination and sorting
 */
export function ReviewsList({
  reviews,
  total,
  hasMore,
  isLoading,
  onLoadMore,
  onSortChange,
  onVote,
  sortBy = 'newest',
}: ReviewsListProps) {
  if (reviews.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No reviews yet</p>
        <p className="text-gray-400 text-sm mt-2">
          Be the first to share your experience!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with count and sorting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Reviews ({total})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Showing {reviews.length} of {total} reviews
          </p>
        </div>

        {onSortChange && (
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest_rated">Highest Rated</SelectItem>
              <SelectItem value="lowest_rated">Lowest Rated</SelectItem>
              <SelectItem value="most_helpful">Most Helpful</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Reviews list */}
      <div className="space-y-4" role="list" aria-label="Customer reviews">
        {reviews.map((review) => (
          <div key={review.id} role="listitem">
            <ReviewCard
              review={review}
              onVote={onVote}
              customerName="Customer" // TODO: Fetch from user profile
            />
          </div>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={onLoadMore} variant="outline" size="lg">
            Load More Reviews
          </Button>
        </div>
      )}

      {/* End of list */}
      {!hasMore && reviews.length > 0 && (
        <p className="text-center text-gray-500 text-sm py-4">
          You've reached the end of the reviews
        </p>
      )}
    </div>
  );
}

