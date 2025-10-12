'use client';

// Admin Dispute Management Dashboard
// Story 2.4: Comprehensive admin interface for dispute management

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DisputeStatus, 
  DisputePriority, 
  DisputeCategory,
  AdminDisputeDashboardItem,
  getDisputePriorityConfig,
  getDisputeStatusConfig,
  getDisputeCategoryConfig
} from '@sew4mi/shared';
import { 
  Search, 
  Clock, 
  AlertTriangle, 
  User, 
  MessageSquare, 
  FileText,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  UserCheck
} from 'lucide-react';

interface AdminDisputeDashboardProps {
  onDisputeSelect: (disputeId: string) => void;
  onAssignDispute: (disputeId: string, adminId: string) => void;
  className?: string;
}

interface DashboardFilters {
  status: DisputeStatus[];
  priority: DisputePriority[];
  category: DisputeCategory[];
  assignedAdmin?: string;
  isOverdue?: boolean;
  search?: string;
}

interface DashboardStats {
  totalDisputes: number;
  openDisputes: number;
  overdueDisputes: number;
  criticalPriority: number;
  averageResolutionTime: number;
  slaPerformance: number;
}

export function AdminDisputeDashboard({
  onDisputeSelect,
  onAssignDispute,
  className = ''
}: AdminDisputeDashboardProps) {
  // State management
  const [disputes, setDisputes] = useState<AdminDisputeDashboardItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDisputes: 0,
    openDisputes: 0,
    overdueDisputes: 0,
    criticalPriority: 0,
    averageResolutionTime: 0,
    slaPerformance: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<DashboardFilters>({
    status: [],
    priority: [],
    category: [],
    search: ''
  });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 25;

  // Active tab
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'overdue' | 'critical'>('all');

  // Load disputes data
  const loadDisputes = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }
      setError(null);

      // Build query parameters based on active tab and filters
      const params = new URLSearchParams();
      
      // Tab-specific filters
      switch (activeTab) {
        case 'assigned':
          params.append('assignedAdmin', 'current-user'); // Will be replaced with actual admin ID
          break;
        case 'overdue':
          params.append('overdue', 'true');
          break;
        case 'critical':
          params.append('priority', DisputePriority.CRITICAL);
          break;
      }

      // Apply additional filters
      if (filters.status.length > 0) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters.priority.length > 0) {
        filters.priority.forEach(priority => params.append('priority', priority));
      }
      if (filters.category.length > 0) {
        filters.category.forEach(category => params.append('category', category));
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.assignedAdmin) {
        params.append('assignedAdmin', filters.assignedAdmin);
      }

      // Pagination
      params.append('page', page.toString());
      params.append('limit', itemsPerPage.toString());

      const response = await fetch(`/api/admin/disputes/dashboard?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load disputes');
      }

      const data = await response.json();
      
      if (refresh || page === 1) {
        setDisputes(data.disputes);
      } else {
        setDisputes(prev => [...prev, ...data.disputes]);
      }
      
      setStats(data.stats);
      setHasMore(data.disputes.length === itemsPerPage);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disputes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, filters, page]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof DashboardFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    handleFilterChange('search', searchTerm);
  }, [handleFilterChange]);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as typeof activeTab);
    setPage(1);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadDisputes(true);
  }, [loadDisputes]);

  // Handle assign dispute
  const handleAssignDispute = useCallback(async (disputeId: string) => {
    try {
      // For now, assign to current admin (this would normally use admin selection)
      await onAssignDispute(disputeId, 'current-admin-id');
      handleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign dispute');
    }
  }, [onAssignDispute, handleRefresh]);

  // Load more items
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  // Export disputes data
  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      // Add current filters to export
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else if (value) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/disputes/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disputes-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }, [filters]);

  // Format time remaining
  const formatTimeRemaining = (hours: number): string => {
    if (hours < 0) return 'Overdue';
    if (hours < 1) return `${Math.round(hours * 60)}m remaining`;
    if (hours < 24) return `${Math.round(hours)}h remaining`;
    return `${Math.round(hours / 24)}d remaining`;
  };

  // Get dispute row styling based on priority and status
  const getDisputeRowStyling = (dispute: AdminDisputeDashboardItem): string => {
    const priorityConfig = getDisputePriorityConfig(dispute.priority);
    let classes = 'border-l-4 ';
    
    if (dispute.isOverdue) {
      classes += 'border-l-red-500 bg-red-50 ';
    } else {
      classes += `border-l-[${priorityConfig.color}] `;
    }
    
    return classes;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Management</h1>
          <p className="text-sm text-gray-600">
            Manage and resolve customer disputes efficiently
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Disputes</p>
              <p className="text-2xl font-bold">{stats.totalDisputes}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Open</p>
              <p className="text-2xl font-bold">{stats.openDisputes}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold">{stats.overdueDisputes}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold">{stats.criticalPriority}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold">{stats.averageResolutionTime}h</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">SLA Performance</p>
              <p className="text-2xl font-bold">{stats.slaPerformance}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search disputes by title, customer, or tailor..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="w-48">
            <Select onValueChange={(value) => handleFilterChange('status', value === 'ALL' ? [] : [value])}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.values(DisputeStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {getDisputeStatusConfig(status).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="w-48">
            <Select onValueChange={(value) => handleFilterChange('priority', value === 'ALL' ? [] : [value])}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                {Object.values(DisputePriority).map(priority => (
                  <SelectItem key={priority} value={priority}>
                    {getDisputePriorityConfig(priority).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Dispute Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Disputes</TabsTrigger>
          <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="critical">Critical Priority</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && disputes.length === 0 && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading disputes...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && disputes.length === 0 && (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes found</h3>
              <p className="text-gray-600">
                {filters.search || filters.status.length > 0 || filters.priority.length > 0
                  ? 'Try adjusting your filters to see more results.'
                  : 'There are no disputes to display at this time.'
                }
              </p>
            </Card>
          )}

          {/* Disputes List */}
          {disputes.length > 0 && (
            <div className="space-y-3">
              {disputes.map((dispute) => (
                <Card 
                  key={dispute.id} 
                  className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${getDisputeRowStyling(dispute)}`}
                  onClick={() => onDisputeSelect(dispute.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {dispute.title}
                        </h3>
                        <Badge 
                          variant="outline"
                          style={{ 
                            color: getDisputePriorityConfig(dispute.priority).color,
                            borderColor: getDisputePriorityConfig(dispute.priority).color
                          }}
                        >
                          {getDisputePriorityConfig(dispute.priority).icon} {getDisputePriorityConfig(dispute.priority).label}
                        </Badge>
                        <Badge variant="secondary">
                          {getDisputeStatusConfig(dispute.status).label}
                        </Badge>
                        <Badge variant="outline">
                          {getDisputeCategoryConfig(dispute.category).label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Customer:</span> {dispute.customerEmail}
                        </div>
                        <div>
                          <span className="font-medium">Tailor:</span> {dispute.tailorEmail}
                        </div>
                        <div>
                          <span className="font-medium">Order Amount:</span> GH₵ {dispute.orderAmount}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(dispute.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{dispute.messageCount} messages</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{dispute.evidenceCount} evidence files</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span className={dispute.isOverdue ? 'text-red-600 font-medium' : ''}>
                            {formatTimeRemaining(dispute.hoursUntilSla)}
                          </span>
                        </div>
                        {dispute.adminEmail && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>Assigned to {dispute.adminEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!dispute.assignedAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignDispute(dispute.id);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDisputeSelect(dispute.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Load More */}
              {hasMore && (
                <div className="text-center py-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminDisputeDashboard;