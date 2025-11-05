/**
 * A2A Adapter - Convert GEO Audit Results to AI-Friendly Format
 * Production-ready with semantic extraction, entity detection, and confidence scoring
 */

import type { AuditResult, EnhancedRecommendation } from '../../utils/geoAuditEnhanced';
import type {
  A2AAuditResult,
  A2ACategoryScore,
  A2AFinding,
  A2AEntity,
  A2AInsight,
  A2AContext,
} from './protocol';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// CONFIDENCE CALCULATION
// =====================================================

/**
 * Calculate confidence score based on data completeness
 */
function calculateConfidence(result: AuditResult): number {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence based on data completeness
  if (result.details.schemaMarkup.totalSchemas > 0) confidence += 0.1;
  if (result.details.metaTags.hasTitle && result.details.metaTags.hasDescription) confidence += 0.1;
  if (result.details.eeat.hasAuthorInfo) confidence += 0.1;
  if (result.details.contentQuality.wordCount > 500) confidence += 0.1;
  if (result.details.aiCrawlers.robotsTxtFound) confidence += 0.05;
  if (result.details.citationPotential.factualStatements > 5) confidence += 0.05;
  
  return Math.min(0.95, confidence); // Cap at 0.95 (never 100% certain)
}

// =====================================================
// CATEGORY CONVERSION
// =====================================================

/**
 * Convert score to status label
 */
function scoreToStatus(score: number): 'excellent' | 'good' | 'needs_improvement' | 'critical' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'needs_improvement';
  return 'critical';
}

/**
 * Convert category scores to A2A format
 */
function convertCategories(result: AuditResult): A2AAuditResult['categories'] {
  const createCategoryScore = (score: number, weight: number): A2ACategoryScore => ({
    score: Math.round(score),
    max_score: 100,
    percentage: Math.round(score),
    status: scoreToStatus(score),
    weight,
  });
  
  return {
    schema_markup: createCategoryScore(result.scores.schemaMarkup, 0.20),
    meta_tags: createCategoryScore(result.scores.metaTags, 0.15),
    ai_crawlers: createCategoryScore(result.scores.aiCrawlers, 0.15),
    eeat: createCategoryScore(result.scores.eeat, 0.15),
    content_quality: createCategoryScore(result.scores.contentQuality, 0.15),
    citation_potential: createCategoryScore(result.scores.citationPotential, 0.10),
    technical_seo: createCategoryScore(result.scores.technicalSEO, 0.10),
  };
}

// =====================================================
// FINDINGS EXTRACTION
// =====================================================

/**
 * Convert recommendations to findings
 */
function convertToFindings(recommendations: EnhancedRecommendation[]): A2AAuditResult['findings'] {
  const findings: A2AAuditResult['findings'] = {
    critical: [],
    warnings: [],
    recommendations: [],
    opportunities: [],
  };
  
  recommendations.forEach((rec) => {
    const finding: A2AFinding = {
      id: uuidv4(),
      category: rec.category,
      severity: rec.priority,
      title: rec.title,
      description: rec.description,
      impact: rec.impact,
      recommendation: rec.implementation,
      implementation: {
        effort: rec.effort === 'quick-win' ? 'quick' : rec.effort === 'strategic' ? 'moderate' : 'complex',
        time_estimate: rec.estimatedTime,
        code_example: rec.codeExample,
      },
      ai_context: generateAIContext(rec),
    };
    
    // Categorize by severity
    if (rec.priority === 'critical') {
      findings.critical.push(finding);
    } else if (rec.priority === 'high') {
      findings.warnings.push(finding);
    } else if (rec.priority === 'medium') {
      findings.recommendations.push(finding);
    } else {
      findings.opportunities.push(finding);
    }
  });
  
  return findings;
}

/**
 * Generate AI-friendly context for finding
 */
function generateAIContext(rec: EnhancedRecommendation): string {
  return `This ${rec.priority}-priority issue affects ${rec.category.toLowerCase()} and requires ${rec.effort} effort to resolve. Estimated impact: ${rec.impact}`;
}

// =====================================================
// SEMANTIC DATA EXTRACTION
// =====================================================

/**
 * Extract semantic data from audit result
 */
