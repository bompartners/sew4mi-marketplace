/**
 * Admin dashboard for milestone verification monitoring and analytics
 * @file MilestoneAnalyticsDashboard.tsx
 */

"use client"

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MilestoneAnalytics {
  overview: {
    totalMilestones: number;
    approvedMilestones: number;
    rejectedMilestones: number;
    pendingMilestones: number;
    autoApprovedMilestones: number;
    averageApprovalTime: number;
    rejectionRate: number;
  };
  milestoneBreakdown: Array<{
    milestone: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    autoApproved: number;
    avgApprovalTime: number;
    rejectionRate: number;
  }>;
  tailorPerformance: Array<{
    tailorId: string;
    tailorName: string;
    totalMilestones: number;
    approvalRate: number;
    rejectionRate: number;
    avgApprovalTime: number;
    qualityScore: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
    autoApproved: number;
  }>;
  rejectionPatterns: Array<{
    milestone: string;
    commonReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  }>;
  alerts: Array<{
    type: 'HIGH_REJECTION_RATE' | 'SLOW_APPROVAL_TIME' | 'QUALITY_CONCERN';
    message: string;
    severity: 'low' | 'medium' | 'high';
    data: any;
  }>;
}

interface MilestoneAnalyticsDashboardProps {
  className?: string;
}

/**
 * Metric card component for displaying key stats
 */
function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon,
  className 
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            changeType === 'increase' && "text-green-600",
            changeType === 'decrease' && "text-red-600",
            changeType === 'neutral' && "text-muted-foreground"
          )}>
            {changeType === 'increase' && <TrendingUp className="h-3 w-3" />}
            {changeType === 'decrease' && <TrendingDown className="h-3 w-3" />}
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Quality score indicator component
 */
function QualityScore({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className={cn("flex items-center gap-2 px-2 py-1 rounded-md border text-sm", getScoreColor(score))}>
      <span className="font-medium">{score}</span>
      <span className="text-xs">{getScoreLabel(score)}</span>
    </div>
  );
}

/**
 * Main admin dashboard component
 */
