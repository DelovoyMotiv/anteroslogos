/**
 * Keyboard Accessibility Module
 * Property 30: Keyboard Accessibility - Validates Requirements 6.5
 * 
 * Comprehensive keyboard accessibility utilities and React hooks
 * for ensuring all interactive elements are keyboard accessible.
 */

// Core utilities
export {
  FocusTrap,
  RovingTabIndex,
  announce,
  createSkipLink,
  isFocusable,
  getFocusableElements,
  isEnterKey,
  isSpaceKey,
  isEscapeKey,
  isActivationKey,
  makeKeyboardAccessible,
} from './keyboardNav';

// React hooks
export {
  useFocusTrap,
  useRovingTabIndex,
  useEscapeKey,
  useAnnounce,
  useAutoFocus,
  useKeyboardListNavigation,
  useRestoreFocus,
  useAccessibleButton,
} from './hooks';
