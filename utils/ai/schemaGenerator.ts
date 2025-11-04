/**
 * AI-Powered Schema Generator
 * Automatic Schema.org markup generation using GEO Marketolog AI Agent
 * November 2025 - Production Ready
 */

import { createOpenRouterClient, type ChatMessage } from './openrouter';

// ==================== TYPES ====================

export interface SchemaGenerationRequest {
  url: string;
  contentType: 'article' | 'product' | 'service' | 'organization' | 'person' | 'faq' | 'howto' | 'event';
  pageContent: {
    title?: string;
    description?: string;
    author?: string;
    publishDate?: string;
    modifiedDate?: string;
    mainContent?: string;
    images?: string[];
  };
  businessInfo?: {
    name?: string;
    type?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export interface GeneratedSchema {
  schemaType: string;
  jsonLd: string; // Complete JSON-LD markup ready to insert
  htmlSnippet: string; // HTML script tag with schema
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  aiInsights: string[];
  estimatedImpact: {
    geoScoreIncrease: number;
    citationProbabilityIncrease: number;
    visibilityImprovement: string;
  };
}

export interface SchemaRecommendation {
  schemaType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  implementation: string;
  estimatedTime: string;
  codeExample: string;
}

// ==================== SCHEMA GENERATOR ====================

export class AISchemaGenerator {
  private client: ReturnType<typeof createOpenRouterClient>;

  constructor() {
    this.client = createOpenRouterClient();
  }

  /**
   * Generate Schema.org markup using AI
   */
  async generateSchema(request: SchemaGenerationRequest): Promise<GeneratedSchema> {
    if (!this.client) {
      throw new Error('OpenRouter API not configured. Add VITE_OPENROUTER_API_KEY to environment');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.client.chat(messages, {
        temperature: 0.3, // Lower temperature for structured output
        max_tokens: 3000,
      });

      const parsed = this.parseAIResponse(response);
      const validated = this.validateSchema(parsed.jsonLd);

      return {
        ...parsed,
        validation: validated,
      };
    } catch (error) {
      console.error('Schema generation failed:', error);
      throw new Error('Failed to generate schema. Please try again.');
    }
  }

  /**
   * Analyze existing schemas and recommend improvements
   */
  async analyzeExistingSchemas(existingSchemas: string[]): Promise<SchemaRecommendation[]> {
    if (!this.client) {
      return this.getFallbackRecommendations();
    }

    const systemPrompt = `You are a Schema.org expert specializing in GEO optimization.
Analyze existing schemas and recommend improvements for maximum AI visibility.

RESPONSE FORMAT (JSON only):
{
  "recommendations": [
    {
      "schemaType": "Type name",
      "priority": "critical|high|medium|low",
      "reason": "Why this is important for AI systems",
      "implementation": "Step-by-step guide",
      "estimatedTime": "X minutes/hours",
      "codeExample": "JSON-LD code"
    }
  ]
}`;

    const userPrompt = `Analyze these existing schemas and recommend improvements:

${existingSchemas.length > 0 ? existingSchemas.map((s, i) => `Schema ${i + 1}:\n${s}`).join('\n\n') : 'No existing schemas found'}

Recommend:
1. Missing critical schema types for GEO
2. Improvements to existing schemas
3. Advanced features (@graph, knowledge connections)
4. AI-specific enhancements

Return ONLY valid JSON, no markdown.`;

    try {
      const response = await this.client.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        temperature: 0.4,
        max_tokens: 2500,
      });

      const parsed = this.parseRecommendations(response);
      return parsed;
    } catch (error) {
      console.error('Schema analysis failed:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Generate complete schema package for website
   */
  async generateSchemaPackage(websiteData: {
    url: string;
    businessInfo: SchemaGenerationRequest['businessInfo'];
    pages: Array<{ type: SchemaGenerationRequest['contentType']; content: SchemaGenerationRequest['pageContent'] }>;
  }): Promise<{
    organization: GeneratedSchema;
    website: GeneratedSchema;
    pages: GeneratedSchema[];
    breadcrumbs: GeneratedSchema;
  }> {
    const results: any = {};

    // Generate Organization schema
    results.organization = await this.generateSchema({
      url: websiteData.url,
      contentType: 'organization',
      pageContent: {},
      businessInfo: websiteData.businessInfo,
    });

    // Generate WebSite schema
    results.website = await this.generateWebSiteSchema(websiteData.url, websiteData.businessInfo?.name || '');

    // Generate page-specific schemas
    results.pages = [];
    for (const page of websiteData.pages.slice(0, 3)) { // Limit to 3 to avoid rate limits
      const schema = await this.generateSchema({
        url: websiteData.url,
        contentType: page.type,
        pageContent: page.content,
        businessInfo: websiteData.businessInfo,
      });
      results.pages.push(schema);
    }

    // Generate BreadcrumbList
    results.breadcrumbs = this.generateBreadcrumbSchema(websiteData.url);

    return results;
  }

  // ==================== PRIVATE METHODS ====================

  private buildSystemPrompt(): string {
    return `You are an elite Schema.org architect specializing in GEO optimization.

EXPERTISE:
- Schema.org ontology (all types and properties)
- JSON-LD formatting and @graph structures
- AI system requirements (ChatGPT, Claude, Gemini, Perplexity)
- Knowledge graph connections (sameAs, relatedTo, about)
- E-E-A-T signals in structured data

TASK:
Generate complete, valid Schema.org JSON-LD markup optimized for AI citation.

REQUIREMENTS:
1. Use correct Schema.org types and properties
2. Include AI-optimized properties (knowsAbout, expertise, hasCredential, isAccessibleForFree)
3. Add knowledge graph connections where possible
4. Use @graph structure for multiple entities
5. Include all relevant properties, no minimal versions

OUTPUT FORMAT (JSON):
{
  "schemaType": "PrimaryType",
  "jsonLd": "Complete JSON-LD string ready to use",
  "htmlSnippet": "<script type=\\"application/ld+json\\">...</script>",
  "aiInsights": ["Insight 1", "Insight 2"],
  "estimatedImpact": {
    "geoScoreIncrease": 10,
    "citationProbabilityIncrease": 25,
    "visibilityImprovement": "High"
  }
}

CRITICAL: Return ONLY valid JSON, no markdown, no explanations.`;
  }

  private buildUserPrompt(request: SchemaGenerationRequest): string {
    return `Generate Schema.org markup for this website:

URL: ${request.url}
Content Type: ${request.contentType}

${request.pageContent.title ? `Title: ${request.pageContent.title}` : ''}
${request.pageContent.description ? `Description: ${request.pageContent.description}` : ''}
${request.pageContent.author ? `Author: ${request.pageContent.author}` : ''}
${request.pageContent.publishDate ? `Published: ${request.pageContent.publishDate}` : ''}
${request.pageContent.modifiedDate ? `Modified: ${request.pageContent.modifiedDate}` : ''}
${request.pageContent.mainContent ? `Content Preview: ${request.pageContent.mainContent.substring(0, 500)}...` : ''}

${request.businessInfo ? `
Business Information:
- Name: ${request.businessInfo.name || 'Not provided'}
- Type: ${request.businessInfo.type || 'Not specified'}
- Address: ${request.businessInfo.address || 'Not provided'}
- Phone: ${request.businessInfo.phone || 'Not provided'}
- Email: ${request.businessInfo.email || 'Not provided'}
` : ''}

Generate comprehensive ${request.contentType} schema with:
1. All standard properties for this type
2. AI-optimized properties (knowsAbout, expertise, etc.)
3. Knowledge graph connections (sameAs, about)
4. E-E-A-T signals where applicable
5. Structured for maximum AI citation probability

Return ONLY valid JSON matching the output format.`;
  }

  private parseAIResponse(response: string): Omit<GeneratedSchema, 'validation'> {
    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      return {
        schemaType: parsed.schemaType || 'Unknown',
        jsonLd: parsed.jsonLd || '{}',
        htmlSnippet: parsed.htmlSnippet || `<script type="application/ld+json">${parsed.jsonLd}</script>`,
        aiInsights: parsed.aiInsights || [],
        estimatedImpact: parsed.estimatedImpact || {
          geoScoreIncrease: 0,
          citationProbabilityIncrease: 0,
          visibilityImprovement: 'Unknown',
        },
      };
    } catch (error) {
      console.error('Failed to parse AI schema response:', error);
      throw new Error('Invalid schema generated');
    }
  }

  private parseRecommendations(response: string): SchemaRecommendation[] {
    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);
      return parsed.recommendations || [];
    } catch (error) {
      console.error('Failed to parse recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  private validateSchema(jsonLd: string): GeneratedSchema['validation'] {
    const validation: GeneratedSchema['validation'] = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const schema = JSON.parse(jsonLd);

      // Check required @context
      if (!schema['@context']) {
        validation.errors.push('Missing @context property');
        validation.isValid = false;
      }

      // Check @type
      if (!schema['@type']) {
        validation.errors.push('Missing @type property');
        validation.isValid = false;
      }

      // Warnings for optional but recommended properties
      if (!schema.name && !schema['@graph']) {
        validation.warnings.push('Consider adding "name" property for better identification');
      }

      if (!schema.description && !schema['@graph']) {
        validation.warnings.push('Consider adding "description" for context');
      }

    } catch (error) {
      validation.errors.push('Invalid JSON structure');
      validation.isValid = false;
    }

    return validation;
  }

  private async generateWebSiteSchema(url: string, name: string): Promise<GeneratedSchema> {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'url': url,
      'name': name || 'Website',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${url}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    const jsonLdString = JSON.stringify(jsonLd, null, 2);

    return {
      schemaType: 'WebSite',
      jsonLd: jsonLdString,
      htmlSnippet: `<script type="application/ld+json">\n${jsonLdString}\n</script>`,
      validation: this.validateSchema(jsonLdString),
      aiInsights: ['WebSite schema enables search box in AI systems', 'SearchAction improves site discoverability'],
      estimatedImpact: {
        geoScoreIncrease: 5,
        citationProbabilityIncrease: 10,
        visibilityImprovement: 'Medium',
      },
    };
  }

  private generateBreadcrumbSchema(url: string): GeneratedSchema {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': url,
        },
      ],
    };

    const jsonLdString = JSON.stringify(jsonLd, null, 2);

    return {
      schemaType: 'BreadcrumbList',
      jsonLd: jsonLdString,
      htmlSnippet: `<script type="application/ld+json">\n${jsonLdString}\n</script>`,
      validation: this.validateSchema(jsonLdString),
      aiInsights: ['BreadcrumbList helps AI understand site structure', 'Improves navigation context for crawlers'],
      estimatedImpact: {
        geoScoreIncrease: 3,
        citationProbabilityIncrease: 5,
        visibilityImprovement: 'Low-Medium',
      },
    };
  }

  private getFallbackRecommendations(): SchemaRecommendation[] {
    return [
      {
        schemaType: 'Organization',
        priority: 'critical',
        reason: 'Organization schema is fundamental for brand identity in AI systems',
        implementation: 'Add Organization schema to home page with name, logo, social profiles',
        estimatedTime: '30 minutes',
        codeExample: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': 'Your Organization',
          'url': 'https://yoursite.com',
          'logo': 'https://yoursite.com/logo.png',
        }, null, 2),
      },
      {
        schemaType: 'Article',
        priority: 'high',
        reason: 'Article schema critical for content pages to be cited by AI',
        implementation: 'Add Article schema to blog posts and articles with author, date, publisher',
        estimatedTime: '20 minutes per page',
        codeExample: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          'headline': 'Article Title',
          'author': { '@type': 'Person', 'name': 'Author Name' },
          'datePublished': '2025-01-01',
        }, null, 2),
      },
    ];
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Quick schema validation
 */
export function validateSchemaJSON(jsonLd: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const schema = JSON.parse(jsonLd);

    if (!schema['@context']) {
      errors.push('Missing @context');
    }

    if (!schema['@type'] && !schema['@graph']) {
      errors.push('Missing @type or @graph');
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    return { valid: false, errors: ['Invalid JSON'] };
  }
}

/**
 * Extract schema type from JSON-LD
 */
export function extractSchemaType(jsonLd: string): string | null {
  try {
    const schema = JSON.parse(jsonLd);
    return schema['@type'] || (schema['@graph'] ? 'Graph' : null);
  } catch {
    return null;
  }
}
