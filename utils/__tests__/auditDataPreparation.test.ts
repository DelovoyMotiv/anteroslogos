/**
 * Tests for Audit Data Preparation Utility
 * Validates: Requirements 1.1
 */

import { describe, it, expect } from 'vitest';
import { prepareAuditData, validatePreparedData } from '../auditDataPreparation';
import type { AuditResult } from '../geoAuditEnhanced';

describe('prepareAuditData', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  
  const createMockAuditResult = (overrides?: Partial<AuditResult>): AuditResult => ({
    url: 'https://example.com/test-page',
    timestamp: '2024-01-15T10:30:00Z',
    overallScore: 85.5,
    preciseScore: 85.532,
    grade: 'Expert',
    scores: {
      schemaMarkup: 90,
      metaTags: 85,
      aiCrawlers: 80,
      eeat: 88,
      structure: 82,
      performance: 87,
      contentQuality: 89,
      citationPotential: 84,
      technicalSEO: 86,
      linkAnalysis: 83,
      aidAgent: 75,
    },
    details: {
      schemaMarkup: {
        totalSchemas: 5,
        validSchemas: 5,
        schemas: {
          Organization: true,
          Person: true,
          Article: false,
          BlogPosting: false,
          WebSite: true,
          BreadcrumbList: true,
          FAQPage: false,
          Product: false,
          Review: false,
          AggregateRating: false,
          HowTo: false,
          VideoObject: false,
          ImageObject: false,
          LocalBusiness: false,
          Event: false,
          SoftwareApplication: false,
        },
        hasGraphStructure: true,
        missingCriticalSchemas: [],
        schemaErrors: [],
        issues: [],
        strengths: ['Has Organization schema', 'Has Person schema'],
      },
      metaTags: {} as any,
      aiCrawlers: {
        allowsGPTBot: true,
      } as any,
      eeat: {
        hasAuthorInfo: true,
        authorityScore: 75,
      } as any,
      structure: {} as any,
      performance: {} as any,
      contentQuality: {} as any,
      citationPotential: {} as any,
      technicalSEO: {} as any,
      linkAnalysis: {} as any,
      aidAgent: {} as any,
    },
    recommendations: [
      { priority: 'high', category: 'schema', title: 'Add Article schema' },
    ] as any,
    insights: ['Good E-E-A-T signals detected'],
    ...overrides,
  });

  it('should prepare valid audit data with all required fields', () => {
    const mockResult = createMockAuditResult();
    const prepared = prepareAuditData(mockResult, mockUserId);

    expect(prepared.user_id).toBe(mockUserId);
    expect(prepared.url).toBe('https://example.com/test-page');
    expect(prepared.normalized_url).toBe('example.com/test-page');
    expect(prepared.domain).toBe('example.com');
    expect(prepared.timestamp).toBe('2024-01-15T10:30:00Z');
    expect(prepared.overall_score).toBe(85.5);
    expect(prepared.grade).toBe('A'); // Expert -> A
  });

  it('should convert grades correctly', () => {
    const testCases = [
      { grade: 'Authority', expected: 'A+' },
      { grade: 'Expert', expected: 'A' },
      { grade: 'Advanced', expected: 'B' },
      { grade: 'Intermediate', expected: 'C' },
      { grade: 'Beginner', expected: 'D' },
    ];

    testCases.forEach(({ grade, expected }) => {
      const mockResult = createMockAuditResult({ grade: grade as any });
      const prepared = prepareAuditData(mockResult, mockUserId);
      expect(prepared.grade).toBe(expected);
    });
  });

  it('should normalize URLs correctly', () => {
    const testCases = [
      { url: 'https://www.example.com/page/', expected: 'example.com/page' },
      { url: 'http://example.com/page', expected: 'example.com/page' },
      { url: 'https://example.com/', expected: 'example.com' },
      { url: 'https://subdomain.example.com/path', expected: 'subdomain.example.com/path' },
    ];

    testCases.forEach(({ url, expected }) => {
      const mockResult = createMockAuditResult({ url });
      const prepared = prepareAuditData(mockResult, mockUserId);
      expect(prepared.normalized_url).toBe(expected);
    });
  });

  it('should extract domain correctly', () => {
    const testCases = [
      { url: 'https://www.example.com/page', expected: 'example.com' },
      { url: 'https://subdomain.example.com/page', expected: 'subdomain.example.com' },
      { url: 'http://example.co.uk/page', expected: 'example.co.uk' },
    ];

    testCases.forEach(({ url, expected }) => {
      const mockResult = createMockAuditResult({ url });
      const prepared = prepareAuditData(mockResult, mockUserId);
      expect(prepared.domain).toBe(expected);
    });
  });

  it('should validate and clamp scores to 0-100 range', () => {
    const mockResult = createMockAuditResult({
      overallScore: 150, // Invalid: too high
      scores: {
        schemaMarkup: -10, // Invalid: negative
        metaTags: 50,
        aiCrawlers: 200, // Invalid: too high
        eeat: 75,
        structure: 0, // Valid: boundary
        performance: 100, // Valid: boundary
        contentQuality: 50,
        citationPotential: 50,
        technicalSEO: 50,
        linkAnalysis: 50,
        aidAgent: 50,
      },
    });

    const prepared = prepareAuditData(mockResult, mockUserId);

    expect(prepared.overall_score).toBe(100); // Clamped to max
    expect(prepared.score_schema_markup).toBe(0); // Clamped to min
    expect(prepared.score_ai_crawlers).toBe(100); // Clamped to max
    expect(prepared.score_structure).toBe(0); // Valid boundary
    expect(prepared.score_performance).toBe(100); // Valid boundary
  });

  it('should handle missing optional fields gracefully', () => {
    const mockResult = createMockAuditResult({
      details: {
        schemaMarkup: undefined as any,
        metaTags: undefined as any,
        aiCrawlers: undefined as any,
        eeat: undefined as any,
        structure: undefined as any,
        performance: undefined as any,
        contentQuality: undefined as any,
        citationPotential: undefined as any,
        technicalSEO: undefined as any,
        linkAnalysis: undefined as any,
        aidAgent: undefined as any,
      },
      recommendations: undefined as any,
    });

    const prepared = prepareAuditData(mockResult, mockUserId);

    expect(prepared.schema_findings).toEqual({});
    expect(prepared.meta_findings).toEqual({});
    expect(prepared.ai_recommendations).toEqual([]);
  });

  it('should set aggregation flags correctly', () => {
    const mockResult = createMockAuditResult();
    const prepared = prepareAuditData(mockResult, mockUserId);

    expect(prepared.has_organization_schema).toBe(true);
    expect(prepared.has_person_schema).toBe(true);
    expect(prepared.has_article_schema).toBe(false);
    expect(prepared.has_breadcrumb_schema).toBe(true);
    expect(prepared.has_author_markup).toBe(true);
    expect(prepared.has_eeat_signals).toBe(true); // authorityScore > 50
    expect(prepared.robots_txt_allows_ai).toBe(true);
  });

  it('should throw error if auditResult is missing', () => {
    expect(() => prepareAuditData(null as any, mockUserId)).toThrow('AuditResult is required');
  });

  it('should throw error if userId is missing', () => {
    const mockResult = createMockAuditResult();
    expect(() => prepareAuditData(mockResult, '')).toThrow('Valid userId is required');
  });

  it('should throw error if URL is missing', () => {
    const mockResult = createMockAuditResult({ url: '' });
    expect(() => prepareAuditData(mockResult, mockUserId)).toThrow('Valid URL is required');
  });
});

