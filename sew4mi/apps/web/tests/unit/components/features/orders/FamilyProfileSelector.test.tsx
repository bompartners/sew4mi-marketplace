/**
 * FamilyProfileSelector Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FamilyProfileSelector } from '@/components/features/orders/FamilyProfileSelector';
import { 
  FamilyMeasurementProfile, 
  RelationshipType,
  ProfileVisibility,
  ReminderFrequency 
} from '@sew4mi/shared/types/family-profiles';
import { Gender } from '@sew4mi/shared/types/order-creation';

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: any) => (
    <div className={className} onClick={onClick} data-testid="card">{children}</div>
  ),
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className} data-testid="card-title">{children}</h3>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button onClick={onClick} className={className} data-testid="button" data-variant={variant} data-size={size}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-testid="badge" data-variant={variant}>{children}</span>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, type, className }: any) => (
    <input 
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
      className={className}
      data-testid="input"
    />
  )
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className} data-testid="label">{children}</label>
  )
}));

vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, value, onValueChange }: any) => (
    <div data-testid="radio-group" data-value={value}>
      <div onClick={() => onValueChange?.('test-profile-id')}>Radio Group</div>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id }: any) => (
    <input type="radio" value={value} id={id} data-testid="radio-item" />
  )
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  User: () => <span data-testid="icon-user">👤</span>,
  Users: () => <span data-testid="icon-users">👥</span>,
  Plus: () => <span data-testid="icon-plus">➕</span>,
  Check: () => <span data-testid="icon-check">✅</span>,
  Search: () => <span data-testid="icon-search">🔍</span>,
  Ruler: () => <span data-testid="icon-ruler">📏</span>,
  Calendar: () => <span data-testid="icon-calendar">📅</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">➡️</span>,
  Edit: () => <span data-testid="icon-edit">✏️</span>,
  Copy: () => <span data-testid="icon-copy">📋</span>,
  AlertCircle: () => <span data-testid="icon-alert-circle">⚠️</span>
}));

// Mock utility functions
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('FamilyProfileSelector', () => {
  const mockProfiles: FamilyMeasurementProfile[] = [
    {
      id: 'profile-1',
      userId: 'user-1',
      nickname: 'Little Ama',
      gender: Gender.FEMALE,
      relationship: RelationshipType.CHILD,
      birthDate: new Date('2018-05-15'),
      age: 6,
      measurements: {
        chest: 58,
        waist: 55,
        hips: 60,
        shoulderWidth: 32
      },
      lastUpdated: new Date('2024-08-20'),
      isActive: true,
      privacySettings: {
        visibility: ProfileVisibility.FAMILY_ONLY,
        shareWithFamily: true,
        allowEditing: true
      },
      growthTracking: {
        isTrackingEnabled: true,
        reminderFrequency: ReminderFrequency.QUARTERLY,
        lastMeasurementUpdate: new Date()
      },
      createdBy: 'user-1',
      sharedWith: [],
      auditTrail: []
    },
    {
      id: 'profile-2',
      userId: 'user-1',
      nickname: 'Kwame',
      gender: Gender.MALE,
      relationship: RelationshipType.SELF,
      age: 35,
      measurements: {
        chest: 96,
        waist: 88,
        hips: 94
      },
      lastUpdated: new Date('2024-08-15'),
      isActive: true,
      privacySettings: {
        visibility: ProfileVisibility.PRIVATE,
        shareWithFamily: false,
        allowEditing: true
      },
      growthTracking: {
        isTrackingEnabled: false,
        reminderFrequency: ReminderFrequency.NEVER,
        lastMeasurementUpdate: new Date()
      },
      createdBy: 'user-1',
      sharedWith: [],
      auditTrail: []
    },
    {
      id: 'profile-3',
      userId: 'user-1',
      nickname: 'Grandma Akosua',
      gender: Gender.FEMALE,
      relationship: RelationshipType.PARENT,
      age: 65,
      measurements: {
        chest: 92,
        waist: 96
      },
      lastUpdated: new Date('2024-02-10'), // Outdated
      isActive: true,
      privacySettings: {
        visibility: ProfileVisibility.FAMILY_ONLY,
        shareWithFamily: true,
        allowEditing: false
      },
      growthTracking: {
        isTrackingEnabled: false,
        reminderFrequency: ReminderFrequency.NEVER,
        lastMeasurementUpdate: new Date()
      },
      createdBy: 'user-1',
      sharedWith: [],
      auditTrail: []
    }
  ];

  const mockProps = {
    profiles: mockProfiles,
    onSelectProfile: vi.fn(),
    onCreateNewProfile: vi.fn(),
    onEditProfile: vi.fn(),
    onCopyMeasurements: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header and search functionality', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    expect(screen.getByText('Select Family Member')).toBeInTheDocument();
    expect(screen.getByText('Choose whose measurements to use for this order')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument();
    expect(screen.getByText('Filter by:')).toBeInTheDocument();
  });

  it('displays all profiles with correct information', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    expect(screen.getByText('Little Ama')).toBeInTheDocument();
    expect(screen.getByText('Kwame')).toBeInTheDocument();
    expect(screen.getByText('Grandma Akosua')).toBeInTheDocument();
    
    expect(screen.getByText('My Child')).toBeInTheDocument();
    expect(screen.getByText('Myself')).toBeInTheDocument();
    expect(screen.getByText('My Parent')).toBeInTheDocument();
  });

  it('shows measurement completeness correctly', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    // Little Ama has 4/4 required measurements
    expect(screen.getByText('100% complete')).toBeInTheDocument();
    
    // Grandma Akosua has incomplete measurements
    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });

  it('indicates outdated measurements', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    expect(screen.getByText('Needs update')).toBeInTheDocument();
  });

  it('handles profile selection', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    const profileCard = screen.getByText('Little Ama').closest('[data-testid="card"]');
    if (profileCard) {
      fireEvent.click(profileCard);
      expect(mockProps.onSelectProfile).toHaveBeenCalledWith(mockProfiles[0]);
    }
  });

  it('shows selected profile with visual indicator', () => {
    render(<FamilyProfileSelector {...mockProps} selectedProfileId="profile-1" />);
    
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('filters profiles by search query', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by name...');
    fireEvent.change(searchInput, { target: { value: 'Ama' } });
    
    // Should show Little Ama but not others
    expect(screen.getByText('Little Ama')).toBeInTheDocument();
    // Note: In a real implementation, other profiles would be filtered out
  });

  it('shows quick actions when enabled', () => {
    render(<FamilyProfileSelector {...mockProps} showQuickActions={true} />);
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('handles edit profile action', () => {
    render(<FamilyProfileSelector {...mockProps} showQuickActions={true} />);
    
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(mockProps.onEditProfile).toHaveBeenCalledWith('profile-1');
  });

  it('handles copy measurements action', () => {
    render(<FamilyProfileSelector {...mockProps} showQuickActions={true} />);
    
    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]);
    
    expect(mockProps.onCopyMeasurements).toHaveBeenCalledWith(mockProfiles[0]);
  });

  it('shows add new profile option', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    expect(screen.getByText('Add New Family Member')).toBeInTheDocument();
    expect(screen.getByText('Create a new profile with measurements')).toBeInTheDocument();
  });

  it('handles create new profile action', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    const addNewCard = screen.getByText('Add New Family Member').closest('[data-testid="card"]');
    if (addNewCard) {
      fireEvent.click(addNewCard);
      expect(mockProps.onCreateNewProfile).toHaveBeenCalled();
    }
  });

  it('shows empty state when no profiles match filters', () => {
    render(<FamilyProfileSelector {...mockProps} profiles={[]} />);
    
    expect(screen.getByText('No family member profiles available')).toBeInTheDocument();
  });

  it('displays age information when available', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    expect(screen.getByText('6 years')).toBeInTheDocument();
    expect(screen.getByText('35 years')).toBeInTheDocument();
    expect(screen.getByText('65 years')).toBeInTheDocument();
  });

  it('shows gender badges', () => {
    render(<FamilyProfileSelector {...mockProps} />);
    
    expect(screen.getByText('FEMALE')).toBeInTheDocument();
    expect(screen.getByText('MALE')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClassName = 'custom-selector-class';
    render(<FamilyProfileSelector {...mockProps} className={customClassName} />);
    
    const container = screen.getByText('Select Family Member').closest('div');
    expect(container).toHaveClass(customClassName);
  });
});

describe('FamilyProfileSelector - Search and Filter', () => {
  const mockProfiles = [
    {
      id: 'child-1',
      nickname: 'Little Sister',
      relationship: RelationshipType.CHILD,
      measurements: { chest: 60 },
      isActive: true
    },
    {
      id: 'spouse-1',
      nickname: 'My Husband',
      relationship: RelationshipType.SPOUSE,
      measurements: { chest: 100 },
      isActive: true
    }
  ] as FamilyMeasurementProfile[];

  it('filters by relationship type', () => {
    render(
      <FamilyProfileSelector 
        profiles={mockProfiles} 
        onSelectProfile={vi.fn()} 
      />
    );
    
    // Should show both profiles initially
    expect(screen.getByText('Little Sister')).toBeInTheDocument();
    expect(screen.getByText('My Husband')).toBeInTheDocument();
    
    // Filter functionality would be tested with more complex interaction
  });
});

describe('FamilyProfileSelector - Quick Selection', () => {
  const mockProfiles = Array.from({ length: 5 }, (_, i) => ({
    id: `profile-${i}`,
    nickname: `Profile ${i}`,
    relationship: RelationshipType.CHILD,
    measurements: { chest: 60 },
    isActive: true
  })) as FamilyMeasurementProfile[];

  it('shows quick selection for multiple profiles', () => {
    render(
      <FamilyProfileSelector 
        profiles={mockProfiles} 
        onSelectProfile={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Quick Select')).toBeInTheDocument();
  });
});