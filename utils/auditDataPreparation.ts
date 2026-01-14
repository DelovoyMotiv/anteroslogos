/**
 * Audit Data Preparation Utility
 * Prepares AuditResult data for Supabase database insertion
 * Ensures all required fields are included and data types match schema
 */

import type { AuditResult } from './geoAuditEnhanced';

/**
 * Database audit record structure matching the audits table schema
 */
export interface PreparedAuditData {
  // Required fields
  user_id: string;
  url: string;
  normalized_url: string;
  domain: string;
  timestamp: string;
  overall_score: number;
  grade: string;
  
  // Category scores (required with defaults)
  score_schema_markup: number;
  score_meta_tags: number;
  score_ai_crawlers: number;
  score_eeat: number;
  score_structure: number;
  score_performance: number;
  score_content_quality: number;
  score_citation_potential: number;
  score_technical_seo: number;
  score_link_analysis: number;
  
  // Detailed findings (JSONB)
  schema_findings: Record<string, any>;
  meta_findings: Record<string, any>;
  crawler_findings: Record<string, any>;
  eeat_findings: Record<string, any>;
  structure_findings: Record<string, any>;
  performance_findings: Record<string, any>;
  content_findings: Record<string, any>;
  citation_findings: Record<string, any>;
  technical_findings: Record<string, any>;
  link_findings: Record<string, any>;
  
  // AI recommendations
  ai_recommendations: any[];
  
  // Aggregation flags
  has_organization_schema: boolean;
  has_person_schema: boolean;
  has_article_schema: boolean;
  has_breadcrumb_schema: boolean;
  has_author_markup: boolean;
  has_eeat_signals: boolean;
  robots_txt_allows_ai: boolean;
  
  // Public visibility flag
  is_public: boolean;
}

/**
 * Normalizes a URL by removing protocol, www, and trailing slashes
 * @param url - Full URL to normalize
 * @returns Normalized URL string
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let normalized = urlObj.hostname + urlObj.pathname;
    
    // Remove www prefix
    normalized = normalized.replace(/^www\./, '');
    
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    
    return normalized;
  } catch (error) {
    console.error('Failed to normalize URL:', error);
    // Fallback: return URL as-is
    return url;
  }
}

/**
 * Extracts domain from URL
 * @param url - Full URL
 * @returns Domain string
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    console.error('Failed to extract domain:', error);
    return '';
  }
}

/**
 * Converts grade format from AuditResult to database format
 * Maps: Authority -> A+, Expert -> A, Advanced -> B, Intermediate -> C, Beginner -> D
 * @param grade - Grade from AuditResult
 * @returns Database-compatible grade string
 */
function convertGrade(grade: string): string {
  const gradeMap: Record<string, string> = {
    'Authority': 'A+',
    'Expert': 'A',
    'Advanced': 'B',
    'Intermediate': 'C',
    'Beginner': 'D',
  };
  
  return gradeMap[grade] || 'F';
}

/**
 * Ensures a score is a valid number between 0 and 100
 * @param score - Score value to validate
 * @param defaultValue - Default value if invalid (default: 0)
 * @returns Valid score number
 */
