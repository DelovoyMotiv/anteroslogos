/**
 * Integration tests for exportToJSON function
 * Tests the complete export flow using ExportManager
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToJSON } from '../../exportFormats';
import { AuditResult } from '../../geoAuditEnhanced';

// Mock document and URL.createObjectURL for browser APIs
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
const mockClick = vi.fn();
const mockRemoveChild = vi.fn();
const mockAppendChild = vi.fn();

beforeEach(() => {
  // Mock URL APIs
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
  
  // Mock document APIs
  const mockLink = {
    href: '',
    download: '',
    style: { display: '' },
    click: mockClick
  };
  
  vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
  vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
  vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to create a minimal valid AuditResult for testing
function createMockAuditResult(): AuditResult {
  return {
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    overallScore: 85,
    preciseScore: 85.234,
    grade: 'Expert',
    scoreBreakdown: {
      core: 90,
      technical: 85,
      content: 80,
      weighted: 85
    },
    scores: {
      schemaMarkup: 90,
      metaTags: 85,
      aiCrawlers: 88,
      eeat: 82,
      structure: 87,
      performance: 84,
      contentQuality: 86,
      citationPotential: 83,
      technicalSEO: 85,
      linkAnalysis: 81,
      aidAgent: 79
    },
    details: {
      schemaMarkup: {
        totalSchemas: 5,
        validSchemas: 5,
        schemas: {
          Organization: true,
          Person: false,
          Article: true,
          BlogPosting: false,
          WebSite: true,
          BreadcrumbList: true,
          FAQPage: false,
          Product: false,
          Review: false,
          AggregateRating: false,
          HowTo: false,
          VideoObject: false,
          ImageObject: true
        },
        hasGraphStructure: true,
        hasMainEntity: true,
        strengths: ['Valid schema markup'],
        issues: []
      },
      metaTags: {
        hasTitle: true,
        hasDescription: true,
        hasOGTags: true,
        hasTwitterCard: true,
        strengths: ['Complete meta tags'],
        issues: []
      },
      aiCrawlers: {
        totalAICrawlers: 5,
        allowedCrawlers: ['GPTBot', 'ChatGPT-User'],
        blockedCrawlers: [],
        strengths: ['AI crawlers allowed'],
        issues: []
      },
      eeat: {
        hasAuthor: true,
        hasPublishDate: true,
        hasReviewer: false,
        hasCitations: true,
        strengths: ['Strong E-E-A-T signals'],
        issues: []
      },
      structure: {
        hasHeadings: true,
        headingHierarchy: true,
        hasLists: true,
        hasTables: false,
        strengths: ['Good structure'],
        issues: []
      },
      performance: {
        loadTime: 1.5,
        resourceCount: 50,
        strengths: ['Fast load time'],
        issues: []
      },
      contentQuality: {
        wordCount: 1500,
        readabilityScore: 65,
        paragraphCount: 15,
        imageCount: 5,
        videoCount: 1,
        strengths: ['Quality content'],
        issues: []
      },
      citationPotential: {
        hasCitations: true,
        citationCount: 10,
        strengths: ['Good citation potential'],
        issues: []
      },
      technicalSEO: {
        hasRobotsTxt: true,
        hasSitemap: true,
        hasSSL: true,
        strengths: ['Strong technical SEO'],
        issues: []
      },
      linkAnalysis: {
        totalLinks: 50,
        internalLinks: 30,
        externalLinks: 20,
        nofollowRatio: 0.1,
        strengths: ['Good link structure'],
        issues: []
      },
      aidAgent: {
        detected: false,
        endpoint: null,
        version: null,
        capabilities: [],
        strengths: [],
        issues: ['No AID agent detected']
      }
    },
    recommendations: [
      {
        priority: 'high',
        effort: 'medium',
        category: 'Schema Markup',
        title: 'Add FAQ Schema',
        description: 'Implement FAQ schema for better visibility',
        impact: 'Improved search visibility',
        implementation: 'Add FAQ schema markup',
        estimatedTime: '2 hours'
      }
    ],
    insights: [
      'Strong schema markup implementation',
      'Good E-E-A-T signals present'
    ]
  } as AuditResult;
}

describe('exportToJSON integration', () => {
  it('should export JSON successfully', async () => {
    const result = createMockAuditResult();
    
    await expect(exportToJSON(result)).resolves.not.toThrow();
    
    // Verify browser download was triggered
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
  
  it('should create a blob with correct MIME type', async () => {
    const result = createMockAuditResult();
    
    await exportToJSON(result);
    
    // Check that createObjectURL was called with a Blob
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json;charset=utf-8');
  });
  
  it('should set correct filename', async () => {
    const result = createMockAuditResult();
    
    await exportToJSON(result);
    
    // Check that the link element was created with correct download attribute
    const createElementCalls = (document.createElement as any).mock.calls;
    expect(createElementCalls.some((call: any) => call[0] === 'a')).toBe(true);
  });
  
  it('should handle export errors gracefully', async () => {
    const result = createMockAuditResult();
    // Create an invalid result by removing required fields
    delete (result as any).url;
    
    await expect(exportToJSON(result as any)).rejects.toThrow();
  });
  
  it('should validate audit result before export', async () => {
    const result = createMockAuditResult();
    // Remove a required score
    delete (result.scores as any).schemaMarkup;
    
    await expect(exportToJSON(result)).rejects.toThrow();
  });
});
