/**
 * Tests for Accessibility React Hooks
 * Property 30: Keyboard Accessibility - Validates Requirements 6.5
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import {
  useFocusTrap,
  useEscapeKey,
  useAnnounce,
  useAutoFocus,
  useAccessibleButton,
} from '../hooks';

describe('Accessibility Hooks', () => {
  describe('useFocusTrap', () => {
    it('should trap focus when active', () => {
      const TestComponent = ({ isActive }: { isActive: boolean }) => {
        const containerRef = useFocusTrap(isActive);

        return (
          <div ref={containerRef as any}>
            <button>Button 1</button>
            <button>Button 2</button>
          </div>
        );
      };

      const { rerender } = render(<TestComponent isActive={false} />);
      
      // Activate focus trap
      rerender(<TestComponent isActive={true} />);

      const buttons = screen.getAllByRole('button');
      expect(document.activeElement).toBe(buttons[0]);
    });
  });

  describe('useEscapeKey', () => {
    it('should call callback on Escape key', () => {
      const callback = vi.fn();

      const TestComponent = () => {
        useEscapeKey(callback);
        return <div>Test</div>;
      };

      render(<TestComponent />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(callback).toHaveBeenCalled();
    });

    it('should not call callback when inactive', () => {
      const callback = vi.fn();

      const TestComponent = () => {
        useEscapeKey(callback, false);
        return <div>Test</div>;
      };

      render(<TestComponent />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('useAnnounce', () => {
    it('should announce message to screen readers', async () => {
      const TestComponent = () => {
        const announce = useAnnounce();

        return (
          <button onClick={() => announce('Test message')}>
            Announce
          </button>
        );
      };

      render(<TestComponent />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const liveRegion = document.getElementById('aria-live-region');
        expect(liveRegion?.textContent).toBe('Test message');
      });
    });
  });

  describe('useAutoFocus', () => {
    it('should focus element on mount', () => {
      const TestComponent = () => {
        const elementRef = useAutoFocus(true);

        return <button ref={elementRef as any}>Focus me</button>;
      };

      render(<TestComponent />);

      const button = screen.getByRole('button');
      
      // Wait for auto-focus
      setTimeout(() => {
        expect(document.activeElement).toBe(button);
      }, 150);
    });

    it('should not focus when shouldFocus is false', () => {
      const TestComponent = () => {
        const elementRef = useAutoFocus(false);

        return <button ref={elementRef as any}>Don't focus me</button>;
      };

      render(<TestComponent />);

      const button = screen.getByRole('button');
      expect(document.activeElement).not.toBe(button);
    });
  });

  describe('useAccessibleButton', () => {
    it('should make element behave like button', () => {
      const onClick = vi.fn();

      const TestComponent = () => {
        const buttonProps = useAccessibleButton(onClick);

        return <div {...buttonProps}>Click me</div>;
      };

      render(<TestComponent />);

      const element = screen.getByRole('button');
      
      // Should have correct attributes
      expect(element.getAttribute('tabindex')).toBe('0');
      expect(element.getAttribute('role')).toBe('button');

      // Should respond to click
      fireEvent.click(element);
      expect(onClick).toHaveBeenCalledTimes(1);

      // Should respond to Enter key
      fireEvent.keyDown(element, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(2);

      // Should respond to Space key
      fireEvent.keyDown(element, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(3);
    });
  });
});
