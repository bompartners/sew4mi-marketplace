'use client';

/**
 * TailorGroupOrderDashboard Component
 * Displays all assigned group orders with filtering, sorting, and priority indicators
 * Optimized for Ghana market with mobile-first design
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Users, 
  Package, 
  AlertTriangle, 
  ChevronRight,
  Search,
  Clock,
  DollarSign
} from 'lucide-react';
import { EnhancedGroupOrder, GroupOrderStatus, EventType } from '@sew4mi/shared/types/group-order';
import { formatCurrency } from '@/lib/utils/formatting';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';

export interface TailorGroupOrderDashboardProps {
  /** Group orders assigned to the tailor */
  groupOrders?: EnhancedGroupOrder[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when a group order is selected */
  onSelectGroupOrder?: (groupOrderId: string) => void;
  /** Custom className */
  className?: string;
}

type FilterStatus = 'all' | GroupOrderStatus;
type SortOption = 'event_date' | 'total_value' | 'priority' | 'created_date';

/**
 * Main dashboard component for tailors to manage group orders
 */
export function TailorGroupOrderDashboard({
  groupOrders = [],
  isLoading = false,
  error = null,
  onSelectGroupOrder,
  className = ''
}: TailorGroupOrderDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('event_date');

  /**
   * Filter and sort group orders based on current selections
   */
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...groupOrders];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.groupName.toLowerCase().includes(query) ||
        order.groupOrderNumber?.toLowerCase().includes(query) ||
        order.eventType?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'event_date':
          if (!a.eventDate) return 1;
          if (!b.eventDate) return -1;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        
        case 'total_value':
          return b.totalDiscountedAmount - a.totalDiscountedAmount;
        
        case 'priority':
          // Priority based on event date proximity
          if (!a.eventDate) return 1;
          if (!b.eventDate) return -1;
          const daysToA = differenceInDays(new Date(a.eventDate), new Date());
          const daysToB = differenceInDays(new Date(b.eventDate), new Date());
          return daysToA - daysToB;
        
        case 'created_date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [groupOrders, filterStatus, searchQuery, sortBy]);

  /**
   * Calculate urgency level based on event date
   */
  const calculateUrgency = (eventDate: Date | null): 'critical' | 'high' | 'medium' | 'low' => {
    if (!eventDate) return 'low';
    
    const days = differenceInDays(new Date(eventDate), new Date());
    
    if (days < 7) return 'critical';
    if (days < 14) return 'high';
    if (days < 30) return 'medium';
    return 'low';
  };

  /**
   * Get urgency badge styling
   */
  const getUrgencyBadge = (urgency: 'critical' | 'high' | 'medium' | 'low') => {
    const styles = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return styles[urgency];
  };

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status: GroupOrderStatus) => {
    const styles = {
      [GroupOrderStatus.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-200',
      [GroupOrderStatus.CONFIRMED]: 'bg-blue-100 text-blue-800 border-blue-200',
      [GroupOrderStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      [GroupOrderStatus.PARTIALLY_COMPLETED]: 'bg-purple-100 text-purple-800 border-purple-200',
      [GroupOrderStatus.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
      [GroupOrderStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-200'
    };
    return styles[status];
  };

  /**
   * Get event type display name
   */
  const getEventTypeLabel = (eventType: EventType | null): string => {
    if (!eventType) return 'General Event';
    
    const labels: Record<EventType, string> = {
      [EventType.WEDDING]: 'Wedding',
      [EventType.FUNERAL]: 'Funeral',
      [EventType.NAMING_CEREMONY]: 'Naming Ceremony',
      [EventType.FESTIVAL]: 'Festival',
      [EventType.CHURCH_EVENT]: 'Church Event',
      [EventType.FAMILY_REUNION]: 'Family Reunion',
      [EventType.BIRTHDAY]: 'Birthday',
      [EventType.OTHER]: 'Other Event'
    };
    return labels[eventType];
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load group orders: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Group Orders</h2>
        <p className="text-muted-foreground">
          Manage and coordinate group orders for family events
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value={GroupOrderStatus.CONFIRMED}>Confirmed</option>
                <option value={GroupOrderStatus.IN_PROGRESS}>In Progress</option>
                <option value={GroupOrderStatus.PARTIALLY_COMPLETED}>Partially Completed</option>
                <option value={GroupOrderStatus.COMPLETED}>Completed</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="event_date">Sort by Event Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="total_value">Sort by Total Value</option>
                <option value="created_date">Sort by Created Date</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupOrders.filter(o => o.status === GroupOrderStatus.IN_PROGRESS).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groupOrders.reduce((sum, order) => sum + order.totalOrders, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                groupOrders.reduce((sum, order) => sum + order.totalDiscountedAmount, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group Orders List */}
      <div className="space-y-4">
        {filteredAndSortedOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No group orders found
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Group orders will appear here once assigned to you'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedOrders.map(order => {
            const urgency = calculateUrgency(order.eventDate);
            const progress = order.progressSummary.overallProgressPercentage;

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left Section: Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">{order.groupName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.groupOrderNumber || `Group #${order.id.slice(0, 8)}`}
                          </p>
                        </div>
                        
                        {/* Urgency Badge */}
                        {order.eventDate && (
                          <Badge className={getUrgencyBadge(urgency)} variant="outline">
                            {urgency === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {urgency.toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {order.eventDate 
                              ? format(new Date(order.eventDate), 'MMM dd, yyyy')
                              : 'No date set'}
                          </span>
                          {order.eventDate && (
                            <span className="text-muted-foreground">
                              ({formatDistanceToNow(new Date(order.eventDate), { addSuffix: true })})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{order.totalOrders} items</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{order.totalParticipants} participants</span>
                        </div>
                      </div>

                      {/* Event Type & Status */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {getEventTypeLabel(order.eventType)}
                        </Badge>
                        <Badge className={getStatusBadge(order.status)} variant="outline">
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Overall Progress</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{order.progressSummary.completedItems} completed</span>
                          <span>{order.progressSummary.inProgressItems} in progress</span>
                          <span>{order.progressSummary.pendingItems} pending</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Amount & Action */}
                    <div className="flex flex-col items-end gap-4 md:min-w-[200px]">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(order.totalDiscountedAmount)}
                        </p>
                        {order.bulkDiscountPercentage > 0 && (
                          <p className="text-xs text-green-600">
                            {order.bulkDiscountPercentage}% bulk discount applied
                          </p>
                        )}
                      </div>

                      <Button 
                        onClick={() => onSelectGroupOrder?.(order.id)}
                        className="w-full md:w-auto"
                      >
                        Manage Order
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

