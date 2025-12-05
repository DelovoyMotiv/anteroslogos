/**
 * Pre-Publication Checklist Generator
 * Generates actionable checklist for content before publication
 * 
 * This module implements:
 * 1. E-E-A-T signal verification
 * 2. Schema markup presence validation
 * 3. Citation quality checks
 * 4. Entity relationship verification
 * 5. Actionable checklist generation
 * 
 * @module lib/citationIntelligence/prePublicationChecklist
 */

import type { RealTimeAnalysisResult } from './realTimeContentAnalyzer';

// ============================================================================
// Types
// ============================================================================

export interface ChecklistItem {
  id: string;
  category: 'eeat' | 'schema' | 'citations' | 'entities' | 'structure';
  status: 'pass' | 'warning' | 'fail';
  title: string;
  description: string;
  action?: string;
  priority: 'critical' | 'important' | 'recommended';
}

export interface PrePublicationChecklist {
  overallStatus: 'ready' | 'needs-improvement' | 'not-ready';
  score: number; // 0-100
  items: ChecklistItem[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
  recommendations: string[];
}

// ============================================================================
// E-E-A-T Signal Checks
// ============================================================================

/**
 * Check for E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
 */
function checkEEATSignals(content: string, analysis: RealTimeAnalysisResult): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  
  // Check for author attribution
  const hasAuthor = /\b(by|author|written by|posted by)\s+[A-Z][a-z]+/i.test(content) ||
                    analysis.entityPresence.entities.some(e => e.type === 'Person');
  
  items.push({
    id: 'eeat_author',
    category: 'eeat',
    status: hasAuthor ? 'pass' : 'fail',
    title: 'Author Attribution',
    description: hasAuthor
      ? 'Content includes author attribution'
      : 'Content lacks clear author attribution',
    action: hasAuthor ? undefined : 'Add author name and credentials',
    priority: 'critical',
  });
  
  // Check for citations/references
  const hasCitations = analysis.claimStructure.evidenceRatio > 0.3;
  
  items.push({
    id: 'eeat_citations',
    category: 'eeat',
    status: hasCitations ? 'pass' : 'warning',
    title: 'Citations and References',
    description: hasCitations
      ? `${(analysis.claimStructure.evidenceRatio * 100).toFixed(0)}% of claims have evidence`
      : 'Low citation rate for claims',
    action: hasCitations ? undefined : 'Add citations to support claims',
    priority: 'important',
  });
  
  // Check for credentials/expertise indicators
  const hasCredentials = /\b(PhD|Dr\.|Professor|Expert|Certified|Licensed|Specialist)\b/i.test(content);
  
  items.push({
    id: 'eeat_credentials',
    category: 'eeat',
    status: hasCredentials ? 'pass' : 'warning',
    title: 'Expertise Indicators',
    description: hasCredentials
      ? 'Content mentions credentials or expertise'
      : 'No clear expertise indicators found',
    action: hasCredentials ? undefined : 'Mention author credentials or expert sources',
    priority: 'important',
  });
  
  // Check for publication date
  const hasDate = /\b(20\d{2}|January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(content);
  
  items.push({
    id: 'eeat_date',
    category: 'eeat',
    status: hasDate ? 'pass' : 'warning',
    title: 'Publication Date',
    description: hasDate
      ? 'Content includes date information'
      : 'No publication date found',
    action: hasDate ? undefined : 'Add publication or last updated date',
    priority: 'recommended',
  });
  
  return items;
}

// ============================================================================
// Schema Markup Checks
// ============================================================================

/**
 * Check for schema markup presence
 */
function checkSchemaMarkup(content: string, analysis: RealTimeAnalysisResult): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  
  // Check for JSON-LD schema
  const hasJsonLd = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(content);
  
