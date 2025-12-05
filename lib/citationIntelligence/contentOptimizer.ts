/**
 * Content Variation Generator
 * Generates citation-optimized content variations using LLM
 * 
 * This module implements:
 * 1. Prompt templates for content optimization
 * 2. Variation generation (exactly 3 variations per request)
 * 3. Predicted score calculation for each variation
 * 4. Improvement tracking (semantic density, entity count, claim strength)
 * 
 * @module lib/citationIntelligence/contentOptimizer
 */

import type {
  ContentVariation,
  OptimizationConstraints,
  KnowledgeGraph,
  ValidationResult,
} from '../../types/citation-intelligence.types';
import { createEnhancedOpenRouterClient } from './llm/enhancedClient';
import { citationPredictor } from './citationPredictor';
import { extractFeatures } from './featureExtractor';

// ============================================================================
// Types
// ============================================================================

interface GenerationResult {
  variations: string[];
  metadata: {
    model: string;
    processingTime: number;
  };
}

// ============================================================================
// Prompt Templates
// ============================================================================

/**
 * Create system prompt for content optimization
 */
function createSystemPrompt(constraints: OptimizationConstraints): string {
  const audienceMap = {
    technical: 'technical professionals with domain expertise',
    general: 'general audience with basic knowledge',
    expert: 'subject matter experts and researchers',
  };

  const audience = audienceMap[constraints.targetAudience];
  
  return `You are an expert content optimizer specializing in AI citation optimization (GEO - Generative Engine Optimization).

Your task is to optimize content to maximize the likelihood that AI systems (ChatGPT, Claude, Perplexity, etc.) will cite it as a source.

Key optimization principles:
1. **Semantic Density**: Increase information richness with technical terms, precise definitions, and structured data
2. **Entity Presence**: Add relevant entities (people, organizations, products, concepts) with proper context
3. **Claim Strength**: Make factual claims backed by evidence, data, or expert opinions
4. **Citation-Worthy Statements**: Create quotable, authoritative statements that AI systems can reference
5. **E-E-A-T Signals**: Maintain Experience, Expertise, Authoritativeness, and Trustworthiness

Constraints:
- Target audience: ${audience}
- Preserve factual accuracy: ${constraints.preserveFactualAccuracy ? 'YES - Do not change facts, numbers, dates, or quotes' : 'NO'}
- Maintain E-E-A-T: ${constraints.maintainEEAT ? 'YES - Keep author attribution, citations, credentials' : 'NO'}
- Maximum length increase: ${constraints.maxLengthIncrease}%

Generate content that is:
- More semantically dense and information-rich
- Better structured with clear headings and lists
- Enhanced with relevant entities and relationships
- Strengthened with evidence-backed claims
- Optimized for AI understanding and citation`;
}

/**
 * Create user prompt for content optimization
 */
function createUserPrompt(originalContent: string, knowledgeGraph: KnowledgeGraph): string {
  const entitySummary = knowledgeGraph.entities
    .slice(0, 10)
    .map(e => `${e.name} (${e.type})`)
    .join(', ');
  
  return `Original Content:
${originalContent}

Current Knowledge Graph Entities:
${entitySummary}

Generate exactly 3 optimized variations of this content. Each variation should:
1. Increase semantic density by adding technical terms and precise definitions
2. Add 3-5 new relevant entities with proper context
3. Strengthen claims with evidence or data points
4. Improve structure with headings, lists, or tables where appropriate
5. Add citation-worthy statements that AI systems can reference

Format your response as JSON with this exact structure:
{
  "variations": [
    {
      "content": "First optimized variation...",
      "changes": [
        {
          "type": "addition",
          "location": "paragraph 2",
          "description": "Added entity: Organization X with context"
        }
      ]
    },
    {
      "content": "Second optimized variation...",
      "changes": [...]
    },
    {
      "content": "Third optimized variation...",
      "changes": [...]
    }
  ]
}

Ensure each variation is distinct and explores different optimization strategies.`;
}

// ============================================================================
// Content Variation Generator
// ============================================================================

/**
 * Generate content variations using LLM
 */
