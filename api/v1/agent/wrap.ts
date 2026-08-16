// @ts-nocheck
/**
 * Agent Middleware API Endpoint
 * 
 * POST /api/v1/agent/wrap - Extract and serialize web content
 * GET /api/v1/agent/wrap - Return OpenAPI documentation
 * 
 * This endpoint provides structured, token-optimized data extraction
 * for autonomous AI agents.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 7.2, 10.1**
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { wrapRequestSchema } from '../../../lib/engine/schemas';
import { AuthMiddleware } from '../../../lib/middleware/agentAuth';
import { 
  checkRateLimit, 
  recordRateLimitAttempt, 
  getRateLimitHeaders,
  getRateLimitMessage 
} from '../../../lib/middleware/agentRateLimiter';
import { CacheService } from '../../../lib/engine/cache';
import { ExtractionEngine } from '../../../lib/engine/extractor';
import { EntityExtractor } from '../../../lib/engine/entityExtractor';
import { SemanticSerializer } from '../../../lib/engine/serializer';
import type {
  WrapResponse,
  ErrorResponse,
  ErrorCode,
  KnowledgeGraph,
} from '../../../types/agent-middleware.types';
import { 
  AgentMiddlewareError, 
  getStatusCode,
} from '../../../lib/engine/errors';
import { logger, formatApiKey } from '../../../lib/a2a/logger';
import { openApiSpec } from '../../../lib/agentWrap/wrap-openapi';

// ============================================================================
// CONSTANTS
// ============================================================================

const AGENT_API_VERSION = '1.0.0';

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

const authMiddleware = new AuthMiddleware();
const cacheService = new CacheService(
  process.env.UPSTASH_REDIS_REST_URL,
  process.env.UPSTASH_REDIS_REST_TOKEN
);
const extractionEngine = new ExtractionEngine();
const entityExtractor = new EntityExtractor();
const semanticSerializer = new SemanticSerializer();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates an error response with consistent structure
 * Includes request_id for tracking and Retry-After header for rate limits
 */
function createErrorResponse(
  res: VercelResponse,
  code: ErrorCode | string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  requestId?: string
): void {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      details: {
        timestamp: new Date().toISOString(),
        request_id: requestId || generateRequestId(),
        ...details,
      },
    },
  };

  res.setHeader('X-Agent-Protocol-Version', AGENT_API_VERSION);
  
  // Add Retry-After header for rate limit errors
  if (code === 'ERR_RATE_LIMIT' && details?.retryAfter) {
    res.setHeader('Retry-After', String(details.retryAfter));
  }
  
  res.status(status).json(response);
}

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Logs request details with structured logging
 * **Validates: Requirements 8.1**
 */
function logRequest(
  url: string,
  mode: 'fast' | 'deep',
  format: 'json-ld' | 'compact',
  apiKeyId?: string,
  requestId?: string
): void {
  logger.info('Agent API request received', {
    url,
    mode,
    format,
    api_key_id: apiKeyId,
    request_id: requestId,
    tags: ['agent-api', 'request'],
  });
}

/**
 * Logs extraction completion with performance metrics
 * **Validates: Requirements 8.2**
 */
function logExtraction(
  url: string,
  latencyMs: number,
  cacheHit: boolean,
  tokenSavings?: number,
  requestId?: string
): void {
  logger.info('Agent API extraction completed', {
    url,
    latency_ms: latencyMs,
    cache_hit: cacheHit,
    token_savings: tokenSavings,
    request_id: requestId,
    duration_ms: latencyMs,
    tags: ['agent-api', 'extraction', 'performance'],
  });
}

/**
 * Logs errors with full context and stack traces
 * **Validates: Requirements 8.3**
 */
