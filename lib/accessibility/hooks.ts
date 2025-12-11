/**
 * React Hooks for Keyboard Accessibility
 * Property 30: Keyboard Accessibility - Validates Requirements 6.5
 */

import { useEffect, useRef, useCallback } from 'react';
import { FocusTrap, RovingTabIndex, announce } from './keyboardNav';

/**
 * Hook to trap focus within a component (for modals, dialogs)
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    if (isActive) {
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
 * Hook for roving tabindex in lists/grids
 */
export const useRovingTabIndex = (
  orientation: 'horizontal' | 'vertical' | 'both' = 'vertical'
) => {
  const containerRef = useRef<HTMLElement>(null);
  const rovingTabIndexRef = useRef<RovingTabIndex | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    rovingTabIndexRef.current = new RovingTabIndex(containerRef.current, orientation);

    return () => {
      if (rovingTabIndexRef.current) {
        rovingTabIndexRef.current.deactivate();
        rovingTabIndexRef.current = null;
      }
    };
  }, [orientation]);

  return containerRef;
};

/**
 * Hook to handle Escape key
 */
export const useEscapeKey = (callback: () => void, isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return undefined;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback, isActive]);
};

/**
 * Hook to announce messages to screen readers
 */
export const useAnnounce = () => {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
  }, []);
};

/**
 * Hook to manage focus on mount
 */
export const useAutoFocus = (shouldFocus: boolean = true) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (shouldFocus && elementRef.current) {
      // Small delay to ensure element is rendered
      const timer = setTimeout(() => {
        elementRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldFocus]);

  return elementRef;
};

/**
 * Hook for keyboard navigation in a list
 */
export const useKeyboardListNavigation = <T>(
  items: T[],
  onSelect: (index: number) => void
) => {
  const selectedIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e;
      let newIndex = selectedIndexRef.current;

      switch (key) {
        case 'ArrowDown':
          e.preventDefault();
          newIndex = Math.min(selectedIndexRef.current + 1, items.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = Math.max(selectedIndexRef.current - 1, 0);
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(selectedIndexRef.current);
          return;
        default:
          return;
      }

      selectedIndexRef.current = newIndex;
      onSelect(newIndex);
    },
    [items.length, onSelect]
  );

  return { handleKeyDown, selectedIndex: selectedIndexRef.current };
};

/**
 * Hook to restore focus when component unmounts
 */
export const useRestoreFocus = () => {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    return () => {
      if (previouslyFocusedRef.current && previouslyFocusedRef.current.focus) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, []);
};

/**
 * Hook for accessible button behavior on non-button elements
 */
export const useAccessibleButton = (onClick: () => void) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown: handleKeyDown,
    onClick,
  };
};
