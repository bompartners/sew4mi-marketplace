'use client';

import { useState } from 'react';
import { EscrowStage } from '@sew4mi/shared';
import { Button } from '@sew4mi/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@sew4mi/ui';
import { CheckCircle, AlertCircle, Loader2, DollarSign } from 'lucide-react';

interface PaymentMilestoneProps {
  orderId: string;
  currentStage: EscrowStage;
  availableActions: string[];
  nextStageAmount?: number;
  onMilestoneApproved?: () => void;
  className?: string;
}

interface MilestoneApprovalResponse {
  success: boolean;
  data?: {
    orderId: string;
    stage: EscrowStage;
    amountReleased: number;
    newStage: EscrowStage;
    transactionId?: string;
  };
  error?: string;
}

export function PaymentMilestone({ 
  orderId, 
  currentStage, 
  availableActions, 
  nextStageAmount,
  onMilestoneApproved,
  className 
}: PaymentMilestoneProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApproveAction = async (action: string) => {
    const stage = action === 'APPROVE_FITTING' ? 'FITTING' : 'FINAL';
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/orders/${orderId}/milestone/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage,
          notes: getApprovalNote(action)
        }),
      });

      const data: MilestoneApprovalResponse = await response.json();

      if (data.success) {
        setSuccess(
          `${stage === 'FITTING' ? 'Fitting' : 'Final delivery'} approved! ` +
          `GH₵ ${data.data!.amountReleased.toFixed(2)} released to tailor.`
        );
        onMilestoneApproved?.();
      } else {
        setError(data.error || 'Failed to approve milestone');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error approving milestone:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = (action: string) => {
    const configs = {
      'APPROVE_FITTING': {
        title: 'Approve Fitting',
        description: 'Confirm that the fitting photos meet your expectations',
        buttonText: 'Approve Fitting',
        amount: nextStageAmount || 0,
        color: 'blue'
      },
      'APPROVE_FINAL': {
        title: 'Confirm Delivery',
        description: 'Confirm that you have received the completed garment',
        buttonText: 'Confirm Delivery',
        amount: nextStageAmount || 0,
        color: 'green'
      }
    };
    
    return configs[action as keyof typeof configs];
  };

  const getApprovalNote = (action: string): string => {
    const notes = {
      'APPROVE_FITTING': 'Customer approved fitting photos',
      'APPROVE_FINAL': 'Customer confirmed delivery of completed garment'
    };
    
    return notes[action as keyof typeof notes] || 'Milestone approved';
  };

  if (availableActions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <p>No actions available at this stage.</p>
            <p className="text-sm mt-1">
              {getCurrentStageMessage(currentStage)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Payment Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">Success!</p>
              </div>
              <p className="text-green-700 text-sm mt-1">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Error</p>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Available Actions */}
          {!success && availableActions.map((action) => {
            const config = getActionConfig(action);
            if (!config) return null;

            return (
              <div key={action} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{config.title}</h4>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </div>
                  {config.amount > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Amount to Release</p>
                      <p className="font-semibold text-lg">GH₵ {config.amount.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleApproveAction(action)}
                  disabled={loading}
                  className={`w-full ${
                    config.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                    config.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                    ''
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    config.buttonText
                  )}
                </Button>

                {/* Warning for Final Payment */}
                {action === 'APPROVE_FINAL' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 text-sm">
                      <strong>Important:</strong> Only confirm delivery after you have 
                      physically received and inspected your completed garment. 
                      This action will release the final payment to the tailor.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">How Payment Milestones Work</h5>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Funds are held securely until each milestone is completed</li>
              <li>• Fitting approval releases 50% of payment to your tailor</li>
              <li>• Final confirmation releases the remaining 25%</li>
              <li>• Your money is protected throughout the entire process</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getCurrentStageMessage(stage: EscrowStage): string {
  const messages = {
    'DEPOSIT': 'Waiting for deposit payment to be completed.',
    'FITTING': 'Tailor is working on your garment. You will be notified when fitting photos are ready.',
    'FINAL': 'Waiting for delivery to be arranged.',
    'RELEASED': 'All payments have been completed.'
  };
  
  return messages[stage] || 'Processing...';
}