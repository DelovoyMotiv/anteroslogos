/**
 * MCP Tool Schemas - Universal Schema Generator
 * 
 * Supports:
 * - OpenAI Function Calling
 * - Claude Tools
 * - Grok Tools
 * - OpenAPI 3.1
 * - JSON Schema Draft 2020-12
 */


// =====================================================
// TYPES
// =====================================================

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  returns?: {
    type: string;
    description: string;
  };
  examples?: Array<{
    input: Record<string, unknown>; // Generic input for schema examples
    output: unknown; // Generic output for schema examples
  }>;
}

// =====================================================
// TOOL DEFINITIONS
// =====================================================

export const GRAPH_TOOLS: Record<string, ToolDefinition> = {
  auditSite: {
    name: 'auditSite',
    description: 'Perform comprehensive GEO audit on a website to analyze AI visibility and optimization',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Website URL to audit (must be valid HTTP/HTTPS URL)',
        required: true,
      },
      {
        name: 'useAI',
        type: 'boolean',
        description: 'Enable AI-powered deep analysis (slower but more comprehensive)',
        required: false,
      },
    ],
    returns: {
      type: 'object',
      description: 'GEO audit results with score, issues, and recommendations',
    },
    examples: [
      {
        input: { url: 'https://example.com', useAI: false },
        output: {
          geoScore: 78.5,
          grade: 'B+',
          issues: [],
          recommendations: [],
        },
      },
    ],
  },
  
  getGraph: {
    name: 'getGraph',
    description: 'Build knowledge graph from website content, extracting entities, relationships, and claims',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Website URL to analyze',
        required: true,
      },
    ],
    returns: {
      type: 'object',
      description: 'Knowledge graph with entities, relationships, and claims',
    },
  },
  
  predictCitation: {
    name: 'predictCitation',
    description: 'Predict likelihood of website being cited by AI platforms (ChatGPT, Perplexity, Claude, etc.)',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Website URL to analyze',
        required: true,
      },
      {
        name: 'platform',
        type: 'string',
        description: 'Target AI platform',
        required: false,
        enum: ['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Grok', 'all'],
      },
    ],
    returns: {
      type: 'object',
      description: 'Citation probability scores by platform',
    },
  },
  
  synthesizeNode: {
    name: 'synthesizeNode',
    description: 'Generate optimized content recommendations to improve AI visibility',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Website URL to optimize',
        required: true,
      },
      {
        name: 'targetKeywords',
        type: 'array',
        description: 'Target keywords to optimize for',
        required: false,
        items: {
          name: 'keyword',
          type: 'string',
          description: 'Target keyword',
          required: true,
        },
      },
    ],
    returns: {
      type: 'object',
      description: 'Content optimization recommendations',
    },
  },
  
  // NEW UNIQUE TOOLS
  causal_citation_trace: {
    name: 'causal_citation_trace',
    description: 'Trace exact causal path in knowledge graph explaining why LLM would cite this site for given query. Returns full causal explanation with platform-specific reasoning, competitive analysis, and improvement recommendations.',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Website URL to trace',
        required: true,
      },
      {
        name: 'query',
        type: 'string',
        description: 'User query that might trigger citation (max 500 characters)',
        required: true,
      },
      {
        name: 'platform',
        type: 'string',
        description: 'Target LLM platform for platform-specific scoring',
        required: false,
        enum: ['Perplexity', 'ChatGPT', 'Claude', 'Gemini', 'Grok'],
      },
      {
        name: 'competitors',
        type: 'array',
        description: 'Competitor URLs for comparative analysis (max 10)',
        required: false,
        items: {
          name: 'competitorUrl',
          type: 'string',
          description: 'Competitor website URL',
          required: true,
        },
      },
    ],
    returns: {
      type: 'object',
      description: 'Complete causal trace with paths, probabilities, platform-specific reasoning, competitive position, and actionable improvements',
    },
    examples: [
      {
        input: { 
          url: 'https://example.com/ai-guide', 
          query: 'best practices for AI optimization',
          platform: 'Perplexity',
          competitors: ['https://competitor.com/guide']
        },
        output: {
          trace: {
            paths: [
              {
                nodes: ['node_0', 'node_1', 'node_3'],
                score: 85.2,
                causalStrength: 0.78,
                criticalNodes: ['node_1'],
              },
            ],
            overallProbability: 0.856,
            confidenceLevel: 'high',
          },
          explanation: {
            reasonChosen: 'Site demonstrates strong E-E-A-T signals with comprehensive schema markup and high authority score',
            keyFactors: [
              { factor: 'authority', impact: 0.30, evidence: 'GEO score 85/100' },
              { factor: 'structured_data', impact: 0.25, evidence: 'Complete schema coverage' },
            ],
            platformBias: 'Perplexity strongly prefers recent, authoritative content with structured data',
            competitivePosition: { position: 'leader', advantage: 12.5 },
            nearMisses: [{ competitorUrl: 'https://competitor.com/guide', scoreGap: 3.2 }],
          },
          metadata: {
            graphNodes: 5,
            graphEdges: 4,
            processingTimeMs: 1240,
          },
        },
      },
    ],
  },
  
  predictive_synthesis: {
    name: 'predictive_synthesis',
    description: 'Synthesize new content recommendations that will increase visibility by X%',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Website URL',
        required: true,
      },
      {
        name: 'targetIncrease',
        type: 'number',
        description: 'Target visibility increase percentage (e.g., 25 for +25%)',
        required: true,
      },
    ],
    returns: {
      type: 'object',
      description: 'Synthesized content plan with predicted impact',
    },
    examples: [
      {
        input: { url: 'https://example.com', targetIncrease: 30 },
        output: {
          recommendedChanges: [
            {
              type: 'schema_addition',
              schema: 'FAQPage',
              impact: '+12% visibility',
              effort: 'moderate',
            },
            {
              type: 'content_gap',
              topic: 'AI implementation guide',
              impact: '+18% visibility',
              effort: 'complex',
            },
          ],
          totalPredictedIncrease: 30,
          confidence: 0.87,
        },
      },
    ],
  },
  
  federated_authority_boost: {
    name: 'federated_authority_boost',
    description: 'Generate ZKP (Zero-Knowledge Proof) that site participates in federated authority graph',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Website URL',
        required: true,
      },
      {
        name: 'includePrivateData',
        type: 'boolean',
        description: 'Include private metrics in proof (without revealing values)',
        required: false,
      },
    ],
    returns: {
      type: 'object',
      description: 'ZKP proof of authority participation',
    },
    examples: [
      {
        input: { url: 'https://example.com', includePrivateData: true },
        output: {
          proof: 'zkp_proof_0x...',
          authorityScore: 'hidden',
          participatesInNetwork: true,
          verifiable: true,
          expiresAt: '2025-12-31T00:00:00Z',
        },
      },
    ],
  },
};

