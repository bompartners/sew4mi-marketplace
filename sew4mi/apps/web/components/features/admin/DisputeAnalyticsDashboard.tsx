'use client';

// Dispute Analytics Dashboard Component
// Story 2.4: Analytics and pattern identification for dispute resolution

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  FileText,
  Target,
  RefreshCw,
  Download,
  BarChart3
} from 'lucide-react';

interface DisputeAnalyticsProps {
  onExport?: (data: any) => void;
  className?: string;
}

interface AnalyticsData {
  overview: {
    totalDisputes: number;
    resolvedDisputes: number;
    averageResolutionTime: number;
    slaPerformance: number;
  };
  patterns: {
    topCategories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    problematicTailors: Array<{
      tailorId: string;
      tailorEmail: string;
      disputeCount: number;
      totalOrders: number;
      disputeRate: number;
    }>;
    frequentCustomers: Array<{
      customerId: string;
      customerEmail: string;
      disputeCount: number;
      totalOrders: number;
      disputeRate: number;
    }>;
  };
  trends: {
    monthly: Array<{
      month: string;
      disputes: number;
      resolved: number;
      avgResolutionTime: number;
    }>;
    categoryTrends: Array<{
      category: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      changePercent: number;
    }>;
  };
  performance: {
    adminPerformance: Array<{
      adminId: string;
      adminEmail: string;
      assignedDisputes: number;
      resolvedDisputes: number;
      avgResolutionTime: number;
      slaCompliance: number;
    }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function DisputeAnalyticsDashboard({ onExport, className = '' }: DisputeAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load analytics data
  const loadAnalytics = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/admin/disputes/analytics');
      if (!response.ok) {
        throw new Error('Failed to load analytics data');
      }

      const analyticsData = await response.json();
      setData(analyticsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadAnalytics(true);
  }, [loadAnalytics]);

  // Handle export
  const handleExport = useCallback(() => {
    if (data && onExport) {
      onExport(data);
    }
  }, [data, onExport]);

  // Format category name for display
  const formatCategoryName = (category: string): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Removed unused getTrendIndicator function - may be added back for future trend analysis features

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Analytics</h1>
          <p className="text-sm text-gray-600">
            Comprehensive analytics and pattern identification for dispute resolution
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!data}
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Disputes</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalDisputes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Target className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.resolvedDisputes}</p>
              <p className="text-xs text-gray-500">
                {data.overview.totalDisputes > 0 
                  ? `${Math.round((data.overview.resolvedDisputes / data.overview.totalDisputes) * 100)}% resolution rate`
                  : 'No disputes'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(data.overview.averageResolutionTime)}h</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">SLA Performance</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(data.overview.slaPerformance)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Dispute Categories</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.patterns.topCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${formatCategoryName(category)} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.patterns.topCategories.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Category Details</h3>
              <div className="space-y-3">
                {data.patterns.topCategories.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">
                        {formatCategoryName(category.category)}
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{category.count} disputes</Badge>
                      <p className="text-xs text-gray-500">{category.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Problematic Tailors */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Problematic Tailors
              </h3>
              <div className="space-y-3">
                {data.patterns.problematicTailors.slice(0, 5).map((tailor) => (
                  <div key={tailor.tailorId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{tailor.tailorEmail}</p>
                      <p className="text-sm text-gray-600">
                        {tailor.disputeCount} disputes out of {tailor.totalOrders} orders
                      </p>
                    </div>
                    <Badge 
                      variant={tailor.disputeRate > 20 ? 'destructive' : 'secondary'}
                    >
                      {tailor.disputeRate}% rate
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Frequent Customers */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="h-5 w-5 text-blue-500 mr-2" />
                Frequent Dispute Customers
              </h3>
              <div className="space-y-3">
                {data.patterns.frequentCustomers.slice(0, 5).map((customer) => (
                  <div key={customer.customerId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{customer.customerEmail}</p>
                      <p className="text-sm text-gray-600">
                        {customer.disputeCount} disputes
                      </p>
                    </div>
                    <Badge variant="outline">
                      Multiple disputes
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data.trends.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="disputes" 
                  stroke="#8884d8" 
                  name="Total Disputes"
                />
                <Line 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#82ca9d" 
                  name="Resolved Disputes"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Admin Performance</h3>
            <div className="space-y-4">
              {data.performance.adminPerformance.map((admin) => (
                <div key={admin.adminId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{admin.adminEmail}</p>
                    <p className="text-sm text-gray-600">
                      {admin.resolvedDisputes} of {admin.assignedDisputes} resolved
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant="outline">
                      {admin.avgResolutionTime}h avg
                    </Badge>
                    <Badge 
                      variant={admin.slaCompliance >= 90 ? 'default' : admin.slaCompliance >= 70 ? 'secondary' : 'destructive'}
                    >
                      {admin.slaCompliance}% SLA
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DisputeAnalyticsDashboard;