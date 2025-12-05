/**
 * LLM Integration Types
 * TypeScript interfaces for multi-model LLM integration via OpenRouter
 * 
 * This module defines types for:
 * - Multi-model configuration and selection
 * - Rate limiting and cost tracking
 * - Retry logic and error handling
 * - Parallel request execution
 * 
 * @module lib/citationIntelligence/types/llm.types
 */

// ============================================================================
// Task Type Definition
// ============================================================================

/**
 * Task types for model selection
 * Each task type maps to a specialized model optimized for that purpose
 */
export type TaskType = 
  | 'content_opt'      // Content optimization and variation generation
  | 'fact_check'       // Factual accuracy validation
  | 'schema_gen'       // JSON-LD schema generation
  | 'analysis';        // Content analysis and insights

// ============================================================================
// Model Configuration Types
// ============================================================================

/**
 * Model role configuration
 * Defines which model to use for each task type
 */
export interface ModelRole {
  /** Task type this role handles */
  taskType: TaskType;
  
  /** Primary model identifier (e.g., 'anthropic/claude-sonnet-4.5') */
  primary: string;
  
  /** Fallback model if primary fails */
  fallback: string;
  
  /** Human-readable description of this role */
  description: string;
}

/**
 * Model pricing information
 * Costs in USD per 1 million tokens
 */
export interface ModelPricing {
  /** Cost per 1M input tokens (USD) */
  input: number;
  
  /** Cost per 1M output tokens (USD) */
  output: number;
  
  /** Optional: Cost per 1M cached tokens (USD) */
  cached?: number;
}

/**
 * Complete model configuration
 * Combines role assignment with pricing and metadata
 */
export interface ModelConfig {
  /** Model identifier (e.g., 'anthropic/claude-sonnet-4.5') */
  modelId: string;
  
  /** Human-readable model name */
  displayName: string;
  
  /** Primary model for this configuration */
  primary: string;
  
  /** Fallback model if primary fails */
  fallback: string;
  
  /** Pricing information */
  pricing: ModelPricing;
  
  /** Task types this model is optimized for */
  taskTypes: TaskType[];
  
  /** Optional: Model-specific parameters */
  parameters?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    [key: string]: any;
  };
  
  /** Optional: Model capabilities */
  capabilities?: {
    supportsStreaming?: boolean;
    supportsVision?: boolean;
    supportsFunctionCalling?: boolean;
    maxContextLength?: number;
  };
}

/**
 * Multi-model configuration
 * Complete configuration for all models in the system
 */
export interface MultiModelConfig {
  /** Model configurations by task type */
  models: {
    [K in TaskType]: ModelConfig;
  };
  
  /** Default model to use if task type not specified */
  defaultModel: string;
  
  /** Global rate limiting configuration */
  rateLimiting: {
    /** Maximum requests per minute */
    requestsPerMinute: number;
    
    /** Maximum concurrent requests */
    maxConcurrent: number;
    
    /** Enable per-model rate limiting */
    perModelLimiting: boolean;
  };
  
  /** Budget configuration */
  budget: {
    /** Monthly budget limit in USD */
    monthlyLimit: number;
    
    /** Alert threshold (0-1, e.g., 0.8 for 80%) */
    alertThreshold: number;
    
    /** Hard stop at budget limit */
    enforceLimit: boolean;
  };
  
  /** Retry configuration */
  retry: {
    /** Maximum retry attempts */
    maxRetries: number;
    
    /** Base delay in milliseconds */
    baseDelay: number;
    
    /** Maximum delay in milliseconds */
    maxDelay: number;
    
    /** Enable exponential backoff */
    exponentialBackoff: boolean;
    
    /** Add random jitter to delays */
    jitter: boolean;
  };
  
  /** Cache configuration */
  cache: {
    /** Enable request caching */
    enabled: boolean;
    
    /** Cache TTL in seconds */
    ttl: number;
    
    /** Maximum cache size (number of entries) */
    maxSize: number;
  };
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of tokens (requests) in bucket */
  capacity: number;
  
  /** Token refill rate (tokens per second) */
  refillRate: number;
  
  /** Maximum queue size for pending requests */
  maxQueueSize: number;
  
  /** Timeout for queued requests (milliseconds) */
  queueTimeout?: number;
}

/**
 * Rate limiter metrics
 */
