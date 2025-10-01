'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react';
import type { GroupOrderItem } from '@sew4mi/shared/types/group-order';

interface IndividualProgressCardProps {
  item: GroupOrderItem;
  groupOrderId?: string; // Reserved for future use
  onUpdate?: () => void; // Reserved for future use
}

const STATUS_CONFIG = {
  PENDING: { 
    label: 'Pending', 
    color: 'bg-gray-100 text-gray-700', 
    icon: Clock,
    iconColor: 'text-gray-500'
  },
  DEPOSIT_PAID: { 
    label: 'Deposit Paid', 
    color: 'bg-blue-100 text-blue-700', 
    icon: CheckCircle2,
    iconColor: 'text-blue-500'
  },
  IN_PROGRESS: { 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-700', 
    icon: Package,
    iconColor: 'text-blue-500'
  },
  IN_PRODUCTION: { 
    label: 'In Production', 
    color: 'bg-purple-100 text-purple-700', 
    icon: Package,
    iconColor: 'text-purple-500'
  },
  FITTING_READY: { 
    label: 'Ready for Fitting', 
    color: 'bg-amber-100 text-amber-700', 
    icon: AlertCircle,
    iconColor: 'text-amber-500'
  },
  FITTING_APPROVED: { 
    label: 'Fitting Approved', 
    color: 'bg-green-100 text-green-700', 
    icon: CheckCircle2,
    iconColor: 'text-green-500'
  },
  READY_FOR_DELIVERY: { 
    label: 'Ready for Delivery', 
    color: 'bg-green-100 text-green-700', 
    icon: Truck,
    iconColor: 'text-green-500'
  },
  DELIVERED: { 
    label: 'Delivered', 
    color: 'bg-green-100 text-green-700', 
    icon: CheckCircle2,
    iconColor: 'text-green-500'
  },
  COMPLETED: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-700', 
    icon: CheckCircle2,
    iconColor: 'text-green-500'
  },
  CANCELLED: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-700', 
    icon: AlertCircle,
    iconColor: 'text-red-500'
  },
  DISPUTED: { 
    label: 'Disputed', 
    color: 'bg-red-100 text-red-700', 
    icon: AlertCircle,
    iconColor: 'text-red-500'
  },
};

export function IndividualProgressCard({
  item,
  groupOrderId: _groupOrderId, // Reserved for future use
  onUpdate: _onUpdate, // Reserved for future use
}: IndividualProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const handleViewDetails = () => {
    // Navigate to individual order details
    window.location.href = `/orders/${item.orderId}`;
  };

  const handleSendMessage = () => {
    // Navigate to order chat/messaging
    window.location.href = `/orders/${item.orderId}#messages`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold">{item.familyMemberName}</div>
              <div className="text-sm text-gray-600">{item.garmentType}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className={`w-3 h-3 mr-1 ${statusConfig.iconColor}`} />
              {statusConfig.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold text-blue-600">
              {item.progressPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={item.progressPercentage} className="h-2" />
        </div>

        {/* Key Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Priority:</span>
            <span className="ml-2 font-medium">#{item.deliveryPriority}</span>
          </div>
          <div>
            <span className="text-gray-500">Amount:</span>
            <span className="ml-2 font-medium">
              {item.discountedAmount.toFixed(2)} GHS
              {item.individualDiscount > 0 && (
                <span className="text-xs text-green-600 ml-1">
                  (-{item.individualDiscount.toFixed(2)})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Delivery Information */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Delivery:</span>
                <span className="font-medium">
                  {new Date(item.estimatedDelivery).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {item.actualDelivery && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivered On:</span>
                  <span className="font-medium text-green-600">
                    {new Date(item.actualDelivery).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Coordinated Design Notes */}
            {item.coordinatedDesignNotes && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs font-medium text-blue-900 mb-1">
                  Design Notes
                </div>
                <div className="text-sm text-blue-700">
                  {item.coordinatedDesignNotes}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Payment Breakdown
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Amount:</span>
                  <span className="line-through">{item.individualAmount.toFixed(2)} GHS</span>
                </div>
                {item.individualDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount Applied:</span>
                    <span>-{item.individualDiscount.toFixed(2)} GHS</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Final Amount:</span>
                  <span>{item.discountedAmount.toFixed(2)} GHS</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
                className="flex-1"
              >
                <Package className="w-4 h-4 mr-2" />
                View Details
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendMessage}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>

            {/* Status Timeline Preview */}
            {item.progressPercentage > 0 && (
              <div className="pt-3 border-t">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Progress Timeline
                </div>
                <div className="space-y-2">
                  {[
                    { stage: 'Deposit', complete: item.progressPercentage >= 25 },
                    { stage: 'Production Started', complete: item.progressPercentage >= 40 },
                    { stage: 'Fitting', complete: item.progressPercentage >= 75 },
                    { stage: 'Final Payment', complete: item.progressPercentage >= 90 },
                    { stage: 'Delivery', complete: item.progressPercentage >= 100 },
                  ].map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          stage.complete ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          stage.complete ? 'text-green-700 font-medium' : 'text-gray-500'
                        }`}
                      >
                        {stage.stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

