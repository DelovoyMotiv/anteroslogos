/**
 * Inline Suggestion Engine
 * Generates real-time suggestions for improving citation potential
 * 
 * This module implements:
 * 1. Entity addition suggestions
 * 2. Claim strengthening suggestions (add evidence, citations)
 * 3. Structural improvement recommendations (headings, lists)
 * 4. Schema markup suggestions
 * 
 * @module lib/citationIntelligence/inlineSuggestionEngine
 */

import type { RealTimeAnalysisResult } from './realTimeContentAnalyzer';

// ============================================================================
// Types
// ============================================================================

export interface InlineSuggestion {
  id: string;
  type: 'entity' | 'claim' | 'structure' | 'schema';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: number; // 0-100 (citation potential increase)
  location?: {
    startIndex: number;
    endIndex: number;
  };
  actionable: {
    action: string;
    example?: string;
  };
}

export interface SuggestionEngineResult {
  suggestions: InlineSuggestion[];
  totalSuggestions: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    entity: number;
    claim: number;
    structure: number;
    schema: number;
  };
}

// ============================================================================
// Entity Addition Suggestions
// ============================================================================

/**
 * Generate entity addition suggestions
 */
function generateEntitySuggestions(
  content: string,
  analysis: RealTimeAnalysisResult
): InlineSuggestion[] {
  const suggestions: InlineSuggestion[] = [];
  
  // Check if entity count is low
  const wordCount = content.split(/\s+/).length;
  const entityDensity = (analysis.entityPresence.count / wordCount) * 100;
  
  if (entityDensity < 5) {
    // Target: 5-10 entities per 100 words
    suggestions.push({
      id: 'entity_add_more',
      type: 'entity',
      priority: 'high',
      title: 'Add more entities to content',
      description: `Current entity density is ${entityDensity.toFixed(1)} per 100 words. Target is 5-10 entities per 100 words.`,
      expectedImpact: 15,
      actionable: {
        action: 'Add specific names, organizations, products, or concepts',
        example: 'Instead of "the company", use "Apple Inc." or "Google"',
      },
    });
  }
  
  // Check entity diversity
  if (analysis.entityPresence.diversity < 40 && analysis.entityPresence.count > 0) {
    suggestions.push({
      id: 'entity_diversify',
      type: 'entity',
      priority: 'medium',
      title: 'Diversify entity types',
      description: `Entity diversity is ${analysis.entityPresence.diversity.toFixed(0)}%. Include different types of entities.`,
      expectedImpact: 10,
      actionable: {
        action: 'Add entities from different categories: people, organizations, products, concepts',
        example: 'Mention specific researchers, institutions, technologies, and methodologies',
      },
    });
  }
  
  // Suggest specific entity types based on content
  const hasPersons = analysis.entityPresence.entities.some(e => e.type === 'Person');
  const hasOrganizations = analysis.entityPresence.entities.some(e => e.type === 'Organization');
  
  if (!hasPersons && wordCount > 100) {
    suggestions.push({
      id: 'entity_add_persons',
      type: 'entity',
      priority: 'medium',
      title: 'Add expert or authority figures',
      description: 'Content lacks mentions of specific people. Adding experts increases credibility.',
      expectedImpact: 8,
      actionable: {
        action: 'Reference researchers, authors, or industry leaders',
        example: 'According to Dr. Jane Smith from MIT...',
      },
    });
  }
  
  if (!hasOrganizations && wordCount > 100) {
    suggestions.push({
      id: 'entity_add_organizations',
      type: 'entity',
      priority: 'medium',
      title: 'Reference authoritative organizations',
      description: 'Content lacks organizational references. Adding institutions increases authority.',
      expectedImpact: 8,
      actionable: {
        action: 'Mention universities, research institutions, or companies',
        example: 'Research from Stanford University shows...',
      },
    });
  }
  
  return suggestions;
}

// ============================================================================
// Claim Strengthening Suggestions
// ============================================================================