export function MilestoneAnalyticsDashboard({ className }: MilestoneAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<MilestoneAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [_selectedTailor, _setSelectedTailor] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        timeRange,
        includeDetails: 'true'
      });
      
      if (_selectedTailor !== 'all') {
        params.append('tailorId', _selectedTailor);
      }

      const response = await fetch(`/api/admin/milestones/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      setAnalytics(result.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching milestone analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, _selectedTailor]);

  // Export analytics data
  const handleExport = async () => {
    if (!analytics) return;

    try {
      const exportData = {
        generatedAt: new Date().toISOString(),
        timeRange,
        selectedTailor: _selectedTailor,
        ...analytics
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milestone-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics: {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAnalytics} 
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const { overview, milestoneBreakdown, tailorPerformance, alerts } = analytics;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Milestone Analytics</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Alerts ({alerts.length})
          </h2>
          {alerts.map((alert, index) => (
            <Alert 
              key={index}
              variant={alert.severity === 'high' ? 'destructive' : 'default'}
              className={cn(
                alert.severity === 'medium' && 'border-yellow-200 bg-yellow-50'
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.message}</span>
                <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                  {alert.severity.toUpperCase()}
                </Badge>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Milestones"
          value={overview.totalMilestones.toLocaleString()}
          icon={BarChart3}
        />
        <MetricCard
          title="Approval Rate"
          value={`${((overview.approvedMilestones / overview.totalMilestones) * 100 || 0).toFixed(1)}%`}
          icon={CheckCircle}
        />
        <MetricCard
          title="Avg. Approval Time"
          value={`${overview.averageApprovalTime.toFixed(1)}h`}
          icon={Clock}
        />
        <MetricCard
          title="Rejection Rate"
          value={`${overview.rejectionRate.toFixed(1)}%`}
          icon={XCircle}
        />
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">By Milestone</TabsTrigger>
          <TabsTrigger value="tailors">Tailor Performance</TabsTrigger>
          <TabsTrigger value="patterns">Rejection Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Milestone Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Approved</span>
                  <span className="text-sm font-medium">{overview.approvedMilestones}</span>
                </div>
                <Progress value={(overview.approvedMilestones / overview.totalMilestones) * 100} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending</span>
                  <span className="text-sm font-medium">{overview.pendingMilestones}</span>
                </div>
                <Progress value={(overview.pendingMilestones / overview.totalMilestones) * 100} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rejected</span>
                  <span className="text-sm font-medium">{overview.rejectedMilestones}</span>
                </div>
                <Progress value={(overview.rejectedMilestones / overview.totalMilestones) * 100} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-approved</span>
                  <span className="text-sm font-medium">{overview.autoApprovedMilestones}</span>
                </div>
                <Progress value={(overview.autoApprovedMilestones / overview.totalMilestones) * 100} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Approval Rate</span>
                  <Badge variant="default">{((overview.approvedMilestones / overview.totalMilestones) * 100 || 0).toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-approval Rate</span>
                  <Badge variant="secondary">{((overview.autoApprovedMilestones / overview.totalMilestones) * 100 || 0).toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average Response Time</span>
                  <Badge variant="outline">{overview.averageApprovalTime.toFixed(1)} hours</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Milestone Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Milestone</th>
                      <th className="text-center p-2">Total</th>
                      <th className="text-center p-2">Approved</th>
                      <th className="text-center p-2">Rejected</th>
                      <th className="text-center p-2">Pending</th>
                      <th className="text-center p-2">Rejection Rate</th>
                      <th className="text-center p-2">Avg. Approval Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestoneBreakdown.map((milestone) => (
                      <tr key={milestone.milestone} className="border-b">
                        <td className="p-2 font-medium">
                          {milestone.milestone.replace(/_/g, ' ')}
                        </td>
                        <td className="text-center p-2">{milestone.total}</td>
                        <td className="text-center p-2 text-green-600">{milestone.approved}</td>
                        <td className="text-center p-2 text-red-600">{milestone.rejected}</td>
                        <td className="text-center p-2 text-yellow-600">{milestone.pending}</td>
                        <td className="text-center p-2">
                          <Badge 
                            variant={milestone.rejectionRate > 30 ? 'destructive' : 'secondary'}
                          >
                            {milestone.rejectionRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-center p-2">{milestone.avgApprovalTime.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tailors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Tailor Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Tailor</th>
                      <th className="text-center p-2">Milestones</th>
                      <th className="text-center p-2">Approval Rate</th>
                      <th className="text-center p-2">Rejection Rate</th>
                      <th className="text-center p-2">Avg. Time</th>
                      <th className="text-center p-2">Quality Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tailorPerformance.map((tailor) => (
                      <tr key={tailor.tailorId} className="border-b">
                        <td className="p-2 font-medium">{tailor.tailorName}</td>
                        <td className="text-center p-2">{tailor.totalMilestones}</td>
                        <td className="text-center p-2 text-green-600">
                          {tailor.approvalRate.toFixed(1)}%
                        </td>
                        <td className="text-center p-2 text-red-600">
                          {tailor.rejectionRate.toFixed(1)}%
                        </td>
                        <td className="text-center p-2">{tailor.avgApprovalTime.toFixed(1)}h</td>
                        <td className="text-center p-2">
                          <QualityScore score={tailor.qualityScore} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.rejectionPatterns.map((pattern) => (
              <Card key={pattern.milestone}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {pattern.milestone.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pattern.commonReasons.length > 0 ? (
                    <div className="space-y-2">
                      {pattern.commonReasons.slice(0, 5).map((reason, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm flex-1 mr-2">{reason.reason}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {reason.count}
                            </Badge>
                            <span className="text-xs text-muted-foreground w-8">
                              {reason.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No rejection data available</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MilestoneAnalyticsDashboard;