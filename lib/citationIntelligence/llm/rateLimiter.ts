/**
 * Rate Limiter
 * Token bucket algorithm implementation for API rate limiting
 * 
 * This module provides:
 * - Token bucket rate limiting (10 requests per minute default)
 * - Request queuing when rate limit is reached
 * - Automatic token refill over time
 * - Metrics tracking for monitoring
 * 
 * @module lib/citationIntelligence/llm/rateLimiter
 */

import type { RateLimiterConfig, RateLimiterMetrics } from '../types/llm.types';

/**
 * Queued request
 * Represents a request waiting for tokens to become available
 */
interface QueuedRequest {
  /** Unique request identifier */
  id: string;
  
  /** Promise resolve function */
  resolve: () => void;
  
  /** Promise reject function */
  reject: (error: Error) => void;
  
  /** Timestamp when request was queued */
  queuedAt: number;
  
  /** Optional timeout for this request */
  timeout?: number;
}

/**
 * RateLimiter
 * Implements token bucket algorithm for rate limiting
 * 
 * The token bucket algorithm works as follows:
 * 1. A bucket holds a maximum number of tokens (capacity)
 * 2. Tokens are consumed when requests are made
 * 3. Tokens are refilled at a constant rate over time
 * 4. If no tokens are available, requests are queued
 * 5. Queued requests are processed when tokens become available
 * 
 * @example
 * ```typescript
 * const limiter = new RateLimiter({
 *   capacity: 10,
 *   refillRate: 10 / 60, // 10 requests per minute
 *   maxQueueSize: 100
 * });
 * 
 * // Acquire a token before making a request
 * await limiter.acquire();
 * // Make your API request here
 * ```
 */
export class RateLimiter {
  /** Current number of tokens available */
  private tokens: number;
  
  /** Maximum number of tokens the bucket can hold */
  private capacity: number;
  
  /** Rate at which tokens are refilled (tokens per second) */
  private refillRate: number;
  
  /** Timestamp of last token refill (milliseconds) */
  private lastRefill: number;
  
  /** Queue of pending requests waiting for tokens */
  private queue: QueuedRequest[];
  
  /** Maximum number of requests that can be queued */
  private maxQueueSize: number;
  
  /** Default timeout for queued requests (milliseconds) */
  private queueTimeout: number;
  
  /** Total number of requests processed */
  private totalRequests: number;
  
  /** Total number of requests rejected (queue full) */
  private requestsRejected: number;
  
  /** Total wait time for all requests (milliseconds) */
  private totalWaitTime: number;
  
  /** Number of requests that have waited */
  private requestsWaited: number;
  
  /** Interval for processing queued requests */
  private processInterval: NodeJS.Timeout | null;
  
  /**
   * Create a new RateLimiter
   * 
   * @param config - Rate limiter configuration
   * 
   * @example
   * ```typescript
   * // 10 requests per minute
   * const limiter = new RateLimiter({
   *   capacity: 10,
   *   refillRate: 10 / 60,
   *   maxQueueSize: 100,
   *   queueTimeout: 30000
   * });
   * ```
   */
  constructor(config: RateLimiterConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.maxQueueSize = config.maxQueueSize;
    this.queueTimeout = config.queueTimeout || 30000; // Default 30s timeout
    
    // Initialize with full capacity
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.queue = [];
    
    // Initialize metrics
    this.totalRequests = 0;
    this.requestsRejected = 0;
    this.totalWaitTime = 0;
    this.requestsWaited = 0;
    
    // Start processing queue
    this.processInterval = null;
    this.startQueueProcessor();
  }
  
  /**
   * Acquire a token from the bucket
   * 
   * This method will:
   * 1. Refill tokens based on elapsed time
   * 2. If tokens are available, consume one and return immediately
   * 3. If no tokens available, queue the request and wait
   * 4. Reject if queue is full
   * 
   * @returns Promise that resolves when a token is acquired
   * @throws Error if queue is full
   * 
   * @example
   * ```typescript
   * try {
   *   await limiter.acquire();
   *   // Token acquired, proceed with request
   * } catch (error) {
   *   // Queue is full, handle error
   * }
   * ```
   */
  async acquire(): Promise<void> {
    this.totalRequests++;
    
    // Refill tokens based on elapsed time
    this.refill();
    
    // If tokens are available, consume one immediately
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }
    
