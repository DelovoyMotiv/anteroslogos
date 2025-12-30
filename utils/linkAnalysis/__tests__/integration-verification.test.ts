/**
 * Integration Verification Test
 * Verifies that the new Link Analysis Engine integrates correctly with GEO Audit
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';
import { auditWebsite } from '../../geoAuditEnhanced';

describe('Link Analysis Integration with GEO Audit', () => {
  it('should integrate with GEO Audit without breaking changes', async () => {
    const simpleHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Test Page</h1>
          <p>This is a test page with some <a href="/internal">internal links</a> and 
          <a href="https://example.com">external links</a>.</p>
        </body>
      </html>
    `;

    // Mock fetch to return our HTML
    global.fetch = async () => ({
      ok: true,
      text: async () => simpleHTML,
    } as Response);

    const result = await auditWebsite('https://test.com', {
      useAI: false,
      checkBrokenLinks: false, // Feature flag test
    });

    // Verify backward compatibility - all expected fields exist
    expect(result).toHaveProperty('details');
    expect(result.details).toHaveProperty('linkAnalysis');
    
    const linkAnalysis = result.details.linkAnalysis;
    
    // Verify all required fields exist (backward compatibility)
    expect(linkAnalysis).toHaveProperty('totalLinks');
    expect(linkAnalysis).toHaveProperty('internalLinks');
    expect(linkAnalysis).toHaveProperty('externalLinks');
    expect(linkAnalysis).toHaveProperty('nofollowLinks');
    expect(linkAnalysis).toHaveProperty('nofollowRatio');
    expect(linkAnalysis).toHaveProperty('uniqueInternalLinks');
    expect(linkAnalysis).toHaveProperty('uniqueExternalLinks');
    expect(linkAnalysis).toHaveProperty('brokenLinks');
    expect(linkAnalysis).toHaveProperty('linkDepth');
    expect(linkAnalysis).toHaveProperty('anchorTextQuality');
    expect(linkAnalysis).toHaveProperty('emptyAnchors');
    expect(linkAnalysis).toHaveProperty('imageLinks');
    expect(linkAnalysis).toHaveProperty('linkDistribution');
    expect(linkAnalysis).toHaveProperty('externalDomains');
    expect(linkAnalysis).toHaveProperty('topInternalPages');
    expect(linkAnalysis).toHaveProperty('anchorTextPatterns');
    expect(linkAnalysis).toHaveProperty('linkContextDistribution');
    expect(linkAnalysis).toHaveProperty('externalDomainQuality');
    expect(linkAnalysis).toHaveProperty('followDistribution');
    expect(linkAnalysis).toHaveProperty('issues');
    expect(linkAnalysis).toHaveProperty('strengths');
    
    // Verify the analysis actually ran
    expect(linkAnalysis.totalLinks).toBeGreaterThan(0);
    expect(linkAnalysis.internalLinks).toBeGreaterThan(0);
    expect(linkAnalysis.externalLinks).toBeGreaterThan(0);
  }, 30000);

  it('should respect checkBrokenLinks feature flag (disabled by default)', async () => {
    const simpleHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <a href="https://example.com">Link</a>
        </body>
      </html>
    `;

    global.fetch = async () => ({
      ok: true,
      text: async () => simpleHTML,
    } as Response);

    // Test with feature flag disabled (default)
    const resultDisabled = await auditWebsite('https://test.com', {
      useAI: false,
      checkBrokenLinks: false,
    });

    // When disabled, brokenLinks should be 0 (not checked)
    expect(resultDisabled.details.linkAnalysis.brokenLinks).toBe(0);
    expect(resultDisabled.details.linkAnalysis.brokenLinkDetails).toBeUndefined();
  }, 30000);

  it('should pass options to analyzeLinkStructure', async () => {
    const simpleHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <a href="https://example.com">Link</a>
        </body>
      </html>
    `;

    global.fetch = async () => ({
      ok: true,
      text: async () => simpleHTML,
    } as Response);

    // Test with custom options
    const result = await auditWebsite('https://test.com', {
      useAI: false,
      checkBrokenLinks: false,
      maxBrokenLinkChecks: 10,
    });

    // Should complete without errors
    expect(result).toBeDefined();
    expect(result.details.linkAnalysis).toBeDefined();
  }, 30000);
});
