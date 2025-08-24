'use client';

import React, { useState, useEffect } from 'react';
import { EscrowStatus as EscrowStatusType, EscrowStage } from '@sew4mi/shared';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { CheckCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';

interface EscrowStatusProps {
  orderId: string;
  className?: string;
}

interface EscrowStatusResponse {
  success: boolean;
  data?: EscrowStatusType & {
    progressPercentage: number;
    nextMilestone?: {
      stage: string;
      description: string;
      requiredAction?: string;
    };
    orderStatus: string;
  };
  error?: string;
}

export function EscrowStatus({ orderId, className }: EscrowStatusProps) {
  const [escrowData, setEscrowData] = useState<EscrowStatusResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEscrowStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${orderId}/escrow/status`);
        const data: EscrowStatusResponse = await response.json();
        
        if (data.success) {
          setEscrowData(data.data!);
          setError(null);
        } else {
          setError(data.error || 'Failed to load escrow status');
        }
      } catch (err) {
        setError('Network error loading escrow status');
        console.error('Error fetching escrow status:', err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchEscrowStatus();
    }
  }, [orderId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Loading escrow status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!escrowData) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Payment Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{escrowData.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${escrowData.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium">Payment Breakdown</h4>
            <div className="grid grid-cols-1 gap-3">
              <PaymentStageItem
                stage="DEPOSIT"
                label="Deposit (25%)"
                amount={escrowData.totalAmount * 0.25}
                paid={escrowData.depositPaid}
                currentStage={escrowData.currentStage}
              />
              <PaymentStageItem
                stage="FITTING"
                label="Fitting Payment (50%)"
                amount={escrowData.totalAmount * 0.50}
                paid={escrowData.fittingPaid}
                currentStage={escrowData.currentStage}
              />
              <PaymentStageItem
                stage="FINAL"
                label="Final Payment (25%)"
                amount={escrowData.totalAmount * 0.25}
                paid={escrowData.finalPaid}
                currentStage={escrowData.currentStage}
              />
            </div>
          </div>

          {/* Current Status */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Current Stage</span>
            </div>
            <p className="text-sm text-blue-800">
              {getStageDescription(escrowData.currentStage)}
            </p>
            {escrowData.nextMilestone && (
              <p className="text-sm text-blue-700 mt-2">
                <strong>Next:</strong> {escrowData.nextMilestone.description}
              </p>
            )}
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-gray-600">Total Amount</p>
              <p className="font-medium">GH₵ {escrowData.totalAmount.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-600">Remaining in Escrow</p>
              <p className="font-medium">GH₵ {escrowData.escrowBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PaymentStageItemProps {
  stage: EscrowStage;
  label: string;
  amount: number;
  paid: number;
  currentStage: EscrowStage;
}

function PaymentStageItem({ stage, label, amount, paid, currentStage }: PaymentStageItemProps) {
  const isPaid = paid > 0;
  const isCurrent = stage === currentStage;
  const isPending = getStageOrder(stage) > getStageOrder(currentStage);

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isPaid ? 'bg-green-50 border-green-200' : 
      isCurrent ? 'bg-yellow-50 border-yellow-200' : 
      'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`flex-shrink-0 ${
          isPaid ? 'text-green-600' : 
          isCurrent ? 'text-yellow-600' : 
          'text-gray-400'
        }`}>
          {isPaid ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-600">
            GH₵ {amount.toFixed(2)}
            {isPaid && (
              <span className="ml-2 text-green-600">✓ Paid</span>
            )}
            {isCurrent && !isPaid && (
              <span className="ml-2 text-yellow-600">• Current</span>
            )}
            {isPending && (
              <span className="ml-2 text-gray-500">• Pending</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function getStageDescription(stage: EscrowStage): string {
  const descriptions = {
    'DEPOSIT': 'Waiting for initial deposit payment to confirm order',
    'FITTING': 'Deposit paid. Tailor will proceed with garment creation and fitting',
    'FINAL': 'Fitting approved. Preparing for final delivery',
    'RELEASED': 'All payments completed. Order finished'
  };
  
  return descriptions[stage] || 'Unknown stage';
}

function getStageOrder(stage: EscrowStage): number {
  const order = {
    'DEPOSIT': 1,
    'FITTING': 2,
    'FINAL': 3,
    'RELEASED': 4
  };
  
  return order[stage] || 0;
}