// =====================================================
// SCHEMA CONVERTERS
// =====================================================

/**
 * Convert to OpenAI Function Calling format
 * Returns any for compatibility with OpenAI SDK types
 */
export function toOpenAIFunction(tool: ToolDefinition): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map(param => [
            param.name,
            {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
              ...(param.items ? { items: toParameterSchema(param.items) } : {}),
              ...(param.properties ? { 
                properties: Object.fromEntries(
                  Object.entries(param.properties).map(([key, val]) => [key, toParameterSchema(val)])
                )
              } : {}),
            },
          ])
        ),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    },
  };
}

/**
 * Convert to Claude Tools format
 * Returns any for compatibility with Anthropic SDK types
 */
export function toClaudeTool(tool: ToolDefinition): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        tool.parameters.map(param => [
          param.name,
          {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          },
        ])
      ),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
  };
}

/**
 * Convert to Grok Tools format (similar to OpenAI but with extensions)
 * Returns any for compatibility with Grok SDK types
 */
export function toGrokTool(tool: ToolDefinition): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map(param => [
            param.name,
            {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
            },
          ])
        ),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
      // Grok-specific extensions
      examples: tool.examples?.map(ex => ({
        input: ex.input,
        output: ex.output,
      })),
    },
  };
}

/**
 * Helper to convert parameter to JSON schema
 * Returns any for JSON Schema compatibility
 */
function toParameterSchema(param: ToolParameter): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    type: param.type,
    description: param.description,
    ...(param.enum ? { enum: param.enum } : {}),
    ...(param.items ? { items: toParameterSchema(param.items) } : {}),
    ...(param.properties ? {
      properties: Object.fromEntries(
        Object.entries(param.properties).map(([key, val]) => [key, toParameterSchema(val)])
      ),
    } : {}),
  };
}

/**
 * Generate OpenAPI 3.1 specification
 * Returns any for OpenAPI schema compatibility
 */
export function generateOpenAPISpec(): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    openapi: '3.1.0',
    info: {
      title: 'Anóteros Lógos Graph Tools API',
      version: '2.0.0',
      description: 'Graph Tool #1 for AI Agents - GEO audit, knowledge graphs, citation prediction, and federated authority',
      contact: {
        name: 'Anóteros Lógos',
        url: 'https://anoteroslogos.com',
      },
    },
    servers: [
      {
        url: 'https://anoteroslogos.com/api/mcp',
        description: 'Production MCP Server',
      },
      {
        url: 'http://localhost:5173/api/mcp',
        description: 'Local Development',
      },
    ],
    paths: Object.fromEntries(
      Object.entries(GRAPH_TOOLS).map(([_key, tool]) => [
        `/tools/${tool.name}`,
        {
          post: {
            operationId: tool.name,
            summary: tool.description,
            tags: ['Graph Tools'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: Object.fromEntries(
                      tool.parameters.map(param => [
                        param.name,
                        toParameterSchema(param),
                      ])
                    ),
                    required: tool.parameters.filter(p => p.required).map(p => p.name),
                  },
                  examples: tool.examples ? {
                    default: {
                      value: tool.examples[0].input,
                    },
                  } : undefined,
                },
              },
            },
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: tool.returns ? {
                      type: tool.returns.type,
                      description: tool.returns.description,
                    } : {},
                    examples: tool.examples ? {
                      default: {
                        value: tool.examples[0].output,
                      },
                    } : undefined,
                  },
                },
              },
              '400': {
                description: 'Invalid request',
              },
              '401': {
                description: 'Authentication required',
              },
              '429': {
                description: 'Rate limit exceeded',
              },
              '500': {
                description: 'Internal server error',
              },
            },
            security: [
              {
                bearerAuth: [],
              },
            ],
          },
        },
      ])
    ),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'API key authentication (format: sk_tier_xxxxx)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'number' },
                message: { type: 'string' },
                data: { type: 'object' },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Graph Tools',
        description: 'Knowledge graph and GEO audit tools',
      },
    ],
  };
}

/**
 * Export all tools in all formats
 * Returns any[] for SDK compatibility
 */
export function exportAllTools(): {
  openai: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  claude: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  grok: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  openapi: any; // eslint-disable-line @typescript-eslint/no-explicit-any
} {
  const tools = Object.values(GRAPH_TOOLS);
  
  return {
    openai: tools.map(toOpenAIFunction),
    claude: tools.map(toClaudeTool),
    grok: tools.map(toGrokTool),
    openapi: generateOpenAPISpec(),
  };
}
