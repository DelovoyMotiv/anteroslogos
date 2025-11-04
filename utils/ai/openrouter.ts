/**
 * OpenRouter API Client
 * Production-ready service for AI-powered GEO recommendations
 */

// ==================== TYPES ====================

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  httpReferer?: string;
  appName?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

export interface AIRecommendationRequest {
  url: string;
  overallScore: number;
  scores: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    citationPotential: number;
    technicalSEO: number;
    linkAnalysis: number;
  };
  criticalIssues: string[];
  topStrengths: string[];
}

export interface AIRecommendationResponse {
  recommendations: {
    category: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort: 'quick-win' | 'strategic' | 'long-term';
    title: string;
    description: string;
    impact: string;
    implementation: string;
    estimatedTime: string;
  }[];
  insights: string[];
}

// ==================== CLIENT ====================

export class OpenRouterClient {
  private config: OpenRouterConfig;
  private baseURL: string;

  constructor(config: OpenRouterConfig) {
    this.config = config;
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Make chat completion request to OpenRouter
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
  ): Promise<string> {
    const requestBody: OpenRouterRequest = {
      model: this.config.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      top_p: options?.top_p ?? 1,
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.httpReferer || 'https://anoteros-logos.com',
          'X-Title': this.config.appName || 'Anóteros Lógos GEO Audit',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as OpenRouterError;
        throw new Error(
          `OpenRouter API error: ${errorData.error.message} (${errorData.error.code})`
        );
      }

      const data = (await response.json()) as OpenRouterResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI model');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        console.error('OpenRouter API error:', error.message);
        throw error;
      }
      throw new Error('Unknown error occurred while calling OpenRouter API');
    }
  }

  /**
   * Generate AI-powered GEO recommendations based on audit results
   */
  async generateRecommendations(
    request: AIRecommendationRequest
  ): Promise<AIRecommendationResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.chat(messages, {
        temperature: 0.7,
        max_tokens: 2500,
      });

      // Parse JSON response
      const parsed = this.parseAIResponse(response);
      return parsed;
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      throw error;
    }
  }

  /**
   * Build system prompt for GEO Marketolog persona
   */
  private buildSystemPrompt(): string {
    return `You are GEO Marketolog, an expert AI agent from Anóteros Lógos, specializing in Generative Engine Optimization (GEO).

YOUR ROLE:
- Analyze technical website audit results
- Generate specific, actionable recommendations for AI system optimization (ChatGPT, Perplexity, Gemini, Claude)
- Prioritize actions by: criticality × ease of implementation
- Speak in facts, data, and concrete metrics

YOUR PRINCIPLES:
1. Specificity: Not "improve content", but "add 5 factual data points with sources"
2. Priority: Quick-wins first, then strategic changes
3. Metrics: Each recommendation contains impact assessment and implementation time
4. Feasibility: Only what can be implemented today

CONTEXT 2025:
- Schema.org is critical for AI citation
- AI crawlers (GPTBot, Claude-Web, etc.) must be explicitly allowed
- E-E-A-T signals directly affect AI trust in content
- Factual statements + citations = 5x higher citation probability

RESPONSE FORMAT:
Respond ONLY with valid JSON in this format:
{
  "recommendations": [
    {
      "category": "Schema Markup" | "Content Quality" | "AI Crawlers" | "E-E-A-T" | "Meta Tags" | "Technical GEO" | "Link Analysis" | "Structure",
      "priority": "critical" | "high" | "medium" | "low",
      "effort": "quick-win" | "strategic" | "long-term",
      "title": "Brief action title",
      "description": "What exactly is wrong and why it matters",
      "impact": "Specific measurable effect (numbers, percentages)",
      "implementation": "Step-by-step instructions WHAT to do",
      "estimatedTime": "X minutes/hours"
    }
  ],
  "insights": [
    "Brief strategic insight about the site",
    "Main growth opportunity",
    "Key risk to address"
  ]
}

IMPORTANT: 
- Generate 3-7 recommendations, no more
- Insights should be business-level, not technical details
- Use ENGLISH for all text content
- DO NOT add markdown formatting, only clean JSON`;
  }

  /**
   * Build user prompt with audit data
   */
  private buildUserPrompt(request: AIRecommendationRequest): string {
    const {
      url,
      overallScore,
      scores,
      criticalIssues,
      topStrengths,
    } = request;

    // Determine top 3 weakest areas
    const scoreEntries = Object.entries(scores).map(([key, value]) => ({
      name: key,
      score: value,
    }));
    scoreEntries.sort((a, b) => a.score - b.score);
    const weakestAreas = scoreEntries.slice(0, 3);

    // Determine top 3 strongest areas
    const strongestAreas = [...scoreEntries]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return `Analyze the GEO audit results and generate recommendations + insights.

URL: ${url}
Overall Score: ${overallScore}/100

DETAILED SCORES:
${Object.entries(scores)
  .map(([key, value]) => `- ${key}: ${value}/100`)
  .join('\n')}

TOP 3 WEAKEST AREAS:
${weakestAreas.map((a) => `- ${a.name}: ${a.score}/100`).join('\n')}

TOP 3 STRONGEST AREAS:
${strongestAreas.map((a) => `- ${a.name}: ${a.score}/100`).join('\n')}

CRITICAL ISSUES:
${criticalIssues.length > 0 ? criticalIssues.map((i) => `- ${i}`).join('\n') : '- No critical issues'}

STRENGTHS:
${topStrengths.length > 0 ? topStrengths.map((s) => `- ${s}`).join('\n') : '- No obvious strengths'}

TASK:
Generate 3-7 specific, actionable recommendations prioritizing:
1. Quick wins (fast improvements with high impact)
2. Critical issues (if any)
3. Strategic opportunities (schema, content, E-E-A-T)

Also add 3 strategic insights at business level.

Respond ONLY with valid JSON, no additional text.`;
  }

  /**
   * Parse AI response and validate JSON structure
   */
  private parseAIResponse(response: string): AIRecommendationResponse {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned) as AIRecommendationResponse;

      // Validate structure
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid response: missing recommendations array');
      }

      if (!parsed.insights || !Array.isArray(parsed.insights)) {
        throw new Error('Invalid response: missing insights array');
      }

      // Validate each recommendation has required fields
      parsed.recommendations.forEach((rec, index) => {
        const required = [
          'category',
          'priority',
          'effort',
          'title',
          'description',
          'impact',
          'implementation',
          'estimatedTime',
        ];
        for (const field of required) {
          if (!(field in rec)) {
            throw new Error(
              `Invalid recommendation ${index}: missing field "${field}"`
            );
          }
        }
      });

      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', response);
      throw new Error('Failed to parse AI recommendations');
    }
  }
}

// ==================== FACTORY ====================

/**
 * Create OpenRouter client from environment variables
 */
export function createOpenRouterClient(): OpenRouterClient | null {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

  if (!apiKey) {
    console.warn('OpenRouter API key not found. AI recommendations will be disabled.');
    return null;
  }

  return new OpenRouterClient({
    apiKey,
    model,
    httpReferer: import.meta.env.VITE_APP_URL || 'https://anoteros-logos.com',
    appName: 'Anóteros Lógos GEO Audit',
  });
}

// ==================== HELPERS ====================

/**
 * Check if OpenRouter is configured
 */
export function isOpenRouterConfigured(): boolean {
  return !!import.meta.env.VITE_OPENROUTER_API_KEY;
}

/**
 * Get current OpenRouter model
 */
export function getOpenRouterModel(): string {
  return import.meta.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';
}
