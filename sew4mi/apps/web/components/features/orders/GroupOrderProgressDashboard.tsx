'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Package, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { IndividualProgressCard } from './IndividualProgressCard';
import type { GroupOrderSummary } from '@sew4mi/shared/types/group-order';

interface GroupOrderProgressDashboardProps {
  groupOrderId: string;
  onRefresh?: () => void;
}

export function GroupOrderProgressDashboard({
  groupOrderId,
  onRefresh,
}: GroupOrderProgressDashboardProps) {
  const [groupOrder, setGroupOrder] = useState<GroupOrderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchGroupOrderProgress();
  }, [groupOrderId]);

  const fetchGroupOrderProgress = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/group/${groupOrderId}?includeItems=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch group order progress');
      }

      const data = await response.json();
      setGroupOrder(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching group order progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchGroupOrderProgress();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (isLoading && !groupOrder) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <div className="text-gray-600">Loading group order progress...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <div>
            <div className="font-semibold">Error Loading Progress</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="mt-4">
          Try Again
        </Button>
      </Card>
    );
  }

  if (!groupOrder) {
    return null;
  }

  const { groupOrder: order, items, progressSummary } = groupOrder;
  const progressPercentage = progressSummary?.overallProgressPercentage || 0;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>{order.groupName}</CardTitle>
                <div className="text-sm text-gray-500 mt-1">
                  Group Order #{order.groupOrderNumber}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-semibold text-blue-600">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                <Package className="w-4 h-4" />
                Total Items
              </div>
              <div className="text-2xl font-bold">{progressSummary.totalItems}</div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
              <div className="text-2xl font-bold text-green-700">
                {progressSummary.completedItems}
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <Clock className="w-4 h-4" />
                In Progress
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {progressSummary.inProgressItems}
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Ready
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {progressSummary.readyForDelivery}
              </div>
            </div>
          </div>

          {/* Event Details */}
          {order.eventDate && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
              <div>
                <div className="text-sm font-medium text-amber-900">
                  Event Date: {new Date(order.eventDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                {progressSummary.estimatedDaysRemaining !== undefined && (
                  <div className="text-xs text-amber-600 mt-1">
                    {progressSummary.estimatedDaysRemaining} days remaining
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-gray-500 text-right">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>

      {/* Individual Items Progress */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Individual Order Progress</h3>
        <div className="space-y-3">
          {items && items.length > 0 ? (
            items
              .sort((a, b) => a.deliveryPriority - b.deliveryPriority)
              .map((item) => (
                <IndividualProgressCard
                  key={item.id}
                  item={item}
                  groupOrderId={groupOrderId}
                  onUpdate={fetchGroupOrderProgress}
                />
              ))
          ) : (
            <Card className="p-6 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <div className="font-medium">No items found</div>
              <div className="text-sm">Group order items will appear here</div>
            </Card>
          )}
        </div>
      </div>

      {/* Next Actions */}
      {groupOrder.nextMilestone && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-blue-900 mb-1">Next Milestone</div>
              <div className="text-sm text-blue-700">{groupOrder.nextMilestone}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

