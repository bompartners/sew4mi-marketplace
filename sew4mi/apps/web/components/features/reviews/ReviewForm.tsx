/**
 * ReviewForm Component (Story 4.5)
 * Form for submitting customer reviews with 4-category ratings
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Star } from 'lucide-react';
import { CreateReviewInput, createReviewSchema } from '@sew4mi/shared/types/review';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ReviewFormProps {
  orderId: string;
  onSubmit: (data: CreateReviewInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}

/**
 * Star rating component for individual rating categories
 */
function StarRating({ label, value, onChange, required }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div
        className="flex gap-1"
        role="radiogroup"
        aria-label={`${label} rating`}
        aria-required={required}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} stars`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hover || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-sm text-gray-600" aria-live="polite">
          {value} out of 5 stars selected
        </p>
      )}
    </div>
  );
}

/**
 * Review form with 4-category ratings
 */
export function ReviewForm({ orderId, onSubmit, onCancel, isSubmitting }: ReviewFormProps) {
  const [ratingFit, setRatingFit] = useState(0);
  const [ratingQuality, setRatingQuality] = useState(0);
  const [ratingCommunication, setRatingCommunication] = useState(0);
  const [ratingTimeliness, setRatingTimeliness] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    mode: 'onChange',
    defaultValues: {
      orderId,
      ratingFit: 0,
      ratingQuality: 0,
      ratingCommunication: 0,
      ratingTimeliness: 0,
      reviewText: '',
      consentToPhotos: false,
    },
  });

  const reviewText = watch('reviewText');
  const consentToPhotos = watch('consentToPhotos');

  // Update form values when star ratings change
  React.useEffect(() => {
    setValue('ratingFit', ratingFit, { shouldValidate: true });
  }, [ratingFit, setValue]);

  React.useEffect(() => {
    setValue('ratingQuality', ratingQuality, { shouldValidate: true });
  }, [ratingQuality, setValue]);

  React.useEffect(() => {
    setValue('ratingCommunication', ratingCommunication, { shouldValidate: true });
  }, [ratingCommunication, setValue]);

  React.useEffect(() => {
    setValue('ratingTimeliness', ratingTimeliness, { shouldValidate: true });
  }, [ratingTimeliness, setValue]);

  const canSubmit =
    ratingFit > 0 &&
    ratingQuality > 0 &&
    ratingCommunication > 0 &&
    ratingTimeliness > 0 &&
    !isSubmitting;

  const handleFormSubmit = async (data: CreateReviewInput) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Rate Your Experience</h3>

        <StarRating
          label="Fit & Measurements"
          value={ratingFit}
          onChange={setRatingFit}
          required
        />

        <StarRating
          label="Quality & Craftsmanship"
          value={ratingQuality}
          onChange={setRatingQuality}
          required
        />

        <StarRating
          label="Communication"
          value={ratingCommunication}
          onChange={setRatingCommunication}
          required
        />

        <StarRating
          label="Timeliness"
          value={ratingTimeliness}
          onChange={setRatingTimeliness}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reviewText">Your Review (Optional)</Label>
        <Textarea
          id="reviewText"
          {...register('reviewText')}
          placeholder="Share your experience with this tailor..."
          rows={4}
          className="resize-none"
          maxLength={2000}
        />
        {errors.reviewText && (
          <p className="text-sm text-red-500">{errors.reviewText.message}</p>
        )}
        {reviewText && (
          <p className="text-xs text-gray-500">
            {reviewText.length}/2000 characters
          </p>
        )}
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="consentToPhotos"
          checked={consentToPhotos}
          onCheckedChange={(checked) =>
            setValue('consentToPhotos', checked as boolean)
          }
        />
        <Label
          htmlFor="consentToPhotos"
          className="text-sm text-gray-600 cursor-pointer"
        >
          I consent to sharing photos of the completed garment with my review
        </Label>
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>

      {!canSubmit && ratingFit === 0 && (
        <p className="text-sm text-gray-500 text-center">
          Please rate all four categories to submit your review
        </p>
      )}
    </form>
  );
}

