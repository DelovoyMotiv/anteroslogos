/**
 * Tests for CSV Exporter
 * Validates CSV export functionality, RFC 4180 compliance, and data completeness
 */

import { describe, it, expect } from 'vitest';
import { CSVExporter } from '../exporters/CSVExporter';
import { AuditResult } from '../../geoAuditEnhanced';
import { ExportFormat } from '../types';

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
          ImageObject: true,
          LocalBusiness: false,
          Event: false,
          SoftwareApplication: false
        },
        hasGraphStructure: true,
        missingCriticalSchemas: [],
        schemaErrors: [],
        strengths: ['Valid schema markup'],
        issues: []
      },
      metaTags: {
        hasTitle: true,
        hasDescription: true,
        hasOGTags: true,
        hasTwitterCard: true,
        hasCanonical: true,
        hasViewport: true,
        hasCharset: true,
        hasLang: true,
        titleLength: 60,
        descriptionLength: 155,
        strengths: ['Complete meta tags'],
        issues: []
      },
      aiCrawlers: {
        robotsTxtFound: true,
        allowsGPTBot: true,
        allowsClaude: true,
        allowsPerplexity: true,
        allowsGoogleExtended: true,
        allowsAnthropicAI: true,
        allowsCohere: true,
        allowsCCBot: false,
        totalAICrawlers: 7,
        hasSitemap: true,
        strengths: ['AI crawlers allowed'],
        issues: []
      },
      eeat: {
        hasAuthorInfo: true,
        hasCredentials: true,
        hasAboutPage: true,
        hasContactInfo: true,
        hasPublicationDate: true,
        hasUpdateDate: true,
        contentFreshness: 90,
        hasCitations: true,
        hasExpertQuotes: true,
        hasTrustBadges: false,
        hasPrivacyPolicy: true,
        hasTermsOfService: true,
        authorityScore: 85,
        strengths: ['Strong E-E-A-T signals'],
        issues: []
      },
      structure: {
        hasH1: true,
        h1Count: 1,
        hasSemanticHTML: true,
        headingHierarchy: true,
        headingCount: { h1: 1, h2: 5, h3: 10 },
        hasNav: true,
        hasMain: true,
        hasFooter: true,
        strengths: ['Good structure'],
        issues: []
      },
      performance: {
        htmlSize: 50000,
        externalScripts: 5,
        externalStyles: 3,
        images: 10,
        totalResources: 25,
        hasLazyLoading: true,
        strengths: ['Fast load time'],
        issues: []
      },
      contentQuality: {
        wordCount: 1500,
        readabilityScore: 65,
        paragraphCount: 15,
        averageParagraphLength: 100,
        averageSentenceLength: 20,
        hasLists: true,
        hasTables: false,
        imageCount: 5,
        videoCount: 1,
        internalLinks: 10,
        externalLinks: 5,
        linkRatio: 0.01,
        contentDepth: 'deep',
        aiReadabilityScore: 70,
        passiveVoicePercentage: 10,
        jargonDensity: 5,
        sentenceComplexity: 'moderate',
        informationDensity: 0.8,
        hasHeadings: true,
        hasClearStructure: true,
        technicalTermCount: 20,
        transitionWords: 30,
        strengths: ['Quality content'],
        issues: []
      },
      citationPotential: {
        score: 85,
        factualStatements: 50,
        dataPoints: 20,
        quotes: 5,
        references: 10,
        definitions: 8,
        uniqueInsights: 15,
        authorityIndicators: ['Expert quotes', 'Data sources'],
        sourceQuality: {
          academicSources: 5,
          newsSources: 3,
          industrySources: 2,
          unknownSources: 0,
          totalSources: 10,
          qualityScore: 85,
          topSources: []
        },
        temporalRelevance: {
          recentData: 8,
          moderateData: 2,
          outdatedData: 0,
          undatedClaims: 0,
          averageDataAge: 1.5,
          freshnessScore: 90
        },
        claimVerifiability: {
          verifiableClaims: 40,
          unverifiedClaims: 10,
          statisticalClaims: 20,
          qualitativeClaims: 30,
          verifiabilityScore: 80,
          claimTypes: {
            factual: 30,
            statistical: 20,
            comparative: 10,
            causal: 5,
            predictive: 5
          }
        },
        strengths: ['Good citation potential'],
        issues: []
      },
      technicalSEO: {
        hasViewport: true,
        hasCharset: true,
        hasLang: true,
        hasHreflang: false,
        hasAlternateMobile: false,
        hasAMP: false,
        isHTTPS: true,
        hasSecurityHeaders: true,
        hasSitemapXML: true,
        sitemapAccessible: true,
        hasRobotsTxt: true,
        hasCanonical: true,
        hasNoIndex: false,
        httpStatus: 200,
        redirectChain: false,
        viewport: 'width=device-width, initial-scale=1',
        charset: 'UTF-8',
        lang: 'en',
        securityHeaders: ['X-Frame-Options', 'X-Content-Type-Options'],
        strengths: ['Strong technical SEO'],
        issues: []
      },
      linkAnalysis: {
        totalLinks: 50,
        internalLinks: 30,
        externalLinks: 20,
        nofollowLinks: 5,
        nofollowRatio: 0.1,
        uniqueInternalLinks: 25,
        uniqueExternalLinks: 18,
        brokenLinks: 0,
        linkDepth: 'balanced',
        anchorTextQuality: 85,
        emptyAnchors: 0,
        imageLinks: 5,
        externalDomains: ['example.org', 'test.com'],
        topInternalPages: [],
        linkDistribution: 'good',
        anchorTextPatterns: {
          exactMatch: 10,
          partialMatch: 20,
          branded: 5,
          generic: 10,
          nakedUrl: 3,
          image: 2
        },
        linkContextDistribution: {
          header: 5,
          footer: 10,
          navigation: 15,
          mainContent: 15,
          sidebar: 3,
          other: 2
        },
        externalDomainQuality: {
          highAuthority: 10,
          mediumAuthority: 8,
          lowAuthority: 2,
          topDomains: []
        },
        followDistribution: {
          internalFollow: 28,
          internalNofollow: 2,
          externalFollow: 15,
          externalNofollow: 5
        },
        strengths: ['Good link structure'],
        issues: []
      },
      aidAgent: {
        detected: false,
        discoveryMethod: 'none',
        version: undefined,
        protocols: [],
        endpoint: undefined,
        serviceId: undefined,
        domain: undefined,
        agentName: undefined,
        agentDescription: undefined,
        agentVersion: undefined,
        capabilities: [],
        vendor: undefined,
        homepage: undefined,
        documentation: undefined,
        contact: undefined
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
      },
      {
        priority: 'medium',
        effort: 'low',
        category: 'Content',
        title: 'Increase word count',
        description: 'Add more detailed content',
        impact: 'Better content quality',
        implementation: 'Expand existing sections',
        estimatedTime: '4 hours'
      }
    ],
    insights: [
      'Strong schema markup implementation',
      'Good E-E-A-T signals present',
      'Fast page load time'
    ]
  } as AuditResult;
}