  items.push({
    id: 'schema_jsonld',
    category: 'schema',
    status: hasJsonLd ? 'pass' : 'fail',
    title: 'JSON-LD Schema Markup',
    description: hasJsonLd
      ? 'Content includes JSON-LD schema'
      : 'No JSON-LD schema markup found',
    action: hasJsonLd ? undefined : 'Add JSON-LD schema markup',
    priority: 'critical',
  });
  
  // Check for entity schema (if entities present)
  if (analysis.entityPresence.count > 0) {
    const hasEntitySchema = /@type["']?\s*:\s*["'](Person|Organization|Product|Article)/i.test(content);
    
    items.push({
      id: 'schema_entities',
      category: 'schema',
      status: hasEntitySchema ? 'pass' : 'warning',
      title: 'Entity Schema Markup',
      description: hasEntitySchema
        ? 'Entities have schema markup'
        : `${analysis.entityPresence.count} entities lack schema markup`,
      action: hasEntitySchema ? undefined : 'Add schema for mentioned entities',
      priority: 'important',
    });
  }
  
  // Check for article schema (if content is article-like)
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 300) {
    const hasArticleSchema = /@type["']?\s*:\s*["']Article/i.test(content);
    
    items.push({
      id: 'schema_article',
      category: 'schema',
      status: hasArticleSchema ? 'pass' : 'warning',
      title: 'Article Schema',
      description: hasArticleSchema
        ? 'Content has Article schema'
        : 'Article-length content lacks Article schema',
      action: hasArticleSchema ? undefined : 'Add Article schema with headline, author, datePublished',
      priority: 'important',
    });
  }
  
  return items;
}

// ============================================================================
// Citation Quality Checks
// ============================================================================

/**
 * Check citation quality
 */
function checkCitationQuality(content: string, analysis: RealTimeAnalysisResult): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  
  // Check claim-to-evidence ratio
  const evidenceRatio = analysis.claimStructure.evidenceRatio;
  
  items.push({
    id: 'citation_ratio',
    category: 'citations',
    status: evidenceRatio >= 0.7 ? 'pass' : evidenceRatio >= 0.4 ? 'warning' : 'fail',
    title: 'Claim Evidence Ratio',
    description: `${(evidenceRatio * 100).toFixed(0)}% of claims have supporting evidence`,
    action: evidenceRatio >= 0.7 ? undefined : 'Add evidence to unsupported claims',
    priority: evidenceRatio >= 0.4 ? 'important' : 'critical',
  });
  
  // Check for external sources
  const hasExternalSources = /https?:\/\//i.test(content) ||
                             analysis.entityPresence.entities.some(e => e.type === 'Organization');
  
  items.push({
    id: 'citation_external',
    category: 'citations',
    status: hasExternalSources ? 'pass' : 'warning',
    title: 'External Sources',
    description: hasExternalSources
      ? 'Content references external sources'
      : 'No external sources referenced',
    action: hasExternalSources ? undefined : 'Add links to authoritative sources',
    priority: 'recommended',
  });
  
  // Check for diverse evidence types
  const hasResearch = /\b(research|study|studies|paper|journal)\b/i.test(content);
  const hasData = /\b(data|statistics|survey|analysis)\b/i.test(content);
  const hasExperts = /\b(expert|professor|dr\.|researcher)\b/i.test(content);
  
  const evidenceTypes = [hasResearch, hasData, hasExperts].filter(Boolean).length;
  
  items.push({
    id: 'citation_diversity',
    category: 'citations',
    status: evidenceTypes >= 2 ? 'pass' : evidenceTypes >= 1 ? 'warning' : 'fail',
    title: 'Evidence Diversity',
    description: `${evidenceTypes} types of evidence present (research, data, experts)`,
    action: evidenceTypes >= 2 ? undefined : 'Include multiple types of evidence',
    priority: 'recommended',
  });
  
  return items;
}

// ============================================================================
// Entity Relationship Checks
// ============================================================================

/**
 * Check entity relationships
 */
