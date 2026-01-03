/**
 * Unit Tests for CSRDetector
 * Feature: csr-scraping-vercel-optimization
 * 
 * Tests CSR framework detection and hydration wait time calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CSRDetector, CSRFramework } from '../CSRDetector';

describe('CSRDetector', () => {
  let detector: CSRDetector;

  beforeEach(() => {
    detector = new CSRDetector();
  });

  describe('getHydrationWaitTime', () => {
    it('should return 2000ms for Next.js', () => {
      expect(detector.getHydrationWaitTime(CSRFramework.NEXT)).toBe(2000);
    });

    it('should return 2000ms for React', () => {
      expect(detector.getHydrationWaitTime(CSRFramework.REACT)).toBe(2000);
    });

    it('should return 1500ms for Vue', () => {
      expect(detector.getHydrationWaitTime(CSRFramework.VUE)).toBe(1500);
    });

    it('should return 1500ms for Angular', () => {
      expect(detector.getHydrationWaitTime(CSRFramework.ANGULAR)).toBe(1500);
    });

    it('should return 1000ms for Svelte', () => {
      expect(detector.getHydrationWaitTime(CSRFramework.SVELTE)).toBe(1000);
    });

    it('should return 0ms for unknown framework', () => {
      expect(detector.getHydrationWaitTime(CSRFramework.UNKNOWN)).toBe(0);
    });

    it('should return 0ms for null framework', () => {
      expect(detector.getHydrationWaitTime(null)).toBe(0);
    });
  });

  describe('detectFramework', () => {
    // Note: Full integration tests with real Playwright pages are in integration tests
    // These unit tests verify the class structure and basic functionality
    
    it('should be instantiable', () => {
      expect(detector).toBeInstanceOf(CSRDetector);
    });

    it('should have detectFramework method', () => {
      expect(typeof detector.detectFramework).toBe('function');
    });

    it('should have getHydrationWaitTime method', () => {
      expect(typeof detector.getHydrationWaitTime).toBe('function');
    });
  });
});
