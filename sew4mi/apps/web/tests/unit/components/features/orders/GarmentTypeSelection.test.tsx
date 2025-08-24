import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { GarmentTypeSelection } from '@/components/features/orders/GarmentTypeSelection';
import { GarmentCategory, GarmentTypeOption } from '@sew4mi/shared/types';

const mockGarmentTypes: GarmentTypeOption[] = [
  {
    id: 'custom-suit',
    name: 'Custom Suit',
    description: 'Tailored business suit with jacket and trousers',
    category: GarmentCategory.FORMAL,
    imageUrl: '/images/garments/custom-suit.jpg',
    basePrice: 300.00,
    estimatedDays: 21,
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
    isActive: true
  },
  {
    id: 'kente-shirt',
    name: 'Kente Shirt',
    description: 'Traditional Ghanaian shirt with authentic Kente patterns',
    category: GarmentCategory.TRADITIONAL,
    imageUrl: '/images/garments/kente-shirt.jpg',
    basePrice: 80.00,
    estimatedDays: 7,
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
    isActive: true
  },
  {
    id: 'casual-shirt',
    name: 'Casual Shirt',
    description: 'Everyday dress shirt for casual wear',
    category: GarmentCategory.CASUAL,
    imageUrl: '/images/garments/casual-shirt.jpg',
    basePrice: 40.00,
    estimatedDays: 7,
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
    isActive: true
  }
];

const mockProps = {
  selectedGarmentType: undefined,
  onSelect: vi.fn(),
  errors: {}
};

// Mock the constants
vi.mock('@sew4mi/shared/constants', () => ({
  GARMENT_TYPES: {
    'custom-suit': mockGarmentTypes[0],
    'kente-shirt': mockGarmentTypes[1],
    'casual-shirt': mockGarmentTypes[2]
  },
  GARMENT_CATEGORIES: {
    [GarmentCategory.FORMAL]: {
      label: 'Formal Wear',
      description: 'Professional and business attire',
      icon: '👔'
    },
    [GarmentCategory.TRADITIONAL]: {
      label: 'Traditional Wear', 
      description: 'Authentic Ghanaian cultural attire',
      icon: '🇬🇭'
    },
    [GarmentCategory.CASUAL]: {
      label: 'Casual Wear',
      description: 'Everyday comfortable clothing',
      icon: '👕'
    },
    [GarmentCategory.SPECIAL_OCCASION]: {
      label: 'Special Occasion',
      description: 'Wedding, ceremony, and celebration attire',
      icon: '✨'
    }
  }
}));

describe('GarmentTypeSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders garment type selection component', () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    expect(screen.getByText('Choose Your Garment Type')).toBeInTheDocument();
    expect(screen.getByText('Select the type of garment you want to have made. Each option shows the base price and typical timeline.')).toBeInTheDocument();
  });

  it('displays garment types grouped by category', async () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Custom Suit')).toBeInTheDocument();
      expect(screen.getByText('Kente Shirt')).toBeInTheDocument();
      expect(screen.getByText('Casual Shirt')).toBeInTheDocument();
    });

    expect(screen.getByText('Formal Wear')).toBeInTheDocument();
    expect(screen.getByText('Traditional Wear')).toBeInTheDocument();
    expect(screen.getByText('Casual Wear')).toBeInTheDocument();
  });

  it('shows pricing information for each garment type', async () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('From GHS 300.00')).toBeInTheDocument();
      expect(screen.getByText('From GHS 80.00')).toBeInTheDocument();
      expect(screen.getByText('From GHS 40.00')).toBeInTheDocument();
    });

    expect(screen.getByText('~21 days')).toBeInTheDocument();
    expect(screen.getByText('~7 days')).toBeInTheDocument();
  });

  it('calls onSelect when garment type is clicked', async () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    await waitFor(() => {
      const suitCard = screen.getByText('Custom Suit').closest('[role="button"], .cursor-pointer');
      expect(suitCard).toBeInTheDocument();
    });

    const suitCard = screen.getByText('Custom Suit').closest('.cursor-pointer');
    if (suitCard) {
      fireEvent.click(suitCard);
      expect(mockProps.onSelect).toHaveBeenCalledWith(mockGarmentTypes[0]);
    }
  });

  it('highlights selected garment type', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedGarmentType: mockGarmentTypes[0]
    };

    render(<GarmentTypeSelection {...propsWithSelected} />);
    
    const selectedCard = screen.getByText('Custom Suit').closest('.ring-2');
    expect(selectedCard).toBeInTheDocument();
  });

  it('shows selection summary when garment is selected', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedGarmentType: mockGarmentTypes[0]
    };

    render(<GarmentTypeSelection {...propsWithSelected} />);
    
    expect(screen.getByText('Selected: Custom Suit')).toBeInTheDocument();
    expect(screen.getByText(/Base price: GHS 300.00/)).toBeInTheDocument();
    expect(screen.getByText(/Estimated: 21 days/)).toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    const propsWithError = {
      ...mockProps,
      errors: { garmentType: 'Please select a garment type' }
    };

    render(<GarmentTypeSelection {...propsWithError} />);
    
    expect(screen.getByText('Please select a garment type')).toBeInTheDocument();
  });

  it('filters garment types by search query', async () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search garment types...');
    fireEvent.change(searchInput, { target: { value: 'suit' } });

    await waitFor(() => {
      expect(screen.getByText('Custom Suit')).toBeInTheDocument();
      expect(screen.queryByText('Kente Shirt')).not.toBeInTheDocument();
      expect(screen.queryByText('Casual Shirt')).not.toBeInTheDocument();
    });
  });

  it('filters garment types by category', async () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    await waitFor(() => {
      const traditionalTab = screen.getByRole('tab', { name: /traditional wear/i });
      fireEvent.click(traditionalTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Kente Shirt')).toBeInTheDocument();
      expect(screen.queryByText('Custom Suit')).not.toBeInTheDocument();
      expect(screen.queryByText('Casual Shirt')).not.toBeInTheDocument();
    });
  });

  it('shows helpful tips section', () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    expect(screen.getByText('💡 Helpful Tips')).toBeInTheDocument();
    expect(screen.getByText('Base prices may vary depending on your chosen tailor')).toBeInTheDocument();
    expect(screen.getByText('Traditional garments may require specific fabric types')).toBeInTheDocument();
  });

  it('shows no results message when search yields no matches', async () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search garment types...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No garment types found matching your search.')).toBeInTheDocument();
      expect(screen.getByText('Clear Search')).toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    render(<GarmentTypeSelection {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search garment types...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      const clearButton = screen.getByText('Clear Search');
      fireEvent.click(clearButton);
    });

    expect(searchInput).toHaveValue('');
  });
});