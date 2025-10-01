'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Clock, 
  CheckCircle, 
  Star,
  Search,
  Ruler,
  Users,
  TrendingUp,
  Calendar,
  MapPin
} from 'lucide-react';

interface CustomerDashboardProps {
  className?: string;
}

export function CustomerDashboard({ className }: CustomerDashboardProps) {
  const { user } = useAuth();

  // Mock data - in real app, this would come from API
  const dashboardData = {
    orders: {
      total: 8,
      pending: 2,
      inProgress: 3,
      completed: 3,
      recent: [
        {
          id: 'ORD-20240818-001',
          tailorName: 'Akosua\'s Fashion',
          garmentType: 'Traditional Kente Dress',
          status: 'In Progress',
          orderDate: '2024-08-15',
          estimatedDelivery: '2024-08-30',
          amount: 250.00
        },
        {
          id: 'ORD-20240815-002', 
          tailorName: 'Kwame\'s Suits',
          garmentType: 'Business Suit',
          status: 'Completed',
          orderDate: '2024-08-10',
          completedDate: '2024-08-17',
          amount: 350.00,
          rating: 5
        }
      ]
    },
    favoriteDesigns: [
      { id: 1, name: 'Elegant Kaftan', tailor: 'Ama\'s Designs', likes: 24 },
      { id: 2, name: 'Modern Dashiki', tailor: 'Kofi\'s Creations', likes: 18 }
    ],
    measurements: {
      profiles: 3,
      lastUpdated: '2024-08-01'
    },
    recommendations: [
      {
        id: 1,
        tailorName: 'Adwoa\'s Atelier',
        specialization: 'Wedding Dresses',
        rating: 4.9,
        distance: '2.5 km',
        image: '/api/placeholder/100/100'
      },
      {
        id: 2,
        tailorName: 'Yaw\'s Traditional Wear',
        specialization: 'Kente & Dashiki',
        rating: 4.8,
        distance: '1.2 km', 
        image: '/api/placeholder/100/100'
      }
    ]
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#FFFDD0] to-[#FFD700]/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Ready to create something beautiful? Let's find the perfect tailor for your next garment.
            </p>
          </div>
          <div className="hidden md:block">
            <Button asChild className="bg-[#CE1126] hover:bg-[#CE1126]/90">
              <Link href="/orders/new">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#CE1126]">{dashboardData.orders.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.orders.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboardData.orders.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData.orders.completed}</div>
            <p className="text-xs text-muted-foreground">
              This year
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#8B4513]/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Measurements</CardTitle>
            <Ruler className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#8B4513]">{dashboardData.measurements.profiles}</div>
            <p className="text-xs text-muted-foreground">
              Profiles saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders */}
        <Card className="md:col-span-2 border-[#8B4513]/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2 text-[#CE1126]" />
                Recent Orders
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/orders">View All</Link>
              </Button>
            </div>
            <CardDescription>Your latest tailoring projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.orders.recent.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{order.garmentType}</h4>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {order.tailorName} • GHS {order.amount}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      Ordered {order.orderDate}
                      {order.estimatedDelivery && (
                        <>
                          <span className="mx-2">•</span>
                          <Clock className="w-3 h-3 mr-1" />
                          Est. {order.estimatedDelivery}
                        </>
                      )}
                      {order.rating && (
                        <>
                          <span className="mx-2">•</span>
                          <div className="flex items-center">
                            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {order.rating}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/orders/${order.id}`}>View</Link>
                  </Button>
                </div>
              ))}
              
              {dashboardData.orders.recent.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No orders yet</p>
                  <Button asChild className="mt-2">
                    <Link href="/orders/new">Place Your First Order</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recommended Tailors */}
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-[#FFD700]" />
              Recommended
            </CardTitle>
            <CardDescription>Top-rated tailors near you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recommendations.map((tailor) => (
                <div key={tailor.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tailor.tailorName}</p>
                    <p className="text-xs text-gray-600">{tailor.specialization}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                      {tailor.rating}
                      <span className="mx-1">•</span>
                      <MapPin className="w-3 h-3 mr-1" />
                      {tailor.distance}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/tailors/${tailor.id}`}>View</Link>
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/tailors">
                  <Search className="w-4 h-4 mr-2" />
                  Browse All Tailors
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-[#8B4513]/10">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Everything you need to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" asChild>
              <Link href="/orders/new">
                <Plus className="w-6 h-6 mb-2" />
                <span className="text-sm">New Order</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" asChild>
              <Link href="/tailors">
                <Search className="w-6 h-6 mb-2" />
                <span className="text-sm">Find Tailors</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" asChild>
              <Link href="/measurements">
                <Ruler className="w-6 h-6 mb-2" />
                <span className="text-sm">Measurements</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" asChild>
              <Link href="/family">
                <Users className="w-6 h-6 mb-2" />
                <span className="text-sm">Family</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile New Order FAB */}
      <div className="md:hidden fixed bottom-6 right-6">
        <Button size="lg" className="rounded-full w-14 h-14 bg-[#CE1126] hover:bg-[#CE1126]/90 shadow-lg" asChild>
          <Link href="/orders/new">
            <Plus className="w-6 h-6" />
          </Link>
        </Button>
      </div>
    </div>
  );
}