function checkEntityRelationships(content: string, analysis: RealTimeAnalysisResult): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  
  // Check entity count
  const entityCount = analysis.entityPresence.count;
  const wordCount = content.split(/\s+/).length;
  const entityDensity = (entityCount / wordCount) * 100;
  
  items.push({
    id: 'entity_count',
    category: 'entities',
    status: entityDensity >= 5 ? 'pass' : entityDensity >= 3 ? 'warning' : 'fail',
    title: 'Entity Density',
    description: `${entityCount} entities (${entityDensity.toFixed(1)} per 100 words)`,
    action: entityDensity >= 5 ? undefined : 'Add more specific entities (names, organizations, products)',
    priority: entityDensity >= 3 ? 'recommended' : 'important',
  });
  
  // Check entity diversity
  const diversity = analysis.entityPresence.diversity;
  
  items.push({
    id: 'entity_diversity',
    category: 'entities',
    status: diversity >= 40 ? 'pass' : diversity >= 20 ? 'warning' : 'fail',
    title: 'Entity Diversity',
    description: `${diversity.toFixed(0)}% entity type diversity`,
    action: diversity >= 40 ? undefined : 'Include different entity types (people, organizations, concepts)',
    priority: 'recommended',
  });
  
  // Check for entity context
  const hasEntityContext = entityCount > 0 && analysis.claimStructure.totalClaims > 0;
  
  items.push({
    id: 'entity_context',
    category: 'entities',
    status: hasEntityContext ? 'pass' : 'warning',
    title: 'Entity Context',
    description: hasEntityContext
      ? 'Entities are used in claims and context'
      : 'Entities lack contextual usage',
    action: hasEntityContext ? undefined : 'Use entities in factual claims and explanations',
    priority: 'recommended',
  });
  
  return items;
}

// ============================================================================
// Structure Checks
// ============================================================================

/**
 * Check content structure
 */
function checkContentStructure(content: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  
  // Check for headings
  const hasHeadings = /^#{1,6}\s/m.test(content) || /<h[1-6]>/i.test(content);
  
  items.push({
    id: 'structure_headings',
    category: 'structure',
    status: hasHeadings ? 'pass' : 'warning',
    title: 'Section Headings',
    description: hasHeadings
      ? 'Content has clear section headings'
      : 'No section headings found',
    action: hasHeadings ? undefined : 'Add descriptive headings to organize content',
    priority: 'recommended',
  });
  
  // Check for lists
  const hasLists = /^[\s]*[-*•]\s/m.test(content) || /^\s*\d+\.\s/m.test(content) || /<[uo]l>/i.test(content);
  
  items.push({
    id: 'structure_lists',
    category: 'structure',
    status: hasLists ? 'pass' : 'warning',
    title: 'Lists and Bullets',
    description: hasLists
      ? 'Content uses lists for organization'
      : 'No lists found',
    action: hasLists ? undefined : 'Use lists for key points and steps',
    priority: 'recommended',
  });
  
  // Check paragraph length
  const paragraphs = content.split(/\n\n+/);
  const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150);
  
  items.push({
    id: 'structure_paragraphs',
    category: 'structure',
    status: longParagraphs.length === 0 ? 'pass' : 'warning',
    title: 'Paragraph Length',
    description: longParagraphs.length === 0
      ? 'Paragraphs are appropriately sized'
      : `${longParagraphs.length} paragraphs exceed 150 words`,
    action: longParagraphs.length === 0 ? undefined : 'Break long paragraphs into smaller sections',
    priority: 'recommended',
  });
  
  return items;
}

// ============================================================================
// Main Checklist Generator
// ============================================================================

/**
 * Generate pre-publication checklist
 */
