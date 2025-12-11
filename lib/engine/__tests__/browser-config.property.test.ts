/**
 * Property-Based Tests for Browser Configuration
 * Feature: geo-audit-engine-hardening
 * 
 * Tests browser configuration and logging functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  getBrowserConfig, 
  getBrowserConfigWithOverrides,
  validateBrowserConfig,
  isBrowserEnabled, 
  DEFAULT_BROWSER_CONFIG,
  BrowserConfigurationError,
  BrowserConfiguration
} from '../browser-config';

describe('Browser Configuration Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  /**
   * Property 45: Browser Launch Logging
   * Validates: Requirements 10.1
   * 
   * For any browser launch, when the BrowserService starts a browser,
   * the system should log the browser version and configuration details.
   * 
   * This test verifies that:
   * 1. Browser configuration is properly loaded
   * 2. Configuration contains all required fields for logging
   * 3. Configuration values are within valid ranges
   */
  describe('Property 45: Browser Launch Logging', () => {
    it('should have all required configuration fields for logging', () => {
      fc.assert(
        fc.property(
          fc.record({
            BROWSER_ENABLED: fc.constantFrom('true', 'false', undefined),
            BROWSER_TIMEOUT: fc.option(fc.integer({ min: 1000, max: 60000 }).map(String)),
            BROWSER_PAGE_TIMEOUT: fc.option(fc.integer({ min: 1000, max: 30000 }).map(String)),
            BROWSER_MAX_CONCURRENT: fc.option(fc.integer({ min: 1, max: 10 }).map(String)),
            BROWSER_BLOCK_IMAGES: fc.constantFrom('true', 'false', undefined),
            BROWSER_BLOCK_CSS: fc.constantFrom('true', 'false', undefined),
            BROWSER_BLOCK_FONTS: fc.constantFrom('true', 'false', undefined),
          }),
          (envVars) => {
            // Set environment variables
            Object.entries(envVars).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                process.env[key] = value;
              } else {
                delete process.env[key];
              }
            });

            // Get configuration
            const config = getBrowserConfig();

            // Verify all required fields exist for logging
            expect(config).toHaveProperty('userAgents');
            expect(config).toHaveProperty('viewportSizes');
            expect(config).toHaveProperty('blockResources');
            expect(config).toHaveProperty('stealth');
            expect(config).toHaveProperty('maxConcurrentBrowsers');
            expect(config).toHaveProperty('browserTimeout');
            expect(config).toHaveProperty('pageLoadTimeout');

            // Verify userAgents is a non-empty array
            expect(Array.isArray(config.userAgents)).toBe(true);
            expect(config.userAgents.length).toBeGreaterThan(0);

            // Verify each user agent is a valid string
            config.userAgents.forEach(ua => {
              expect(typeof ua).toBe('string');
              expect(ua.length).toBeGreaterThan(0);
              expect(ua).toMatch(/Mozilla/); // All modern user agents contain Mozilla
            });

            // Verify viewportSizes is a non-empty array
            expect(Array.isArray(config.viewportSizes)).toBe(true);
            expect(config.viewportSizes.length).toBeGreaterThan(0);

            // Verify each viewport has valid dimensions
            config.viewportSizes.forEach(viewport => {
              expect(viewport).toHaveProperty('width');
              expect(viewport).toHaveProperty('height');
              expect(viewport.width).toBeGreaterThan(0);
              expect(viewport.height).toBeGreaterThan(0);
              expect(viewport.width).toBeLessThanOrEqual(3840); // Max 4K width
              expect(viewport.height).toBeLessThanOrEqual(2160); // Max 4K height
            });

            // Verify blockResources has all required fields
            expect(config.blockResources).toHaveProperty('images');
            expect(config.blockResources).toHaveProperty('stylesheets');
            expect(config.blockResources).toHaveProperty('fonts');
            expect(config.blockResources).toHaveProperty('media');
            expect(typeof config.blockResources.images).toBe('boolean');
            expect(typeof config.blockResources.stylesheets).toBe('boolean');
            expect(typeof config.blockResources.fonts).toBe('boolean');
            expect(typeof config.blockResources.media).toBe('boolean');

            // Verify stealth settings
            expect(config.stealth).toHaveProperty('maskWebdriver');
            expect(config.stealth).toHaveProperty('randomizeViewport');
            expect(config.stealth).toHaveProperty('injectMouseMovement');
            expect(typeof config.stealth.maskWebdriver).toBe('boolean');
            expect(typeof config.stealth.randomizeViewport).toBe('boolean');
            expect(typeof config.stealth.injectMouseMovement).toBe('boolean');

            // Verify performance settings are within valid ranges
            expect(config.maxConcurrentBrowsers).toBeGreaterThan(0);
            expect(config.maxConcurrentBrowsers).toBeLessThanOrEqual(10);
            expect(config.browserTimeout).toBeGreaterThan(0);
            expect(config.browserTimeout).toBeLessThanOrEqual(60000);
            expect(config.pageLoadTimeout).toBeGreaterThan(0);
            expect(config.pageLoadTimeout).toBeLessThanOrEqual(30000);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should use default configuration when no environment variables are set', () => {
      // Clear all browser-related environment variables
      delete process.env.BROWSER_ENABLED;
      delete process.env.BROWSER_TIMEOUT;
      delete process.env.BROWSER_PAGE_TIMEOUT;
      delete process.env.BROWSER_MAX_CONCURRENT;
      delete process.env.BROWSER_BLOCK_IMAGES;
      delete process.env.BROWSER_BLOCK_CSS;
      delete process.env.BROWSER_BLOCK_FONTS;

      const config = getBrowserConfig();

      // Should match default configuration
      expect(config.userAgents).toEqual(DEFAULT_BROWSER_CONFIG.userAgents);
      expect(config.viewportSizes).toEqual(DEFAULT_BROWSER_CONFIG.viewportSizes);
      expect(config.blockResources).toEqual(DEFAULT_BROWSER_CONFIG.blockResources);
      expect(config.stealth).toEqual(DEFAULT_BROWSER_CONFIG.stealth);
      expect(config.maxConcurrentBrowsers).toBe(DEFAULT_BROWSER_CONFIG.maxConcurrentBrowsers);
      expect(config.browserTimeout).toBe(DEFAULT_BROWSER_CONFIG.browserTimeout);
      expect(config.pageLoadTimeout).toBe(DEFAULT_BROWSER_CONFIG.pageLoadTimeout);
    });

    it('should override defaults with environment variables', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5000, max: 60000 }),
          fc.integer({ min: 5000, max: 30000 }),
          fc.integer({ min: 1, max: 10 }),
          (browserTimeout, pageTimeout, maxConcurrent) => {
            process.env.BROWSER_TIMEOUT = String(browserTimeout);
            process.env.BROWSER_PAGE_TIMEOUT = String(pageTimeout);
            process.env.BROWSER_MAX_CONCURRENT = String(maxConcurrent);

            const config = getBrowserConfig();

            expect(config.browserTimeout).toBe(browserTimeout);
            expect(config.pageLoadTimeout).toBe(pageTimeout);
            expect(config.maxConcurrentBrowsers).toBe(maxConcurrent);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle resource blocking environment variables', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('true', 'false', '1', '0', 'yes', 'no'),
          fc.constantFrom('true', 'false', '1', '0', 'yes', 'no'),
          fc.constantFrom('true', 'false', '1', '0', 'yes', 'no'),
          (blockImages, blockCSS, blockFonts) => {
            process.env.BROWSER_BLOCK_IMAGES = blockImages;
            process.env.BROWSER_BLOCK_CSS = blockCSS;
            process.env.BROWSER_BLOCK_FONTS = blockFonts;

            const config = getBrowserConfig();

            // Parse expected values
            const expectImages = !['false', '0', 'no'].includes(blockImages);
            const expectCSS = !['false', '0', 'no'].includes(blockCSS);
            const expectFonts = !['false', '0', 'no'].includes(blockFonts);

            expect(config.blockResources.images).toBe(expectImages);
            expect(config.blockResources.stylesheets).toBe(expectCSS);
            expect(config.blockResources.fonts).toBe(expectFonts);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly determine if browser is enabled', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('true', 'false', undefined),
          (browserEnabled) => {
            if (browserEnabled !== undefined) {
              process.env.BROWSER_ENABLED = browserEnabled;
            } else {
              delete process.env.BROWSER_ENABLED;
            }

            const enabled = isBrowserEnabled();

            // Browser is enabled by default unless explicitly set to 'false'
            expect(enabled).toBe(browserEnabled !== 'false');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have valid user agent strings for logging', () => {
      const config = getBrowserConfig();

      // All user agents should be valid and loggable
      config.userAgents.forEach(ua => {
        // Should contain browser name
        const hasBrowserName = 
          ua.includes('Chrome') || 
          ua.includes('Firefox') || 
          ua.includes('Safari');
        expect(hasBrowserName).toBe(true);

        // Should contain OS information
        const hasOS = 
          ua.includes('Windows') || 
          ua.includes('Macintosh') || 
          ua.includes('Linux');
        expect(hasOS).toBe(true);

        // Should be a reasonable length for logging
        expect(ua.length).toBeGreaterThan(50);
        expect(ua.length).toBeLessThan(300);
      });
    });

    it('should have viewport configurations suitable for logging', () => {
      const config = getBrowserConfig();

      // All viewports should be common desktop resolutions
      config.viewportSizes.forEach(viewport => {
        // Width should be a common desktop width
        const commonWidths = [1920, 1366, 1536, 1440, 1280];
        const isCommonWidth = commonWidths.some(w => Math.abs(viewport.width - w) < 100);
        expect(isCommonWidth).toBe(true);

        // Height should be proportional to width (aspect ratio check)
        const aspectRatio = viewport.width / viewport.height;
        expect(aspectRatio).toBeGreaterThan(1.2); // Wider than tall
        expect(aspectRatio).toBeLessThan(2.5); // Not ultra-wide
      });
    });
  });

  /**
   * Configuration Validation Tests
   * Tests that configuration validation catches invalid settings
   */
  describe('Configuration Validation', () => {
    it('should reject invalid maxConcurrentBrowsers values', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }), // Too low
            fc.integer({ min: 21 }) // Too high
          ),
          (invalidValue) => {
            const config: BrowserConfiguration = {
              ...DEFAULT_BROWSER_CONFIG,
              maxConcurrentBrowsers: invalidValue,
            };

            expect(() => validateBrowserConfig(config)).toThrow(BrowserConfigurationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid timeout values', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 999 }), // Too low
            fc.integer({ min: 300001 }) // Too high
          ),
          (invalidTimeout) => {
            const config: BrowserConfiguration = {
              ...DEFAULT_BROWSER_CONFIG,
              browserTimeout: invalidTimeout,
            };

            expect(() => validateBrowserConfig(config)).toThrow(BrowserConfigurationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid viewport dimensions', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({ width: fc.integer({ max: 319 }), height: fc.integer({ min: 240, max: 2160 }) }),
            fc.record({ width: fc.integer({ min: 3841 }), height: fc.integer({ min: 240, max: 2160 }) }),
            fc.record({ width: fc.integer({ min: 320, max: 3840 }), height: fc.integer({ max: 239 }) }),
            fc.record({ width: fc.integer({ min: 320, max: 3840 }), height: fc.integer({ min: 2161 }) })
          ),
          (invalidViewport) => {
            const config: BrowserConfiguration = {
              ...DEFAULT_BROWSER_CONFIG,
              viewportSizes: [invalidViewport],
            };

            expect(() => validateBrowserConfig(config)).toThrow(BrowserConfigurationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty userAgents array', () => {
      const config: BrowserConfiguration = {
        ...DEFAULT_BROWSER_CONFIG,
        userAgents: [],
      };

      expect(() => validateBrowserConfig(config)).toThrow(BrowserConfigurationError);
      expect(() => validateBrowserConfig(config)).toThrow(/userAgents must be a non-empty array/);
    });

    it('should reject empty viewportSizes array', () => {
      const config: BrowserConfiguration = {
        ...DEFAULT_BROWSER_CONFIG,
        viewportSizes: [],
      };

      expect(() => validateBrowserConfig(config)).toThrow(BrowserConfigurationError);
      expect(() => validateBrowserConfig(config)).toThrow(/viewportSizes must be a non-empty array/);
    });

    it('should accept valid configurations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1000, max: 300000 }),
          fc.integer({ min: 1000, max: 300000 }),
          (maxConcurrent, browserTimeout, pageTimeout) => {
            const config: BrowserConfiguration = {
              ...DEFAULT_BROWSER_CONFIG,
              maxConcurrentBrowsers: maxConcurrent,
              browserTimeout,
              pageLoadTimeout: pageTimeout,
            };

            // Should not throw
            expect(() => validateBrowserConfig(config)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Configuration Override Tests
   * Tests that configuration overrides work correctly for testing
   */
  describe('Configuration Overrides', () => {
    it('should merge overrides with base configuration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1000, max: 300000 }),
          (maxConcurrent, timeout) => {
            const config = getBrowserConfigWithOverrides({
              maxConcurrentBrowsers: maxConcurrent,
              pageLoadTimeout: timeout,
            });

            expect(config.maxConcurrentBrowsers).toBe(maxConcurrent);
            expect(config.pageLoadTimeout).toBe(timeout);
            
            // Other fields should remain from base config
            expect(config.userAgents).toEqual(DEFAULT_BROWSER_CONFIG.userAgents);
            expect(config.viewportSizes).toEqual(DEFAULT_BROWSER_CONFIG.viewportSizes);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow partial blockResources overrides', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (blockImages) => {
            const config = getBrowserConfigWithOverrides({
              blockResources: {
                images: blockImages,
                stylesheets: DEFAULT_BROWSER_CONFIG.blockResources.stylesheets,
                fonts: DEFAULT_BROWSER_CONFIG.blockResources.fonts,
                media: DEFAULT_BROWSER_CONFIG.blockResources.media,
              },
            });

            expect(config.blockResources.images).toBe(blockImages);
            
            // Other resource blocking settings should remain from base
            expect(config.blockResources.stylesheets).toBe(DEFAULT_BROWSER_CONFIG.blockResources.stylesheets);
            expect(config.blockResources.fonts).toBe(DEFAULT_BROWSER_CONFIG.blockResources.fonts);
            expect(config.blockResources.media).toBe(DEFAULT_BROWSER_CONFIG.blockResources.media);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow partial stealth overrides', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (maskWebdriver) => {
            const config = getBrowserConfigWithOverrides({
              stealth: {
                maskWebdriver,
                randomizeViewport: DEFAULT_BROWSER_CONFIG.stealth.randomizeViewport,
                injectMouseMovement: DEFAULT_BROWSER_CONFIG.stealth.injectMouseMovement,
              },
            });

            expect(config.stealth.maskWebdriver).toBe(maskWebdriver);
            
            // Other stealth settings should remain from base
            expect(config.stealth.randomizeViewport).toBe(DEFAULT_BROWSER_CONFIG.stealth.randomizeViewport);
            expect(config.stealth.injectMouseMovement).toBe(DEFAULT_BROWSER_CONFIG.stealth.injectMouseMovement);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate overridden configuration', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }), // Invalid value
          (invalidValue) => {
            expect(() => getBrowserConfigWithOverrides({
              maxConcurrentBrowsers: invalidValue,
            })).toThrow(BrowserConfigurationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow complete configuration override', () => {
      const customConfig: Partial<BrowserConfiguration> = {
        userAgents: ['Custom User Agent'],
        viewportSizes: [{ width: 1024, height: 768 }],
        maxConcurrentBrowsers: 3,
        browserTimeout: 20000,
        pageLoadTimeout: 10000,
        blockResources: {
          images: false,
          stylesheets: false,
          fonts: false,
          media: false,
        },
        stealth: {
          maskWebdriver: false,
          randomizeViewport: false,
          injectMouseMovement: false,
        },
      };

      const config = getBrowserConfigWithOverrides(customConfig);

      expect(config.userAgents).toEqual(['Custom User Agent']);
      expect(config.viewportSizes).toEqual([{ width: 1024, height: 768 }]);
      expect(config.maxConcurrentBrowsers).toBe(3);
      expect(config.browserTimeout).toBe(20000);
      expect(config.pageLoadTimeout).toBe(10000);
      expect(config.blockResources.images).toBe(false);
      expect(config.stealth.maskWebdriver).toBe(false);
    });
  });

  /**
   * Environment Variable Parsing Tests
   * Tests that environment variables are parsed correctly
   */
  describe('Environment Variable Parsing', () => {
    it('should handle invalid integer environment variables', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('abc', 'not-a-number', '12.34', ''),
          (invalidValue) => {
            process.env.BROWSER_TIMEOUT = invalidValue;

            expect(() => getBrowserConfig()).toThrow(BrowserConfigurationError);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle out-of-range integer environment variables', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 999 }),
            fc.integer({ min: 300001 })
          ),
          (outOfRange) => {
            process.env.BROWSER_TIMEOUT = String(outOfRange);

            expect(() => getBrowserConfig()).toThrow(BrowserConfigurationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various boolean string formats', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('true', 'TRUE', 'True', '1', 'yes', 'YES', 'Yes'),
          (trueValue) => {
            process.env.BROWSER_ENABLED = trueValue;
            expect(isBrowserEnabled()).toBe(true);
          }
        ),
        { numRuns: 50 }
      );

      fc.assert(
        fc.property(
          fc.constantFrom('false', 'FALSE', 'False', '0', 'no', 'NO', 'No'),
          (falseValue) => {
            process.env.BROWSER_ENABLED = falseValue;
            expect(isBrowserEnabled()).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should use defaults for unrecognized boolean values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('maybe', 'unknown', '2', 'invalid'),
          (unknownValue) => {
            process.env.BROWSER_ENABLED = unknownValue;
            // Should default to true (enabled)
            expect(isBrowserEnabled()).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
