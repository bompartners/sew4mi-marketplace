'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Clock, CheckCircle, XCircle, Eye, Plus } from 'lucide-react';
import Link from 'next/link';

// Mock data for demonstration
const mockOrders = [
  {
    id: 'ORD-20240818-001',
    title: 'Traditional Kente Dress',
    tailor: 'Akosua\'s Fashion',
    status: 'in_progress',
    price: 250,
    orderDate: '2024-08-15',
    deliveryDate: '2024-08-30',
    image: '/api/placeholder/80/80'
  },
  {
    id: 'ORD-20240815-002', 
    title: 'Business Suit',
    tailor: 'Kwame\'s Suits',
    status: 'completed',
    price: 350,
    orderDate: '2024-08-10',
    deliveryDate: '2024-08-25',
    image: '/api/placeholder/80/80'
  },
  {
    id: 'ORD-20240812-003',
    title: 'Wedding Gown',
    tailor: 'Adwoa\'s Atelier', 
    status: 'pending',
    price: 500,
    orderDate: '2024-08-12',
    deliveryDate: '2024-09-15',
    image: '/api/placeholder/80/80'
  },
  {
    id: 'ORD-20240810-004',
    title: 'Casual Dashiki',
    tailor: 'Yaw\'s Traditional Wear',
    status: 'cancelled', 
    price: 120,
    orderDate: '2024-08-10',
    deliveryDate: '2024-08-20',
    image: '/api/placeholder/80/80'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'in_progress': return Clock;
    case 'pending': return Package;
    case 'cancelled': return XCircle;
    default: return Package;
  }
};

export default function OrdersPage() {
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const filterOrders = (status: string) => {
    if (status === 'all') return mockOrders;
    return mockOrders.filter(order => order.status === status);
  };

  const getOrderCounts = () => {
    return {
      all: mockOrders.length,
      pending: mockOrders.filter(o => o.status === 'pending').length,
      in_progress: mockOrders.filter(o => o.status === 'in_progress').length,
      completed: mockOrders.filter(o => o.status === 'completed').length,
      cancelled: mockOrders.filter(o => o.status === 'cancelled').length
    };
  };

  const counts = getOrderCounts();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to view your orders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="mt-2 text-gray-600">Track and manage your custom garment orders</p>
          </div>
          <Link href="/orders/new">
            <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>

        {/* Order Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="all" className="relative">
              All Orders
              {counts.all > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {counts.all}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending
              {counts.pending > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {counts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="relative">
              In Progress  
              {counts.in_progress > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {counts.in_progress}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="relative">
              Completed
              {counts.completed > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {counts.completed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="relative">
              Cancelled
              {counts.cancelled > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {counts.cancelled}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Order Lists */}
          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {filterOrders(status).length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No {status === 'all' ? '' : status.replace('_', ' ')} orders
                      </h3>
                      <p className="mt-2 text-gray-600">
                        {status === 'all' 
                          ? 'You haven\'t placed any orders yet. Start by browsing our tailors!'
                          : `You don't have any ${status.replace('_', ' ')} orders at the moment.`
                        }
                      </p>
                      {status === 'all' && (
                        <div className="mt-6">
                          <Link href="/tailors">
                            <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
                              Browse Tailors
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filterOrders(status).map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    
                    return (
                      <Card key={order.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {order.title}
                                </h3>
                                <p className="text-gray-600">{order.tailor}</p>
                                <p className="text-sm text-gray-500">Order #{order.id}</p>
                                
                                <div className="mt-2 flex items-center space-x-4">
                                  <Badge className={getStatusColor(order.status)}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {order.status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    Ordered: {new Date(order.orderDate).toLocaleDateString()}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900">
                                GHS {order.price.toFixed(2)}
                              </p>
                              <Link href={`/orders/${order.id}`}>
                                <Button variant="outline" size="sm" className="mt-2">
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}