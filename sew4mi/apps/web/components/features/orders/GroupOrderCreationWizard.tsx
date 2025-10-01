'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Users, Sparkles } from 'lucide-react';
import { 
  EventType,
  PaymentMode,
  DeliveryStrategy,
  CreateGroupOrderRequest,
} from '@sew4mi/shared/types/group-order';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

// Import step components
import { FamilyGarmentSelector } from './FamilyGarmentSelector';
import { FabricCoordinator } from './FabricCoordinator';
import { GroupOrderSummary } from './GroupOrderSummary';

interface GroupOrderCreationWizardProps {
  initialTailorId?: string;
  onOrderCreated?: (groupOrderId: string, groupOrderNumber: string) => void;
  onCancel?: () => void;
}

enum GroupOrderStep {
  EVENT_DETAILS = 'EVENT_DETAILS',
  FAMILY_SELECTION = 'FAMILY_SELECTION',
  FABRIC_COORDINATION = 'FABRIC_COORDINATION',
  PAYMENT_DELIVERY = 'PAYMENT_DELIVERY',
  SUMMARY = 'SUMMARY',
}

const STEPS = [
  {
    key: GroupOrderStep.EVENT_DETAILS,
    title: 'Event Details',
    description: 'Tell us about your event',
  },
  {
    key: GroupOrderStep.FAMILY_SELECTION,
    title: 'Family Members',
    description: 'Select garments for each person',
  },
  {
    key: GroupOrderStep.FABRIC_COORDINATION,
    title: 'Fabric Coordination',
    description: 'Choose matching fabrics',
  },
  {
    key: GroupOrderStep.PAYMENT_DELIVERY,
    title: 'Payment & Delivery',
    description: 'Payment and delivery options',
  },
  {
    key: GroupOrderStep.SUMMARY,
    title: 'Review',
    description: 'Review and confirm order',
  },
];

interface GroupOrderState {
  groupName: string;
  eventType?: EventType;
  eventDate?: Date;
  familyMemberProfiles: Array<{
    profileId: string;
    garmentType: string;
    measurements?: Record<string, number>;
    specialInstructions?: string;
    paymentResponsibility?: string;
    deliveryPriority?: number;
  }>;
  sharedFabric: boolean;
  fabricDetails?: {
    fabricType: any; // FabricType from shared types
    fabricColor: string;
    fabricPattern?: string;
    totalYardage: number;
    costPerYard: number;
    totalFabricCost?: number;
    preferredVendor?: string;
    fabricLot?: string;
    fabricSource: 'CUSTOMER_PROVIDED' | 'TAILOR_SOURCED';
  };
  paymentMode: PaymentMode;
  deliveryStrategy: DeliveryStrategy;
  coordinationNotes?: string;
  tailorId?: string;
  whatsappGroupId?: string;
}

