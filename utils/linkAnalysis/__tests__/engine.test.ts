/**
 * Link Analysis Engine - Unit Tests
 * Tests for the main analyzeLinkStructure function
 */

import { describe, it, expect } from 'vitest';
import { analyzeLinkStructure } from '../engine';

describe('Link Analysis Engine', () => {
  describe('analyzeLinkStructure', () => {
    it('should analyze a simple HTML page with links', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page</title>
          </head>
          <body>
            <header>
              <nav>
                <a href="/about">About</a>
                <a href="/contact">Contact</a>
              </nav>
            </header>
            <main>
              <article>
                <h1>Test Article</h1>
                <p>This is a test article with <a href="https://example.com">external link</a>.</p>
                <p>And an <a href="/internal">internal link</a>.</p>
              </article>
            </main>
            <footer>
              <a href="/privacy">Privacy Policy</a>
            </footer>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      // Basic metrics
      expect(result.totalLinks).toBeGreaterThan(0);
      expect(result.internalLinks).toBeGreaterThan(0);
      expect(result.externalLinks).toBeGreaterThan(0);
      
      // Link context distribution
      expect(result.linkContextDistribution).toBeDefined();
      // At least some links should be detected in various contexts
      const totalContextLinks = Object.values(result.linkContextDistribution).reduce((a, b) => a + b, 0);
      expect(totalContextLinks).toBe(result.totalLinks);
      
      // Anchor text patterns
      expect(result.anchorTextPatterns).toBeDefined();
      
      // Issues and strengths
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.strengths)).toBe(true);
    });

    it('should handle empty HTML gracefully', async () => {
      const html = '<html><body></body></html>';
      
      const result = await analyzeLinkStructure('https://test.com', html);
      
      expect(result.totalLinks).toBe(0);
      expect(result.internalLinks).toBe(0);
      expect(result.externalLinks).toBe(0);
      expect(result.issues).toContain('No links found on page');
    });

    it('should classify internal vs external links correctly', async () => {
      const html = `
        <html>
          <body>
            <a href="https://test.com/page1">Internal 1</a>
            <a href="/page2">Internal 2</a>
            <a href="https://external.com">External</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.internalLinks).toBe(2);
      expect(result.externalLinks).toBe(1);
    });

    it('should calculate nofollow ratio correctly', async () => {
      const html = `
        <html>
          <body>
            <a href="/page1">Follow Link</a>
            <a href="/page2" rel="nofollow">Nofollow Link</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.totalLinks).toBe(2);
      expect(result.nofollowLinks).toBe(1);
      expect(result.nofollowRatio).toBe(50);
    });

    it('should detect empty anchors', async () => {
      const html = `
        <html>
          <body>
            <a href="/page1"></a>
            <a href="/page2">Text Link</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.emptyAnchors).toBe(1);
    });

    it('should detect image links', async () => {
      const html = `
        <html>
          <body>
            <a href="/page1"><img src="image.jpg" alt="Image"></a>
            <a href="/page2">Text Link</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.imageLinks).toBe(1);
    });

    it('should handle malformed HTML gracefully', async () => {
      const html = '<html><body><a href="invalid">Link</body>';
      
      const result = await analyzeLinkStructure('https://test.com', html);
      
      // Should not throw, should return some result
      expect(result).toBeDefined();
      expect(result.totalLinks).toBeGreaterThanOrEqual(0);
    });

    it('should respect timeout option', async () => {
      const html = '<html><body><a href="/page1">Link</a></body></html>';
      
      // Very short timeout - should still complete for simple HTML
      const result = await analyzeLinkStructure('https://test.com', html, {
        timeout: 100,
      });
      
      expect(result).toBeDefined();
    });

    it('should not check broken links by default', async () => {
      const html = `
        <html>
          <body>
            <a href="https://external.com">External</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.brokenLinks).toBe(0);
      expect(result.brokenLinkDetails).toBeUndefined();
    });

    it('should calculate link depth correctly', async () => {
      const html = `
        <html>
          <body>
            <a href="/page1">Page 1</a>
            <a href="/page2">Page 2</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.linkDepth).toBe('shallow'); // Only 2 unique internal links
    });

    it('should analyze external domain quality', async () => {
      const html = `
        <html>
          <body>
            <a href="https://wikipedia.org">Wikipedia</a>
            <a href="https://example.com">Example</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.externalDomainQuality).toBeDefined();
      expect(result.externalDomainQuality.topDomains.length).toBeGreaterThan(0);
    });

    it('should calculate top internal pages', async () => {
      const html = `
        <html>
          <body>
            <a href="/page1">Page 1</a>
            <a href="/page1">Page 1 Again</a>
            <a href="/page2">Page 2</a>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      expect(result.topInternalPages.length).toBeGreaterThan(0);
      expect(result.topInternalPages[0].count).toBe(2); // /page1 appears twice
    });

    it('should generate appropriate issues for poor link structure', async () => {
      const html = `
        <html>
          <body>
            <header>
              <a href="/page1">Link 1</a>
              <a href="/page2">Link 2</a>
              <a href="/page3">Link 3</a>
            </header>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      // All links in header, none in main content
      expect(result.issues.some(issue => 
        issue.includes('main content') || issue.includes('header/footer')
      )).toBe(true);
    });

    it('should generate strengths for good link structure', async () => {
      const html = `
        <html>
          <body>
            <main>
              <a href="/page1">Page 1</a>
              <a href="/page2">Page 2</a>
              <a href="/page3">Page 3</a>
              <a href="/page4">Page 4</a>
              <a href="/page5">Page 5</a>
            </main>
            <header>
              <a href="/about">About</a>
            </header>
          </body>
        </html>
      `;

      const result = await analyzeLinkStructure('https://test.com', html);

      // Most links in main content
      expect(result.strengths.length).toBeGreaterThan(0);
    });
  });
});
