/**
 * Tests for Markdown Exporter
 * Validates Markdown export functionality, heading hierarchy, and data completeness
 */

import { describe, it, expect } from 'vitest';
import { MarkdownExporter } from '../exporters/MarkdownExporter';
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
        robotsTxtFound: true,
        allowsGPTBot: true,
        allowsClaude: true,
        allowsPerplexity: true,
        allowsGoogleExtended: true,
        allowsAnthropicAI: true,
        allowsCohere: true,
        allowsCCBot: true,
        totalAICrawlers: 7,
        hasSitemap: true,
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
        hasH1: true,
        h1Count: 1,
        hasSemanticHTML: true,
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
        hasViewport: true,
        hasCharset: true,
        hasLang: true,
        hasHreflang: false,
        hasAlternateMobile: false,
        hasAMP: false,
        isHTTPS: true,
        hasSecurityHeaders: true,
        hasSitemapXML: true,
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
        discoveryMethod: 'none',
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
        implementation: 'Add FAQ schema markup to your page',
        estimatedTime: '2 hours'
      },
      {
        priority: 'medium',
        effort: 'low',
        category: 'Content',
        title: 'Increase word count',
        description: 'Add more detailed content',
        impact: 'Better content quality',
        implementation: 'Expand existing sections with more detail',
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

describe('MarkdownExporter', () => {
  const exporter = new MarkdownExporter();
  
  it('should have correct format identifier', () => {
    expect(exporter.format).toBe(ExportFormat.MARKDOWN);
  });
  
  it('should export valid Markdown', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    
    expect(output.content).toBeDefined();
    expect(typeof output.content).toBe('string');
    expect(output.mimeType).toBe('text/markdown;charset=utf-8');
    expect(output.filename).toMatch(/^GEO-Audit-.*\.md$/);
  });
  
  it('should have proper H1 heading', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('# GEO Audit Report');
    // Should only have one H1
    const h1Count = (content.match(/^# /gm) || []).length;
    expect(h1Count).toBe(1);
  });
  
  it('should have proper H2 sections', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check for required H2 sections
    expect(content).toContain('## Executive Summary');
    expect(content).toContain('## Score Breakdown');
    expect(content).toContain('## Quick Statistics');
    expect(content).toContain('## Key Insights');
    expect(content).toContain('## Detailed Category Analysis');
    expect(content).toContain('## Recommendations & Action Plan');
  });
  
  it('should have proper H3 subsections', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check for H3 subsections in detailed analysis
    expect(content).toContain('### Schema Markup');
    expect(content).toContain('### Meta Tags');
    expect(content).toContain('### AI Crawlers');
    expect(content).toContain('### E-E-A-T');
    expect(content).toContain('### Structure');
    expect(content).toContain('### Performance');
    expect(content).toContain('### Content Quality');
    expect(content).toContain('### Citation Potential');
    expect(content).toContain('### Technical SEO');
    expect(content).toContain('### Link Analysis');
  });
  
  it('should include score breakdown table', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check for table structure
    expect(content).toContain('| Category | Score | Status |');
    expect(content).toContain('|----------|-------|--------|');
    
    // Check for all 11 score categories in table
    expect(content).toContain('| Schema Markup |');
    expect(content).toContain('| Meta Tags |');
    expect(content).toContain('| AI Crawlers |');
    expect(content).toContain('| E-E-A-T |');
    expect(content).toContain('| Structure |');
    expect(content).toContain('| Performance |');
    expect(content).toContain('| Content Quality |');
    expect(content).toContain('| Citation Potential |');
    expect(content).toContain('| Technical SEO |');
    expect(content).toContain('| Link Analysis |');
    expect(content).toContain('| AID Agent |');
  });
  
  it('should include all score values', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check that all scores are present
    expect(content).toContain('90'); // schemaMarkup
    expect(content).toContain('85'); // metaTags, overallScore
    expect(content).toContain('88'); // aiCrawlers
    expect(content).toContain('82'); // eeat
    expect(content).toContain('87'); // structure
    expect(content).toContain('84'); // performance
    expect(content).toContain('86'); // contentQuality
    expect(content).toContain('83'); // citationPotential
    expect(content).toContain('81'); // linkAnalysis
    expect(content).toContain('79'); // aidAgent
  });
  
  it('should include quick statistics', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('Total Schemas');
    expect(content).toContain('Valid Schemas');
    expect(content).toContain('AI Crawlers Allowed');
    expect(content).toContain('Word Count');
    expect(content).toContain('Total Links');
  });
  
  it('should include insights as numbered list', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    result.insights.forEach((insight, idx) => {
      expect(content).toContain(`${idx + 1}.`);
    });
  });
  
  it('should include recommendations with priority grouping', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check for priority sections
    expect(content).toContain('High Priority');
    expect(content).toContain('Medium Priority');
    
    // Check for recommendation details
    expect(content).toContain('Add FAQ Schema');
    expect(content).toContain('Increase word count');
    expect(content).toContain('**Category:**');
    expect(content).toContain('**Effort:**');
    expect(content).toContain('**Time:**');
    expect(content).toContain('**Impact:**');
    expect(content).toContain('**Implementation:**');
  });
  
  it('should include code blocks for implementation', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Check for code block markers
    expect(content).toContain('```');
  });
  
  it('should include footer with metadata', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('Export Information');
    expect(content).toContain('Generated by: Anóteros Lógos GEO Audit Tool');
    expect(content).toContain('Export Format: markdown');
    expect(content).toContain('Tool Version: 1.0.0');
    expect(content).toContain('Export Version: 1.0.0');
    expect(content).toContain('Analyzed URL:');
    expect(content).toContain('anoteroslogos.com');
  });
  
  it('should validate exported Markdown correctly', async () => {
    const result = createMockAuditResult();
    const output = await exporter.export(result);
    
    const isValid = exporter.validate(output.content);
    expect(isValid).toBe(true);
  });
  
  it('should reject invalid Markdown', () => {
    const invalidMd = 'Just some text without proper structure';
    const isValid = exporter.validate(invalidMd);
    expect(isValid).toBe(false);
  });
  
  it('should sanitize filename', async () => {
    const result = createMockAuditResult();
    result.url = 'https://example-test.com/path?query=1';
    
    const output = await exporter.export(result);
    
    // Filename should not contain invalid characters
    expect(output.filename).not.toMatch(/[<>:"\/\\|?*]/);
    expect(output.filename).toMatch(/^GEO-Audit-.*\.md$/);
    expect(output.filename).toContain('example-test.com');
  });
  
  it('should return correct metadata', () => {
    const metadata = exporter.getMetadata();
    
    expect(metadata.format).toBe(ExportFormat.MARKDOWN);
    expect(metadata.specification).toBe('CommonMark');
    expect(metadata.mimeType).toBe('text/markdown');
    expect(metadata.fileExtension).toBe('.md');
    expect(metadata.supportsStreaming).toBe(true);
    expect(metadata.maxRecommendedSize).toBeGreaterThan(0);
  });
  
  it('should handle optional knowledge graph', async () => {
    const result = createMockAuditResult();
    result.knowledgeGraph = {
      entities: [
        { id: '1', name: 'Test Entity', type: 'Organization', confidence: 0.95 }
      ],
      relationships: [
        { source: 'Entity1', target: 'Entity2', type: 'relatedTo' }
      ],
      claims: []
    };
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('## Knowledge Graph');
    expect(content).toContain('Entities');
    expect(content).toContain('Relationships');
  });
  
  it('should handle optional browser metadata', async () => {
    const result = createMockAuditResult();
    result.browserMetadata = {
      usedBrowser: true,
      userAgent: 'Test Agent',
      viewport: { width: 1920, height: 1080 },
      loadTime: 1500
    };
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('## Browser Metadata');
    expect(content).toContain('User Agent');
    expect(content).toContain('Viewport');
  });
  
  it('should handle AID agent information', async () => {
    const result = createMockAuditResult();
    result.details.aidAgent = {
      detected: true,
      discoveryMethod: 'dns',
      agentName: 'Test Agent',
      agentVersion: '1.0.0',
      capabilities: ['search', 'summarize'],
      endpoint: 'https://agent.example.com'
    };
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    expect(content).toContain('## AID Agent Information');
    expect(content).toContain('AID Protocol Detected');
    expect(content).toContain('Test Agent');
  });
  
  it('should escape special Markdown characters', async () => {
    const result = createMockAuditResult();
    result.insights = [
      'Test with *asterisks* and _underscores_',
      'Test with [brackets] and (parentheses)',
      'Test with # hash and | pipe'
    ];
    
    const output = await exporter.export(result);
    const content = output.content as string;
    
    // Special characters should be escaped
    expect(content).toContain('\\*asterisks\\*');
    expect(content).toContain('\\_underscores\\_');
    expect(content).toContain('\\[brackets\\]');
    expect(content).toContain('\\(parentheses\\)');
    expect(content).toContain('\\# hash');
    expect(content).toContain('\\| pipe');
  });
});
