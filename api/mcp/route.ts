/**
 * Unified MCP API Endpoint - Graph Tool #1 for AI Agents
 * 
 * Supports:
 * - OpenAI Assistants & function calling
 * - Claude Tools
 * - Grok Tools
 * - LangGraph, CrewAI, AutoGen
 * - Raw JSON-RPC 2.0
 * 
 * Auto-detects request format and responds accordingly
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exportAllTools, generateOpenAPISpec } from '../../lib/mcp/schemas';
import { logger } from '../../lib/a2a/logger';
import { checkRateLimit } from '../../lib/a2a/rateLimiter';
import { validateApiKey, recordAgentActivity } from '../../lib/a2a/agentRegistry';
import crypto from 'crypto';
import type {
  ToolExecutionResponse,
  ToolExecutionContext,
  ToolParameters,
  GraphNode,
  GraphEdge,
  CausalGraph,
  CausalCitationTraceResult,
  PredictiveSynthesisResult,
  AuthorityProofResult,
  KnowledgeGraph,
} from '../../lib/mcp/types';

// =====================================================
// FORMAT DETECTION
// =====================================================

function detectRequestFormat(body: Record<string, unknown>): 'openai' | 'claude' | 'grok' | 'jsonrpc' | 'unknown' {
  // OpenAI format: { model, messages, tools, tool_choice }
  if (body.tools && Array.isArray(body.tools) && body.tools[0]?.type === 'function') {
    return 'openai';
  }
  
  // Claude format: { model, messages, tools } where tools have input_schema
  if (body.tools && Array.isArray(body.tools) && body.tools[0]?.input_schema) {
    return 'claude';
  }
  
  // Grok format: similar to OpenAI but may have examples
  if (body.tools && Array.isArray(body.tools) && body.tools[0] && 
      typeof body.tools[0] === 'object' && body.tools[0] !== null &&
      'function' in body.tools[0]) {
    const func = (body.tools[0] as Record<string, unknown>).function;
    if (func && typeof func === 'object' && func !== null && 'examples' in func) {
      return 'grok';
    }
  }
  
  // JSON-RPC 2.0: { jsonrpc, method, params, id }
  if (body.jsonrpc === '2.0' && body.method) {
    return 'jsonrpc';
  }
  
  // Direct tool call: { tool, parameters }
  if (body.tool && body.parameters) {
    return 'jsonrpc';
  }
  
  return 'unknown';
}

// =====================================================
// TOOL EXECUTION
// =====================================================

async function executeTool(toolName: string, params: ToolParameters, _context: ToolExecutionContext): Promise<unknown> {
  logger.info('Executing tool', { tool: toolName, params });
  
  // Route to appropriate handler
  switch (toolName) {
    case 'auditSite':
      return await executeAuditSite(params as { url: string; useAI?: boolean });
    
    case 'getGraph':
      return await executeGetGraph(params as { url: string });
    
    case 'predictCitation':
      return await executePredictCitation(params as { url: string; platform?: string });
    
    case 'synthesizeNode':
      return await executeSynthesizeNode(params as { url: string; targetKeywords?: string[] });
    
    case 'causal_citation_trace':
      return await executeCausalCitationTrace(params as { url: string; query: string });
    
    case 'predictive_synthesis':
      return await executePredictiveSynthesis(params as { url: string; targetIncrease: number });
    
    case 'federated_authority_boost':
      return await executeFederatedAuthorityBoost(params as { url: string; includePrivateData?: boolean });
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// =====================================================
// TOOL IMPLEMENTATIONS
// =====================================================

async function executeAuditSite(params: { url: string; useAI?: boolean }): Promise<unknown> {
  // Validate URL
  if (!params.url || typeof params.url !== 'string') {
    throw new Error('Invalid URL parameter');
  }
  
  try {
    new URL(params.url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  const { performGeoAudit } = await import('../../utils/geoAuditEnhanced');
  const result = await performGeoAudit(params.url, { useAI: params.useAI || false });
  return result;
}

async function executeGetGraph(params: { url: string }): Promise<KnowledgeGraph> {
  // Validate URL
  if (!params.url || typeof params.url !== 'string') {
    throw new Error('Invalid URL parameter');
  }
  
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(params.url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  // Only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols are allowed');
  }
  
  const { KnowledgeGraphBuilder } = await import('../../utils/knowledgeGraph/builder');
  
  // Fetch HTML content with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(params.url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'AnoterosLogos-MCP/2.0 (Graph Tool)'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const domain = parsedUrl.hostname;
    
    const builder = new KnowledgeGraphBuilder(domain);
    const graphResult = await builder.buildFromHTML(html, params.url);
    
    // Map to KnowledgeGraph type
    const graph: KnowledgeGraph = {
      id: graphResult.id,
      domain: graphResult.domain,
      entities: graphResult.entities,
      relationships: graphResult.relationships,
      claims: graphResult.claims,
      metadata: {
        created: graphResult.metadata.createdAt,
        sourceUrl: params.url,
        updatedAt: graphResult.metadata.updatedAt,
        version: graphResult.metadata.version,
        entityCount: graphResult.metadata.entityCount,
        relationshipCount: graphResult.metadata.relationshipCount,
        claimCount: graphResult.metadata.claimCount,
      },
    };
    
    return graph;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout (10s limit)');
    }
    throw error;
  }
}

async function executePredictCitation(params: { url: string; platform?: string }): Promise<Record<string, number>> {
  // Validate URL
  if (!params.url || typeof params.url !== 'string') {
    throw new Error('Invalid URL parameter');
  }
  
  try {
    new URL(params.url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  const { performGeoAudit } = await import('../../utils/geoAuditEnhanced');
  const audit = await performGeoAudit(params.url, { useAI: false });
  
  // Calculate citation probability based on GEO score
  const platform = params.platform || 'all';
  const baseProb = Math.max(0, Math.min(1, audit.overallScore / 100));
  
  const probabilities: Record<string, number> = {
    ChatGPT: baseProb * 0.95,
    Claude: baseProb * 0.92,
    Perplexity: baseProb * 0.98,
    Gemini: baseProb * 0.90,
    Grok: baseProb * 0.88,
  };
  
  return platform === 'all' 
    ? probabilities 
    : { [platform]: probabilities[platform as keyof typeof probabilities] || 0 };
}

async function executeSynthesizeNode(params: { url: string; targetKeywords?: string[] }): Promise<unknown> {
  const { performGeoAudit } = await import('../../utils/geoAuditEnhanced');
  const audit = await performGeoAudit(params.url, { useAI: false });
  
  // Generate content recommendations
  const recommendations = [
    {
      type: 'schema_enhancement',
      description: 'Add FAQPage schema for common questions',
      impact: 'high',
      effort: 'moderate',
    },
    {
      type: 'content_gap',
      description: 'Create comprehensive guide on target keywords',
      impact: 'very_high',
      effort: 'complex',
      targetKeywords: params.targetKeywords || [],
    },
  ];
  
  return {
    currentScore: audit.overallScore,
    recommendations,
    predictedScoreAfter: audit.overallScore + 15,
  };
}

// =====================================================
// NEW UNIQUE TOOLS
// =====================================================

async function executeCausalCitationTrace(params: { url: string; query: string; platform?: string; competitors?: string[] }): Promise<CausalCitationTraceResult> {
  // Validate inputs
  if (!params.url || typeof params.url !== 'string') {
    throw new Error('Invalid URL parameter');
  }
  
  if (!params.query || typeof params.query !== 'string') {
    throw new Error('Invalid query parameter');
  }
  
  if (params.query.length > 500) {
    throw new Error('Query too long (max 500 characters)');
  }
  
  try {
    new URL(params.url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  // Validate competitors if provided
  if (params.competitors) {
    if (!Array.isArray(params.competitors)) {
      throw new Error('competitors must be an array');
    }
    if (params.competitors.length > 10) {
      throw new Error('Maximum 10 competitors allowed');
    }
    for (const comp of params.competitors) {
      try {
        new URL(comp);
      } catch {
        throw new Error(`Invalid competitor URL: ${comp}`);
      }
    }
  }
  
  // Import CausalTracerEngine
  const { CausalTracerEngine } = await import('../../lib/causalTracer/engine');
  const { performGeoAudit } = await import('../../utils/geoAuditEnhanced');
  
  // Initialize engine
  const engine = new CausalTracerEngine();
  
  // Build graph from site audit
  const audit = await performGeoAudit(params.url, { useAI: false });
  
  // Convert audit to causal graph
  const graphId = `graph_${Date.now()}`;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Create nodes from audit metrics
  let nodeIdCounter = 0;
  
  // Authority node
  const authorityId = `node_${nodeIdCounter++}`;
  nodes.push({
    id: authorityId,
    type: 'authority',
    label: `Authority Score: ${audit.overallScore}`,
    weight: audit.overallScore / 100,
    metadata: {
      score: audit.overallScore,
      source: 'geoaudit',
    },
  });
  
  // Schema node
  if (audit.scores.schemaMarkup > 0) {
    const schemaId = `node_${nodeIdCounter++}`;
    nodes.push({
      id: schemaId,
      type: 'structured_data',
      label: `Schema: ${audit.scores.schemaMarkup}`,
      weight: audit.scores.schemaMarkup / 100,
      metadata: {
        score: audit.scores.schemaMarkup,
      },
    });
    edges.push({
      id: `edge_${edges.length}`,
      source: schemaId,
      target: authorityId,
      type: 'enhances',
      weight: 0.3,
    });
  }
  
  // Content quality node
  if (audit.scores.contentQuality > 0) {
    const contentId = `node_${nodeIdCounter++}`;
    nodes.push({
      id: contentId,
      type: 'content_quality',
      label: `Content: ${audit.scores.contentQuality}`,
      weight: audit.scores.contentQuality / 100,
      metadata: {
        score: audit.scores.contentQuality,
      },
    });
    edges.push({
      id: `edge_${edges.length}`,
      source: contentId,
      target: authorityId,
      type: 'enhances',
      weight: 0.25,
    });
  }
  
  // E-E-A-T node
  if (audit.scores.eeat > 0) {
    const eeatId = `node_${nodeIdCounter++}`;
    nodes.push({
      id: eeatId,
      type: 'eeat_signal',
      label: `E-E-A-T: ${audit.scores.eeat}`,
      weight: audit.scores.eeat / 100,
      metadata: {
        score: audit.scores.eeat,
      },
    });
    edges.push({
      id: `edge_${edges.length}`,
      source: eeatId,
      target: authorityId,
      type: 'validates',
      weight: 0.35,
    });
  }
  
  // Citation decision node
  const citationNodeId = `node_${nodeIdCounter++}`;
  nodes.push({
    id: citationNodeId,
    type: 'citation_decision',
    label: 'LLM Citation Decision',
    weight: 1.0,
    metadata: {
      query: params.query,
      platform: params.platform || 'Perplexity',
    },
  });
  
  edges.push({
    id: `edge_${edges.length}`,
    source: authorityId,
    target: citationNodeId,
    type: 'influences',
    weight: 0.5,
  });
  
  const graph: CausalGraph = {
    id: graphId,
    nodes,
    edges,
    metadata: {
      url: params.url,
      query: params.query,
      created: new Date().toISOString(),
    },
  };
  
  engine.addGraph(graph);
  
  // Trace citation path
  // Convert platform name to lowercase for LLMPlatform type
  const platformMapping: Record<string, 'perplexity' | 'chatgpt' | 'claude' | 'gemini' | 'grok'> = {
    'Perplexity': 'perplexity',
    'ChatGPT': 'chatgpt',
    'Claude': 'claude',
    'Gemini': 'gemini',
    'Grok': 'grok',
  };
  const platformInput = params.platform || 'Perplexity';
  const platform = platformMapping[platformInput] || 'perplexity';
  
  const traceResult = await engine.traceCitationPath(
    graphId,
    citationNodeId,
    params.query,
    platform
  );
  
  // Explain why chosen
  const explanation = await engine.explainWhyChosen(
    graphId,
    citationNodeId,
    params.query,
    platform,
    params.competitors || []
  );
  
  return {
    url: params.url,
    query: params.query,
    platform: platformInput,
    trace: {
      paths: traceResult.paths.map((p: any) => ({
        nodes: p.nodes.map((n: any) => n.id),
        score: p.score,
        causalStrength: p.causalStrength,
        criticalNodes: p.criticalNodes,
      })),
      overallProbability: traceResult.citationProbability,
      confidenceLevel: traceResult.confidence > 0.8 ? 'high' : traceResult.confidence > 0.6 ? 'medium' : 'low',
    },
    explanation: {
      reasonChosen: explanation.reasonChosen,
      keyFactors: explanation.keyFactors.map((f: any) => ({
        factor: f.factor,
        impact: f.impact,
        evidence: f.evidence,
      })),
      platformBias: explanation.platformBias,
      competitivePosition: {
        position: explanation.competitivePosition.position as 'leader' | 'challenger' | 'follower',
        advantage: explanation.competitivePosition.advantage,
      },
      nearMisses: explanation.nearMisses.map((nm: any) => ({
        competitorUrl: nm.competitorUrl,
        scoreGap: nm.scoreGap,
      })),
    },
    metadata: {
      graphNodes: nodes.length,
      graphEdges: edges.length,
      processingTimeMs: Math.round(traceResult.computationTime || 0),
    },
  };
}

async function executePredictiveSynthesis(params: { url: string; targetIncrease: number }): Promise<PredictiveSynthesisResult> {
  // Validate inputs
  if (!params.url || typeof params.url !== 'string') {
    throw new Error('Invalid URL parameter');
  }
  
  if (typeof params.targetIncrease !== 'number' || isNaN(params.targetIncrease)) {
    throw new Error('Invalid targetIncrease parameter (must be number)');
  }
  
  if (params.targetIncrease <= 0 || params.targetIncrease > 100) {
    throw new Error('targetIncrease must be between 1 and 100');
  }
  
  try {
    new URL(params.url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  const { performGeoAudit } = await import('../../utils/geoAuditEnhanced');
  const audit = await performGeoAudit(params.url, { useAI: false });
  
  const currentScore = audit.overallScore;
  const targetScore = Math.min(100, currentScore + params.targetIncrease);
  
  // Generate recommendations to reach target
  const recommendations = [];
  let cumulativeIncrease = 0;
  
  // Schema improvements
  if (audit.scores.schemaMarkup < 90) {
    const schemaImpact = Math.min(15, params.targetIncrease - cumulativeIncrease);
    recommendations.push({
      type: 'schema_addition' as const,
      schema: 'FAQPage + HowTo + Article',
      impact: `+${schemaImpact}% visibility`,
      effort: 'moderate' as const,
      priority: 1,
    });
    cumulativeIncrease += schemaImpact;
  }
  
  // Content gaps
  if (cumulativeIncrease < params.targetIncrease) {
    const contentImpact = Math.min(20, params.targetIncrease - cumulativeIncrease);
    recommendations.push({
      type: 'content_gap' as const,
      topic: 'Comprehensive implementation guides',
      impact: `+${contentImpact}% visibility`,
      effort: 'complex' as const,
      priority: 2,
    });
    cumulativeIncrease += contentImpact;
  }
  
  // E-E-A-T enhancement
  if (cumulativeIncrease < params.targetIncrease) {
    const eeatImpact = params.targetIncrease - cumulativeIncrease;
    recommendations.push({
      type: 'eeat_enhancement' as const,
      action: 'Add author bios, expert quotes, external citations',
      impact: `+${eeatImpact}% visibility`,
      effort: 'moderate' as const,
      priority: 3,
    });
    cumulativeIncrease += eeatImpact;
  }
  
  return {
    url: params.url,
    currentScore,
    targetScore,
    targetIncrease: params.targetIncrease,
    recommendedChanges: recommendations,
    totalPredictedIncrease: Math.round(cumulativeIncrease * 10) / 10,
    confidence: 0.85,
    timelineEstimate: '2-4 weeks',
  };
}

async function executeFederatedAuthorityBoost(params: { url: string; includePrivateData?: boolean }): Promise<AuthorityProofResult> {
  // Validate URL
  if (!params.url || typeof params.url !== 'string') {
    throw new Error('Invalid URL parameter');
  }
  
  try {
    new URL(params.url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  const { performGeoAudit } = await import('../../utils/geoAuditEnhanced');
  const audit = await performGeoAudit(params.url, { useAI: false });
  
  // Generate cryptographic proof using Ed25519
  const proofData = {
    url: params.url,
    timestamp: new Date().toISOString(),
    participatesInNetwork: audit.overallScore > 50,
    // Include hashed score if private, actual score if public
    scoreHash: params.includePrivateData 
      ? crypto.createHash('sha256').update(audit.overallScore.toString()).digest('hex')
      : null,
    actualScore: !params.includePrivateData ? audit.overallScore : null,
  };
  
  // Create deterministic proof using SHA-256 HMAC
  const proofString = JSON.stringify(proofData);
  const hmacKey = crypto.createHash('sha256').update(params.url + process.env.PROOF_SECRET || 'default-secret').digest();
  const signature = crypto.createHmac('sha256', hmacKey).update(proofString).digest('hex');
  const proof = `authority_proof_${signature.substring(0, 32)}`;
  
  // Calculate deterministic network nodes based on audit metrics
  const networkNodes = proofData.participatesInNetwork 
    ? Math.floor(audit.overallScore / 2) + Math.floor((audit.scores.eeat + audit.scores.citationPotential) / 4)
    : 0;
  
  return {
    proof,
    authorityScore: params.includePrivateData ? 'hidden' : audit.overallScore,
    participatesInNetwork: proofData.participatesInNetwork,
    verifiable: true,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    networkNodes,
    verificationUrl: `https://anoteroslogos.com/verify/${proof}`,
  };
}

// =====================================================
// MAIN HANDLER
// =====================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const startTime = Date.now();
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  
  // GET: Return tool schemas
  if (req.method === 'GET') {
    const format = req.query.format as string || 'openapi';
    
    switch (format) {
      case 'openai':
        return res.json({ tools: exportAllTools().openai });
      
      case 'claude':
        return res.json({ tools: exportAllTools().claude });
      
      case 'grok':
        return res.json({ tools: exportAllTools().grok });
      
      case 'openapi':
      default:
        return res.json(generateOpenAPISpec());
    }
  }
  
  // POST: Execute tool
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET and POST methods are allowed',
      },
    });
  }
  
  try {
    // Extract API key
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer /i, '');
    
    // Validate API key
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'API key required',
        },
      });
    }
    
    const auth = validateApiKey(apiKey);
    if (!auth.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: auth.reason || 'Invalid API key',
        },
      });
    }
    
    // Rate limiting
    const rateLimitResult = await checkRateLimit(apiKey, auth.agent!.rate_limit_tier);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          details: {
            limit: rateLimitResult.limit,
            resetAt: rateLimitResult.resetAt,
          },
        },
      });
    }
    
    // Detect format
    const format = detectRequestFormat(req.body);
    logger.info('MCP request received', { format, requestId });
    
    let toolName: string;
    let params: Record<string, any>;
    
    // Parse request based on format
    if (format === 'jsonrpc' && req.body.tool) {
      // Direct tool call
      toolName = req.body.tool;
      params = req.body.parameters || {};
    } else if (format === 'jsonrpc' && req.body.method) {
      // JSON-RPC 2.0
      toolName = req.body.method;
      params = req.body.params || {};
    } else if (format === 'openai' || format === 'claude' || format === 'grok') {
      // Tool call from agent messages
      const toolCalls = req.body.tool_calls || req.body.tools;
      if (!toolCalls || toolCalls.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_TOOL_CALL',
            message: 'No tool call found in request',
          },
        });
      }
      
      const toolCall = toolCalls[0];
      toolName = toolCall.function?.name || toolCall.name;
      params = toolCall.function?.arguments 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.input || {};
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNKNOWN_FORMAT',
          message: 'Could not detect request format',
        },
      });
    }
    
    // Execute tool
    const result = await executeTool(toolName, params, {
      requestId,
      agentId: auth.agent!.id,
    });
    
    const executionTime = Date.now() - startTime;
    
    // Record activity
    recordAgentActivity(auth.agent!.id, {
      ip_address: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      user_agent: req.headers['user-agent'],
      response_time_ms: executionTime,
      success: true,
    });
    
    // Format response
    const response: ToolExecutionResponse = {
      success: true,
      result,
      metadata: {
        executionTimeMs: executionTime,
      },
    };
    
    logger.info('MCP request completed', { requestId, executionTime });
    
    return res.status(200).json(response);
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('MCP request failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        executionTimeMs: executionTime,
      },
    });
  }
}
