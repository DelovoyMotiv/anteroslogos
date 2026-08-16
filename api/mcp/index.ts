// @ts-nocheck
/**
 * MCP Protocol JSON-RPC 2.0 Endpoint
 * POST /api/mcp
 * 
 * Implements Model Context Protocol (MCP) 2024-11-05 specification
 * https://modelcontextprotocol.io/specification/2024-11-05
 * 
 * Supported methods:
 * - initialize: Initialize MCP session
 * - tools/list: List available tools
 * - tools/call: Execute a tool
 * - resources/list: List available resources
 * - resources/read: Read a resource
 * - prompts/list: List available prompts
 * - prompts/get: Get a prompt template
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
// IMPORTANT (Requirements 4.1, 4.2): This module MUST NOT perform any
// module-load-time import of heavy/native dependencies. Doing so previously
// caused every request to /api/mcp to 500 on Vercel's stateless serverless
// runtime (the native `isolated-vm` binding via the programmatic route, and
// the libp2p mesh via MeshNetworkRouter, were loaded at import time).
//
// Only dependency-light schema helpers and the capability registry are
// imported at the top level. The audit/graph/citation implementations are
// lazy-loaded via `await import()` inside the `tools/call` branch so that
// GET /api/mcp, tools/list, resources/list, and prompts/list respond 200
// without loading any native dependency.
import { ALL_TOOLS, GRAPH_TOOLS, toClaudeTool, toOpenAIFunction } from '../../lib/mcp/schemas';
import { CAPABILITY_REGISTRY } from '../../lib/agentSurface/capabilityRegistry';
import { withCors, withRateLimit, withJsonRpcValidation, compose } from '../../lib/validation/middleware';
import {
  McpInitializeParamsSchema,
  McpToolsCallParamsSchema,
  McpResourcesReadParamsSchema,
  McpPromptsGetParamsSchema,
} from '../../lib/validation/apiSchemas';
import type { ValidatedApiHandler } from '../../types/api.types';

// =====================================================
// MCP PROTOCOL TYPES (2024-11-05 Spec)
// =====================================================

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP Server Info (Protocol Version 2025-06-18)
const MCP_SERVER_INFO = {
  name: 'anteroslogos-mcp-server',
  version: '2.1.0',
  protocolVersion: '2025-06-18',
  capabilities: {
    tools: { listChanged: false },
    resources: { subscribe: false, listChanged: false },
    prompts: { listChanged: false },
    logging: {},
    completions: {},
  },
  instructions: `Anóteros Lógos MCP Server provides GEO audit, knowledge graph, and citation prediction tools for AI visibility optimization. Use tools/list to discover available tools, then tools/call to execute them.`,
};

// =====================================================
// CAPABILITY STATUS (from the single-source-of-truth registry)
// =====================================================

/**
 * Map of MCP tool method name -> { status, note } derived from the Capability
 * Registry. This is what lets tools/list mark design-stage tools as
 * `status: 'DESIGN'` and lets tools/call return a structured design-stage
 * result for them instead of attempting to load unavailable infrastructure
 * (Requirements 4.6).
 */
const MCP_TOOL_STATUS = new Map<string, { status: 'LIVE' | 'DESIGN'; note?: string }>();
for (const entry of CAPABILITY_REGISTRY.capabilities) {
  if (entry.id.startsWith('mcp.') && typeof entry.method === 'string') {
    MCP_TOOL_STATUS.set(entry.method, { status: entry.status, note: entry.note });
  }
}

/** Tools that are design-stage / not runnable in production serverless. */
function isDesignTool(name: string): boolean {
  return MCP_TOOL_STATUS.get(name)?.status === 'DESIGN';
}

/** Resolve the declared status for a tool; defaults to LIVE for local tools. */
function toolStatus(name: string): 'LIVE' | 'DESIGN' {
  return MCP_TOOL_STATUS.get(name)?.status ?? 'LIVE';
}

/**
 * Build a structured, valid JSON-RPC tool result declaring the tool is
 * design-stage. This is NOT an error and never attempts to load isolated-vm,
 * a mesh, or any other unavailable infrastructure (Requirements 4.6).
 */
