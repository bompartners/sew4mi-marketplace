// Component test for AdminDisputeDashboard
// Story 2.4: Test admin dispute dashboard functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDisputeDashboard } from '@/components/features/admin/AdminDisputeDashboard';

// Mock fetch API
global.fetch = vi.fn();

describe('AdminDisputeDashboard', () => {
  const mockProps = {
    onDisputeSelect: vi.fn(),
    onAssignDispute: vi.fn(),
    className: 'test-class'
  };

  const mockDashboardData = {
    disputes: [
      {
        id: 'dispute-1',
        orderId: 'order-1',
        category: 'QUALITY_ISSUE',
        title: 'Poor stitching quality',
        status: 'OPEN',
        priority: 'HIGH',
        assignedAdmin: null,
        slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        createdAt: new Date().toISOString(),
        orderAmount: 250,
        customerEmail: 'customer@example.com',
        tailorEmail: 'tailor@example.com',
        adminEmail: null,
        isOverdue: false,
        hoursUntilSla: 24,
        messageCount: 2,
        evidenceCount: 1
      },
      {
        id: 'dispute-2',
        orderId: 'order-2',
        category: 'DELIVERY_DELAY',
        title: 'Order not delivered on time',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assignedAdmin: 'admin-1',
        slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago (overdue)
        createdAt: new Date().toISOString(),
        orderAmount: 150,
        customerEmail: 'customer2@example.com',
        tailorEmail: 'tailor2@example.com',
        adminEmail: 'admin@example.com',
        isOverdue: true,
        hoursUntilSla: 0,
        messageCount: 5,
        evidenceCount: 0
      }
    ],
    stats: {
      totalDisputes: 25,
      openDisputes: 8,
      overdueDisputes: 3,
      criticalPriority: 2,
      averageResolutionTime: 18.5,
      slaPerformance: 92
    },
    pagination: {
      page: 1,
      limit: 25,
      total: 25,
      hasMore: false
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData)
    });
  });

  it('renders dashboard with header and stats', async () => {
    render(<AdminDisputeDashboard {...mockProps} />);

    expect(screen.getByText('Dispute Management')).toBeInTheDocument();
    expect(screen.getByText('Manage and resolve customer disputes efficiently')).toBeInTheDocument();

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Total disputes
      expect(screen.getByText('8')).toBeInTheDocument(); // Open disputes
      expect(screen.getByText('3')).toBeInTheDocument(); // Overdue disputes
      expect(screen.getByText('2')).toBeInTheDocument(); // Critical priority
      expect(screen.getByText('18.5h')).toBeInTheDocument(); // Average resolution
      expect(screen.getByText('92%')).toBeInTheDocument(); // SLA performance
    });
  });

  it('renders dispute list', async () => {
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Poor stitching quality')).toBeInTheDocument();
      expect(screen.getByText('Order not delivered on time')).toBeInTheDocument();
      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      expect(screen.getByText('tailor@example.com')).toBeInTheDocument();
    });
  });

  it('displays dispute priority and status badges', async () => {
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      // Check for priority badges
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      
      // Check for status badges
      expect(screen.getByText('OPEN')).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    });
  });

  it('shows overdue styling for overdue disputes', async () => {
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      const overdueText = screen.getByText('Overdue');
      expect(overdueText).toBeInTheDocument();
      expect(overdueText.closest('.text-red-600')).toBeTruthy();
    });
  });

  it('displays message and evidence counts', async () => {
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument();
      expect(screen.getByText('1 evidence files')).toBeInTheDocument();
      expect(screen.getByText('5 messages')).toBeInTheDocument();
      expect(screen.getByText('0 evidence files')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    render(<AdminDisputeDashboard {...mockProps} />);

    const searchInput = screen.getByPlaceholderText(/search disputes/i);
    await user.type(searchInput, 'stitching');

    // Verify API call with search parameter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=stitching')
      );
    });
  });

  it('handles filter changes', async () => {
    const user = userEvent.setup();
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Filter by status')).toBeInTheDocument();
    });

    // Open status filter
    const statusFilter = screen.getByText('Filter by status');
    await user.click(statusFilter);

    // Select OPEN status
    const openOption = screen.getByText('OPEN');
    await user.click(openOption);

    // Verify API call with status filter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=OPEN')
      );
    });
  });

  it('handles tab switching', async () => {
    const user = userEvent.setup();
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('All Disputes')).toBeInTheDocument();
    });

    // Switch to overdue tab
    const overdueTab = screen.getByText('Overdue');
    await user.click(overdueTab);

    // Verify API call with overdue filter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('overdue=true')
      );
    });
  });

  it('handles dispute selection', async () => {
    const user = userEvent.setup();
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Poor stitching quality')).toBeInTheDocument();
    });

    // Click on dispute
    const disputeCard = screen.getByText('Poor stitching quality').closest('[data-testid], .cursor-pointer, [onClick]') || 
                      screen.getByText('Poor stitching quality').parentElement;
    if (disputeCard) {
      await user.click(disputeCard);
    }

    expect(mockProps.onDisputeSelect).toHaveBeenCalledWith('dispute-1');
  });

  it('handles dispute assignment', async () => {
    const user = userEvent.setup();
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Assign')).toBeInTheDocument();
    });

    // Click assign button for unassigned dispute
    const assignButton = screen.getByText('Assign');
    await user.click(assignButton);

    expect(mockProps.onAssignDispute).toHaveBeenCalledWith('dispute-1', 'current-admin-id');
  });

  it('handles refresh action', async () => {
    const user = userEvent.setup();
    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    // Should trigger additional API call
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('shows loading state', () => {
    render(<AdminDisputeDashboard {...mockProps} />);

    expect(screen.getByText('Loading disputes...')).toBeInTheDocument();
  });

  it('shows empty state when no disputes', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...mockDashboardData,
        disputes: []
      })
    });

    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No disputes found')).toBeInTheDocument();
      expect(screen.getByText('There are no disputes to display at this time.')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to load disputes' })
    });

    render(<AdminDisputeDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load disputes')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<AdminDisputeDashboard {...mockProps} />);
    
    expect(container.firstChild).toHaveClass('test-class');
  });
});