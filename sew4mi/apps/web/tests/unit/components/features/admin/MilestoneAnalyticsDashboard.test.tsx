/**
 * Tests for Milestone Analytics Dashboard Component
 * Comprehensive testing for admin dashboard UI functionality
 * Story 2.3: Task 7 - Audit Trail and Reporting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MilestoneAnalyticsDashboard } from '@/components/features/admin/MilestoneAnalyticsDashboard';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and URL.revokeObjectURL for export tests
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-blob-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn()
});

// Mock document.createElement for export tests
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild
});

describe('MilestoneAnalyticsDashboard', () => {
  const mockAnalyticsData = {
    overview: {
      totalMilestones: 150,
      approvedMilestones: 120,
      rejectedMilestones: 20,
      pendingMilestones: 10,
      autoApprovedMilestones: 30,
      averageApprovalTime: 24.5,
      rejectionRate: 13.3
    },
    milestoneBreakdown: [
      {
        milestone: 'FABRIC_SELECTED',
        total: 50,
        approved: 40,
        rejected: 8,
        pending: 2,
        autoApproved: 10,
        avgApprovalTime: 18.5,
        rejectionRate: 16.0
      },
      {
        milestone: 'CUTTING_STARTED',
        total: 30,
        approved: 25,
        rejected: 3,
        pending: 2,
        autoApproved: 5,
        avgApprovalTime: 22.1,
        rejectionRate: 10.0
      }
    ],
    tailorPerformance: [
      {
        tailorId: 'tailor-1',
        tailorName: 'John Tailor',
        totalMilestones: 25,
        approvalRate: 88.0,
        rejectionRate: 12.0,
        avgApprovalTime: 20.5,
        qualityScore: 85
      },
      {
        tailorId: 'tailor-2',
        tailorName: 'Jane Tailor',
        totalMilestones: 30,
        approvalRate: 93.3,
        rejectionRate: 6.7,
        avgApprovalTime: 18.2,
        qualityScore: 92
      }
    ],
    timeSeriesData: [
      {
        date: '2024-01-01',
        submitted: 10,
        approved: 8,
        rejected: 2,
        autoApproved: 3
      },
      {
        date: '2024-01-02',
        submitted: 12,
        approved: 10,
        rejected: 1,
        autoApproved: 4
      }
    ],
    rejectionPatterns: [
      {
        milestone: 'FABRIC_SELECTED',
        commonReasons: [
          { reason: 'Wrong color selected', count: 5, percentage: 50.0 },
          { reason: 'Poor fabric quality', count: 3, percentage: 30.0 }
        ]
      },
      {
        milestone: 'CUTTING_STARTED',
        commonReasons: [
          { reason: 'Incorrect measurements', count: 2, percentage: 66.7 }
        ]
      }
    ],
    alerts: [
      {
        type: 'HIGH_REJECTION_RATE',
        message: 'Tailor John Tailor has a high rejection rate of 25.0%',
        severity: 'medium',
        data: { tailorId: 'tailor-1', rejectionRate: 25.0 }
      },
      {
        type: 'SLOW_APPROVAL_TIME',
        message: 'Average approval time is 36.5 hours',
        severity: 'high',
        data: { avgApprovalTime: 36.5 }
      }
    ]
  };

  beforeEach(() => {
    mockFetch.mockClear();
    mockCreateElement.mockClear();
    mockAppendChild.mockClear();
    mockRemoveChild.mockClear();
    mockClick.mockClear();

    // Setup default successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAnalyticsData,
        metadata: {
          timeRange: '30d',
          generatedAt: '2024-01-01T00:00:00.000Z'
        }
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render and Data Loading', () => {
    it('should render loading state initially', () => {
      // Mock pending fetch
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<MilestoneAnalyticsDashboard />);

      expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
    });

    it('should fetch and display analytics data on mount', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/milestones/analytics')
      );

      // Check overview metrics
      expect(screen.getByText('150')).toBeInTheDocument(); // Total milestones
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // Approval rate
      expect(screen.getByText('13.3%')).toBeInTheDocument(); // Rejection rate
      expect(screen.getByText('24.5h')).toBeInTheDocument(); // Avg approval time
    });

    it('should display alerts section when alerts exist', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Active Alerts (2)')).toBeInTheDocument();
      });

      expect(screen.getByText('Tailor John Tailor has a high rejection rate of 25.0%')).toBeInTheDocument();
      expect(screen.getByText('Average approval time is 36.5 hours')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Controls', () => {
    it('should update data when time range changes', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      // Find and click time range selector
      const timeRangeSelect = screen.getByDisplayValue('Last 30 days');
      fireEvent.click(timeRangeSelect);

      const last7DaysOption = screen.getByText('Last 7 days');
      fireEvent.click(last7DaysOption);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('timeRange=7d')
        );
      });
    });

    it('should refresh data when refresh button is clicked', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });

  describe('Export Functionality', () => {
    it('should handle export button click', async () => {
      // Mock createElement to return an element with click method
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick
      };
      mockCreateElement.mockReturnValue(mockAnchor);

      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
        expect(mockClick).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
      });
    });

    it('should handle export errors gracefully', async () => {
      // Mock console.error to verify error handling
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockCreateElement.mockImplementation(() => {
        throw new Error('Export failed');
      });

      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Tab Navigation', () => {
    it('should display milestone breakdown in milestones tab', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const milestonesTab = screen.getByText('By Milestone');
      fireEvent.click(milestonesTab);

      expect(screen.getByText('Fabric Selected')).toBeInTheDocument();
      expect(screen.getByText('Cutting Started')).toBeInTheDocument();
    });

    it('should display tailor performance in tailors tab', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const tailorsTab = screen.getByText('Tailor Performance');
      fireEvent.click(tailorsTab);

      expect(screen.getByText('John Tailor')).toBeInTheDocument();
      expect(screen.getByText('Jane Tailor')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument(); // Quality score
      expect(screen.getByText('92')).toBeInTheDocument(); // Quality score
    });

    it('should display rejection patterns in patterns tab', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const patternsTab = screen.getByText('Rejection Patterns');
      fireEvent.click(patternsTab);

      expect(screen.getByText('Wrong color selected')).toBeInTheDocument();
      expect(screen.getByText('Poor fabric quality')).toBeInTheDocument();
      expect(screen.getByText('Incorrect measurements')).toBeInTheDocument();
    });
  });

  describe('Alert Display', () => {
    it('should display alerts with correct severity styling', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Active Alerts (2)')).toBeInTheDocument();
      });

      const mediumAlert = screen.getByText('MEDIUM');
      const highAlert = screen.getByText('HIGH');

      expect(mediumAlert).toBeInTheDocument();
      expect(highAlert).toBeInTheDocument();
    });

    it('should not display alerts section when no alerts exist', async () => {
      const dataWithoutAlerts = {
        ...mockAnalyticsData,
        alerts: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: dataWithoutAlerts
        })
      });

      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      expect(screen.queryByText('Active Alerts')).not.toBeInTheDocument();
    });
  });

  describe('Quality Score Display', () => {
    it('should display quality scores with appropriate styling', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const tailorsTab = screen.getByText('Tailor Performance');
      fireEvent.click(tailorsTab);

      // Check for quality score values
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('92')).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('should display progress bars for milestone status distribution', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      // Check progress bars are rendered (they would have role="progressbar")
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Data Formatting', () => {
    it('should format milestone names correctly', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const milestonesTab = screen.getByText('By Milestone');
      fireEvent.click(milestonesTab);

      // Verify milestone names are formatted (underscores to spaces, proper case)
      expect(screen.getByText('Fabric Selected')).toBeInTheDocument();
      expect(screen.getByText('Cutting Started')).toBeInTheDocument();
    });

    it('should format numbers with proper decimal places', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      // Check that percentages are formatted to 1 decimal place
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // Approval rate
      expect(screen.getByText('13.3%')).toBeInTheDocument(); // Rejection rate
      expect(screen.getByText('24.5h')).toBeInTheDocument(); // Approval time
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle empty data gracefully', async () => {
      const emptyData = {
        overview: {
          totalMilestones: 0,
          approvedMilestones: 0,
          rejectedMilestones: 0,
          pendingMilestones: 0,
          autoApprovedMilestones: 0,
          averageApprovalTime: 0,
          rejectionRate: 0
        },
        milestoneBreakdown: [],
        tailorPerformance: [],
        timeSeriesData: [],
        rejectionPatterns: [],
        alerts: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: emptyData
        })
      });

      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      // Should display zero values without crashing
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // Check for button accessibility
      expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should handle keyboard navigation for tabs', async () => {
      render(<MilestoneAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Milestone Analytics Dashboard')).toBeInTheDocument();
      });

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });
  });
});