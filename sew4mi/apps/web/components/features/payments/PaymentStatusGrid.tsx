'use client';

import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw,
  Circle
} from 'lucide-react';

interface PaymentStatusGridProps {
  breakdown: {
    pending: number;
    completed: number;
    disputed: number;
    refunded: number;
  };
  showPercentages?: boolean;
}

export function PaymentStatusGrid({ 
  breakdown, 
  showPercentages = true 
}: PaymentStatusGridProps) {
  const { pending, completed, disputed, refunded } = breakdown;
  const total = pending + completed + disputed + refunded;

  const formatCurrency = (amount: number) => 
    `GHS ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const calculatePercentage = (amount: number) => 
    total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';

  const statusItems = [
    {
      label: 'Completed',
      amount: completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      label: 'Pending',
      amount: pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      label: 'Disputed',
      amount: disputed,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      label: 'Refunded',
      amount: refunded,
      icon: RotateCcw,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  ];

  if (total === 0) {
    return (
      <div className="text-center py-8">
        <Circle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No payments yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Payment status will appear here when you receive payments
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status items */}
      <div className="space-y-3">
        {statusItems.map((item) => {
          const Icon = item.icon;
          const percentage = calculatePercentage(item.amount);
          
          return (
            <div
              key={item.label}
              className={`flex items-center justify-between p-3 rounded-lg border ${item.bgColor} ${item.borderColor}`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${item.color}`} />
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  {showPercentages && (
                    <p className="text-xs text-gray-500">
                      {percentage}% of total
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">
                  {formatCurrency(item.amount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total summary */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900">Total</p>
          <p className="font-bold text-lg text-[#8B4513]">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Progress bar visualization */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Payment Distribution
        </p>
        <div className="flex rounded-full overflow-hidden h-2">
          {statusItems.map((item, _index) => {
            const width = total > 0 ? (item.amount / total) * 100 : 0;
            
            if (width === 0) return null;

            return (
              <div
                key={item.label}
                className={`h-full transition-all duration-300 ${
                  item.label === 'Completed' ? 'bg-green-500' :
                  item.label === 'Pending' ? 'bg-yellow-500' :
                  item.label === 'Disputed' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}
                style={{ width: `${width}%` }}
                title={`${item.label}: ${formatCurrency(item.amount)} (${calculatePercentage(item.amount)}%)`}
              />
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          {statusItems.map((item) => {
            const percentage = calculatePercentage(item.amount);
            
            if (item.amount === 0) return null;

            return (
              <div key={item.label} className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.label === 'Completed' ? 'bg-green-500' :
                    item.label === 'Pending' ? 'bg-yellow-500' :
                    item.label === 'Disputed' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}
                />
                <span className="text-gray-600">
                  {item.label} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}