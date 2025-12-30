/**
 * Link Analysis Engine - Integration Tests
 * End-to-end tests with more complex scenarios
 */

import { describe, it, expect } from 'vitest';
import { analyzeLinkStructure } from '../engine';

describe('Link Analysis Engine - Integration', () => {
  it('should perform complete analysis on a realistic page', async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta property="og:site_name" content="Test Site">
          <title>Complete Test Page - Test Site</title>
        </head>
        <body>
          <header>
            <nav>
              <a href="/">Home</a>
              <a href="/about">About Us</a>
              <a href="/services">Services</a>
              <a href="/contact">Contact</a>
            </nav>
          </header>
          
          <main>
            <article>
              <h1>Complete Test Page</h1>
              <p>
                This is a comprehensive test with 
                <a href="/internal-page">internal links</a> and
                <a href="https://wikipedia.org">high authority external links</a>.
              </p>
              <p>
                We also have <a href="https://example.com">regular external links</a>
                and <a href="/another-page">more internal links</a>.
              </p>
              <p>
                Some links have <a href="/nofollow-page" rel="nofollow">nofollow attribute</a>.
              </p>
              <p>
                <a href="/image-link"><img src="test.jpg" alt="Test Image"></a>
              </p>
              <p>
                Generic anchors like <a href="/click">click here</a> should be detected.
              </p>
            </article>
          </main>
          
          <aside>
            <h2>Related Links</h2>
            <ul>
              <li><a href="/related-1">Related Article 1</a></li>
              <li><a href="/related-2">Related Article 2</a></li>
            </ul>
          </aside>
          
          <footer>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="https://twitter.com/testsite">Twitter</a>
          </footer>
        </body>
      </html>
    `;

    const result = await analyzeLinkStructure('https://testsite.com', html);

    // Verify basic metrics
    expect(result.totalLinks).toBeGreaterThan(10);
    expect(result.internalLinks).toBeGreaterThan(result.externalLinks);
    
    // Verify unique link counting
    expect(result.uniqueInternalLinks).toBeGreaterThan(0);
    expect(result.uniqueExternalLinks).toBeGreaterThan(0);
    
    // Verify nofollow detection
    expect(result.nofollowLinks).toBeGreaterThan(0);
    expect(result.nofollowRatio).toBeGreaterThan(0);
    expect(result.nofollowRatio).toBeLessThan(100);
    
    // Verify context distribution
    // Note: Context detection may vary based on DOM structure
    const totalContextLinks = Object.values(result.linkContextDistribution).reduce((a, b) => a + b, 0);
    expect(totalContextLinks).toBe(result.totalLinks);
    
    // At least some links should be in specific contexts
    expect(result.linkContextDistribution.mainContent + 
           result.linkContextDistribution.header + 
           result.linkContextDistribution.footer + 
           result.linkContextDistribution.sidebar).toBeGreaterThan(0);
    
    // Verify anchor text patterns
    expect(result.anchorTextPatterns.generic).toBeGreaterThan(0); // "click here"
    // Image links may or may not be classified as 'image' type depending on text content
    expect(result.imageLinks).toBeGreaterThan(0); // At least one image link exists
    
    // Verify external domain quality
    expect(result.externalDomainQuality.topDomains.length).toBeGreaterThan(0);
    const wikipediaDomain = result.externalDomainQuality.topDomains.find(
      d => d.domain === 'wikipedia.org'
    );
    expect(wikipediaDomain).toBeDefined();
    expect(wikipediaDomain!.estimatedAuthority).toBeGreaterThan(90);
    
    // Verify follow distribution
    expect(result.followDistribution.internalFollow).toBeGreaterThan(0);
    expect(result.followDistribution.internalNofollow).toBeGreaterThan(0);
    expect(result.followDistribution.externalFollow).toBeGreaterThan(0);
    
    // Verify link depth
    expect(['shallow', 'balanced', 'deep']).toContain(result.linkDepth);
    
    // Verify link distribution
    expect(['poor', 'fair', 'good', 'excellent']).toContain(result.linkDistribution);
    
    // Verify issues and strengths
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.strengths)).toBe(true);
    
    // Should have some issues or strengths
    expect(result.issues.length + result.strengths.length).toBeGreaterThan(0);
  });

  it('should handle page with only internal links', async () => {
    const html = `
      <html>
        <body>
          <main>
            <a href="/page1">Page 1</a>
            <a href="/page2">Page 2</a>
            <a href="/page3">Page 3</a>
          </main>
        </body>
      </html>
    `;

    const result = await analyzeLinkStructure('https://test.com', html);

    expect(result.totalLinks).toBe(3);
    expect(result.internalLinks).toBe(3);
    expect(result.externalLinks).toBe(0);
    expect(result.externalDomains).toHaveLength(0);
  });

  it('should handle page with only external links', async () => {
    const html = `
      <html>
        <body>
          <main>
            <a href="https://example.com">Example</a>
            <a href="https://test.org">Test</a>
          </main>
        </body>
      </html>
    `;

    const result = await analyzeLinkStructure('https://mysite.com', html);

    expect(result.totalLinks).toBe(2);
    expect(result.internalLinks).toBe(0);
    expect(result.externalLinks).toBe(2);
    expect(result.externalDomains.length).toBeGreaterThan(0);
  });

  it('should calculate anchor text quality correctly', async () => {
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <main>
            <a href="/page1">Descriptive Link Text</a>
            <a href="/page2">Another Good Description</a>
            <a href="/page3">click here</a>
            <a href="/page4">read more</a>
          </main>
        </body>
      </html>
    `;

    const result = await analyzeLinkStructure('https://test.com', html);

    // Should have some descriptive anchors
    expect(result.anchorTextQuality).toBeGreaterThan(0);
    
    // Should detect generic anchors
    expect(result.anchorTextPatterns.generic).toBe(2);
  });

  it('should handle complex link structure with duplicates', async () => {
    const html = `
      <html>
        <body>
          <main>
            <a href="/page1">Link 1</a>
            <a href="/page1">Link 1 Again</a>
            <a href="/page1">Link 1 Third Time</a>
            <a href="/page2">Link 2</a>
            <a href="/page2">Link 2 Again</a>
          </main>
        </body>
      </html>
    `;

    const result = await analyzeLinkStructure('https://test.com', html);

    expect(result.totalLinks).toBe(5);
    expect(result.uniqueInternalLinks).toBe(2); // Only 2 unique URLs
    
    // Top internal pages should show /page1 with count 3
    expect(result.topInternalPages[0].count).toBe(3);
    expect(result.topInternalPages[1].count).toBe(2);
  });

  it('should generate appropriate recommendations', async () => {
    const html = `
      <html>
        <body>
          <header>
            <a href="/page1">Link 1</a>
            <a href="/page2">Link 2</a>
            <a href="/page3">Link 3</a>
            <a href="/page4">Link 4</a>
            <a href="/page5">Link 5</a>
          </header>
          <main>
            <a href="/page6">Link 6</a>
          </main>
        </body>
      </html>
    `;

    const result = await analyzeLinkStructure('https://test.com', html);

    // Most links in header, should generate issue
    expect(result.issues.some(issue => 
      issue.toLowerCase().includes('main content') || 
      issue.toLowerCase().includes('header')
    )).toBe(true);
  });

  it('should handle timeout gracefully', async () => {
    const html = `
      <html>
        <body>
          <a href="https://example.com">Link</a>
        </body>
      </html>
    `;

    // Very short timeout
    const result = await analyzeLinkStructure('https://test.com', html, {
      timeout: 50,
    });

    // Should still return a result (may have default values)
    expect(result).toBeDefined();
    expect(result.totalLinks).toBeGreaterThanOrEqual(0);
  });
});
