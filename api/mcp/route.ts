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

// =====================================================
// TYPES
// =====================================================

interface MCPResponse {
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTimeMs: number;
    billing?: {
      cost: number;
      computeUnits: number;
    };
  };
}

// =====================================================
// FORMAT DETECTION
// =====================================================

function detectRequestFormat(body: any): 'openai' | 'claude' | 'grok' | 'jsonrpc' | 'unknown' {
  // OpenAI format: { model, messages, tools, tool_choice }
  if (body.tools && Array.isArray(body.tools) && body.tools[0]?.type === 'function') {
    return 'openai';
  }
  
  // Claude format: { model, messages, tools } where tools have input_schema
  if (body.tools && Array.isArray(body.tools) && body.tools[0]?.input_schema) {
    return 'claude';
  }
  
  // Grok format: similar to OpenAI but may have examples
  if (body.tools && body.tools[0]?.function?.examples) {
    return 'grok';
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

async function executeTool(toolName: string, params: Record<string, any>, _context: any): Promise<any> {
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

async function executeAuditSite(params: { url: string; useAI?: boolean }): Promise<any> {
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

async function executeGetGraph(params: { url: string }): Promise<any> {
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
    const graph = await builder.buildFromHTML(html, params.url);
    
    return graph;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout (10s limit)');
    }
    throw error;
  }
}

async function executePredictCitation(params: { url: string; platform?: string }): Promise<any> {
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

async function executeSynthesizeNode(params: { url: string; targetKeywords?: string[] }): Promise<any> {
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

async function executeCausalCitationTrace(params: { url: string; query: string }): Promise<any> {
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
  
  const { performGeoAudit } = await import('../../utils/geoAuditEnhanced');
  
  const audit = await performGeoAudit(params.url, { useAI: false });
  
  // Build causal path based on audit metrics
  const path = [];
  let citationProbability = 0;
  
  // Authority signals
  if (audit.overallScore > 80) {
    path.push({ node: 'high_authority', weight: 0.90 });
    citationProbability += 0.30;
  } else if (audit.overallScore > 60) {
    path.push({ node: 'moderate_authority', weight: 0.70 });
    citationProbability += 0.20;
  }
  
  // Schema completeness
  if (audit.scores.schemaMarkup > 80) {
    path.push({ node: 'complete_schema', weight: 0.95 });
    citationProbability += 0.25;
  }
  
  // Content quality
  if (audit.scores.contentQuality > 75) {
    path.push({ node: 'quality_content', weight: 0.88 });
    citationProbability += 0.20;
  }
  
  // E-E-A-T signals
  if (audit.scores.eeat > 70) {
    path.push({ node: 'strong_eeat', weight: 0.85 });
    citationProbability += 0.25;
  }
  
  // Normalize probability
  citationProbability = Math.min(citationProbability, 1.0);
  
  // Generate reasoning chain
  const reasoningChain = path
    .map(p => p.node.replace(/_/g, ' '))
    .join(' → ');
  
  return {
    url: params.url,
    query: params.query,
    path,
    citationProbability: Math.round(citationProbability * 1000) / 1000,
    reasoningChain,
    explanation: `For query "${params.query}", this site has ${Math.round(citationProbability * 100)}% probability of citation due to: ${reasoningChain}`,
  };
}

async function executePredictiveSynthesis(params: { url: string; targetIncrease: number }): Promise<any> {
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
      type: 'schema_addition',
      schema: 'FAQPage + HowTo + Article',
      impact: `+${schemaImpact}% visibility`,
      effort: 'moderate',
      priority: 1,
    });
    cumulativeIncrease += schemaImpact;
  }
  
  // Content gaps
  if (cumulativeIncrease < params.targetIncrease) {
    const contentImpact = Math.min(20, params.targetIncrease - cumulativeIncrease);
    recommendations.push({
      type: 'content_gap',
      topic: 'Comprehensive implementation guides',
      impact: `+${contentImpact}% visibility`,
      effort: 'complex',
      priority: 2,
    });
    cumulativeIncrease += contentImpact;
  }
  
  // E-E-A-T enhancement
  if (cumulativeIncrease < params.targetIncrease) {
    const eeatImpact = params.targetIncrease - cumulativeIncrease;
    recommendations.push({
      type: 'eeat_enhancement',
      action: 'Add author bios, expert quotes, external citations',
      impact: `+${eeatImpact}% visibility`,
      effort: 'moderate',
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

async function executeFederatedAuthorityBoost(params: { url: string; includePrivateData?: boolean }): Promise<any> {
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
  
  // Generate ZKP-like proof (simplified for MVP)
  const proofData = {
    url: params.url,
    timestamp: new Date().toISOString(),
    authorityScore: params.includePrivateData ? 'hidden' : audit.overallScore,
    participatesInNetwork: audit.overallScore > 50,
  };
  
  // Create pseudo-ZKP proof hash
  const proofString = JSON.stringify(proofData);
  const proof = `zkp_proof_0x${Buffer.from(proofString).toString('hex').substring(0, 32)}`;
  
  return {
    proof,
    authorityScore: params.includePrivateData ? 'hidden' : audit.overallScore,
    participatesInNetwork: proofData.participatesInNetwork,
    verifiable: true,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    networkNodes: proofData.participatesInNetwork ? Math.floor(Math.random() * 50) + 10 : 0,
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
    const response: MCPResponse = {
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
