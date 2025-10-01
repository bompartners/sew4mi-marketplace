'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingBag,
  Users,
  Ruler,
  FileText,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { FamilyProfileSelector } from './FamilyProfileSelector';
import { MeasurementVerification } from './MeasurementVerification';
import { useOrderFamilyProfiles } from '@/hooks/useOrderFamilyProfiles';
import { useFamilyProfiles } from '@/hooks/useFamilyProfiles';
import { FamilyMeasurementProfile } from '@sew4mi/shared/types/family-profiles';
import { cn } from '@/lib/utils';

export interface OrderStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  isComplete: boolean;
  isActive: boolean;
}

export interface OrderCreationWithFamilyProfilesProps {
  userId: string;
  garmentType: string;
  garmentDetails: {
    name: string;
    description: string;
    estimatedPrice: number;
    deliveryTime: string;
  };
  onOrderSubmit: (orderData: {
    profile: FamilyMeasurementProfile;
    measurements: Record<string, number>;
    adjustments: any[];
    garmentType: string;
    garmentDetails: any;
  }) => void;
  onCancel?: () => void;
  className?: string;
}

const STEP_DEFINITIONS: OrderStep[] = [
  {
    id: 'profile',
    title: 'Select Profile',
    description: 'Choose family member',
    icon: Users,
    isComplete: false,
    isActive: true
  },
  {
    id: 'measurements',
    title: 'Verify Measurements',
    description: 'Review and adjust',
    icon: Ruler,
    isComplete: false,
    isActive: false
  },
  {
    id: 'details',
    title: 'Order Details',
    description: 'Finalize your order',
    icon: FileText,
    isComplete: false,
    isActive: false
  },
  {
    id: 'confirm',
    title: 'Confirm',
    description: 'Place your order',
    icon: CheckCircle,
    isComplete: false,
    isActive: false
  }
];

