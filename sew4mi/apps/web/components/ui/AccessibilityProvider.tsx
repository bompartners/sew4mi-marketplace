'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccessibilityPreferences, useAnnouncement } from '@/hooks/useAccessibility';

interface AccessibilityContextType {
  preferences: {
    reducedMotion: boolean;
    highContrast: boolean;
    keyboardNavigation: boolean;
  };
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  skipLinks: Array<{ id: string; label: string }>;
  addSkipLink: (id: string, label: string) => void;
  removeSkipLink: (id: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const preferences = useAccessibilityPreferences();
  const { announce } = useAnnouncement();
  const [skipLinks, setSkipLinks] = useState<Array<{ id: string; label: string }>>([]);

  const addSkipLink = (id: string, label: string) => {
    setSkipLinks(prev => {
      const exists = prev.some(link => link.id === id);
      if (!exists) {
        return [...prev, { id, label }];
      }
      return prev;
    });
  };

  const removeSkipLink = (id: string) => {
    setSkipLinks(prev => prev.filter(link => link.id !== id));
  };

  // Add global CSS classes based on preferences
  useEffect(() => {
    const body = document.body;
    
    // Reduced motion
    if (preferences.reducedMotion) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }

    // High contrast
    if (preferences.highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    // Keyboard navigation
    if (preferences.keyboardNavigation) {
      body.classList.add('keyboard-navigation');
    } else {
      body.classList.remove('keyboard-navigation');
    }
  }, [preferences]);

  const contextValue: AccessibilityContextType = {
    preferences,
    announce,
    skipLinks,
    addSkipLink,
    removeSkipLink
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip Links */}
      <SkipLinksComponent skipLinks={skipLinks} />
      
      {/* Screen Reader Styles */}
      <style jsx global>{`
        .sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        .sr-only-focusable:focus,
        .sr-only-focusable:active {
          position: static !important;
          width: auto !important;
          height: auto !important;
          padding: inherit !important;
          margin: inherit !important;
          overflow: visible !important;
          clip: auto !important;
          white-space: inherit !important;
        }

        /* Reduced motion styles */
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }

        /* High contrast styles */
        .high-contrast {
          filter: contrast(150%);
        }

        .high-contrast button:focus,
        .high-contrast input:focus,
        .high-contrast select:focus,
        .high-contrast textarea:focus {
          outline: 3px solid #000 !important;
          outline-offset: 2px !important;
        }

        /* Keyboard navigation styles */
        .keyboard-navigation button:focus,
        .keyboard-navigation a:focus,
        .keyboard-navigation input:focus,
        .keyboard-navigation select:focus,
        .keyboard-navigation textarea:focus,
        .keyboard-navigation [tabindex]:focus {
          outline: 2px solid #2563eb !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
        }

        /* Focus visible for better UX */
        .keyboard-navigation .focus\:ring-2:focus {
          --tw-ring-shadow: 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
          box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
        }
      `}</style>
      
      {children}
    </AccessibilityContext.Provider>
  );
};

interface SkipLinksComponentProps {
  skipLinks: Array<{ id: string; label: string }>;
}

const SkipLinksComponent: React.FC<SkipLinksComponentProps> = ({ skipLinks }) => {
  const skipToContent = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (skipLinks.length === 0) return null;

  return (
    <nav 
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-0 focus-within:left-0 focus-within:z-50 focus-within:bg-white focus-within:border focus-within:border-gray-300 focus-within:rounded focus-within:p-4 focus-within:shadow-lg"
      aria-label="Skip links"
    >
      <h2 className="text-lg font-medium mb-2">Skip to:</h2>
      <ul className="space-y-2">
        {skipLinks.map(({ id, label }) => (
          <li key={id}>
            <button
              onClick={() => skipToContent(id)}
              className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};