/**
 * TailorMilestoneSubmission component - Interface for tailors to submit milestone progress
 * @file TailorMilestoneSubmission.tsx
 */

"use client"

import React, { useState } from 'react';
import { Camera, Upload, Clock, CheckCircle, AlertCircle, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MilestoneType } from '@sew4mi/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotoUpload } from './PhotoUpload';

interface TailorMilestoneSubmissionProps {
  orderId: string;
  currentMilestone: MilestoneType;
  isSubmitted?: boolean;
  submittedAt?: Date;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  onSubmit: (data: {
    photos: File[];
    notes: string;
    milestone: MilestoneType;
  }) => Promise<void>;
  className?: string;
}

/**
 * Milestone submission configuration
 */
const SUBMISSION_CONFIG: Record<MilestoneType, {
  title: string;
  description: string;
  instructions: string[];
  photoRequirements: string[];
  requiredPhotos: number;
  color: string;
}> = {
  FABRIC_SELECTED: {
    title: 'Fabric Selection Complete',
    description: 'Confirm fabric choice with customer',
    instructions: [
      'Show fabric to customer for final approval',
      'Ensure fabric quality meets expectations',
      'Confirm measurements and cutting plan'
    ],
    photoRequirements: [],
    requiredPhotos: 0,
    color: 'blue'
  },
  CUTTING_STARTED: {
    title: 'Fabric Cutting in Progress',
    description: 'Document the fabric cutting process',
    instructions: [
      'Take clear photos of the cutting process',
      'Show fabric laid out with pattern pieces',
      'Ensure all pieces are cut accurately'
    ],
    photoRequirements: [
      'Clear photo of fabric layout with patterns',
      'Cut pieces arranged and labeled',
      'Any special cutting techniques used'
    ],
    requiredPhotos: 2,
    color: 'orange'
  },
  INITIAL_ASSEMBLY: {
    title: 'Initial Assembly Complete',
    description: 'Basic garment construction finished',
    instructions: [
      'Document the basic garment assembly',
      'Show major seams and construction',
      'Prepare for initial fitting if needed'
    ],
    photoRequirements: [
      'Front view of assembled garment',
      'Back view showing construction',
      'Detail shots of key seams or features'
    ],
    requiredPhotos: 3,
    color: 'yellow'
  },
  FITTING_READY: {
    title: 'Ready for Customer Fitting',
    description: 'Garment ready for customer try-on',
    instructions: [
      'Complete garment for fitting session',
      'Document current state before adjustments',
      'Prepare notes for potential modifications'
    ],
    photoRequirements: [
      'Full front view on hanger or form',
      'Full back view showing fit',
      'Detail shots of fitting areas (shoulders, waist, etc.)'
    ],
    requiredPhotos: 3,
    color: 'purple'
  },
  ADJUSTMENTS_COMPLETE: {
    title: 'Fitting Adjustments Done',
    description: 'All customer fitting adjustments completed',
    instructions: [
      'Document all requested adjustments',
      'Show before/after comparison if possible',
      'Confirm fit meets customer requirements'
    ],
    photoRequirements: [
      'Updated front view after adjustments',
      'Updated back view after adjustments',
      'Close-up of specific adjustment areas'
    ],
    requiredPhotos: 3,
    color: 'indigo'
  },
  FINAL_PRESSING: {
    title: 'Final Pressing & Finishing',
    description: 'Final touches and pressing complete',
    instructions: [
      'Complete all final pressing and steaming',
      'Add any finishing touches (buttons, trim)',
      'Prepare garment for final inspection'
    ],
    photoRequirements: [
      'Professional front view of finished garment',
      'Professional back view of finished garment',
      'Detail shots of finishing work'
    ],
    requiredPhotos: 3,
    color: 'pink'
  },
  READY_FOR_DELIVERY: {
    title: 'Ready for Customer Delivery',
    description: 'Garment completed and ready for pickup',
    instructions: [
      'Final quality inspection completed',
      'Garment properly packaged or hung',
      'Ready for customer pickup or delivery'
    ],
    photoRequirements: [
      'Final professional front view',
      'Final professional back view',
      'Garment properly packaged/presented'
    ],
    requiredPhotos: 3,
    color: 'green'
  }
};

