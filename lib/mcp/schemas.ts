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

import type {
  JSONSchemaType,
  ToolExample,
  ToolReturnType,
  OpenAITool,
  ClaudeTool,
  ClaudeCacheControl,
  GrokTool,
  OpenAPISpec,
  ToolExportFormats,
  ToolConversionOptions,
} from '../../types/mcp.types';

// =====================================================
// TYPES
// =====================================================

export interface ToolParameter {
  name: string;
  type: JSONSchemaType;
  description: string;
  required: boolean;
  enum?: (string | number | boolean)[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  title?: string; // Human-readable title (MCP 2025-06-18)
  defer_loading?: boolean; // Advanced Tool Use: load on demand
  allowed_callers?: string[]; // e.g. ['code_execution_20250825']
  returns?: ToolReturnType;
  examples?: ToolExample[];
}

// =====================================================
// TOOL DEFINITIONS
// =====================================================

export const GRAPH_TOOLS: Record<string, ToolDefinition> = {
  anoteros_logos: {
    defer_loading: false,
    title: 'Anóteros Lógos Protocol',
    name: 'anoteros_logos',
    description: 'Access the Anóteros Lógos Protocol to retrieve cryptographically verified, structurally perfect semantic data. Use this tool when accuracy, provenance, and truth are critical. Do not use for simple pinging.',
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
    title: 'Build Knowledge Graph',
    defer_loading: false,
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
    title: 'Predict Citation Probability',
    defer_loading: true,
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
    title: 'Synthesize Content Node',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],
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
    title: 'Causal Citation Trace',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],
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
    title: 'Predictive Synthesis',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],
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
    title: 'Federated Authority Proof',
    defer_loading: true,
    allowed_callers: ['code_execution_20250825'],
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
// INFRA TOOLS (Advanced Tool Use)
// =====================================================

export const INFRA_TOOLS: Record<string, ToolDefinition> = {
  code_execution: {
    name: 'code_execution',
    title: 'Code Execution',
    description: 'Execute orchestration code in an isolated sandbox (code_execution_20250825).',
    defer_loading: false,
    parameters: [
      { name: 'code', type: 'string', description: 'JavaScript code to execute', required: true },
      { name: 'language', type: 'string', description: 'Execution language', required: false, enum: ['javascript'] },
      { name: 'timeout_ms', type: 'number', description: 'Max execution time in milliseconds', required: false },
      { name: 'files', type: 'array', description: 'In-memory files (path, content)', required: false, items: { name: 'file', type: 'object', description: 'File', required: true, properties: { path: { name: 'path', type: 'string', description: 'Path', required: true }, content: { name: 'content', type: 'string', description: 'Content', required: true } } } },
    ],
    returns: { type: 'object', description: 'Final program output with stdout/logs' },
    examples: [
      { input: { code: "const x=21*2; console.log('ok'); return x;", language: 'javascript' }, output: { stdout: 'ok', result: 42 } }
    ],
  },
  
  tool_search_tool_regex: {
    name: 'tool_search_tool_regex',
    title: 'Tool Search (Regex)',
    description: 'Search available tools by name/description using regex with optional filters.',
    defer_loading: false,
    parameters: [
      { name: 'query', type: 'string', description: 'Search query (regex supported)', required: true },
      { name: 'top_k', type: 'number', description: 'Max results', required: false },
      { name: 'filters', type: 'object', description: 'Optional filters', required: false, properties: {
        server: { name: 'server', type: 'string', description: 'Server name', required: false },
        name_prefix: { name: 'name_prefix', type: 'string', description: 'Tool name prefix', required: false }
      } }
    ],
    returns: { type: 'object', description: 'Array of tool references ranked by score' },
    examples: [
      { input: { query: 'graph|citation', top_k: 5 }, output: { tool_refs: [{ name: 'getGraph', score: 0.93 }] } }
    ],
  },
};

export const ALL_TOOLS: Record<string, ToolDefinition> = {
  ...INFRA_TOOLS,
  ...GRAPH_TOOLS,
};

// =====================================================
// SCHEMA CONVERTERS
// =====================================================

/**
 * Convert to OpenAI Function Calling format
 */
