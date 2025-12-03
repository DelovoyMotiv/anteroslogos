/**
 * Keyboard Navigation Utilities
 * Property 30: Keyboard Accessibility - Validates Requirements 6.5
 * 
 * Provides utilities for implementing keyboard navigation and focus management
 * across the application.
 */

/**
 * Focus trap for modal dialogs and overlays
 * Keeps focus within a container when Tab/Shift+Tab is pressed
 */
export class FocusTrap {
  private container: HTMLElement;
  private focusableElements: HTMLElement[] = [];
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previouslyFocused: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.updateFocusableElements();
  }

  /**
   * Query for all focusable elements within the container
   */
  private updateFocusableElements(): void {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll<HTMLElement>(selector)
    ).filter(el => {
      // Filter out hidden elements
      return el.offsetParent !== null;
    });

    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.updateFocusableElements();
    
    // Focus first element
    if (this.firstFocusable) {
      this.firstFocusable.focus();
    }

    // Add event listener
    this.container.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Deactivate the focus trap and restore previous focus
   */
  deactivate(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    
    // Restore focus
    if (this.previouslyFocused && this.previouslyFocused.focus) {
      this.previouslyFocused.focus();
    }
  }

  /**
   * Handle Tab and Shift+Tab to trap focus
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    this.updateFocusableElements();

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  };
}

/**
 * Roving tabindex for managing focus in lists and grids
 * Only one item is in tab order at a time, arrow keys move focus
 */
export class RovingTabIndex {
  private container: HTMLElement;
  private items: HTMLElement[] = [];
  private currentIndex: number = 0;
  private orientation: 'horizontal' | 'vertical' | 'both';

  constructor(
    container: HTMLElement,
    orientation: 'horizontal' | 'vertical' | 'both' = 'vertical'
  ) {
    this.container = container;
    this.orientation = orientation;
    this.updateItems();
    this.activate();
  }

  /**
   * Update the list of items
   */
  private updateItems(): void {
    const selector = '[role="option"], [role="tab"], [role="menuitem"], [data-roving-item]';
    this.items = Array.from(this.container.querySelectorAll<HTMLElement>(selector));
    
    // Set initial tabindex
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }

  /**
   * Activate roving tabindex
   */
  activate(): void {
    this.container.addEventListener('keydown', this.handleKeyDown);
    this.items.forEach(item => {
      item.addEventListener('focus', this.handleFocus);
    });
  }

  /**
   * Deactivate roving tabindex
   */
  deactivate(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    this.items.forEach(item => {
      item.removeEventListener('focus', this.handleFocus);
    });
  }

  /**
   * Handle arrow key navigation
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    const { key } = e;
    let handled = false;

    if (this.orientation === 'vertical' || this.orientation === 'both') {
      if (key === 'ArrowDown') {
        this.focusNext();
        handled = true;
      } else if (key === 'ArrowUp') {
        this.focusPrevious();
        handled = true;
      }
    }

    if (this.orientation === 'horizontal' || this.orientation === 'both') {
      if (key === 'ArrowRight') {
        this.focusNext();
        handled = true;
      } else if (key === 'ArrowLeft') {
        this.focusPrevious();
        handled = true;
      }
    }

    if (key === 'Home') {
      this.focusFirst();
      handled = true;
    } else if (key === 'End') {
      this.focusLast();
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /**
   * Handle focus events to update current index
   */
  private handleFocus = (e: FocusEvent): void => {
    const target = e.target as HTMLElement;
    const index = this.items.indexOf(target);
    if (index !== -1) {
      this.setFocusedIndex(index);
    }
  };

  /**
   * Set the focused index and update tabindex
   */
  private setFocusedIndex(index: number): void {
    this.items.forEach((item, i) => {
      item.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    this.currentIndex = index;
  }

  /**
   * Focus the next item
   */
  private focusNext(): void {
    const nextIndex = (this.currentIndex + 1) % this.items.length;
    this.items[nextIndex]?.focus();
  }

  /**
   * Focus the previous item
   */
  private focusPrevious(): void {
    const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.items[prevIndex]?.focus();
  }

  /**
   * Focus the first item
   */
  private focusFirst(): void {
    this.items[0]?.focus();
  }

  /**
   * Focus the last item
   */
  private focusLast(): void {
    this.items[this.items.length - 1]?.focus();
  }
}

/**
 * Skip link for keyboard users to bypass navigation
 */
export const createSkipLink = (targetId: string, label: string = 'Skip to main content'): HTMLAnchorElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;
  
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });
  
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  
  return skipLink;
};

/**
 * Announce to screen readers using ARIA live region
 */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  let liveRegion = document.getElementById('aria-live-region');
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
  }
  
  // Clear and set message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion!.textContent = message;
  }, 100);
};

/**
 * Check if an element is visible and focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  // Check if element is disabled
  if (element.hasAttribute('disabled')) return false;
  
  // Check if element is aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') return false;
  
  // Check tabindex
  const tabindex = element.getAttribute('tabindex');
  if (tabindex === '-1') return false;
  
  // Check if element is visible (offsetParent check)
  // Note: In jsdom, offsetParent may not work correctly, so we also check display style
  if (element.offsetParent === null && element.style.display !== '') {
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return false;
    }
  }
  
  return true;
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector))
    .filter(isFocusable);
};

/**
 * Keyboard event helpers
 */
export const isEnterKey = (e: KeyboardEvent): boolean => e.key === 'Enter';
export const isSpaceKey = (e: KeyboardEvent): boolean => e.key === ' ' || e.key === 'Spacebar';
export const isEscapeKey = (e: KeyboardEvent): boolean => e.key === 'Escape' || e.key === 'Esc';
export const isActivationKey = (e: KeyboardEvent): boolean => isEnterKey(e) || isSpaceKey(e);

/**
 * Make a non-interactive element keyboard accessible
 */
export const makeKeyboardAccessible = (
  element: HTMLElement,
  onClick: (e: Event) => void,
  role: string = 'button'
): void => {
  element.setAttribute('role', role);
  element.setAttribute('tabindex', '0');
  
  element.addEventListener('click', onClick);
  element.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isActivationKey(e)) {
      e.preventDefault();
      onClick(e);
    }
  });
};