async function generateVariationsWithLLM(
  originalContent: string,
  knowledgeGraph: KnowledgeGraph,
  constraints: OptimizationConstraints
): Promise<GenerationResult> {
  const client = createEnhancedOpenRouterClient();
  
  if (!client) {
    throw new Error('OpenRouter client not configured. Set VITE_OPENROUTER_API_KEY environment variable.');
  }
  
  const startTime = Date.now();
  
  try {
    // Create prompts
    const systemPrompt = createSystemPrompt(constraints);
    const userPrompt = createUserPrompt(originalContent, knowledgeGraph);
    
    // Call LLM
    const response = await client.chatWithModel(
      'anthropic/claude-sonnet-4.5', // Use content optimization model
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        taskType: 'content_opt',
        temperature: 0.7,
        maxTokens: 4000,
      }
    );
    
    // Parse JSON response
    const parsed = JSON.parse(response);
    
    if (!parsed.variations || !Array.isArray(parsed.variations)) {
      throw new Error('Invalid response format: missing variations array');
    }
    
    if (parsed.variations.length !== 3) {
      throw new Error(`Expected exactly 3 variations, got ${parsed.variations.length}`);
    }
    
    const variations = parsed.variations.map((v: any) => v.content);
    
    return {
      variations,
      metadata: {
        model: 'anthropic/claude-sonnet-4.5',
        processingTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    console.error('Error generating variations:', error);
    throw new Error(`Failed to generate content variations: ${error}`);
  }
}

/**
 * Calculate improvements for a variation
 */
function calculateImprovements(
  originalContent: string,
  optimizedContent: string,
  originalGraph: KnowledgeGraph,
  optimizedGraph: KnowledgeGraph
): {
  semanticDensity: number;
  entityCount: number;
  claimStrength: number;
} {
  // Extract features for both versions
  const originalFeatures = extractFeatures(originalContent, originalGraph, [], []);
  const optimizedFeatures = extractFeatures(optimizedContent, optimizedGraph, [], []);
  
  // Calculate percentage improvements
  const semanticDensityImprovement = 
    ((optimizedFeatures.semanticDensity - originalFeatures.semanticDensity) / 
    Math.max(originalFeatures.semanticDensity, 1)) * 100;
  
  const entityCountImprovement = 
    ((optimizedFeatures.entityCount - originalFeatures.entityCount) / 
    Math.max(originalFeatures.entityCount, 1)) * 100;
  
  const claimStrengthImprovement = 
    ((optimizedFeatures.claimCount - originalFeatures.claimCount) / 
    Math.max(originalFeatures.claimCount, 1)) * 100;
  
  return {
    semanticDensity: Math.round(semanticDensityImprovement * 100) / 100,
    entityCount: Math.round(entityCountImprovement * 100) / 100,
    claimStrength: Math.round(claimStrengthImprovement * 100) / 100,
  };
}



/**
 * Generate implementation guidance
 * Creates comprehensive guidance for implementing optimized content including:
 * - HTML markup with semantic structure
 * - JSON-LD schema with entity relationships
 * - Structural change recommendations
 */
function generateImplementationGuidance(
  optimizedContent: string,
  knowledgeGraph: KnowledgeGraph
): {
  html: string;
  schema: any;
  structural: string[];
} {
  // Generate HTML markup with semantic structure
  const html = generateHTMLMarkup(optimizedContent, knowledgeGraph);
  
  // Generate comprehensive JSON-LD schema
  const schema = generateJSONLDSchema(optimizedContent, knowledgeGraph);
  
  // Generate structural change recommendations
  const structural = generateStructuralRecommendations(optimizedContent, knowledgeGraph);
  
  return { html, schema, structural };
}

/**
 * Generate HTML markup with optimized content
 * Creates semantic HTML with proper structure, headings, and entity markup
 */
function generateHTMLMarkup(
  content: string,
  knowledgeGraph: KnowledgeGraph
): string {
  // Split content into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  
  // Detect headings (lines that are short and capitalized)
  const processedParagraphs = paragraphs.map(para => {
    const trimmed = para.trim();
    
    // Check if it's a heading (short, no punctuation at end, capitalized)
    const isHeading = 
      trimmed.length < 100 && 
      !trimmed.endsWith('.') && 
      !trimmed.endsWith('!') && 
      !trimmed.endsWith('?') &&
      /^[A-Z]/.test(trimmed);
    
    if (isHeading) {
      // Determine heading level based on length and content
      const level = trimmed.length < 50 ? 2 : 3;
      return `<h${level}>${escapeHtml(trimmed)}</h${level}>`;
    }
    
    // Check if it's a list (contains bullet points or numbers)
    if (/^[\-\*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split('\n').map(item => {
        const cleaned = item.replace(/^[\-\*•]\s/, '').replace(/^\d+\.\s/, '').trim();
        return `  <li>${escapeHtml(cleaned)}</li>`;
      });
      return `<ul>\n${items.join('\n')}\n</ul>`;
    }
    
    // Regular paragraph - add entity markup
    let markedUp = escapeHtml(trimmed);
    
    // Add span tags for entities
    for (const entity of knowledgeGraph.entities.slice(0, 20)) {
      const entityName = entity.name;
      const regex = new RegExp(`\\b${escapeRegex(entityName)}\\b`, 'gi');
      markedUp = markedUp.replace(
        regex,
        `<span class="entity" data-entity-type="${entity.type.toLowerCase()}" data-entity-id="${entity.id}">$&</span>`
      );
    }
    
    return `<p>${markedUp}</p>`;
  });
  
  // Build complete HTML structure
  const html = `<article class="optimized-content" itemscope itemtype="https://schema.org/Article">
  <header>
    <meta itemprop="datePublished" content="${new Date().toISOString()}" />
    <meta itemprop="dateModified" content="${new Date().toISOString()}" />
  </header>
  
  <div class="content-body" itemprop="articleBody">
    ${processedParagraphs.join('\n    ')}
  </div>
  
  <footer>
    <div class="entity-references">
      ${knowledgeGraph.entities.slice(0, 10).map(e => 
        `<span class="entity-ref" data-entity-id="${e.id}">${escapeHtml(e.name)}</span>`
      ).join(', ')}
    </div>
  </footer>
</article>`;
  
  return html;
}

/**
 * Generate comprehensive JSON-LD schema
 * Creates schema markup for entities, relationships, and claims
 */
function generateJSONLDSchema(
  content: string,
  knowledgeGraph: KnowledgeGraph
): any {
  // Extract first sentence or first 100 chars as headline
  const firstSentence = content.split(/[.!?]\s/)[0] || content.substring(0, 100);
  const headline = firstSentence.length > 110 ? firstSentence.substring(0, 107) + '...' : firstSentence;
  
  // Build entity mentions with full schema
  const mentions = knowledgeGraph.entities.slice(0, 15).map(entity => {
    const mention: any = {
      '@type': entity.type,
      name: entity.name,
      identifier: entity.id,
    };
    
    // Add type-specific properties
    if (entity.type === 'Person') {
      mention.description = `Expert mentioned in content`;
    } else if (entity.type === 'Organization') {
      mention.description = `Organization referenced in content`;
    } else if (entity.type === 'Product') {
      mention.description = `Product discussed in content`;
    }
    
    // Add properties from entity
    if (entity.properties) {
      Object.assign(mention, entity.properties);
    }
    
    return mention;
  });
  
  // Build relationship graph
  const relationshipGraph = knowledgeGraph.relationships.slice(0, 10).map(rel => {
    const source = knowledgeGraph.entities.find(e => e.id === rel.sourceId);
    const target = knowledgeGraph.entities.find(e => e.id === rel.targetId);
    
    if (!source || !target) return null;
    
    return {
      '@type': 'Relationship',
      subject: {
        '@type': source.type,
        name: source.name,
        identifier: source.id,
      },
      predicate: rel.type,
      object: {
        '@type': target.type,
        name: target.name,
        identifier: target.id,
      },
      confidence: rel.confidence,
    };
  }).filter(Boolean);
  
  // Build claims with evidence
  const claims = knowledgeGraph.claims.slice(0, 5).map(claim => ({
    '@type': 'Claim',
    text: claim.statement,
    claimReviewed: claim.statement,
    evidence: claim.evidence.map(ev => ({
      '@type': 'WebPage',
      url: ev.source,
      description: `${ev.type} evidence`,
    })),
  }));
  
  // Build main schema using @graph for complex relationships
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': '#article',
        headline: headline,
        articleBody: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        wordCount: content.split(/\s+/).length,
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        mentions: mentions,
        about: mentions.slice(0, 5),
        keywords: knowledgeGraph.entities.slice(0, 10).map(e => e.name).join(', '),
      },
      ...relationshipGraph,
      ...claims,
    ],
  };
  
  return schema;
}

