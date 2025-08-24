'use client';

// Dispute Creation Form Component
// Story 2.4: Comprehensive dispute creation interface

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DisputeEvidenceUpload } from './DisputeEvidenceUpload';
import { 
  DisputeCategory, 
  CreateDisputeRequest,
  DISPUTE_CONSTANTS,
  DISPUTE_CATEGORY_CONFIG,
  validateDisputeTitle,
  validateDisputeDescription 
} from '@sew4mi/shared';
import { AlertCircle, Info } from 'lucide-react';

interface DisputeCreationFormProps {
  orderId: string;
  milestoneId?: string;
  onSubmit: (data: CreateDisputeRequest, evidenceFiles: File[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  orderDetails?: {
    customerName: string;
    tailorName: string;
    orderAmount: number;
    status: string;
  };
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  evidence?: string[];
  general?: string;
}

export function DisputeCreationForm({
  orderId,
  milestoneId,
  onSubmit,
  onCancel,
  isLoading = false,
  orderDetails
}: DisputeCreationFormProps) {
  const [formData, setFormData] = useState<Partial<CreateDisputeRequest>>({
    orderId,
    milestoneId,
    category: undefined,
    title: '',
    description: ''
  });

  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof CreateDisputeRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Handle category selection
  const handleCategoryChange = useCallback((category: DisputeCategory) => {
    setFormData(prev => ({ ...prev, category }));
    setErrors(prev => ({ ...prev, category: undefined }));
  }, []);

  // Evidence file change handler - commented out but may be needed for advanced file validation
  // const handleEvidenceChange = useCallback((files: File[]) => {
  //   setEvidenceFiles(files);
  //   setErrors(prev => ({ ...prev, evidence: undefined }));
  // }, []);

  // Validate form data
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate title
    const titleError = validateDisputeTitle(formData.title || '');
    if (titleError) {
      newErrors.title = titleError;
    }

    // Validate description
    const descriptionError = validateDisputeDescription(formData.description || '');
    if (descriptionError) {
      newErrors.description = descriptionError;
    }

    // Validate category
    if (!formData.category) {
      newErrors.category = 'Please select a dispute category';
    }

    // Validate evidence files
    const evidenceErrors: string[] = [];
    if (evidenceFiles.length > DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILES_PER_DISPUTE) {
      evidenceErrors.push(`Maximum ${DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILES_PER_DISPUTE} evidence files allowed`);
    }

    evidenceFiles.forEach((file, index) => {
      if (file.size > DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILE_SIZE) {
        evidenceErrors.push(`File ${index + 1} is too large (max 10MB)`);
      }
      if (!DISPUTE_CONSTANTS.FILE_LIMITS.SUPPORTED_FILE_TYPES.includes(file.type as any)) {
        evidenceErrors.push(`File ${index + 1} type not supported`);
      }
    });

    if (evidenceErrors.length > 0) {
      newErrors.evidence = evidenceErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, evidenceFiles]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const disputeData: CreateDisputeRequest = {
        orderId: formData.orderId!,
        milestoneId: formData.milestoneId,
        category: formData.category!,
        title: formData.title!.trim(),
        description: formData.description!.trim()
      };

      await onSubmit(disputeData, evidenceFiles);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create dispute. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, evidenceFiles, validateForm, onSubmit]);

  // Get category configuration
  const selectedCategoryConfig = formData.category ? DISPUTE_CATEGORY_CONFIG[formData.category] : null;

  return (
    <Card className="w-full max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create Dispute</h2>
          <p className="text-sm text-gray-600 mt-1">
            Report an issue with your order for fair resolution
          </p>
        </div>

        {/* Order Details (if provided) */}
        {orderDetails && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Order Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Customer:</span> {orderDetails.customerName}
              </div>
              <div>
                <span className="text-gray-600">Tailor:</span> {orderDetails.tailorName}
              </div>
              <div>
                <span className="text-gray-600">Amount:</span> GH₵ {orderDetails.orderAmount}
              </div>
              <div>
                <span className="text-gray-600">Status:</span> 
                <Badge variant="outline" className="ml-1">{orderDetails.status}</Badge>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Dispute Category *</Label>
            <Select onValueChange={handleCategoryChange} value={formData.category}>
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select the type of issue" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DISPUTE_CATEGORY_CONFIG).map(([key, config]) => (
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
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Category Info */}
          {selectedCategoryConfig && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>{selectedCategoryConfig.label}:</strong> {selectedCategoryConfig.description}</p>
                  {selectedCategoryConfig.commonReasons.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Common reasons:</p>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {selectedCategoryConfig.commonReasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Dispute Title *</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Brief summary of the issue"
              maxLength={DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH}
              className={errors.title ? 'border-red-500' : ''}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{errors.title && <span className="text-red-600">{errors.title}</span>}</span>
              <span>{(formData.title || '').length}/{DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Provide a detailed explanation of the issue, including what went wrong and what you expected"
              maxLength={DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH}
              rows={5}
              className={errors.description ? 'border-red-500' : ''}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{errors.description && <span className="text-red-600">{errors.description}</span>}</span>
              <span>{(formData.description || '').length}/{DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH}</span>
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label>Supporting Evidence</Label>
            <p className="text-sm text-gray-600">
              Upload photos, documents, or messages that support your dispute (optional)
            </p>
            <DisputeEvidenceUpload
              disputeId={undefined} // Will be set after dispute creation
              onUploadComplete={(_urls) => {/* Evidence uploaded successfully */}}
              onUploadError={(error) => console.error('Upload error:', error)}
              maxFiles={DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILES_PER_DISPUTE}
              maxFileSize={DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILE_SIZE}
            />
            {errors.evidence && (
              <div className="space-y-1">
                {errors.evidence.map((error, index) => (
                  <p key={index} className="text-sm text-red-600">{error}</p>
                ))}
              </div>
            )}
          </div>

          {/* Notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="text-sm space-y-1">
                <li>• Your dispute will be reviewed by our admin team</li>
                <li>• You'll receive a response within 48 hours (or faster for urgent issues)</li>
                <li>• You can communicate with the tailor and admin through messaging</li>
                <li>• We'll work toward a fair resolution for all parties</li>
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
              {isSubmitting ? 'Creating Dispute...' : 'Create Dispute'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

export default DisputeCreationForm;