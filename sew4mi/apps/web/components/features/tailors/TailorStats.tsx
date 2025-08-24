'use client';

import { TailorStatistics } from '@sew4mi/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, Clock, CheckCircle, TrendingUp } from 'lucide-react';

interface TailorStatsProps {
  statistics: TailorStatistics;
}

export function TailorStats({ statistics }: TailorStatsProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : i < rating
            ? 'text-yellow-400 fill-current opacity-50'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getResponseTimeColor = (average: number) => {
    if (average <= 2) return 'text-green-600';
    if (average <= 6) return 'text-blue-600';
    if (average <= 24) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeLabel = (average: number) => {
    if (average <= 2) return 'Excellent';
    if (average <= 6) return 'Good';
    if (average <= 24) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getResponseTimeColor(statistics.responseTime.average)}`}>
              {statistics.responseTime.average} {statistics.responseTime.unit}
            </div>
            <p className="text-xs text-muted-foreground">
              {getResponseTimeLabel(statistics.responseTime.average)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.deliveryRate.percentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics.deliveryRate.onTime} of {statistics.deliveryRate.total} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.orderCompletion.rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics.orderCompletion.completed} of {statistics.orderCompletion.total} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.customerSatisfaction.rating.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {statistics.customerSatisfaction.totalReviews} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Ratings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Satisfaction Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Quality of Work</span>
                  <div className="flex items-center space-x-1">
                    {renderStars(statistics.customerSatisfaction.breakdown.quality)}
                    <span className="text-sm text-gray-600 ml-2">
                      {statistics.customerSatisfaction.breakdown.quality.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={(statistics.customerSatisfaction.breakdown.quality / 5) * 100} 
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Communication</span>
                  <div className="flex items-center space-x-1">
                    {renderStars(statistics.customerSatisfaction.breakdown.communication)}
                    <span className="text-sm text-gray-600 ml-2">
                      {statistics.customerSatisfaction.breakdown.communication.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={(statistics.customerSatisfaction.breakdown.communication / 5) * 100} 
                  className="h-2"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Timeliness</span>
                  <div className="flex items-center space-x-1">
                    {renderStars(statistics.customerSatisfaction.breakdown.timeliness)}
                    <span className="text-sm text-gray-600 ml-2">
                      {statistics.customerSatisfaction.breakdown.timeliness.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={(statistics.customerSatisfaction.breakdown.timeliness / 5) * 100} 
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Value for Money</span>
                  <div className="flex items-center space-x-1">
                    {renderStars(statistics.customerSatisfaction.breakdown.value)}
                    <span className="text-sm text-gray-600 ml-2">
                      {statistics.customerSatisfaction.breakdown.value.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={(statistics.customerSatisfaction.breakdown.value / 5) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </div>

          {/* Overall Rating */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Overall Rating</span>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {renderStars(statistics.customerSatisfaction.rating)}
                </div>
                <span className="text-2xl font-bold">
                  {statistics.customerSatisfaction.rating.toFixed(1)}
                </span>
                <span className="text-gray-500">
                  ({statistics.customerSatisfaction.totalReviews})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {statistics.deliveryRate.percentage >= 90 ? '🌟' : statistics.deliveryRate.percentage >= 80 ? '👍' : '⚠️'}
              </div>
              <div className="text-sm font-medium">Delivery Performance</div>
              <div className="text-xs text-gray-600">
                {statistics.deliveryRate.percentage >= 90 
                  ? 'Excellent on-time delivery' 
                  : statistics.deliveryRate.percentage >= 80 
                    ? 'Good delivery record' 
                    : 'Room for improvement'
                }
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {statistics.responseTime.average <= 6 ? '⚡' : statistics.responseTime.average <= 24 ? '✅' : '⏰'}
              </div>
              <div className="text-sm font-medium">Response Speed</div>
              <div className="text-xs text-gray-600">
                {statistics.responseTime.average <= 6 
                  ? 'Very responsive' 
                  : statistics.responseTime.average <= 24 
                    ? 'Responds promptly' 
                    : 'May take time to respond'
                }
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {statistics.customerSatisfaction.rating >= 4.5 ? '⭐' : statistics.customerSatisfaction.rating >= 4 ? '👏' : '📈'}
              </div>
              <div className="text-sm font-medium">Customer Satisfaction</div>
              <div className="text-xs text-gray-600">
                {statistics.customerSatisfaction.rating >= 4.5 
                  ? 'Outstanding reviews' 
                  : statistics.customerSatisfaction.rating >= 4 
                    ? 'Great customer feedback' 
                    : 'Building reputation'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}