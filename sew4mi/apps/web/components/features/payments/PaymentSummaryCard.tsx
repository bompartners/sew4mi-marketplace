'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface PaymentSummaryCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  trend?: number;
  description?: string;
  className?: string;
  currency?: string;
}

export function PaymentSummaryCard({
  title,
  amount,
  icon: Icon,
  trend,
  description,
  className = '',
  currency = 'GHS'
}: PaymentSummaryCardProps) {
  const formatCurrency = (value: number) => 
    `${currency} ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const getTrendColor = (trendValue?: number) => {
    if (!trendValue || trendValue === 0) return 'text-gray-500';
    return trendValue > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trendValue?: number) => {
    if (!trendValue || trendValue === 0) return Minus;
    return trendValue > 0 ? TrendingUp : TrendingDown;
  };

  const formatTrend = (trendValue?: number) => {
    if (!trendValue || trendValue === 0) return 'No change';
    const sign = trendValue > 0 ? '+' : '';
    return `${sign}${trendValue.toFixed(1)}% vs last month`;
  };

  const TrendIcon = getTrendIcon(trend);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#8B4513]">
          {formatCurrency(amount)}
        </div>
        
        {/* Trend indicator */}
        {trend !== undefined && (
          <div className={`flex items-center text-xs mt-1 ${getTrendColor(trend)}`}>
            <TrendIcon className="w-3 h-3 mr-1" />
            <span>{formatTrend(trend)}</span>
          </div>
        )}
        
        {/* Description */}
        {description && !trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        
        {/* Description with trend */}
        {description && trend !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}