function logError(error: unknown, url?: string, requestId?: string): void {
  if (error instanceof Error) {
    logger.error('Agent API error occurred', {
      url,
      request_id: requestId,
      error_name: error.name,
      error_message: error.message,
      tags: ['agent-api', 'error'],
    }, error);
  } else {
    logger.error('Agent API error occurred', {
      url,
      request_id: requestId,
      error_message: String(error),
      tags: ['agent-api', 'error'],
    });
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const startTime = Date.now();
  let requestUrl: string | undefined;
  const requestId = generateRequestId();

  try {
    // Parse and validate request body
    const validation = wrapRequestSchema.safeParse(req.body);

    if (!validation.success) {
      createErrorResponse(
        res,
        'ERR_INVALID_URL',
        'Invalid request body',
        400,
        { errors: validation.error.errors },
        requestId
      );
      return;
    }

    const { url, mode = 'fast', format = 'compact' } = validation.data;
    requestUrl = url;

    // Authenticate request
    const authHeader = req.headers.authorization;
    const authResult = await authMiddleware.authenticate(authHeader);

    if (!authResult.success) {
      createErrorResponse(
        res,
        authResult.error!.code,
        authResult.error!.message,
        authResult.error!.code === 'ERR_AUTH_MISSING' ? 401 : 401,
        { url },
        requestId
      );
      return;
    }

    const apiKey = authResult.apiKey!;

    // Check rate limit
    const rateLimitResult = await checkRateLimit(apiKey.id, requestId);
    
    if (!rateLimitResult.allowed) {
      // Add rate limit headers
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      createErrorResponse(
        res,
        'ERR_RATE_LIMIT',
        getRateLimitMessage(rateLimitResult),
        429,
        { 
          url, 
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset.toISOString(),
        },
        requestId
      );
      return;
    }

    // Record rate limit attempt
    await recordRateLimitAttempt(apiKey.id, requestId);

    // Check quota
    const quotaResult = await authMiddleware.checkQuota(apiKey);

    if (!quotaResult.available) {
      // Log quota exceeded with remaining quota
      logger.warn('API quota exceeded', {
        url,
        api_key_id: apiKey.id,
        api_key_prefix: formatApiKey(apiKey.key_prefix),
        remaining_quota: quotaResult.remaining,
        request_id: requestId,
        tags: ['agent-api', 'quota', 'exceeded'],
      });

      createErrorResponse(
        res,
        quotaResult.error!.code,
        quotaResult.error!.message,
        402,
        { url, remaining: quotaResult.remaining },
        requestId
      );
      return;
    }

    // Log request with quota information
    logRequest(url, mode, format, apiKey.id, requestId);
    
    // Log remaining quota
    logger.debug('API quota check passed', {
      url,
      api_key_id: apiKey.id,
      remaining_quota: quotaResult.remaining,
      request_id: requestId,
      tags: ['agent-api', 'quota'],
    });

    // Check cache
    const cached = await cacheService.get(url, requestId);

    if (cached) {
      // Cache hit - return cached result
      const latencyMs = Date.now() - startTime;
      logExtraction(url, latencyMs, true, undefined, requestId);

      // Track usage
      await authMiddleware.trackUsage(apiKey, 1, requestId);

      // Add rate limit headers
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      res.setHeader('X-Agent-Protocol-Version', AGENT_API_VERSION);
      res.status(200).json(cached.data);
      return;
    }

    // Cache miss - perform extraction
    const extractionResult = await extractionEngine.extract(url, {
      mode,
      timeout: 15000,
    });

    // Extract entities for deep mode
    let knowledgeGraph: KnowledgeGraph | undefined;
    if (mode === 'deep') {
      const entities = entityExtractor.extractEntities(
        extractionResult.html,
        extractionResult.schemaMarkup
      );
      const relationships = entityExtractor.buildRelationships(entities);

      knowledgeGraph = {
        entities,
        relationships,
        metadata: {
          entity_count: entities.length,
          relationship_count: relationships.length,
          entity_types: entities.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          relationship_types: relationships.reduce((acc, r) => {
            acc[r.type] = (acc[r.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    }

    // Serialize knowledge graph
    const serializedKG = semanticSerializer.toCompactJson({
      entities: knowledgeGraph?.entities || [],
      relationships: knowledgeGraph?.relationships || [],
    });

    // Calculate token cost
    const tokenCost = semanticSerializer.calculateTokenCost(
      {
        entities: knowledgeGraph?.entities || [],
        relationships: knowledgeGraph?.relationships || [],
      },
      format
    );

    // Build response
    const latencyMs = Date.now() - startTime;
    const response: WrapResponse = {
      meta: {
        target_url: url,
        timestamp: new Date().toISOString(),
        latency_ms: latencyMs,
        cost_tokens: tokenCost,
        cache_hit: false,
        mode,
        format,
      },
      content: {
        title: extractionResult.content.title,
        summary: extractionResult.content.summary,
        markdown: mode === 'deep' ? extractionResult.content.markdown : undefined,
        word_count: mode === 'deep' ? extractionResult.content.word_count : undefined,
      },
      knowledge_graph: serializedKG,
    };

    // Store in cache
    await cacheService.set(url, response, undefined, requestId);

    // Log extraction
    logExtraction(url, latencyMs, false, tokenCost, requestId);

    // Track usage
    await authMiddleware.trackUsage(apiKey, 1, requestId);

    // Add rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.setHeader('X-Agent-Protocol-Version', AGENT_API_VERSION);
    res.status(200).json(response);
    return;
  } catch (error) {
    // Log error with full context
    logError(error, requestUrl, requestId);

    // Handle AgentMiddlewareError
    if (error instanceof AgentMiddlewareError) {
      const status = getStatusCode(error.code);

      createErrorResponse(
        res,
        error.code,
        error.message,
        status,
        { ...error.details, url: requestUrl },
        requestId
      );
      return;
    }

    // Return ERR_INTERNAL for unexpected errors
    createErrorResponse(
      res,
      'ERR_INTERNAL',
      'Internal server error',
      500,
      { url: requestUrl },
      requestId
    );
    return;
  }
}

// ============================================================================
// GET HANDLER - OpenAPI Documentation
// ============================================================================

async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Return the comprehensive OpenAPI specification
  // Includes detailed error documentation, rate limiting info, and curl examples

  res.setHeader('X-Agent-Protocol-Version', AGENT_API_VERSION);
  res.status(200).json(openApiSpec);
}

// ============================================================================
// VERCEL FUNCTION CONFIGURATION
// ============================================================================

/**
 * Vercel function configuration for browser scraping
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
export const config = {
  maxDuration: 60,        // 60 seconds for browser rendering and CSR hydration
  memory: 1024,           // 1GB for Chromium and page rendering
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  switch (req.method) {
    case 'GET':
      await handleGet(req, res);
      return;
    case 'POST':
      await handlePost(req, res);
      return;
    default:
      createErrorResponse(
        res,
        'ERR_INVALID_URL',
        'Method not allowed',
        405
      );
      return;
  }
}
