/**
 * CSRDetector - Client-Side Rendering Framework Detection
 * 
 * Detects CSR frameworks (React, Next.js, Vue, Angular, Svelte) and determines
 * appropriate hydration wait times for proper content extraction.
 */

// Use type-only import to avoid loading playwright at module initialization
// Use playwright-core types (same API as playwright but without bundled browsers)
import type { Page } from 'playwright-core';

/**
 * Supported CSR frameworks
 */
export enum CSRFramework {
  REACT = 'react',
  NEXT = 'next',
  VUE = 'vue',
  ANGULAR = 'angular',
  SVELTE = 'svelte',
  UNKNOWN = 'unknown',
}

/**
 * Information about detected CSR framework
 */
export interface CSRFrameworkInfo {
  framework: CSRFramework | null;
  version?: string;
  markers: string[];
}

/**
 * CSRDetector detects Client-Side Rendering frameworks from page content
 */
export class CSRDetector {
  /**
   * Detects CSR framework from page content
   * @param page - Playwright page instance
   * @returns Detected framework information
   */
  async detectFramework(page: Page): Promise<CSRFrameworkInfo> {
    try {
      // Execute detection logic in browser context
      const detectionResult = await page.evaluate(() => {
        const markers: string[] = [];
        let framework: string | null = null;
        let version: string | undefined = undefined;

        // Check for Next.js (highest priority as it includes React)
        if (typeof (window as any).__NEXT_DATA__ !== 'undefined') {
          markers.push('__NEXT_DATA__');
          framework = 'next';
          
          // Try to extract Next.js version
          const nextData = (window as any).__NEXT_DATA__;
          if (nextData?.buildId) {
            markers.push('buildId');
          }
        }
        
        // Check for _next in DOM (Next.js specific)
        if (document.querySelector('[id^="_next"]') || document.querySelector('[class*="_next"]')) {
          markers.push('_next');
          if (!framework) {
            framework = 'next';
          }
        }

        // Check for React (if not already detected as Next.js)
        if (!framework) {
          // Check for React root markers
          if (typeof (window as any)._reactRoot !== 'undefined' || 
              typeof (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
            markers.push('_reactRoot');
            framework = 'react';
          }
          
          // Check for data-reactroot attribute
          if (document.querySelector('[data-reactroot]')) {
            markers.push('data-reactroot');
            framework = 'react';
          }

          // Check for React 18+ root
          if (document.querySelector('[data-reactid]')) {
            markers.push('data-reactid');
            framework = 'react';
          }
        }

        // Check for Vue
        if (typeof (window as any).__VUE__ !== 'undefined') {
          markers.push('__VUE__');
          framework = 'vue';
          
          // Try to extract Vue version
          const vueVersion = (window as any).__VUE__?.version;
          if (vueVersion) {
            version = vueVersion;
          }
        }
        
        // Check for Vue directives in DOM
        if (document.querySelector('[data-v-]') || document.querySelector('[v-cloak]')) {
          markers.push('data-v-');
          if (!framework) {
            framework = 'vue';
          }
        }

        // Check for Angular
        const ngVersion = document.querySelector('[ng-version]');
        if (ngVersion) {
          markers.push('ng-version');
          framework = 'angular';
          version = ngVersion.getAttribute('ng-version') || undefined;
        }
        
        // Check for ng-app attribute
        if (document.querySelector('[ng-app]')) {
          markers.push('ng-app');
          if (!framework) {
            framework = 'angular';
          }
        }

        // Check for Svelte
        if (typeof (window as any).__svelte !== 'undefined') {
          markers.push('__svelte');
          framework = 'svelte';
        }
        
        // Check for Svelte class markers
        if (document.querySelector('[class*="svelte-"]')) {
          markers.push('svelte-');
          if (!framework) {
            framework = 'svelte';
          }
        }

        return {
          framework,
          version,
          markers,
        };
      });

      // Map string framework to enum
      let frameworkEnum: CSRFramework | null = null;
      if (detectionResult.framework) {
        frameworkEnum = detectionResult.framework as CSRFramework;
      }

      return {
        framework: frameworkEnum,
        version: detectionResult.version,
        markers: detectionResult.markers,
      };
    } catch (error) {
      // If detection fails, return no framework detected
      console.error('CSR framework detection failed:', error);
      return {
        framework: null,
        version: undefined,
        markers: [],
      };
    }
  }

  /**
   * Gets recommended wait time for framework hydration
   * @param framework - Detected framework
   * @returns Wait time in milliseconds
   */
  getHydrationWaitTime(framework: CSRFramework | null): number {
    if (!framework) {
      return 0;
    }

    switch (framework) {
      case CSRFramework.NEXT:
        return 2000; // Next.js needs 2s for hydration
      case CSRFramework.REACT:
        return 2000; // React needs 2s for hydration
      case CSRFramework.VUE:
        return 1500; // Vue needs 1.5s for hydration
      case CSRFramework.ANGULAR:
        return 1500; // Angular needs 1.5s for hydration
      case CSRFramework.SVELTE:
        return 1000; // Svelte needs 1s for hydration
      case CSRFramework.UNKNOWN:
        return 0; // Unknown framework, no wait
      default:
        return 0;
    }
  }
}
