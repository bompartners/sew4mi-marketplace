'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle,
  Shield, 
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  MessageSquare,
  Settings,
  Activity,
  Eye,
  Scissors
} from 'lucide-react';

interface AdminDashboardProps {
  className?: string;
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  const { user } = useAuth();

  // Mock data - in real app, this would come from API
  const dashboardData = {
    overview: {
      totalUsers: 1247,
      newUsersThisMonth: 89,
      activeTailors: 156,
      verifiedTailors: 142,
      totalOrders: 2894,
      ordersThisMonth: 198,
      revenue: 45680.00,
      disputes: 3
    },
    pendingActions: {
      tailorApplications: 12,
      disputes: 3,
      reportedContent: 5,
      failedPayments: 7
    },
    recentActivity: [
      {
        id: 1,
        type: 'user_registered',
        description: 'New customer Ama Asante registered',
        timestamp: '2 hours ago',
        severity: 'info'
      },
      {
        id: 2,
        type: 'dispute_opened',
        description: 'Dispute opened for order ORD-001234',
        timestamp: '4 hours ago',
        severity: 'warning'
      },
      {
        id: 3,
        type: 'tailor_verified',
        description: 'Kwame\'s Designs has been verified',
        timestamp: '6 hours ago',
        severity: 'success'
      },
      {
        id: 4,
        type: 'payment_failed',
        description: 'Payment failed for order ORD-001235',
        timestamp: '8 hours ago',
        severity: 'error'
      }
    ],
    systemHealth: {
      uptime: '99.9%',
      responseTime: '145ms',
      errorRate: '0.1%',
      lastBackup: '2 hours ago'
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'info':
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#CE1126]/10 to-[#FFD700]/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-[#CE1126]" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'}. 
              System is running smoothly with {dashboardData.pendingActions.tailorApplications + dashboardData.pendingActions.disputes + dashboardData.pendingActions.reportedContent} items requiring attention.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" asChild>
              <Link href="/admin/audit-logs">
                <FileText className="w-4 h-4 mr-2" />
                Audit Logs
              </Link>
            </Button>
            <Button asChild className="bg-[#CE1126] hover:bg-[#CE1126]/90">
              <Link href="/admin/settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts for Critical Issues */}
      {dashboardData.pendingActions.disputes > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{dashboardData.pendingActions.disputes} disputes</strong> require immediate attention.
            <Link href="/admin/disputes" className="ml-2 underline font-medium">
              Review now →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {dashboardData.pendingActions.tailorApplications >= 10 && (
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertDescription>
            <strong>{dashboardData.pendingActions.tailorApplications} tailor applications</strong> are pending review.
            <Link href="/admin/users?filter=pending_tailors" className="ml-2 underline font-medium">
              Review applications →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#CE1126]">{dashboardData.overview.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.overview.newUsersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tailors</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#8B4513]">{dashboardData.overview.activeTailors}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.overview.verifiedTailors} verified
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboardData.overview.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.overview.ordersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              GHS {dashboardData.overview.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total platform revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Pending Actions */}
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items requiring admin attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="text-sm">Tailor Applications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{dashboardData.pendingActions.tailorApplications}</Badge>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/admin/users?filter=pending_tailors">Review</Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                  <span className="text-sm">Active Disputes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive">{dashboardData.pendingActions.disputes}</Badge>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/admin/disputes">Review</Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-orange-600" />
                  <span className="text-sm">Reported Content</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{dashboardData.pendingActions.reportedContent}</Badge>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/admin/content">Review</Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  <span className="text-sm">Failed Payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive">{dashboardData.pendingActions.failedPayments}</Badge>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/admin/payments">Review</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-1 lg:col-span-2 border-[#8B4513]/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-[#FFD700]" />
                Recent Activity
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/audit-logs">View All</Link>
              </Button>
            </div>
            <CardDescription>Latest system and user activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`p-1 rounded-full ${getSeverityColor(activity.severity)}`}>
                    {getSeverityIcon(activity.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp}
                    </p>
                  </div>
                  <Badge className={getSeverityColor(activity.severity)}>
                    {activity.type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
              System Health
            </CardTitle>
            <CardDescription>Platform performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-lg font-bold text-green-600">{dashboardData.systemHealth.uptime}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Response Time</span>
                <span className="text-lg font-bold text-blue-600">{dashboardData.systemHealth.responseTime}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Error Rate</span>
                <span className="text-lg font-bold text-green-600">{dashboardData.systemHealth.errorRate}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Backup</span>
                <span className="text-sm text-gray-600">{dashboardData.systemHealth.lastBackup}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle>Admin Tools</CardTitle>
            <CardDescription>Quick access to admin functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/admin/users">
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-xs">Users</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/admin/orders">
                  <Package className="w-5 h-5 mb-1" />
                  <span className="text-xs">Orders</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/admin/analytics">
                  <BarChart3 className="w-5 h-5 mb-1" />
                  <span className="text-xs">Analytics</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/admin/settings">
                  <Settings className="w-5 h-5 mb-1" />
                  <span className="text-xs">Settings</span>
                </Link>
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/audit-logs">
                  <Eye className="w-4 h-4 mr-2" />
                  View Comprehensive Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}