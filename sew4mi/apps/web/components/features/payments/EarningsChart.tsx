'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface EarningsChartProps {
  data: Array<{
    period: string;
    earnings: number;
    orders: number;
    commission: number;
  }>;
  height?: number;
  showCommission?: boolean;
  chartType?: 'line' | 'area';
}

export function EarningsChart({
  data,
  height = 300,
  showCommission = false,
  chartType = 'area'
}: EarningsChartProps) {
  // Transform data for chart
  const chartData = data.map(item => ({
    period: formatPeriod(item.period),
    earnings: item.earnings,
    commission: item.commission,
    orders: item.orders,
    gross: item.earnings + item.commission
  }));

  function formatPeriod(period: string): string {
    const [year, month] = period.split('-');
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  const formatCurrency = (value: number) => 
    `GHS ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.name === 'earnings' && '💰 Net Earnings: '}
                {entry.name === 'commission' && '💳 Commission: '}
                {entry.name === 'gross' && '📊 Gross: '}
                {formatCurrency(entry.value)}
              </p>
            ))}
            <p className="text-sm text-gray-600">
              📦 Orders: {payload[0]?.payload?.orders || 0}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Colors following Ghana theme
  const colors = {
    earnings: '#10b981', // Green for net earnings
    commission: '#f59e0b', // Amber for commission
    gross: '#8B4513' // Brown for gross
  };

  if (chartData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-lg font-medium">No earnings data yet</p>
          <p className="text-sm">Complete your first order to see earnings trends</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {chartType === 'area' ? (
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.earnings} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={colors.earnings} stopOpacity={0.1}/>
            </linearGradient>
            {showCommission && (
              <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.commission} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={colors.commission} stopOpacity={0.1}/>
              </linearGradient>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12 }}
            className="text-gray-600"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-gray-600"
            tickFormatter={(value) => `₵${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {showCommission && (
            <Area
              type="monotone"
              dataKey="commission"
              stackId="1"
              stroke={colors.commission}
              fill="url(#commissionGradient)"
              strokeWidth={2}
              name="commission"
            />
          )}
          
          <Area
            type="monotone"
            dataKey="earnings"
            stackId={showCommission ? "1" : undefined}
            stroke={colors.earnings}
            fill="url(#earningsGradient)"
            strokeWidth={2}
            name="earnings"
          />
        </AreaChart>
      ) : (
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12 }}
            className="text-gray-600"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-gray-600"
            tickFormatter={(value) => `₵${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Line
            type="monotone"
            dataKey="earnings"
            stroke={colors.earnings}
            strokeWidth={3}
            dot={{ fill: colors.earnings, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: colors.earnings }}
            name="earnings"
          />
          
          {showCommission && (
            <Line
              type="monotone"
              dataKey="commission"
              stroke={colors.commission}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: colors.commission, strokeWidth: 2, r: 3 }}
              name="commission"
            />
          )}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}