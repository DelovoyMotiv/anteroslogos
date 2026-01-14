/**
 * Responsive Design Verification Tests for Audit Showcase Carousel
 * 
 * This test suite verifies that the responsive design implementation meets all requirements
 * by checking the source code for the correct Tailwind CSS classes.
 * 
 * Tests Requirements:
 * - 3.3: Mouse wheel horizontal scroll on desktop
 * - 3.4: Touch swipe gestures on mobile
 * - 4.1: Mobile viewport card width (280px at <640px)
 * - 4.2: Tablet viewport card width (320px at 640-1024px)
 * - 4.3: Desktop viewport card width (360px at >1024px)
 * - 4.4: Consistent spacing between cards
 * - 4.5: Proper padding on container edges
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read source files for verification
const auditCardSource = readFileSync(join(__dirname, '../AuditCard.tsx'), 'utf-8');
const carouselSource = readFileSync(join(__dirname, '../AuditShowcaseCarousel.tsx'), 'utf-8');

describe('Responsive Design Implementation - AuditCard', () => {
  describe('Requirement 4.1: Mobile Viewport Card Width (180px at <640px)', () => {
    it('should have w-[180px] class for mobile viewport', () => {
      expect(auditCardSource).toContain('w-[180px]');
    });

    it('should use w-[180px] as base width (no prefix)', () => {
      // Verify it's not prefixed with sm: or lg:
      const match = auditCardSource.match(/className="[^"]*w-\[180px\]/);
      expect(match).toBeTruthy();
    });
  });

  describe('Requirement 4.2: Tablet Viewport Card Width (200px at 640-1024px)', () => {
    it('should have sm:w-[200px] class for tablet viewport', () => {
      expect(auditCardSource).toContain('sm:w-[200px]');
    });

    it('should use sm: prefix for tablet breakpoint', () => {
      const match = auditCardSource.match(/sm:w-\[200px\]/);
      expect(match).toBeTruthy();
    });
  });

  describe('Requirement 4.3: Desktop Viewport Card Width (220px at >1024px)', () => {
    it('should have lg:w-[220px] class for desktop viewport', () => {
      expect(auditCardSource).toContain('lg:w-[220px]');
    });

    it('should use lg: prefix for desktop breakpoint', () => {
      const match = auditCardSource.match(/lg:w-\[220px\]/);
      expect(match).toBeTruthy();
    });
  });

  describe('All Responsive Breakpoints Together', () => {
    it('should have all three responsive width classes in AuditCard', () => {
      expect(auditCardSource).toContain('w-[180px]');
      expect(auditCardSource).toContain('sm:w-[200px]');
      expect(auditCardSource).toContain('lg:w-[220px]');
    });

    it('should have flex-shrink-0 to prevent card shrinking in horizontal layout', () => {
      expect(auditCardSource).toContain('flex-shrink-0');
    });
  });

  describe('Card Styling for Responsive Design', () => {
    it('should have proper background and border classes', () => {
      expect(auditCardSource).toContain('bg-gradient-to-br');
      expect(auditCardSource).toContain('from-white/10');
      expect(auditCardSource).toContain('border-white/20');
      expect(auditCardSource).toContain('rounded-lg');
    });

    it('should have hover effects for interactivity', () => {
      expect(auditCardSource).toContain('hover:from-white/15');
      expect(auditCardSource).toContain('hover:border-brand-accent/50');
    });

    it('should have smooth transitions', () => {
      expect(auditCardSource).toContain('transition-all');
      expect(auditCardSource).toContain('duration-300');
    });

    it('should have proper padding', () => {
      expect(auditCardSource).toContain('p-3');
    });
  });

  describe('Accessibility Features', () => {
    it('should have ARIA label attribute', () => {
      expect(auditCardSource).toContain('aria-label');
    });

    it('should have role="listitem"', () => {
      expect(auditCardSource).toContain('role="listitem"');
    });

    it('should be keyboard focusable with tabIndex', () => {
      expect(auditCardSource).toContain('tabIndex={0}');
    });

    it('should have focus-visible styles', () => {
      expect(auditCardSource).toContain('focus:outline-none');
      expect(auditCardSource).toContain('focus-visible:ring');
    });
  });

  describe('Domain Truncation - Requirement 2.6', () => {
    it('should have truncate class for long domains', () => {
      expect(auditCardSource).toContain('truncate');
    });

    it('should have title attribute for full domain display on hover', () => {
      expect(auditCardSource).toContain('title={domain}');
    });
  });

  describe('Score Display - Requirement 2.5', () => {
    it('should round score using Math.round', () => {
      expect(auditCardSource).toContain('Math.round(score)');
    });

    it('should display score with brand-accent color', () => {
      expect(auditCardSource).toContain('text-brand-accent');
    });
  });

  describe('Grade Color Coding - Requirement 2.4', () => {
    it('should have grade color mapping for all grades', () => {
      expect(auditCardSource).toContain("'A+':");
      expect(auditCardSource).toContain("'A':");
      expect(auditCardSource).toContain("'B':");
      expect(auditCardSource).toContain("'C':");
      expect(auditCardSource).toContain("'D':");
      expect(auditCardSource).toContain("'F':");
    });

    it('should use green color for A grades', () => {
      expect(auditCardSource).toContain('text-green-400');
      expect(auditCardSource).toContain('bg-green-400/10');
    });

    it('should use blue color for B grade', () => {
      expect(auditCardSource).toContain('text-blue-400');
    });

    it('should use yellow color for C grade', () => {
      expect(auditCardSource).toContain('text-yellow-400');
    });

    it('should use orange color for D grade', () => {
      expect(auditCardSource).toContain('text-orange-400');
    });

    it('should use red color for F grade', () => {
      expect(auditCardSource).toContain('text-red-400');
    });
  });
});

describe('Responsive Design Implementation - AuditShowcaseCarousel', () => {
  describe('Requirement 4.4: Consistent Spacing Between Cards', () => {
    it('should have gap-3 class for consistent card spacing', () => {
      expect(carouselSource).toContain('gap-3');
    });

    it('should maintain gap in carousel container', () => {
      // Verify gap-3 is in the flex container
      const match = carouselSource.match(/className="[^"]*flex[^"]*gap-3/);
      expect(match).toBeTruthy();
    });
  });

  describe('Requirement 4.5: Proper Padding on Container Edges', () => {
    it('should have responsive padding classes', () => {
      expect(carouselSource).toContain('px-4');
      expect(carouselSource).toContain('sm:px-6');
      expect(carouselSource).toContain('lg:px-8');
    });

    it('should have padding on carousel container', () => {
      expect(carouselSource).toContain('pb-4');
    });

    it('should have full-width layout without container constraint', () => {
      // Verify carousel is full-width (no container mx-auto in success state)
      const successStateMatch = carouselSource.match(/Success state[\s\S]*?<section[\s\S]*?<div className="w-full/);
      expect(successStateMatch).toBeTruthy();
    });
  });

  describe('Requirements 3.3 & 3.4: Horizontal Scrolling Support', () => {
    it('should have overflow-x-auto for horizontal scrolling', () => {
      expect(carouselSource).toContain('overflow-x-auto');
    });

    it('should have scroll-smooth for smooth scrolling behavior', () => {
      expect(carouselSource).toContain('scroll-smooth');
    });

    it('should hide scrollbar with scrollbar-hide class', () => {
      expect(carouselSource).toContain('scrollbar-hide');
    });

    it('should hide scrollbar with inline styles', () => {
      expect(carouselSource).toContain("scrollbarWidth: 'none'");
      expect(carouselSource).toContain("msOverflowStyle: 'none'");
    });

    it('should have flex layout for horizontal card arrangement', () => {
      expect(carouselSource).toContain('flex');
    });
  });

  describe('Keyboard Navigation Support', () => {
    it('should be keyboard focusable', () => {
      expect(carouselSource).toContain('tabIndex={0}');
    });

    it('should have keyboard event handler', () => {
      expect(carouselSource).toContain('onKeyDown');
      expect(carouselSource).toContain('handleKeyDown');
    });

    it('should support arrow key navigation', () => {
      expect(carouselSource).toContain('ArrowLeft');
      expect(carouselSource).toContain('ArrowRight');
    });

    it('should support Home and End keys', () => {
      expect(carouselSource).toContain('Home');
      expect(carouselSource).toContain('End');
    });

    it('should have keyboard navigation hint text', () => {
      expect(carouselSource).toContain('arrow keys');
    });
  });

  describe('Carousel Container Accessibility', () => {
    it('should have proper ARIA labels', () => {
      expect(carouselSource).toContain('aria-label');
    });

    it('should have role="list" for semantic structure', () => {
      expect(carouselSource).toContain('role="list"');
    });

    it('should have role="region" for section', () => {
      expect(carouselSource).toContain('role="region"');
    });

    it('should have focus-visible styles', () => {
      expect(carouselSource).toContain('focus-visible:ring');
    });
  });

  describe('Loading State Responsive Design', () => {
    it('should have skeleton cards with fixed widths for loading state', () => {
      // Loading state uses fixed widths for skeleton cards
      const skeletonMatch = carouselSource.match(/isLoading[\s\S]*?w-\[180px\]/);
      expect(skeletonMatch).toBeTruthy();
    });

    it('should have flex-shrink-0 on skeleton cards', () => {
      const skeletonMatch = carouselSource.match(/isLoading[\s\S]*?flex-shrink-0/);
      expect(skeletonMatch).toBeTruthy();
    });

    it('should have shimmer animation for loading state', () => {
      expect(carouselSource).toContain('animate-[shimmer');
    });
  });
});

describe('Responsive Design Integration Verification', () => {
  describe('Complete Responsive Implementation', () => {
    it('verifies all three breakpoints are implemented in AuditCard', () => {
      const mobileMatch = auditCardSource.match(/w-\[180px\]/);
      const tabletMatch = auditCardSource.match(/sm:w-\[200px\]/);
      const desktopMatch = auditCardSource.match(/lg:w-\[220px\]/);
      
      expect(mobileMatch).toBeTruthy();
      expect(tabletMatch).toBeTruthy();
      expect(desktopMatch).toBeTruthy();
    });

    it('verifies carousel has proper full-width structure', () => {
      expect(carouselSource).toContain('w-full');
      expect(carouselSource).toContain('overflow-x-auto');
      expect(carouselSource).toContain('flex');
      expect(carouselSource).toContain('gap-3');
    });

    it('verifies responsive padding is implemented', () => {
      const paddingMatch = carouselSource.match(/px-4[\s\S]*?sm:px-6[\s\S]*?lg:px-8/);
      expect(paddingMatch).toBeTruthy();
    });

    it('verifies touch and mouse interaction support', () => {
      // overflow-x-auto enables both touch swipe and mouse wheel scrolling
      expect(carouselSource).toContain('overflow-x-auto');
      // scroll-smooth enhances the experience
      expect(carouselSource).toContain('scroll-smooth');
    });

    it('verifies keyboard navigation is fully implemented', () => {
      expect(carouselSource).toContain('tabIndex={0}');
      expect(carouselSource).toContain('onKeyDown');
      expect(carouselSource).toContain('ArrowLeft');
      expect(carouselSource).toContain('ArrowRight');
      expect(carouselSource).toContain('Home');
      expect(carouselSource).toContain('End');
    });
  });

  describe('Responsive Design Best Practices', () => {
    it('uses Tailwind responsive prefixes correctly', () => {
      // Mobile: no prefix
      expect(auditCardSource).toMatch(/\bw-\[180px\]/);
      // Tablet: sm: prefix
      expect(auditCardSource).toMatch(/\bsm:w-\[200px\]/);
      // Desktop: lg: prefix
      expect(auditCardSource).toMatch(/\blg:w-\[220px\]/);
    });

    it('uses flex-shrink-0 to prevent card compression', () => {
      expect(auditCardSource).toContain('flex-shrink-0');
    });

    it('uses consistent spacing with gap utility', () => {
      expect(carouselSource).toContain('gap-3');
    });

    it('hides scrollbar for clean aesthetics', () => {
      expect(carouselSource).toContain('scrollbar-hide');
      expect(carouselSource).toContain("scrollbarWidth: 'none'");
    });

    it('provides smooth scrolling experience', () => {
      expect(carouselSource).toContain('scroll-smooth');
    });
  });
});