/**
 * Generate structural change recommendations
 * Provides actionable guidance for implementing optimized content
 */
function generateStructuralRecommendations(
  content: string,
  knowledgeGraph: KnowledgeGraph
): string[] {
  const recommendations: string[] = [];
  
  // Analyze content structure
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  const wordCount = content.split(/\s+/).length;
  const hasHeadings = paragraphs.some(p => {
    const trimmed = p.trim();
    return trimmed.length < 100 && !trimmed.endsWith('.');
  });
  const hasLists = /^[\-\*•]\s/m.test(content) || /^\d+\.\s/m.test(content);
  
  // Heading recommendations
  if (!hasHeadings) {
    recommendations.push(
      'Add clear section headings (H2, H3) to break up content and improve scannability'
    );
  } else {
    recommendations.push(
      'Ensure heading hierarchy is logical (H2 for main sections, H3 for subsections)'
    );
  }
  
  // List recommendations
  if (!hasLists && wordCount > 200) {
    recommendations.push(
      'Convert key points into bullet lists or numbered lists for better readability'
    );
  }
  
  // Table of contents
  if (wordCount > 1000) {
    recommendations.push(
      'Add a table of contents at the beginning for easier navigation'
    );
  }
  
  // Schema markup recommendations
  if (knowledgeGraph.entities.length > 0) {
    recommendations.push(
      `Add JSON-LD schema markup for ${knowledgeGraph.entities.length} entities mentioned in content`
    );
  }
  
  if (knowledgeGraph.relationships.length > 0) {
    recommendations.push(
      `Include relationship schema for ${knowledgeGraph.relationships.length} entity connections using @graph structure`
    );
  }
  
  if (knowledgeGraph.claims.length > 0) {
    recommendations.push(
      `Add Claim schema with evidence for ${knowledgeGraph.claims.length} factual statements`
    );
  }
  
  // E-E-A-T recommendations
  recommendations.push(
    'Include author byline with credentials and expertise to establish authority'
  );
  
  recommendations.push(
    'Add publication and last modified dates to demonstrate content freshness'
  );
  
  recommendations.push(
    'Include citations and references for all factual claims to build trust'
  );
  
  // Entity-specific recommendations
  const personEntities = knowledgeGraph.entities.filter(e => e.type === 'Person');
  if (personEntities.length > 0) {
    recommendations.push(
      `Add Person schema for ${personEntities.length} expert(s) mentioned with credentials`
    );
  }
  
  const orgEntities = knowledgeGraph.entities.filter(e => e.type === 'Organization');
  if (orgEntities.length > 0) {
    recommendations.push(
      `Add Organization schema for ${orgEntities.length} organization(s) with official URLs`
    );
  }
  
  // Structural improvements
  if (paragraphs.length > 10) {
    recommendations.push(
      'Consider breaking long content into multiple pages or sections with clear navigation'
    );
  }
  
  recommendations.push(
    'Add internal links to related content to strengthen topical authority'
  );
  
  recommendations.push(
    'Include relevant images with descriptive alt text and ImageObject schema'
  );
  
  // Citation optimization
  recommendations.push(
    'Highlight key statistics and data points with visual emphasis (bold, callout boxes)'
  );
  
  recommendations.push(
    'Create quotable statements that AI systems can easily extract and cite'
  );
  
  return recommendations;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Escape special regex characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Content Optimizer Class
// ============================================================================

/**
 * ContentOptimizer
 * Generates citation-optimized content variations
 */
export class ContentOptimizer {
  private isInitialized = false;
  
  /**
   * Initialize the content optimizer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Initialize citation predictor (needed for scoring)
    await citationPredictor.initialize();
    
    this.isInitialized = true;
  }

  /**
   * Generate optimized content variations
   * 
   * @param originalContent - Original content to optimize
   * @param knowledgeGraph - Knowledge graph extracted from content
   * @param _targetScore - Target citation probability score (optional, reserved for future use)
   * @param constraints - Optimization constraints
   * @returns Array of exactly 3 content variations
   */
  async generateVariations(
    originalContent: string,
    knowledgeGraph: KnowledgeGraph,
    _targetScore?: number,
    constraints: OptimizationConstraints = {
      preserveFactualAccuracy: true,
      maintainEEAT: true,
      maxLengthIncrease: 30,
      targetAudience: 'general',
    }
  ): Promise<ContentVariation[]> {
    if (!this.isInitialized) {
      throw new Error('Content optimizer not initialized. Call initialize() first.');
    }
    
    // Generate variations using LLM
    const generationResult = await generateVariationsWithLLM(
      originalContent,
      knowledgeGraph,
      constraints
    );
    
    // Process each variation
    const variations: ContentVariation[] = [];
    
    for (let i = 0; i < generationResult.variations.length; i++) {
      const variationContent = generationResult.variations[i];
      
      // For simplicity, we'll use the same knowledge graph
      // In a real implementation, we'd re-extract entities from the optimized content
      const optimizedGraph = knowledgeGraph;
      
      // Calculate predicted score for this variation
      const predictedResult = citationPredictor.calculateProbability(
        variationContent,
        optimizedGraph,
        []
      );
      
      // Calculate improvements
      const improvements = calculateImprovements(
        originalContent,
        variationContent,
        knowledgeGraph,
        optimizedGraph
      );
      
      // Parse changes (simplified - in real implementation would come from LLM response)
      const changes = [
        {
          type: 'addition' as const,
          location: 'throughout',
          description: `Enhanced semantic density by ${improvements.semanticDensity.toFixed(1)}%`,
        },
        {
          type: 'addition' as const,
          location: 'throughout',
          description: `Added ${improvements.entityCount.toFixed(0)}% more entities`,
        },
        {
          type: 'modification' as const,
          location: 'claims',
          description: `Strengthened claims by ${improvements.claimStrength.toFixed(1)}%`,
        },
      ];
      
      // Generate implementation guidance
      const implementation = generateImplementationGuidance(
        variationContent,
        optimizedGraph
      );
      
      variations.push({
        id: `variation-${i + 1}`,
        content: variationContent,
        predictedScore: predictedResult.score,
        improvements,
        changes,
        implementation,
      });
    }
    
    // Ensure we have exactly 3 variations
    if (variations.length !== 3) {
      throw new Error(`Expected exactly 3 variations, generated ${variations.length}`);
    }
    
    // Sort by predicted score (highest first)
    variations.sort((a, b) => b.predictedScore - a.predictedScore);
    
    return variations;
  }
  
  /**
   * Enhance semantic density of content
   * 
   * @param content - Content to enhance
   * @returns Enhanced content
   */
  async enhanceSemanticDensity(content: string): Promise<string> {
    const client = createEnhancedOpenRouterClient();
    
    if (!client) {
      throw new Error('OpenRouter client not configured');
    }
    
    const response = await client.chatWithModel(
      'anthropic/claude-sonnet-4.5',
      [
        {
          role: 'system',
          content: 'You are an expert at increasing semantic density in content. Add technical terms, precise definitions, and structured information while maintaining readability.',
        },
        {
          role: 'user',
          content: `Enhance the semantic density of this content:\n\n${content}`,
        },
      ],
      {
        taskType: 'content_opt',
        temperature: 0.5,
        maxTokens: 2000,
      }
    );
    
    return response;
  }
  
  /**
   * Add entity relationships to content
   * 
   * @param content - Content to enhance
   * @param graph - Knowledge graph
   * @returns Enhanced content
   */
  async addEntityRelationships(
    content: string,
    graph: KnowledgeGraph
  ): Promise<string> {
    const client = createEnhancedOpenRouterClient();
    
    if (!client) {
      throw new Error('OpenRouter client not configured');
    }
    
    const entityList = graph.entities
      .slice(0, 10)
      .map(e => `${e.name} (${e.type})`)
      .join(', ');
    
    const response = await client.chatWithModel(
      'anthropic/claude-sonnet-4.5',
      [
        {
          role: 'system',
          content: 'You are an expert at enriching content with entity relationships. Add relevant entities and explain their relationships naturally.',
        },
        {
          role: 'user',
          content: `Add entity relationships to this content. Current entities: ${entityList}\n\nContent:\n${content}`,
        },
      ],
      {
        taskType: 'content_opt',
        temperature: 0.6,
        maxTokens: 2000,
      }
    );
    
    return response;
  }
  
  /**
   * Strengthen claims in content
   * 
   * @param content - Content to enhance
   * @returns Enhanced content
   */
  async strengthenClaims(content: string): Promise<string> {
    const client = createEnhancedOpenRouterClient();
    
    if (!client) {
      throw new Error('OpenRouter client not configured');
    }
    
    const response = await client.chatWithModel(
      'anthropic/claude-sonnet-4.5',
      [
        {
          role: 'system',
          content: 'You are an expert at strengthening factual claims. Add evidence, data points, and expert opinions to support claims while maintaining accuracy.',
        },
        {
          role: 'user',
          content: `Strengthen the claims in this content with evidence:\n\n${content}`,
        },
      ],
      {
        taskType: 'content_opt',
        temperature: 0.5,
        maxTokens: 2000,
      }
    );
    
    return response;
  }
  
  /**
   * Validate factual accuracy between original and optimized content
   * 
   * @param original - Original content
   * @param optimized - Optimized content
   * @returns Validation result with discrepancies
   */
  validateFactualAccuracy(
    original: string,
    optimized: string
  ): ValidationResult {
    // Extract facts from both versions
    const originalFacts = extractFacts(original);
    const optimizedFacts = extractFacts(optimized);
    
    // Compare facts and identify discrepancies
    const discrepancies = compareFacts(originalFacts, optimizedFacts);
    
    // Calculate factual accuracy score (1.0 = perfect, 0.0 = completely different)
    const factualAccuracyScore = calculateFactualAccuracyScore(
      originalFacts,
      optimizedFacts,
      discrepancies
    );
    
    // Check E-E-A-T signals
    const eeAtSignals = checkEEATSignals(original, optimized);
    
    return {
      isValid: discrepancies.filter(d => d.severity === 'critical').length === 0,
      factualAccuracyScore,
      discrepancies,
      eeAtSignals,
    };
  }
  
  /**
   * Validate E-E-A-T signals in content variation
   * Ensures Experience, Expertise, Authoritativeness, and Trustworthiness signals are preserved
   * 
   * @param original - Original content
   * @param variation - Optimized content variation
   * @returns Detailed E-E-A-T validation result
   */
  validateEEAT(
    original: string,
    variation: string
  ): ReturnType<typeof validateEEATSignals> {
    return validateEEATSignals(original, variation);
  }
}

// ============================================================================
// Factual Accuracy Validation Helpers
// ============================================================================

/**
 * Extracted facts from content
 */
interface ExtractedFacts {
  entities: string[];
  numbers: string[];
  dates: string[];
  quotes: string[];
}

/**
 * Extract facts from content
 */
function extractFacts(content: string): ExtractedFacts {
  return {
    entities: extractEntities(content),
    numbers: extractNumbers(content),
    dates: extractDates(content),
    quotes: extractQuotes(content),
  };
}

/**
 * Extract entities from content (simplified entity extraction)
 * In a real implementation, this would use NER (Named Entity Recognition)
 */
function extractEntities(content: string): string[] {
  const entities: string[] = [];
  
  // Extract capitalized phrases (potential proper nouns)
  // Match sequences of capitalized words
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = content.match(capitalizedPattern) || [];
  
  // Filter out common words and deduplicate
  const commonWords = new Set(['The', 'A', 'An', 'This', 'That', 'These', 'Those', 'When', 'Where', 'Why', 'How', 'What', 'Which', 'Who']);
  const filtered = matches.filter(m => !commonWords.has(m));
  
  // Deduplicate
  const unique = [...new Set(filtered)];
  
  entities.push(...unique);
  
  return entities;
}

/**
 * Extract numbers from content
 */
function extractNumbers(content: string): string[] {
  const numbers: string[] = [];
  
  // Match various number formats:
  // - Integers: 123, 1,234
  // - Decimals: 12.34, 1,234.56
  // - Percentages: 12%, 12.5%
  // - Currency: $123, $1,234.56
  // - Ranges: 10-20, 10 to 20
  const patterns = [
    /\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?/g, // Numbers with commas, decimals, currency, percentages
    /\d+(?:\.\d+)?%/g, // Percentages
    /\d+\s*(?:to|-)\s*\d+/g, // Ranges
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern) || [];
    numbers.push(...matches);
  }
  
  // Deduplicate
  return [...new Set(numbers)];
}

