/**
 * External API Integration Wrapper
 * 
 * Provides resilient external API calls with:
 * - Automatic retry with exponential backoff
 * - Circuit breaker protection
 * - Timeout handling
 * - Fallback mechanisms
 * - Request/response logging
 * 
 * **Feature: production-audit-improvements, Property 27: External API Resilience**
 * **Validates: Requirements 6.4**
 * 
 * @module lib/reliability/externalApi
 */

import { withRetry, API_RETRY_CONFIG, type RetryConfig } from './retry';
import { CircuitBreaker, globalCircuitBreakerRegistry, type CircuitBreakerConfig } from './circuitBreaker';
import { ExternalServiceError, TimeoutError } from './errors';
import type { ApiRequestBody, MinimalSupabaseClient, SupabaseQueryResult } from '../../types/lib.types';
import type { JSONValue } from '../../types/common.types';

/**
 * External API configuration
 */
export interface ExternalApiConfig {
  /** Service name for logging and circuit breaker */
  name: string;
  
  /** Base URL for the API */
  baseUrl: string;
  
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  
  /** Circuit breaker configuration */
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
  
  /** Fallback function when service is unavailable */
  fallback?: <T>(error: Error) => Promise<T> | T;
  
  /** Enable request/response logging (default: false) */
  enableLogging?: boolean;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body */
  body?: ApiRequestBody;
  
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  
  /** Override timeout for this request */
  timeout?: number;
  
  /** Override retry config for this request */
  retry?: Partial<RetryConfig>;
  
  /** Skip circuit breaker for this request */
  skipCircuitBreaker?: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data: T;
  
  /** HTTP status code */
  status: number;
  
  /** Response headers */
  headers: Record<string, string>;
  
  /** Request duration in milliseconds */
  duration: number;
}

/**
 * External API client with resilience features
 * 
 * @example
 * ```typescript
 * const api = new ExternalApiClient({
 *   name: 'github-api',
 *   baseUrl: 'https://api.github.com',
 *   timeout: 10000,
 *   defaultHeaders: {
 *     'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
 *   },
 *   fallback: async (error) => {
 *     console.error('GitHub API unavailable, using cache');
 *     return getCachedData();
 *   },
 * });
 * 
 * const repos = await api.get<Repository[]>('/users/octocat/repos');
 * ```
 */
export class ExternalApiClient {
  private readonly config: Required<ExternalApiConfig>;
  private readonly circuitBreaker: CircuitBreaker;
  
  constructor(config: ExternalApiConfig) {
    this.config = {
      timeout: 30000,
      retry: API_RETRY_CONFIG,
      circuitBreaker: {},
      defaultHeaders: {},
      fallback: undefined as any,
      enableLogging: false,
      ...config,
    };
    
    // Get or create circuit breaker for this service
    this.circuitBreaker = globalCircuitBreakerRegistry.getOrCreate(
      this.config.name,
      this.config.circuitBreaker
    );
  }
  
