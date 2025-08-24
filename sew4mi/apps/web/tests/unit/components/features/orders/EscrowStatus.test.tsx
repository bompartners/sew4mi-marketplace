import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EscrowStatus } from '../../../../../components/features/orders/EscrowStatus';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EscrowStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEscrowData = {
    success: true,
    data: {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      currentStage: 'FITTING' as const,
      totalAmount: 1000,
      depositPaid: 250,
      fittingPaid: 0,
      finalPaid: 0,
      escrowBalance: 750,
      nextStageAmount: 500,
      stageHistory: [
        {
          stage: 'DEPOSIT' as const,
          transitionedAt: '2024-08-22T10:00:00Z',
          amount: 250,
          transactionId: 'txn-123'
        }
      ],
      progressPercentage: 75,
      nextMilestone: {
        stage: 'FINAL',
        description: 'Delivery confirmation required',
        requiredAction: 'Delivery must be confirmed'
      },
      orderStatus: 'READY_FOR_FITTING'
    }
  };

  it('should display loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);
    
    expect(screen.getByText('Loading escrow status...')).toBeInTheDocument();
  });

  it('should display escrow status data correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEscrowData)
    });

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('Payment Progress')).toBeInTheDocument();
    });

    // Check progress percentage
    expect(screen.getByText('75%')).toBeInTheDocument();

    // Check payment breakdown
    expect(screen.getByText('Deposit (25%)')).toBeInTheDocument();
    expect(screen.getByText('Fitting Payment (50%)')).toBeInTheDocument();
    expect(screen.getByText('Final Payment (25%)')).toBeInTheDocument();

    // Check amounts
    expect(screen.getByText('GH₵ 250.00')).toBeInTheDocument();
    expect(screen.getByText('GH₵ 500.00')).toBeInTheDocument();

    // Check financial summary
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    expect(screen.getByText('GH₵ 1000.00')).toBeInTheDocument();
    expect(screen.getByText('Remaining in Escrow')).toBeInTheDocument();
    expect(screen.getByText('GH₵ 750.00')).toBeInTheDocument();
  });

  it('should show paid status for completed stages', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEscrowData)
    });

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('✓ Paid')).toBeInTheDocument();
    });
  });

  it('should show current stage description', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEscrowData)
    });

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('Current Stage')).toBeInTheDocument();
      expect(screen.getByText(/Deposit paid/)).toBeInTheDocument();
    });
  });

  it('should show next milestone information', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEscrowData)
    });

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('Next:')).toBeInTheDocument();
      expect(screen.getByText('Delivery confirmation required')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        error: 'Order not found'
      })
    });

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('Order not found')).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('Network error loading escrow status')).toBeInTheDocument();
    });
  });

  it('should make API call with correct order ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEscrowData)
    });

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/orders/550e8400-e29b-41d4-a716-446655440000/escrow/status');
    });
  });

  it('should display all payment stages with correct status', async () => {
    const dataWithMultiplePaid = {
      ...mockEscrowData,
      data: {
        ...mockEscrowData.data,
        currentStage: 'FINAL' as const,
        depositPaid: 250,
        fittingPaid: 500,
        finalPaid: 0,
        progressPercentage: 95
      }
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dataWithMultiplePaid)
    });

    render(<EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      const paidElements = screen.getAllByText('✓ Paid');
      expect(paidElements).toHaveLength(2); // Deposit and Fitting should be paid
      
      expect(screen.getByText('• Current')).toBeInTheDocument(); // Final should be current
    });
  });

  it('should not render when orderId is not provided', () => {
    render(<EscrowStatus orderId="" />);
    
    // Should not make API call or show loading
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading escrow status...')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { container } = render(
      <EscrowStatus orderId="550e8400-e29b-41d4-a716-446655440000" className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});