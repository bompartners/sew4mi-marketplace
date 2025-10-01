/**
 * Accessibility utilities for enhanced user experience
 * Focus management, keyboard navigation, and screen reader support
 */

/**
 * Focus trap utility for modal dialogs and complex components
 */
export class FocusTrap {
  private focusableElements: HTMLElement[] = [];
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previouslyFocused: HTMLElement | null = null;

  constructor(private container: HTMLElement) {
    this.updateFocusableElements();
  }

  private updateFocusableElements() {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    this.focusableElements = Array.from(
      this.container.querySelectorAll(selectors.join(', '))
    ) as HTMLElement[];

    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  activate() {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.container.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // Focus first element
    if (this.firstFocusable) {
      this.firstFocusable.focus();
    }
  }

  deactivate() {
    this.container.removeEventListener('keydown', this.handleKeydown.bind(this));
    
    // Restore focus
    if (this.previouslyFocused) {
      this.previouslyFocused.focus();
    }
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === this.firstFocusable) {
          event.preventDefault();
          this.lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === this.lastFocusable) {
          event.preventDefault();
          this.firstFocusable?.focus();
        }
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.deactivate();
    }
  }
}

/**
 * Keyboard navigation utilities for grid and list components
 */
export class KeyboardNavigation {
  constructor(
    private container: HTMLElement,
    private options: {
      itemSelector: string;
      onSelect?: (item: HTMLElement) => void;
      gridNavigation?: boolean;
      columnsPerRow?: number;
    }
  ) {
    this.container.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private getItems(): HTMLElement[] {
    return Array.from(
      this.container.querySelectorAll(this.options.itemSelector)
    ) as HTMLElement[];
  }

  private getCurrentIndex(): number {
    const items = this.getItems();
    const activeElement = document.activeElement as HTMLElement;
    return items.findIndex(item => item.contains(activeElement));
  }

  private focusItem(index: number) {
    const items = this.getItems();
    const item = items[index];
    if (item) {
      const focusableChild = item.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (focusableChild) {
        focusableChild.focus();
      } else {
        item.focus();
      }
    }
  }

  private handleKeydown(event: KeyboardEvent) {
    const items = this.getItems();
    const currentIndex = this.getCurrentIndex();
    
    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.options.gridNavigation && this.options.columnsPerRow) {
          newIndex = Math.min(currentIndex + this.options.columnsPerRow, items.length - 1);
        } else {
          newIndex = Math.min(currentIndex + 1, items.length - 1);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.options.gridNavigation && this.options.columnsPerRow) {
          newIndex = Math.max(currentIndex - this.options.columnsPerRow, 0);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }
        break;

      case 'ArrowRight':
        if (this.options.gridNavigation) {
          event.preventDefault();
          newIndex = Math.min(currentIndex + 1, items.length - 1);
        }
        break;

      case 'ArrowLeft':
        if (this.options.gridNavigation) {
          event.preventDefault();
          newIndex = Math.max(currentIndex - 1, 0);
        }
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.options.onSelect) {
          this.options.onSelect(items[currentIndex]);
        } else {
          // Click the focused element
          const focusedElement = document.activeElement as HTMLElement;
          if (focusedElement) {
            focusedElement.click();
          }
        }
        return;
    }

    if (newIndex !== currentIndex) {
      this.focusItem(newIndex);
    }
  }
}

/**
 * Screen reader announcements
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Generate unique IDs for accessibility
 */
let idCounter = 0;
export const generateAccessibilityId = (prefix: string): string => {
  return `${prefix}-${idCounter++}-${Date.now()}`;
};

/**
 * Validate color contrast ratio
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    // Simple RGB to luminance calculation
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map(c => {
      const normalized = parseInt(c) / 255;
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fgLuminance = getLuminance(foreground);
  const bgLuminance = getLuminance(background);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast meets WCAG guidelines
 */
export const meetsContrastRequirements = (
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  
  // AA level
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * High contrast mode detection
 */
export const isHighContrastMode = (): boolean => {
  // Check for Windows High Contrast Mode
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    return true;
  }
  
  // Additional check for older browsers
  if (window.matchMedia('(-ms-high-contrast: active)').matches) {
    return true;
  }
  
  return false;
};

/**
 * Reduced motion preference detection
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Focus visible utility for better focus management
 */
export const manageFocusVisible = () => {
  let isKeyboardNavigation = false;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab' || event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Enter' ||
        event.key === ' ' || event.key === 'Home' || event.key === 'End') {
      isKeyboardNavigation = true;
      document.body.classList.add('keyboard-navigation');
    }
  };

  const handleMouseDown = () => {
    isKeyboardNavigation = false;
    document.body.classList.remove('keyboard-navigation');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
  };
};