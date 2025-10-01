/**
 * OrderHistory component for displaying past orders with filtering
 * Features search, filtering, pagination, and order status tracking
 * @file OrderHistory.tsx
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Filter, Calendar, Package, Eye, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OrderStatus, GarmentType, OrderWithProgress } from '@sew4mi/shared/types/order-creation';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

/**
 * Props for OrderHistory component
 */
interface OrderHistoryProps {
  /** User ID for filtering orders */
  userId: string;
  /** User role (customer or tailor) */
  userRole: 'customer' | 'tailor';
  /** Initial page size */
  pageSize?: number;
  /** Show advanced filtering options */
  showAdvancedFilters?: boolean;
  /** Callback when order is selected */
  onOrderSelect?: (orderId: string) => void;
  /** Callback to open order chat */
  onOpenChat?: (orderId: string, tailorId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Filter options for order history
 */
interface OrderFilters {
  status?: OrderStatus[];
  garmentType?: GarmentType[];
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Order card component for displaying individual orders
 */
interface OrderCardProps {
  order: OrderWithProgress;
  userRole: 'customer' | 'tailor';
  onSelect: (orderId: string) => void;
  onOpenChat?: (orderId: string, tailorId: string) => void;
}

function OrderCard({ order, userRole, onSelect, onOpenChat }: OrderCardProps) {
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <Clock className="h-4 w-4" />;
      case OrderStatus.IN_PROGRESS:
        return <Package className="h-4 w-4" />;
      case OrderStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4" />;
      case OrderStatus.CANCELLED:
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case OrderStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case OrderStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const participantInfo = userRole === 'customer' 
    ? { id: order.tailorId, name: order.tailorName, avatar: order.tailorAvatar }
    : { id: order.customerId, name: order.customerName, avatar: order.customerAvatar };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
              <Badge className={cn('flex items-center gap-1', getStatusColor(order.status))}>
                {getStatusIcon(order.status)}
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {order.garmentType.replace('_', ' ')} - {order.garmentCategory}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(order.createdAt), 'MMM d, yyyy')}
              </span>
              {order.estimatedCompletionDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {format(parseISO(order.estimatedCompletionDate), 'MMM d')}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="font-bold text-lg mb-2">
              {formatCurrency(order.totalPrice)}
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={participantInfo.avatar} />
                <AvatarFallback className="text-xs">
                  {participantInfo.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 truncate max-w-20">
                {participantInfo.name}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {order.progressPercentage !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(order.progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${order.progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(order.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
          
          {onOpenChat && order.status === OrderStatus.IN_PROGRESS && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChat(order.id, participantInfo.id)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Filter panel component
 */
interface FilterPanelProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onClearFilters: () => void;
  showAdvanced?: boolean;
}

function FilterPanel({ filters, onFiltersChange, onClearFilters, showAdvanced }: FilterPanelProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleStatusChange = (status: OrderStatus, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleDateRangeChange = (date: Date | undefined, type: 'start' | 'end') => {
    const newDateRange = { ...filters.dateRange };
    newDateRange[type] = date || null;
    onFiltersChange({ ...filters, dateRange: newDateRange });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
        >
          Clear All
        </Button>
      </div>

      {/* Status Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Order Status</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(OrderStatus).map(status => (
            <label key={status} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={filters.status?.includes(status) || false}
                onChange={(e) => handleStatusChange(status, e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>{status.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Garment Type Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Garment Type</label>
        <Select
          value={filters.garmentType?.[0] || ''}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              garmentType: value ? [value as GarmentType] : undefined 
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All garment types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All garment types</SelectItem>
            {Object.values(GarmentType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter */}
      {showAdvanced && (
        <div>
          <label className="text-sm font-medium mb-2 block">Date Range</label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <Calendar className="h-4 w-4 mr-2" />
                {filters.dateRange?.start && filters.dateRange?.end ? (
                  `${format(filters.dateRange.start, 'MMM d')} - ${format(filters.dateRange.end, 'MMM d')}`
                ) : (
                  'Select date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{
                  from: filters.dateRange?.start || undefined,
                  to: filters.dateRange?.end || undefined
                }}
                onSelect={(range) => {
                  onFiltersChange({
                    ...filters,
                    dateRange: {
                      start: range?.from || null,
                      end: range?.to || null
                    }
                  });
                  if (range?.from && range?.to) {
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Price Range Filter */}
      {showAdvanced && (
        <div>
          <label className="text-sm font-medium mb-2 block">Price Range (GH₵)</label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minAmount || ''}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                minAmount: e.target.value ? Number(e.target.value) : undefined 
              })}
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxAmount || ''}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                maxAmount: e.target.value ? Number(e.target.value) : undefined 
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * OrderHistory Component
 * Displays filterable and searchable list of past orders
 */
export function OrderHistory({
  userId,
  userRole,
  pageSize = 10,
  showAdvancedFilters = true,
  onOrderSelect,
  onOpenChat,
  className
}: OrderHistoryProps) {
  const [orders, setOrders] = useState<OrderWithProgress[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithProgress[]>([]);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Load orders from API
   */
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userId,
        userRole,
        limit: '100' // Load more for client-side filtering
      });

      const response = await fetch(`/api/orders/history?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load order history');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [userId, userRole]);

  /**
   * Apply filters to orders
   */
  const applyFilters = useCallback(() => {
    let filtered = [...orders];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.garmentType.toLowerCase().includes(query) ||
        order.garmentCategory?.toLowerCase().includes(query) ||
        order.tailorName?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(order => filters.status!.includes(order.status));
    }

    // Garment type filter
    if (filters.garmentType && filters.garmentType.length > 0) {
      filtered = filtered.filter(order => filters.garmentType!.includes(order.garmentType));
    }

    // Date range filter
    if (filters.dateRange?.start && filters.dateRange?.end) {
      const startDate = startOfDay(filters.dateRange.start);
      const endDate = endOfDay(filters.dateRange.end);
      
      filtered = filtered.filter(order => {
        const orderDate = parseISO(order.createdAt);
        return isAfter(orderDate, startDate) && isBefore(orderDate, endDate);
      });
    }

    // Price range filter
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(order => order.totalPrice >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(order => order.totalPrice <= filters.maxAmount!);
    }

    setFilteredOrders(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [orders, filters]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Apply filters when orders or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadOrders} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order History</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders, garments, or participants..."
                value={filters.searchQuery || ''}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full"
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
                showAdvanced={showAdvancedFilters}
              />
            </div>
          )}

          {/* Results Summary */}
          <div className="text-sm text-gray-600 mb-4">
            Showing {paginatedOrders.length} of {filteredOrders.length} orders
            {filters.searchQuery && ` for "${filters.searchQuery}"`}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {filters.searchQuery || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filters'
                : 'You haven\'t placed any orders yet'
              }
            </p>
            {Object.keys(filters).length > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Order Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                userRole={userRole}
                onSelect={onOrderSelect || (() => {})}
                onOpenChat={onOpenChat}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNumber);
                          }}
                          isActive={currentPage === pageNumber}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default OrderHistory;