'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Clock, CheckCircle, XCircle, Eye, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { AddToFavoritesButton } from '@/components/features/favorites/AddToFavoritesButton';
import { ReorderButton } from '@/components/features/reorder/ReorderButton';
import { createClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  order_number: string;
  garment_type: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_date: string | null;
  tailor_profiles?: {
    business_name: string;
  } | null;
  customer_name?: string; // For tailor view
  users?: {
    full_name: string;
  };
}

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('delivered') || statusLower.includes('completed')) return 'bg-green-100 text-green-800';
  if (statusLower.includes('progress') || statusLower.includes('production')) return 'bg-blue-100 text-blue-800';
  if (statusLower.includes('pending') || statusLower.includes('confirmed')) return 'bg-yellow-100 text-yellow-800';
  if (statusLower.includes('cancelled') || statusLower.includes('disputed')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('delivered') || statusLower.includes('completed')) return CheckCircle;
  if (statusLower.includes('progress') || statusLower.includes('production')) return Clock;
  if (statusLower.includes('cancelled') || statusLower.includes('disputed')) return XCircle;
  return Package;
};

const getStatusCategory = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('delivered') || statusLower.includes('completed')) return 'completed';
  if (statusLower.includes('progress') || statusLower.includes('production')) return 'in_progress';
  if (statusLower.includes('cancelled') || statusLower.includes('disputed')) return 'cancelled';
  return 'pending';
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        // First, get user's role to determine which orders to fetch
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user role:', userError);
          throw new Error('Failed to fetch user information');
        }

        const role = userData?.role?.toUpperCase();
        
        // Only update userRole if it's different to prevent infinite loops
        setUserRole(prev => prev !== role ? role : prev);

        // For tailors, we need to get their tailor_profile_id first
        if (role === 'TAILOR') {
          // Get tailor profile
          const { data: tailorProfile, error: profileError } = await supabase
            .from('tailor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching tailor profile:', profileError);
            throw new Error('Failed to fetch tailor profile');
          }

          if (!tailorProfile) {
            setOrders([]);
            setLoading(false);
            return;
          }

          // Fetch orders assigned to this tailor
          const { data, error: fetchError } = await supabase
            .from('orders')
            .select(`
              id,
              order_number,
              garment_type,
              status,
              total_amount,
              created_at,
              delivery_date,
              users!customer_id (
                full_name
              )
            `)
            .eq('tailor_id', tailorProfile.id)
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;
          
          // Transform data to match expected structure
          const transformedData = (data || []).map(order => {
            const users = (order as any).users;
            // Handle both object and array cases from Supabase
            const customerName = users
              ? (Array.isArray(users) 
                  ? users[0]?.full_name 
                  : users.full_name)
              : 'Unknown Customer';
            
            return {
              ...order,
              tailor_profiles: null, // Tailors don't need to see their own name
              customer_name: customerName
            };
          });
          
          setOrders(transformedData);
        } else {
          // For customers, fetch orders they placed
          const { data, error: fetchError } = await supabase
            .from('orders')
            .select(`
              id,
              order_number,
              garment_type,
              status,
              total_amount,
              created_at,
              delivery_date,
              tailor_profiles!tailor_id (
                business_name
              )
            `)
            .eq('customer_id', user.id)
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;
          setOrders(data || []);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const filterOrders = (status: string) => {
    if (status === 'all') return orders;
    return orders.filter(order => getStatusCategory(order.status) === status);
  };

  const getOrderCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => getStatusCategory(o.status) === 'pending').length,
      in_progress: orders.filter(o => getStatusCategory(o.status) === 'in_progress').length,
      completed: orders.filter(o => getStatusCategory(o.status) === 'completed').length,
      cancelled: orders.filter(o => getStatusCategory(o.status) === 'cancelled').length
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
            <h1 className="text-3xl font-bold text-gray-900">
              {userRole === 'TAILOR' ? 'Assigned Orders' : 'My Orders'}
            </h1>
            <p className="mt-2 text-gray-600">
              {userRole === 'TAILOR' 
                ? 'Manage orders assigned to your tailoring business'
                : 'Track and manage your custom garment orders'
              }
            </p>
          </div>
          {userRole !== 'TAILOR' && (
            <Link href="/orders/new">
              <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </Link>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

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
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="w-20 h-20 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-64" />
                          </div>
                          <Skeleton className="h-10 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filterOrders(status).length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No {status === 'all' ? '' : status.replace('_', ' ')} orders
                      </h3>
                      <p className="mt-2 text-gray-600">
                        {status === 'all' 
                          ? userRole === 'TAILOR'
                            ? 'No orders have been assigned to you yet. Orders will appear here when customers place them.'
                            : 'You haven\'t placed any orders yet. Start by browsing our tailors!'
                          : `You don't have any ${status.replace('_', ' ')} orders at the moment.`
                        }
                      </p>
                      {status === 'all' && userRole !== 'TAILOR' && (
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
                    const statusCategory = getStatusCategory(order.status);
                    
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
                                  {order.garment_type}
                                </h3>
                                <p className="text-gray-600">
                                  {order.tailor_profiles?.business_name 
                                    ? `Tailor: ${order.tailor_profiles.business_name}` 
                                    : order.customer_name 
                                    ? `Customer: ${order.customer_name}`
                                    : order.users?.full_name
                                    ? `Customer: ${order.users.full_name}`
                                    : 'Order Details'}
                                </p>
                                <p className="text-sm text-gray-500">Order #{order.order_number}</p>
                                
                                <div className="mt-2 flex items-center space-x-4">
                                  <Badge className={getStatusColor(order.status)}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {order.status.replace(/_/g, ' ').toUpperCase()}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    Ordered: {new Date(order.created_at).toLocaleDateString()}
                                  </span>
                                  {order.delivery_date && (
                                    <span className="text-sm text-gray-500">
                                      Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-xl font-bold text-gray-900">
                                GHS {order.total_amount.toFixed(2)}
                              </p>
                              <div className="flex gap-2">
                                <Link href={`/orders/${order.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </Button>
                                </Link>
                                {statusCategory === 'completed' && (
                                  <>
                                    <ReorderButton orderId={order.id} size="sm" />
                                    <AddToFavoritesButton
                                      orderId={order.id}
                                      orderName={order.garment_type}
                                      size="sm"
                                      showText={false}
                                    />
                                  </>
                                )}
                              </div>
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