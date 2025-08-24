'use client';

// Dispute Resolution Form Component
// Story 2.4: Admin interface for resolving disputes

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DisputeResolutionType, 
  ResolveDisputeRequest,
  Dispute,
  DISPUTE_CONSTANTS,
  getDisputeResolutionConfig
} from '@sew4mi/shared';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  RefreshCw,
  DollarSign
} from 'lucide-react';

interface DisputeResolutionFormProps {
  dispute: Dispute & {
    orders: {
      total_amount: number;
      customers: { full_name: string; email: string };
      tailors: { business_name: string; email: string };
    };
  };
  onResolve: (resolution: ResolveDisputeRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface ResolutionFormData {
  resolutionType: DisputeResolutionType | '';
  outcome: string;
  refundAmount?: number;
  reasonCode: string;
  adminNotes: string;
}

interface FormErrors {
  resolutionType?: string;
  outcome?: string;
  refundAmount?: string;
  reasonCode?: string;
  adminNotes?: string;
  general?: string;
}

const REASON_CODES = [
  { value: 'ADMIN_DECISION', label: 'Admin Decision' },
  { value: 'CUSTOMER_SATISFACTION', label: 'Customer Satisfaction' },
  { value: 'QUALITY_ISSUE_CONFIRMED', label: 'Quality Issue Confirmed' },
  { value: 'DELIVERY_DELAY_CONFIRMED', label: 'Delivery Delay Confirmed' },
  { value: 'PAYMENT_ERROR', label: 'Payment Error' },
  { value: 'MISCOMMUNICATION', label: 'Miscommunication' },
  { value: 'POLICY_VIOLATION', label: 'Policy Violation' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical Issue' },
  { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
  { value: 'BUSINESS_DECISION', label: 'Business Decision' }
];

export function DisputeResolutionForm({
  dispute,
  onResolve,
  onCancel,
  isLoading = false
}: DisputeResolutionFormProps) {
  const [formData, setFormData] = useState<ResolutionFormData>({
    resolutionType: '',
    outcome: '',
    reasonCode: 'ADMIN_DECISION',
    adminNotes: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof ResolutionFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Clear refund amount if not needed
    if (field === 'resolutionType' && value !== DisputeResolutionType.FULL_REFUND && value !== DisputeResolutionType.PARTIAL_REFUND) {
      setFormData(prev => ({ ...prev, refundAmount: undefined }));
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.resolutionType) {
      newErrors.resolutionType = 'Please select a resolution type';
    }

    if (!formData.outcome.trim()) {
      newErrors.outcome = 'Please provide an outcome description';
    } else if (formData.outcome.trim().length < 10) {
      newErrors.outcome = 'Outcome description must be at least 10 characters';
    }

    if (!formData.reasonCode) {
      newErrors.reasonCode = 'Please select a reason code';
    }

    // Validate refund amount for refund resolutions
    if (formData.resolutionType === DisputeResolutionType.FULL_REFUND || 
        formData.resolutionType === DisputeResolutionType.PARTIAL_REFUND) {
      if (!formData.refundAmount || formData.refundAmount <= 0) {
        newErrors.refundAmount = 'Refund amount is required for refund resolutions';
      } else if (formData.refundAmount > dispute.orders.total_amount) {
        newErrors.refundAmount = 'Refund amount cannot exceed order total';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, dispute.orders.total_amount]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const resolutionData: ResolveDisputeRequest = {
        disputeId: dispute.id,
        resolutionType: formData.resolutionType as DisputeResolutionType,
        outcome: formData.outcome.trim(),
        reasonCode: formData.reasonCode,
        adminNotes: formData.adminNotes.trim(),
        ...(formData.refundAmount && { refundAmount: formData.refundAmount })
      };

      await onResolve(resolutionData);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to resolve dispute'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onResolve, dispute.id]);

  // Get resolution config for selected type
  const selectedResolutionConfig = formData.resolutionType 
    ? getDisputeResolutionConfig(formData.resolutionType as DisputeResolutionType)
    : null;

  const requiresRefund = formData.resolutionType === DisputeResolutionType.FULL_REFUND || 
                        formData.resolutionType === DisputeResolutionType.PARTIAL_REFUND;

  return (
    <Card className="w-full max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Resolve Dispute</h2>
          <p className="text-sm text-gray-600 mt-1">
            Provide a resolution for dispute #{dispute.id.split('-')[0]}
          </p>
        </div>

        {/* Dispute Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Dispute Summary</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Title:</span> {dispute.title}
            </div>
            <div>
              <span className="text-gray-600">Category:</span> {dispute.category}
            </div>
            <div>
              <span className="text-gray-600">Customer:</span> {dispute.orders.customers.full_name}
            </div>
            <div>
              <span className="text-gray-600">Tailor:</span> {dispute.orders.tailors.business_name}
            </div>
            <div>
              <span className="text-gray-600">Order Amount:</span> GH₵ {dispute.orders.total_amount.toFixed(2)}
            </div>
            <div>
              <span className="text-gray-600">Priority:</span> 
              <Badge variant="outline" className="ml-1">{dispute.priority}</Badge>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Description:</span> {dispute.description}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Resolution Type */}
          <div className="space-y-2">
            <Label htmlFor="resolutionType">Resolution Type *</Label>
            <Select 
              onValueChange={(value) => handleFieldChange('resolutionType', value)}
              value={formData.resolutionType}
            >
              <SelectTrigger className={errors.resolutionType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select resolution type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DISPUTE_CONSTANTS.RESOLUTION_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center space-x-2">
                      <span>{config.icon}</span>
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.resolutionType && (
              <p className="text-sm text-red-600">{errors.resolutionType}</p>
            )}
          </div>

          {/* Resolution Info */}
          {selectedResolutionConfig && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>{selectedResolutionConfig.label}:</strong> {selectedResolutionConfig.description}</p>
                  {selectedResolutionConfig.requiresRefundAmount && (
                    <p className="text-sm">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      This resolution requires specifying a refund amount.
                    </p>
                  )}
                  {selectedResolutionConfig.impactsOrder && (
                    <p className="text-sm">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      This resolution will affect the order status and payments.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Refund Amount (if applicable) */}
          {requiresRefund && (
            <div className="space-y-2">
              <Label htmlFor="refundAmount">
                Refund Amount (GH₵) *
                {formData.resolutionType === DisputeResolutionType.FULL_REFUND && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Full order amount: GH₵ {dispute.orders.total_amount.toFixed(2)})
                  </span>
                )}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="refundAmount"
                  type="number"
                  min="0"
                  max={dispute.orders.total_amount}
                  step="0.01"
                  value={formData.refundAmount || ''}
                  onChange={(e) => handleFieldChange('refundAmount', parseFloat(e.target.value) || 0)}
                  placeholder="Enter refund amount"
                  className={`pl-10 ${errors.refundAmount ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.refundAmount && (
                <p className="text-sm text-red-600">{errors.refundAmount}</p>
              )}
              {formData.resolutionType === DisputeResolutionType.FULL_REFUND && (
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleFieldChange('refundAmount', dispute.orders.total_amount)}
                  >
                    Set Full Amount
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Outcome Description */}
          <div className="space-y-2">
            <Label htmlFor="outcome">Resolution Outcome *</Label>
            <Textarea
              id="outcome"
              value={formData.outcome}
              onChange={(e) => handleFieldChange('outcome', e.target.value)}
              placeholder="Describe the resolution decision and what actions will be taken"
              rows={4}
              maxLength={1000}
              className={errors.outcome ? 'border-red-500' : ''}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{errors.outcome && <span className="text-red-600">{errors.outcome}</span>}</span>
              <span>{formData.outcome.length}/1000</span>
            </div>
          </div>

          {/* Reason Code */}
          <div className="space-y-2">
            <Label htmlFor="reasonCode">Reason Code *</Label>
            <Select 
              onValueChange={(value) => handleFieldChange('reasonCode', value)}
              value={formData.reasonCode}
            >
              <SelectTrigger className={errors.reasonCode ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select reason code" />
              </SelectTrigger>
              <SelectContent>
                {REASON_CODES.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reasonCode && (
              <p className="text-sm text-red-600">{errors.reasonCode}</p>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Internal Admin Notes</Label>
            <Textarea
              id="adminNotes"
              value={formData.adminNotes}
              onChange={(e) => handleFieldChange('adminNotes', e.target.value)}
              placeholder="Add internal notes about this resolution (not visible to customers/tailors)"
              rows={3}
              maxLength={2000}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>These notes are for internal use only</span>
              <span>{formData.adminNotes.length}/2000</span>
            </div>
          </div>

          <Separator />

          {/* Resolution Preview */}
          {formData.resolutionType && formData.outcome && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Resolution Preview</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Resolution:</strong> {selectedResolutionConfig?.label}</p>
                <p><strong>Outcome:</strong> {formData.outcome}</p>
                {formData.refundAmount && (
                  <p><strong>Refund Amount:</strong> GH₵ {formData.refundAmount.toFixed(2)}</p>
                )}
                <p><strong>Reason:</strong> {REASON_CODES.find(r => r.value === formData.reasonCode)?.label}</p>
              </div>
            </div>
          )}

          {/* Important Notice */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Important:</p>
              <ul className="text-sm space-y-1">
                <li>• This action cannot be undone once submitted</li>
                <li>• Both customer and tailor will be notified of this resolution</li>
                <li>• Refunds will be processed automatically if applicable</li>
                <li>• Order status will be updated based on the resolution type</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve Dispute
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

export default DisputeResolutionForm;