/**
 * Integration tests for ExtractionEngine fallback strategy
 * Verifies that the ExtractionEngine correctly uses FallbackStrategy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtractionEngine } from '../extractor';
import { BrowserService } from '../BrowserService';
import { AgentMiddlewareError } from '../errors';
import { ErrorCode } from '../../../types/agent-middleware.types';

// Mock BrowserService
vi.mock('../BrowserService');

describe('ExtractionEngine Fallback Integration', () => {
  let engine: ExtractionEngine;
  let mockBrowserService: any;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Save original fetch
    originalFetch = global.fetch;
    
    // Create engine with browser enabled
    engine = new ExtractionEngine({ enableBrowser: true });
    
    // Get the mocked browser service
    mockBrowserService = (engine as any).browserService;
  });

  afterEach(async () => {
    // Restore original fetch
    global.fetch = originalFetch;
    
    await engine.cleanup();
    vi.clearAllMocks();
  });

  describe('Fallback for timeout errors (Requirement 4.1)', () => {
    it('should fallback to static fetching on timeout', async () => {
      // Mock browser service to throw timeout error
      mockBrowserService.fetchPageWithRetry = vi.fn().mockRejectedValue(
        new AgentMiddlewareError(
          ErrorCode.ERR_TIMEOUT,
          'Request timed out',
          { timeout: 15000 }
        )
      );

      // Mock static fetch to succeed
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });
      global.fetch = mockFetch as any;

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify fallback occurred
      expect(result.extractionMethod).toBe('static');
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain('timed out');
      expect(result.warnings![0]).toContain('CSR content may be unavailable');
    });

    it('should fallback to static fetching on CSR timeout', async () => {
      // Mock browser service to throw CSR timeout error
      mockBrowserService.fetchPageWithRetry = vi.fn().mockRejectedValue(
        new AgentMiddlewareError(
          ErrorCode.ERR_CSR_TIMEOUT,
          'JavaScript execution timed out',
          { timeout: 15000, timeoutDuration: 15000 }
        )
      );

      // Mock static fetch to succeed
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });
      global.fetch = mockFetch as any;

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify fallback occurred
      expect(result.extractionMethod).toBe('static');
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('15000ms');
    });
  });

  describe('No fallback for WAF blocks (Requirement 4.2)', () => {
    it('should not fallback on WAF block', async () => {
      // Mock browser service to throw WAF block error
      mockBrowserService.fetchPageWithRetry = vi.fn().mockRejectedValue(
        new AgentMiddlewareError(
          ErrorCode.ERR_WAF_BLOCK,
          'Request blocked by WAF'
        )
      );

      // Attempt extraction - should throw
      await expect(
        engine.extract('https://example.com', { mode: 'fast' })
      ).rejects.toThrow('Request blocked by WAF');
    });
  });

  describe('Fallback warnings (Requirement 4.3)', () => {
    it('should include warning message when fallback is used', async () => {
      // Mock browser service to throw network error
      mockBrowserService.fetchPageWithRetry = vi.fn().mockRejectedValue(
        new AgentMiddlewareError(
          ErrorCode.ERR_URL_UNREACHABLE,
          'Failed to reach URL'
        )
      );

      // Mock static fetch to succeed
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });
      global.fetch = mockFetch as any;

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify warning is present
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain('network error');
      expect(result.warnings![0]).toContain('CSR content may be unavailable');
      expect(result.csrSupport).toBe('unavailable');
    });
  });

  describe('Memory error fallback (Requirement 4.4)', () => {
    it('should fallback on memory error', async () => {
      // Mock browser service to throw memory error
      mockBrowserService.fetchPageWithRetry = vi.fn().mockRejectedValue(
        new AgentMiddlewareError(
          ErrorCode.ERR_INTERNAL,
          'Out of memory: heap allocation failed'
        )
      );

      // Mock static fetch to succeed
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });
      global.fetch = mockFetch as any;

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify fallback occurred
      expect(result.extractionMethod).toBe('static');
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('memory limits');
    });
  });

  describe('Extraction method tracking (Requirement 4.5)', () => {
    it('should track "browser" when browser succeeds', async () => {
      // Mock browser service to succeed
      mockBrowserService.fetchPageWithRetry = vi.fn().mockResolvedValue({
        html: '<html><body><h1>Test</h1></body></html>',
        finalUrl: 'https://example.com',
        redirectChain: [],
        loadTime: 1000,
        resourceCounts: { scripts: 0, stylesheets: 0, images: 0 },
      });

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify extraction method
      expect(result.extractionMethod).toBe('browser');
      expect(result.browserMetadata?.usedBrowser).toBe(true);
    });

    it('should track "static" when browser is disabled', async () => {
      // Create engine with browser disabled
      const staticEngine = new ExtractionEngine({ enableBrowser: false });

      // Mock static fetch to succeed
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });
      global.fetch = mockFetch as any;

      const result = await staticEngine.extract('https://example.com', { mode: 'fast' });

      // Verify extraction method
      expect(result.extractionMethod).toBe('static');
      expect(result.browserMetadata?.usedBrowser).toBe(false);

      await staticEngine.cleanup();
    });

    it('should track "static" when fallback is used', async () => {
      // Mock browser service to throw error
      mockBrowserService.fetchPageWithRetry = vi.fn().mockRejectedValue(
        new AgentMiddlewareError(ErrorCode.ERR_TIMEOUT, 'Timeout')
      );

      // Mock static fetch to succeed
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><h1>Test</h1></body></html>',
      });
      global.fetch = mockFetch as any;

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify extraction method
      expect(result.extractionMethod).toBe('static');
      expect(result.browserMetadata?.usedBrowser).toBe(false);
    });
  });

  describe('CSR framework tracking (Property 38)', () => {
    it('should include CSR framework info when browser succeeds', async () => {
      // Mock browser service to succeed with CSR framework
      mockBrowserService.fetchPageWithRetry = vi.fn().mockResolvedValue({
        html: '<html><body><h1>Test</h1></body></html>',
        finalUrl: 'https://example.com',
        redirectChain: [],
        loadTime: 1000,
        resourceCounts: { scripts: 0, stylesheets: 0, images: 0 },
        csrFramework: {
          framework: 'react',
          version: '18.0.0',
          markers: ['_reactRoot'],
        },
      });

      const result = await engine.extract('https://example.com', { mode: 'fast' });

      // Verify CSR framework is included
      expect(result.browserMetadata?.csrFramework).toBeDefined();
      expect(result.browserMetadata?.csrFramework?.framework).toBe('react');
      expect(result.browserMetadata?.csrFramework?.version).toBe('18.0.0');
    });
  });
});

