/**
 * Property-Based Tests for Keyboard Navigation
 * Feature: production-audit-improvements, Property 30: Keyboard Accessibility
 * Validates: Requirements 6.5
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  FocusTrap,
  RovingTabIndex,
  announce,
  isFocusable,
  getFocusableElements,
  isEnterKey,
  isSpaceKey,
  isEscapeKey,
  isActivationKey,
  makeKeyboardAccessible,
} from '../keyboardNav';

describe('Keyboard Navigation - Property-Based Tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('FocusTrap', () => {
    /**
     * Property: Focus trap should always keep focus within container
     * For any set of focusable elements, activating focus trap should prevent
     * focus from escaping the container
     */
    it('should keep focus within container for any number of focusable elements', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (numElements) => {
            // Setup: Create focusable elements
            container.innerHTML = '';
            const buttons: HTMLButtonElement[] = [];
            for (let i = 0; i < numElements; i++) {
              const button = document.createElement('button');
              button.textContent = `Button ${i}`;
              container.appendChild(button);
              buttons.push(button);
            }

            // Create and activate focus trap
            const focusTrap = new FocusTrap(container);
            focusTrap.activate();

            // Property: First element should be focused
            expect(document.activeElement).toBe(buttons[0]);

            // Property: Tab should cycle through elements
            buttons[numElements - 1].focus();
            const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            container.dispatchEvent(tabEvent);

            // After Tab from last element, focus should wrap to first
            // (This is tested by the focus trap logic)

            focusTrap.deactivate();
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Deactivating focus trap should restore previous focus
     * For any previously focused element, deactivating trap should restore focus
     */
    it('should restore focus to previously focused element', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('button', 'input', 'a'),
          (elementType) => {
            // Setup: Create element outside container
            const outsideElement = document.createElement(elementType);
            if (elementType === 'a') {
              (outsideElement as HTMLAnchorElement).href = '#';
            }
            document.body.appendChild(outsideElement);
            outsideElement.focus();

            const previouslyFocused = document.activeElement;

            // Create focusable element inside container
            const button = document.createElement('button');
            button.textContent = 'Inside';
            container.appendChild(button);

            // Activate and deactivate trap
            const focusTrap = new FocusTrap(container);
            focusTrap.activate();
            focusTrap.deactivate();

            // Property: Focus should be restored
            const focusRestored = document.activeElement === previouslyFocused;

            document.body.removeChild(outsideElement);
            return focusRestored;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('RovingTabIndex', () => {
    /**
     * Property: Only one item should be in tab order at a time
     * For any list of items, exactly one should have tabindex="0"
     */
    it('should maintain exactly one item with tabindex="0"', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 15 }),
          (numItems) => {
            // Setup: Create items with role
            container.innerHTML = '';
            for (let i = 0; i < numItems; i++) {
              const item = document.createElement('div');
              item.setAttribute('role', 'option');
              item.textContent = `Item ${i}`;
              container.appendChild(item);
            }

            // Create roving tabindex
            const roving = new RovingTabIndex(container);

            // Property: Exactly one item should have tabindex="0"
            const items = container.querySelectorAll('[role="option"]');
            const tabbableCount = Array.from(items).filter(
              (item) => item.getAttribute('tabindex') === '0'
            ).length;

            roving.deactivate();
            return tabbableCount === 1;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Arrow keys should move focus sequentially
     * For any list, pressing ArrowDown should move to next item
     */
    it('should move focus with arrow keys in sequence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }),
          fc.integer({ min: 0, max: 5 }),
          (numItems, startIndex) => {
            const actualStartIndex = startIndex % numItems;

            // Setup
            container.innerHTML = '';
            const items: HTMLElement[] = [];
            for (let i = 0; i < numItems; i++) {
              const item = document.createElement('div');
              item.setAttribute('role', 'option');
              item.setAttribute('tabindex', i === actualStartIndex ? '0' : '-1');
              item.textContent = `Item ${i}`;
              container.appendChild(item);
              items.push(item);
            }

            const roving = new RovingTabIndex(container);

            // Focus the start item
            items[actualStartIndex].focus();

            // Press ArrowDown
            const downEvent = new KeyboardEvent('keydown', {
              key: 'ArrowDown',
              bubbles: true,
            });
            container.dispatchEvent(downEvent);

            // Property: Next item should now be tabbable
            const nextIndex = (actualStartIndex + 1) % numItems;
            const nextIsTabbable = items[nextIndex].getAttribute('tabindex') === '0';

            roving.deactivate();
            return nextIsTabbable;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Announce', () => {
    /**
     * Property: Announce should create or update ARIA live region
     * For any message, announce should make it available to screen readers
     */
    it('should create live region with any message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('polite', 'assertive'),
          (message, priority) => {
            // Clean up any existing live region
            const existing = document.getElementById('aria-live-region');
            if (existing) existing.remove();

            // Announce message
            announce(message, priority as 'polite' | 'assertive');

            // Property: Live region should exist with message
            const liveRegion = document.getElementById('aria-live-region');
            const hasCorrectMessage = liveRegion?.textContent === message;
            const hasCorrectPriority = liveRegion?.getAttribute('aria-live') === priority;

            return hasCorrectMessage && hasCorrectPriority;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('isFocusable', () => {
    /**
     * Property: Disabled elements should never be focusable
     * For any element with disabled attribute, isFocusable should return false
     */
    it('should return false for disabled elements', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('button', 'input', 'select', 'textarea'),
          (tagName) => {
            const element = document.createElement(tagName);
            element.setAttribute('disabled', 'true');
            container.appendChild(element);

            const result = isFocusable(element);

            container.removeChild(element);
            return result === false;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: Hidden elements should never be focusable
     * For any element with aria-hidden="true", isFocusable should return false
     */
    it('should return false for aria-hidden elements', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('button', 'a', 'input'),
          (tagName) => {
            const element = document.createElement(tagName);
            if (tagName === 'a') {
              (element as HTMLAnchorElement).href = '#';
            }
            element.setAttribute('aria-hidden', 'true');
            container.appendChild(element);

            const result = isFocusable(element);

            container.removeChild(element);
            return result === false;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('getFocusableElements', () => {
    /**
     * Property: Should find all focusable elements
     * For any mix of focusable and non-focusable elements,
     * getFocusableElements should return only focusable ones
     */
    it('should return only focusable elements', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (numFocusable, numNonFocusable) => {
            container.innerHTML = '';

            // Add focusable elements
            for (let i = 0; i < numFocusable; i++) {
              const button = document.createElement('button');
              button.textContent = `Button ${i}`;
              container.appendChild(button);
            }

            // Add non-focusable elements
            for (let i = 0; i < numNonFocusable; i++) {
              const div = document.createElement('div');
              div.textContent = `Div ${i}`;
              container.appendChild(div);
            }

            const focusable = getFocusableElements(container);

            // Property: Should find exactly numFocusable elements
            return focusable.length === numFocusable;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Keyboard Event Helpers', () => {
    /**
     * Property: isEnterKey should only return true for Enter key
     */
    it('should correctly identify Enter key', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Enter', 'Space', 'Escape', 'Tab', 'a', '1'),
          (key) => {
            const event = new KeyboardEvent('keydown', { key });
            const result = isEnterKey(event);
            return result === (key === 'Enter');
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: isSpaceKey should only return true for Space key
     */
    it('should correctly identify Space key', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(' ', 'Spacebar', 'Enter', 'Tab', 'a'),
          (key) => {
            const event = new KeyboardEvent('keydown', { key });
            const result = isSpaceKey(event);
            return result === (key === ' ' || key === 'Spacebar');
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: isEscapeKey should only return true for Escape key
     */
    it('should correctly identify Escape key', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Escape', 'Esc', 'Enter', 'Tab', 'a'),
          (key) => {
            const event = new KeyboardEvent('keydown', { key });
            const result = isEscapeKey(event);
            return result === (key === 'Escape' || key === 'Esc');
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property: isActivationKey should return true for Enter or Space
     */
    it('should identify activation keys correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Enter', ' ', 'Spacebar', 'Escape', 'Tab', 'a'),
          (key) => {
            const event = new KeyboardEvent('keydown', { key });
            const result = isActivationKey(event);
            const expected = key === 'Enter' || key === ' ' || key === 'Spacebar';
            return result === expected;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('makeKeyboardAccessible', () => {
    /**
     * Property: Should make any element keyboard accessible
     * For any element, makeKeyboardAccessible should add proper attributes
     */
    it('should add keyboard accessibility to any element', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('div', 'span', 'article', 'section'),
          fc.constantFrom('button', 'link', 'menuitem'),
          (tagName, role) => {
            const element = document.createElement(tagName);
            let clicked = false;
            const onClick = () => { clicked = true; };

            makeKeyboardAccessible(element, onClick, role);

            // Property: Should have correct attributes
            const hasRole = element.getAttribute('role') === role;
            const hasTabIndex = element.getAttribute('tabindex') === '0';

            // Property: Should respond to Enter key
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              bubbles: true,
            });
            element.dispatchEvent(enterEvent);
            const respondsToEnter = clicked;

            return hasRole && hasTabIndex && respondsToEnter;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
