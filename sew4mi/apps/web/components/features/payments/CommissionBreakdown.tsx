'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  Info, 
  DollarSign, 
  CreditCard,
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CommissionBreakdownProps {
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  commissionRate: number;
  showDetails?: boolean;
  className?: string;
}

export function CommissionBreakdown({
  grossAmount,
  commissionAmount,
  netAmount,
  commissionRate,
  showDetails = false,
  className = ''
}: CommissionBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);

  const formatCurrency = (amount: number) => 
    `GHS ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  const formatPercentage = (rate: number) => 
    `${(rate * 100).toFixed(1)}%`;

  // Calculate processing fees (estimated)
  const processingFeeRate = 0.025; // 2.5% typical mobile money processing fee
  const estimatedProcessingFee = grossAmount * processingFeeRate;

  const breakdownItems = [
    {
      label: 'Gross Payment Received',
      amount: grossAmount,
      icon: DollarSign,
      color: 'text-blue-600',
      description: 'Total amount paid by customer'
    },
    {
      label: 'Platform Commission',
      amount: -commissionAmount,
      icon: CreditCard,
      color: 'text-red-600',
      description: `Sew4Mi platform fee (${formatPercentage(commissionRate)})`
    },
    {
      label: 'Net Earnings',
      amount: netAmount,
      icon: Calculator,
      color: 'text-green-600',
      description: 'Your earnings after commission',
      isTotal: true
    }
  ];

  const additionalFees = [
    {
      label: 'Payment Processing',
      amount: estimatedProcessingFee,
      description: 'Mobile money/card processing fees (estimated)',
      isEstimate: true
    }
  ];

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        
        {/* Main breakdown */}
        <div className="space-y-3">
          {breakdownItems.map((item, index) => {
            const Icon = item.icon;
            const isNegative = item.amount < 0;
            const displayAmount = Math.abs(item.amount);
            
            return (
              <div
                key={item.label}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.isTotal 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className={`font-medium text-sm ${item.isTotal ? 'text-gray-900' : 'text-gray-700'}`}>
                        {item.label}
                      </p>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                <div className={`text-right ${item.isTotal ? 'font-bold text-lg' : ''}`}>
                  <p className={item.color}>
                    {isNegative ? '-' : ''}
                    {formatCurrency(displayAmount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Commission rate explanation */}
        <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-[#8B4513]" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#8B4513]">
                Commission Rate: {formatPercentage(commissionRate)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                This fee helps maintain the platform, process payments, and provide customer support.
              </p>
            </div>
          </div>
        </div>

        {/* Expandable additional details */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between text-gray-600 hover:text-gray-800"
          >
            <span className="text-sm">Additional Fee Information</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          
          {isExpanded && (
            <div className="mt-3 space-y-2">
              {additionalFees.map((fee, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-700">{fee.label}</p>
                    {fee.isEstimate && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Est.
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{fee.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(fee.amount)}
                  </p>
                </div>
              ))}
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800 font-medium mb-1">
                  💡 Commission Transparency
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Platform maintenance and development</li>
                  <li>• Customer support and dispute resolution</li>
                  <li>• Marketing and customer acquisition</li>
                  <li>• Secure payment processing</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Quick calculation summary */}
        <div className="bg-gradient-to-r from-[#8B4513]/5 to-[#FFD700]/5 rounded-lg p-4 border border-[#8B4513]/10">
          <h4 className="font-medium text-[#8B4513] mb-2 flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Quick Math
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Your Rate</p>
              <p className="font-semibold">
                {formatPercentage(1 - commissionRate)} of each payment
              </p>
            </div>
            <div>
              <p className="text-gray-600">Platform Rate</p>
              <p className="font-semibold text-red-600">
                {formatPercentage(commissionRate)} commission
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}