  /**
   * Make a GET request
   */
  async get<T = any>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }
  
  /**
   * Make a POST request
   */
  async post<T = JSONValue>(
    path: string,
    body?: ApiRequestBody,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }
  
  /**
   * Make a PUT request
   */
  async put<T = JSONValue>(
    path: string,
    body?: ApiRequestBody,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }
  
  /**
   * Make a DELETE request
   */
  async delete<T = any>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
  
  /**
   * Make a PATCH request
   */
  async patch<T = JSONValue>(
    path: string,
    body?: ApiRequestBody,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }
  
  /**
   * Make a request with full resilience features
   */
  async request<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      // Build URL with query parameters
      const url = this.buildUrl(path, options.params);
      
      // Merge headers
      const headers = {
        ...this.config.defaultHeaders,
        ...options.headers,
      };
      
      // Determine timeout
      const timeout = options.timeout || this.config.timeout;
      
      // Determine retry config
      const retryConfig = {
        ...this.config.retry,
        ...options.retry,
      };
      
      // Log request if enabled
      if (this.config.enableLogging) {
        console.log(`[${this.config.name}] ${options.method || 'GET'} ${url}`);
      }
      
      // Execute with circuit breaker and retry
      const executeRequest = async (): Promise<ApiResponse<T>> => {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          // Check if response is ok
          if (!response.ok) {
            throw new ExternalServiceError(
              `HTTP ${response.status}: ${response.statusText}`,
              undefined,
              this.config.name,
              response.status >= 500 || response.status === 429 // Retryable if 5xx or rate limited
            );
          }
          
          // Parse response
          const data = await response.json();
          
          // Extract headers
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });
          
          const duration = Date.now() - startTime;
          
          // Log response if enabled
          if (this.config.enableLogging) {
            console.log(
              `[${this.config.name}] ${response.status} ${options.method || 'GET'} ${url} (${duration}ms)`
            );
          }
          
          return {
            data,
            status: response.status,
            headers: responseHeaders,
            duration,
          };
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Handle abort (timeout)
          if (error instanceof Error && error.name === 'AbortError') {
            throw new TimeoutError(
              `Request timeout after ${String(timeout)}ms`,
              undefined,
              timeout
            );
          }
          
          // Handle network errors
          if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new ExternalServiceError(
              `Network error: ${error.message}`,
              undefined,
              this.config.name,
              true // Network errors are retryable
            );
          }
          
          throw error;
        }
      };
      
      // Execute with circuit breaker and retry
      if (options.skipCircuitBreaker) {
        // Skip circuit breaker, just retry
        return await withRetry(executeRequest, retryConfig);
      } else {
        // Use circuit breaker with retry
        return await this.circuitBreaker.execute(async () => {
          return await withRetry(executeRequest, retryConfig);
        });
      }
      
    } catch (error) {
      // Log error if enabled
      if (this.config.enableLogging) {
        console.error(
          `[${this.config.name}] Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      
      // Try fallback if available
      if (this.config.fallback) {
        try {
          const fallbackData = await this.config.fallback<T>(error as Error);
          return {
            data: fallbackData,
            status: 200,
            headers: {},
            duration: Date.now() - startTime,
          };
        } catch (fallbackError) {
          // Fallback failed, throw original error
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    return url.toString();
  }
  
  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return this.circuitBreaker.getStats();
  }
  
  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}

/**
 * Create a configured external API client
 * 
 * @example
 * ```typescript
 * const githubApi = createExternalApiClient({
 *   name: 'github',
 *   baseUrl: 'https://api.github.com',
 *   defaultHeaders: {
 *     'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
 *   },
 * });
 * ```
 */
export function createExternalApiClient(config: ExternalApiConfig): ExternalApiClient {
  return new ExternalApiClient(config);
}

/**
 * Blockchain RPC client with automatic failover
 * Wraps existing rpcProvider with additional resilience features
 */
export class BlockchainRpcClient extends ExternalApiClient {
  constructor(config: Omit<ExternalApiConfig, 'baseUrl'>) {
    super({
      ...config,
      baseUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      timeout: config.timeout || 10000,
      retry: {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 30000,
        ...config.retry,
      },
      circuitBreaker: {
        failureThreshold: 10,
        timeout: 120000, // 2 minutes
        ...config.circuitBreaker,
      },
    });
  }
}

/**
 * Supabase client wrapper with resilience
 */
export class ResilientSupabaseClient {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly enableLogging: boolean;
  
  constructor(
    private readonly supabaseClient: MinimalSupabaseClient,
    config?: {
      name?: string;
      circuitBreaker?: Partial<CircuitBreakerConfig>;
      enableLogging?: boolean;
    }
  ) {
    const name = config?.name || 'supabase';
    this.enableLogging = config?.enableLogging || false;
    
    this.circuitBreaker = globalCircuitBreakerRegistry.getOrCreate(name, {
      failureThreshold: 5,
      timeout: 60000,
      ...config?.circuitBreaker,
    });
  }
  
  /**
   * Execute a Supabase query with resilience
   */
  async query<T = JSONValue>(
    operation: () => Promise<SupabaseQueryResult<T>>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<SupabaseQueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            const result = await operation();
            
            // Treat Supabase errors as failures
            if (result.error) {
              throw new ExternalServiceError(
                `Supabase error: ${result.error.message}`,
                undefined,
                'supabase',
                true // Most Supabase errors are retryable
              );
            }
            
            return result;
          },
          {
            ...API_RETRY_CONFIG,
            ...retryConfig,
          }
        );
      });
      
      if (this.enableLogging) {
        const duration = Date.now() - startTime;
        console.log(`[Supabase] Query completed in ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`[Supabase] Query failed:`, error);
      }
      
      // Return error in Supabase format
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }
  
  /**
   * Get the underlying Supabase client
   */
  getClient() {
    return this.supabaseClient;
  }
  
  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return this.circuitBreaker.getStats();
  }
}

/**
 * Create a resilient Supabase client wrapper
 */
export function createResilientSupabaseClient(
  supabaseClient: MinimalSupabaseClient,
  config?: {
    name?: string;
    circuitBreaker?: Partial<CircuitBreakerConfig>;
    enableLogging?: boolean;
  }
): ResilientSupabaseClient {
  return new ResilientSupabaseClient(supabaseClient, config);
}
