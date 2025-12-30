/**
 * Checkpoint Test - Verify Basic Functionality
 * Tests for extractLinks() and checkBrokenLinks()
 * 
 * Task 4: Checkpoint - Базовая функциональность работает
 */

import { describe, it, expect } from 'vitest';
import { extractLinks, isInternalLink, classifyLinkType } from '../extractor';
import { checkBrokenLinks } from '../brokenLinkChecker';
import { JSDOM } from 'jsdom';

describe('Checkpoint: Basic Functionality', () => {
  describe('extractLinks()', () => {
    it('should extract all <a> elements from HTML', () => {
      const html = `
        <html>
          <body>
            <a href="/page1">Internal Link 1</a>
            <a href="https://external.com">External Link</a>
            <a href="/page2">Internal Link 2</a>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(links.length).toBe(3);
      expect(links[0].href).toBe('https://mysite.com/page1');
      expect(links[1].href).toBe('https://external.com');
      expect(links[2].href).toBe('https://mysite.com/page2');
    });

    it('should classify internal vs external links correctly', () => {
      const html = `
        <html>
          <body>
            <a href="/internal">Internal</a>
            <a href="https://mysite.com/page">Internal Absolute</a>
            <a href="https://external.com">External</a>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(isInternalLink(links[0].href, baseUrl)).toBe(true);
      expect(isInternalLink(links[1].href, baseUrl)).toBe(true);
      expect(isInternalLink(links[2].href, baseUrl)).toBe(false);
    });

    it('should normalize relative URLs to absolute', () => {
      const html = `
        <html>
          <body>
            <a href="/about">About</a>
            <a href="contact">Contact</a>
            <a href="../parent">Parent</a>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com/blog/';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(links[0].href).toBe('https://mysite.com/about');
      expect(links[1].href).toBe('https://mysite.com/blog/contact');
      // URL constructor normalizes '../parent' to '/parent'
      expect(links[2].href).toBe('https://mysite.com/parent');
    });

    it('should detect nofollow links', () => {
      const html = `
        <html>
          <body>
            <a href="/page1" rel="nofollow">Nofollow Link</a>
            <a href="/page2">Follow Link</a>
            <a href="/page3" rel="nofollow ugc">Nofollow UGC</a>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(links[0].isNofollow).toBe(true);
      expect(links[1].isNofollow).toBe(false);
      expect(links[2].isNofollow).toBe(true);
    });

    it('should extract anchor text', () => {
      const html = `
        <html>
          <body>
            <a href="/page1">Click Here</a>
            <a href="/page2"><img src="image.jpg" alt="Image Link" /></a>
            <a href="/page3"></a>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(links[0].text).toBe('Click Here');
      expect(links[1].text).toBe('Image Link'); // From alt text
      expect(links[2].text).toBe('');
    });

    it('should detect image links', () => {
      const html = `
        <html>
          <body>
            <a href="/page1"><img src="image.jpg" /></a>
            <a href="/page2">Text Link</a>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(links[0].hasImage).toBe(true);
      expect(links[1].hasImage).toBe(false);
    });

    it('should skip special protocols (mailto, tel, javascript)', () => {
      const html = `
        <html>
          <body>
            <a href="mailto:test@example.com">Email</a>
            <a href="tel:+1234567890">Phone</a>
            <a href="javascript:void(0)">JavaScript</a>
            <a href="/normal">Normal Link</a>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      // Should only extract the normal link
      expect(links.length).toBe(1);
      expect(links[0].href).toBe('https://mysite.com/normal');
    });

    it('should extract JavaScript-based links (data-href)', () => {
      const html = `
        <html>
          <body>
            <div data-href="/page1">Click Me</div>
            <button data-href="https://external.com">Button</button>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(links.length).toBe(2);
      expect(links[0].href).toBe('https://mysite.com/page1');
      expect(links[1].href).toBe('https://external.com');
    });

    it('should extract JavaScript-based links (onclick)', () => {
      const html = `
        <html>
          <body>
            <div onclick="location.href='/page1'">Click Me</div>
            <button onclick="window.location='https://external.com'">Button</button>
          </body>
        </html>
      `;
      
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const baseUrl = 'https://mysite.com';
      
      const links = extractLinks(doc, baseUrl);
      
      expect(links.length).toBe(2);
      expect(links[0].href).toBe('https://mysite.com/page1');
      expect(links[1].href).toBe('https://external.com');
    });
  });

  describe('classifyLinkType()', () => {
    const baseUrl = 'https://mysite.com/page';

    it('should classify internal links', () => {
      expect(classifyLinkType('https://mysite.com/about', baseUrl)).toBe('internal');
      // Relative URLs need to be normalized first before classification
      const normalizedUrl = new URL('/contact', baseUrl).href;
      expect(classifyLinkType(normalizedUrl, baseUrl)).toBe('internal');
    });

    it('should classify external links', () => {
      expect(classifyLinkType('https://external.com', baseUrl)).toBe('external');
      expect(classifyLinkType('https://other-site.com/page', baseUrl)).toBe('external');
    });

    it('should classify anchor links', () => {
      expect(classifyLinkType('#section', baseUrl)).toBe('anchor');
    });

    it('should classify mailto links', () => {
      expect(classifyLinkType('mailto:test@example.com', baseUrl)).toBe('mailto');
    });

    it('should classify tel links', () => {
      expect(classifyLinkType('tel:+1234567890', baseUrl)).toBe('tel');
    });
  });

  describe('checkBrokenLinks()', () => {
    it('should check a working link (200 status)', async () => {
      // Using a reliable public URL
      const results = await checkBrokenLinks(['https://www.google.com']);
      
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://www.google.com');
      expect(results[0].broken).toBe(false);
      expect(results[0].status).toBeGreaterThanOrEqual(200);
      expect(results[0].status).toBeLessThan(400);
    }, 10000); // 10 second timeout for network request

    it('should detect a broken link (404 status)', async () => {
      // Using a URL that should return 404
      const results = await checkBrokenLinks(['https://www.google.com/this-page-definitely-does-not-exist-12345']);
      
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://www.google.com/this-page-definitely-does-not-exist-12345');
      expect(results[0].broken).toBe(true);
      expect(results[0].status).toBe(404);
    }, 10000);

    it('should handle multiple links in parallel', async () => {
      const urls = [
        'https://www.google.com',
        'https://www.github.com',
        'https://www.wikipedia.org',
      ];
      
      const startTime = Date.now();
      const results = await checkBrokenLinks(urls);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      
      // Parallel execution should be faster than sequential
      // (3 requests * 5 seconds each = 15 seconds sequential)
      // Parallel should complete in ~5-7 seconds
      expect(duration).toBeLessThan(12000);
    }, 15000);

    it('should limit the number of checks (maxChecks)', async () => {
      const urls = [
        'https://www.google.com',
        'https://www.github.com',
        'https://www.wikipedia.org',
        'https://www.stackoverflow.com',
        'https://www.reddit.com',
      ];
      
      const results = await checkBrokenLinks(urls, 3);
      
      // Should only check first 3 links
      expect(results).toHaveLength(3);
    }, 15000);

    it('should handle timeout gracefully', async () => {
      // Using a URL that will timeout (non-existent domain)
      const results = await checkBrokenLinks(['https://this-domain-definitely-does-not-exist-12345.com']);
      
      expect(results).toHaveLength(1);
      expect(results[0].broken).toBe(true);
      expect(results[0].error).toBeDefined();
    }, 10000);
  });
});
