'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { EarningsChart } from './EarningsChart';
import { PaymentStatusGrid } from './PaymentStatusGrid';
import { CommissionBreakdown } from './CommissionBreakdown';
import type { PaymentDashboardData } from '@sew4mi/shared';
import { 
  DollarSign, 
  TrendingUp, 
  Download,
  AlertTriangle,
  RefreshCw,
  Eye,
  Calendar,
  CreditCard,
  FileText
} from 'lucide-react';

interface TailorPaymentDashboardProps {
  className?: string;
}

export function TailorPaymentDashboard({ className }: TailorPaymentDashboardProps) {
  const { user: _user } = useAuth();
  const [dashboardData, setDashboardData] = useState<PaymentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      
      const response = await fetch('/api/tailors/payments/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch payment dashboard data');
      }
      
      const result = await response.json();
      setDashboardData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const formatCurrency = (amount: number) => 
    `GHS ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const calculateGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Helper functions for potential future use
  // const _getGrowthColor = (growth: number) => 
  //   growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600';
  //
  // const _getGrowthIcon = (growth: number) => 
  //   growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : TrendingUp;

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
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
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertDescription>
            No payment data available. Complete your first order to see earnings analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { summary, monthlyTrends, paymentStatusBreakdown, recentTransactions } = dashboardData;
  
  // Calculate month-over-month growth from trends
  const lastTwoMonths = monthlyTrends.slice(-2);
  const earningsGrowth = lastTwoMonths.length === 2 
    ? calculateGrowthPercentage(lastTwoMonths[1].earnings, lastTwoMonths[0].earnings)
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#8B4513]/10 to-[#FFD700]/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Track your earnings, commissions, and payment history
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild className="bg-[#8B4513] hover:bg-[#8B4513]/90">
              <Link href="/earnings/history">
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PaymentSummaryCard
          title="This Month"
          amount={summary.totalEarnings}
          icon={DollarSign}
          trend={earningsGrowth}
          description="Net earnings after commission"
          className="border-[#8B4513]/10"
        />

        <PaymentSummaryCard
          title="Commission Paid"
          amount={summary.platformCommission}
          icon={CreditCard}
          description={`${(summary.commissionRate * 100).toFixed(1)}% platform fee`}
          className="border-[#8B4513]/10"
        />

        <PaymentSummaryCard
          title="Pending Payments"
          amount={summary.pendingAmount}
          icon={Calendar}
          description={`${summary.totalOrders - summary.completedOrders} orders pending`}
          className="border-[#8B4513]/10"
        />

        <PaymentSummaryCard
          title="Avg Order Value"
          amount={summary.averageOrderValue}
          icon={TrendingUp}
          description={`${summary.completedOrders} completed orders`}
          className="border-[#8B4513]/10"
        />
      </div>

      {/* Alert for disputed payments */}
      {paymentStatusBreakdown.disputed > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {formatCurrency(paymentStatusBreakdown.disputed)} in disputed payments. 
            <Button variant="link" asChild className="p-0 h-auto ml-2">
              <Link href="/disputes">View disputes</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Earnings Chart */}
        <Card className="lg:col-span-2 border-[#8B4513]/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Earnings Trend
            </CardTitle>
            <CardDescription>Monthly earnings over time</CardDescription>
          </CardHeader>
          <CardContent>
            <EarningsChart 
              data={monthlyTrends}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Payment Status Breakdown */}
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Current payment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentStatusGrid 
              breakdown={paymentStatusBreakdown}
            />
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown & Recent Transactions */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Commission Breakdown */}
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-[#FFD700]" />
              Commission Breakdown
            </CardTitle>
            <CardDescription>Platform fees and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionBreakdown 
              grossAmount={summary.grossPayments}
              commissionAmount={summary.platformCommission}
              netAmount={summary.netEarnings}
              commissionRate={summary.commissionRate}
            />
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-[#8B4513]/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/earnings/history">View All</Link>
              </Button>
            </div>
            <CardDescription>Latest payment activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{transaction.garmentType}</h4>
                      <Badge variant={
                        transaction.status === 'COMPLETED' ? 'default' :
                        transaction.status === 'PENDING' ? 'secondary' :
                        transaction.status === 'DISPUTED' ? 'destructive' : 'outline'
                      }>
                        {transaction.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">for {transaction.customerName}</p>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-500">
                        {transaction.paymentDate.toLocaleDateString()}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(transaction.netAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {recentTransactions.length === 0 && (
                <div className="text-center py-6">
                  <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No transactions yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-[#8B4513]/10">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your payments and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
              <Link href="/earnings/history">
                <Eye className="w-5 h-5 mb-1" />
                <span className="text-xs">View History</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
              <Link href="/earnings/export">
                <Download className="w-5 h-5 mb-1" />
                <span className="text-xs">Export Data</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
              <Link href="/invoices">
                <FileText className="w-5 h-5 mb-1" />
                <span className="text-xs">Tax Invoices</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center" asChild>
              <Link href="/earnings/analytics">
                <TrendingUp className="w-5 h-5 mb-1" />
                <span className="text-xs">Analytics</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}