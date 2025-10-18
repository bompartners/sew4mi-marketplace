/**
 * TailorResponseForm Component (Story 4.5)
 * Form for tailors to respond to customer reviews
 */

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createResponseSchema } from '@sew4mi/shared/types/review';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle } from 'lucide-react';

interface TailorResponseFormProps {
  reviewId: string;
  onSubmit: (responseText: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

/**
 * Tailor response form
 */
export function TailorResponseForm({
  reviewId,
  onSubmit,
  onCancel,
  isSubmitting,
}: TailorResponseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<{ responseText: string }>({
    resolver: zodResolver(
      createResponseSchema.pick({ responseText: true })
    ),
    mode: 'onChange',
    defaultValues: {
      responseText: '',
    },
  });

  const responseText = watch('responseText');

  const handleFormSubmit = async (data: { responseText: string }) => {
    await onSubmit(data.responseText);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="responseText" className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Respond to this review
        </Label>
        <Textarea
          id="responseText"
          {...register('responseText')}
          placeholder="Thank you for your feedback. We appreciate..."
          rows={4}
          className="resize-none"
          maxLength={1000}
          disabled={isSubmitting}
        />
        {errors.responseText && (
          <p className="text-sm text-red-500">{errors.responseText.message}</p>
        )}
        {responseText && (
          <p className="text-xs text-gray-500">
            {responseText.length}/1000 characters
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? 'Posting...' : 'Post Response'}
        </Button>
      </div>
    </form>
  );
}