/**
 * Extract dates from content
 */
function extractDates(content: string): string[] {
  const dates: string[] = [];
  
  // Match various date formats:
  // - Month Day, Year: January 1, 2024
  // - MM/DD/YYYY: 01/01/2024
  // - YYYY-MM-DD: 2024-01-01
  // - Month Year: January 2024
  // - Year only: 2024
  const patterns = [
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    /\b(?:19|20)\d{2}\b/g, // Years 1900-2099
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern) || [];
    dates.push(...matches);
  }
  
  // Deduplicate
  return [...new Set(dates)];
}

/**
 * Extract quotes from content
 */
function extractQuotes(content: string): string[] {
  const quotes: string[] = [];
  
  // Match text within quotation marks
  // Support both double quotes and single quotes
  const patterns = [
    /"([^"]*)"/g, // Double quotes
    /'([^']*)'/g, // Single quotes
    /[""]([^""]*)[""]/g, // Smart quotes
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        quotes.push(match[1].trim());
      }
    }
  }
  
  // Deduplicate
  return [...new Set(quotes)];
}

/**
 * Compare facts between original and optimized content
 */
function compareFacts(
  originalFacts: ExtractedFacts,
  optimizedFacts: ExtractedFacts
): ValidationResult['discrepancies'] {
  const discrepancies: ValidationResult['discrepancies'] = [];
  
  // Check for removed entities
  for (const entity of originalFacts.entities) {
    if (!optimizedFacts.entities.includes(entity)) {
      // Check if it's a partial match (entity might be rephrased)
      const partialMatch = optimizedFacts.entities.some(e => 
        e.includes(entity) || entity.includes(e)
      );
      
      if (!partialMatch) {
        discrepancies.push({
          type: 'entity',
          original: entity,
          optimized: '(removed)',
          severity: 'warning',
        });
      }
    }
  }
  
  // Check for removed numbers
  for (const number of originalFacts.numbers) {
    if (!optimizedFacts.numbers.includes(number)) {
      discrepancies.push({
        type: 'number',
        original: number,
        optimized: '(removed)',
        severity: 'critical',
      });
    }
  }
  
  // Check for removed dates
  for (const date of originalFacts.dates) {
    if (!optimizedFacts.dates.includes(date)) {
      discrepancies.push({
        type: 'date',
        original: date,
        optimized: '(removed)',
        severity: 'critical',
      });
    }
  }
  
  // Check for removed quotes
  for (const quote of originalFacts.quotes) {
    if (!optimizedFacts.quotes.includes(quote)) {
      // Check for partial match (quote might be slightly modified)
      const partialMatch = optimizedFacts.quotes.some(q => 
        q.includes(quote.substring(0, Math.min(20, quote.length))) ||
        quote.includes(q.substring(0, Math.min(20, q.length)))
      );
      
      if (!partialMatch) {
        discrepancies.push({
          type: 'quote',
          original: quote.substring(0, 50) + (quote.length > 50 ? '...' : ''),
          optimized: '(removed)',
          severity: 'critical',
        });
      }
    }
  }
  
  return discrepancies;
}

