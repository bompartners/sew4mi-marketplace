'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  User,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type {
  GroupOrderItem,
  GroupPaymentTracking,
  PaymentMode,
} from '@sew4mi/shared/types/group-order';

interface GroupPaymentCoordinatorProps {
  groupOrderId: string;
  paymentMode: PaymentMode;
  items: GroupOrderItem[];
  paymentTracking?: GroupPaymentTracking[];
  onPaymentMade?: () => void;
}

type PaymentMethod = 'MTN_MOMO' | 'VODAFONE_CASH' | 'AIRTELTIGO_MONEY' | 'CARD';

export function GroupPaymentCoordinator({
  groupOrderId,
  paymentMode,
  items,
  paymentTracking = [],
  onPaymentMade,
}: GroupPaymentCoordinatorProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStage, setPaymentStage] = useState<'DEPOSIT' | 'FITTING' | 'FINAL'>('DEPOSIT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MTN_MOMO');

  // Calculate payment summary
  const totalAmount = items.reduce((sum, item) => sum + item.discountedAmount, 0);
  const paidAmount = paymentTracking.reduce((sum, pt) => sum + pt.paidAmount, 0);
  const outstandingAmount = totalAmount - paidAmount;
  const paymentProgress = (paidAmount / totalAmount) * 100;

  const handlePayment = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select items to make payment for',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate payment amount for selected items
      const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
      const paymentAmount = selectedItemsData.reduce((sum, item) => {
        const stagePercentage = paymentStage === 'DEPOSIT' ? 0.25 : paymentStage === 'FITTING' ? 0.5 : 0.25;
        return sum + (item.discountedAmount * stagePercentage);
      }, 0);

      const response = await fetch(`/api/orders/group/${groupOrderId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedItems,
          amount: paymentAmount,
          paymentStage,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      toast({
        title: 'Payment Successful',
        description: `Payment of ${paymentAmount.toFixed(2)} GHS processed successfully`,
      });

      setSelectedItems([]);
      
      if (onPaymentMade) {
        onPaymentMade();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <CardTitle>Payment Coordination</CardTitle>
            </div>
            <Badge variant={paymentMode === 'SINGLE_PAYER' ? 'default' : 'secondary'}>
              {paymentMode === 'SINGLE_PAYER' ? 'Single Payer' : 'Split Payment'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-900 font-medium">Overall Payment Progress</span>
                <span className="text-sm font-semibold text-blue-600">
                  {paymentProgress.toFixed(0)}%
                </span>
              </div>
              <Progress value={paymentProgress} className="h-3" />
              
              <div className="grid grid-cols-3 gap-4 pt-3">
                <div>
                  <div className="text-xs text-blue-600">Total Amount</div>
                  <div className="text-lg font-bold text-blue-900">
                    {totalAmount.toFixed(2)} GHS
                  </div>
                </div>
                <div>
                  <div className="text-xs text-green-600">Paid</div>
                  <div className="text-lg font-bold text-green-700">
                    {paidAmount.toFixed(2)} GHS
                  </div>
                </div>
                <div>
                  <div className="text-xs text-amber-600">Outstanding</div>
                  <div className="text-lg font-bold text-amber-700">
                    {outstandingAmount.toFixed(2)} GHS
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Tracking by Person */}
          {paymentTracking.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Payment Status by Person</h4>
              {paymentTracking.map((tracking) => (
                <Card key={tracking.id} className="p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">{tracking.payerName}</span>
                    </div>
                    <Badge className={getPaymentStatusBadge(tracking.status)}>
                      {tracking.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Responsible for:</span>
                      <span className="font-medium">{tracking.responsibility.length} item(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Responsibility:</span>
                      <span className="font-medium">{tracking.totalResponsibleAmount.toFixed(2)} GHS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid:</span>
                      <span className="font-medium text-green-600">{tracking.paidAmount.toFixed(2)} GHS</span>
                    </div>
                    {tracking.outstandingAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Outstanding:</span>
                        <span className="font-medium text-amber-600">{tracking.outstandingAmount.toFixed(2)} GHS</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Breakdown */}
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Deposit</div>
                      <div className="font-medium">{tracking.depositPaid.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Fitting</div>
                      <div className="font-medium">{tracking.fittingPaid.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Final</div>
                      <div className="font-medium">{tracking.finalPaid.toFixed(2)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Make Payment Section */}
          {outstandingAmount > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold">Make a Payment</h4>

              {/* Payment Stage Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Payment Stage</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'DEPOSIT', label: 'Deposit (25%)', percent: 25 },
                    { value: 'FITTING', label: 'Fitting (50%)', percent: 50 },
                    { value: 'FINAL', label: 'Final (25%)', percent: 25 },
                  ].map((stage) => (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => setPaymentStage(stage.value as any)}
                      className={`p-3 border-2 rounded-lg text-sm transition-colors ${
                        paymentStage === stage.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{stage.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Items to Pay For ({selectedItems.length} selected)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {items.map((item) => {
                    const stagePercentage = paymentStage === 'DEPOSIT' ? 0.25 : paymentStage === 'FITTING' ? 0.5 : 0.25;
                    const paymentAmount = item.discountedAmount * stagePercentage;

                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, item.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.familyMemberName}</div>
                          <div className="text-xs text-gray-500">{item.garmentType}</div>
                        </div>
                        <div className="text-sm font-semibold">
                          {paymentAmount.toFixed(2)} GHS
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'MTN_MOMO', label: 'MTN Mobile Money', icon: '📱' },
                    { value: 'VODAFONE_CASH', label: 'Vodafone Cash', icon: '💳' },
                    { value: 'AIRTELTIGO_MONEY', label: 'AirtelTigo Money', icon: '📞' },
                    { value: 'CARD', label: 'Debit/Credit Card', icon: '💳' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                      className={`p-3 border-2 rounded-lg text-sm transition-colors ${
                        paymentMethod === method.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{method.icon}</span>
                        <span className="font-medium text-left">{method.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Total */}
              {selectedItems.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">Payment Total:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {items
                        .filter(item => selectedItems.includes(item.id))
                        .reduce((sum, item) => {
                          const stagePercentage = paymentStage === 'DEPOSIT' ? 0.25 : paymentStage === 'FITTING' ? 0.5 : 0.25;
                          return sum + (item.discountedAmount * stagePercentage);
                        }, 0)
                        .toFixed(2)}{' '}
                      GHS
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing || selectedItems.length === 0}
                className="w-full"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </div>
          )}

          {/* All Paid Message */}
          {outstandingAmount === 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">All payments completed!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getPaymentStatusBadge(status: string): string {
  const classes: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
}

