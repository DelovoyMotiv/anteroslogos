/**
 * useSwipeGesture Hook
 * 
 * Detects horizontal swipe gestures for tab navigation on touch devices.
 * 
 * Features:
 * - Touch event handling (touchstart, touchmove, touchend)
 * - Swipe direction detection (left/right)
 * - Minimum swipe distance threshold (50px)
 * - Maximum vertical movement tolerance (100px)
 * - Velocity-based detection
 * - Prevents accidental swipes during scrolling
 * 
 * Usage:
 * ```tsx
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => nextTab(),
 *   onSwipeRight: () => previousTab(),
 *   threshold: 50,
 * });
 * 
 * <div {...swipeHandlers}>
 *   Content
 * </div>
 * ```
 */

import { useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  /** Callback when swiping left (next) */
  onSwipeLeft?: () => void;
  
  /** Callback when swiping right (previous) */
  onSwipeRight?: () => void;
  
  /** Minimum horizontal distance to trigger swipe (default: 50px) */
  threshold?: number;
  
  /** Maximum vertical movement allowed (default: 100px) */
  maxVerticalMovement?: number;
  
  /** Minimum velocity to trigger swipe (default: 0.3 px/ms) */
  minVelocity?: number;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  maxVerticalMovement = 100,
  minVelocity = 0.3,
}: SwipeGestureOptions) {
  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) {
      return;
    }

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    // Calculate velocity (px/ms)
    const velocity = Math.abs(deltaX) / deltaTime;

    // Check if vertical movement is within tolerance
    const isHorizontalSwipe = Math.abs(deltaY) < maxVerticalMovement;

    // Check if horizontal movement exceeds threshold
    const isSignificantSwipe = Math.abs(deltaX) > threshold;

    // Check if velocity is sufficient
    const isFastEnough = velocity > minVelocity;

    if (isHorizontalSwipe && isSignificantSwipe && isFastEnough) {
      if (deltaX > 0) {
        // Swipe right (previous)
        onSwipeRight?.();
      } else {
        // Swipe left (next)
        onSwipeLeft?.();
      }
    }

    // Reset
    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold, maxVerticalMovement, minVelocity]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Helper function to get next/previous tab in sequence
 */
export function getAdjacentTab<T extends string>(
  tabs: T[],
  currentTab: T,
  direction: 'next' | 'previous'
): T {
  const currentIndex = tabs.indexOf(currentTab);
  
  if (direction === 'next') {
    // Wrap around to first tab if at end
    return tabs[(currentIndex + 1) % tabs.length];
  } else {
    // Wrap around to last tab if at beginning
    return tabs[(currentIndex - 1 + tabs.length) % tabs.length];
  }
}
