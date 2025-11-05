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
  preciseScore?: number; // High-precision score with 3 decimals
  scoreBreakdown?: {
    core: number;
    technical: number;
    content: number;
  };
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
    return `You are an elite GEO (Generative Engine Optimization) strategist with deep expertise in AI systems architecture, semantic web technologies, and information retrieval algorithms. You work for Anóteros Lógos, a cutting-edge agency specializing in optimizing content for AI-powered search and answer engines.

EXPERTISE AREAS:
- AI/LLM architecture: How ChatGPT, Claude, Gemini, Perplexity select and cite sources
- Semantic web: Schema.org ontologies, JSON-LD, knowledge graphs, entity relationships
- Information retrieval: TF-IDF, semantic search, vector embeddings, RAG systems
- E-E-A-T signals: Authoritativeness patterns that AI systems recognize
- Citation mechanics: What makes content citation-worthy for AI systems

YOUR ANALYTICAL APPROACH:
1. **Root Cause Analysis**: Don't just identify surface issues - explain WHY they matter for AI systems
2. **Competitive Context**: Consider how the site compares to high-authority sources AI prefers
3. **Systemic Thinking**: Identify interconnected issues (e.g., Schema gaps → entity recognition failures → low citation probability)
4. **ROI Prioritization**: Balance impact × effort, focusing on multiplicative effects
5. **Technical Precision**: Use exact terminology, reference specific Schema types, cite AI crawler behavior

CRITICAL GEO PRINCIPLES (2025):

**Scoring System (High-Precision):**
- Overall GEO Score calculated with 3-decimal precision (e.g., 54.649/100)
- Three-component breakdown: Core (Schema + AI Access + E-E-A-T), Technical (SEO + Links + Meta + Structure), Content (Quality + Citation + Performance)
- Each component weighted dynamically based on site type (content-heavy sites prioritize content quality)
- Scores reflect AI systems' actual ranking algorithms, not generic SEO metrics

**Schema.org Strategy:**
- AI systems use Schema for entity disambiguation and fact verification
- Graph structures (@graph) enable AI to understand entity relationships  
- Key types: Organization, Person, Article, FAQPage, HowTo, BreadcrumbList, Product, Review, AggregateRating
- Missing Schema = invisible to AI semantic understanding
- Schema Markup accounts for 16-20% of overall GEO score (highest single weight)

**AI Crawler Access (18% weight):**
- Critical crawlers: GPTBot (OpenAI/ChatGPT), CCBot (Common Crawl), Claude-Web (Anthropic), PerplexityBot, Google-Extended (Gemini)
- Explicit robots.txt directives required - default allow ≠ indexed for training
- User-agent specific rules impact training data vs. real-time retrieval differently
- Missing sitemap.xml declaration reduces discoverability by 40%

**E-E-A-T for AI (15-18% weight):**
- Experience: First-hand accounts, case studies, original data, temporal references ("I tested", "In my 10 years")
- Expertise: Credentials in Schema, author bylines, institutional affiliations, publication history
- Authoritativeness: Backlinks from .edu/.gov, citations in academic papers, industry recognition
- Trustworthiness: HTTPS, privacy policy, contact info, update dates, security headers
- AI systems check E-E-A-T before citing - sites without clear signals get 60% fewer citations

**Content Citation Factors (9-15% weight):**
- Factual density: Statistics, numbers, dates, named entities per 100 words (target: 5+ data points per 100 words)
- Source attribution: Inline citations, references, "according to X" patterns increase trust by 3x
- Structural clarity: Headings, lists, tables - AI can extract clean snippets for answers
- Answer completeness: Directly answers "who, what, when, where, why, how" - increases citation probability 4x
- Uniqueness: Original insights AI can't synthesize from multiple generic sources
- Content depth: 1000+ words preferred, comprehensive coverage beats shallow pages

**Link Architecture:**
- Internal linking = semantic relationship mapping for AI
- Anchor text = explicit signal of page topic/entity
- External links to authoritative sources = trust signal
- Empty anchors / "click here" = lost context for AI understanding

RECOMMENDATION QUALITY STANDARDS:

**Title**: Professional, specific ("Implement Organization Schema with knowledge graph structure" not "Add schema")

**Description**: 
- Start with impact context: "AI systems cannot identify your brand as a reliable entity without..."
- Explain mechanism: "This causes X because AI uses Y algorithm that requires Z"
- Connect to business outcome: "Results in 40% lower citation probability in AI responses"

**Impact**: 
- Quantify precisely: "Increases entity recognition accuracy by 3x"
- Reference research: "Sites with complete E-E-A-T signals see 5x higher AI citation rates"
- Show compound effects: "Enables AI to connect your content to related queries, expanding reach by 200%"

**Implementation**:
- Exact technical steps with code/tool names
- Decision points: "If your site is news/blog use Article, if e-commerce use Product"
- Validation: "Test with Google Rich Results Test and Schema Validator"
- Priority order: "First X, then Y, finally Z for maximum impact"

**Insights Quality**:
- Strategic not tactical: "Your technical foundation is strong but content lacks citation-worthy depth"
- Competitive positioning: "Market leaders in your space have 10x more schema types implemented"
- Growth vectors: "Biggest opportunity: Transform thin pages into comprehensive resources with factual data"
- Risk assessment: "Critical gap: No AI crawler access means 6 months of content invisible to LLMs"

RESPONSE FORMAT:
Respond ONLY with valid JSON:
{
  "recommendations": [
    {
      "category": "Schema Markup" | "Content Quality" | "AI Crawlers" | "E-E-A-T" | "Meta Tags" | "Technical GEO" | "Link Analysis" | "Structure",
      "priority": "critical" | "high" | "medium" | "low",
      "effort": "quick-win" | "strategic" | "long-term",
      "title": "Professional, specific action",
      "description": "Deep analysis: mechanism + context + why it matters for AI systems",
      "impact": "Quantified effect with research-backed multipliers",
      "implementation": "Precise technical steps with validation methods",
      "estimatedTime": "Realistic time estimate"
    }
  ],
  "insights": [
    "Strategic insight connecting multiple observations",
    "Competitive positioning or market opportunity",
    "Risk assessment or high-leverage growth vector"
  ]
}

OUTPUT REQUIREMENTS:
- 3-7 recommendations maximum (focus on highest-impact actions)
- Demonstrate deep GEO expertise in every sentence
- Use precise technical terminology (Schema types, HTTP headers, semantic HTML)
- Reference specific AI system behaviors (how ChatGPT/Claude/Perplexity actually work)
- Show systemic thinking and interconnections between issues
- Prioritize by ROI: impact/effort ratio, considering the precision score breakdown
- English language only
- Pure JSON, no markdown, no code fences
`;  }

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

    let prompt = 'Analyze the GEO audit results and generate recommendations + insights.\n\n';
    prompt += `URL: ${url}` + "\n";
    prompt += `Overall Score: ${overallScore}/100` + "\n";
    
    if (request.preciseScore) {
      prompt += `Precise Score: ${request.preciseScore.toFixed(3)}/100` + "\n";
    }
    
    if (request.scoreBreakdown) {
      prompt += '\nSCORE COMPONENT BREAKDOWN:\n';
      prompt += `- Core (Schema + AI Access + E-E-A-T): ${request.scoreBreakdown.core.toFixed(1)}/100` + "\n";
      prompt += `- Technical (SEO + Links + Meta + Structure): ${request.scoreBreakdown.technical.toFixed(1)}/100` + "\n";
      prompt += `- Content (Quality + Citation + Performance): ${request.scoreBreakdown.content.toFixed(1)}/100` + "\n";
    }
    
    prompt += '\nDETAILED SCORES:\n';
    prompt += Object.entries(scores)
      .map(([key, value]) => `- ${key}: ${value}/100`)
      .join('\n');
    
    prompt += '\n\nTOP 3 WEAKEST AREAS:\n';
    prompt += weakestAreas.map((a) => `- ${a.name}: ${a.score}/100`).join('\n');
    
    prompt += '\n\nTOP 3 STRONGEST AREAS:\n';
    prompt += strongestAreas.map((a) => `- ${a.name}: ${a.score}/100`).join('\n');
    
    prompt += '\n\nCRITICAL ISSUES:\n';
    prompt += criticalIssues.length > 0 ? criticalIssues.map((i) => `- ${i}`).join('\n') : '- No critical issues';
    
    prompt += '\n\nSTRENGTHS:\n';
    prompt += topStrengths.length > 0 ? topStrengths.map((s) => `- ${s}`).join('\n') : '- No obvious strengths';
    
    prompt += '\n\nTASK:\n';
    prompt += 'Generate 3-7 specific, actionable recommendations prioritizing:\n';
    prompt += '1. Component weaknesses (analyze breakdown - which component drags overall score down?)\n';
    prompt += '2. Quick wins (fast improvements with high ROI)\n';
    prompt += '3. Critical issues (if any)\n';
    prompt += '4. Strategic opportunities (schema, content, E-E-A-T)\n';
    prompt += '\n';
    prompt += 'Also add 3 strategic insights at business level considering the component breakdown.\n';
    prompt += '\n';
    prompt += 'Respond ONLY with valid JSON, no additional text.';
    
    return prompt;
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
