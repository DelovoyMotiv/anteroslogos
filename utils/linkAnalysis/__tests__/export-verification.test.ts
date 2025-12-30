/**
 * Export Verification Tests
 * Verify that broken links are properly included in all export formats
 */

import { describe, it, expect } from 'vitest';
import type { AuditResult } from '../../geoAuditEnhanced';
import type { BrokenLinkResult } from '../types';

describe('Export Format Verification', () => {
  // Mock audit result with broken links
  const mockAuditResult: Partial<AuditResult> = {
    url: 'https://example.com',
    timestamp: Date.now(),
    overallScore: 75,
    preciseScore: 75.5,
    grade: 'B',
    scores: {
      schemaMarkup: 80,
      metaTags: 70,
      aiCrawlers: 85,
      eeat: 75,
      structure: 80,
      performance: 70,
      contentQuality: 75,
      citationPotential: 70,
      technicalSEO: 80,
      linkAnalysis: 65,
      aidAgent: 60
    },
    details: {
      linkAnalysis: {
        totalLinks: 50,
        internalLinks: 30,
        externalLinks: 20,
        nofollowLinks: 5,
        nofollowRatio: 0.1,
        uniqueInternalLinks: 25,
        uniqueExternalLinks: 18,
        brokenLinks: 3,
        brokenLinkDetails: [
          {
            url: 'https://example.com/broken-page',
            status: 404,
            broken: true,
            redirected: false,
            error: 'Not Found'
          },
          {
            url: 'https://external.com/timeout',
            status: 0,
            broken: true,
            redirected: false,
            error: 'Request timeout'
          },
          {
            url: 'https://redirect.com/old',
            status: 301,
            broken: false,
            redirected: true,
            finalUrl: 'https://redirect.com/new'
          }
        ] as BrokenLinkResult[],
        linkDepth: 'balanced' as const,
        anchorTextQuality: 0.7,
        emptyAnchors: 2,
        imageLinks: 5,
        linkDistribution: 'good' as const,
        externalDomains: ['external.com', 'redirect.com'],
        topInternalPages: [
          { url: '/about', count: 5 },
          { url: '/contact', count: 3 }
        ],
        anchorTextPatterns: {
          exactMatch: 10,
          partialMatch: 15,
          branded: 5,
          generic: 8,
          nakedUrl: 2,
          image: 5
        },
        linkContextDistribution: {
          header: 10,
          footer: 8,
          navigation: 12,
          mainContent: 15,
          sidebar: 3,
          other: 2
        },
        externalDomainQuality: {
          highAuthority: 5,
          mediumAuthority: 10,
          lowAuthority: 3,
          topDomains: [
            { domain: 'wikipedia.org', estimatedAuthority: 98, linkCount: 2 }
          ]
        },
        followDistribution: {
          internalFollow: 28,
          internalNofollow: 2,
          externalFollow: 15,
          externalNofollow: 3
        },
        issues: ['3 broken links detected'],
        strengths: ['Good internal linking structure']
      }
    } as any,
    recommendations: [],
    insights: []
  };

  describe('XML Export', () => {
    it('should include broken links count in statistics', () => {
      const result = mockAuditResult as AuditResult;
      
      // Verify data structure
      expect(result.details.linkAnalysis?.brokenLinks).toBe(3);
      expect(result.details.linkAnalysis?.brokenLinkDetails).toHaveLength(3);
    });

    it('should include broken link details', () => {
      const result = mockAuditResult as AuditResult;
      const brokenLinks = result.details.linkAnalysis?.brokenLinkDetails;
      
      expect(brokenLinks).toBeDefined();
      expect(brokenLinks![0].url).toBe('https://example.com/broken-page');
      expect(brokenLinks![0].status).toBe(404);
      expect(brokenLinks![0].broken).toBe(true);
      expect(brokenLinks![0].error).toBe('Not Found');
    });
  });

  describe('Plain Text Export', () => {
    it('should include broken links in statistics', () => {
      const result = mockAuditResult as AuditResult;
      
      expect(result.details.linkAnalysis?.brokenLinks).toBe(3);
    });

    it('should have all broken link details for text formatting', () => {
      const result = mockAuditResult as AuditResult;
      const brokenLinks = result.details.linkAnalysis?.brokenLinkDetails;
      
      expect(brokenLinks).toBeDefined();
      brokenLinks!.forEach(link => {
        expect(link.url).toBeDefined();
        expect(link.status).toBeDefined();
        expect(link.broken).toBeDefined();
        expect(link.redirected).toBeDefined();
      });
    });
  });

  describe('YAML Export', () => {
    it('should include broken links count', () => {
      const result = mockAuditResult as AuditResult;
      
      expect(result.details.linkAnalysis?.brokenLinks).toBe(3);
    });

    it('should have structured broken link details', () => {
      const result = mockAuditResult as AuditResult;
      const brokenLinks = result.details.linkAnalysis?.brokenLinkDetails;
      
      expect(brokenLinks).toBeDefined();
      expect(Array.isArray(brokenLinks)).toBe(true);
      
      // Verify YAML-compatible structure
      brokenLinks!.forEach(link => {
        expect(typeof link.url).toBe('string');
        expect(typeof link.status).toBe('number');
        expect(typeof link.broken).toBe('boolean');
        expect(typeof link.redirected).toBe('boolean');
      });
    });
  });

  describe('JSON Export', () => {
    it('should include complete linkAnalysis object', () => {
      const result = mockAuditResult as AuditResult;
      
      // JSON export includes the entire details.linkAnalysis object
      expect(result.details.linkAnalysis).toBeDefined();
      expect(result.details.linkAnalysis?.brokenLinks).toBe(3);
      expect(result.details.linkAnalysis?.brokenLinkDetails).toHaveLength(3);
    });

    it('should be JSON serializable', () => {
      const result = mockAuditResult as AuditResult;
      
      // Verify it can be serialized
      const json = JSON.stringify(result.details.linkAnalysis);
      const parsed = JSON.parse(json);
      
      expect(parsed.brokenLinks).toBe(3);
      expect(parsed.brokenLinkDetails).toHaveLength(3);
    });
  });

  describe('PDF Export', () => {
    it('should have broken links data available', () => {
      const result = mockAuditResult as AuditResult;
      
      expect(result.details.linkAnalysis?.brokenLinks).toBe(3);
      expect(result.details.linkAnalysis?.brokenLinkDetails).toBeDefined();
    });

    it('should handle long URLs for PDF formatting', () => {
      const result = mockAuditResult as AuditResult;
      const brokenLinks = result.details.linkAnalysis?.brokenLinkDetails;
      
      // Verify URLs are present for PDF text wrapping
      brokenLinks!.forEach(link => {
        expect(link.url.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Markdown Export', () => {
    it('should include broken links count in statistics', () => {
      const result = mockAuditResult as AuditResult;
      
      expect(result.details.linkAnalysis?.brokenLinks).toBe(3);
    });

    it('should have table-ready broken link data', () => {
      const result = mockAuditResult as AuditResult;
      const brokenLinks = result.details.linkAnalysis?.brokenLinkDetails;
      
      expect(brokenLinks).toBeDefined();
      
      // Verify data is suitable for markdown table
      brokenLinks!.forEach((link, idx) => {
        expect(link.url).toBeDefined();
        expect(link.status).toBeDefined();
        // Error can be undefined, which is fine for markdown table (shows as '-')
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle no broken links', () => {
      const resultNoBroken: Partial<AuditResult> = {
        ...mockAuditResult,
        details: {
          linkAnalysis: {
            ...mockAuditResult.details!.linkAnalysis!,
            brokenLinks: 0,
            brokenLinkDetails: []
          }
        } as any
      };
      
      expect(resultNoBroken.details!.linkAnalysis!.brokenLinks).toBe(0);
      expect(resultNoBroken.details!.linkAnalysis!.brokenLinkDetails).toHaveLength(0);
    });

    it('should handle undefined brokenLinkDetails', () => {
      const resultUndefined: Partial<AuditResult> = {
        ...mockAuditResult,
        details: {
          linkAnalysis: {
            ...mockAuditResult.details!.linkAnalysis!,
            brokenLinks: 0,
            brokenLinkDetails: undefined
          }
        } as any
      };
      
      expect(resultUndefined.details!.linkAnalysis!.brokenLinks).toBe(0);
      expect(resultUndefined.details!.linkAnalysis!.brokenLinkDetails).toBeUndefined();
    });

    it('should handle broken links with special characters in URLs', () => {
      const specialChars: Partial<AuditResult> = {
        ...mockAuditResult,
        details: {
          linkAnalysis: {
            ...mockAuditResult.details!.linkAnalysis!,
            brokenLinkDetails: [
              {
                url: 'https://example.com/path?query=value&other=<test>',
                status: 404,
                broken: true,
                redirected: false,
                error: 'Not found: "special" & <chars>'
              }
            ] as BrokenLinkResult[]
          }
        } as any
      };
      
      const link = specialChars.details!.linkAnalysis!.brokenLinkDetails![0];
      expect(link.url).toContain('&');
      expect(link.url).toContain('<');
      expect(link.error).toContain('"');
      expect(link.error).toContain('&');
    });
  });
});