/**
 * Main TailorMilestoneSubmission component
 */
export function TailorMilestoneSubmission({
  orderId,
  currentMilestone,
  isSubmitted = false,
  submittedAt,
  approvalStatus,
  rejectionReason,
  onSubmit,
  className
}: TailorMilestoneSubmissionProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const config = SUBMISSION_CONFIG[currentMilestone];
  const hasBeenRejected = approvalStatus === 'REJECTED';
  const isPending = approvalStatus === 'PENDING';
  const isApproved = approvalStatus === 'APPROVED';

  // Validate submission
  const validateSubmission = (): string[] => {
    const newErrors: string[] = [];

    if (config.requiredPhotos > 0 && photos.length < config.requiredPhotos) {
      newErrors.push(`Please upload at least ${config.requiredPhotos} photos`);
    }

    if (config.requiredPhotos > 0 && photos.length > config.requiredPhotos + 2) {
      newErrors.push(`Please upload no more than ${config.requiredPhotos + 2} photos`);
    }

    if (!notes.trim()) {
      newErrors.push('Please add notes describing your progress');
    }

    if (notes.trim().length < 10) {
      newErrors.push('Please provide more detailed notes (at least 10 characters)');
    }

    return newErrors;
  };

  // Handle submission
  const handleSubmit = async () => {
    const validationErrors = validateSubmission();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        photos,
        notes: notes.trim(),
        milestone: currentMilestone
      });
      
      // Reset form on success
      setPhotos([]);
      setNotes('');
      setErrors([]);
    } catch (error) {
      setErrors(['Failed to submit milestone. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress for this milestone
  const progressPercentage = isApproved ? 100 : isPending ? 75 : isSubmitted ? 50 : 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full text-white",
              `bg-${config.color}-500`
            )}>
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{config.title}</h2>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isApproved && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
            {isPending && (
              <Badge variant="secondary" className="bg-yellow-500">
                <Clock className="h-3 w-3 mr-1" />
                Pending Review
              </Badge>
            )}
            {hasBeenRejected && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Rejected
              </Badge>
            )}
          </div>
        </CardTitle>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Milestone Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Instructions</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {config.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>

          {config.photoRequirements.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Photo Requirements</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {config.photoRequirements.map((requirement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <FileImage className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Rejection feedback */}
        {hasBeenRejected && rejectionReason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Customer Feedback:</strong> {rejectionReason}
              <br />
              <span className="text-sm">Please address the feedback and resubmit.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Submission status */}
        {isSubmitted && submittedAt && !hasBeenRejected && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Milestone submitted on {new Date(submittedAt).toLocaleString()}.
              {isPending && ' Waiting for customer approval.'}
              {isApproved && ' Approved by customer!'}
            </AlertDescription>
          </Alert>
        )}

        {/* Submission form */}
        {(!isSubmitted || hasBeenRejected) && (
          <div className="space-y-4">
            {/* Photo upload */}
            {config.requiredPhotos > 0 && (
              <div className="space-y-2">
                <Label>
                  Photos ({config.requiredPhotos} required)
                  <span className="text-red-500">*</span>
                </Label>
                <PhotoUpload
                  onPhotosSelected={setPhotos}
                  maxPhotos={config.requiredPhotos + 2}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  maxFileSize={5 * 1024 * 1024} // 5MB
                />
                <p className="text-xs text-muted-foreground">
                  Upload {config.requiredPhotos} to {config.requiredPhotos + 2} photos. 
                  Max 5MB per photo. JPEG, PNG, or WebP format.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                Progress Notes
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Describe your progress, any challenges, and next steps..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Provide detailed notes about your progress and any relevant information for the customer.
              </p>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  {hasBeenRejected ? 'Resubmitting...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  {hasBeenRejected ? 'Resubmit Milestone' : 'Submit Milestone'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Auto-approval notice */}
        {isPending && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2 text-blue-800">
              <Clock className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Awaiting Customer Approval</p>
                <p className="text-blue-700">
                  Your milestone will be automatically approved if the customer doesn't respond within 48 hours.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TailorMilestoneSubmission;