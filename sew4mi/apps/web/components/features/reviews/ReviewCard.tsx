/**
 * ReviewCard Component (Story 4.5)
 * Displays individual review with ratings, text, photos, and response
 */

'use client';

import React from 'react';
import { Star, ThumbsUp, ThumbsDown, CheckCircle, MessageCircle } from 'lucide-react';
import { Review } from '@sew4mi/shared/types/review';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: Review;
  onVote?: (reviewId: string, voteType: 'HELPFUL' | 'UNHELPFUL') => void;
  showVoting?: boolean;
  customerName?: string;
  customerAvatar?: string;
}

/**
 * Display star rating
 */
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Rating category row
 */
function RatingRow({ label, rating }: { label: string; rating?: number }) {
  if (!rating) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <StarDisplay rating={rating} />
    </div>
  );
}

/**
 * Review card component
 */
export function ReviewCard({
  review,
  onVote,
  showVoting = true,
  customerName,
  customerAvatar,
}: ReviewCardProps) {
  const [userVote, setUserVote] = React.useState<'HELPFUL' | 'UNHELPFUL' | null>(null);

  const handleVote = (voteType: 'HELPFUL' | 'UNHELPFUL') => {
    if (onVote) {
      setUserVote(voteType);
      onVote(review.id, voteType);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={customerAvatar} alt={customerName} />
              <AvatarFallback>
                {customerName?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{customerName || 'Anonymous'}</h4>
                {review.isVerifiedPurchase && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified Purchase
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg">
                {review.overallRating?.toFixed(1) || review.rating}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rating Categories */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
          <RatingRow label="Fit" rating={review.ratingFit} />
          <RatingRow label="Quality" rating={review.qualityRating} />
          <RatingRow label="Communication" rating={review.communicationRating} />
          <RatingRow label="Timeliness" rating={review.timelinessRating} />
        </div>

        {/* Review Text */}
        {review.reviewText && (
          <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>
        )}

        {/* Review Photos */}
        {review.photos && review.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {review.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.thumbnailUrl || photo.photoUrl}
                alt={photo.caption || 'Review photo'}
                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
              />
            ))}
          </div>
        )}

        {/* Tailor Response */}
        {review.response && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Tailor Response</span>
            </div>
            <p className="text-gray-700">{review.response.responseText}</p>
            <p className="text-xs text-gray-500 mt-2">
              {formatDistanceToNow(new Date(review.response.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        )}

        {/* Voting */}
        {showVoting && (
          <div className="flex items-center gap-4 pt-3 border-t">
            <span className="text-sm text-gray-600">Was this review helpful?</span>
            <button
              onClick={() => handleVote('HELPFUL')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition ${
                userVote === 'HELPFUL'
                  ? 'bg-green-100 text-green-700'
                  : 'hover:bg-gray-100'
              }`}
              aria-pressed={userVote === 'HELPFUL'}
              aria-label={`Mark as helpful, currently ${review.helpfulCount} people found this helpful`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Helpful ({review.helpfulCount})</span>
            </button>
            <button
              onClick={() => handleVote('UNHELPFUL')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition ${
                userVote === 'UNHELPFUL'
                  ? 'bg-red-100 text-red-700'
                  : 'hover:bg-gray-100'
              }`}
              aria-pressed={userVote === 'UNHELPFUL'}
              aria-label={`Mark as unhelpful, currently ${review.unhelpfulCount} people found this unhelpful`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>Not Helpful ({review.unhelpfulCount})</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

