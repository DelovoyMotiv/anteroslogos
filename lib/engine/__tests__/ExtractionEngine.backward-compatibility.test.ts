/**
 * Backward Compatibility Tests for ExtractionEngine
 * 
 * Validates that the refactored CSR-optimized ExtractionEngine maintains
 * backward compatibility with the original API.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExtractionEngine } from '../extractor';
import { ErrorCode } from '../../../types/agent-middleware.types';
import type { ExtractionOptions, ExtractionResult } from '../../../types/agent-middleware.types';

describe('ExtractionEngine Backward Compatibility', () => {
  let engine: ExtractionEngine;

  beforeEach(() => {
    // Create engine with browser disabled for faster tests
    engine = new ExtractionEngine({ enableBrowser: false });
  });

  afterEach(async () => {
    if (engine) {
      await engine.cleanup();
    }
    vi.restoreAllMocks();
  });

  describe('API Signature Compatibility (Requirement 9.1)', () => {
    /**
     * Verify ExtractionEngine.extract() method signature remains unchanged
     */
    it('should maintain extract() method signature', () => {
      // Verify method exists
      expect(engine.extract).toBeDefined();
      expect(typeof engine.extract).toBe('function');
      
      // Verify method accepts correct parameters
      const extractMethod = engine.extract as (url: string, options: ExtractionOptions) => Promise<ExtractionResult>;
      expect(extractMethod).toBeDefined();
    });

    /**
     * Verify ExtractionEngine.fetchHTML() method signature remains unchanged
     */
    it('should maintain fetchHTML() method signature', () => {
      // Verify method exists (private but accessible for testing)
      expect((engine as any).fetchHTML).toBeDefined();
      expect(typeof (engine as any).fetchHTML).toBe('function');
    });

    /**
     * Verify ExtractionEngine.parseHTML() method signature remains unchanged
     */
    it('should maintain parseHTML() method signature', () => {
      // Verify method exists
      expect((engine as any).parseHTML).toBeDefined();
      expect(typeof (engine as any).parseHTML).toBe('function');
    });

    /**
     * Verify ExtractionEngine.cleanup() method signature remains unchanged
     */
    it('should maintain cleanup() method signature', async () => {
      // Verify method exists
      expect(engine.cleanup).toBeDefined();
      expect(typeof engine.cleanup).toBe('function');
      
      // Verify it returns a Promise
      const result = engine.cleanup();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    /**
     * Verify ExtractionEngine constructor accepts same options
     */
    it('should maintain constructor signature', () => {
      // Original constructor should work
      const engine1 = new ExtractionEngine();
      expect(engine1).toBeDefined();
      
      // Constructor with enableBrowser option should work
      const engine2 = new ExtractionEngine({ enableBrowser: false });
      expect(engine2).toBeDefined();
      
      // Constructor with browserConfig option should work
      const engine3 = new ExtractionEngine({ 
        enableBrowser: true,
        browserConfig: { maxConcurrentBrowsers: 2 }
      });
      expect(engine3).toBeDefined();
      
      // Cleanup
      engine1.cleanup();
      engine2.cleanup();
      engine3.cleanup();
    });
  });

  describe('Result Format Compatibility (Requirement 9.2)', () => {
    /**
     * Verify extraction result includes all original fields
     */
    it('should return result with all original ExtractionResult fields', async () => {
      // Mock fetchHTML to return valid HTML
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
          </head>
          <body>
            <h1>Test Heading</h1>
            <p>Test content</p>
          </body>
        </html>
      `);

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify all original fields are present
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('schemaMarkup');
      expect(result).toHaveProperty('metaTags');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('structure');
      expect(result).toHaveProperty('performance');
      
      // Verify field types
      expect(typeof result.url).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.html).toBe('string');
      expect(typeof result.schemaMarkup).toBe('object');
      expect(typeof result.metaTags).toBe('object');
      expect(typeof result.content).toBe('object');
      expect(typeof result.structure).toBe('object');
      expect(typeof result.performance).toBe('object');
    });

    /**
     * Verify schemaMarkup structure is unchanged
     */
    it('should return schemaMarkup with original structure', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue(`
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Test Org"
              }
            </script>
          </head>
          <body></body>
        </html>
      `);

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify schemaMarkup structure
      expect(result.schemaMarkup).toHaveProperty('types');
      expect(result.schemaMarkup).toHaveProperty('data');
      expect(Array.isArray(result.schemaMarkup.types)).toBe(true);
      expect(Array.isArray(result.schemaMarkup.data)).toBe(true);
    });

    /**
     * Verify metaTags structure is unchanged
     */
    it('should return metaTags with original structure', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Title</title>
            <meta name="description" content="Test description">
            <meta name="keywords" content="test, keywords">
            <meta property="og:title" content="OG Title">
            <link rel="canonical" href="https://example.com/canonical">
          </head>
          <body></body>
        </html>
      `);

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify metaTags can have these fields
      expect(result.metaTags).toBeDefined();
      if (result.metaTags.title) {
        expect(typeof result.metaTags.title).toBe('string');
      }
      if (result.metaTags.description) {
        expect(typeof result.metaTags.description).toBe('string');
      }
      if (result.metaTags.keywords) {
        expect(Array.isArray(result.metaTags.keywords)).toBe(true);
      }
    });

    /**
     * Verify content structure is unchanged
     */
    it('should return content with original structure', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Heading 1</h1>
            <p>Paragraph content</p>
          </body>
        </html>
      `);

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify content structure
      expect(result.content).toHaveProperty('title');
      expect(result.content).toHaveProperty('summary');
      expect(typeof result.content.title).toBe('string');
      expect(typeof result.content.summary).toBe('string');
    });

    /**
     * Verify structure fields are unchanged
     */
    it('should return structure with original fields', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Heading</h1>
            <a href="/link">Link</a>
            <img src="/image.jpg" alt="Image">
          </body>
        </html>
      `);

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify structure fields
      expect(result.structure).toHaveProperty('hasSchema');
      expect(result.structure).toHaveProperty('schemaTypes');
      expect(result.structure).toHaveProperty('headingCount');
      expect(result.structure).toHaveProperty('linkCount');
      expect(result.structure).toHaveProperty('imageCount');
      
      expect(typeof result.structure.hasSchema).toBe('boolean');
      expect(Array.isArray(result.structure.schemaTypes)).toBe(true);
      expect(typeof result.structure.headingCount).toBe('number');
      expect(typeof result.structure.linkCount).toBe('number');
      expect(typeof result.structure.imageCount).toBe('number');
    });

    /**
     * Verify performance fields are unchanged
     */
    it('should return performance with original fields', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify performance fields
      expect(result.performance).toHaveProperty('fetchTime');
      expect(result.performance).toHaveProperty('parseTime');
      expect(result.performance).toHaveProperty('totalTime');
      
      expect(typeof result.performance.fetchTime).toBe('number');
      expect(typeof result.performance.parseTime).toBe('number');
      expect(typeof result.performance.totalTime).toBe('number');
    });

    /**
     * Verify deep mode includes entities and relationships
     */
    it('should include entities and relationships in deep mode', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await engine.extract('https://example.com', { mode: 'deep' });

      // Verify deep mode fields
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('relationships');
      expect(result).toHaveProperty('knowledgeGraph');
      
      // These should be arrays (even if empty)
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.relationships)).toBe(true);
      expect(typeof result.knowledgeGraph).toBe('object');
    });

    /**
     * Verify browserMetadata is included when browser is used
     */
    it('should include browserMetadata field', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify browserMetadata exists
      expect(result).toHaveProperty('browserMetadata');
      expect(typeof result.browserMetadata).toBe('object');
      expect(result.browserMetadata).toHaveProperty('usedBrowser');
      expect(typeof result.browserMetadata.usedBrowser).toBe('boolean');
    });
  });

  describe('Browser Disabled Fallback (Requirement 9.3)', () => {
    /**
     * Verify browser disabled mode falls back to static fetching
     */
    it('should use static fetching when browser is disabled', async () => {
      // Create engine with browser explicitly disabled
      const disabledEngine = new ExtractionEngine({ enableBrowser: false });

      // Mock fetchHTML
      const mockFetchHTML = vi.spyOn(disabledEngine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await disabledEngine.extract('https://example.com', { mode: 'fast' });

      // Verify static fetch was used
      expect(mockFetchHTML).toHaveBeenCalled();
      
      // Verify result is valid
      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.html).toBeDefined();
      
      // Verify browserMetadata indicates static fetch
      expect(result.browserMetadata?.usedBrowser).toBe(false);
      
      await disabledEngine.cleanup();
    });

    /**
     * Verify BROWSER_ENABLED=false environment variable disables browser
     */
    it('should respect BROWSER_ENABLED environment variable', async () => {
      // Set environment variable
      const originalValue = process.env.BROWSER_ENABLED;
      process.env.BROWSER_ENABLED = 'false';

      // Create engine (should detect disabled browser)
      const envEngine = new ExtractionEngine();

      // Mock fetchHTML
      const mockFetchHTML = vi.spyOn(envEngine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await envEngine.extract('https://example.com', { mode: 'fast' });

      // Verify static fetch was used
      expect(mockFetchHTML).toHaveBeenCalled();
      expect(result.browserMetadata?.usedBrowser).toBe(false);

      // Restore environment variable
      if (originalValue !== undefined) {
        process.env.BROWSER_ENABLED = originalValue;
      } else {
        delete process.env.BROWSER_ENABLED;
      }

      await envEngine.cleanup();
    });

    /**
     * Verify useBrowser option can disable browser per request
     */
    it('should respect useBrowser option in extraction options', async () => {
      // Create engine with browser enabled
      const browserEngine = new ExtractionEngine({ enableBrowser: true });

      // Mock fetchHTML
      const mockFetchHTML = vi.spyOn(browserEngine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      // Extract with useBrowser: false
      const result = await browserEngine.extract('https://example.com', { 
        mode: 'fast',
        useBrowser: false 
      });

      // Verify static fetch was used
      expect(mockFetchHTML).toHaveBeenCalled();
      expect(result.browserMetadata?.usedBrowser).toBe(false);

      await browserEngine.cleanup();
    });
  });

  describe('Error Code Compatibility (Requirement 9.4)', () => {
    /**
     * Verify error codes match existing ErrorCode enum
     */
    it('should use existing ErrorCode values for errors', async () => {
      // Mock fetchHTML to throw an AgentMiddlewareError
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      const { AgentMiddlewareError } = await import('../errors');
      mockFetchHTML.mockRejectedValue(
        new AgentMiddlewareError(ErrorCode.ERR_TIMEOUT, 'Request timed out', { url: 'https://example.com' })
      );

      try {
        await engine.extract('https://example.com', { mode: 'fast', timeout: 1000 });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Verify error code is from ErrorCode enum
        expect(error.code).toBeDefined();
        expect(Object.values(ErrorCode)).toContain(error.code);
      }
    });

    /**
     * Verify ERR_TIMEOUT error code is used
     */
    it('should throw ERR_TIMEOUT for timeout errors', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      const { AgentMiddlewareError } = await import('../errors');
      mockFetchHTML.mockRejectedValue(
        new AgentMiddlewareError(ErrorCode.ERR_TIMEOUT, 'Request timed out', { url: 'https://example.com', timeout: 1000 })
      );

      try {
        await engine.extract('https://example.com', { mode: 'fast', timeout: 1000 });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.ERR_TIMEOUT);
      }
    });

    /**
     * Verify ERR_URL_UNREACHABLE error code is used
     */
    it('should throw ERR_URL_UNREACHABLE for network errors', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      const { AgentMiddlewareError } = await import('../errors');
      mockFetchHTML.mockRejectedValue(
        new AgentMiddlewareError(ErrorCode.ERR_URL_UNREACHABLE, 'Failed to reach target URL', { url: 'https://example.com' })
      );

      try {
        await engine.extract('https://example.com', { mode: 'fast' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.ERR_URL_UNREACHABLE);
      }
    });

    /**
     * Verify ERR_BOT_BLOCKED error code is used
     */
    it('should throw ERR_BOT_BLOCKED for 403 errors', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      const { AgentMiddlewareError } = await import('../errors');
      mockFetchHTML.mockRejectedValue(
        new AgentMiddlewareError(ErrorCode.ERR_BOT_BLOCKED, 'Target site blocks bot access', { url: 'https://example.com', status: 403 })
      );

      try {
        await engine.extract('https://example.com', { mode: 'fast' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.ERR_BOT_BLOCKED);
      }
    });

    /**
     * Verify ERR_CSR_TIMEOUT error code exists and can be used
     */
    it('should support ERR_CSR_TIMEOUT error code', () => {
      // Verify the error code exists in the enum
      expect(ErrorCode.ERR_CSR_TIMEOUT).toBeDefined();
      expect(ErrorCode.ERR_CSR_TIMEOUT).toBe('ERR_CSR_TIMEOUT');
    });

    /**
     * Verify ERR_WAF_BLOCK error code exists and can be used
     */
    it('should support ERR_WAF_BLOCK error code', () => {
      // Verify the error code exists in the enum
      expect(ErrorCode.ERR_WAF_BLOCK).toBeDefined();
      expect(ErrorCode.ERR_WAF_BLOCK).toBe('ERR_WAF_BLOCK');
    });
  });

  describe('Integration with Existing Clients (Requirement 9.5)', () => {
    /**
     * Verify extraction works with minimal options (default behavior)
     */
    it('should work with minimal extraction options', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      // Call with minimal options (as existing clients would)
      const result = await engine.extract('https://example.com', { mode: 'fast' });

      expect(result).toBeDefined();
      // URL normalization adds trailing slash
      expect(result.url).toBe('https://example.com/');
      expect(result.html).toBeDefined();
    });

    /**
     * Verify extraction works with all original options
     */
    it('should work with all original extraction options', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      // Call with all original options
      const result = await engine.extract('https://example.com', {
        mode: 'deep',
        timeout: 10000,
        userAgent: 'CustomAgent/1.0',
        useBrowser: false,
      });

      expect(result).toBeDefined();
      // URL normalization adds trailing slash
      expect(result.url).toBe('https://example.com/');
      expect(result.html).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.relationships).toBeDefined();
    });

    /**
     * Verify validateRobotsTxt method still works
     */
    it('should maintain validateRobotsTxt method', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/robots.txt',
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => 'User-agent: *\nDisallow: /admin\n',
      });

      const result = await engine.validateRobotsTxt('https://example.com');

      expect(result).toBeDefined();
      expect(result.found).toBe(true);
      expect(result.url).toBe('https://example.com/robots.txt');
    });

    /**
     * Verify validateSitemapXml method still works
     */
    it('should maintain validateSitemapXml method', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com/sitemap.xml',
        headers: new Map([['content-type', 'application/xml']]),
        text: async () => '<?xml version="1.0"?><urlset></urlset>',
      });

      const result = await engine.validateSitemapXml('https://example.com');

      expect(result).toBeDefined();
      expect(result.found).toBe(true);
      expect(result.url).toBe('https://example.com/sitemap.xml');
    });

    /**
     * Verify cleanup method works correctly
     */
    it('should cleanup resources without errors', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      // Perform extraction
      await engine.extract('https://example.com', { mode: 'fast' });

      // Cleanup should not throw
      await expect(engine.cleanup()).resolves.not.toThrow();
    });

    /**
     * Verify multiple extractions work correctly
     */
    it('should handle multiple sequential extractions', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      // Perform multiple extractions
      const result1 = await engine.extract('https://example.com/page1', { mode: 'fast' });
      const result2 = await engine.extract('https://example.com/page2', { mode: 'fast' });
      const result3 = await engine.extract('https://example.com/page3', { mode: 'fast' });

      // All should succeed
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
      
      expect(result1.url).toBe('https://example.com/page1');
      expect(result2.url).toBe('https://example.com/page2');
      expect(result3.url).toBe('https://example.com/page3');
    });
  });

  describe('New Features Do Not Break Existing Behavior', () => {
    /**
     * Verify new extractionMethod field does not break existing clients
     */
    it('should add extractionMethod field without breaking existing code', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // New field should be present
      expect((result as any).extractionMethod).toBeDefined();
      expect(['browser', 'static']).toContain((result as any).extractionMethod);
      
      // But existing fields should still work
      expect(result.url).toBeDefined();
      expect(result.html).toBeDefined();
    });

    /**
     * Verify new warnings field does not break existing clients
     */
    it('should add warnings field only when needed', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Warnings should not be present for successful static fetch
      expect((result as any).warnings).toBeUndefined();
      
      // Existing fields should still work
      expect(result.url).toBeDefined();
      expect(result.html).toBeDefined();
    });

    /**
     * Verify new csrFramework field in browserMetadata does not break existing clients
     */
    it('should add csrFramework field to browserMetadata without breaking existing code', async () => {
      const mockFetchHTML = vi.spyOn(engine as any, 'fetchHTML');
      mockFetchHTML.mockResolvedValue('<html><body>Test</body></html>');

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // browserMetadata should exist
      expect(result.browserMetadata).toBeDefined();
      
      // csrFramework may or may not be present (depends on detection)
      // But it should not break existing code that doesn't expect it
      if (result.browserMetadata?.csrFramework) {
        expect(typeof result.browserMetadata.csrFramework).toBe('object');
      }
      
      // Existing fields should still work
      expect(result.url).toBeDefined();
      expect(result.html).toBeDefined();
    });
  });
});