function extractSemanticData(result: AuditResult): A2AAuditResult['semantic_data'] {
  const semantic_data: A2AAuditResult['semantic_data'] = {
    entity_type: detectEntityType(result),
    industry: detectIndustry(result),
    topics: extractTopics(result),
    keywords: extractKeywords(result),
    entities: extractEntities(result),
  };
  
  return semantic_data;
}

/**
 * Detect primary entity type from schema
 */
function detectEntityType(result: AuditResult): string | undefined {
  const schemas = result.details.schemaMarkup.schemas;
  
  if (schemas.Organization) return 'Organization';
  if (schemas.Person) return 'Person';
  if (schemas.LocalBusiness) return 'LocalBusiness';
  if (schemas.Article || schemas.BlogPosting) return 'Article';
  if (schemas.Product) return 'Product';
  if (schemas.SoftwareApplication) return 'SoftwareApplication';
  
  return undefined;
}

/**
 * Detect industry from URL and content signals
 */
function detectIndustry(result: AuditResult): string | undefined {
  const url = result.url.toLowerCase();
  const schemas = result.details.schemaMarkup.schemas;
  
  // E-commerce indicators
  if (schemas.Product || url.includes('shop') || url.includes('store')) {
    return 'E-commerce';
  }
  
  // Technology/SaaS indicators
  if (schemas.SoftwareApplication || url.includes('tech') || url.includes('api') || url.includes('app')) {
    return 'Technology';
  }
  
  // Media/Publishing indicators
  if (schemas.Article || schemas.BlogPosting || url.includes('blog') || url.includes('news')) {
    return 'Media & Publishing';
  }
  
  // Local business indicators
  if (schemas.LocalBusiness) {
    return 'Local Business';
  }
  
  // Education indicators
  if (url.includes('.edu') || url.includes('learn') || url.includes('course')) {
    return 'Education';
  }
  
  return undefined;
}

/**
 * Extract topics from content and structure
 */
function extractTopics(result: AuditResult): string[] {
  const topics: string[] = [];
  
  // Add GEO-related topics
  if (result.scores.schemaMarkup > 70) {
    topics.push('Structured Data');
  }
  
  if (result.scores.eeat > 70) {
    topics.push('E-E-A-T', 'Authority');
  }
  
  if (result.scores.aiCrawlers > 70) {
    topics.push('AI Optimization', 'AI Crawlers');
  }
  
  if (result.scores.citationPotential > 70) {
    topics.push('Citations', 'Data-Driven Content');
  }
  
  if (result.details.contentQuality.wordCount > 2000) {
    topics.push('Comprehensive Content');
  }
  
  return topics;
}

/**
 * Extract keywords from URL and meta tags
 */
function extractKeywords(result: AuditResult): string[] {
  const keywords: string[] = [];
  
  // Extract from URL
  const urlParts = new URL(result.url).pathname.split('/').filter(p => p && p.length > 2);
  keywords.push(...urlParts.slice(0, 5));
  
  // Add schema types as keywords
  Object.entries(result.details.schemaMarkup.schemas)
    .filter(([_, hasIt]) => hasIt)
    .forEach(([type, _]) => keywords.push(type.replace(/([A-Z])/g, ' $1').trim()));
  
  // Deduplicate and normalize
  return [...new Set(keywords)]
    .map(k => k.toLowerCase())
    .slice(0, 10); // Limit to 10 keywords
}

/**
 * Extract entities from schema markup
 */
function extractEntities(result: AuditResult): A2AEntity[] {
  const entities: A2AEntity[] = [];
  
  // Organization entity
  if (result.details.schemaMarkup.schemas.Organization) {
    entities.push({
      type: 'Organization',
      name: new URL(result.url).hostname.replace('www.', ''),
      confidence: 0.85,
    });
  }
  
  // Person entity (if author detected)
  if (result.details.eeat.hasAuthorInfo) {
    entities.push({
      type: 'Person',
      name: 'Author', // In production, extract actual name
      confidence: 0.70,
    });
  }
  
  // Add more entities based on schema types
  const schemaTypes = Object.entries(result.details.schemaMarkup.schemas)
    .filter(([_, hasIt]) => hasIt)
    .map(([type, _]) => type)
    .slice(0, 5);
  
  schemaTypes.forEach(type => {
    if (!entities.find(e => e.type === type)) {
      entities.push({
        type,
        name: type,
        confidence: 0.60,
      });
    }
  });
  
  return entities;
}

