import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PaymentSummaryCard } from '@/components/features/payments/PaymentSummaryCard';
import { DollarSign } from 'lucide-react';

describe('PaymentSummaryCard', () => {
  const defaultProps = {
    title: 'Test Card',
    amount: 1500.50,
    icon: DollarSign
  };

  it('should render card with basic information', () => {
    render(<PaymentSummaryCard {...defaultProps} />);
    
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('GHS 1,500.50')).toBeInTheDocument();
  });

  it('should display positive trend correctly', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        trend={15.5} 
      />
    );
    
    expect(screen.getByText('+15.5% vs last month')).toBeInTheDocument();
    // Check if TrendingUp icon is present (by class or test id)
    const trendElement = screen.getByText('+15.5% vs last month').closest('div');
    expect(trendElement).toHaveClass('text-green-600');
  });

  it('should display negative trend correctly', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        trend={-8.2} 
      />
    );
    
    expect(screen.getByText('-8.2% vs last month')).toBeInTheDocument();
    const trendElement = screen.getByText('-8.2% vs last month').closest('div');
    expect(trendElement).toHaveClass('text-red-600');
  });

  it('should display zero trend correctly', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        trend={0} 
      />
    );
    
    expect(screen.getByText('No change')).toBeInTheDocument();
  });

  it('should display description when provided', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        description="Net earnings after commission"
      />
    );
    
    expect(screen.getByText('Net earnings after commission')).toBeInTheDocument();
  });

  it('should format large amounts correctly', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        amount={1234567.89}
      />
    );
    
    expect(screen.getByText('GHS 1,234,567.89')).toBeInTheDocument();
  });

  it('should handle different currencies', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        amount={100}
        currency="USD"
      />
    );
    
    expect(screen.getByText('USD 100.00')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PaymentSummaryCard 
        {...defaultProps} 
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show both trend and description when provided', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        trend={12.5}
        description="Monthly earnings"
      />
    );
    
    expect(screen.getByText('+12.5% vs last month')).toBeInTheDocument();
    expect(screen.getByText('Monthly earnings')).toBeInTheDocument();
  });

  it('should format small decimal amounts correctly', () => {
    render(
      <PaymentSummaryCard 
        {...defaultProps} 
        amount={0.99}
      />
    );
    
    expect(screen.getByText('GHS 0.99')).toBeInTheDocument();
  });
});