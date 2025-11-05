/**
 * Agent2Agent (A2A) Protocol - JSON-RPC 2.0 Implementation
 * Production-grade protocol for AI agent communication
 * Optimized for Perplexity, ChatGPT, Claude, and other AI search agents
 */

import { z } from 'zod';

// =====================================================
// PROTOCOL VERSION & CONSTANTS
// =====================================================

export const A2A_VERSION = '1.0.0';
export const A2A_PROTOCOL = 'jsonrpc-2.0';

export enum A2AMethod {
  // Discovery & Capabilities
  DISCOVER = 'a2a.discover',
  CAPABILITIES = 'a2a.capabilities',
  
  // GEO Audit Methods
  AUDIT_REQUEST = 'geo.audit.request',
  AUDIT_STATUS = 'geo.audit.status',
  AUDIT_RESULT = 'geo.audit.result',
  
  // Batch Operations
  BATCH_AUDIT = 'geo.audit.batch',
  
  // Insights & Analytics
  INSIGHTS_GLOBAL = 'geo.insights.global',
  INSIGHTS_INDUSTRY = 'geo.insights.industry',
  INSIGHTS_DOMAIN = 'geo.insights.domain',
  
  // Streaming Methods
  AUDIT_STREAM = 'geo.audit.stream',
  SUBSCRIBE = 'a2a.subscribe',
  UNSUBSCRIBE = 'a2a.unsubscribe',
  
  // Health & Status
  PING = 'a2a.ping',
  STATUS = 'a2a.status',
}

// =====================================================
// SCHEMA DEFINITIONS (Zod for Runtime Validation)
// =====================================================

/**
 * JSON-RPC 2.0 Request Schema
 */
export const A2ARequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.nativeEnum(A2AMethod),
  params: z.record(z.any()).optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

export type A2ARequest = z.infer<typeof A2ARequestSchema>;

/**
 * JSON-RPC 2.0 Response Schema
 */
export const A2AResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
  id: z.union([z.string(), z.number(), z.null()]),
});

export type A2AResponse = z.infer<typeof A2AResponseSchema>;

/**
 * Audit Request Parameters
 */
export const AuditRequestParamsSchema = z.object({
  url: z.string().url(),
  options: z.object({
    depth: z.enum(['basic', 'standard', 'comprehensive']).default('standard'),
    include_recommendations: z.boolean().default(true),
    include_insights: z.boolean().default(true),
    timeout: z.number().min(5000).max(300000).default(60000), // 5s - 5min
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    callback_url: z.string().url().optional(),
  }).optional().default({}),
  metadata: z.record(z.any()).optional(),
});

export type AuditRequestParams = z.infer<typeof AuditRequestParamsSchema>;

/**
 * Batch Audit Request Parameters
 */
export const BatchAuditParamsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(100), // Max 100 URLs per batch
  options: z.object({
    depth: z.enum(['basic', 'standard', 'comprehensive']).default('standard'),
    parallel: z.boolean().default(true),
    max_concurrent: z.number().min(1).max(10).default(5),
    fail_fast: z.boolean().default(false),
  }).optional().default({}),
});

export type BatchAuditParams = z.infer<typeof BatchAuditParamsSchema>;

/**
 * Subscribe Parameters (for streaming)
 */
export const SubscribeParamsSchema = z.object({
  event: z.enum(['audit.progress', 'audit.complete', 'insights.update']),
  filter: z.record(z.any()).optional(),
});

export type SubscribeParams = z.infer<typeof SubscribeParamsSchema>;

// =====================================================
// RESPONSE FORMATS (AI-Optimized)
// =====================================================

/**
 * Discovery Response - Tells agents what this service can do
 */
export interface A2ADiscoveryResponse {
  service: {
    name: string;
    version: string;
    description: string;
    provider: string;
    homepage: string;
  };
  protocol: {
    version: string;
    spec: string;
  };
  capabilities: A2ACapability[];
  endpoints: {
    http: string;
    ws: string;
    docs: string;
  };
  rate_limits: {
    requests_per_minute: number;
    requests_per_hour: number;
    concurrent_requests: number;
  };
  authentication: {
    methods: string[];
    required: boolean;
  };
}

