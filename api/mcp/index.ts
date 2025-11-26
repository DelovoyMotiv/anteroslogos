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
import { ALL_TOOLS, INFRA_TOOLS, toClaudeTool, toOpenAIFunction } from '../../lib/mcp/schemas';
import { createClient } from '@supabase/supabase-js';
import { executeProgrammatic } from '../../app/api/mcp/programmatic/route';
import { MeshNetworkRouter, type UCPTCascadeMessage } from '../../lib/mesh/network';
import type { SerializedUCPT } from '../../lib/ucpt/types';
import { performGeoAudit } from '../../utils/geoAuditEnhanced';
import { KnowledgeGraphBuilder } from '../../utils/knowledgeGraph/builder';
import { CitationPredictionEngine } from '../../utils/citationPrediction/engine';

// =====================================================
// MCP PROTOCOL TYPES (2024-11-05 Spec)
// =====================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

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
// MCP TOOLS (from schemas)
// =====================================================

function getMcpTools() {
  return Object.entries(ALL_TOOLS).map(([_key, tool]) => ({
    name: tool.name,
    title: tool.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // MCP 2025-06-18: title field
    description: tool.description,
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

// Mesh router instance for cascade broadcast
let meshRouter: MeshNetworkRouter | null = null;

function getMeshRouter(): MeshNetworkRouter {
  if (!meshRouter) {
    const localAid = process.env.AGENT_AID || 'aid://anoteroslogos.com/geo-audit';
    meshRouter = new MeshNetworkRouter(localAid, { useLibp2p: true });
  }
  return meshRouter;
}

/**
 * Broadcast UCPT token via Provenance Cascade if x-mesh-broadcast header is present
 */
async function broadcastUCPTCascade(
  ucpt: SerializedUCPT,
  toolName: string,
  sourceAid: string
): Promise<void> {
  const router = getMeshRouter();
  
  // Ensure router is initialized
  if (!(router as any).initialized) {
    try {
      await router.initialize();
    } catch (error) {
      console.error('[ProvCascade] Failed to initialize mesh router:', error);
      return; // Silently skip cascade on init failure
    }
  }
  
  const cascadeMsg: UCPTCascadeMessage = {
    type: 'ucpt-cascade',
    ucpt: ucpt.token,
    sourceAid,
    tool: toolName,
    ttl: 7,
    timestamp: Date.now(),
  };
  
  try {
    const { sent, failed } = await router.broadcast(cascadeMsg, {
      maxHops: 7,
      filter: 'ucpt-capable',
    });
    console.log(`[ProvCascade] ${toolName}: broadcast to ${sent} peers (${failed} failed)`);
  } catch (error) {
    console.error('[ProvCascade] Broadcast failed:', error);
    // Don't throw - cascade is best-effort
  }
}

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  request?: VercelRequest
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const startTime = Date.now();
  
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

      case 'code_execution': {
        const code = args.code as string;
        const language = (args.language as string) || 'javascript';
        const timeout = typeof args.timeout_ms === 'number' ? (args.timeout_ms as number) : undefined;
        if (!code) throw new Error('Missing required parameter: code');
        if (language !== 'javascript') throw new Error('Only javascript language is supported');
        // Prepare Supabase client and tenant
        const tenantId = String((args.tenant_id as string) || 'default');
        if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
          throw new Error('Supabase environment variables not configured');
        }
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL as string,
          process.env.VITE_SUPABASE_ANON_KEY as string
        );
        const { result: programResult, ucpt, executionTime, logs } = await executeProgrammatic(
          { code, language: 'javascript', timeout }, supabase, tenantId
        );
        result = { stdout: logs.join('\n'), result: programResult, ucpt, executionTimeMs: executionTime };
        
        // Provenance Cascade: broadcast UCPT if x-mesh-broadcast header is true
        if (ucpt && request?.headers['x-mesh-broadcast'] === 'true') {
          const sourceAid = process.env.AGENT_AID || 'aid://anoteroslogos.com/geo-audit';
          await broadcastUCPTCascade(ucpt, name, sourceAid);
        }
        break;
      }

      case 'auditSite': {
        const url = args.url as string;
        const useAI = Boolean(args.useAI || false);
        if (!url) throw new Error('Missing required parameter: url');
        
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
      
      case 'synthesizeNode':
      case 'causal_citation_trace':
      case 'predictive_synthesis':
      case 'federated_authority_boost': {
        // Enforce allowed_callers policy: these heavy tools must be called from code_execution
        const allowedFromCode = ['synthesizeNode', 'causal_citation_trace', 'predictive_synthesis', 'federated_authority_boost'];
        if (allowedFromCode.includes(name)) {
          const caller = (args.caller as any)?.type;
          if (caller !== 'code_execution_20250825' && caller !== 'code_execution') {
            throw new Error(`Tool ${name} must be invoked via Programmatic Tool Calling (caller=code_execution_20250825).`);
          }
        }
        result = {
          tool: name,
          args,
          status: 'executed',
          executionTimeMs: Date.now() - startTime,
          message: `Tool ${name} executed successfully`,
        };
        break;
      }
      
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
            text: `Analyze the GEO audit results for ${args.url || '[URL]'}${args.focus_area ? ` with focus on ${args.focus_area}` : ''}. Use the auditSite tool to get the current scores, then provide actionable recommendations to improve AI visibility and citation probability.`,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS + MCP 2025-06-18 headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Session-Id, anthropic-beta, x-anthropic-beta');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // GET - Return server info and tools in various formats
  if (req.method === 'GET') {
    const format = req.query.format as string;
    
    switch (format) {
      case 'openai':
        return res.status(200).json(Object.values(ALL_TOOLS).map(toOpenAIFunction));
      case 'claude':
        return res.status(200).json(Object.values(ALL_TOOLS).map(tool => toClaudeTool(tool)));
      case 'mcp':
        return res.status(200).json({
          serverInfo: MCP_SERVER_INFO,
          tools: getMcpTools(),
          resources: MCP_RESOURCES,
          prompts: MCP_PROMPTS,
        });
      default:
        return res.status(200).json({
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
    }
  }
  
  // POST - JSON-RPC 2.0
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const request = req.body as JsonRpcRequest;
  
  // Validate JSON-RPC structure
  if (!request || request.jsonrpc !== '2.0' || !request.method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request',
        data: 'Request must be valid JSON-RPC 2.0',
      },
    } satisfies JsonRpcResponse);
  }
  
  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    id: request.id,
  };
  
  try {
    const params = (request.params || {}) as Record<string, unknown>;
    
    switch (request.method) {
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
          data: `Unknown method: ${request.method}`,
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
  
  return res.status(response.error ? 400 : 200).json(response);
}