/**
 * Generate claim strengthening suggestions
 */
function generateClaimSuggestions(
  content: string,
  analysis: RealTimeAnalysisResult
): InlineSuggestion[] {
  const suggestions: InlineSuggestion[] = [];
  
  // Check if claim count is low
  const wordCount = content.split(/\s+/).length;
  const claimDensity = (analysis.claimStructure.totalClaims / wordCount) * 100;
  
  if (claimDensity < 2 && wordCount > 50) {
    suggestions.push({
      id: 'claim_add_more',
      type: 'claim',
      priority: 'high',
      title: 'Add more factual claims',
      description: `Current claim density is ${claimDensity.toFixed(1)} per 100 words. Target is 2-5 claims per 100 words.`,
      expectedImpact: 12,
      actionable: {
        action: 'Make specific, verifiable statements about your topic',
        example: 'Instead of "AI is useful", say "AI systems achieve 95% accuracy in image recognition"',
      },
    });
  }
  
  // Check evidence ratio
  if (analysis.claimStructure.evidenceRatio < 0.5 && analysis.claimStructure.totalClaims > 0) {
    suggestions.push({
      id: 'claim_add_evidence',
      type: 'claim',
      priority: 'high',
      title: 'Add evidence to support claims',
      description: `Only ${(analysis.claimStructure.evidenceRatio * 100).toFixed(0)}% of claims have evidence. Target is 70%+.`,
      expectedImpact: 15,
      actionable: {
        action: 'Support claims with research, data, or expert opinions',
        example: 'Add phrases like "According to research...", "Studies show...", "Data indicates..."',
      },
    });
  }
  
  // Suggest specific evidence types
  const hasResearchEvidence = content.toLowerCase().includes('research') || 
                               content.toLowerCase().includes('study');
  const hasDataEvidence = content.toLowerCase().includes('data') || 
                          content.toLowerCase().includes('statistics');
  
  if (!hasResearchEvidence && analysis.claimStructure.totalClaims > 0) {
    suggestions.push({
      id: 'claim_add_research',
      type: 'claim',
      priority: 'medium',
      title: 'Reference research studies',
      description: 'Add citations to academic research to strengthen claims.',
      expectedImpact: 10,
      actionable: {
        action: 'Cite specific research papers or studies',
        example: 'A 2024 study published in Nature found that...',
      },
    });
  }
  
  if (!hasDataEvidence && analysis.claimStructure.totalClaims > 0) {
    suggestions.push({
      id: 'claim_add_data',
      type: 'claim',
      priority: 'medium',
      title: 'Include quantitative data',
      description: 'Add specific numbers and statistics to support claims.',
      expectedImpact: 10,
      actionable: {
        action: 'Use specific percentages, numbers, or metrics',
        example: 'Performance improved by 40% compared to baseline',
      },
    });
  }
  
  return suggestions;
}

// ============================================================================
// Structural Improvement Suggestions
// ============================================================================

/**
 * Generate structural improvement suggestions
 */