function validateScore(score: number | undefined, defaultValue: number = 0): number {
  if (typeof score !== 'number' || isNaN(score)) {
    return defaultValue;
  }
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Prepares AuditResult data for database insertion
 * Validates all fields and ensures data types match the database schema
 * 
 * @param auditResult - The audit result from the GEO audit engine
 * @param userId - The authenticated user's ID
 * @returns Prepared data object ready for Supabase insertion
 * @throws Error if required fields are missing or invalid
 */
export function prepareAuditData(
  auditResult: AuditResult,
  userId: string
): PreparedAuditData {
  // Validate required parameters
  if (!auditResult) {
    throw new Error('AuditResult is required');
  }
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }
  
  if (!auditResult.url || typeof auditResult.url !== 'string') {
    throw new Error('Valid URL is required in AuditResult');
  }
  
  // Extract URL components
  const normalizedUrl = normalizeUrl(auditResult.url);
  const domain = extractDomain(auditResult.url);
  
  if (!domain) {
    throw new Error('Failed to extract domain from URL');
  }
  
  // Prepare the data object
  const preparedData: PreparedAuditData = {
    // Required fields
    user_id: userId,
    url: auditResult.url,
    normalized_url: normalizedUrl,
    domain: domain,
    timestamp: auditResult.timestamp || new Date().toISOString(),
    overall_score: validateScore(auditResult.overallScore),
    grade: convertGrade(auditResult.grade),
    
    // Category scores - validate each one
    score_schema_markup: validateScore(auditResult.scores?.schemaMarkup),
    score_meta_tags: validateScore(auditResult.scores?.metaTags),
    score_ai_crawlers: validateScore(auditResult.scores?.aiCrawlers),
    score_eeat: validateScore(auditResult.scores?.eeat),
    score_structure: validateScore(auditResult.scores?.structure),
    score_performance: validateScore(auditResult.scores?.performance),
    score_content_quality: validateScore(auditResult.scores?.contentQuality),
    score_citation_potential: validateScore(auditResult.scores?.citationPotential),
    score_technical_seo: validateScore(auditResult.scores?.technicalSEO),
    score_link_analysis: validateScore(auditResult.scores?.linkAnalysis),
    
    // Detailed findings - ensure they're objects, not undefined
    schema_findings: auditResult.details?.schemaMarkup || {},
    meta_findings: auditResult.details?.metaTags || {},
    crawler_findings: auditResult.details?.aiCrawlers || {},
    eeat_findings: auditResult.details?.eeat || {},
    structure_findings: auditResult.details?.structure || {},
    performance_findings: auditResult.details?.performance || {},
    content_findings: auditResult.details?.contentQuality || {},
    citation_findings: auditResult.details?.citationPotential || {},
    technical_findings: auditResult.details?.technicalSEO || {},
    link_findings: auditResult.details?.linkAnalysis || {},
    
    // AI recommendations - ensure it's an array
    ai_recommendations: Array.isArray(auditResult.recommendations) 
      ? auditResult.recommendations 
      : [],
    
    // Aggregation flags - extract from schema details
    has_organization_schema: auditResult.details?.schemaMarkup?.schemas?.Organization || false,
    has_person_schema: auditResult.details?.schemaMarkup?.schemas?.Person || false,
    has_article_schema: auditResult.details?.schemaMarkup?.schemas?.Article || false,
    has_breadcrumb_schema: auditResult.details?.schemaMarkup?.schemas?.BreadcrumbList || false,
    has_author_markup: auditResult.details?.eeat?.hasAuthorInfo || false,
    has_eeat_signals: (auditResult.details?.eeat?.authorityScore || 0) > 50,
    robots_txt_allows_ai: auditResult.details?.aiCrawlers?.allowsGPTBot || false,
    
    // Public visibility - all new audits are public by default for carousel
    is_public: true,
  };
  
  return preparedData;
}

/**
 * Validates that prepared audit data meets database constraints
 * @param data - Prepared audit data
 * @returns Validation result with any errors
 */
export function validatePreparedData(data: PreparedAuditData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check required string fields
  if (!data.user_id) errors.push('user_id is required');
  if (!data.url) errors.push('url is required');
  if (!data.normalized_url) errors.push('normalized_url is required');
  if (!data.domain) errors.push('domain is required');
  if (!data.timestamp) errors.push('timestamp is required');
  
  // Check grade is valid
  const validGrades = ['A+', 'A', 'B', 'C', 'D', 'F'];
  if (!validGrades.includes(data.grade)) {
    errors.push(`grade must be one of: ${validGrades.join(', ')}`);
  }
  
  // Check score ranges
  const scoreFields = [
    'overall_score',
    'score_schema_markup',
    'score_meta_tags',
    'score_ai_crawlers',
    'score_eeat',
    'score_structure',
    'score_performance',
    'score_content_quality',
    'score_citation_potential',
    'score_technical_seo',
    'score_link_analysis',
  ];
  
  for (const field of scoreFields) {
    const value = (data as any)[field];
    if (typeof value !== 'number' || value < 0 || value > 100) {
      errors.push(`${field} must be a number between 0 and 100`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
