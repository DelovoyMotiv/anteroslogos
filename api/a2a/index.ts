/**
 * A2A Protocol HTTP Endpoint (Vercel Serverless Function)
 * Handles JSON-RPC 2.0 requests from AI agents
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  validateA2ARequest,
  detectAgent,
  createA2AResponse,
  createA2AErrorResponse,
  A2AContext,
  ERROR_CODES,
} from '../../lib/a2a/protocol';
import { checkRateLimit } from '../../lib/a2a/rateLimiter';
import { convertToA2AFormat } from '../../lib/a2a/adapter';
import { performGeoAudit } from '../../utils/geoAuditEnhanced';
import { getCachedAuditResult, cacheAuditResult } from '../../lib/a2a/cache';

// =====================================================
// CORS & HEADERS
// =====================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Info',
  'Content-Type': 'application/json',
  'X-A2A-Version': '1.0.0',
};

// =====================================================
// AUTHENTICATION
// =====================================================

/**
 * Extract and validate API key
 */
function extractApiKey(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) return null;
  
  // Support both "Bearer <key>" and "<key>"
  const match = authHeader.match(/^(?:Bearer )?(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Authenticate request (production would check against database)
 */
function authenticateRequest(apiKey: string | null): { valid: boolean; tier: string } {
  // In production: Check against Supabase database
  // For now: Simple validation
  
  if (!apiKey) {
    return { valid: false, tier: 'free' };
  }
  
  // Demo: Allow any key starting with "sk_" as valid
  if (apiKey.startsWith('sk_')) {
    // Parse tier from key prefix (in production, lookup from DB)
    if (apiKey.includes('_pro_')) return { valid: true, tier: 'pro' };
    if (apiKey.includes('_enterprise_')) return { valid: true, tier: 'enterprise' };
    return { valid: true, tier: 'basic' };
  }
  
  return { valid: false, tier: 'free' };
}

// =====================================================
// METHOD HANDLERS
// =====================================================

/**
 * Handle a2a.discover - Return protocol metadata
 */
async function handleDiscover() {
  return {
    protocol: 'A2A',
    version: '1.0.0',
    service: 'GEO Audit Platform',
    description: 'AI-native GEO audit service for analyzing websites visibility to AI systems',
    capabilities: [
      'geo.audit.request',
      'geo.audit.status',
      'geo.audit.result',
      'geo.audit.batch',
      'geo.insights.global',
      'geo.insights.industry',
      'geo.insights.domain',
    ],
    endpoints: {
      http: '/api/a2a',
      websocket: '/api/a2a/ws',
    },
    rate_limits: {
      free: { requests_per_minute: 10, burst: 5 },
      basic: { requests_per_minute: 60, burst: 20 },
      pro: { requests_per_minute: 300, burst: 100 },
      enterprise: { requests_per_minute: 1000, burst: 500 },
    },
    documentation: 'https://geoaudit.org/docs/a2a',
  };
}

/**
 * Handle a2a.capabilities - Return detailed capabilities
 */
async function handleCapabilities(_params: any, context: A2AContext) {
  return {
    methods: {
      'geo.audit.request': {
        description: 'Request a GEO audit for a URL',
        params: {
          url: { type: 'string', required: true },
          depth: { type: 'string', enum: ['quick', 'standard', 'deep'], default: 'standard' },
          include_recommendations: { type: 'boolean', default: true },
        },
      },
      'geo.audit.status': {
        description: 'Check audit status',
        params: {
          audit_id: { type: 'string', required: true },
        },
      },
      'geo.audit.result': {
        description: 'Get audit results',
        params: {
          audit_id: { type: 'string', required: true },
        },
      },
    },
    authentication: {
      type: 'Bearer',
      header: 'Authorization',
      format: 'Bearer <api_key>',
    },
    agent_info: context.agent_info,
  };
}

/**
 * Handle geo.audit.request - Perform GEO audit
 */
async function handleAuditRequest(params: any, context: A2AContext) {
  const { url } = params;
  
  if (!url || typeof url !== 'string') {
    throw createA2AErrorResponse(
      null,
      ERROR_CODES.INVALID_PARAMS,
      'Invalid URL parameter',
      { param: 'url' }
    );
  }
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw createA2AErrorResponse(
      null,
      ERROR_CODES.INVALID_PARAMS,
      'Invalid URL format',
      { url }
    );
  }
  
  // Check cache first
  const cached = getCachedAuditResult(url);
  if (cached) {
    return cached.result;
  }
  
  // Perform audit
  const startTime = Date.now();
  const auditResult = await performGeoAudit(url);
  const processingTime = Date.now() - startTime;
  
  // Convert to A2A format
  const a2aResult = convertToA2AFormat(auditResult, context, processingTime);
  
  // Cache result (1 hour TTL)
  cacheAuditResult(url, a2aResult, 60 * 60 * 1000);
  
  return a2aResult;
}

/**
 * Handle geo.audit.batch - Batch audit multiple URLs
 */
async function handleBatchAudit(params: any, context: A2AContext) {
  const { urls } = params;
  
  if (!Array.isArray(urls) || urls.length === 0) {
    throw createA2AErrorResponse(
      null,
      ERROR_CODES.INVALID_PARAMS,
      'Invalid urls parameter (must be non-empty array)',
      { urls }
    );
  }
  
  if (urls.length > 100) {
    throw createA2AErrorResponse(
      null,
      ERROR_CODES.INVALID_PARAMS,
      'Too many URLs (max 100 per batch)',
      { count: urls.length }
    );
  }
  
  // Process audits in parallel (with concurrency limit)
  const CONCURRENT_LIMIT = 5;
  const results = [];
  
  for (let i = 0; i < urls.length; i += CONCURRENT_LIMIT) {
    const batch = urls.slice(i, i + CONCURRENT_LIMIT);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        try {
          const startTime = Date.now();
          const auditResult = await performGeoAudit(url);
          const processingTime = Date.now() - startTime;
          return convertToA2AFormat(auditResult, context, processingTime);
        } catch (error) {
          return {
            url,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );
    results.push(...batchResults);
  }
  
  return {
    batch_id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    total: urls.length,
    completed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  };
}

/**
 * Handle a2a.ping - Simple health check
 */
async function handlePing(_params: any, context: A2AContext) {
  return {
    pong: true,
    timestamp: new Date().toISOString(),
    server_time: Date.now(),
    agent: context.agent_info?.name || 'Unknown',
  };
}

/**
 * Handle a2a.status - Server status
 */
async function handleStatus() {
  return {
    status: 'operational',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

// =====================================================
// METHOD ROUTER
// =====================================================

/**
 * Route request to appropriate handler
 */
async function routeMethod(method: string, params: any, context: A2AContext): Promise<any> {
  switch (method) {
    case 'a2a.discover':
      return handleDiscover();
    
    case 'a2a.capabilities':
      return handleCapabilities(params, context);
    
    case 'geo.audit.request':
      return handleAuditRequest(params, context);
    
    case 'geo.audit.batch':
      return handleBatchAudit(params, context);
    
    case 'a2a.ping':
      return handlePing(params, context);
    
    case 'a2a.status':
      return handleStatus();
    
    // Not implemented yet
    case 'geo.audit.status':
    case 'geo.audit.result':
    case 'geo.insights.global':
    case 'geo.insights.industry':
    case 'geo.insights.domain':
      throw createA2AErrorResponse(
        null,
        ERROR_CODES.METHOD_NOT_FOUND,
        `Method ${method} is not yet implemented`,
        { method }
      );
    
    default:
      throw createA2AErrorResponse(
        null,
        ERROR_CODES.METHOD_NOT_FOUND,
        `Unknown method: ${method}`,
        { method }
      );
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json(
      createA2AErrorResponse(
        null,
        ERROR_CODES.INVALID_REQUEST,
        'Method not allowed (use POST)',
        { method: req.method }
      )
    );
  }
  
  try {
    // Extract API key
    const apiKey = extractApiKey(req);
    
    // Authenticate
    const auth = authenticateRequest(apiKey);
    
    // Rate limiting
    const rateLimitResult = await checkRateLimit(apiKey || 'anonymous', auth.tier);
    
    if (!rateLimitResult.allowed) {
      res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt);
      
      return res.status(429).json(
        createA2AErrorResponse(
          null,
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          {
            limit: rateLimitResult.limit,
            reset_at: rateLimitResult.resetAt,
          }
        )
      );
    }
    
    // Parse and validate request
    const validation = validateA2ARequest(req.body);
    
    if (!validation.valid) {
      return res.status(400).json(
        createA2AErrorResponse(
          null,
          ERROR_CODES.INVALID_REQUEST,
          'Invalid JSON-RPC request',
          { errors: validation.errors }
        )
      );
    }
    
    const request = validation.request!;
    
    // Detect agent
    const userAgent = req.headers['user-agent'] || '';
    const agentInfo = detectAgent(userAgent);
    
    // Build context
    const context: A2AContext = {
      request_id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      api_key: apiKey || undefined,
      tier: auth.tier,
      agent_info: agentInfo || undefined,
      ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    };
    
    // Route to handler
    const result = await routeMethod(request.method, request.params || {}, context);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt);
    
    // Return response
    return res.status(200).json(
      createA2AResponse(request.id ?? null, result)
    );
    
  } catch (error: any) {
    console.error('A2A API Error:', error);
    
    // If error is already an A2A error response, return it
    if (error.jsonrpc === '2.0' && error.error) {
      return res.status(error.error.code === ERROR_CODES.RATE_LIMIT_EXCEEDED ? 429 : 400).json(error);
    }
    
    // Generic error
    return res.status(500).json(
      createA2AErrorResponse(
        null,
        ERROR_CODES.INTERNAL_ERROR,
        'Internal server error',
        { message: error.message }
      )
    );
  } finally {
    // Set CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
}
