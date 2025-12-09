/**
 * Integration tests for GEO Audit with new Extraction Engine
 * Validates backward compatibility after refactoring
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { auditWebsite } from '../geoAudit';
import { auditWebsite as auditWebsiteEnhanced } from '../geoAuditEnhanced';

// Setup jsdom for DOMParser in Node.js environment
beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.DOMParser = dom.window.DOMParser as unknown as typeof DOMParser;
  global.Document = dom.window.Document as unknown as typeof Document;
});

// Mock the extraction engine to avoid actual network calls
vi.mock('../../lib/engine/extractor', () => ({
  createExtractionEngine: () => ({
    extract: vi.fn().mockResolvedValue({
      url: 'https://example.com',
      timestamp: new Date().toISOString(),
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="description" content="This is a test description for the example website">
          <title>Example Website - Test Page</title>
          <link rel="canonical" href="https://example.com">
          <meta property="og:title" content="Example Website">
          <meta property="og:description" content="Test description">
          <meta name="twitter:card" content="summary">
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Example Org",
            "url": "https://example.com"
          }
          </script>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Example Website",
            "url": "https://example.com"
          }
          </script>
        </head>
        <body>
          <header>
            <nav>
              <a href="/">Home</a>
              <a href="/about">About</a>
            </nav>
          </header>
          <main>
            <h1>Welcome to Example Website</h1>
            <p>This is a test paragraph with some content. It has enough words to be meaningful.</p>
            <p>Another paragraph with more content to test the audit functionality.</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </main>
          <footer>
            <p>Contact us at <a href="mailto:test@example.com">test@example.com</a></p>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </footer>
        </body>
        </html>
      `,
      schemaMarkup: {
        types: ['Organization', 'WebSite'],
        data: [
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Example Org',
            url: 'https://example.com',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Example Website',
            url: 'https://example.com',
          },
        ],
      },
      metaTags: {
        title: 'Example Website - Test Page',
        description: 'This is a test description for the example website',
        ogTitle: 'Example Website',
        ogDescription: 'Test description',
        twitterCard: 'summary',
        canonical: 'https://example.com',
      },
      content: {
        title: 'Welcome to Example Website',
        summary: 'This is a test paragraph with some content. It has enough words to be meaningful.',
      },
      structure: {
        hasSchema: true,
        schemaTypes: ['Organization', 'WebSite'],
        headingCount: 1,
        linkCount: 6,
        imageCount: 0,
      },
      performance: {
        fetchTime: 100,
        parseTime: 50,
        totalTime: 150,
      },
    }),
  }),
}));

describe('GEO Audit - Backward Compatibility', () => {
  describe('Basic GEO Audit (geoAudit.ts)', () => {
    it('should successfully audit a website using new Extraction Engine', async () => {
      const result = await auditWebsite('https://example.com');

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com');
      expect(result.timestamp).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should return all expected score categories', async () => {
      const result = await auditWebsite('https://example.com');

      expect(result.scores).toBeDefined();
      expect(result.scores.schemaMarkup).toBeGreaterThanOrEqual(0);
      expect(result.scores.metaTags).toBeGreaterThanOrEqual(0);
      expect(result.scores.aiCrawlers).toBeGreaterThanOrEqual(0);
      expect(result.scores.eeat).toBeGreaterThanOrEqual(0);
      expect(result.scores.structure).toBeGreaterThanOrEqual(0);
      expect(result.scores.performance).toBeGreaterThanOrEqual(0);
    });

    it('should return detailed audit results', async () => {
      const result = await auditWebsite('https://example.com');

      expect(result.details).toBeDefined();
      expect(result.details.schemaMarkup).toBeDefined();
      expect(result.details.metaTags).toBeDefined();
      expect(result.details.aiCrawlers).toBeDefined();
      expect(result.details.eeat).toBeDefined();
      expect(result.details.structure).toBeDefined();
      expect(result.details.performance).toBeDefined();
    });

    it('should detect schema markup correctly', async () => {
      const result = await auditWebsite('https://example.com');

      expect(result.details.schemaMarkup.hasOrganizationSchema).toBe(true);
      expect(result.details.schemaMarkup.hasWebSiteSchema).toBe(true);
      expect(result.details.schemaMarkup.totalSchemas).toBeGreaterThan(0);
    });

    it('should detect meta tags correctly', async () => {
      const result = await auditWebsite('https://example.com');

      expect(result.details.metaTags.hasTitle).toBe(true);
      expect(result.details.metaTags.hasDescription).toBe(true);
      expect(result.details.metaTags.hasOGTags).toBe(true);
      expect(result.details.metaTags.hasTwitterCard).toBe(true);
      expect(result.details.metaTags.hasCanonical).toBe(true);
    });

    it('should generate recommendations', async () => {
      const result = await auditWebsite('https://example.com');

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Enhanced GEO Audit (geoAuditEnhanced.ts)', () => {
    it('should successfully audit a website using new Extraction Engine', async () => {
      const result = await auditWebsiteEnhanced('https://example.com', {
        useAI: false, // Disable AI for testing
      });

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com');
      expect(result.timestamp).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.preciseScore).toBeDefined();
      expect(result.grade).toBeDefined();
    });

    it('should return all expected score categories including enhanced ones', async () => {
      const result = await auditWebsiteEnhanced('https://example.com', {
        useAI: false,
      });

      expect(result.scores).toBeDefined();
      expect(result.scores.schemaMarkup).toBeGreaterThanOrEqual(0);
      expect(result.scores.metaTags).toBeGreaterThanOrEqual(0);
      expect(result.scores.aiCrawlers).toBeGreaterThanOrEqual(0);
      expect(result.scores.eeat).toBeGreaterThanOrEqual(0);
      expect(result.scores.structure).toBeGreaterThanOrEqual(0);
      expect(result.scores.performance).toBeGreaterThanOrEqual(0);
      expect(result.scores.contentQuality).toBeGreaterThanOrEqual(0);
      expect(result.scores.citationPotential).toBeGreaterThanOrEqual(0);
      expect(result.scores.technicalSEO).toBeGreaterThanOrEqual(0);
      expect(result.scores.linkAnalysis).toBeGreaterThanOrEqual(0);
      expect(result.scores.aidAgent).toBeGreaterThanOrEqual(0);
    });

    it('should return enhanced audit details', async () => {
      const result = await auditWebsiteEnhanced('https://example.com', {
        useAI: false,
      });

      expect(result.details).toBeDefined();
      expect(result.details.schemaMarkup).toBeDefined();
      expect(result.details.metaTags).toBeDefined();
      expect(result.details.contentQuality).toBeDefined();
      expect(result.details.citationPotential).toBeDefined();
      expect(result.details.technicalSEO).toBeDefined();
      expect(result.details.linkAnalysis).toBeDefined();
      expect(result.details.aidAgent).toBeDefined();
    });

    it('should support progress callbacks', async () => {
      const progressStages: string[] = [];
      
      await auditWebsiteEnhanced('https://example.com', {
        useAI: false,
        onProgress: (stage) => {
          progressStages.push(stage);
        },
      });

      expect(progressStages.length).toBeGreaterThan(0);
      expect(progressStages[0]).toBe('Fetching website content...');
    });

    it('should generate enhanced recommendations', async () => {
      const result = await auditWebsiteEnhanced('https://example.com', {
        useAI: false,
      });

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      // Enhanced recommendations should have additional fields
      if (result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(rec.category).toBeDefined();
        expect(rec.priority).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.impact).toBeDefined();
      }
    });

    it('should generate insights', async () => {
      const result = await auditWebsiteEnhanced('https://example.com', {
        useAI: false,
      });

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URLs gracefully', async () => {
      // This will fail because the mock doesn't handle errors
      // In real implementation, the Extraction Engine will throw proper errors
      await expect(async () => {
        await auditWebsite('not-a-valid-url');
      }).rejects.toThrow();
    });
  });
});