export interface RateLimiterMetrics {
  /** Current number of tokens available */
  tokensAvailable: number;
  
  /** Number of requests currently queued */
  requestsQueued: number;
  
  /** Total requests rejected (queue full) */
  requestsRejected: number;
  
  /** Average wait time in milliseconds */
  averageWaitTime: number;
  
  /** Last refill timestamp */
  lastRefill: Date;
  
  /** Total requests processed */
  totalRequests: number;
}

// ============================================================================
// Cost Tracking Types
// ============================================================================

/**
 * Token usage for a single request
 */
export interface TokenUsage {
  /** Number of prompt tokens */
  prompt: number;
  
  /** Number of completion tokens */
  completion: number;
  
  /** Total tokens (prompt + completion) */
  total: number;
  
  /** Optional: Cached tokens */
  cached?: number;
}

/**
 * Usage log entry
 */
export interface UsageLog {
  /** Log entry ID */
  id?: string;
  
  /** User ID (if applicable) */
  userId?: string;
  
  /** Model identifier */
  model: string;
  
  /** Task type */
  taskType: TaskType;
  
  /** Token usage */
  tokens: TokenUsage;
  
  /** Cost in USD */
  costUsd: number;
  
  /** Request duration in milliseconds */
  durationMs?: number;
  
  /** Whether request succeeded */
  success: boolean;
  
  /** Error message if failed */
  errorMessage?: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Optional: Request metadata */
  metadata?: {
    promptHash?: string;
    responseHash?: string;
    retryCount?: number;
    [key: string]: any;
  };
}

/**
 * Cost report
 */
export interface CostReport {
  /** Total cost in USD */
  totalCost: number;
  
  /** Cost breakdown by model */
  costByModel: Map<string, number>;
  
  /** Cost breakdown by task type */
  costByTaskType: Map<TaskType, number>;
  
  /** Total number of requests */
  requestCount: number;
  
  /** Average cost per request */
  averageCostPerRequest: number;
  
  /** Total tokens used */
  totalTokens: number;
  
  /** Report period */
  period: {
    start: Date;
    end: Date;
  };
  
  /** Budget utilization (0-1) */
  budgetUtilization: number;
  
  /** Projected monthly cost */
  projectedMonthlyCost: number;
}

/**
 * Cost tracker configuration
 */
export interface CostTrackerConfig {
  /** Monthly budget limit in USD */
  budgetLimit: number;
  
  /** Alert threshold (0-1) */
  alertThreshold: number;
  
  /** Enable database logging */
  enableLogging: boolean;
  
  /** Alert callback function */
  onAlert?: (level: 'warning' | 'critical', message: string, data: any) => void;
}

// ============================================================================
// Retry Logic Types
// ============================================================================

/**
 * Error types for retry logic
 */
export enum ErrorType {
  /** Rate limit exceeded (429) */
  RATE_LIMIT = 429,
  
  /** Request timeout (408) */
  TIMEOUT = 408,
  
  /** Server error (500-599) */
  SERVER_ERROR = 500,
  
  /** Authentication error (401) */
  AUTH_ERROR = 401,
  
  /** Invalid request (400) */
  INVALID_REQUEST = 400,
  
  /** Network error */
  NETWORK_ERROR = 0,
  
  /** Unknown error */
  UNKNOWN = -1
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** Base delay in milliseconds */
  baseDelay: number;
  
  /** Maximum delay in milliseconds */
  maxDelay: number;
  
  /** Enable exponential backoff */
  exponentialBackoff: boolean;
  
  /** Add random jitter to delays */
  jitter: boolean;
  
  /** Circuit breaker threshold (consecutive failures) */
  circuitBreakerThreshold: number;
  
  /** Circuit breaker reset timeout (milliseconds) */
  circuitBreakerTimeout: number;
  
  /** Retry on specific error types */
  retryableErrors: ErrorType[];
}

/**
 * Circuit breaker state
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Retry metrics
 */
export interface RetryMetrics {
  /** Total retry attempts */
  totalRetries: number;
  
  /** Successful retries */
  successfulRetries: number;
  
  /** Failed retries */
  failedRetries: number;
  
  /** Circuit breaker state */
  circuitBreakerState: CircuitBreakerState;
  
  /** Consecutive failures */
  consecutiveFailures: number;
  
  /** Last failure timestamp */
  lastFailure?: Date;
  
  /** Average retry delay */
  averageRetryDelay: number;
}

