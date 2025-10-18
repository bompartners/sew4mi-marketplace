'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { 
  OrderCreationStep, 
  CreateOrderInput,
  UrgencyLevel
} from '@sew4mi/shared/types';
import { useOrderCreation } from '@/hooks/useOrderCreation';
import { useAuth } from '@/hooks/useAuth';

// Import step components
import { TailorSelection } from './TailorSelection';
import { GarmentTypeSelection } from './GarmentTypeSelection';
import { GarmentSpecifications } from './GarmentSpecifications';
import { MeasurementSelection } from './MeasurementSelection';
import { TimelineSelection } from './TimelineSelection';
import { OrderSummary } from './OrderSummary';

interface OrderCreationWizardProps {
  initialTailorId?: string;
  onOrderCreated?: (orderId: string, orderNumber: string) => void;
  onCancel?: () => void;
}

const getSteps = (hasTailor: boolean) => {
  const steps = [];
  
  // Add tailor selection as first step if no initial tailor
  if (!hasTailor) {
    steps.push({
      key: 'TAILOR_SELECTION' as OrderCreationStep,
      title: 'Select Tailor',
      description: 'Choose your preferred tailor'
    });
  }
  
  steps.push(
    {
      key: OrderCreationStep.GARMENT_TYPE,
      title: 'Garment Type',
      description: 'Choose what you want made'
    },
    {
      key: OrderCreationStep.SPECIFICATIONS,
      title: 'Specifications',
      description: 'Fabric and special requirements'
    },
    {
      key: OrderCreationStep.MEASUREMENTS,
      title: 'Measurements',
      description: 'Select your measurement profile'
    },
    {
      key: OrderCreationStep.TIMELINE,
      title: 'Timeline',
      description: 'Delivery date and urgency'
    },
    {
      key: OrderCreationStep.SUMMARY,
      title: 'Summary',
      description: 'Review and confirm order'
    }
  );
  
  return steps;
};

