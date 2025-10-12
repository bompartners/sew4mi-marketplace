import React, { useEffect, useRef, useCallback, useState } from 'react';
import { 
  FocusTrap, 
  KeyboardNavigation, 
  announceToScreenReader,
  generateAccessibilityId,
  manageFocusVisible,
  prefersReducedMotion,
  isHighContrastMode
} from '@/lib/utils/accessibility';

/**
 * Focus management hook for modals and dialogs
 */
export const useFocusTrap = (isActive: boolean = false) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      focusTrapRef.current = new FocusTrap(containerRef.current);
      focusTrapRef.current.activate();
    }

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
        focusTrapRef.current = null;
      }
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Keyboard navigation hook for grid and list components
 */
export const useKeyboardNavigation = (
  itemSelector: string,
  options: {
    onSelect?: (item: HTMLElement) => void;
    gridNavigation?: boolean;
    columnsPerRow?: number;
    enabled?: boolean;
  } = {}
) => {
  const containerRef = useRef<HTMLElement>(null);
  const keyboardNavRef = useRef<KeyboardNavigation | null>(null);

  useEffect(() => {
    if (options.enabled !== false && containerRef.current) {
      keyboardNavRef.current = new KeyboardNavigation(containerRef.current, {
        itemSelector,
        ...options
      });
    }

    return () => {
      keyboardNavRef.current = null;
    };
  }, [itemSelector, options.enabled, options.gridNavigation, options.columnsPerRow]);

  return containerRef;
};

/**
 * Screen reader announcements hook
 */
export const useAnnouncement = () => {
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    announceToScreenReader(message, priority);
  }, []);

  return { announce };
};

/**
 * Unique ID generation hook for accessibility
 */
export const useAccessibilityId = (prefix: string): string => {
  const [id] = useState(() => generateAccessibilityId(prefix));
  return id;
};

/**
 * Accessibility preferences hook
 */
export const useAccessibilityPreferences = () => {
  const [preferences, setPreferences] = useState({
    reducedMotion: prefersReducedMotion(),
    highContrast: isHighContrastMode(),
    keyboardNavigation: false
  });

  useEffect(() => {
    // Set up media query listeners
    const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastMQ = window.matchMedia('(prefers-contrast: high)');
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
    };
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionMQ.addEventListener('change', handleReducedMotionChange);
    highContrastMQ.addEventListener('change', handleHighContrastChange);

    // Set up focus visible management
    const cleanupFocusVisible = manageFocusVisible();

    const handleKeyboardNavigation = () => {
      setPreferences(prev => ({ ...prev, keyboardNavigation: true }));
    };

    const handleMouseNavigation = () => {
      setPreferences(prev => ({ ...prev, keyboardNavigation: false }));
    };

    document.addEventListener('keydown', handleKeyboardNavigation);
    document.addEventListener('mousedown', handleMouseNavigation);

    return () => {
      reducedMotionMQ.removeEventListener('change', handleReducedMotionChange);
      highContrastMQ.removeEventListener('change', handleHighContrastChange);
      document.removeEventListener('keydown', handleKeyboardNavigation);
      document.removeEventListener('mousedown', handleMouseNavigation);
      cleanupFocusVisible();
    };
  }, []);

  return preferences;
};

/**
 * Focus management hook for complex components
 */
export const useFocusManagement = () => {
  const focusElement = useCallback((selector: string | HTMLElement) => {
    let element: HTMLElement | null = null;
    
    if (typeof selector === 'string') {
      element = document.querySelector(selector);
    } else {
      element = selector;
    }

    if (element) {
      // Small delay to ensure element is ready
      setTimeout(() => {
        element?.focus();
      }, 100);
    }
  }, []);

  const focusFirstInteractive = useCallback((container: HTMLElement) => {
    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    for (const selector of selectors) {
      const element = container.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
        break;
      }
    }
  }, []);

  const focusLastInteractive = useCallback((container: HTMLElement) => {
    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    const elements = container.querySelectorAll(selectors.join(', '));
    const lastElement = elements[elements.length - 1] as HTMLElement;
    if (lastElement) {
      lastElement.focus();
    }
  }, []);

  return {
    focusElement,
    focusFirstInteractive,
    focusLastInteractive
  };
};

/**
 * Accessible form validation hook
 */
export const useAccessibleFormValidation = () => {
  const { announce } = useAnnouncement();

  const announceErrors = useCallback((errors: Record<string, string[]>) => {
    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      const message = errorCount === 1 
        ? 'There is 1 error in the form. Please review and correct it.'
        : `There are ${errorCount} errors in the form. Please review and correct them.`;
      
      announce(message, 'assertive');
    }
  }, [announce]);

  const announceFieldError = useCallback((fieldName: string, error: string) => {
    announce(`${fieldName}: ${error}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(message, 'polite');
  }, [announce]);

  return {
    announceErrors,
    announceFieldError,
    announceSuccess
  };
};

/**
 * Skip link navigation hook
 */
export const useSkipLinks = (skipLinks: Array<{ id: string; label: string }>) => {
  const skipToContent = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const SkipLinks = () => {
    return (
      <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-0 focus-within:left-0 focus-within:z-50 focus-within:bg-white focus-within:border focus-within:p-2">
        {skipLinks.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => skipToContent(id)}
            className="block mb-2 text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Skip to {label}
          </button>
        ))}
      </div>
    );
  };

  return { SkipLinks, skipToContent };
};