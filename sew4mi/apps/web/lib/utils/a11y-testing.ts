/**
 * Accessibility testing utilities for automated a11y validation
 * Integrates axe-core for comprehensive WCAG compliance testing
 */

import { configureAxe, toHaveNoViolations } from 'jest-axe';

// Configure axe-core for Ghana theme and family profile testing
const axeConfig = {
  rules: {
    // Enable all WCAG 2.1 AA and AAA rules
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'hidden-content': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },
    'tabindex': { enabled: true },
    
    // Ghana-specific customizations
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'heading-order': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'object-alt': { enabled: true },
    'select-name': { enabled: true },
    'server-side-image-map': { enabled: true },
    'valid-lang': { enabled: true },
  },
  
  // Tags to include in testing
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
  
  // Disable problematic rules for development
  disableOtherRules: false,
};

// Create configured axe instance
export const axe = configureAxe(axeConfig);

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Test accessibility violations for a component or page
 */
export async function testAccessibility(
  element: HTMLElement | Document = document,
  options: {
    rules?: Record<string, any>;
    tags?: string[];
    include?: string[][];
    exclude?: string[][];
  } = {}
) {
  const config = {
    ...axeConfig,
    ...options,
    rules: {
      ...axeConfig.rules,
      ...options.rules,
    },
  };

  const results = await axe(element, config);
  return results;
}

/**
 * Accessibility test presets for different component types
 */
export const A11yTestPresets = {
  // Form component testing
  form: {
    rules: {
      'label': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'duplicate-id-aria': { enabled: true },
      'aria-required-attr': { enabled: true },
      'aria-valid-attr-value': { enabled: true },
      'color-contrast': { enabled: true },
      'focus-order-semantics': { enabled: true },
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  },

  // Navigation component testing
  navigation: {
    rules: {
      'landmark-no-duplicate-main': { enabled: true },
      'landmark-one-main': { enabled: true },
      'page-has-heading-one': { enabled: true },
      'region': { enabled: true },
      'skip-link': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'link-name': { enabled: true },
      'button-name': { enabled: true },
    },
    tags: ['wcag2a', 'wcag2aa', 'best-practice'],
  },

  // Interactive components (buttons, cards, etc.)
  interactive: {
    rules: {
      'button-name': { enabled: true },
      'link-name': { enabled: true },
      'color-contrast': { enabled: true },
      'color-contrast-enhanced': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'keyboard': { enabled: true },
      'tabindex': { enabled: true },
      'aria-roles': { enabled: true },
      'aria-allowed-attr': { enabled: true },
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  },

  // Family profile specific testing
  familyProfiles: {
    rules: {
      'aria-valid-attr-value': { enabled: true },
      'button-name': { enabled: true },
      'color-contrast': { enabled: true },
      'duplicate-id': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      'heading-order': { enabled: true },
      'image-alt': { enabled: true },
      'label': { enabled: true },
      'landmark-complementary-is-top-level': { enabled: true },
      'link-name': { enabled: true },
      'list': { enabled: true },
      'listitem': { enabled: true },
      'region': { enabled: true },
      'tabindex': { enabled: true },
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
  },

  // Ghana theme color testing
  colorContrast: {
    rules: {
      'color-contrast': { enabled: true },
      'color-contrast-enhanced': { enabled: true },
    },
    tags: ['wcag2aa', 'wcag21aa'],
  },
};

/**
 * Quick accessibility test for components
 */
export async function quickA11yTest(
  element: HTMLElement,
  preset: keyof typeof A11yTestPresets = 'interactive'
) {
  const results = await testAccessibility(element, A11yTestPresets[preset]);
  
  // Return summary
  return {
    violations: results.violations.length,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    inaccessible: results.inaccessible.length,
    hasViolations: results.violations.length > 0,
    violationSummary: results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length,
    })),
  };
}

/**
 * Generate accessibility report
 */
export async function generateA11yReport(
  element: HTMLElement,
  componentName: string
): Promise<{
  component: string;
  timestamp: string;
  summary: {
    violations: number;
    passes: number;
    incomplete: number;
    total: number;
  };
  violations: Array<{
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    helpUrl: string;
    elements: number;
  }>;
  recommendations: string[];
}> {
  const results = await testAccessibility(element);
  
  const recommendations = [];
  if (results.violations.some(v => v.id === 'color-contrast')) {
    recommendations.push('Improve color contrast ratios to meet WCAG AA standards');
  }
  if (results.violations.some(v => v.id === 'label')) {
    recommendations.push('Add proper labels to all form controls');
  }
  if (results.violations.some(v => v.id === 'button-name')) {
    recommendations.push('Ensure all buttons have accessible names');
  }
  if (results.violations.some(v => v.id === 'aria-roles')) {
    recommendations.push('Review and correct ARIA roles implementation');
  }
  if (results.violations.some(v => v.id === 'keyboard')) {
    recommendations.push('Ensure all interactive elements are keyboard accessible');
  }

  return {
    component: componentName,
    timestamp: new Date().toISOString(),
    summary: {
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      total: results.violations.length + results.passes.length + results.incomplete.length,
    },
    violations: results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact as 'minor' | 'moderate' | 'serious' | 'critical',
      description: violation.description,
      helpUrl: violation.helpUrl,
      elements: violation.nodes.length,
    })),
    recommendations,
  };
}

/**
 * Continuous accessibility monitoring
 */
export class A11yMonitor {
  private observer: MutationObserver | null = null;
  private violations: Set<string> = new Set();

  constructor(private onViolation?: (violation: any) => void) {}

  start(element: HTMLElement = document.body) {
    this.observer = new MutationObserver(async (mutations) => {
      // Debounce testing to avoid excessive runs
      clearTimeout((this as any).testTimeout);
      (this as any).testTimeout = setTimeout(async () => {
        const results = await quickA11yTest(element);
        
        if (results.hasViolations) {
          results.violationSummary.forEach(violation => {
            if (!this.violations.has(violation.id)) {
              this.violations.add(violation.id);
              this.onViolation?.(violation);
            }
          });
        }
      }, 500);
    });

    this.observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
    });
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.violations.clear();
  }

  getViolations(): string[] {
    return Array.from(this.violations);
  }
}

/**
 * Helper functions for common testing scenarios
 */
export const A11yTestHelpers = {
  // Test form accessibility
  async testForm(formElement: HTMLElement) {
    return quickA11yTest(formElement, 'form');
  },

  // Test navigation accessibility
  async testNavigation(navElement: HTMLElement) {
    return quickA11yTest(navElement, 'navigation');
  },

  // Test family profile components
  async testFamilyProfile(profileElement: HTMLElement) {
    return quickA11yTest(profileElement, 'familyProfiles');
  },

  // Test color contrast
  async testColorContrast(element: HTMLElement) {
    return quickA11yTest(element, 'colorContrast');
  },

  // Comprehensive component test
  async testComponent(element: HTMLElement, componentName: string) {
    return generateA11yReport(element, componentName);
  },
};

/**
 * Development-time accessibility checker
 */
export function enableA11yDevCheck() {
  if (process.env.NODE_ENV === 'development') {
    Promise.all([
      import('@axe-core/react'),
      import('react'),
      import('react-dom')
    ]).then(([axe, React, ReactDOM]) => {
      axe.default(React.default, ReactDOM.default, 1000, axeConfig);
    });
  }
}

// For testing environments
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}