export function OrderCreationWizard({ 
  initialTailorId,
  onOrderCreated,
  onCancel 
}: OrderCreationWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    state,
    updateState,
    validateStep,
    calculatePricing,
    createOrder,
    isLoading,
    error
  } = useOrderCreation();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTailor, setSelectedTailor] = useState<any>(undefined);
  
  // Generate steps based on whether we have an initial tailor
  const STEPS = getSteps(!!initialTailorId);
  
  // Sync local step index with hook state
  useEffect(() => {
    const stepIndex = STEPS.findIndex(step => step.key === state.step);
    if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
      setCurrentStepIndex(stepIndex);
    }
  }, [state.step, currentStepIndex, STEPS]);
  
  const currentStep = STEPS[currentStepIndex];

  // Initialize wizard state
  useEffect(() => {
    if (user?.id) {
      const firstStep = initialTailorId ? OrderCreationStep.GARMENT_TYPE : 'TAILOR_SELECTION' as OrderCreationStep;
      updateState({
        customerId: user.id,
        tailorId: initialTailorId,
        step: firstStep,
        isValid: false,
        errors: {}
      });
    }
  }, [user?.id, initialTailorId, updateState]);

  // Auto-save to localStorage with debouncing
  useEffect(() => {
    if (!state.customerId) return;

    const timeoutId = setTimeout(() => {
      try {
        const draftKey = `order_draft_${state.customerId}`;
        const draftData = {
          ...state,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      } catch (error) {
        console.warn('Failed to save draft to localStorage:', error);
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [state.customerId, state.garmentType, state.fabricChoice, state.measurementProfile, 
      state.specialInstructions, state.urgencyLevel, state.estimatedDelivery]);

  const handleNext = async () => {
    // Validate current step
    const stepValidation = validateStep(currentStep.key);
    if (!stepValidation.isValid) {
      updateState({
        errors: stepValidation.errors
      });
      return;
    }

    // Calculate pricing when moving from timeline to summary (after urgency is selected)
    if (currentStep.key === OrderCreationStep.TIMELINE && state.garmentType && state.tailorId && state.fabricChoice && state.urgencyLevel) {
      try {
        const pricing = await calculatePricing({
          garmentTypeId: state.garmentType.id,
          fabricChoice: state.fabricChoice,
          urgencyLevel: state.urgencyLevel,
          tailorId: state.tailorId
        });
        
        updateState({
          pricingBreakdown: pricing,
          errors: {}
        });
      } catch (error) {
        console.error('Pricing calculation failed:', error);
        // Continue anyway - use fallback pricing from hook
        const basePrice = state.garmentType.basePrice;
        const fabricCost = state.fabricChoice === 'TAILOR_SOURCED' ? basePrice * 0.3 : 0;
        const urgencySurcharge = state.urgencyLevel === 'EXPRESS' ? basePrice * 0.25 : 0;
        const totalAmount = basePrice + fabricCost + urgencySurcharge;

        updateState({
          pricingBreakdown: {
            basePrice,
            fabricCost,
            urgencySurcharge,
            totalAmount,
            escrowBreakdown: {
              deposit: totalAmount * 0.25,
              fitting: totalAmount * 0.5,
              final: totalAmount * 0.25
            }
          },
          errors: {}
        });
      }
    }

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      updateState({
        step: STEPS[currentStepIndex + 1].key,
        errors: {}
      });
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      updateState({
        step: STEPS[currentStepIndex - 1].key,
        errors: {}
      });
    }
  };

  const handleCreateOrder = async () => {
    // Validate required fields before attempting to create order
    if (!state.tailorId || !state.measurementProfile || !state.garmentType || 
        !state.fabricChoice || !state.urgencyLevel || !state.estimatedDelivery ||
        !state.pricingBreakdown) {
      console.error('Missing required order data', {
        tailorId: !!state.tailorId,
        measurementProfile: !!state.measurementProfile,
        garmentType: !!state.garmentType,
        fabricChoice: !!state.fabricChoice,
        urgencyLevel: !!state.urgencyLevel,
        estimatedDelivery: !!state.estimatedDelivery,
        pricingBreakdown: !!state.pricingBreakdown
      });
      return;
    }

    try {
      const orderData: CreateOrderInput = {
        customerId: state.customerId,
        tailorId: state.tailorId,
        measurementProfileId: state.measurementProfile.id,
        garmentType: state.garmentType.id,
        fabricChoice: state.fabricChoice,
        specialInstructions: state.specialInstructions || '',
        totalAmount: state.pricingBreakdown.totalAmount,
        estimatedDelivery: state.estimatedDelivery,
        urgencyLevel: state.urgencyLevel
      };

      console.log('Creating order with data:', orderData);
      const result = await createOrder(orderData);
      
      if (result.success && result.orderId) {
        // Clear draft from localStorage
        try {
          const draftKey = `order_draft_${state.customerId}`;
          localStorage.removeItem(draftKey);
        } catch (error) {
          console.warn('Failed to clear draft from localStorage:', error);
        }

        if (onOrderCreated && result.orderNumber) {
          onOrderCreated(result.orderId, result.orderNumber);
        } else {
          // Redirect to orders list page (order details page not yet implemented)
          router.push(`/orders?success=true&orderNumber=${result.orderNumber}`);
        }
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      // Error handling is managed by the useOrderCreation hook
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  const progressPercentage = ((currentStepIndex + 1) / STEPS.length) * 100;
  const canGoNext = validateStep(currentStep.key).isValid && !isLoading;
  const canGoPrevious = currentStepIndex > 0 && !isLoading;

  if (!user?.id) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <p>Please log in to create an order.</p>
          <Button 
            onClick={() => router.push('/login')} 
            className="mt-4"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl">Create Your Order</CardTitle>
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStepIndex + 1} of {STEPS.length}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-lg">{currentStep.title}</h3>
            <p className="text-muted-foreground">{currentStep.description}</p>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep.key === 'TAILOR_SELECTION' && (
            <TailorSelection
              selectedTailor={selectedTailor}
              onSelect={(tailor) => {
                setSelectedTailor(tailor);
                updateState({ tailorId: tailor?.user_id });
              }}
              errors={state.errors}
            />
          )}

          {currentStep.key === OrderCreationStep.GARMENT_TYPE && (
            <GarmentTypeSelection 
              selectedGarmentType={state.garmentType}
              onSelect={(garmentType) => updateState({ garmentType })}
              errors={state.errors}
            />
          )}

          {currentStep.key === OrderCreationStep.SPECIFICATIONS && (
            <GarmentSpecifications
              garmentType={state.garmentType}
              fabricChoice={state.fabricChoice}
              specialInstructions={state.specialInstructions}
              onFabricChoiceChange={(fabricChoice) => updateState({ fabricChoice })}
              onSpecialInstructionsChange={(specialInstructions) => updateState({ specialInstructions })}
              errors={state.errors}
            />
          )}

          {currentStep.key === OrderCreationStep.MEASUREMENTS && (
            <MeasurementSelection
              selectedProfile={state.measurementProfile}
              garmentType={state.garmentType}
              onProfileSelect={(measurementProfile) => updateState({ measurementProfile })}
              errors={state.errors}
            />
          )}

          {currentStep.key === OrderCreationStep.TIMELINE && (
            <TimelineSelection
              urgencyLevel={state.urgencyLevel}
              estimatedDelivery={state.estimatedDelivery}
              garmentType={state.garmentType}
              tailorId={state.tailorId}
              onUrgencyChange={(urgencyLevel) => updateState({ urgencyLevel })}
              onDeliveryDateChange={(estimatedDelivery) => updateState({ estimatedDelivery })}
              errors={state.errors}
            />
          )}

          {currentStep.key === OrderCreationStep.SUMMARY && (
            <OrderSummary
              state={state}
              onCreateOrder={handleCreateOrder}
              isCreating={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep.key !== OrderCreationStep.SUMMARY ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateOrder}
                disabled={!canGoNext}
                className="bg-green-600 hover:bg-green-700"
              >
                Create Order
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}