// ============================================================================
// Parallel Execution Types
// ============================================================================

/**
 * Parallel request definition
 */
export interface ParallelRequest<T> {
  /** Unique request identifier */
  id: string;
  
  /** Operation to execute */
  operation: () => Promise<T>;
  
  /** Optional: Request-specific timeout */
  timeout?: number;
  
  /** Optional: Request metadata */
  metadata?: Record<string, any>;
}

/**
 * Parallel execution result
 */
export interface ParallelResult<T> {
  /** Request ID */
  id: string;
  
  /** Result (if successful) */
  result?: T;
  
  /** Error (if failed) */
  error?: Error;
  
  /** Execution time in milliseconds */
  executionTime: number;
  
  /** Whether request succeeded */
  success: boolean;
}

/**
 * Parallel execution metrics
 */
export interface ParallelMetrics {
  /** Total execution time in milliseconds */
  totalTime: number;
  
  /** Execution time per request */
  perRequestTime: Map<string, number>;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Failure rate (0-1) */
  failureRate: number;
  
  /** Number of successful requests */
  successCount: number;
  
  /** Number of failed requests */
  failureCount: number;
  
  /** Average execution time */
  averageExecutionTime: number;
}

// ============================================================================
// Enhanced Client Types
// ============================================================================

/**
 * Chat message
 */
export interface ChatMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant';
  
  /** Message content */
  content: string;
  
  /** Optional: Message name */
  name?: string;
  
  /** Optional: Function call */
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * Chat options
 */
export interface ChatOptions {
  /** Model to use (overrides default) */
  model?: string;
  
  /** Task type for cost tracking */
  taskType?: TaskType;
  
  /** Maximum tokens to generate */
  maxTokens?: number;
  
  /** Temperature (0-2) */
  temperature?: number;
  
  /** Top-p sampling (0-1) */
  topP?: number;
  
  /** Stop sequences */
  stop?: string[];
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Enable streaming */
  stream?: boolean;
  
  /** Optional: Additional parameters */
  [key: string]: any;
}

/**
 * Chat response
 */
export interface ChatResponse {
  /** Response content */
  content: string;
  
  /** Model used */
  model: string;
  
  /** Token usage */
  usage: TokenUsage;
  
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call';
  
  /** Response metadata */
  metadata?: {
    requestId?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

/**
 * Cached response
 */
export interface CachedResponse {
  /** Cached response content */
  response: string;
  
  /** Cache timestamp */
  timestamp: Date;
  
  /** Cache expiration timestamp */
  expiresAt: Date;
  
  /** Model used */
  model: string;
  
  /** Token usage */
  usage: TokenUsage;
}

/**
 * Health status
 */
export interface HealthStatus {
  /** Overall health */
  healthy: boolean;
  
  /** Rate limiter status */
  rateLimiter: {
    healthy: boolean;
    tokensAvailable: number;
    requestsQueued: number;
  };
  
  /** Cost tracker status */
  costTracker: {
    healthy: boolean;
    budgetUtilization: number;
    totalCost: number;
  };
  
  /** Circuit breaker status */
  circuitBreaker: {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailure?: Date;
  };
  
  /** Cache status */
  cache: {
    enabled: boolean;
    size: number;
    hitRate: number;
  };
  
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * LLM error
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code: ErrorType,
    public statusCode?: number,
    public retryable: boolean = false,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends LLMError {
  constructor(
    message: string,
    public retryAfter?: number,
    metadata?: Record<string, any>
  ) {
    super(message, ErrorType.RATE_LIMIT, 429, true, metadata);
    this.name = 'RateLimitError';
  }
}

/**
 * Budget exceeded error
 */
export class BudgetExceededError extends LLMError {
  constructor(
    message: string,
    public currentCost: number,
    public budgetLimit: number,
    metadata?: Record<string, any>
  ) {
    super(message, ErrorType.INVALID_REQUEST, 400, false, metadata);
    this.name = 'BudgetExceededError';
  }
}

/**
 * Circuit breaker open error
 */
export class CircuitBreakerOpenError extends LLMError {
  constructor(
    message: string,
    public resetAt: Date,
    metadata?: Record<string, any>
  ) {
    super(message, ErrorType.SERVER_ERROR, 503, false, metadata);
    this.name = 'CircuitBreakerOpenError';
  }
}
