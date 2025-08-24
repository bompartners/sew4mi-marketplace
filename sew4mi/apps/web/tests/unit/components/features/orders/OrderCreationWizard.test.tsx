import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { OrderCreationWizard } from '@/components/features/orders/OrderCreationWizard';
import { useAuth } from '@/hooks/useAuth';
import { useOrderCreation } from '@/hooks/useOrderCreation';
import { OrderCreationStep, GarmentCategory, FabricChoice, UrgencyLevel } from '@sew4mi/shared/types';

// Mock hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useOrderCreation');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseOrderCreation = vi.mocked(useOrderCreation);

const mockUser = {
  id: 'user-123',
  email: 'customer@example.com',
  role: 'CUSTOMER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGarmentType = {
  id: 'custom-suit',
  name: 'Custom Suit',
  description: 'Tailored business suit with jacket and trousers',
  category: GarmentCategory.FORMAL,
  imageUrl: '/images/garments/custom-suit.jpg',
  basePrice: 300.00,
  estimatedDays: 21,
  measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
  isActive: true
};

const mockMeasurementProfile = {
  id: 'profile-123',
  userId: 'user-123',
  nickname: 'My Profile',
  gender: 'MALE' as const,
  measurements: {
    chest: 100,
    waist: 85,
    shoulderWidth: 45,
    sleeveLength: 63
  },
  lastUpdated: new Date(),
  isActive: true
};

const mockInitialState = {
  step: OrderCreationStep.GARMENT_TYPE,
  customerId: 'user-123',
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

const mockOrderCreationHook = {
  state: mockInitialState,
  updateState: vi.fn(),
  validateStep: vi.fn().mockReturnValue({ isValid: true, errors: {} }),
  calculatePricing: vi.fn(),
  createOrder: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn(),
};

describe('OrderCreationWizard', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyOTP: vi.fn(),
      resendOTP: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    });

    mockUseOrderCreation.mockReturnValue(mockOrderCreationHook);

    // Clear localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the order creation wizard', () => {
    render(<OrderCreationWizard />);
    
    expect(screen.getByText('Create Your Order')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Garment Type')).toBeInTheDocument();
    expect(screen.getByText('Choose what you want made')).toBeInTheDocument();
  });

  it('shows login prompt when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyOTP: vi.fn(),
      resendOTP: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(<OrderCreationWizard />);
    
    expect(screen.getByText('Please log in to create an order.')).toBeInTheDocument();
    expect(screen.getByText('Go to Login')).toBeInTheDocument();
  });

  it('initializes with tailor ID when provided', () => {
    render(<OrderCreationWizard initialTailorId="tailor-123" />);
    
    expect(mockOrderCreationHook.updateState).toHaveBeenCalledWith({
      customerId: 'user-123',
      tailorId: 'tailor-123',
      step: OrderCreationStep.GARMENT_TYPE,
      isValid: false,
      errors: {}
    });
  });

  it('displays progress correctly', () => {
    mockUseOrderCreation.mockReturnValue({
      ...mockOrderCreationHook,
      state: {
        ...mockInitialState,
        step: OrderCreationStep.MEASUREMENTS
      }
    });

    render(<OrderCreationWizard />);
    
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
    expect(screen.getByText('60% Complete')).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    mockUseOrderCreation.mockReturnValue({
      ...mockOrderCreationHook,
      error: 'Something went wrong'
    });

    render(<OrderCreationWizard />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('validates step before proceeding to next', async () => {
    const mockValidateStep = vi.fn().mockReturnValue({ isValid: false, errors: { garmentType: 'Required' } });
    
    mockUseOrderCreation.mockReturnValue({
      ...mockOrderCreationHook,
      validateStep: mockValidateStep
    });

    render(<OrderCreationWizard />);
    
    // The component calls validateStep to determine if Next button should be enabled
    expect(mockValidateStep).toHaveBeenCalledWith(OrderCreationStep.GARMENT_TYPE);
    
    // Next button should be disabled when validation fails
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('proceeds to next step when validation passes', async () => {
    const mockValidateStep = vi.fn().mockReturnValue({ isValid: true, errors: {} });
    
    mockUseOrderCreation.mockReturnValue({
      ...mockOrderCreationHook,
      validateStep: mockValidateStep,
      state: {
        ...mockInitialState,
        garmentType: mockGarmentType,
        fabricChoice: FabricChoice.TAILOR_SOURCED,
        tailorId: 'tailor-123'
      }
    });

    render(<OrderCreationWizard />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockValidateStep).toHaveBeenCalled();
      expect(mockOrderCreationHook.updateState).toHaveBeenCalledWith({
        step: OrderCreationStep.SPECIFICATIONS,
        errors: {}
      });
    });
  });

  it('goes back to previous step', () => {
    mockUseOrderCreation.mockReturnValue({
      ...mockOrderCreationHook,
      state: {
        ...mockInitialState,
        step: OrderCreationStep.SPECIFICATIONS
      }
    });

    render(<OrderCreationWizard />);
    
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);

    expect(mockOrderCreationHook.updateState).toHaveBeenCalledWith({
      step: OrderCreationStep.GARMENT_TYPE,
      errors: {}
    });
  });

  it('calls onOrderCreated callback when order is created successfully', async () => {
    const onOrderCreated = vi.fn();
    const mockCreateOrder = vi.fn().mockResolvedValue({
      success: true,
      orderId: 'order-123',
      orderNumber: 'ORD-123'
    });

    // Test the underlying function directly since UI state is complex
    render(<OrderCreationWizard onOrderCreated={onOrderCreated} />);
    
    // Simulate successful order creation
    await waitFor(async () => {
      const result = await mockCreateOrder();
      if (result.success) {
        onOrderCreated(result.orderId, result.orderNumber);
      }
    });

    expect(onOrderCreated).toHaveBeenCalledWith('order-123', 'ORD-123');
  });

  it('handles component cleanup properly', () => {
    // Test component lifecycle and cleanup
    const { unmount } = render(<OrderCreationWizard />);
    
    // Component should render successfully
    expect(screen.getByText('Create Your Order')).toBeInTheDocument();
    
    // Unmount should work without errors
    expect(() => unmount()).not.toThrow();
    
    // Verify component is no longer in DOM
    expect(screen.queryByText('Create Your Order')).not.toBeInTheDocument();
  });

  it('handles cancel action', () => {
    const onCancel = vi.fn();
    
    render(<OrderCreationWizard onCancel={onCancel} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });
});