    // No tokens available, queue the request
    return this.queueRequest();
  }
  
  /**
   * Refill tokens based on elapsed time
   * 
   * Tokens are refilled at a constant rate (refillRate tokens per second)
   * The number of tokens refilled is calculated based on time elapsed since last refill
   * 
   * @example
   * ```typescript
   * // Called automatically by acquire(), but can be called manually
   * limiter.refill();
   * ```
   */
  refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    
    // Calculate tokens to add based on elapsed time
    const tokensToAdd = elapsedSeconds * this.refillRate;
    
    // Add tokens, but don't exceed capacity
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    
    // Update last refill timestamp
    this.lastRefill = now;
  }
  
  /**
   * Check if a token can be acquired without waiting
   * 
   * @returns True if a token is available, false otherwise
   * 
   * @example
   * ```typescript
   * if (limiter.canAcquire()) {
   *   await limiter.acquire(); // Will not wait
   * } else {
   *   // Will need to wait or queue
   * }
   * ```
   */
  canAcquire(): boolean {
    // Refill tokens first
    this.refill();
    
    // Check if at least one token is available
    return this.tokens >= 1;
  }
  
  /**
   * Get current rate limiter metrics
   * 
   * @returns Current metrics including tokens available, queue size, etc.
   * 
   * @example
   * ```typescript
   * const metrics = limiter.getMetrics();
   * console.log(`Tokens available: ${metrics.tokensAvailable}`);
   * console.log(`Requests queued: ${metrics.requestsQueued}`);
   * console.log(`Average wait time: ${metrics.averageWaitTime}ms`);
   * ```
   */
  getMetrics(): RateLimiterMetrics {
    // Refill tokens to get current state
    this.refill();
    
    return {
      tokensAvailable: this.tokens,
      requestsQueued: this.queue.length,
      requestsRejected: this.requestsRejected,
      averageWaitTime: this.requestsWaited > 0 
        ? this.totalWaitTime / this.requestsWaited 
        : 0,
      lastRefill: new Date(this.lastRefill),
      totalRequests: this.totalRequests,
    };
  }
  
  /**
   * Queue a request when no tokens are available
   * 
   * @returns Promise that resolves when a token becomes available
   * @throws Error if queue is full
   * 
   * @private
   */
  private queueRequest(): Promise<void> {
    // Check if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.requestsRejected++;
      throw new Error(
        `Rate limit queue is full (${this.maxQueueSize} requests). ` +
        `Please try again later.`
      );
    }
    
    // Create a promise that will be resolved when a token is available
    return new Promise<void>((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const queuedAt = Date.now();
      
      const queuedRequest: QueuedRequest = {
        id: requestId,
        resolve,
        reject,
        queuedAt,
        timeout: this.queueTimeout,
      };
      
      // Add to queue
      this.queue.push(queuedRequest);
      
      // Set timeout for this request
      if (queuedRequest.timeout) {
        setTimeout(() => {
          // Check if request is still in queue
          const index = this.queue.findIndex(r => r.id === requestId);
          if (index !== -1) {
            // Remove from queue
            this.queue.splice(index, 1);
            
            // Reject with timeout error
            reject(new Error(
              `Rate limit queue timeout after ${queuedRequest.timeout}ms`
            ));
          }
        }, queuedRequest.timeout);
      }
    });
  }
  
  /**
   * Process queued requests
   * 
   * This method runs periodically to check if tokens are available
   * and process queued requests
   * 
   * @private
   */
  private processQueue(): void {
    // Refill tokens
    this.refill();
    
    // Process as many queued requests as possible
    while (this.queue.length > 0 && this.tokens >= 1) {
      const request = this.queue.shift();
      if (!request) break;
      
      // Consume a token
      this.tokens -= 1;
      
      // Calculate wait time
      const waitTime = Date.now() - request.queuedAt;
      this.totalWaitTime += waitTime;
      this.requestsWaited++;
      
      // Resolve the promise
      request.resolve();
    }
  }
  
  /**
   * Start the queue processor
   * 
   * Runs every 100ms to process queued requests
   * 
   * @private
   */
  private startQueueProcessor(): void {
    if (this.processInterval) {
      return; // Already running
    }
    
    // Process queue every 100ms
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 100);
  }
  
  /**
   * Stop the queue processor
   * 
   * Should be called when the rate limiter is no longer needed
   * to prevent memory leaks
   * 
   * @example
   * ```typescript
   * // Clean up when done
   * limiter.stop();
   * ```
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    
    // Reject all queued requests
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.reject(new Error('Rate limiter stopped'));
      }
    }
  }
  
  /**
   * Reset the rate limiter to initial state
   * 
   * Useful for testing or when you want to clear all state
   * 
   * @example
   * ```typescript
   * // Reset to full capacity
   * limiter.reset();
   * ```
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.totalRequests = 0;
    this.requestsRejected = 0;
    this.totalWaitTime = 0;
    this.requestsWaited = 0;
    
    // Clear queue
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.reject(new Error('Rate limiter reset'));
      }
    }
  }
}

/**
 * Create a rate limiter with default configuration
 * 
 * Default: 10 requests per minute
 * 
 * @param overrides - Optional configuration overrides
 * @returns New RateLimiter instance
 * 
 * @example
 * ```typescript
 * const limiter = createRateLimiter();
 * // or with custom config
 * const customLimiter = createRateLimiter({
 *   capacity: 20,
 *   refillRate: 20 / 60
 * });
 * ```
 */
export function createRateLimiter(
  overrides?: Partial<RateLimiterConfig>
): RateLimiter {
  const defaultConfig: RateLimiterConfig = {
    capacity: 10,
    refillRate: 10 / 60, // 10 requests per minute
    maxQueueSize: 100,
    queueTimeout: 30000, // 30 seconds
  };
  
  return new RateLimiter({
    ...defaultConfig,
    ...overrides,
  });
}