/**
 * Calculate factual accuracy score
 */
function calculateFactualAccuracyScore(
  originalFacts: ExtractedFacts,
  _optimizedFacts: ExtractedFacts,
  discrepancies: ValidationResult['discrepancies']
): number {
  // Count total facts in original
  const totalOriginalFacts = 
    originalFacts.entities.length +
    originalFacts.numbers.length +
    originalFacts.dates.length +
    originalFacts.quotes.length;
  
  if (totalOriginalFacts === 0) {
    return 1.0; // No facts to preserve
  }
  
  // Count critical discrepancies (numbers, dates, quotes)
  const criticalDiscrepancies = discrepancies.filter(
    d => d.severity === 'critical'
  ).length;
  
  // Count warning discrepancies (entities)
  const warningDiscrepancies = discrepancies.filter(
    d => d.severity === 'warning'
  ).length;
  
  // Calculate score (critical discrepancies weigh more)
  const score = 1.0 - (
    (criticalDiscrepancies * 0.2 + warningDiscrepancies * 0.05) / totalOriginalFacts
  );
  
  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * E-E-A-T Signal Details
 * Detailed information about detected E-E-A-T signals
 */
interface EEATSignalDetails {
  authorAttribution: {
    present: boolean;
    authors: string[];
    locations: number[];
  };
  citations: {
    present: boolean;
    count: number;
    types: ('numeric' | 'parenthetical' | 'inline')[];
    examples: string[];
  };
  credentials: {
    present: boolean;
    credentials: string[];
    associatedAuthors: string[];
  };
  publicationDate: {
    present: boolean;
    dates: string[];
    types: ('published' | 'updated' | 'modified')[];
  };
}

/**
 * Extract author attributions from content
 */
function extractAuthorAttributions(content: string): string[] {
  const authors: string[] = [];
  
  // Pattern 1: "by Dr./Professor/etc. Name" (with credentials)
  const pattern1 = /(?:by|author|written by|published by|authored by)\s+(?:Dr\.|Professor|Prof\.)\s+([A-Z][a-z']+(?:\s+[A-Z][a-z']+)*)/gi;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      authors.push(match[1].trim());
    }
  }
  
  // Pattern 2: "by Name Name" (at least two capitalized words, supports apostrophes)
  const pattern2 = /(?:by|author|written by|published by|authored by)\s+([A-Z][a-z']+\s+[A-Z][a-z']+(?:\s+[A-Z][a-z']+)*)/gi;
  while ((match = pattern2.exec(content)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      const author = match[1].trim();
      // Only add if not already added
      if (!authors.includes(author)) {
        authors.push(author);
      }
    }
  }
  
  return [...new Set(authors)];
}

/**
 * Extract citations from content
 */
function extractCitations(content: string): {
  count: number;
  types: ('numeric' | 'parenthetical' | 'inline')[];
  examples: string[];
} {
  const citations: string[] = [];
  const types = new Set<'numeric' | 'parenthetical' | 'inline'>();
  
  // Numeric citations: [1], [2,3], [1-5]
  const numericPattern = /\[[\d,\s\-]+\]/g;
  let match;
  while ((match = numericPattern.exec(content)) !== null) {
    citations.push(match[0]);
    types.add('numeric');
  }
  
  // Parenthetical citations: (Smith, 2024), (Jones et al., 2023)
  const parentheticalPattern = /\([A-Z][a-z]+(?:\s+et al\.)?,?\s+\d{4}\)/g;
  while ((match = parentheticalPattern.exec(content)) !== null) {
    citations.push(match[0]);
    types.add('parenthetical');
  }
  
  // Inline citations: according to, source:, reference:
  const inlinePattern = /(?:according to|source:|reference:|cited in|as reported by)\s+[^.!?]+/gi;
  while ((match = inlinePattern.exec(content)) !== null) {
    citations.push(match[0].substring(0, 50));
    types.add('inline');
  }
  
  return {
    count: citations.length,
    types: Array.from(types),
    examples: citations.slice(0, 5), // First 5 examples
  };
}

/**
 * Extract credentials from content
 */
function extractCredentials(content: string): {
  credentials: string[];
  associatedAuthors: string[];
} {
  const credentials: string[] = [];
  const associatedAuthors: string[] = [];
  
  // Pattern for credentials with optional associated names
  const patterns = [
    /(?:Dr\.|PhD|MD|Professor|Expert|Certified|Licensed|MBA|MSc|BSc)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s+(?:PhD|MD|Professor|Expert|Certified|Licensed|MBA|MSc|BSc)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const fullMatch = match[0];
      credentials.push(fullMatch.trim());
      
      // Extract associated author name if present
      if (match[1] && match[1].trim().length > 0) {
        associatedAuthors.push(match[1].trim());
      }
    }
  }
  
  return {
    credentials: [...new Set(credentials)],
    associatedAuthors: [...new Set(associatedAuthors)],
  };
}

/**
 * Extract publication dates from content
 */
function extractPublicationDates(content: string): {
  dates: string[];
  types: ('published' | 'updated' | 'modified')[];
} {
  const dates: string[] = [];
  const types = new Set<'published' | 'updated' | 'modified'>();
  
  // Pattern for publication dates
  const patterns = [
    {
      regex: /(?:published)(?:\s+on)?:?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/gi,
      type: 'published' as const,
    },
    {
      regex: /(?:updated)(?:\s+on)?:?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/gi,
      type: 'updated' as const,
    },
    {
      regex: /(?:last modified)(?:\s+on)?:?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/gi,
      type: 'modified' as const,
    },
  ];
  
  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        dates.push(match[1].trim());
        types.add(type);
      }
    }
  }
  
  return {
    dates: [...new Set(dates)],
    types: Array.from(types),
  };
}