export interface A2ACapability {
  method: string;
  description: string;
  params_schema: Record<string, any>;
  result_schema: Record<string, any>;
  streaming: boolean;
  batch_support: boolean;
  rate_limit?: {
    requests_per_minute?: number;
    requests_per_hour?: number;
  };
}

/**
 * Structured Audit Result (AI-Friendly)
 */
export interface A2AAuditResult {
  audit_id: string;
  url: string;
  timestamp: string;
  status: 'completed' | 'failed' | 'partial';
  
  // Overall Metrics
  overall_score: number;
  grade: string;
  confidence: number; // 0-1, how confident we are in the results
  
  // Category Scores (normalized 0-100)
  categories: {
    schema_markup: A2ACategoryScore;
    meta_tags: A2ACategoryScore;
    ai_crawlers: A2ACategoryScore;
    eeat: A2ACategoryScore;
    content_quality: A2ACategoryScore;
    citation_potential: A2ACategoryScore;
    technical_seo: A2ACategoryScore;
  };
  
  // Structured Findings (machine-readable)
  findings: {
    critical: A2AFinding[];
    warnings: A2AFinding[];
    recommendations: A2AFinding[];
    opportunities: A2AFinding[];
  };
  
  // Semantic Markup for AI Consumption
  semantic_data: {
    entity_type?: string;
    industry?: string;
    topics: string[];
    keywords: string[];
    entities: A2AEntity[];
  };
  
  // Citations & References (for AI attribution)
  citations: {
    sources: string[];
    data_points: number;
    factual_claims: number;
    expert_quotes: number;
  };
  
  // Actionable Insights
  insights: A2AInsight[];
  
  // Metadata
  metadata: {
    processing_time_ms: number;
    agent_used: string;
    depth: string;
    version: string;
  };
}

export interface A2ACategoryScore {
  score: number;
  max_score: number;
  percentage: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  weight: number;
}

export interface A2AFinding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  implementation?: {
    effort: 'quick' | 'moderate' | 'complex';
    time_estimate: string;
    code_example?: string;
  };
  ai_context?: string; // Additional context for AI understanding
}

export interface A2AEntity {
  type: string;
  name: string;
  confidence: number;
  properties?: Record<string, any>;
}

export interface A2AInsight {
  type: 'best_practice' | 'opportunity' | 'benchmark' | 'prediction';
  title: string;
  description: string;
  data?: Record<string, any>;
  confidence: number;
}

// =====================================================
// ERROR CODES (JSON-RPC 2.0 Standard + Custom)
// =====================================================

export enum A2AErrorCode {
  // JSON-RPC 2.0 Standard
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // Custom Application Errors
  RATE_LIMIT_EXCEEDED = -32000,
  AUTHENTICATION_REQUIRED = -32001,
  INSUFFICIENT_CREDITS = -32002,
  INVALID_URL = -32003,
  TIMEOUT = -32004,
  SERVICE_UNAVAILABLE = -32005,
  CONCURRENT_LIMIT_EXCEEDED = -32006,
  INVALID_API_KEY = -32007,
  AUDIT_FAILED = -32008,
  NOT_FOUND = -32009,
}

export class A2AError extends Error {
  constructor(
    public code: A2AErrorCode,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'A2AError';
  }
  
