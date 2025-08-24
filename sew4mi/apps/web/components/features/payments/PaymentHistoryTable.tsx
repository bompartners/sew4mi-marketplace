'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Package,
  DollarSign,
  Eye,
  X
} from 'lucide-react';
import type { PaymentHistoryItem, PaymentHistoryFilters } from '@sew4mi/shared';

interface PaymentHistoryTableProps {
  data: PaymentHistoryItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: PaymentHistoryFilters) => void;
  onExport?: () => void;
  loading?: boolean;
  filters?: PaymentHistoryFilters;
}

export function PaymentHistoryTable({
  data,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onFiltersChange,
  onExport,
  loading = false,
  filters = {}
}: PaymentHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState(filters.orderNumber || filters.customerName || '');
  const [statusFilter, setStatusFilter] = useState<string>(
    filters.status?.[0] || 'all'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<PaymentHistoryFilters>(filters);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const formatCurrency = (amount: number) => 
    `GHS ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const formatDate = (date: Date) => 
    date.toLocaleDateString('en-GB');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DISPUTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEscrowStageColor = (stage: string) => {
    switch (stage) {
      case 'DEPOSIT':
        return 'text-blue-600';
      case 'FITTING':
        return 'text-purple-600';
      case 'FINAL':
        return 'text-orange-600';
      case 'RELEASED':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleSearch = () => {
    const newFilters: PaymentHistoryFilters = { ...tempFilters };
    
    if (searchTerm.trim()) {
      // Determine if search term is order number or customer name
      if (searchTerm.toUpperCase().startsWith('ORD-')) {
        newFilters.orderNumber = searchTerm;
        delete newFilters.customerName;
      } else {
        newFilters.customerName = searchTerm;
        delete newFilters.orderNumber;
      }
    } else {
      delete newFilters.orderNumber;
      delete newFilters.customerName;
    }

    if (statusFilter && statusFilter !== 'all') {
      newFilters.status = [statusFilter as any];
    } else {
      delete newFilters.status;
    }

    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTempFilters({});
    onFiltersChange({});
    setShowFilters(false);
  };

  const applyDateFilters = () => {
    onFiltersChange(tempFilters);
    setShowFilters(false);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.orderNumber || filters.customerName) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.minAmount || filters.maxAmount) count++;
    return count;
  }, [filters]);

  return (
    <Card className="border-[#8B4513]/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2 text-[#8B4513]" />
              Payment History
            </CardTitle>
            <CardDescription>
              {totalCount > 0 
                ? `Showing ${startIndex}-${endIndex} of ${totalCount} payments`
                : 'No payments found'
              }
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {onExport && (
              <Button variant="outline" onClick={onExport} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Search and Quick Filters */}
        <div className="flex items-center space-x-4 pt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="DISPUTED">Disputed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
          
          {activeFiltersCount > 0 && (
            <Button variant="ghost" onClick={handleClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date From</label>
                <Input
                  type="date"
                  value={tempFilters.dateFrom?.toISOString().split('T')[0] || ''}
                  onChange={(e) => 
                    setTempFilters({
                      ...tempFilters,
                      dateFrom: e.target.value ? new Date(e.target.value) : undefined
                    })
                  }
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Date To</label>
                <Input
                  type="date"
                  value={tempFilters.dateTo?.toISOString().split('T')[0] || ''}
                  onChange={(e) => 
                    setTempFilters({
                      ...tempFilters,
                      dateTo: e.target.value ? new Date(e.target.value) : undefined
                    })
                  }
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Min Amount</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={tempFilters.minAmount || ''}
                  onChange={(e) => 
                    setTempFilters({
                      ...tempFilters,
                      minAmount: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Max Amount</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={tempFilters.maxAmount || ''}
                  onChange={(e) => 
                    setTempFilters({
                      ...tempFilters,
                      maxAmount: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowFilters(false)}>
                Cancel
              </Button>
              <Button onClick={applyDateFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(pageSize)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4 p-4 border rounded">
                <div className="rounded bg-gray-200 h-4 w-20"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : data.length > 0 ? (
          <>
            {/* Mobile-friendly card layout for small screens */}
            <div className="md:hidden space-y-4">
              {data.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{payment.orderNumber}</div>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {payment.customerName}
                    </div>
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-gray-400" />
                      {payment.garmentType}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(payment.paymentDate)}
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">
                        {formatCurrency(payment.netAmount)}
                      </span>
                      <span className="text-gray-500 ml-1">
                        (gross: {formatCurrency(payment.totalAmount)})
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-xs ${getEscrowStageColor(payment.escrowStage)}`}>
                      {payment.escrowStage}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Garment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {payment.orderNumber}
                      </TableCell>
                      <TableCell>{payment.customerName}</TableCell>
                      <TableCell>{payment.garmentType}</TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={getEscrowStageColor(payment.escrowStage)}>
                          {payment.escrowStage}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payment.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(payment.commissionAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.netAmount)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">
              {Object.keys(filters).length > 0 
                ? "Try adjusting your filters to see more results."
                : "Payments will appear here when customers pay for your services."
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      disabled={loading}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}