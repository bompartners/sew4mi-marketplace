'use client';

import { useState, useCallback } from 'react';
import { 
  OrderCreationState, 
  OrderCreationStep, 
  OrderCreationValidation,
  CreateOrderInput,
  CreateOrderResponse,
  CalculatePricingRequest,
  CalculatePricingResponse
} from '@sew4mi/shared/types';
import { 
  OrderCreationSchemas 
} from '@sew4mi/shared/schemas';

interface UseOrderCreationReturn {
  state: OrderCreationState;
  updateState: (updates: Partial<OrderCreationState>) => void;
  validateStep: (step: OrderCreationStep) => { isValid: boolean; errors: Record<string, string> };
  calculatePricing: (request: CalculatePricingRequest) => Promise<CalculatePricingResponse>;
  createOrder: (orderData: CreateOrderInput) => Promise<CreateOrderResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const initialState: OrderCreationState = {
  step: OrderCreationStep.GARMENT_TYPE,
  customerId: '',
  tailorId: undefined,
  garmentType: undefined,
  fabricChoice: undefined,
  measurementProfile: undefined,
  specialInstructions: '',
  urgencyLevel: undefined,
  estimatedDelivery: undefined,
  pricingBreakdown: undefined,
  isValid: false,
  errors: {}
};

export function useOrderCreation(): UseOrderCreationReturn {
  const [state, setState] = useState<OrderCreationState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateState = useCallback((updates: Partial<OrderCreationState>) => {
    setState(prevState => ({
      ...prevState,
      ...updates,
      errors: {
        ...prevState.errors,
        ...updates.errors
      }
    }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateStep = useCallback((step: OrderCreationStep): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    let isValid = true;

    try {
      switch (step) {
        case OrderCreationStep.GARMENT_TYPE:
          if (!state.garmentType) {
            errors.garmentType = 'Please select a garment type';
            isValid = false;
          }
          break;

        case OrderCreationStep.SPECIFICATIONS:
          if (!state.fabricChoice) {
            errors.fabricChoice = 'Please select fabric sourcing option';
            isValid = false;
          }

          if (state.specialInstructions && state.specialInstructions.length > 500) {
            errors.specialInstructions = 'Special instructions must be 500 characters or less';
            isValid = false;
          }
          break;

        case OrderCreationStep.MEASUREMENTS:
          if (!state.measurementProfile) {
            errors.measurementProfile = 'Please select a measurement profile';
            isValid = false;
          }

          // Check if profile has required measurements for the garment type
          if (state.measurementProfile && state.garmentType) {
            const requiredMeasurements = state.garmentType.measurementsRequired || [];
            const missingMeasurements = requiredMeasurements.filter(
              measurement => !state.measurementProfile?.measurements[measurement]
            );

            if (missingMeasurements.length > 0) {
              errors.measurementProfile = `Missing required measurements: ${missingMeasurements.join(', ')}`;
              isValid = false;
            }
          }
          break;

        case OrderCreationStep.TIMELINE:
          if (!state.urgencyLevel) {
            errors.urgencyLevel = 'Please select delivery urgency';
            isValid = false;
          }

          if (!state.estimatedDelivery) {
            errors.estimatedDelivery = 'Please select delivery date';
            isValid = false;
          } else {
            const now = new Date();
            if (state.estimatedDelivery <= now) {
              errors.estimatedDelivery = 'Delivery date must be in the future';
              isValid = false;
            }

            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (state.estimatedDelivery > maxDate) {
              errors.estimatedDelivery = 'Delivery date must be within 6 months';
              isValid = false;
            }
          }
          break;

        case OrderCreationStep.SUMMARY:
          // Validate all previous steps without recursion
          if (!state.garmentType) {
            errors.garmentType = 'Please select a garment type';
            isValid = false;
          }

          if (!state.fabricChoice) {
            errors.fabricChoice = 'Please select fabric sourcing option';
            isValid = false;
          }

          if (!state.measurementProfile) {
            errors.measurementProfile = 'Please select a measurement profile';
            isValid = false;
          }

          if (!state.urgencyLevel) {
            errors.urgencyLevel = 'Please select delivery urgency';
            isValid = false;
          }

          if (!state.estimatedDelivery) {
            errors.estimatedDelivery = 'Please select delivery date';
            isValid = false;
          }

          if (!state.pricingBreakdown) {
            errors.pricing = 'Pricing calculation required';
            isValid = false;
          }
          break;

        default:
          break;
      }
    } catch (validationError) {
      console.error('Validation error:', validationError);
      errors.general = 'Validation error occurred';
      isValid = false;
    }

    return { isValid, errors };
  }, [state]);

  const calculatePricing = useCallback(async (request: CalculatePricingRequest): Promise<CalculatePricingResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate request
      const validatedRequest = OrderCreationSchemas.CalculatePricingRequest.parse(request);

      const response = await fetch('/api/orders/calculate-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validatedRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to calculate pricing');
      }

      const pricingData: CalculatePricingResponse = await response.json();
      
      return pricingData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate pricing';
      setError(errorMessage);
      
      // Return fallback pricing if API fails
      const garmentType = state.garmentType;
      if (garmentType) {
        const basePrice = garmentType.basePrice;
        const fabricCost = request.fabricChoice === 'TAILOR_SOURCED' ? basePrice * 0.3 : 0;
        const urgencySurcharge = request.urgencyLevel === 'EXPRESS' ? basePrice * 0.25 : 0;
        const totalAmount = basePrice + fabricCost + urgencySurcharge;

        return {
          basePrice,
          fabricCost,
          urgencySurcharge,
          totalAmount,
          escrowBreakdown: {
            deposit: totalAmount * 0.25,
            fitting: totalAmount * 0.5,
            final: totalAmount * 0.25
          }
        };
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [state.garmentType]);

  const createOrder = useCallback(async (orderData: CreateOrderInput): Promise<CreateOrderResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate order data
      const validatedOrderData = OrderCreationSchemas.CreateOrderInput.parse(orderData);

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validatedOrderData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create order');
      }

      return responseData as CreateOrderResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    state,
    updateState,
    validateStep,
    calculatePricing,
    createOrder,
    isLoading,
    error,
    clearError
  };
}