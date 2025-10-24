'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApplicationStatusCard, type ApplicationStatus } from '@/components/features/tailors/ApplicationStatusCard';
import { 
  Package, 
  DollarSign, 
  CheckCircle, 
  Star,
  Calendar,
  Camera,
  TrendingUp,
  AlertTriangle,
  Users,
  Scissors,
  Eye,
  Plus,
  Loader2
} from 'lucide-react';

interface TailorDashboardProps {
  className?: string;
}

export function TailorDashboard({ className }: TailorDashboardProps) {
  const { user } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const response = await fetch('/api/tailors/application-status');
      if (response.ok) {
        const data = await response.json();
        setApplicationStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch application status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Show loading state
  if (isLoadingStatus) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Checking your application status...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show incomplete application states
  if (applicationStatus && !applicationStatus.hasProfile) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ApplicationStatusCard status={applicationStatus} />
      </div>
    );
  }

  // Mock data - in real app, this would come from API
  const dashboardData = {
    orders: {
      total: 24,
      pending: 3,
      inProgress: 8,
      completed: 13,
      recent: [
        {
          id: 'ORD-20240818-003',
          customerName: 'Ama Asante',
          garmentType: 'Kente Dress',
          status: 'In Progress',
          orderDate: '2024-08-16',
          dueDate: '2024-08-28',
          amount: 280.00,
          milestone: 'Cutting Started'
        },
        {
          id: 'ORD-20240817-004',
          customerName: 'Kwaku Mensah', 
          garmentType: 'Business Suit',
          status: 'Pending',
          orderDate: '2024-08-17',
          dueDate: '2024-09-02',
          amount: 420.00,
          milestone: 'Awaiting Measurements'
        }
      ]
    },
    earnings: {
      thisMonth: 2450.00,
      lastMonth: 2180.00,
      pending: 850.00,
      completed: 1600.00
    },
    performance: {
      rating: 4.8,
      totalReviews: 47,
      completionRate: 98,
      responseTime: 2.4
    },
    portfolio: {
      totalPhotos: 34,
      recentViews: 156,
      likes: 89,
      saves: 23
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMilestoneColor = (milestone: string) => {
    if (milestone.includes('Awaiting') || milestone.includes('Pending')) {
      return 'text-yellow-600';
    } else if (milestone.includes('Progress') || milestone.includes('Started')) {
      return 'text-blue-600';
    } else if (milestone.includes('Complete')) {
      return 'text-green-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#8B4513]/10 to-[#FFD700]/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tailor'}!
            </h1>
            <p className="text-gray-600 mt-1">
              You have {dashboardData.orders.pending} pending orders and {dashboardData.orders.inProgress} projects in progress.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" asChild>
              <Link href="/portfolio">
                <Camera className="w-4 h-4 mr-2" />
                Manage Portfolio
              </Link>
            </Button>
            <Button asChild className="bg-[#8B4513] hover:bg-[#8B4513]/90">
              <Link href="/calendar">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Alert */}
      {dashboardData.performance.rating < 4.5 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your rating has dropped to {dashboardData.performance.rating}/5. Consider reviewing recent feedback to improve customer satisfaction.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#8B4513]">{dashboardData.orders.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.orders.pending} pending review
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              GHS {dashboardData.earnings.thisMonth.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.earnings.thisMonth > dashboardData.earnings.lastMonth ? '+' : ''}
              {((dashboardData.earnings.thisMonth - dashboardData.earnings.lastMonth) / dashboardData.earnings.lastMonth * 100).toFixed(1)}% 
              vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dashboardData.performance.rating}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.performance.totalReviews} reviews
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData.performance.completionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              On-time delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Active Orders */}
        <Card className="md:col-span-2 border-[#8B4513]/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Scissors className="w-5 h-5 mr-2 text-[#8B4513]" />
                Active Orders
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/orders">View All</Link>
              </Button>
            </div>
            <CardDescription>Orders requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.orders.recent.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{order.garmentType}</h4>
                        <p className="text-sm text-gray-600">for {order.customerName}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={getMilestoneColor(order.milestone)}>
                        {order.milestone}
                      </span>
                      <span className="font-medium">GHS {order.amount}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      Due {order.dueDate}
                      <span className="mx-2">•</span>
                      Ordered {order.orderDate}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/orders/${order.id}`}>Manage</Link>
                  </Button>
                </div>
              ))}
              
              {dashboardData.orders.recent.length === 0 && (
                <div className="text-center py-8">
                  <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active orders</p>
                  <p className="text-sm text-gray-500 mt-1">New orders will appear here when customers place them.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Performance */}
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2 text-[#FFD700]" />
              Portfolio
            </CardTitle>
            <CardDescription>Your showcase performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Photos</p>
                  <p className="text-2xl font-bold">{dashboardData.portfolio.totalPhotos}</p>
                </div>
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    Views
                  </span>
                  <span className="font-medium">{dashboardData.portfolio.recentViews}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Likes
                  </span>
                  <span className="font-medium">{dashboardData.portfolio.likes}</span>
                </div>
              </div>

              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/portfolio">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Photos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Earnings Breakdown
            </CardTitle>
            <CardDescription>This month's financial summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed Orders</span>
                <span className="font-medium text-green-600">
                  +GHS {dashboardData.earnings.completed.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending Orders</span>
                <span className="font-medium text-yellow-600">
                  GHS {dashboardData.earnings.pending.toFixed(2)}
                </span>
              </div>
              <hr />
              <div className="flex items-center justify-between font-medium">
                <span>Total This Month</span>
                <span className="text-lg">GHS {dashboardData.earnings.thisMonth.toFixed(2)}</span>
              </div>
            </div>
            
            <Button className="w-full mt-4" variant="outline" asChild>
              <Link href="/earnings">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Payment Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your tailoring business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/orders">
                  <Package className="w-5 h-5 mb-1" />
                  <span className="text-xs">Orders</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/calendar">
                  <Calendar className="w-5 h-5 mb-1" />
                  <span className="text-xs">Calendar</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/portfolio">
                  <Camera className="w-5 h-5 mb-1" />
                  <span className="text-xs">Portfolio</span>
                </Link>
              </Button>
              
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
                <Link href="/settings">
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-xs">Settings</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}