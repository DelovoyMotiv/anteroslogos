/**
 * LLM Integration Module
 * Central exports for multi-model LLM integration
 * 
 * This module provides:
 * - Rate limiting with token bucket algorithm
 * - Cost tracking and budget management
 * - Retry logic with exponential backoff
 * - Parallel request execution
 * - Enhanced OpenRouter client wrapper
 * 
 * @module lib/citationIntelligence/llm
 */

// Rate Limiting
export { RateLimiter, createRateLimiter } from './rateLimiter';

// Cost Tracking
export { CostTracker, createCostTracker } from './costTracker';

// Retry Logic
export { RetryHandler, createRetryHandler } from './retryHandler';

// Parallel Execution
export { ParallelExecutor, createParallelExecutor } from './parallelExecutor';
export type { AggregatedResult } from './parallelExecutor';

// Re-export types
export type {
  TaskType,
  ModelRole,
  ModelPricing,
  ModelConfig,
  MultiModelConfig,
  RateLimiterConfig,
  RateLimiterMetrics,
  TokenUsage,
  UsageLog,
  CostReport,
  CostTrackerConfig,
  ErrorType,
  RetryConfig,
  CircuitBreakerState,
  RetryMetrics,
  ParallelRequest,
  ParallelResult,
  ParallelMetrics,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  CachedResponse,
  HealthStatus,
} from '../types/llm.types';

// Re-export error classes
export {
  LLMError,
  RateLimitError,
  BudgetExceededError,
  CircuitBreakerOpenError,
} from '../types/llm.types';

// Enhanced OpenRouter Client
export { 
  EnhancedOpenRouterClient, 
  createEnhancedOpenRouterClient,
  type EnhancedClientConfig 
} from './enhancedClient';
