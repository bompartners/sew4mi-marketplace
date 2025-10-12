'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Dashboard statistics interface
 */
interface DashboardStats {
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  measurements: {
    profiles: number;
  };
}

/**
 * Recent order interface
 */
interface RecentOrder {
  id: string;
  tailorName: string;
  garmentType: string;
  status: string;
  orderDate: string;
  estimatedDelivery?: string;
  completedDate?: string;
  amount: number;
}

/**
 * Recommended tailor interface
 */
interface RecommendedTailor {
  id: string;
  tailorName: string;
  specialization: string;
  rating: number;
  distance: string;
}

/**
 * Fetch dashboard statistics with React Query
 * Caches for 5 minutes, refetches in background every 30 seconds
 */
export function useDashboardStats() {
  const supabase = createClient();

  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Background refetch every 30 seconds
    refetchIntervalInBackground: false,
  });
}

/**
 * Fetch recent orders with React Query
 * Caches for 1 minute, updates more frequently than stats
 */
export function useRecentOrders() {
  const supabase = createClient();

  return useQuery<{ orders: RecentOrder[] }>({
    queryKey: ['dashboard', 'orders', 'recent'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/dashboard/orders/recent', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent orders');
      }

      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Background refetch every 30 seconds
    refetchIntervalInBackground: false,
  });
}

/**
 * Fetch recommended tailors with React Query
 * Caches for 1 hour since recommendations don't change often
 */
export function useRecommendedTailors() {
  const supabase = createClient();

  return useQuery<{ recommendations: RecommendedTailor[] }>({
    queryKey: ['dashboard', 'recommendations'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/dashboard/recommendations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: false, // No background refetch for recommendations
  });
}

/**
 * Combined hook for customer dashboard data
 * Fetches all data in parallel with proper loading states
 */
export function useCustomerDashboard() {
  const stats = useDashboardStats();
  const recentOrders = useRecentOrders();
  const recommendations = useRecommendedTailors();

  return {
    stats: stats.data,
    recentOrders: recentOrders.data?.orders || [],
    recommendations: recommendations.data?.recommendations || [],
    isLoading: stats.isLoading || recentOrders.isLoading || recommendations.isLoading,
    isError: stats.isError || recentOrders.isError || recommendations.isError,
    error: stats.error || recentOrders.error || recommendations.error,
  };
}