function generateStructureSuggestions(
  content: string
): InlineSuggestion[] {
  const suggestions: InlineSuggestion[] = [];
  
  // Check for headings
  const hasMarkdownHeadings = /^#{1,6}\s/m.test(content);
  const hasHtmlHeadings = /<h[1-6]>/i.test(content);
  
  if (!hasMarkdownHeadings && !hasHtmlHeadings && content.length > 500) {
    suggestions.push({
      id: 'structure_add_headings',
      type: 'structure',
      priority: 'high',
      title: 'Add section headings',
      description: 'Content lacks clear structure. Headings improve readability and AI understanding.',
      expectedImpact: 12,
      actionable: {
        action: 'Break content into sections with descriptive headings',
        example: '## Key Benefits\n## How It Works\n## Research Findings',
      },
    });
  }
  
  // Check for lists
  const hasMarkdownLists = /^[\s]*[-*•]\s/m.test(content) || /^\s*\d+\.\s/m.test(content);
  const hasHtmlLists = /<[uo]l>/i.test(content);
  
  if (!hasMarkdownLists && !hasHtmlLists && content.length > 300) {
    suggestions.push({
      id: 'structure_add_lists',
      type: 'structure',
      priority: 'medium',
      title: 'Use lists for key points',
      description: 'Lists make information more scannable and easier for AI to parse.',
      expectedImpact: 8,
      actionable: {
        action: 'Convert series of items or steps into bulleted or numbered lists',
        example: '- First benefit\n- Second benefit\n- Third benefit',
      },
    });
  }
  
  // Check for code blocks (technical content)
  const hasCodeBlocks = /```|<code>/i.test(content);
  const looksLikeTechnicalContent = /\b(function|class|const|let|var|import|export|API|JSON|XML|HTML|CSS)\b/i.test(content);
  
  if (!hasCodeBlocks && looksLikeTechnicalContent) {
    suggestions.push({
      id: 'structure_add_code_blocks',
      type: 'structure',
      priority: 'low',
      title: 'Format code examples',
      description: 'Technical content should use code blocks for better formatting.',
      expectedImpact: 5,
      actionable: {
        action: 'Wrap code snippets in code blocks',
        example: '```javascript\nconst example = "code";\n```',
      },
    });
  }
  
  // Check paragraph length
  const paragraphs = content.split(/\n\n+/);
  const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150);
  
  if (longParagraphs.length > 0) {
    suggestions.push({
      id: 'structure_break_paragraphs',
      type: 'structure',
      priority: 'low',
      title: 'Break up long paragraphs',
      description: `${longParagraphs.length} paragraph(s) exceed 150 words. Shorter paragraphs improve readability.`,
      expectedImpact: 5,
      actionable: {
        action: 'Split long paragraphs into smaller, focused sections',
        example: 'Aim for 3-5 sentences per paragraph',
      },
    });
  }
  
  return suggestions;
}

// ============================================================================
// Schema Markup Suggestions
// ============================================================================

/**
 * Generate schema markup suggestions
 */
function generateSchemaSuggestions(
  content: string,
  analysis: RealTimeAnalysisResult
): InlineSuggestion[] {
  const suggestions: InlineSuggestion[] = [];
  
  // Check if content has entities that could benefit from schema
  if (analysis.entityPresence.count > 0) {
    const hasPersons = analysis.entityPresence.entities.some(e => e.type === 'Person');
    const hasOrganizations = analysis.entityPresence.entities.some(e => e.type === 'Organization');
    const hasProducts = analysis.entityPresence.entities.some(e => e.type === 'Product');
    
    if (hasPersons) {
      suggestions.push({
        id: 'schema_add_person',
        type: 'schema',
        priority: 'medium',
        title: 'Add Person schema markup',
        description: 'Content mentions people. Add schema.org/Person markup for better AI understanding.',
        expectedImpact: 10,
        actionable: {
          action: 'Add JSON-LD schema for mentioned people',
          example: '{\n  "@type": "Person",\n  "name": "Dr. Jane Smith",\n  "affiliation": "MIT"\n}',
        },
      });
    }
    
    if (hasOrganizations) {
      suggestions.push({
        id: 'schema_add_organization',
        type: 'schema',
        priority: 'medium',
        title: 'Add Organization schema markup',
        description: 'Content mentions organizations. Add schema.org/Organization markup.',
        expectedImpact: 10,
        actionable: {
          action: 'Add JSON-LD schema for mentioned organizations',
          example: '{\n  "@type": "Organization",\n  "name": "Stanford University",\n  "url": "https://stanford.edu"\n}',
        },
      });
    }
    
    if (hasProducts) {
      suggestions.push({
        id: 'schema_add_product',
        type: 'schema',
        priority: 'medium',
        title: 'Add Product schema markup',
        description: 'Content mentions products. Add schema.org/Product markup.',
        expectedImpact: 8,
        actionable: {
          action: 'Add JSON-LD schema for mentioned products',
          example: '{\n  "@type": "Product",\n  "name": "Product Name",\n  "description": "Product description"\n}',
        },
      });
    }
  }
  
  // Check for article-like content
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 300 && analysis.claimStructure.totalClaims > 0) {
    suggestions.push({
      id: 'schema_add_article',
      type: 'schema',
      priority: 'high',
      title: 'Add Article schema markup',
      description: 'Content appears to be an article. Add schema.org/Article markup.',
      expectedImpact: 12,
      actionable: {
        action: 'Add JSON-LD schema for the article',
        example: '{\n  "@type": "Article",\n  "headline": "Article Title",\n  "author": {...},\n  "datePublished": "2024-01-01"\n}',
      },
    });
  }
  
  // Check for FAQ-like content
  const hasQuestions = (content.match(/\?/g) || []).length;
  if (hasQuestions >= 3) {
    suggestions.push({
      id: 'schema_add_faq',
      type: 'schema',
      priority: 'medium',
      title: 'Add FAQPage schema markup',
      description: 'Content contains questions. Add schema.org/FAQPage markup.',
      expectedImpact: 10,
      actionable: {
        action: 'Add JSON-LD schema for FAQ',
        example: '{\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "Question?",\n    "acceptedAnswer": {...}\n  }]\n}',
      },
    });
  }
  
  return suggestions;
}

// ============================================================================
// Main Suggestion Engine
// ============================================================================

/**
 * Generate inline suggestions for content improvement
 */
export function generateInlineSuggestions(
  content: string,
  analysis: RealTimeAnalysisResult
): SuggestionEngineResult {
  // Generate suggestions by category
  const entitySuggestions = generateEntitySuggestions(content, analysis);
  const claimSuggestions = generateClaimSuggestions(content, analysis);
  const structureSuggestions = generateStructureSuggestions(content);
  const schemaSuggestions = generateSchemaSuggestions(content, analysis);
  
  // Combine all suggestions
  const allSuggestions = [
    ...entitySuggestions,
    ...claimSuggestions,
    ...structureSuggestions,
    ...schemaSuggestions,
  ];
  
  // Sort by priority and expected impact
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  allSuggestions.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.expectedImpact - a.expectedImpact;
  });
  
  // Calculate statistics
  const byPriority = {
    high: allSuggestions.filter(s => s.priority === 'high').length,
    medium: allSuggestions.filter(s => s.priority === 'medium').length,
    low: allSuggestions.filter(s => s.priority === 'low').length,
  };
  
  const byType = {
    entity: allSuggestions.filter(s => s.type === 'entity').length,
    claim: allSuggestions.filter(s => s.type === 'claim').length,
    structure: allSuggestions.filter(s => s.type === 'structure').length,
    schema: allSuggestions.filter(s => s.type === 'schema').length,
  };
  
  return {
    suggestions: allSuggestions,
    totalSuggestions: allSuggestions.length,
    byPriority,
    byType,
  };
}

/**
 * Get top N suggestions by priority
 */
export function getTopSuggestions(
  result: SuggestionEngineResult,
  limit: number = 5
): InlineSuggestion[] {
  return result.suggestions.slice(0, limit);
}

/**
 * Filter suggestions by type
 */
export function filterSuggestionsByType(
  result: SuggestionEngineResult,
  type: 'entity' | 'claim' | 'structure' | 'schema'
): InlineSuggestion[] {
  return result.suggestions.filter(s => s.type === type);
}

/**
 * Filter suggestions by priority
 */
export function filterSuggestionsByPriority(
  result: SuggestionEngineResult,
  priority: 'high' | 'medium' | 'low'
): InlineSuggestion[] {
  return result.suggestions.filter(s => s.priority === priority);
}

/**
 * Calculate total expected impact of all suggestions
 */
export function calculateTotalImpact(result: SuggestionEngineResult): number {
  return result.suggestions.reduce((sum, s) => sum + s.expectedImpact, 0);
}
