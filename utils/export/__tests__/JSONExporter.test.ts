/**
 * Tests for JSON Exporter
 * Validates JSON export functionality, data completeness, and format correctness
 */

import { describe, it, expect } from 'vitest';
import { JSONExporter } from '../exporters/JSONExporter';
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

describe('JSONExporter', () => {
  const exporter = new JSONExporter();
  
  it('should have correct format identifier', () => {
    expect(exporter.format).toBe(ExportFormat.JSON);
  });
  
  it('should export valid JSON', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    
    expect(output.content).toBeDefined();
    expect(typeof output.content).toBe('string');
    expect(output.mimeType).toBe('application/json;charset=utf-8');
    expect(output.filename).toMatch(/^GEO-Audit-.*\.json$/);
    
    // Should be valid JSON
    expect(() => JSON.parse(output.content as string)).not.toThrow();
  });
  
  it('should include all required fields in export', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const parsed = JSON.parse(output.content as string);
    
    // Check metadata
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.exportFormat).toBe('json');
    expect(parsed.metadata.generatedBy).toBeDefined();
    expect(parsed.metadata.generatedAt).toBeDefined();
    
    // Check core fields
    expect(parsed.url).toBe(result.url);
    expect(parsed.timestamp).toBe(result.timestamp);
    expect(parsed.overallScore).toBe(result.overallScore);
    expect(parsed.preciseScore).toBe(result.preciseScore);
    expect(parsed.grade).toBe(result.grade);
    
    // Check all 11 score categories
    expect(parsed.scores.schemaMarkup).toBe(result.scores.schemaMarkup);
    expect(parsed.scores.metaTags).toBe(result.scores.metaTags);
    expect(parsed.scores.aiCrawlers).toBe(result.scores.aiCrawlers);
    expect(parsed.scores.eeat).toBe(result.scores.eeat);
    expect(parsed.scores.structure).toBe(result.scores.structure);
    expect(parsed.scores.performance).toBe(result.scores.performance);
    expect(parsed.scores.contentQuality).toBe(result.scores.contentQuality);
    expect(parsed.scores.citationPotential).toBe(result.scores.citationPotential);
    expect(parsed.scores.technicalSEO).toBe(result.scores.technicalSEO);
    expect(parsed.scores.linkAnalysis).toBe(result.scores.linkAnalysis);
    expect(parsed.scores.aidAgent).toBe(result.scores.aidAgent);
    
    // Check details
    expect(parsed.details).toBeDefined();
    expect(parsed.details.schemaMarkup).toBeDefined();
    expect(parsed.details.metaTags).toBeDefined();
    
    // Check recommendations
    expect(Array.isArray(parsed.recommendations)).toBe(true);
    expect(parsed.recommendations.length).toBe(result.recommendations.length);
    
    // Check insights
    expect(Array.isArray(parsed.insights)).toBe(true);
    expect(parsed.insights.length).toBe(result.insights.length);
  });
  
  it('should include complete recommendation metadata', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const parsed = JSON.parse(output.content as string);
    
    const firstRec = parsed.recommendations[0];
    expect(firstRec.priority).toBeDefined();
    expect(firstRec.effort).toBeDefined();
    expect(firstRec.category).toBeDefined();
    expect(firstRec.title).toBeDefined();
    expect(firstRec.description).toBeDefined();
    expect(firstRec.impact).toBeDefined();
    expect(firstRec.implementation).toBeDefined();
    expect(firstRec.estimatedTime).toBeDefined();
  });
  
  it('should validate exported JSON correctly', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    
    const isValid = exporter.validate(output.content);
    expect(isValid).toBe(true);
  });
  
  it('should reject invalid JSON', () => {
    const invalidJSON = 'not valid json {';
    const isValid = exporter.validate(invalidJSON);
    expect(isValid).toBe(false);
  });
  
  it('should reject JSON missing required fields', () => {
    const incompleteJSON = JSON.stringify({ url: 'test' });
    const isValid = exporter.validate(incompleteJSON);
    expect(isValid).toBe(false);
  });
  
  it('should sanitize filename', async () => {
    const result = createMockAuditResult();
    // Use a valid URL but the hostname will be used in filename
    result.url = 'https://example-test.com/path?query=1';
    
    const output = await exporter.export(result);
    
    // Filename should not contain invalid characters
    expect(output.filename).not.toMatch(/[<>:"\/\\|?*]/);
    expect(output.filename).toMatch(/^GEO-Audit-.*\.json$/);
    expect(output.filename).toContain('example-test.com');
  });
  
  it('should return correct metadata', () => {
    const metadata = exporter.getMetadata();
    
    expect(metadata.format).toBe(ExportFormat.JSON);
    expect(metadata.specification).toBe('RFC 8259');
    expect(metadata.mimeType).toBe('application/json');
    expect(metadata.fileExtension).toBe('.json');
    expect(metadata.supportsStreaming).toBe(true);
    expect(metadata.maxRecommendedSize).toBeGreaterThan(0);
  });
  
  it('should handle optional fields gracefully', async () => {
    const result = createMockAuditResult();
    result.knowledgeGraph = {
      entities: [{ id: '1', type: 'Organization', name: 'Test' }],
      relationships: [],
      claims: []
    };
    result.browserMetadata = {
      usedBrowser: true,
      userAgent: 'Test Agent',
      viewport: { width: 1920, height: 1080 }
    };
    
    const output = await exporter.export(result);
    const parsed = JSON.parse(output.content as string);
    
    expect(parsed.knowledgeGraph).toBeDefined();
    expect(parsed.browserMetadata).toBeDefined();
  });
});