export function OrderCreationWithFamilyProfiles({
  userId,
  garmentType,
  garmentDetails,
  onOrderSubmit,
  onCancel,
  className
}: OrderCreationWithFamilyProfilesProps) {
  const [currentStep, setCurrentStep] = useState<string>('profile');
  const [steps, setSteps] = useState<OrderStep[]>(STEP_DEFINITIONS);

  // Family profiles management
  const {
    profiles,
    selectedProfile,
    measurementData,
    isLoading,
    error,
    selectProfile,
    confirmMeasurements,
    canProceedWithOrder,
    getOrderReadyData,
    getMissingMeasurements,
    isProfileComplete,
    isMeasurementsOutdated
  } = useOrderFamilyProfiles({
    userId,
    garmentType,
    enabled: true
  });

  const { createProfile, updateProfile } = useFamilyProfiles({ userId });

  // Update step status
  const updateStepStatus = (stepId: string, isComplete: boolean, isActive: boolean) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, isComplete, isActive }
        : step.id === currentStep
        ? { ...step, isActive: false }
        : step
    ));
  };

  // Navigate to step
  const goToStep = (stepId: string) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    
    // Validate progression
    if (stepIndex > currentIndex + 1) return;
    
    setCurrentStep(stepId);
    updateStepStatus(stepId, false, true);
  };

  // Handle next step
  const handleNext = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      updateStepStatus(currentStep, true, false);
      goToStep(nextStep.id);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      updateStepStatus(currentStep, false, false);
      goToStep(prevStep.id);
    }
  };

  // Handle profile selection
  const handleProfileSelect = (profile: FamilyMeasurementProfile) => {
    selectProfile(profile);
    
    // Auto-advance if profile is complete and measurements are current
    if (isProfileComplete(profile) && !isMeasurementsOutdated(profile)) {
      setTimeout(() => handleNext(), 500);
    }
  };

  // Handle creating new profile
  const handleCreateNewProfile = () => {
    // TODO: Open create profile modal
    console.log('Create new profile');
  };

  // Handle editing profile
  const handleEditProfile = (profileId: string) => {
    // TODO: Open edit profile modal
    console.log('Edit profile:', profileId);
  };

  // Handle updating measurements
  const handleUpdateMeasurements = (profileId: string) => {
    // TODO: Open measurement update modal
    console.log('Update measurements:', profileId);
  };

  // Handle measurements confirmation
  const handleMeasurementsConfirmed = (measurements: Record<string, number>, adjustments: any[]) => {
    confirmMeasurements(measurements, adjustments);
    handleNext();
  };

  // Handle order submission
  const handleSubmitOrder = () => {
    const orderData = getOrderReadyData();
    if (orderData) {
      onOrderSubmit({
        ...orderData,
        garmentType,
        garmentDetails
      });
    }
  };

  // Calculate progress
  const completedSteps = steps.filter(step => step.isComplete).length;
  const progress = (completedSteps / steps.length) * 100;

  // Current step validation
  const canProceedFromCurrentStep = () => {
    switch (currentStep) {
      case 'profile':
        return selectedProfile !== null;
      case 'measurements':
        return measurementData !== null;
      case 'details':
        return true; // Always can proceed from details
      case 'confirm':
        return canProceedWithOrder();
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error loading profiles: {error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)} role="main">
      {/* Header */}
      <div className="text-center">
        <h1 id="order-creation-title" className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <ShoppingBag className="h-6 w-6" aria-hidden="true" />
          Order {garmentDetails.name}
        </h1>
        <p className="text-gray-600 mt-1" id="order-creation-subtitle">{garmentDetails.description}</p>
      </div>

      {/* Progress */}
      <Card role="region" aria-labelledby="progress-heading">
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span id="progress-heading" className="text-sm font-medium text-gray-700">Order Progress</span>
              <span className="text-sm text-gray-600" aria-live="polite">{completedSteps}/{steps.length} steps</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2" 
              aria-label={`Order completion progress: ${Math.round(progress)}%`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Navigation */}
      <nav role="tablist" aria-labelledby="order-steps-heading" className="flex items-center justify-between">
        <h2 id="order-steps-heading" className="sr-only">Order Creation Steps</h2>
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isLast = index === steps.length - 1;
          const canNavigateToStep = index <= completedSteps || index === completedSteps + 1;
          
          return (
            <React.Fragment key={step.id}>
              <button
                className={cn(
                  "flex flex-col items-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-2",
                  step.isActive && "text-primary",
                  step.isComplete && "text-green-600",
                  !step.isActive && !step.isComplete && "text-gray-400",
                  canNavigateToStep ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
                onClick={() => canNavigateToStep && goToStep(step.id)}
                disabled={!canNavigateToStep}
                role="tab"
                aria-selected={step.isActive}
                aria-controls={`step-panel-${step.id}`}
                id={`step-tab-${step.id}`}
                aria-describedby={`step-desc-${step.id}`}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2",
                  step.isActive && "border-primary bg-primary text-white",
                  step.isComplete && "border-green-600 bg-green-600 text-white",
                  !step.isActive && !step.isComplete && "border-gray-300"
                )}>
                  {step.isComplete ? (
                    <CheckCircle className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <IconComponent className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div id={`step-desc-${step.id}`} className="text-xs text-gray-500">{step.description}</div>
                </div>
              </button>
              
              {!isLast && (
                <div 
                  className={cn(
                    "flex-1 h-px mx-4 mt-5",
                    index < completedSteps ? "bg-green-600" : "bg-gray-300"
                  )}
                  role="separator"
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Step Content */}
      <div className="min-h-96">
        {currentStep === 'profile' && (
          <div
            role="tabpanel"
            id="step-panel-profile"
            aria-labelledby="step-tab-profile"
            tabIndex={0}
          >
            <FamilyProfileSelector
              profiles={profiles}
              selectedProfileId={selectedProfile?.id}
              onSelectProfile={handleProfileSelect}
              onCreateNewProfile={handleCreateNewProfile}
              onEditProfile={handleEditProfile}
              onCopyMeasurements={(profile) => console.log('Copy measurements:', profile)}
              showQuickActions={true}
            />
          </div>
        )}

        {currentStep === 'measurements' && selectedProfile && (
          <div
            role="tabpanel"
            id="step-panel-measurements"
            aria-labelledby="step-tab-measurements"
            tabIndex={0}
          >
            <MeasurementVerification
              selectedProfile={selectedProfile}
              garmentType={garmentType}
              requiredMeasurements={['chest', 'waist', 'hips', 'shoulderWidth', 'armLength']}
              onMeasurementsConfirmed={handleMeasurementsConfirmed}
              onEditProfile={handleEditProfile}
              onUpdateMeasurements={handleUpdateMeasurements}
              allowAdjustments={true}
            />
          </div>
        )}

        {currentStep === 'details' && (
          <div
            role="tabpanel"
            id="step-panel-details"
            aria-labelledby="step-tab-details"
            tabIndex={0}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                  Order Details
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Garment Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{garmentDetails.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Price:</span>
                      <span className="font-medium">₵{garmentDetails.estimatedPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery:</span>
                      <span className="font-medium">{garmentDetails.deliveryTime}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Measurements Summary</h4>
                  {measurementData && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profile:</span>
                        <span className="font-medium">{measurementData.profileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Adjustments:</span>
                        <span className="font-medium">
                          {measurementData.adjustments.length} applied
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Verified:</span>
                        <span className="font-medium">
                          {measurementData.verifiedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {currentStep === 'confirm' && (
          <div
            role="tabpanel"
            id="step-panel-confirm"
            aria-labelledby="step-tab-confirm"
            tabIndex={0}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Ready to Place Order
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Your Order is Ready!
                </h3>
                <p className="text-gray-600 mb-6">
                  Review the details above and click confirm to place your order.
                </p>
                
                <div className="max-w-md mx-auto space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>Total Estimated Cost:</span>
                    <span className="font-bold text-lg">₵{garmentDetails.estimatedPrice}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <span>Estimated Delivery:</span>
                    <span className="font-medium">{garmentDetails.deliveryTime}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex items-center justify-between pt-6 border-t" role="navigation" aria-label="Order creation navigation">
        <div>
          {currentStep !== 'profile' && (
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              aria-label="Go to previous step"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} aria-label="Cancel order creation">
              Cancel Order
            </Button>
          )}
          
          {currentStep === 'confirm' ? (
            <Button 
              onClick={handleSubmitOrder}
              disabled={!canProceedWithOrder()}
              size="lg"
              aria-describedby="confirm-order-help"
            >
              Confirm & Place Order
              <span id="confirm-order-help" className="sr-only">
                This will submit your order for processing
              </span>
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={!canProceedFromCurrentStep()}
              aria-label="Continue to next step"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}