/**
 * Enhanced OpenRouter Client
 * Wrapper around OpenRouterClient with rate limiting, cost tracking, retry logic, and parallel execution
 * 
 * This module provides:
 * - Multi-model support with task-specific model selection
 * - Rate limiting with token bucket algorithm
 * - Cost tracking and budget alerts
 * - Enhanced retry logic with exponential backoff and circuit breaker
 * - Parallel request execution
 * - Request caching and deduplication
 * - Health monitoring and metrics
 * 
 * @module lib/citationIntelligence/llm/enhancedClient
 */

import { OpenRouterClient, type ChatMessage as BaseMessage } from '../../../utils/ai/openrouter';
import { RateLimiter } from './rateLimiter';
import { CostTracker } from './costTracker';
import { RetryHandler } from './retryHandler';
import { ParallelExecutor } from './parallelExecutor';
import { getModelFromEnv } from '../config/modelRegistry';
import type {
  ChatOptions,
  CachedResponse,
  HealthStatus,
  CostReport,
  RateLimiterMetrics,
  TokenUsage,
  ChatMessage,
  ParallelRequest,
} from '../types/llm.types';
import { BudgetExceededError, CircuitBreakerOpenError } from '../types/llm.types';

// ============================================================================
// Enhanced OpenRouter Client Configuration
// ============================================================================

/**
 * Configuration for EnhancedOpenRouterClient
 */
export interface EnhancedClientConfig {
  /** OpenRouter API key */
  apiKey: string;
  
  /** Default model (optional, will use task-specific models) */
  defaultModel?: string;
  
  /** HTTP referer for OpenRouter */
  httpReferer?: string;
  
  /** App name for OpenRouter */
  appName?: string;
  
  /** Rate limiter configuration */
  rateLimiter?: {
    capacity?: number;
    refillRate?: number;
    maxQueueSize?: number;
  };
  
  /** Cost tracker configuration */
  costTracker?: {
    budgetLimit?: number;
    alertThreshold?: number;
    enableLogging?: boolean;
  };
  
  /** Retry handler configuration */
  retryHandler?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  
  /** Parallel executor configuration */
  parallelExecutor?: {
    timeout?: number;
  };
  
  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    ttl?: number; // seconds
    maxSize?: number;
  };
}

// ============================================================================
// Enhanced OpenRouter Client Class
// ============================================================================

/**
 * EnhancedOpenRouterClient
 * Extends OpenRouterClient with advanced features for production use
 * 
 * Features:
 * - Multi-model support with task-specific model selection
 * - Rate limiting to prevent API throttling
 * - Cost tracking and budget enforcement
 * - Retry logic with exponential backoff and circuit breaker
 * - Parallel request execution for multiple models
 * - Request caching and deduplication
 * - Health monitoring and comprehensive metrics
 * 
 * @example
 * ```typescript
 * const client = new EnhancedOpenRouterClient({
 *   apiKey: process.env.VITE_OPENROUTER_API_KEY,
 *   rateLimiter: { capacity: 10, refillRate: 10 / 60 },
 *   costTracker: { budgetLimit: 100, alertThreshold: 0.8 },
 * });
 * 
 * // Single model request
 * const response = await client.chatWithModel(
 *   'anthropic/claude-sonnet-4.5',
 *   [{ role: 'user', content: 'Hello!' }]
 * );
 * 
 * // Multi-model request
 * const responses = await client.chatWithMultipleModels(
 *   ['anthropic/claude-sonnet-4.5', 'openai/gpt-5.1'],
 *   [{ role: 'user', content: 'Hello!' }]
 * );
 * ```
 */
export class EnhancedOpenRouterClient extends OpenRouterClient {
  /** Rate limiter instance */
  private rateLimiter: RateLimiter;
  
  /** Cost tracker instance */
  private costTracker: CostTracker;
  
  /** Retry handler instance */
  private retryHandler: RetryHandler;
  
