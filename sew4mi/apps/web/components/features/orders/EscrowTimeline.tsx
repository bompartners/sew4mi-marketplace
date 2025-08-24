'use client';

import { EscrowStage, EscrowStageTransition } from '@sew4mi/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@sew4mi/ui';
import { CheckCircle, Circle, Clock, DollarSign } from 'lucide-react';

interface EscrowTimelineProps {
  currentStage: EscrowStage;
  stageHistory: EscrowStageTransition[];
  totalAmount: number;
  className?: string;
}

interface TimelineStage {
  stage: EscrowStage;
  title: string;
  description: string;
  percentage: number;
  amount: number;
}

export function EscrowTimeline({ 
  currentStage, 
  stageHistory, 
  totalAmount, 
  className 
}: EscrowTimelineProps) {
  const stages: TimelineStage[] = [
    {
      stage: 'DEPOSIT',
      title: 'Deposit Payment',
      description: 'Initial payment to confirm order',
      percentage: 25,
      amount: totalAmount * 0.25
    },
    {
      stage: 'FITTING',
      title: 'Fitting Payment',
      description: 'Payment released after fitting approval',
      percentage: 50,
      amount: totalAmount * 0.50
    },
    {
      stage: 'FINAL',
      title: 'Final Payment',
      description: 'Payment released upon delivery',
      percentage: 25,
      amount: totalAmount * 0.25
    },
    {
      stage: 'RELEASED',
      title: 'Completed',
      description: 'All payments processed',
      percentage: 0,
      amount: 0
    }
  ];

  const getStageStatus = (stage: EscrowStage): 'completed' | 'current' | 'pending' => {
    const stageOrder = ['DEPOSIT', 'FITTING', 'FINAL', 'RELEASED'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStageDate = (stage: EscrowStage): string | null => {
    const transition = stageHistory.find(h => h.stage === stage);
    if (transition) {
      return new Date(transition.transitionedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return null;
  };

  const getExpectedDate = (stage: EscrowStage): string => {
    // This would typically come from business logic or order data
    // For now, we'll show estimated timelines
    const estimates = {
      'DEPOSIT': 'Within 24 hours',
      'FITTING': '7-14 days after deposit',
      'FINAL': '3-5 days after fitting',
      'RELEASED': 'Upon delivery confirmation'
    };
    
    return estimates[stage] || 'TBD';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Payment Timeline</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.stage);
            const stageDate = getStageDate(stage.stage);
            const isLast = index === stages.length - 1;
            
            return (
              <div key={stage.stage} className="relative">
                {/* Timeline Line */}
                {!isLast && (
                  <div 
                    className={`absolute left-6 top-12 w-0.5 h-16 ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
                
                {/* Timeline Item */}
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 mt-1 ${
                    status === 'completed' ? 'text-green-600' :
                    status === 'current' ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : status === 'current' ? (
                      <Clock className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${
                        status === 'completed' ? 'text-green-900' :
                        status === 'current' ? 'text-blue-900' :
                        'text-gray-600'
                      }`}>
                        {stage.title}
                        {stage.percentage > 0 && (
                          <span className="ml-2 text-sm font-normal">
                            ({stage.percentage}%)
                          </span>
                        )}
                      </h4>
                      
                      {stage.amount > 0 && (
                        <div className={`flex items-center space-x-1 text-sm ${
                          status === 'completed' ? 'text-green-700' :
                          status === 'current' ? 'text-blue-700' :
                          'text-gray-500'
                        }`}>
                          <DollarSign className="h-4 w-4" />
                          <span>GH₵ {stage.amount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {stage.description}
                    </p>
                    
                    {/* Date Information */}
                    <div className="mt-2 text-xs">
                      {stageDate ? (
                        <span className="text-green-600 font-medium">
                          ✓ Completed: {stageDate}
                        </span>
                      ) : status === 'current' ? (
                        <span className="text-blue-600">
                          Expected: {getExpectedDate(stage.stage)}
                        </span>
                      ) : status === 'pending' ? (
                        <span className="text-gray-500">
                          Expected: {getExpectedDate(stage.stage)}
                        </span>
                      ) : null}
                    </div>
                    
                    {/* Current Stage Indicator */}
                    {status === 'current' && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Current Stage:</strong> {getCurrentStageAction(stage.stage)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Order Value</p>
              <p className="font-semibold text-lg">GH₵ {totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Current Progress</p>
              <p className="font-semibold text-lg">
                {getProgressPercentage(currentStage)}% Complete
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getCurrentStageAction(stage: EscrowStage): string {
  const actions = {
    'DEPOSIT': 'Waiting for customer to complete deposit payment',
    'FITTING': 'Tailor is creating garment. Customer will approve fitting photos',
    'FINAL': 'Preparing for delivery. Final payment will be released upon confirmation',
    'RELEASED': 'Order completed successfully'
  };
  
  return actions[stage] || 'Processing...';
}

function getProgressPercentage(stage: EscrowStage): number {
  const percentages = {
    'DEPOSIT': 25,
    'FITTING': 75,
    'FINAL': 95,
    'RELEASED': 100
  };
  
  return percentages[stage] || 0;
}