  toJSON(): A2AResponse['error'] {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

// =====================================================
// AGENT METADATA (Who is calling us?)
// =====================================================

export interface A2AAgentInfo {
  name: string;
  version?: string;
  type: 'search' | 'assistant' | 'crawler' | 'analytics' | 'other';
  capabilities: string[];
  contact?: string;
}

/**
 * Known AI Agents (for optimization)
 */
export const KNOWN_AGENTS: Record<string, A2AAgentInfo> = {
  perplexity: {
    name: 'Perplexity AI',
    type: 'search',
    capabilities: ['real-time', 'citations', 'multi-source'],
  },
  chatgpt: {
    name: 'ChatGPT',
    type: 'assistant',
    capabilities: ['conversational', 'code-generation', 'reasoning'],
  },
  claude: {
    name: 'Claude',
    type: 'assistant',
    capabilities: ['analysis', 'writing', 'research'],
  },
  gemini: {
    name: 'Google Gemini',
    type: 'assistant',
    capabilities: ['multimodal', 'search-integration', 'analysis'],
  },
  grok: {
    name: 'Grok',
    type: 'search',
    capabilities: ['real-time', 'x-integration', 'humor'],
  },
};

// =====================================================
// RATE LIMITING CONFIGURATION
// =====================================================

export interface A2ARateLimitConfig {
  // Per API Key
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  
  // Concurrent Requests
  max_concurrent: number;
  
  // Burst Allowance
  burst_size: number;
  
  // Tier-based limits
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
}

export const RATE_LIMITS: Record<string, A2ARateLimitConfig> = {
  free: {
    requests_per_minute: 10,
    requests_per_hour: 100,
    requests_per_day: 500,
    max_concurrent: 2,
    burst_size: 5,
    tier: 'free',
  },
  basic: {
    requests_per_minute: 60,
    requests_per_hour: 1000,
    requests_per_day: 10000,
    max_concurrent: 5,
    burst_size: 20,
    tier: 'basic',
  },
  pro: {
    requests_per_minute: 300,
    requests_per_hour: 10000,
    requests_per_day: 100000,
    max_concurrent: 20,
    burst_size: 100,
    tier: 'pro',
  },
  enterprise: {
    requests_per_minute: 1000,
    requests_per_hour: 50000,
    requests_per_day: 1000000,
    max_concurrent: 100,
    burst_size: 500,
    tier: 'enterprise',
  },
};

// =====================================================
// STREAMING PROTOCOL
// =====================================================

export interface A2AStreamEvent {
  type: 'progress' | 'result' | 'error' | 'complete';
  audit_id: string;
  timestamp: string;
  data: any;
}

export interface A2AProgressEvent extends A2AStreamEvent {
  type: 'progress';
  data: {
    stage: string;
    progress: number; // 0-100
    message: string;
    current_step: string;
    total_steps: number;
    completed_steps: number;
  };
}

// =====================================================
// CONTEXT & SESSION MANAGEMENT
// =====================================================

export interface A2AContext {
  request_id: string;
  agent_info?: A2AAgentInfo;
  user_id?: string;
  api_key?: string;
  rate_limit_tier: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Create a success response
 */
export function createA2AResponse(
  id: string | number | null,
  result: any
): A2AResponse {
  return {
    jsonrpc: '2.0',
    result,
    id,
  };
}

/**
 * Create an error response
 */
export function createA2AErrorResponse(
  id: string | number | null,
  error: A2AError
): A2AResponse {
  return {
    jsonrpc: '2.0',
    error: error.toJSON(),
    id,
  };
}

/**
 * Validate incoming request
 */
export function validateA2ARequest(data: unknown): A2ARequest {
  try {
    return A2ARequestSchema.parse(data);
  } catch (error) {
    throw new A2AError(
      A2AErrorCode.INVALID_REQUEST,
      'Invalid JSON-RPC 2.0 request format',
      error
    );
  }
}

/**
 * Detect agent from User-Agent or custom headers
 */
export function detectAgent(userAgent: string, headers: Record<string, string>): A2AAgentInfo | null {
  const ua = userAgent.toLowerCase();
  const agentHeader = headers['x-agent-name']?.toLowerCase();
  
  // Check custom header first
  if (agentHeader) {
    for (const [key, agent] of Object.entries(KNOWN_AGENTS)) {
      if (agentHeader.includes(key)) {
        return agent;
      }
    }
  }
  
  // Check User-Agent
  for (const [key, agent] of Object.entries(KNOWN_AGENTS)) {
    if (ua.includes(key) || ua.includes(agent.name.toLowerCase())) {
      return agent;
    }
  }
  
  return null;
}

/**
 * Generate request ID
 */
export function generateRequestId(): string {
  return `a2a_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