function designStageResult(name: string): { content: Array<{ type: string; text: string }> } {
  const info = MCP_TOOL_STATUS.get(name);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            tool: name,
            status: 'DESIGN',
            runnable: false,
            message: `Tool '${name}' is design-stage and is not runnable in the production serverless environment.`,
            note: info?.note,
          },
          null,
          2
        ),
      },
    ],
  };
}

// =====================================================
// MCP TOOLS (from schemas)
// =====================================================

function getMcpTools() {
  return Object.entries(ALL_TOOLS).map(([, tool]) => ({
    name: tool.name,
    title: tool.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // MCP 2025-06-18: title field
    description: tool.description,
    status: toolStatus(tool.name), // LIVE or DESIGN (Requirements 4.6)
    inputSchema: {
      type: 'object' as const,
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
  }));
}

// =====================================================
// MCP RESOURCES
// =====================================================

const MCP_RESOURCES = [
  {
    uri: 'anoteroslogos://docs/agent-identity',
    name: 'Agent Identity Documentation',
    description: 'Complete guide for AI agent integration with Ed25519 authentication',
    mimeType: 'text/markdown',
  },
  {
    uri: 'anoteroslogos://docs/geo-audit',
    name: 'GEO Audit Documentation',
    description: 'How to perform Generative Engine Optimization audits',
    mimeType: 'text/markdown',
  },
  {
    uri: 'anoteroslogos://schemas/tools',
    name: 'Tool Schemas',
    description: 'OpenAPI 3.1 schemas for all available tools',
    mimeType: 'application/json',
  },
  {
    uri: 'anoteroslogos://config/agent',
    name: 'Agent Configuration',
    description: 'Current agent.json configuration',
    mimeType: 'application/json',
  },
];

// =====================================================
// MCP PROMPTS
// =====================================================

const MCP_PROMPTS = [
  {
    name: 'geo_audit_analysis',
    title: 'GEO Audit Analysis', // MCP 2025-06-18: title field
    description: 'Analyze GEO audit results and provide actionable recommendations',
    arguments: [
      {
        name: 'url',
        description: 'Website URL to analyze',
        required: true,
      },
      {
        name: 'focus_area',
        description: 'Specific area to focus on (schema, authority, citations, content)',
        required: false,
      },
    ],
  },
  {
    name: 'citation_optimization',
    title: 'Citation Optimization', // MCP 2025-06-18: title field
    description: 'Generate content recommendations to improve AI citation probability',
    arguments: [
      {
        name: 'url',
        description: 'Website URL to optimize',
        required: true,
      },
      {
        name: 'target_platforms',
        description: 'Target AI platforms (comma-separated: claude,chatgpt,perplexity)',
        required: false,
      },
    ],
  },
  {
    name: 'knowledge_graph_query',
    title: 'Knowledge Graph Query', // MCP 2025-06-18: title field
    description: 'Query and analyze knowledge graph for a domain',
    arguments: [
      {
        name: 'domain',
        description: 'Domain to analyze',
        required: true,
      },
      {
        name: 'entity_types',
        description: 'Entity types to extract (comma-separated)',
        required: false,
      },
    ],
  },
];

// =====================================================
// TOOL EXECUTION
// =====================================================

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  _request?: VercelRequest
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // Design-stage tools (code_execution, synthesizeNode, causal_citation_trace,
  // predictive_synthesis, federated_authority_boost) return a structured
  // design-stage result rather than attempting to load unavailable
  // infrastructure such as the native isolated-vm binding (Requirements 4.6).
  if (isDesignTool(name)) {
    return designStageResult(name);
  }

  try {
    let result: unknown;
    
    switch (name) {
      case 'tool_search_tool_regex': {
        const query = String(args.query || '').trim();
        const topK = Number(args.top_k || 5);
        if (!query) throw new Error('Missing required parameter: query');
        const regex = new RegExp(query, 'i');
        const matches = Object.values(ALL_TOOLS)
          .filter(t => regex.test(t.name) || regex.test(t.description || '') || regex.test(t.title || ''))
          .map(t => ({
            name: t.name,
            title: t.title || t.name,
            short_description: t.description,
            defer_loading: t.defer_loading ?? true,
            score: Math.min(0.99, 0.5 + (t.title && regex.test(t.title) ? 0.3 : 0) + (regex.test(t.name) ? 0.2 : 0)),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
        result = { tool_refs: matches };
        break;
      }

      case 'auditSite':
      case 'anoteros_logos': {
        const url = args.url as string;
        const useAI = Boolean(args.useAI || false);
        if (!url) throw new Error('Missing required parameter: url');

        // Lazy-load the audit implementation. A failing dynamic import degrades
        // this one tool to an error result rather than crashing the function
        // (Requirements 4.3).
        let performGeoAudit: typeof import('../../utils/geoAuditEnhanced')['performGeoAudit'];
        try {
          ({ performGeoAudit } = await import('../../utils/geoAuditEnhanced'));
        } catch (importError) {
          throw new Error(
            `GEO audit implementation unavailable: ${importError instanceof Error ? importError.message : String(importError)}`
          );
        }

        // Production GEO audit
        const auditResult = await performGeoAudit(url, { useAI });
        result = {
          url: auditResult.url,
          geoScore: auditResult.geoScore,
          grade: auditResult.grade,
          timestamp: auditResult.timestamp,
          recommendations: auditResult.recommendations || [],
          scores: auditResult.scores,
          metrics: auditResult.metrics,
        };
        break;
      }
      
      case 'getGraph': {
        const url = args.url as string;
        if (!url) throw new Error('Missing required parameter: url');

        // Lazy-load the knowledge graph builder (Requirements 4.3).
        let KnowledgeGraphBuilder: typeof import('../../utils/knowledgeGraph/builder')['KnowledgeGraphBuilder'];
        try {
          ({ KnowledgeGraphBuilder } = await import('../../utils/knowledgeGraph/builder'));
        } catch (importError) {
          throw new Error(
            `Knowledge graph implementation unavailable: ${importError instanceof Error ? importError.message : String(importError)}`
          );
        }

        // Production knowledge graph extraction
        const domain = new URL(url).hostname;
        const builder = new KnowledgeGraphBuilder(domain);
        
        // Fetch HTML
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        
        // Build graph
        const graph = await builder.buildFromHTML(html, url);
        result = graph;
        break;
      }
      
      case 'predictCitation': {
        const url = args.url as string;
        const platform = (args.platform as string) || 'all';
        if (!url) throw new Error('Missing required parameter: url');

        // Lazy-load the graph builder + citation engine (Requirements 4.3).
        let KnowledgeGraphBuilder: typeof import('../../utils/knowledgeGraph/builder')['KnowledgeGraphBuilder'];
        let CitationPredictionEngine: typeof import('../../utils/citationPrediction/engine')['CitationPredictionEngine'];
        try {
          ({ KnowledgeGraphBuilder } = await import('../../utils/knowledgeGraph/builder'));
          ({ CitationPredictionEngine } = await import('../../utils/citationPrediction/engine'));
        } catch (importError) {
          throw new Error(
            `Citation prediction implementation unavailable: ${importError instanceof Error ? importError.message : String(importError)}`
          );
        }

        // Production citation prediction
        // First, extract knowledge graph
        const domain = new URL(url).hostname;
        const builder = new KnowledgeGraphBuilder(domain);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        const graph = await builder.buildFromHTML(html, url);
        
        // Predict citations
        const engine = new CitationPredictionEngine();
        const prediction = await engine.predictCitations(graph, { contentUrl: url });
        
        // Format response
        const platformPredictions: Record<string, number> = {
          Claude: prediction.platform_predictions.claude.probability,
          ChatGPT: prediction.platform_predictions.chatgpt.probability,
          Perplexity: prediction.platform_predictions.perplexity.probability,
          Gemini: prediction.platform_predictions.gemini.probability,
          Meta: prediction.platform_predictions.meta.probability,
        };
        
        result = {
          url,
          platform,
          predictions: platform === 'all' ? platformPredictions : { [platform]: platformPredictions[platform] || 0 },
          confidence: prediction.confidence,
          timestamp: new Date().toISOString(),
          overall_probability: prediction.overall_probability,
          optimization_actions: prediction.optimization_actions,
        };
        break;
      }
      
      // Note: code_execution, synthesizeNode, causal_citation_trace,
      // predictive_synthesis, and federated_authority_boost are design-stage
      // and handled by the isDesignTool short-circuit at the top of this
      // function (Requirements 4.6).

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
}

// =====================================================
// MCP METHOD HANDLERS
// =====================================================

async function handleInitialize(params: Record<string, unknown>): Promise<unknown> {
  const clientInfo = params?.clientInfo as Record<string, unknown> | undefined;
  
  return {
    protocolVersion: MCP_SERVER_INFO.protocolVersion,
    capabilities: MCP_SERVER_INFO.capabilities,
    serverInfo: {
      name: MCP_SERVER_INFO.name,
      version: MCP_SERVER_INFO.version,
    },
    instructions: MCP_SERVER_INFO.instructions,
    // Echo client info if provided
    ...(clientInfo ? { clientInfo } : {}),
  };
}

async function handleToolsList(): Promise<unknown> {
  return {
    tools: getMcpTools(),
  };
}

async function handleToolsCall(params: Record<string, unknown>, req?: VercelRequest): Promise<unknown> {
  const name = params.name as string;
  const args = (params.arguments as Record<string, unknown>) || {};
  
  if (!name) {
    throw { code: -32602, message: 'Missing required parameter: name' };
  }
  
  return executeToolCall(name, args, req);
}

async function handleResourcesList(): Promise<unknown> {
  return {
    resources: MCP_RESOURCES,
  };
}

async function handleResourcesRead(params: Record<string, unknown>): Promise<unknown> {
  const uri = params.uri as string;
  
  if (!uri) {
    throw { code: -32602, message: 'Missing required parameter: uri' };
  }
  
  const resource = MCP_RESOURCES.find(r => r.uri === uri);
  if (!resource) {
    throw { code: -32602, message: `Resource not found: ${uri}` };
  }
  
  // Return resource content based on type
  let content: string;
  
  if (uri === 'anoteroslogos://schemas/tools') {
    content = JSON.stringify({
      openai: Object.values(GRAPH_TOOLS).map(toOpenAIFunction),
      claude: Object.values(GRAPH_TOOLS).map(toClaudeTool),
    }, null, 2);
  } else if (uri === 'anoteroslogos://config/agent') {
    content = JSON.stringify({
      v: '1.1',
      p: ['a2a', 'http', 'mcp'],
      u: 'https://anoteroslogos.com/api/a2a',
      s: 'geoaudit',
    }, null, 2);
  } else {
    content = `# ${resource.name}\n\n${resource.description}\n\nVisit https://anoteroslogos.com for full documentation.`;
  }
  
  return {
    contents: [
      {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: content,
      },
    ],
  };
}

async function handlePromptsList(): Promise<unknown> {
  return {
    prompts: MCP_PROMPTS,
  };
}

async function handlePromptsGet(params: Record<string, unknown>): Promise<unknown> {
  const name = params.name as string;
  const args = (params.arguments as Record<string, string>) || {};
  
  if (!name) {
    throw { code: -32602, message: 'Missing required parameter: name' };
  }
  
  const prompt = MCP_PROMPTS.find(p => p.name === name);
  if (!prompt) {
    throw { code: -32602, message: `Prompt not found: ${name}` };
  }
  
  // Generate prompt messages
  let messages: Array<{ role: string; content: { type: string; text: string } }>;
  
  switch (name) {
    case 'geo_audit_analysis':
      messages = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze the GEO audit results for ${args.url || '[URL]'}${args.focus_area ? ` with focus on ${args.focus_area}` : ''}. Use the anoteros_logos tool to get the current scores, then provide actionable recommendations to improve AI visibility and citation probability.`,
          },
        },
      ];
      break;
    
    case 'citation_optimization':
      messages = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze ${args.url || '[URL]'} and generate specific content recommendations to improve citation probability on ${args.target_platforms || 'all AI platforms'}. Use predictCitation to get current probabilities, then use synthesizeNode to generate optimization suggestions.`,
          },
        },
      ];
      break;
    
    case 'knowledge_graph_query':
      messages = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Build and analyze the knowledge graph for ${args.domain || '[domain]'}${args.entity_types ? `, focusing on entity types: ${args.entity_types}` : ''}. Use getGraph to extract entities and relationships, then identify key authority signals and content gaps.`,
          },
        },
      ];
      break;
    
    default:
      messages = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt.description,
          },
        },
      ];
  }
  
  return {
    description: prompt.description,
    messages,
  };
}

// =====================================================
// MAIN HANDLER
// =====================================================

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated?: { method: string; params: unknown; id: string | number }
) {
  // GET - Return server info and tools in various formats
  if (req.method === 'GET') {
    const format = req.query.format as string;
    
    switch (format) {
      case 'openai':
        res.status(200).json(Object.values(ALL_TOOLS).map(toOpenAIFunction));
        return;
      case 'claude':
        res.status(200).json(Object.values(ALL_TOOLS).map(tool => toClaudeTool(tool)));
        return;
      case 'mcp':
        res.status(200).json({
          serverInfo: MCP_SERVER_INFO,
          tools: getMcpTools(),
          resources: MCP_RESOURCES,
          prompts: MCP_PROMPTS,
        });
        return;
      default:
        res.status(200).json({
          name: MCP_SERVER_INFO.name,
          version: MCP_SERVER_INFO.version,
          protocolVersion: MCP_SERVER_INFO.protocolVersion,
          endpoints: {
            jsonrpc: 'POST /api/mcp',
            openai: 'GET /api/mcp?format=openai',
            claude: 'GET /api/mcp?format=claude',
            mcp: 'GET /api/mcp?format=mcp',
          },
          documentation: 'https://anoteroslogos.com/agent-identity',
        });
        return;
    }
  }

  // POST - JSON-RPC 2.0 (validated by middleware)
  if (!validated) {
    res.status(400).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    });
    return;
  }

  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    id: validated.id,
  };
  
  try {
    const params = (validated.params || {}) as Record<string, unknown>;
    
    switch (validated.method) {
      case 'initialize':
        response.result = await handleInitialize(params);
        break;
      
      case 'tools/list':
        response.result = await handleToolsList();
        break;
      
      case 'tools/call':
        response.result = await handleToolsCall(params, req);
        break;
      
      case 'resources/list':
        response.result = await handleResourcesList();
        break;
      
      case 'resources/read':
        response.result = await handleResourcesRead(params);
        break;
      
      case 'prompts/list':
        response.result = await handlePromptsList();
        break;
      
      case 'prompts/get':
        response.result = await handlePromptsGet(params);
        break;
      
      case 'ping':
        response.result = { pong: true, timestamp: new Date().toISOString() };
        break;
      
      default:
        response.error = {
          code: -32601,
          message: 'Method not found',
          data: `Unknown method: ${validated.method}`,
        };
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      response.error = error as JsonRpcResponse['error'];
    } else {
      response.error = {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  res.status(response.error ? 400 : 200).json(response);
}

// Apply middleware: CORS -> Rate Limiting -> JSON-RPC Validation (for POST only)
const postHandler = compose(
  withCors,
  (handler) => withRateLimit(handler, { maxRequests: 100, windowMs: 60000 }),
  (handler) => withJsonRpcValidation(
    {
      'initialize': McpInitializeParamsSchema,
      'tools/call': McpToolsCallParamsSchema,
      'resources/read': McpResourcesReadParamsSchema,
      'prompts/get': McpPromptsGetParamsSchema,
    },
    handler as ValidatedApiHandler
  )
)(mainHandler);

// Export handler that routes GET vs POST
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return mainHandler(req, res);
  }
  return postHandler(req, res);
}

// Export executeToolCall for testing
export { executeToolCall };
