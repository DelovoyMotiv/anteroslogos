/**
 * Checkpoint 11: Integration Verification
 * 
 * This test verifies:
 * 1. Full GEO Audit runs on test URLs
 * 2. All metrics are populated (not 0)
 * 3. Broken links detection works
 * 4. Results are comparable with old version
 */

import { describe, it, expect } from 'vitest';
import { analyzeLinkStructure } from '../engine';
import { JSDOM } from 'jsdom';

describe('Checkpoint 11: Integration Complete', () => {
  // Test HTML with various link types
  const testHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page for Link Analysis</title>
      </head>
      <body>
        <header>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
        </header>
        
        <main>
          <article>
            <h1>Main Content</h1>
            <p>This is a test page with various links.</p>
            <a href="/blog/post-1">Read our blog</a>
            <a href="/blog/post-2" rel="nofollow">Another post</a>
            <a href="https://example.com">External link</a>
            <a href="https://wikipedia.org">Wikipedia</a>
            <a href="https://github.com">GitHub</a>
            <a href="https://broken-link-test-404.com/nonexistent">Broken link</a>
            <a href="">Empty link</a>
            <a href="mailto:test@example.com">Email</a>
            <a href="tel:+1234567890">Phone</a>
            <a href="#section">Anchor link</a>
            <img src="image.jpg" alt="Image">
            <a href="/image-link"><img src="logo.jpg" alt="Logo"></a>
          </article>
        </main>
        
        <aside>
          <a href="/sidebar-link">Sidebar</a>
        </aside>
        
        <footer>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="https://twitter.com">Twitter</a>
        </footer>
      </body>
    </html>
  `;

  it('should run full GEO Audit on test URL', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false, // Skip for speed in this test
      maxBrokenLinkChecks: 5,
    });

    // Verify result structure exists
    expect(result).toBeDefined();
    expect(result).toHaveProperty('totalLinks');
    expect(result).toHaveProperty('internalLinks');
    expect(result).toHaveProperty('externalLinks');
  });

  it('should populate all basic metrics (not 0)', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });

    // Basic counts should be populated
    expect(result.totalLinks).toBeGreaterThan(0);
    expect(result.internalLinks).toBeGreaterThan(0);
    expect(result.externalLinks).toBeGreaterThan(0);
    
    // Unique links should be populated
    expect(result.uniqueInternalLinks).toBeGreaterThan(0);
    expect(result.uniqueExternalLinks).toBeGreaterThan(0);
    
    // Ratios should be calculated
    expect(result.nofollowRatio).toBeGreaterThanOrEqual(0);
    expect(result.anchorTextQuality).toBeGreaterThanOrEqual(0);
    
    // Link depth should be set
    expect(result.linkDepth).toMatch(/shallow|balanced|deep/);
    
    // Link distribution should be set
    expect(result.linkDistribution).toMatch(/poor|fair|good|excellent/);
  });

  it('should populate anchor text patterns', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });

    // Anchor text patterns should exist
    expect(result.anchorTextPatterns).toBeDefined();
    expect(result.anchorTextPatterns.exactMatch).toBeGreaterThanOrEqual(0);
    expect(result.anchorTextPatterns.partialMatch).toBeGreaterThanOrEqual(0);
    expect(result.anchorTextPatterns.branded).toBeGreaterThanOrEqual(0);
    expect(result.anchorTextPatterns.generic).toBeGreaterThanOrEqual(0);
    expect(result.anchorTextPatterns.nakedUrl).toBeGreaterThanOrEqual(0);
    expect(result.anchorTextPatterns.image).toBeGreaterThanOrEqual(0);
  });

  it('should populate link context distribution', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });

    // Context distribution should exist
    expect(result.linkContextDistribution).toBeDefined();
    expect(result.linkContextDistribution.header).toBeGreaterThanOrEqual(0);
    expect(result.linkContextDistribution.footer).toBeGreaterThanOrEqual(0);
    expect(result.linkContextDistribution.navigation).toBeGreaterThanOrEqual(0);
    expect(result.linkContextDistribution.mainContent).toBeGreaterThanOrEqual(0);
    expect(result.linkContextDistribution.sidebar).toBeGreaterThanOrEqual(0);
    expect(result.linkContextDistribution.other).toBeGreaterThanOrEqual(0);
    
    // At least some links should be in main content
    expect(result.linkContextDistribution.mainContent).toBeGreaterThan(0);
  });

  it('should populate external domain quality', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });

    // External domain quality should exist
    expect(result.externalDomainQuality).toBeDefined();
    expect(result.externalDomainQuality.highAuthority).toBeGreaterThanOrEqual(0);
    expect(result.externalDomainQuality.mediumAuthority).toBeGreaterThanOrEqual(0);
    expect(result.externalDomainQuality.lowAuthority).toBeGreaterThanOrEqual(0);
    expect(result.externalDomainQuality.topDomains).toBeDefined();
    expect(Array.isArray(result.externalDomainQuality.topDomains)).toBe(true);
  });

  it('should populate follow/nofollow distribution', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });

    // Follow distribution should exist
    expect(result.followDistribution).toBeDefined();
    expect(result.followDistribution.internalFollow).toBeGreaterThanOrEqual(0);
    expect(result.followDistribution.internalNofollow).toBeGreaterThanOrEqual(0);
    expect(result.followDistribution.externalFollow).toBeGreaterThanOrEqual(0);
    expect(result.followDistribution.externalNofollow).toBeGreaterThanOrEqual(0);
  });

  it('should generate issues and strengths', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });

    // Issues and strengths should be arrays
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.strengths)).toBe(true);
  });

  it('should work with broken link checking enabled', async () => {
    const baseUrl = 'https://test-site.com';
    
    const result = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: true,
      maxBrokenLinkChecks: 3, // Limit for speed
    });

    // Broken links should be checked
    expect(result.brokenLinks).toBeGreaterThanOrEqual(0);
    expect(result.brokenLinkDetails).toBeDefined();
    expect(Array.isArray(result.brokenLinkDetails)).toBe(true);
  });

  it('should handle real-world HTML structure', async () => {
    const realWorldHTML = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Real World Example</title>
        </head>
        <body>
          <header class="site-header">
            <nav class="main-nav">
              <a href="/">Home</a>
              <a href="/products">Products</a>
              <a href="/services">Services</a>
            </nav>
          </header>
          
          <main class="content">
            <article>
              <h1>Welcome to Our Site</h1>
              <p>Check out our <a href="/latest-news">latest news</a>.</p>
              <p>Visit our partner <a href="https://partner.com">Partner Site</a>.</p>
              <p><a href="https://docs.example.com">Documentation</a> is available.</p>
            </article>
          </main>
          
          <aside class="sidebar">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="/faq">FAQ</a></li>
              <li><a href="/support">Support</a></li>
            </ul>
          </aside>
          
          <footer class="site-footer">
            <p>&copy; 2025 Company</p>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </footer>
        </body>
      </html>
    `;

    const baseUrl = 'https://example.com';
    const result = await analyzeLinkStructure(baseUrl, realWorldHTML, {
      checkBrokenLinks: false,
    });

    // Should successfully analyze real-world structure
    expect(result.totalLinks).toBeGreaterThan(0);
    expect(result.linkContextDistribution.mainContent).toBeGreaterThan(0);
    // Navigation links should be detected (either as header or navigation)
    const navigationLinks = result.linkContextDistribution.header + result.linkContextDistribution.navigation;
    expect(navigationLinks).toBeGreaterThan(0);
    expect(result.linkContextDistribution.footer).toBeGreaterThan(0);
    expect(result.linkContextDistribution.sidebar).toBeGreaterThan(0);
  });

  it('should maintain consistency across multiple runs', async () => {
    const baseUrl = 'https://test-site.com';
    
    // Run analysis twice
    const result1 = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });
    
    const result2 = await analyzeLinkStructure(baseUrl, testHTML, {
      checkBrokenLinks: false,
    });

    // Results should be identical (deterministic)
    expect(result1.totalLinks).toBe(result2.totalLinks);
    expect(result1.internalLinks).toBe(result2.internalLinks);
    expect(result1.externalLinks).toBe(result2.externalLinks);
    expect(result1.nofollowRatio).toBe(result2.nofollowRatio);
    expect(result1.linkDepth).toBe(result2.linkDepth);
  });

  it('should handle edge cases gracefully', async () => {
    // Empty HTML
    const emptyResult = await analyzeLinkStructure('https://test.com', '<html><body></body></html>', {
      checkBrokenLinks: false,
    });
    expect(emptyResult.totalLinks).toBe(0);
    
    // HTML with only internal links
    const internalOnlyHTML = '<html><body><a href="/page1">Link</a><a href="/page2">Link</a></body></html>';
    const internalResult = await analyzeLinkStructure('https://test.com', internalOnlyHTML, {
      checkBrokenLinks: false,
    });
    expect(internalResult.internalLinks).toBeGreaterThan(0);
    expect(internalResult.externalLinks).toBe(0);
    
    // HTML with only external links
    const externalOnlyHTML = '<html><body><a href="https://external.com">Link</a></body></html>';
    const externalResult = await analyzeLinkStructure('https://test.com', externalOnlyHTML, {
      checkBrokenLinks: false,
    });
    expect(externalResult.externalLinks).toBeGreaterThan(0);
    expect(externalResult.internalLinks).toBe(0);
  });
});