export function GroupOrderCreationWizard({
  initialTailorId,
  onOrderCreated,
  onCancel,
}: GroupOrderCreationWizardProps) {
  const router = useRouter();
  useAuth(); // Verify authentication
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState<any>(null);
  
  const [state, setState] = useState<GroupOrderState>({
    groupName: '',
    familyMemberProfiles: [],
    sharedFabric: false,
    paymentMode: PaymentMode.SINGLE_PAYER,
    deliveryStrategy: DeliveryStrategy.ALL_TOGETHER,
    tailorId: initialTailorId,
  });

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Calculate bulk discount when family members change
  useEffect(() => {
    if (state.familyMemberProfiles.length >= 3) {
      calculateBulkDiscount();
    }
  }, [state.familyMemberProfiles]);

  const calculateBulkDiscount = async () => {
    try {
      // Mock calculation - in real implementation, call API
      const itemCount = state.familyMemberProfiles.length;
      const orderAmounts = state.familyMemberProfiles.map(() => 200); // Estimate
      
      const response = await fetch('/api/orders/group/bulk-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemCount, orderAmounts }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setBulkDiscount(data);
      }
    } catch (error) {
      console.error('Failed to calculate bulk discount:', error);
    }
  };

  const updateState = (updates: Partial<GroupOrderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const validateStep = (stepKey: GroupOrderStep): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (stepKey) {
      case GroupOrderStep.EVENT_DETAILS:
        if (!state.groupName || state.groupName.length < 3) {
          errors.push('Group name must be at least 3 characters');
        }
        if (state.eventDate) {
          const minDate = new Date();
          minDate.setDate(minDate.getDate() + 14);
          if (state.eventDate < minDate) {
            errors.push('Event must be at least 14 days in advance');
          }
        }
        break;

      case GroupOrderStep.FAMILY_SELECTION:
        if (state.familyMemberProfiles.length < 2) {
          errors.push('At least 2 family members required for group order');
        }
        break;

      case GroupOrderStep.FABRIC_COORDINATION:
        if (state.sharedFabric && !state.fabricDetails) {
          errors.push('Fabric details required when using shared fabric');
        }
        break;

      case GroupOrderStep.PAYMENT_DELIVERY:
        // Validation for payment and delivery
        break;

      case GroupOrderStep.SUMMARY:
        // Final validation
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleNext = () => {
    const validation = validateStep(currentStep.key);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: 'Validation Error',
          description: error,
          variant: 'destructive',
        });
      });
      return;
    }

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const groupOrderRequest: CreateGroupOrderRequest = {
        groupName: state.groupName,
        eventType: state.eventType,
        eventDate: state.eventDate,
        familyMemberProfiles: state.familyMemberProfiles,
        sharedFabric: state.sharedFabric,
        fabricDetails: state.fabricDetails,
        paymentMode: state.paymentMode,
        deliveryStrategy: state.deliveryStrategy,
        coordinationNotes: state.coordinationNotes,
        tailorId: state.tailorId,
        whatsappGroupId: state.whatsappGroupId,
      };

      const response = await fetch('/api/orders/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupOrderRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create group order');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success!',
          description: `Group order ${result.groupOrderNumber} created successfully`,
        });

        if (onOrderCreated) {
          onOrderCreated(result.groupOrder.id, result.groupOrderNumber);
        } else {
          router.push(`/orders/group/${result.groupOrder.id}`);
        }
      } else {
        throw new Error('Failed to create group order');
      }
    } catch (error) {
      console.error('Error creating group order:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create group order',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep.key) {
      case GroupOrderStep.EVENT_DETAILS:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={state.groupName}
                onChange={(e) => updateState({ groupName: e.target.value })}
                placeholder="e.g., Family Wedding Outfits"
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <select
                value={state.eventType || ''}
                onChange={(e) => updateState({ eventType: e.target.value as EventType })}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="">Select event type</option>
                <option value={EventType.WEDDING}>Wedding Ceremony</option>
                <option value={EventType.FUNERAL}>Funeral Service</option>
                <option value={EventType.NAMING_CEREMONY}>Naming Ceremony</option>
                <option value={EventType.FESTIVAL}>Cultural Festival</option>
                <option value={EventType.CHURCH_EVENT}>Church Event</option>
                <option value={EventType.FAMILY_REUNION}>Family Reunion</option>
                <option value={EventType.BIRTHDAY}>Birthday</option>
                <option value={EventType.OTHER}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event Date</label>
              <input
                type="date"
                value={state.eventDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => updateState({ eventDate: new Date(e.target.value) })}
                min={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="w-full px-4 py-2 border rounded-md"
              />
              <p className="text-sm text-gray-500 mt-1">
                Must be at least 14 days in advance
              </p>
            </div>
          </div>
        );

      case GroupOrderStep.FAMILY_SELECTION:
        return (
          <FamilyGarmentSelector
            selectedProfiles={state.familyMemberProfiles}
            onProfilesChange={(profiles) => updateState({ familyMemberProfiles: profiles })}
          />
        );

      case GroupOrderStep.FABRIC_COORDINATION:
        return (
          <FabricCoordinator
            sharedFabric={state.sharedFabric}
            fabricDetails={state.fabricDetails}
            itemCount={state.familyMemberProfiles.length}
            onSharedFabricChange={(shared) => updateState({ sharedFabric: shared })}
            onFabricDetailsChange={(details) => updateState({ fabricDetails: details })}
          />
        );

      case GroupOrderStep.PAYMENT_DELIVERY:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">Payment Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateState({ paymentMode: PaymentMode.SINGLE_PAYER })}
                  className={`p-4 border-2 rounded-lg text-left ${
                    state.paymentMode === PaymentMode.SINGLE_PAYER
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">Single Payer</div>
                  <div className="text-sm text-gray-500">One person pays for everyone</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateState({ paymentMode: PaymentMode.SPLIT_PAYMENT })}
                  className={`p-4 border-2 rounded-lg text-left ${
                    state.paymentMode === PaymentMode.SPLIT_PAYMENT
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">Split Payment</div>
                  <div className="text-sm text-gray-500">Each person pays for their items</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Delivery Strategy</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateState({ deliveryStrategy: DeliveryStrategy.ALL_TOGETHER })}
                  className={`p-4 border-2 rounded-lg text-left ${
                    state.deliveryStrategy === DeliveryStrategy.ALL_TOGETHER
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">All Together</div>
                  <div className="text-sm text-gray-500">Wait for all items to complete</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateState({ deliveryStrategy: DeliveryStrategy.STAGGERED })}
                  className={`p-4 border-2 rounded-lg text-left ${
                    state.deliveryStrategy === DeliveryStrategy.STAGGERED
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">Staggered Delivery</div>
                  <div className="text-sm text-gray-500">Deliver items as they complete</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Coordination Notes</label>
              <textarea
                value={state.coordinationNotes || ''}
                onChange={(e) => updateState({ coordinationNotes: e.target.value })}
                placeholder="Any special coordination requirements..."
                rows={4}
                className="w-full px-4 py-2 border rounded-md"
              />
            </div>
          </div>
        );

      case GroupOrderStep.SUMMARY:
        return (
          <GroupOrderSummary
            state={state}
            bulkDiscount={bulkDiscount}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Create Group Order</CardTitle>
              <CardDescription>
                Order matching outfits for your family event with bulk discounts
              </CardDescription>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{currentStep.title}</span>
              <span>Step {currentStepIndex + 1} of {STEPS.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={step.key}
                className={`flex-1 text-center ${
                  index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className={`text-xs ${index === currentStepIndex ? 'font-semibold' : ''}`}>
                  {step.title}
                </div>
              </div>
            ))}
          </div>

          {/* Bulk Discount Banner */}
          {state.familyMemberProfiles.length >= 3 && bulkDiscount && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <div className="text-sm">
                <span className="font-semibold text-green-700">
                  {bulkDiscount.discountPercentage}% Bulk Discount!
                </span>
                <span className="text-green-600 ml-2">
                  Save {bulkDiscount.savings} GHS
                </span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? onCancel : handleBack}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStepIndex === 0 ? 'Cancel' : 'Back'}
            </Button>

            {currentStepIndex < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={isLoading}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Group Order'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

