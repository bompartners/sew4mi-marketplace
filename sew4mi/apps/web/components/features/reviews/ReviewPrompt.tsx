/**
 * ReviewPrompt Component (Story 4.5)
 * Modal prompt for customers to leave reviews after delivery
 */

'use client';

import React from 'react';
import { ReviewForm } from './ReviewForm';
import { CreateReviewInput } from '@sew4mi/shared/types/review';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star } from 'lucide-react';

interface ReviewPromptProps {
  orderId: string;
  orderNumber: string;
  tailorName: string;
  garmentType: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReviewInput) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Review prompt modal
 */
export function ReviewPrompt({
  orderId,
  orderNumber,
  tailorName,
  garmentType,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: ReviewPromptProps) {
  const handleSubmit = async (data: CreateReviewInput) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                How was your experience with {tailorName}?
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Order #{orderNumber} - {garmentType}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <p className="text-gray-600 mb-6">
            Your feedback helps other customers make informed decisions and helps
            tailors improve their service. Please rate your experience in four areas.
          </p>

          <ReviewForm
            orderId={orderId}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