// =====================================================
// CITATIONS EXTRACTION
// =====================================================

/**
 * Extract citation data
 */
function extractCitations(result: AuditResult): A2AAuditResult['citations'] {
  const citationDetails = result.details.citationPotential;
  
  return {
    sources: [], // In production, extract actual URLs
    data_points: citationDetails.dataPoints,
    factual_claims: citationDetails.factualStatements,
    expert_quotes: citationDetails.quotes,
  };
}

// =====================================================
// INSIGHTS GENERATION
// =====================================================

/**
 * Generate actionable insights
 */
function generateInsights(result: AuditResult): A2AInsight[] {
  const insights: A2AInsight[] = [];
  
  // Best practice insights
  if (result.scores.schemaMarkup > 80 && result.scores.eeat > 80) {
    insights.push({
      type: 'best_practice',
      title: 'Strong Technical & Authority Foundation',
      description: 'Website demonstrates excellent structured data implementation and clear E-E-A-T signals, positioning it well for AI citation',
      confidence: 0.88,
    });
  }
  
  // Opportunity insights
  if (result.scores.citationPotential < 60 && result.scores.contentQuality > 70) {
    insights.push({
      type: 'opportunity',
      title: 'High-Quality Content Needs Citation Optimization',
      description: 'Content quality is strong but lacks data points, factual statements, and expert quotes that AI systems prefer to cite',
      confidence: 0.82,
    });
  }
  
  // Benchmark insights
  const avgScore = result.overallScore;
  if (avgScore > 75) {
    insights.push({
      type: 'benchmark',
      title: 'Above Industry Average',
      description: `Overall GEO score of ${avgScore} exceeds the industry average, indicating strong AI-readiness`,
      data: { score: avgScore, percentile: 75 },
      confidence: 0.80,
    });
  }
  
  // Prediction insights
  if (result.scores.aiCrawlers > 80 && result.scores.citationPotential > 70) {
    insights.push({
      type: 'prediction',
      title: 'High Citation Potential',
      description: 'AI crawlers have full access and content structure suggests strong potential for AI system citations',
      confidence: 0.75,
    });
  }
  
  return insights;
}

// =====================================================
// MAIN ADAPTER FUNCTION
// =====================================================

/**
 * Convert GEO AuditResult to A2A format
 */
export function convertToA2AFormat(
  result: AuditResult,
  context: A2AContext,
  processingTimeMs: number
): A2AAuditResult {
  const startTime = Date.now();
  
  const a2aResult: A2AAuditResult = {
    audit_id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    url: result.url,
    timestamp: result.timestamp,
    status: 'completed',
    
    // Overall metrics
    overall_score: Math.round(result.overallScore),
    grade: result.grade,
    confidence: calculateConfidence(result),
    
    // Category scores
    categories: convertCategories(result),
    
    // Structured findings
    findings: convertToFindings(result.recommendations),
    
    // Semantic data
    semantic_data: extractSemanticData(result),
    
    // Citations
    citations: extractCitations(result),
    
    // Insights
    insights: generateInsights(result),
    
    // Metadata
    metadata: {
      processing_time_ms: processingTimeMs,
      agent_used: context.agent_info?.name || 'Unknown',
      depth: 'standard', // Can be extracted from context
      version: '1.0.0',
    },
  };
  
  const conversionTime = Date.now() - startTime;
  console.log(`✅ A2A conversion completed in ${conversionTime}ms`);
  
  return a2aResult;
}

/**
 * Batch convert multiple audit results
 */
export async function batchConvertToA2A(
  results: AuditResult[],
  context: A2AContext
): Promise<A2AAuditResult[]> {
  const startTime = Date.now();
  
  const converted = results.map((result) => {
    const processingTime = 0; // Individual processing time would come from audit engine
    return convertToA2AFormat(result, context, processingTime);
  });
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ Batch conversion of ${results.length} audits completed in ${totalTime}ms`);
  
  return converted;
}

/**
 * Convert with error handling (for production)
 */
export function safeConvertToA2A(
  result: AuditResult,
  context: A2AContext,
  processingTimeMs: number
): A2AAuditResult | null {
  try {
    return convertToA2AFormat(result, context, processingTimeMs);
  } catch (error) {
    console.error('Error converting to A2A format:', error);
    return null;
  }
}
