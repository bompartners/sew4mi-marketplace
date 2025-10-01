/**
 * DesignSuggestionTool Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DesignSuggestionTool } from '@/components/features/tailors/DesignSuggestionTool';
import { EventType } from '@sew4mi/shared/types/group-order';

describe('DesignSuggestionTool', () => {
  it('renders with cultural event templates', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={EventType.WEDDING}
      />
    );
    
    expect(screen.getByText('Design Suggestion Tool')).toBeInTheDocument();
    expect(screen.getByText('Traditional Ghanaian Wedding')).toBeInTheDocument();
    expect(screen.getByText('Funeral/Memorial Service')).toBeInTheDocument();
    expect(screen.getByText('Naming Ceremony (Outdooring)')).toBeInTheDocument();
  });

  it('pre-selects template based on event type', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={EventType.FUNERAL}
      />
    );
    
    // Funeral template should be pre-selected (indicated by checkmark)
    const funeralCard = screen.getByText('Funeral/Memorial Service').closest('div');
    expect(funeralCard).toBeInTheDocument();
  });

  it('displays template guidelines when selected', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={null}
      />
    );
    
    // Click on wedding template
    const weddingTemplate = screen.getByText('Traditional Ghanaian Wedding');
    fireEvent.click(weddingTemplate.closest('div') as Element);
    
    // Should show template details
    expect(screen.getByText('Template Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Recommended Colors')).toBeInTheDocument();
    expect(screen.getByText(/Gold/i)).toBeInTheDocument();
  });

  it('shows colors to avoid for certain events', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={EventType.WEDDING}
      />
    );
    
    // Select wedding template
    const weddingTemplate = screen.getByText('Traditional Ghanaian Wedding');
    fireEvent.click(weddingTemplate.closest('div') as Element);
    
    // Wedding should show black as color to avoid
    expect(screen.getByText('Colors to Avoid')).toBeInTheDocument();
    expect(screen.getByText(/Black/i)).toBeInTheDocument();
  });

  it('displays traditional patterns for templates that have them', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={EventType.WEDDING}
      />
    );
    
    const weddingTemplate = screen.getByText('Traditional Ghanaian Wedding');
    fireEvent.click(weddingTemplate.closest('div') as Element);
    
    expect(screen.getByText('Traditional Patterns')).toBeInTheDocument();
    expect(screen.getByText(/Kente weave/i)).toBeInTheDocument();
  });

  it('allows entering design suggestion text', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={null}
      />
    );
    
    const textarea = screen.getByPlaceholderText(/Describe your design recommendations/i);
    fireEvent.change(textarea, { target: { value: 'Coordinated gold and blue outfits' } });
    
    expect(textarea).toHaveValue('Coordinated gold and blue outfits');
  });

  it('requires primary color to be filled', () => {
    const onSubmit = vi.fn();
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={null}
        onSubmit={onSubmit}
      />
    );
    
    const textarea = screen.getByPlaceholderText(/Describe your design recommendations/i);
    fireEvent.change(textarea, { target: { value: 'Test suggestion' } });
    
    const submitButton = screen.getByRole('button', { name: /Send Design Suggestion/i });
    fireEvent.click(submitButton);
    
    // Should not submit without primary color
    expect(submitButton).toBeDisabled();
  });

  it('allows entering color palette', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={null}
      />
    );
    
    const primaryColorInput = screen.getByLabelText(/Primary Color/i);
    const secondaryColorInput = screen.getByLabelText(/Secondary Color/i);
    const accentColorInput = screen.getByLabelText(/Accent Color/i);
    
    fireEvent.change(primaryColorInput, { target: { value: 'Royal Blue' } });
    fireEvent.change(secondaryColorInput, { target: { value: 'Gold' } });
    fireEvent.change(accentColorInput, { target: { value: 'White' } });
    
    expect(primaryColorInput).toHaveValue('Royal Blue');
    expect(secondaryColorInput).toHaveValue('Gold');
    expect(accentColorInput).toHaveValue('White');
  });

  it('calls onSubmit with correct data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={EventType.WEDDING}
        onSubmit={onSubmit}
      />
    );
    
    // Fill in the form
    const textarea = screen.getByPlaceholderText(/Describe your design recommendations/i);
    fireEvent.change(textarea, { target: { value: 'Beautiful coordinated design' } });
    
    const primaryColorInput = screen.getByLabelText(/Primary Color/i);
    fireEvent.change(primaryColorInput, { target: { value: 'Royal Blue' } });
    
    const submitButton = screen.getByRole('button', { name: /Send Design Suggestion/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          groupOrderId: 'group-1',
          suggestionText: 'Beautiful coordinated design',
          colorPalette: expect.objectContaining({
            primary: 'Royal Blue'
          })
        })
      );
    });
  });

  it('shows loading state when submitting', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={null}
        isSubmitting={true}
        onSubmit={vi.fn()}
      />
    );
    
    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('displays pro tip about design guidance', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={null}
      />
    );
    
    expect(screen.getByText(/Pro Tip/i)).toBeInTheDocument();
    expect(screen.getByText(/fabric recommendations/i)).toBeInTheDocument();
  });

  it('auto-populates suggestion text when template is selected', () => {
    render(
      <DesignSuggestionTool
        groupOrderId="group-1"
        eventType={null}
      />
    );
    
    const funeralTemplate = screen.getByText('Funeral/Memorial Service');
    fireEvent.click(funeralTemplate.closest('div') as Element);
    
    const textarea = screen.getByPlaceholderText(/Describe your design recommendations/i);
    expect((textarea as HTMLTextAreaElement).value).toContain('Cultural Context');
  });
});