export function generatePrePublicationChecklist(
  content: string,
  analysis: RealTimeAnalysisResult
): PrePublicationChecklist {
  // Generate all checklist items
  const allItems: ChecklistItem[] = [
    ...checkEEATSignals(content, analysis),
    ...checkSchemaMarkup(content, analysis),
    ...checkCitationQuality(content, analysis),
    ...checkEntityRelationships(content, analysis),
    ...checkContentStructure(content),
  ];
  
  // Calculate summary
  const summary = {
    passed: allItems.filter(item => item.status === 'pass').length,
    warnings: allItems.filter(item => item.status === 'warning').length,
    failed: allItems.filter(item => item.status === 'fail').length,
  };
  
  // Calculate overall score
  const totalItems = allItems.length;
  const passedWeight = summary.passed * 1.0;
  const warningWeight = summary.warnings * 0.5;
  const score = ((passedWeight + warningWeight) / totalItems) * 100;
  
  // Determine overall status
  let overallStatus: 'ready' | 'needs-improvement' | 'not-ready';
  if (summary.failed === 0 && summary.warnings <= 2) {
    overallStatus = 'ready';
  } else if (summary.failed <= 2) {
    overallStatus = 'needs-improvement';
  } else {
    overallStatus = 'not-ready';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  const criticalFails = allItems.filter(item => item.status === 'fail' && item.priority === 'critical');
  const importantIssues = allItems.filter(item => 
    (item.status === 'fail' || item.status === 'warning') && item.priority === 'important'
  );
  
  if (criticalFails.length > 0) {
    recommendations.push(`Address ${criticalFails.length} critical issue(s) before publishing`);
  }
  if (importantIssues.length > 0) {
    recommendations.push(`Fix ${importantIssues.length} important issue(s) to improve citation potential`);
  }
  if (score < 70) {
    recommendations.push('Content needs significant improvement before publication');
  } else if (score < 85) {
    recommendations.push('Content is good but could be enhanced');
  } else {
    recommendations.push('Content is well-optimized for AI citation');
  }
  
  return {
    overallStatus,
    score: Math.round(score),
    items: allItems,
    summary,
    recommendations,
  };
}

/**
 * Get critical issues only
 */
export function getCriticalIssues(checklist: PrePublicationChecklist): ChecklistItem[] {
  return checklist.items.filter(item => 
    item.status === 'fail' && item.priority === 'critical'
  );
}

/**
 * Get actionable items (failed or warning)
 */
export function getActionableItems(checklist: PrePublicationChecklist): ChecklistItem[] {
  return checklist.items.filter(item => 
    item.status === 'fail' || item.status === 'warning'
  );
}

/**
 * Format checklist as markdown
 */
export function formatChecklistAsMarkdown(checklist: PrePublicationChecklist): string {
  const lines: string[] = [];
  
  lines.push('# Pre-Publication Checklist');
  lines.push('');
  lines.push(`**Overall Status:** ${checklist.overallStatus.toUpperCase()}`);
  lines.push(`**Score:** ${checklist.score}/100`);
  lines.push('');
  lines.push(`- ✓ Passed: ${checklist.summary.passed}`);
  lines.push(`- ⚠ Warnings: ${checklist.summary.warnings}`);
  lines.push(`- ✗ Failed: ${checklist.summary.failed}`);
  lines.push('');
  
  if (checklist.recommendations.length > 0) {
    lines.push('## Recommendations');
    checklist.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });
    lines.push('');
  }
  
  // Group by category
  const categories = ['eeat', 'schema', 'citations', 'entities', 'structure'] as const;
  const categoryNames = {
    eeat: 'E-E-A-T Signals',
    schema: 'Schema Markup',
    citations: 'Citations',
    entities: 'Entities',
    structure: 'Structure',
  };
  
  categories.forEach(category => {
    const items = checklist.items.filter(item => item.category === category);
    if (items.length > 0) {
      lines.push(`## ${categoryNames[category]}`);
      items.forEach(item => {
        const icon = item.status === 'pass' ? '✓' : item.status === 'warning' ? '⚠' : '✗';
        lines.push(`${icon} **${item.title}**: ${item.description}`);
        if (item.action) {
          lines.push(`  - Action: ${item.action}`);
        }
      });
      lines.push('');
    }
  });
  
  return lines.join('\n');
}
