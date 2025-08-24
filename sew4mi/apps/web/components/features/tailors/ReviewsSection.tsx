'use client';

import { useState, useEffect } from 'react';
import { TailorReview } from '@sew4mi/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, ThumbsUp, Clock, CheckCircle, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsSectionProps {
  tailorId: string;
  initialReviews: TailorReview[];
  totalReviews: number;
  averageRating: number;
}

export function ReviewsSection({ tailorId, initialReviews, totalReviews, averageRating }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<TailorReview[]>(initialReviews);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialReviews.length === 10);

  const loadMoreReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tailors/${tailorId}/reviews?page=${page + 1}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setReviews(prev => [...prev, ...data.data]);
        setPage(prev => prev + 1);
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className="flex space-x-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`${starSize} ${
              i < Math.floor(rating)
                ? 'text-yellow-400 fill-current'
                : i < rating
                ? 'text-yellow-400 fill-current opacity-50'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const ratingDistribution = getRatingDistribution();
  const reviewsShown = Math.min(reviews.length, totalReviews);

  return (
    <div className="space-y-6">
      {/* Reviews Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Customer Reviews</span>
            <Badge variant="secondary">{totalReviews} reviews</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderStars(averageRating, 'md')}
              </div>
              <p className="text-gray-600">Based on {totalReviews} reviews</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center space-x-2 text-sm">
                    <span className="w-8 text-right">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <div className="flex-1">
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <span className="w-8 text-gray-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Recent Reviews ({reviewsShown} of {totalReviews})
          </h3>
          
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Customer Avatar */}
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage 
                        src={review.customer?.avatarUrl || undefined} 
                        alt={review.customer?.fullName || 'Customer'} 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                        {review.customer?.fullName 
                          ? getInitials(review.customer.fullName)
                          : <User className="w-6 h-6" />
                        }
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      {/* Review Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {review.customer?.fullName || 'Anonymous Customer'}
                          </h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>
                              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                            </span>
                            {review.isVerified && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified Purchase
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Order Info */}
                        {review.order && (
                          <Badge variant="outline" className="text-xs">
                            {review.order.garmentType}
                          </Badge>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-1">
                          {renderStars(review.rating)}
                          <span className="text-sm font-medium ml-1">{review.rating}/5</span>
                        </div>
                        
                        {/* Additional Ratings */}
                        {(review.qualityRating || review.communicationRating) && (
                          <div className="flex items-center space-x-3 text-xs text-gray-600">
                            {review.qualityRating && (
                              <span>Quality: {review.qualityRating}/5</span>
                            )}
                            {review.communicationRating && (
                              <span>Communication: {review.communicationRating}/5</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Review Text */}
                      {review.reviewText && (
                        <div className="mb-3">
                          <p className="text-gray-700 leading-relaxed">
                            {review.reviewText}
                          </p>
                        </div>
                      )}

                      {/* Performance Indicators */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {review.deliveryOnTime && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            <Clock className="w-3 h-3 mr-1" />
                            On-time delivery
                          </Badge>
                        )}
                        {review.responseTime && review.responseTime <= 6 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            ⚡ Quick response
                          </Badge>
                        )}
                      </div>

                      {/* Review Photos */}
                      {review.reviewPhotos && review.reviewPhotos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                          {review.reviewPhotos.slice(0, 4).map((photo, index) => (
                            <div key={index} className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                              <img
                                src={photo}
                                alt={`Review photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {index === 3 && review.reviewPhotos!.length > 4 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-sm font-medium">
                                  +{review.reviewPhotos!.length - 3} more
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Helpful Action */}
                      <div className="flex items-center justify-between">
                        <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Helpful</span>
                        </button>
                        
                        {review.responseTime && (
                          <span className="text-xs text-gray-500">
                            Tailor responded in {review.responseTime}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <Button
                onClick={loadMoreReviews}
                disabled={loading}
                variant="outline"
                className="px-8"
              >
                {loading ? 'Loading...' : 'Load More Reviews'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
            <p className="text-gray-600">
              Be the first to review this tailor's work!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}