describe('CSVExporter', () => {
  const exporter = new CSVExporter();
  
  it('should have correct format identifier', () => {
    expect(exporter.format).toBe(ExportFormat.CSV);
  });
  
  it('should export valid CSV', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    
    expect(output.content).toBeDefined();
    expect(typeof output.content).toBe('string');
    expect(output.mimeType).toBe('text/csv;charset=utf-8');
    expect(output.filename).toMatch(/^GEO-Audit-.*\.csv$/);
    
    // Should have multiple lines
    const lines = (output.content as string).split('\n');
    expect(lines.length).toBeGreaterThan(10);
  });
  
  it('should include all required sections', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check for required sections
    expect(content).toContain('GEO Audit Report - CSV Export');
    expect(content).toContain('Website Metadata');
    expect(content).toContain('Score Breakdown');
    expect(content).toContain('Detailed Statistics');
    expect(content).toContain('Recommendations');
    expect(content).toContain('Key Insights');
  });
  
  it('should include all 11 score categories', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check all categories are present
    expect(content).toContain('Schema Markup');
    expect(content).toContain('Meta Tags');
    expect(content).toContain('AI Crawlers');
    expect(content).toContain('E-E-A-T');
    expect(content).toContain('Structure');
    expect(content).toContain('Performance');
    expect(content).toContain('Content Quality');
    expect(content).toContain('Citation Potential');
    expect(content).toContain('Technical SEO');
    expect(content).toContain('Link Analysis');
    expect(content).toContain('AID Agent');
  });
  
  it('should properly escape commas in CSV fields', async () => {
    const result = createMockAuditResult();
    result.recommendations[0].description = 'This description has, commas, in it';
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Field with commas should be quoted
    expect(content).toContain('"This description has, commas, in it"');
  });
  
  it('should properly escape quotes in CSV fields', async () => {
    const result = createMockAuditResult();
    result.recommendations[0].title = 'Add "FAQ" Schema';
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Quotes should be doubled
    expect(content).toContain('Add ""FAQ"" Schema');
  });
  
  it('should properly escape newlines in CSV fields', async () => {
    const result = createMockAuditResult();
    result.recommendations[0].description = 'Line 1\nLine 2\nLine 3';
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Field with newlines should be quoted
    expect(content).toContain('"Line 1\nLine 2\nLine 3"');
  });
  
  it('should include complete recommendation metadata', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check recommendation fields are present
    expect(content).toContain('Add FAQ Schema');
    expect(content).toContain('high');
    expect(content).toContain('medium');
    expect(content).toContain('Schema Markup');
    expect(content).toContain('2 hours');
  });
  
  it('should validate exported CSV correctly', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    
    const isValid = exporter.validate(output.content);
    expect(isValid).toBe(true);
  });
  
  it('should reject invalid CSV', () => {
    const invalidCSV = 'just one line';
    const isValid = exporter.validate(invalidCSV);
    expect(isValid).toBe(false);
  });
  
  it('should reject CSV missing required sections', () => {
    const incompleteCSV = 'Header\nSome data\nMore data';
    const isValid = exporter.validate(incompleteCSV);
    expect(isValid).toBe(false);
  });
  
  it('should sanitize filename', async () => {
    const result = createMockAuditResult();
    result.url = 'https://example-test.com/path?query=1';
    
    const output = await exporter.export(result);
    
    // Filename should not contain invalid characters
    expect(output.filename).not.toMatch(/[<>:"\/\\|?*]/);
    expect(output.filename).toMatch(/^GEO-Audit-.*\.csv$/);
    expect(output.filename).toContain('example-test.com');
  });
  
  it('should return correct metadata', () => {
    const metadata = exporter.getMetadata();
    
    expect(metadata.format).toBe(ExportFormat.CSV);
    expect(metadata.specification).toBe('RFC 4180');
    expect(metadata.mimeType).toBe('text/csv');
    expect(metadata.fileExtension).toBe('.csv');
    expect(metadata.supportsStreaming).toBe(true);
    expect(metadata.maxRecommendedSize).toBeGreaterThan(0);
  });
  
  it('should handle optional knowledge graph data', async () => {
    const result = createMockAuditResult();
    result.knowledgeGraph = {
      id: 'kg-1',
      domain: 'example.com',
      entities: [
        {
          id: 'e1',
          type: 'Organization',
          name: 'Test Org',
          description: 'A test organization',
          confidence: 0.95,
          sourceUrl: 'https://example.com',
          extractedAt: new Date().toISOString()
        }
      ],
      relationships: [],
      claims: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
        sourceUrls: ['https://example.com'],
        entityCount: 1,
        relationshipCount: 0,
        claimCount: 0
      }
    };
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('Knowledge Graph');
    expect(content).toContain('Entity Count');
    expect(content).toContain('Test Org');
  });
  
  it('should handle optional browser metadata', async () => {
    const result = createMockAuditResult();
    result.browserMetadata = {
      usedBrowser: true,
      userAgent: 'Mozilla/5.0 Test Agent',
      viewport: { width: 1920, height: 1080 },
      finalUrl: 'https://example.com',
      loadTime: 1500
    };
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('Browser Metadata');
    expect(content).toContain('Mozilla/5.0 Test Agent');
    expect(content).toContain('1920');
    expect(content).toContain('1080');
  });
  
  it('should format numeric scores correctly', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Scores should be present as numbers
    expect(content).toContain('90'); // schemaMarkup score
    expect(content).toContain('85'); // overall score
    expect(content).toContain('85.234'); // precise score
  });
  
  it('should maintain consistent column structure', async () => {
    const result1 = createMockAuditResult();
    const result2 = createMockAuditResult();
    result2.url = 'https://different.com';
    
    const output1 = await exporter.export(result1);
    const output2 = await exporter.export(result2);
    
    const lines1 = (output1.content as string).split('\n');
    const lines2 = (output2.content as string).split('\n');
    
    // Both exports should have similar structure
    expect(lines1.length).toBeGreaterThan(50);
    expect(lines2.length).toBeGreaterThan(50);
    
    // Both should have the same section headers
    expect(output1.content).toContain('Score Breakdown');
    expect(output2.content).toContain('Score Breakdown');
  });
});