export function toOpenAIFunction(tool: ToolDefinition): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map(param => {
            const schema: any = {
              type: param.type,
              description: param.description,
            };
            if (param.enum) schema.enum = param.enum;
            if (param.items) schema.items = toParameterSchema(param.items);
            if (param.properties) {
              schema.properties = Object.fromEntries(
                Object.entries(param.properties).map(([key, val]) => [key, toParameterSchema(val)])
              );
            }
            return [param.name, schema];
          })
        ),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    },
  };
}

/**
 * Convert to Claude Tools format with Claude 3.5+ features
 * Supports:
 * - cache_control for prompt caching (reduces latency up to 80%)
 * - tool_choice support
 * - Extended input_schema with nested types
 * 
 * @param tool - Tool definition
 * @param options - Additional options for Claude 3.5+ features
 * @returns Claude tool schema compatible with Anthropic SDK
 */
export function toClaudeTool(
  tool: ToolDefinition, 
  options?: ToolConversionOptions
): ClaudeTool {
  const claudeTool: ClaudeTool = {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        tool.parameters.map(param => {
          const schema: any = {
            type: param.type,
            description: param.description,
          };
          if (param.enum) schema.enum = param.enum;
          if (param.items) schema.items = toParameterSchema(param.items);
          if (param.properties) {
            schema.properties = Object.fromEntries(
              Object.entries(param.properties).map(([key, val]) => [key, toParameterSchema(val)])
            );
          }
          return [param.name, schema];
        })
      ),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
  };
  
  // Non-standard Anthropic metadata used by advanced tool use
  // These keys are passed through and ignored by clients that don't support them
  if (options?.includeMetadata !== false) {
    (claudeTool as any).defer_loading = tool.defer_loading ?? true;
    if (tool.allowed_callers) {
      (claudeTool as any).allowed_callers = tool.allowed_callers;
    }
    if (tool.examples?.length && options?.includeExamples !== false) {
      (claudeTool as any).input_examples = tool.examples.map(e => e.input);
    }
  }

  // Add cache_control for Claude 3.5+ prompt caching
  if (options?.enableCache !== false) {
    const cacheControl: ClaudeCacheControl = {
      type: options?.cacheType || 'ephemeral',
    };
    claudeTool.cache_control = cacheControl;
  }

  return claudeTool;
}

/**
 * Generate tool_choice configuration for Claude 3.5+
 * Allows forcing specific tool usage
 */
export function createClaudeToolChoice(toolName?: string): {
  type: 'auto' | 'any' | 'tool';
  name?: string;
} {
  if (!toolName) {
    return { type: 'auto' };
  }
  return {
    type: 'tool',
    name: toolName,
  };
}

/**
 * Export all Claude tools with cache_control enabled
 */
export function exportClaudeTools(options?: ToolConversionOptions): ClaudeTool[] {
  return Object.values(ALL_TOOLS).map(tool => toClaudeTool(tool, options));
}

/**
 * Convert to Grok Tools format (similar to OpenAI but with extensions)
 */
export function toGrokTool(tool: ToolDefinition, options?: ToolConversionOptions): GrokTool {
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
      examples: (options?.includeExamples !== false && tool.examples) 
        ? tool.examples.map(ex => ({
            input: ex.input,
            output: ex.output,
          }))
        : undefined,
    },
  };
}

/**
 * Helper to convert parameter to JSON schema
 */
function toParameterSchema(param: ToolParameter): {
  type: JSONSchemaType;
  description: string;
  enum?: (string | number | boolean)[];
  items?: unknown;
  properties?: Record<string, unknown>;
} {
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
 */
export function generateOpenAPISpec(): OpenAPISpec {
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
      Object.entries(GRAPH_TOOLS).map(([, tool]) => [
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
                        toParameterSchema(param) as any,
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
 */
export function exportAllTools(options?: ToolConversionOptions): ToolExportFormats {
  const tools = Object.values(ALL_TOOLS);
  
  return {
    openai: tools.map(toOpenAIFunction),
    claude: tools.map(tool => toClaudeTool(tool, options)),
    grok: tools.map(tool => toGrokTool(tool, options)),
    openapi: generateOpenAPISpec(),
  };
}