describe('validatePreparedData', () => {
  const createValidPreparedData = () => ({
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    url: 'https://example.com',
    normalized_url: 'example.com',
    domain: 'example.com',
    timestamp: '2024-01-15T10:30:00Z',
    overall_score: 85,
    grade: 'A',
    score_schema_markup: 90,
    score_meta_tags: 85,
    score_ai_crawlers: 80,
    score_eeat: 88,
    score_structure: 82,
    score_performance: 87,
    score_content_quality: 89,
    score_citation_potential: 84,
    score_technical_seo: 86,
    score_link_analysis: 83,
    schema_findings: {},
    meta_findings: {},
    crawler_findings: {},
    eeat_findings: {},
    structure_findings: {},
    performance_findings: {},
    content_findings: {},
    citation_findings: {},
    technical_findings: {},
    link_findings: {},
    ai_recommendations: [],
    has_organization_schema: true,
    has_person_schema: false,
    has_article_schema: false,
    has_breadcrumb_schema: false,
    has_author_markup: true,
    has_eeat_signals: true,
    robots_txt_allows_ai: true,
  });

  it('should validate correct data', () => {
    const data = createValidPreparedData();
    const result = validatePreparedData(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const data = createValidPreparedData();
    data.user_id = '';

    const result = validatePreparedData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('user_id is required');
  });

  it('should detect invalid grade', () => {
    const data = createValidPreparedData();
    data.grade = 'Z' as any;

    const result = validatePreparedData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('grade must be one of'))).toBe(true);
  });

  it('should detect out-of-range scores', () => {
    const data = createValidPreparedData();
    data.overall_score = 150;
    data.score_schema_markup = -10;

    const result = validatePreparedData(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('overall_score'))).toBe(true);
    expect(result.errors.some(e => e.includes('score_schema_markup'))).toBe(true);
  });
});