  /** Parallel executor instance */
  private parallelExecutor: ParallelExecutor;
  
  /** Request cache */
  private requestCache: Map<string, CachedResponse>;
  
  /** Cache configuration */
  private cacheConfig: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  
  /** Cache hit/miss counters */
  private cacheStats: {
    hits: number;
    misses: number;
  };
  
  /**
   * Create a new EnhancedOpenRouterClient
   * 
   * @param config - Client configuration
   * 
   * @example
   * ```typescript
   * const client = new EnhancedOpenRouterClient({
   *   apiKey: process.env.VITE_OPENROUTER_API_KEY,
   *   defaultModel: 'anthropic/claude-sonnet-4.5',
   *   rateLimiter: { capacity: 10, refillRate: 10 / 60 },
   *   costTracker: { budgetLimit: 100, alertThreshold: 0.8 },
   * });
   * ```
   */
  constructor(config: EnhancedClientConfig) {
    // Initialize base OpenRouterClient
    super({
      apiKey: config.apiKey,
      model: config.defaultModel || getModelFromEnv('content_opt'),
      httpReferer: config.httpReferer,
      appName: config.appName,
    });
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      capacity: config.rateLimiter?.capacity || 10,
      refillRate: config.rateLimiter?.refillRate || 10 / 60, // 10 req/min
      maxQueueSize: config.rateLimiter?.maxQueueSize || 100,
    });
    
    // Initialize cost tracker
    this.costTracker = new CostTracker({
      budgetLimit: config.costTracker?.budgetLimit || 100,
      alertThreshold: config.costTracker?.alertThreshold || 0.8,
      enableLogging: config.costTracker?.enableLogging ?? true,
    });
    
    // Initialize retry handler
    this.retryHandler = new RetryHandler({
      maxRetries: config.retryHandler?.maxRetries || 3,
      baseDelay: config.retryHandler?.baseDelay || 1000,
      maxDelay: config.retryHandler?.maxDelay || 32000,
      exponentialBackoff: true,
      jitter: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      retryableErrors: [429, 408, 500, 0], // RATE_LIMIT, TIMEOUT, SERVER_ERROR, NETWORK_ERROR
    });
    
    // Initialize parallel executor
    this.parallelExecutor = new ParallelExecutor({
      timeout: config.parallelExecutor?.timeout || 30000,
    });
    
    // Initialize cache
    this.requestCache = new Map();
    this.cacheConfig = {
      enabled: config.cache?.enabled ?? true,
      ttl: config.cache?.ttl || 300, // 5 minutes default
      maxSize: config.cache?.maxSize || 1000,
    };
    this.cacheStats = {
      hits: 0,
      misses: 0,
    };
  }
  
  // ==========================================================================
  // Core Chat Methods
  // ==========================================================================
  
  /**
   * Chat with a specific model
   * 
   * This method applies all enhancements:
   * - Rate limiting
   * - Cost tracking
   * - Retry logic with circuit breaker
   * - Request caching
   * 
   * @param model - Model identifier
   * @param messages - Chat messages
   * @param options - Chat options
   * @returns Promise resolving to response content
   * 
   * @example
   * ```typescript
   * const response = await client.chatWithModel(
   *   'anthropic/claude-sonnet-4.5',
   *   [
   *     { role: 'system', content: 'You are a helpful assistant.' },
   *     { role: 'user', content: 'What is GEO?' }
   *   ],
   *   { temperature: 0.7, maxTokens: 1000 }
   * );
   * ```
   */
  async chatWithModel(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    // Check circuit breaker
    if (this.retryHandler.isCircuitOpen()) {
      throw new CircuitBreakerOpenError(
        'Circuit breaker is open. Too many recent failures.',
        new Date(Date.now() + 60000) // Reset in 60 seconds
      );
    }
    
    // Check budget
    const budgetUtilization = this.costTracker.getBudgetUtilization();
    if (budgetUtilization >= 100) {
      throw new BudgetExceededError(
        'Monthly budget limit exceeded',
        this.costTracker.getTotalCost(),
        this.costTracker.getBudgetConfig().budgetLimit
      );
    }
    
    // Check cache
    const cacheKey = this.getCacheKey(messages);
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Execute with retry logic
    const startTime = Date.now();
    
    const response = await this.retryHandler.executeWithRetry(async () => {
      // Acquire rate limit token
      await this.rateLimiter.acquire();
      
      // Make the actual API call
      const result = await super.chat(
        messages as BaseMessage[],
        {
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
        }
      );
      
      return result;
    }, {
      operationName: 'chatWithModel',
      metadata: { model, messageCount: messages.length },
    });
    
    const durationMs = Date.now() - startTime;
    
    // Estimate token usage (rough estimate, actual usage would come from API response)
    const estimatedPromptTokens = this.estimateTokens(
      messages.map(m => m.content).join(' ')
    );
    const estimatedCompletionTokens = this.estimateTokens(response);
    const tokens: TokenUsage = {
      prompt: estimatedPromptTokens,
      completion: estimatedCompletionTokens,
      total: estimatedPromptTokens + estimatedCompletionTokens,
    };
    
    // Track cost
    await this.costTracker.trackRequest(
      model,
      options?.taskType || 'content_opt',
      tokens,
      true,
      durationMs
    );
    
    // Cache response
    this.setCachedResponse(cacheKey, response, model, tokens);
    
    return response;
  }
  
  /**
   * Chat with multiple models in parallel
   * 
   * Executes requests to multiple models concurrently and returns all results
   * 
   * @param models - Array of model identifiers
   * @param messages - Chat messages
   * @param options - Chat options
   * @returns Promise resolving to map of model to response
   * 
   * @example
   * ```typescript
   * const responses = await client.chatWithMultipleModels(
   *   ['anthropic/claude-sonnet-4.5', 'openai/gpt-5.1'],
   *   [{ role: 'user', content: 'What is GEO?' }]
   * );
   * 
   * console.log('Claude:', responses.get('anthropic/claude-sonnet-4.5'));
   * console.log('GPT:', responses.get('openai/gpt-5.1'));
   * ```
   */
  async chatWithMultipleModels(
    models: string[],
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<Map<string, string>> {
    // Create parallel requests
    const requests: ParallelRequest<string>[] = models.map(model => ({
      id: model,
      operation: async () => {
        return await this.chatWithModel(model, messages, options);
      },
      timeout: options?.timeout,
    }));
    
    // Execute in parallel
    const results = await this.parallelExecutor.executeParallel(requests);
    
    // Convert to Map<string, string> (filter out errors)
    const successfulResults = new Map<string, string>();
    results.forEach((value, model) => {
      if (!(value instanceof Error)) {
        successfulResults.set(model, value);
      } else {
        console.error(`Model ${model} failed:`, value.message);
      }
    });
    
    return successfulResults;
  }
  
  // ==========================================================================
  // Health and Metrics Methods
  // ==========================================================================
  
  /**
   * Get health status
   * 
   * Returns comprehensive health information about all components
   * 
   * @returns Health status
   * 
   * @example
   * ```typescript
   * const health = client.getHealthStatus();
   * console.log('Overall health:', health.healthy);
   * console.log('Budget utilization:', health.costTracker.budgetUtilization);
   * console.log('Circuit breaker state:', health.circuitBreaker.state);
   * ```
   */
  getHealthStatus(): HealthStatus {
    const rateLimiterMetrics = this.rateLimiter.getMetrics();
    const retryMetrics = this.retryHandler.getMetrics();
    
    const budgetUtilization = this.costTracker.getBudgetUtilization();
    const circuitState = this.retryHandler.getCircuitState();
    
    // Determine overall health
    const healthy = 
      budgetUtilization < 100 &&
      circuitState !== 'open' &&
      rateLimiterMetrics.requestsQueued < 50;
    
    return {
      healthy,
      rateLimiter: {
        healthy: rateLimiterMetrics.requestsQueued < 50,
        tokensAvailable: rateLimiterMetrics.tokensAvailable,
        requestsQueued: rateLimiterMetrics.requestsQueued,
      },
      costTracker: {
        healthy: budgetUtilization < 100,
        budgetUtilization,
        totalCost: this.costTracker.getTotalCost(),
      },
      circuitBreaker: {
        state: circuitState,
        failureCount: retryMetrics.consecutiveFailures,
        lastFailure: retryMetrics.lastFailure,
      },
      cache: {
        enabled: this.cacheConfig.enabled,
        size: this.requestCache.size,
        hitRate: this.getCacheHitRate(),
      },
      timestamp: new Date(),
    };
  }
  
  /**
   * Get cost report
   * 
   * @param period - Time period for report
   * @returns Cost report
   * 
   * @example
   * ```typescript
   * const report = await client.getCostReport('month');
   * console.log('Total cost:', report.totalCost);
   * console.log('Requests:', report.requestCount);
   * console.log('Average cost per request:', report.averageCostPerRequest);
   * ```
   */
  async getCostReport(
    period: 'day' | 'week' | 'month' | 'custom' = 'month'
  ): Promise<CostReport> {
    return await this.costTracker.getCostReport(period);
  }
  
  /**
   * Get rate limiter metrics
   * 
   * @returns Rate limiter metrics
   * 
   * @example
   * ```typescript
   * const metrics = client.getRateLimitMetrics();
   * console.log('Tokens available:', metrics.tokensAvailable);
   * console.log('Requests queued:', metrics.requestsQueued);
   * console.log('Average wait time:', metrics.averageWaitTime);
   * ```
   */
  getRateLimitMetrics(): RateLimiterMetrics {
    return this.rateLimiter.getMetrics();
  }
  
  // ==========================================================================
  // Cache Methods
  // ==========================================================================
  
  /**
   * Clear the request cache
   * 
   * @example
   * ```typescript
   * client.clearCache();
   * ```
   */
  clearCache(): void {
    this.requestCache.clear();
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
  }
  
  /**
   * Get cache key for messages
   * 
   * Creates a deterministic hash of the messages for caching
   * 
   * @param messages - Chat messages
   * @returns Cache key
   * 
   * @private
   */
  private getCacheKey(messages: ChatMessage[]): string {
    // Create a deterministic string representation
    const messageString = messages
      .map(m => `${m.role}:${m.content}`)
      .join('|');
    
    // Simple hash function (djb2)
    let hash = 5381;
    for (let i = 0; i < messageString.length; i++) {
      hash = ((hash << 5) + hash) + messageString.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Get cached response
   * 
   * @param key - Cache key
   * @returns Cached response content or null
   * 
   * @private
   */
  private getCachedResponse(key: string): string | null {
    if (!this.cacheConfig.enabled) {
      return null;
    }
    
    const cached = this.requestCache.get(key);
    
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }
    
    // Check if expired
    if (cached.expiresAt < new Date()) {
      this.requestCache.delete(key);
      this.cacheStats.misses++;
      return null;
    }
    
    this.cacheStats.hits++;
    return cached.response;
  }
  
  /**
   * Set cached response
   * 
   * @param key - Cache key
   * @param response - Response content
   * @param model - Model used
   * @param usage - Token usage
   * 
   * @private
   */
  private setCachedResponse(
    key: string,
    response: string,
    model: string,
    usage: TokenUsage
  ): void {
    if (!this.cacheConfig.enabled) {
      return;
    }
    
    // Check cache size limit
    if (this.requestCache.size >= this.cacheConfig.maxSize) {
      // Remove oldest entry (first entry in Map)
      const firstKey = this.requestCache.keys().next().value;
      if (firstKey) {
        this.requestCache.delete(firstKey);
      }
    }
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cacheConfig.ttl * 1000);
    
    this.requestCache.set(key, {
      response,
      timestamp: now,
      expiresAt,
      model,
      usage,
    });
  }
  
  /**
   * Get cache hit rate
   * 
   * @returns Cache hit rate (0-1)
   * 
   * @private
   */
  private getCacheHitRate(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return total > 0 ? this.cacheStats.hits / total : 0;
  }
  
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  
  /**
   * Estimate token count for text
   * 
   * Rough estimation: ~4 characters per token
   * 
   * @param text - Text to estimate
   * @returns Estimated token count
   * 
   * @private
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Clean up resources
   * 
   * Call this when the client is no longer needed
   * 
   * @example
   * ```typescript
   * client.cleanup();
   * ```
   */
  cleanup(): void {
    this.rateLimiter.stop();
    this.clearCache();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an EnhancedOpenRouterClient from environment variables
 * 
 * @param overrides - Optional configuration overrides
 * @returns EnhancedOpenRouterClient instance or null if not configured
 * 
 * @example
 * ```typescript
 * const client = createEnhancedOpenRouterClient();
 * if (client) {
 *   const response = await client.chatWithModel(
 *     'anthropic/claude-sonnet-4.5',
 *     [{ role: 'user', content: 'Hello!' }]
 *   );
 * }
 * ```
 */
export function createEnhancedOpenRouterClient(
  overrides?: Partial<EnhancedClientConfig>
): EnhancedOpenRouterClient | null {
  // Check both VITE_ prefixed and non-prefixed versions
  // VITE_ prefix works in client-side (import.meta.env)
  // Non-prefixed works in Vercel Serverless Functions (process.env)
  
  // Safely access import.meta.env (only available in browser/Vite)
  const getImportMetaEnv = (key: string): string | undefined => {
    try {
      return (import.meta as any)?.env?.[key];
    } catch {
      return undefined;
    }
  };
  
  const apiKey = 
    getImportMetaEnv('VITE_OPENROUTER_API_KEY') || 
    process.env.VITE_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenRouter API key not found. Enhanced client will not be created.');
    return null;
  }
  
  const budgetLimit = parseFloat(
    getImportMetaEnv('VITE_OPENROUTER_BUDGET_LIMIT') || 
    process.env.VITE_OPENROUTER_BUDGET_LIMIT ||
    process.env.OPENROUTER_BUDGET_LIMIT ||
    '100'
  );
  
  const alertThreshold = parseFloat(
    getImportMetaEnv('VITE_OPENROUTER_ALERT_THRESHOLD') || 
    process.env.VITE_OPENROUTER_ALERT_THRESHOLD ||
    process.env.OPENROUTER_ALERT_THRESHOLD ||
    '0.8'
  );
  
  const rateLimitRpm = parseFloat(
    getImportMetaEnv('VITE_OPENROUTER_RATE_LIMIT_RPM') || 
    process.env.VITE_OPENROUTER_RATE_LIMIT_RPM ||
    process.env.OPENROUTER_RATE_LIMIT_RPM ||
    '10'
  );
  
  return new EnhancedOpenRouterClient({
    apiKey,
    httpReferer: getImportMetaEnv('VITE_APP_URL') || process.env.VITE_APP_URL || 'https://anoteros-logos.com',
    appName: 'Anóteros Lógos GEO Audit',
    rateLimiter: {
      capacity: rateLimitRpm,
      refillRate: rateLimitRpm / 60,
      maxQueueSize: 100,
    },
    costTracker: {
      budgetLimit,
      alertThreshold,
      enableLogging: true,
    },
    retryHandler: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 32000,
    },
    parallelExecutor: {
      timeout: 30000,
    },
    cache: {
      enabled: true,
      ttl: 300, // 5 minutes
      maxSize: 1000,
    },
    ...overrides,
  });
}