/**
 * Analyze E-E-A-T signals in content with detailed information
 */
function analyzeEEATSignals(content: string): EEATSignalDetails {
  const authors = extractAuthorAttributions(content);
  const citations = extractCitations(content);
  const credentials = extractCredentials(content);
  const publicationDates = extractPublicationDates(content);
  
  return {
    authorAttribution: {
      present: authors.length > 0,
      authors,
      locations: [], // Could be enhanced to track positions
    },
    citations: {
      present: citations.count > 0,
      count: citations.count,
      types: citations.types,
      examples: citations.examples,
    },
    credentials: {
      present: credentials.credentials.length > 0,
      credentials: credentials.credentials,
      associatedAuthors: credentials.associatedAuthors,
    },
    publicationDate: {
      present: publicationDates.dates.length > 0,
      dates: publicationDates.dates,
      types: publicationDates.types,
    },
  };
}

/**
 * Check E-E-A-T signals in content
 * Compares original and optimized content to ensure E-E-A-T signals are preserved
 */
function checkEEATSignals(
  original: string,
  optimized: string
): ValidationResult['eeAtSignals'] {
  const originalSignals = analyzeEEATSignals(original);
  const optimizedSignals = analyzeEEATSignals(optimized);
  
  const present: string[] = [];
  const missing: string[] = [];
  
  // Check author attribution
  if (originalSignals.authorAttribution.present && optimizedSignals.authorAttribution.present) {
    present.push('authorAttribution');
  } else if (originalSignals.authorAttribution.present && !optimizedSignals.authorAttribution.present) {
    missing.push('authorAttribution');
  }
  
  // Check citations
  if (originalSignals.citations.present && optimizedSignals.citations.present) {
    present.push('citations');
  } else if (originalSignals.citations.present && !optimizedSignals.citations.present) {
    missing.push('citations');
  }
  
  // Check credentials
  if (originalSignals.credentials.present && optimizedSignals.credentials.present) {
    present.push('credentials');
  } else if (originalSignals.credentials.present && !optimizedSignals.credentials.present) {
    missing.push('credentials');
  }
  
  // Check publication date
  if (originalSignals.publicationDate.present && optimizedSignals.publicationDate.present) {
    present.push('publicationDate');
  } else if (originalSignals.publicationDate.present && !optimizedSignals.publicationDate.present) {
    missing.push('publicationDate');
  }
  
  return { present, missing };
}

