// Unit tests for DisputeCreationForm component
// Story 2.4: Test dispute creation interface

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeCreationForm } from '@/components/features/disputes/DisputeCreationForm';
import { DisputeCategory, DISPUTE_CONSTANTS } from '@sew4mi/shared';

// Mock the UI components
vi.mock('@sew4mi/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type}
      className={`btn ${variant} ${className}`}
    >
      {children}
    </button>
  )
}));

vi.mock('@sew4mi/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={`card ${className}`}>{children}</div>
  )
}));

vi.mock('@sew4mi/ui/input', () => ({
  Input: ({ value, onChange, placeholder, maxLength, className, id }: any) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      className={className}
    />
  )
}));

vi.mock('@sew4mi/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  )
}));

vi.mock('@sew4mi/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, maxLength, rows, className, id }: any) => (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className={className}
    />
  )
}));

vi.mock('@sew4mi/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select 
      data-testid="category-select"
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="">Select category</option>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

vi.mock('@sew4mi/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div className={`alert ${variant}`}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@sew4mi/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  )
}));

// Mock the evidence upload component
vi.mock('@/components/features/disputes/DisputeEvidenceUpload', () => ({
  DisputeEvidenceUpload: ({ onUploadComplete, onUploadError, maxFiles, maxFileSize }: any) => (
    <div data-testid="evidence-upload">
      <span>Evidence Upload Component</span>
      <span data-testid="max-files">{maxFiles}</span>
      <span data-testid="max-size">{maxFileSize}</span>
    </div>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  X: () => <div data-testid="x-icon" />
}));

describe('DisputeCreationForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  
  const defaultProps = {
    orderId: 'order-123',
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel
  };

  const orderDetails = {
    customerName: 'John Doe',
    tailorName: 'Jane Smith',
    orderAmount: 250,
    status: 'IN_PROGRESS'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with all required fields', () => {
      render(<DisputeCreationForm {...defaultProps} />);
      
      expect(screen.getByText('Create Dispute')).toBeInTheDocument();
      expect(screen.getByText('Dispute Category *')).toBeInTheDocument();
      expect(screen.getByText('Dispute Title *')).toBeInTheDocument();
      expect(screen.getByText('Detailed Description *')).toBeInTheDocument();
      expect(screen.getByText('Supporting Evidence')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create dispute/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render order details when provided', () => {
      render(<DisputeCreationForm {...defaultProps} orderDetails={orderDetails} />);
      
      expect(screen.getByText('Order Details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('GH₵ 250')).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    });

    it('should render milestone id in form data when provided', () => {
      render(<DisputeCreationForm {...defaultProps} milestoneId="milestone-456" />);
      
      // Form should be rendered (milestone id is internal state)
      expect(screen.getByText('Create Dispute')).toBeInTheDocument();
    });

    it('should render evidence upload component with correct props', () => {
      render(<DisputeCreationForm {...defaultProps} />);
      
      expect(screen.getByTestId('evidence-upload')).toBeInTheDocument();
      expect(screen.getByTestId('max-files')).toHaveTextContent(
        DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILES_PER_DISPUTE.toString()
      );
      expect(screen.getByTestId('max-size')).toHaveTextContent(
        DISPUTE_CONSTANTS.FILE_LIMITS.MAX_FILE_SIZE.toString()
      );
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a dispute category')).toBeInTheDocument();
        expect(screen.getByText(`Title must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH} characters`)).toBeInTheDocument();
        expect(screen.getByText(`Description must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MIN_LENGTH} characters`)).toBeInTheDocument();
      });
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show validation error for short title', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Brief summary of the issue');
      await user.type(titleInput, 'Bad'); // Too short (3 chars, need 5+)
      
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(`Title must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH} characters`)).toBeInTheDocument();
      });
    });

    it('should show validation error for short description', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      const descriptionInput = screen.getByPlaceholderText(/Provide a detailed explanation/);
      await user.type(descriptionInput, 'Bad work'); // Too short (8 chars, need 10+)
      
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(`Description must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MIN_LENGTH} characters`)).toBeInTheDocument();
      });
    });

    it('should show character count for title and description', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText('Brief summary of the issue');
      await user.type(titleInput, 'Quality issue');
      
      expect(screen.getByText(`13/${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MAX_LENGTH}`)).toBeInTheDocument();
      
      const descriptionInput = screen.getByPlaceholderText(/Provide a detailed explanation/);
      await user.type(descriptionInput, 'The stitching is poor quality');
      
      expect(screen.getByText(`28/${DISPUTE_CONSTANTS.TEXT_LIMITS.DESCRIPTION_MAX_LENGTH}`)).toBeInTheDocument();
    });
  });

  describe('Category Selection', () => {
    it('should update form when category is selected', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, DisputeCategory.QUALITY_ISSUE);
      
      expect(categorySelect).toHaveValue(DisputeCategory.QUALITY_ISSUE);
    });

    it('should clear category validation error when category is selected', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      // First trigger validation error
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a dispute category')).toBeInTheDocument();
      });
      
      // Then select category
      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, DisputeCategory.QUALITY_ISSUE);
      
      await waitFor(() => {
        expect(screen.queryByText('Please select a dispute category')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      // Fill in valid form data
      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, DisputeCategory.QUALITY_ISSUE);
      
      const titleInput = screen.getByPlaceholderText('Brief summary of the issue');
      await user.type(titleInput, 'Poor stitching quality');
      
      const descriptionInput = screen.getByPlaceholderText(/Provide a detailed explanation/);
      await user.type(descriptionInput, 'The stitching on the garment is very poor quality and does not meet expectations.');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          {
            orderId: 'order-123',
            milestoneId: undefined,
            category: DisputeCategory.QUALITY_ISSUE,
            title: 'Poor stitching quality',
            description: 'The stitching on the garment is very poor quality and does not meet expectations.'
          },
          [] // No evidence files in this test
        );
      });
    });

    it('should include milestone id in submission when provided', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} milestoneId="milestone-456" />);
      
      // Fill in valid form data
      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, DisputeCategory.DELIVERY_DELAY);
      
      const titleInput = screen.getByPlaceholderText('Brief summary of the issue');
      await user.type(titleInput, 'Late delivery');
      
      const descriptionInput = screen.getByPlaceholderText(/Provide a detailed explanation/);
      await user.type(descriptionInput, 'The order was supposed to be delivered yesterday but has not arrived.');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            milestoneId: 'milestone-456'
          }),
          []
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const slowOnSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<DisputeCreationForm {...defaultProps} onSubmit={slowOnSubmit} />);
      
      // Fill in form
      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, DisputeCategory.QUALITY_ISSUE);
      
      const titleInput = screen.getByPlaceholderText('Brief summary of the issue');
      await user.type(titleInput, 'Poor stitching quality');
      
      const descriptionInput = screen.getByPlaceholderText(/Provide a detailed explanation/);
      await user.type(descriptionInput, 'The stitching is poor quality and unacceptable.');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      // Check loading state
      expect(screen.getByText('Creating Dispute...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should handle submission errors', async () => {
      const user = userEvent.setup();
      const errorOnSubmit = vi.fn(() => Promise.reject(new Error('Network error')));
      
      render(<DisputeCreationForm {...defaultProps} onSubmit={errorOnSubmit} />);
      
      // Fill in form
      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, DisputeCategory.QUALITY_ISSUE);
      
      const titleInput = screen.getByPlaceholderText('Brief summary of the issue');
      await user.type(titleInput, 'Poor stitching quality');
      
      const descriptionInput = screen.getByPlaceholderText(/Provide a detailed explanation/);
      await user.type(descriptionInput, 'The stitching is poor quality and unacceptable.');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<DisputeCreationForm {...defaultProps} />);
      
      // First trigger validation errors
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(`Title must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH} characters`)).toBeInTheDocument();
      });
      
      // Then start typing in title field
      const titleInput = screen.getByPlaceholderText('Brief summary of the issue');
      await user.type(titleInput, 'Q');
      
      await waitFor(() => {
        expect(screen.queryByText(`Title must be at least ${DISPUTE_CONSTANTS.TEXT_LIMITS.TITLE_MIN_LENGTH} characters`)).not.toBeInTheDocument();
      });
    });

    it('should be disabled when isLoading prop is true', () => {
      render(<DisputeCreationForm {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /create dispute/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Information Display', () => {
    it('should show "What happens next?" information', () => {
      render(<DisputeCreationForm {...defaultProps} />);
      
      expect(screen.getByText('What happens next?')).toBeInTheDocument();
      expect(screen.getByText(/Your dispute will be reviewed by our admin team/)).toBeInTheDocument();
      expect(screen.getByText(/You'll receive a response within 48 hours/)).toBeInTheDocument();
      expect(screen.getByText(/You can communicate with the tailor and admin/)).toBeInTheDocument();
      expect(screen.getByText(/We'll work toward a fair resolution/)).toBeInTheDocument();
    });
  });
});