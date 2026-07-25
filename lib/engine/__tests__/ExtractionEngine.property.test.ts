/**
 * Property-Based Tests for ExtractionEngine with Browser Integration
 * 
 * Tests browser fallback behavior and warning generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ExtractionEngine } from '../extractor';
import { BrowserService } from '../BrowserService';

describe('ExtractionEngine Browser Integration Properties', () => {
  let engine: ExtractionEngine;

  afterEach(async () => {
    if (engine) {
      await engine.cleanup();
    }
    vi.restoreAllMocks();
  });

  /**
   * Property 25: Browser Launch Failure Fallback
   * **Validates: Requirements 6.1**
   * 
   * For any browser launch failure, when the BrowserService cannot start the browser,
   * the ExtractionEngine should fallback to static HTML fetching using CORS proxies.
   */
  it('Property 25: should fallback to static fetching when browser launch fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        async (url) => {
          // Mock BrowserService to simulate launch failure
          const mockBrowserService = {
            fetchPage: vi.fn().mockRejectedValue(new Error('Browser launch failed')),
            cleanup: vi.fn().mockResolvedValue(undefined),
            getPoolStats: vi.fn().mockReturnValue({ total: 0, inUse: 0, available: 0 }),
          };

          // Create engine with mocked browser service
          engine = new ExtractionEngine({ enableBrowser: true });
          (engine as any).browserService = mockBrowserService;

          // Mock static fetch to succeed
          const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
          mockFetchHTML.mockResolvedValue('<html><head><title>Test</title></head><body><h1>Test</h1></body></html>');

          // Extract should succeed via fallback
          const result = await engine.extract(url, { mode: 'fast' });

          // Verify fallback was used
          expect(mockBrowserService.fetchPage).toHaveBeenCalled();
          expect(mockFetchHTML).toHaveBeenCalled();
          
          // Verify result is valid
          expect(result).toBeDefined();
          expect(result.url).toBeDefined();
          expect(result.html).toBeDefined();
          
          // Verify warning is present
          expect((result as any).warnings).toBeDefined();
          expect((result as any).warnings.length).toBeGreaterThan(0);
          expect((result as any).warnings[0]).toContain('Browser-based rendering failed');
          expect((result as any).warnings[0]).toContain('Falling back to static HTML fetching');
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 26: Browser Timeout Fallback
   * **Validates: Requirements 6.2**
   * 
   * For any browser page load timeout, when the BrowserService exceeds the timeout limit,
   * the ExtractionEngine should fallback to static fetching for that URL.
   */
  it('Property 26: should fallback to static fetching when browser times out', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.integer({ min: 1000, max: 5000 }),
        async (url, timeout) => {
          // Mock BrowserService to simulate timeout
          const mockBrowserService = {
            fetchPage: vi.fn().mockRejectedValue(new Error('ERR_CSR_TIMEOUT: Page load timeout')),
            cleanup: vi.fn().mockResolvedValue(undefined),
            getPoolStats: vi.fn().mockReturnValue({ total: 0, inUse: 0, available: 0 }),
          };

          // Create engine with mocked browser service
          engine = new ExtractionEngine({ enableBrowser: true });
          (engine as any).browserService = mockBrowserService;

          // Mock static fetch to succeed
          const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
          mockFetchHTML.mockResolvedValue('<html><head><title>Test</title></head><body><h1>Test</h1></body></html>');

          // Extract should succeed via fallback
          const result = await engine.extract(url, { mode: 'fast', timeout });

          // Verify fallback was used
          expect(mockBrowserService.fetchPage).toHaveBeenCalled();
          expect(mockFetchHTML).toHaveBeenCalled();
          
          // Verify result is valid
          expect(result).toBeDefined();
          expect(result.url).toBeDefined();
          expect(result.html).toBeDefined();
          
          // Verify warning is present
          expect((result as any).warnings).toBeDefined();
          expect((result as any).warnings.length).toBeGreaterThan(0);
          expect((result as any).warnings[0]).toContain('Browser-based rendering failed');
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 28: Fallback Mode Warning
   * **Validates: Requirements 6.4**
   * 
   * For any audit that uses fallback mode, when the ExtractionEngine completes the audit,
   * the result should include a warning indicating limited CSR support.
   */
  it('Property 28: should include warning when fallback mode is used', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.constantFrom(
          'Browser launch failed',
          'ERR_CSR_TIMEOUT: Page load timeout',
          'Browser crashed',
          'ERR_WAF_BLOCK: CAPTCHA detected'
        ),
        async (url, errorMessage) => {
          // Mock BrowserService to fail with various errors
          const mockBrowserService = {
            fetchPage: vi.fn().mockRejectedValue(new Error(errorMessage)),
            cleanup: vi.fn().mockResolvedValue(undefined),
            getPoolStats: vi.fn().mockReturnValue({ total: 0, inUse: 0, available: 0 }),
          };

          // Create engine with mocked browser service
          engine = new ExtractionEngine({ enableBrowser: true });
          (engine as any).browserService = mockBrowserService;

          // Mock static fetch to succeed
          const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
          mockFetchHTML.mockResolvedValue('<html><head><title>Test</title></head><body><h1>Test</h1></body></html>');

          // Extract should succeed via fallback
          const result = await engine.extract(url, { mode: 'fast' });

          // Verify warning is present and contains expected text
          expect((result as any).warnings).toBeDefined();
          expect(Array.isArray((result as any).warnings)).toBe(true);
          expect((result as any).warnings.length).toBeGreaterThan(0);
          
          const warning = (result as any).warnings[0];
          expect(warning).toContain('Browser-based rendering failed');
          expect(warning).toContain('Falling back to static HTML fetching');
          expect(warning).toContain('Client-side rendered (CSR) content may not be available');
          
          // Verify CSR support is marked as unavailable
          expect((result as any).csrSupport).toBe('unavailable');
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property: Browser success should not include warnings
   * 
   * For any successful browser fetch, the result should not include fallback warnings.
   */
  it('should not include warnings when browser fetch succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        async (url) => {
          // Mock BrowserService to succeed
          const mockBrowserService = {
            fetchPage: vi.fn().mockResolvedValue({
              html: '<html><head><title>Test</title></head><body><h1>Test</h1></body></html>',
              finalUrl: url,
              redirectChain: [],
              loadTime: 1000,
              resourceCounts: { scripts: 0, stylesheets: 0, images: 0 },
            }),
            cleanup: vi.fn().mockResolvedValue(undefined),
            getPoolStats: vi.fn().mockReturnValue({ total: 1, inUse: 0, available: 1 }),
          };

          // Create engine with mocked browser service
          engine = new ExtractionEngine({ enableBrowser: true });
          (engine as any).browserService = mockBrowserService;

          // Extract should succeed without fallback
          const result = await engine.extract(url, { mode: 'fast' });

          // Verify browser was used
          expect(mockBrowserService.fetchPage).toHaveBeenCalled();
          
          // Verify result is valid
          expect(result).toBeDefined();
          expect(result.url).toBeDefined();
          expect(result.html).toBeDefined();
          
          // Verify no warnings are present
          expect((result as any).warnings).toBeUndefined();
          expect((result as any).csrSupport).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property: Browser disabled should use static fetch without warnings
   * 
   * When browser is disabled, static fetching should be used without fallback warnings.
   */
  it('should use static fetch without warnings when browser is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        async (url) => {
          // Create engine with browser disabled
          engine = new ExtractionEngine({ enableBrowser: false });

          // Mock static fetch to succeed
          const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
          mockFetchHTML.mockResolvedValue('<html><head><title>Test</title></head><body><h1>Test</h1></body></html>');

          // Extract should use static fetch
          const result = await engine.extract(url, { mode: 'fast' });

          // Verify static fetch was used
          expect(mockFetchHTML).toHaveBeenCalled();
          
          // Verify result is valid
          expect(result).toBeDefined();
          expect(result.url).toBeDefined();
          expect(result.html).toBeDefined();
          
          // Verify no warnings (this is intentional, not a fallback)
          expect((result as any).warnings).toBeUndefined();
          expect((result as any).csrSupport).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('ExtractionEngine File Validation Properties', () => {
  let engine: ExtractionEngine;

  beforeEach(() => {
    engine = new ExtractionEngine({ enableBrowser: false });
  });

  afterEach(async () => {
    if (engine) {
      await engine.cleanup();
    }
    vi.restoreAllMocks();
  });

  /**
   * Property 15: Robots.txt Validation
   * **Validates: Requirements 4.1**
   * 
   * For any robots.txt check, when the ExtractionEngine receives a 200 response,
   * the system should verify the content is plain text (not HTML) before treating it as valid.
   */
  it('Property 15: should verify robots.txt is plain text not HTML', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.constantFrom(
          'User-agent: *\nDisallow: /admin\n',
          'User-agent: GPTBot\nAllow: /\n',
          '# robots.txt\nUser-agent: *\nAllow: /\n',
          'Sitemap: https://example.com/sitemap.xml\n'
        ),
        async (baseUrl, robotsContent) => {
          // Mock fetch to return plain text robots.txt
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            url: new URL('/robots.txt', baseUrl).href,
            headers: new Map([['content-type', 'text/plain']]),
            text: async () => robotsContent,
          });

          const result = await engine.validateRobotsTxt(baseUrl);

          // Should be found and not a soft 404
          expect(result.found).toBe(true);
          expect(result.isSoft404).toBe(false);
          expect(result.content).toBe(robotsContent);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 16: Soft 404 Detection
   * **Validates: Requirements 4.2**
   * 
   * For any robots.txt request that returns 200 with HTML content,
   * when the ExtractionEngine validates the response, the system should treat the file as missing (soft 404).
   */
  it('Property 16: should detect soft 404 when robots.txt returns HTML', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.constantFrom(
          '<!DOCTYPE html><html><head><title>404</title></head><body>Not Found</body></html>',
          '<html><body><h1>Page Not Found</h1></body></html>',
          '<!doctype html>\n<html>\n<head><title>Error</title></head>\n</html>',
          '<HTML><HEAD><TITLE>404</TITLE></HEAD></HTML>'
        ),
        async (baseUrl, htmlContent) => {
          // Mock fetch to return HTML instead of robots.txt
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            url: new URL('/robots.txt', baseUrl).href,
            headers: new Map([['content-type', 'text/html']]),
            text: async () => htmlContent,
          });

          const result = await engine.validateRobotsTxt(baseUrl);

          // Should detect soft 404
          expect(result.found).toBe(false);
          expect(result.isSoft404).toBe(true);
          expect(result.content).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 17: Sitemap XML Structure Validation
   * **Validates: Requirements 4.3**
   * 
   * For any sitemap.xml check, when the ExtractionEngine receives the file,
   * the system should verify it contains valid XML structure before treating it as present.
   */
  it('Property 17: should validate sitemap.xml has valid XML structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.constantFrom(
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://example.com/</loc></url>\n</urlset>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://example.com/page</loc></url>\n</urlset>',
          '<?xml version="1.0"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>https://example.com/sitemap1.xml</loc></sitemap>\n</sitemapindex>',
          '<sitemapindex>\n<sitemap><loc>https://example.com/sitemap.xml</loc></sitemap>\n</sitemapindex>'
        ),
        async (baseUrl, xmlContent) => {
          // Mock fetch to return valid XML
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            url: new URL('/sitemap.xml', baseUrl).href,
            headers: new Map([['content-type', 'application/xml']]),
            text: async () => xmlContent,
          });

          const result = await engine.validateSitemapXml(baseUrl);

          // Should be found and valid XML
          expect(result.found).toBe(true);
          expect(result.isValidXml).toBe(true);
          expect(result.content).toBe(xmlContent);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Redirect Following for Resource Files
   * **Validates: Requirements 4.4**
   * 
   * For any robots.txt or sitemap.xml request that returns a redirect,
   * when the ExtractionEngine processes the response, the system should follow the redirect
   * and validate the final destination.
   */
  it('Property 18: should follow redirects for robots.txt and validate final destination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.constantFrom(
          'User-agent: *\nDisallow: /admin\n',
          'User-agent: GPTBot\nAllow: /\n'
        ),
        async (baseUrl, robotsContent) => {
          const originalUrl = new URL('/robots.txt', baseUrl).href;
          const finalUrl = new URL('/static/robots.txt', baseUrl).href;

          // Mock fetch to simulate redirect (fetch API follows redirects automatically)
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            url: finalUrl, // Final URL after redirect
            headers: new Map([['content-type', 'text/plain']]),
            text: async () => robotsContent,
          });

          const result = await engine.validateRobotsTxt(baseUrl);

          // Should follow redirect and validate final destination
          expect(result.found).toBe(true);
          expect(result.isSoft404).toBe(false);
          expect(result.finalUrl).toBe(finalUrl);
          expect(result.redirectChain).toBeDefined();
          expect(result.redirectChain).toContain(originalUrl);
          expect(result.redirectChain).toContain(finalUrl);
          expect(result.content).toBe(robotsContent);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property: Sitemap redirect following
   */
  it('should follow redirects for sitemap.xml and validate final destination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.constantFrom(
          '<?xml version="1.0"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://example.com/</loc></url>\n</urlset>',
          '<urlset>\n<url><loc>https://example.com/page</loc></url>\n</urlset>'
        ),
        async (baseUrl, xmlContent) => {
          const originalUrl = new URL('/sitemap.xml', baseUrl).href;
          const finalUrl = new URL('/static/sitemap.xml', baseUrl).href;

          // Mock fetch to simulate redirect
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            url: finalUrl, // Final URL after redirect
            headers: new Map([['content-type', 'application/xml']]),
            text: async () => xmlContent,
          });

          const result = await engine.validateSitemapXml(baseUrl);

          // Should follow redirect and validate final destination
          expect(result.found).toBe(true);
          expect(result.isValidXml).toBe(true);
          expect(result.finalUrl).toBe(finalUrl);
          expect(result.redirectChain).toBeDefined();
          expect(result.redirectChain).toContain(originalUrl);
          expect(result.redirectChain).toContain(finalUrl);
          expect(result.content).toBe(xmlContent);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property: Invalid XML should not be treated as valid sitemap
   */
  it('should reject sitemap.xml with HTML content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        fc.constantFrom(
          '<!DOCTYPE html><html><head><title>404</title></head><body>Not Found</body></html>',
          '<html><body><h1>Page Not Found</h1></body></html>'
        ),
        async (baseUrl, htmlContent) => {
          // Mock fetch to return HTML instead of XML
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            url: new URL('/sitemap.xml', baseUrl).href,
            headers: new Map([['content-type', 'text/html']]),
            text: async () => htmlContent,
          });

          const result = await engine.validateSitemapXml(baseUrl);

          // Should not be valid XML
          expect(result.found).toBe(false);
          expect(result.isValidXml).toBe(false);
          expect(result.content).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property: 404 responses should be handled correctly
   */
  it('should handle 404 responses for robots.txt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        async (baseUrl) => {
          // Mock fetch to return 404
          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            url: new URL('/robots.txt', baseUrl).href,
            headers: new Map(),
            text: async () => '',
          });

          const result = await engine.validateRobotsTxt(baseUrl);

          // Should not be found
          expect(result.found).toBe(false);
          expect(result.isSoft404).toBe(false);
          expect(result.content).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Additional property: 404 responses should be handled correctly for sitemap
   */
  it('should handle 404 responses for sitemap.xml', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        async (baseUrl) => {
          // Mock fetch to return 404
          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            url: new URL('/sitemap.xml', baseUrl).href,
            headers: new Map(),
            text: async () => '',
          });

          const result = await engine.validateSitemapXml(baseUrl);

          // Should not be found
          expect(result.found).toBe(false);
          expect(result.isValidXml).toBe(false);
          expect(result.content).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});
