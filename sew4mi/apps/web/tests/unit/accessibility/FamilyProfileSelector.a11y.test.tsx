/**
 * Accessibility tests for FamilyProfileSelector component
 * Tests WCAG compliance, keyboard navigation, and screen reader compatibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyProfileSelector } from '@/components/features/orders/FamilyProfileSelector';
import { AccessibilityProvider } from '@/components/ui/AccessibilityProvider';
import { A11yTestHelpers, testAccessibility } from '@/lib/utils/a11y-testing';
import { FamilyMeasurementProfile, RelationshipType } from '@sew4mi/shared/types/family-profiles';
import { Gender } from '@sew4mi/shared/types/order-creation';

// Mock data for testing
const mockProfiles: FamilyMeasurementProfile[] = [
  {
    id: 'profile-1',
    userId: 'user-1',
    nickname: 'Kofi - School',
    relationship: RelationshipType.CHILD,
    birthDate: new Date('2015-06-15'),
    age: 9,
    gender: Gender.MALE,
    measurements: {
      chest: 70,
      waist: 65,
      hips: 68,
      shoulderWidth: 35,
      armLength: 45,
    },
    lastUpdated: new Date('2024-06-01'),
    isActive: true,
    privacySettings: {
      visibility: 'FAMILY_ONLY',
      shareWithFamily: true,
      allowEditing: false,
    },
    growthTracking: {
      lastMeasurementUpdate: new Date('2024-06-01'),
      reminderFrequency: 'QUARTERLY',
      nextReminderDate: new Date('2024-09-01'),
    },
  },
  {
    id: 'profile-2',
    userId: 'user-1',
    nickname: 'Ama - Work',
    relationship: RelationshipType.SELF,
    age: 35,
    gender: Gender.FEMALE,
    measurements: {
      chest: 90,
      waist: 75,
      hips: 95,
      shoulderWidth: 42,
      armLength: 55,
    },
    lastUpdated: new Date('2024-07-15'),
    isActive: true,
    privacySettings: {
      visibility: 'PRIVATE',
      shareWithFamily: false,
      allowEditing: true,
    },
    growthTracking: {
      lastMeasurementUpdate: new Date('2024-07-15'),
      reminderFrequency: 'BIANNUALLY',
    },
  },
];

const defaultProps = {
  profiles: mockProfiles,
  selectedProfileId: undefined,
  onSelectProfile: jest.fn(),
  onCreateNewProfile: jest.fn(),
  onEditProfile: jest.fn(),
  onCopyMeasurements: jest.fn(),
};

// Test wrapper with accessibility provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('FamilyProfileSelector Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any live regions
    const liveRegions = document.querySelectorAll('[aria-live]');
    liveRegions.forEach(region => region.remove());
  });

  describe('WCAG Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const results = await testAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass family profile specific accessibility tests', async () => {
      const { container } = render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const results = await A11yTestHelpers.testFamilyProfile(container);
      expect(results.hasViolations).toBe(false);
    });

    it('should meet color contrast requirements', async () => {
      const { container } = render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const results = await A11yTestHelpers.testColorContrast(container);
      expect(results.hasViolations).toBe(false);
    });
  });

  describe('Semantic Structure', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const mainHeading = screen.getByRole('heading', { level: 3 });
      expect(mainHeading).toHaveTextContent('Select Family Member');
    });

    it('should have proper landmarks and regions', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should have descriptive content for screen readers', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Choose whose measurements to use/)).toBeInTheDocument();
      expect(screen.getByText(/2 profiles available/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through interactive elements', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/Search family members by name/);
      const filterSelect = screen.getByLabelText(/Filter family members by relationship type/);
      const firstProfile = screen.getAllByRole('radio')[0];

      // Tab through elements
      await user.tab();
      expect(searchInput).toHaveFocus();

      await user.tab();
      expect(filterSelect).toHaveFocus();

      await user.tab();
      expect(firstProfile).toHaveFocus();
    });

    it('should support arrow key navigation in profile grid', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const profiles = screen.getAllByRole('radio');
      const firstProfile = profiles[0];

      // Focus first profile
      firstProfile.focus();
      expect(firstProfile).toHaveFocus();

      // Arrow down should move to next profile
      await user.keyboard('{ArrowDown}');
      expect(profiles[1]).toHaveFocus();

      // Arrow up should move back
      await user.keyboard('{ArrowUp}');
      expect(firstProfile).toHaveFocus();
    });

    it('should support Enter and Space key selection', async () => {
      const user = userEvent.setup();
      const onSelectProfile = jest.fn();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector 
            {...defaultProps} 
            onSelectProfile={onSelectProfile}
          />
        </TestWrapper>
      );

      const firstProfile = screen.getAllByRole('radio')[0];
      firstProfile.focus();

      // Enter should select profile
      await user.keyboard('{Enter}');
      expect(onSelectProfile).toHaveBeenCalledWith(mockProfiles[0]);

      // Space should also select profile
      await user.keyboard(' ');
      expect(onSelectProfile).toHaveBeenCalledTimes(2);
    });

    it('should support Home and End key navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const profiles = screen.getAllByRole('radio');
      const firstProfile = profiles[0];
      const lastProfile = profiles[profiles.length - 1];

      // Focus middle profile
      profiles[0].focus();

      // End should go to last profile
      await user.keyboard('{End}');
      expect(lastProfile).toHaveFocus();

      // Home should go to first profile
      await user.keyboard('{Home}');
      expect(firstProfile).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      // Check main container
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toHaveAttribute('aria-labelledby', 'family-selector-heading');

      // Check search input
      const searchInput = screen.getByLabelText(/Search family members by name/);
      expect(searchInput).toHaveAttribute('aria-describedby');

      // Check filter select
      const filterSelect = screen.getByLabelText(/Filter family members by relationship type/);
      expect(filterSelect).toHaveAttribute('aria-describedby');
    });

    it('should have proper radio group labeling', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'family-selector-heading');
      expect(radioGroup).toHaveAttribute('aria-describedby', 'family-selector-description');
    });

    it('should provide profile summaries for screen readers', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      // Check for screen reader only content
      const profileSummaries = document.querySelectorAll('.sr-only');
      expect(profileSummaries.length).toBeGreaterThan(0);

      // Verify content includes key information
      const summaryText = Array.from(profileSummaries)
        .map(el => el.textContent)
        .join(' ');
      
      expect(summaryText).toContain('Kofi - School');
      expect(summaryText).toContain('My Child');
      expect(summaryText).toContain('measurements');
      expect(summaryText).toContain('complete');
    });

    it('should announce filter changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const filterSelect = screen.getByLabelText(/Filter family members by relationship type/);
      
      // Change filter
      await user.selectOptions(filterSelect, 'CHILD');

      // Check for live region announcement
      await user.waitFor(() => {
        const liveRegions = document.querySelectorAll('[aria-live]');
        const announcements = Array.from(liveRegions).map(el => el.textContent);
        const hasFilterAnnouncement = announcements.some(text => 
          text?.includes('found') && text?.includes('filtered')
        );
        expect(hasFilterAnnouncement).toBe(true);
      });
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/Search family members by name/);
      searchInput.focus();

      // Check for focus styles (the exact implementation may vary)
      expect(searchInput).toHaveFocus();
      
      // In a real test, you might check computed styles or CSS classes
      const styles = window.getComputedStyle(searchInput);
      // This would depend on your actual focus styling implementation
    });

    it('should manage focus for card interactions', async () => {
      const user = userEvent.setup();
      const onEditProfile = jest.fn();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector 
            {...defaultProps} 
            onEditProfile={onEditProfile}
          />
        </TestWrapper>
      );

      // Find edit button
      const editButtons = screen.getAllByLabelText(/Edit profile for/);
      const firstEditButton = editButtons[0];

      // Click edit button
      await user.click(firstEditButton);

      expect(onEditProfile).toHaveBeenCalled();
    });
  });

  describe('Error States and Empty States', () => {
    it('should handle empty state accessibly', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector 
            {...defaultProps} 
            profiles={[]}
          />
        </TestWrapper>
      );

      const emptyState = screen.getByRole('status');
      expect(emptyState).toHaveAttribute('aria-live', 'polite');
      
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toHaveTextContent(/No family profiles yet/);
    });

    it('should handle filtered empty state accessibly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText(/Search family members by name/);
      await user.type(searchInput, 'nonexistent');

      const emptyState = screen.getByRole('status');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Interactive Elements', () => {
    it('should have accessible button names', () => {
      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      // Check all buttons have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const accessibleName = button.getAttribute('aria-label') || 
                              button.textContent?.trim() ||
                              button.getAttribute('title');
        expect(accessibleName).toBeTruthy();
      });
    });

    it('should support add new profile interaction', async () => {
      const user = userEvent.setup();
      const onCreateNewProfile = jest.fn();
      
      render(
        <TestWrapper>
          <FamilyProfileSelector 
            {...defaultProps} 
            onCreateNewProfile={onCreateNewProfile}
          />
        </TestWrapper>
      );

      const addButton = screen.getByLabelText(/Add new family member profile/);
      
      // Should be keyboard accessible
      addButton.focus();
      await user.keyboard('{Enter}');
      expect(onCreateNewProfile).toHaveBeenCalled();

      // Should also work with Space
      await user.keyboard(' ');
      expect(onCreateNewProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('High Contrast Mode', () => {
    it('should work in high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => {
          if (query === '(prefers-contrast: high)') {
            return {
              matches: true,
              media: query,
              onchange: null,
              addListener: jest.fn(),
              removeListener: jest.fn(),
              addEventListener: jest.fn(),
              removeEventListener: jest.fn(),
              dispatchEvent: jest.fn(),
            };
          }
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          };
        }),
      });

      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      // In high contrast mode, the component should still be functional
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => {
          if (query === '(prefers-reduced-motion: reduce)') {
            return {
              matches: true,
              media: query,
              onchange: null,
              addListener: jest.fn(),
              removeListener: jest.fn(),
              addEventListener: jest.fn(),
              removeEventListener: jest.fn(),
              dispatchEvent: jest.fn(),
            };
          }
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          };
        }),
      });

      render(
        <TestWrapper>
          <FamilyProfileSelector {...defaultProps} />
        </TestWrapper>
      );

      // Component should function normally even with reduced motion
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});