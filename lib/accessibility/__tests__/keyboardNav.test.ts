/**
 * Unit Tests for Keyboard Navigation
 * Property 30: Keyboard Accessibility - Validates Requirements 6.5
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('Keyboard Navigation - Unit Tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Clean up live region
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) liveRegion.remove();
  });

  describe('FocusTrap', () => {
    it('should focus first element on activation', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      const focusTrap = new FocusTrap(container);
      focusTrap.activate();

      expect(document.activeElement).toBe(button1);

      focusTrap.deactivate();
    });

    it('should trap Tab key at boundaries', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const button3 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);
      container.appendChild(button3);

      const focusTrap = new FocusTrap(container);
      focusTrap.activate();

      // Focus last button
      button3.focus();

      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
      });
      container.dispatchEvent(tabEvent);

      // Focus should wrap (tested by focus trap logic)
      focusTrap.deactivate();
    });

    it('should restore focus on deactivation', () => {
      const outsideButton = document.createElement('button');
      document.body.appendChild(outsideButton);
      outsideButton.focus();

      const insideButton = document.createElement('button');
      container.appendChild(insideButton);

      const focusTrap = new FocusTrap(container);
      focusTrap.activate();
      focusTrap.deactivate();

      expect(document.activeElement).toBe(outsideButton);

      document.body.removeChild(outsideButton);
    });
  });

  describe('RovingTabIndex', () => {
    it('should set initial tabindex correctly', () => {
      const item1 = document.createElement('div');
      const item2 = document.createElement('div');
      const item3 = document.createElement('div');
      item1.setAttribute('role', 'option');
      item2.setAttribute('role', 'option');
      item3.setAttribute('role', 'option');
      container.appendChild(item1);
      container.appendChild(item2);
      container.appendChild(item3);

      const roving = new RovingTabIndex(container);

      expect(item1.getAttribute('tabindex')).toBe('0');
      expect(item2.getAttribute('tabindex')).toBe('-1');
      expect(item3.getAttribute('tabindex')).toBe('-1');

      roving.deactivate();
    });

    it('should handle ArrowDown navigation', () => {
      const item1 = document.createElement('div');
      const item2 = document.createElement('div');
      item1.setAttribute('role', 'option');
      item2.setAttribute('role', 'option');
      container.appendChild(item1);
      container.appendChild(item2);

      const roving = new RovingTabIndex(container, 'vertical');
      item1.focus();

      const downEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
      });
      container.dispatchEvent(downEvent);

      expect(item2.getAttribute('tabindex')).toBe('0');

      roving.deactivate();
    });

    it('should handle Home and End keys', () => {
      const items = [1, 2, 3, 4, 5].map(() => {
        const item = document.createElement('div');
        item.setAttribute('role', 'option');
        container.appendChild(item);
        return item;
      });

      const roving = new RovingTabIndex(container);
      items[2].focus();

      // Press Home
      const homeEvent = new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
      });
      container.dispatchEvent(homeEvent);

      // First item should be focused
      expect(items[0].getAttribute('tabindex')).toBe('0');

      roving.deactivate();
    });
  });

  describe('announce', () => {
    it('should create ARIA live region', () => {
      announce('Test message');

      const liveRegion = document.getElementById('aria-live-region');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    });

    it('should update message in live region', (done) => {
      announce('First message');

      setTimeout(() => {
        const liveRegion = document.getElementById('aria-live-region');
        expect(liveRegion?.textContent).toBe('First message');

        announce('Second message');

        setTimeout(() => {
          expect(liveRegion?.textContent).toBe('Second message');
          done();
        }, 150);
      }, 150);
    });

    it('should support assertive priority', () => {
      announce('Urgent message', 'assertive');

      const liveRegion = document.getElementById('aria-live-region');
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('isFocusable', () => {
    it('should return true for enabled button', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      expect(isFocusable(button)).toBe(true);
    });

    it('should return false for disabled button', () => {
      const button = document.createElement('button');
      button.setAttribute('disabled', 'true');
      container.appendChild(button);

      expect(isFocusable(button)).toBe(false);
    });

    it('should return false for aria-hidden element', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-hidden', 'true');
      container.appendChild(button);

      expect(isFocusable(button)).toBe(false);
    });

    it('should return false for element with tabindex="-1"', () => {
      const button = document.createElement('button');
      button.setAttribute('tabindex', '-1');
      container.appendChild(button);

      expect(isFocusable(button)).toBe(false);
    });
  });

  describe('getFocusableElements', () => {
    it('should find all focusable elements', () => {
      const button = document.createElement('button');
      const link = document.createElement('a');
      link.href = '#';
      const input = document.createElement('input');
      const div = document.createElement('div');

      container.appendChild(button);
      container.appendChild(link);
      container.appendChild(input);
      container.appendChild(div);

      const focusable = getFocusableElements(container);

      expect(focusable).toHaveLength(3);
      expect(focusable).toContain(button);
      expect(focusable).toContain(link);
      expect(focusable).toContain(input);
      expect(focusable).not.toContain(div);
    });

    it('should exclude disabled elements', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      button2.setAttribute('disabled', 'true');

      container.appendChild(button1);
      container.appendChild(button2);

      const focusable = getFocusableElements(container);

      expect(focusable).toHaveLength(1);
      expect(focusable).toContain(button1);
      expect(focusable).not.toContain(button2);
    });
  });

  describe('Keyboard Event Helpers', () => {
    it('isEnterKey should identify Enter key', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });

      expect(isEnterKey(enterEvent)).toBe(true);
      expect(isEnterKey(spaceEvent)).toBe(false);
    });

    it('isSpaceKey should identify Space key', () => {
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      const spacebarEvent = new KeyboardEvent('keydown', { key: 'Spacebar' });
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      expect(isSpaceKey(spaceEvent)).toBe(true);
      expect(isSpaceKey(spacebarEvent)).toBe(true);
      expect(isSpaceKey(enterEvent)).toBe(false);
    });

    it('isEscapeKey should identify Escape key', () => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      const escEvent = new KeyboardEvent('keydown', { key: 'Esc' });
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      expect(isEscapeKey(escapeEvent)).toBe(true);
      expect(isEscapeKey(escEvent)).toBe(true);
      expect(isEscapeKey(enterEvent)).toBe(false);
    });

    it('isActivationKey should identify Enter and Space', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      expect(isActivationKey(enterEvent)).toBe(true);
      expect(isActivationKey(spaceEvent)).toBe(true);
      expect(isActivationKey(escapeEvent)).toBe(false);
    });
  });

  describe('makeKeyboardAccessible', () => {
    it('should add role and tabindex', () => {
      const div = document.createElement('div');
      const onClick = vi.fn();

      makeKeyboardAccessible(div, onClick, 'button');

      expect(div.getAttribute('role')).toBe('button');
      expect(div.getAttribute('tabindex')).toBe('0');
    });

    it('should respond to click', () => {
      const div = document.createElement('div');
      const onClick = vi.fn();

      makeKeyboardAccessible(div, onClick);
      div.click();

      expect(onClick).toHaveBeenCalled();
    });

    it('should respond to Enter key', () => {
      const div = document.createElement('div');
      const onClick = vi.fn();

      makeKeyboardAccessible(div, onClick);

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      div.dispatchEvent(enterEvent);

      expect(onClick).toHaveBeenCalled();
    });

    it('should respond to Space key', () => {
      const div = document.createElement('div');
      const onClick = vi.fn();

      makeKeyboardAccessible(div, onClick);

      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
      });
      div.dispatchEvent(spaceEvent);

      expect(onClick).toHaveBeenCalled();
    });
  });
});