/**
 * Validate E-E-A-T signals in content variation
 * Comprehensive validation of Experience, Expertise, Authoritativeness, and Trustworthiness signals
 * 
 * @param original - Original content
 * @param variation - Optimized content variation
 * @returns Detailed validation result with specific E-E-A-T signal analysis
 */
export function validateEEATSignals(
  original: string,
  variation: string
): {
  isValid: boolean;
  score: number; // 0-100
  originalSignals: EEATSignalDetails;
  variationSignals: EEATSignalDetails;
  preserved: string[];
  missing: string[];
  recommendations: string[];
} {
  const originalSignals = analyzeEEATSignals(original);
  const variationSignals = analyzeEEATSignals(variation);
  
  const preserved: string[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];
  
  // Check author attribution preservation
  if (originalSignals.authorAttribution.present) {
    if (variationSignals.authorAttribution.present) {
      // Verify same authors are present
      const variationAuthors = new Set(variationSignals.authorAttribution.authors);
      
      const allPreserved = originalSignals.authorAttribution.authors.every(
        author => variationAuthors.has(author)
      );
      
      if (allPreserved) {
        preserved.push('authorAttribution');
      } else {
        missing.push('authorAttribution');
        recommendations.push(
          `Restore missing author attributions: ${
            originalSignals.authorAttribution.authors
              .filter(a => !variationAuthors.has(a))
              .join(', ')
          }`
        );
      }
    } else {
      missing.push('authorAttribution');
      recommendations.push(
        `Add author attribution: ${originalSignals.authorAttribution.authors.join(', ')}`
      );
    }
  }
  
  // Check citation preservation
  if (originalSignals.citations.present) {
    if (variationSignals.citations.present) {
      // Check if citation count is maintained or increased
      if (variationSignals.citations.count >= originalSignals.citations.count) {
        preserved.push('citations');
      } else {
        missing.push('citations');
        recommendations.push(
          `Restore ${originalSignals.citations.count - variationSignals.citations.count} missing citation(s)`
        );
      }
    } else {
      missing.push('citations');
      recommendations.push(
        `Add ${originalSignals.citations.count} citation(s) from original content`
      );
    }
  }
  
  // Check credential preservation
  if (originalSignals.credentials.present) {
    if (variationSignals.credentials.present) {
      // Verify credentials are preserved
      const variationCreds = new Set(variationSignals.credentials.credentials);
      
      const allPreserved = originalSignals.credentials.credentials.every(
        cred => variationCreds.has(cred)
      );
      
      if (allPreserved) {
        preserved.push('credentials');
      } else {
        missing.push('credentials');
        recommendations.push(
          `Restore missing credentials: ${
            originalSignals.credentials.credentials
              .filter(c => !variationCreds.has(c))
              .join(', ')
          }`
        );
      }
    } else {
      missing.push('credentials');
      recommendations.push(
        `Add credentials: ${originalSignals.credentials.credentials.join(', ')}`
      );
    }
  }
  
  // Check publication date preservation
  if (originalSignals.publicationDate.present) {
    if (variationSignals.publicationDate.present) {
      // Verify dates are preserved
      const variationDates = new Set(variationSignals.publicationDate.dates);
      
      const allPreserved = originalSignals.publicationDate.dates.every(
        date => variationDates.has(date)
      );
      
      if (allPreserved) {
        preserved.push('publicationDate');
      } else {
        missing.push('publicationDate');
        recommendations.push(
          `Restore missing publication dates: ${
            originalSignals.publicationDate.dates
              .filter(d => !variationDates.has(d))
              .join(', ')
          }`
        );
      }
    } else {
      missing.push('publicationDate');
      recommendations.push(
        `Add publication dates: ${originalSignals.publicationDate.dates.join(', ')}`
      );
    }
  }
  
  // Calculate E-E-A-T score
  // Count how many signals were present in the original
  const originalSignalCount = [
    originalSignals.authorAttribution.present,
    originalSignals.citations.present,
    originalSignals.credentials.present,
    originalSignals.publicationDate.present,
  ].filter(Boolean).length;
  
  // If no signals in original, score is 100 (nothing to preserve)
  const score = originalSignalCount === 0 
    ? 100 
    : (preserved.length / originalSignalCount) * 100;
  
  // Content is valid if all critical signals are preserved
  const isValid = missing.length === 0;
  
  return {
    isValid,
    score,
    originalSignals,
    variationSignals,
    preserved,
    missing,
    recommendations,
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const contentOptimizer = new ContentOptimizer();
