import { HTTPClient } from './transport/http.js';
import { RetryConfig } from './resilience/retry.js';
import { CircuitConfig } from './resilience/circuit-breaker.js';
import { ResilienceFactory } from './resilience/factory.js';
import { AuditService } from './services/audit.js';
import { KnowledgeGraphService } from './services/knowledge-graph.js';
import { CitationService } from './services/citation.js';
import { CCCService } from './services/ccc.js';
import { API_KEY_ENV_VAR } from './utils/constants.js';
import type { AuditRequest, AuditResult } from './types/audit.js';
import type { KnowledgeGraphRequest, KnowledgeGraphResult } from './types/knowledge-graph.js';
import type { CitationRequest, CitationResult } from './types/citation.js';

export interface AnterosConfig {
  /**
   * API key for authentication. If not provided, will use ANTEROS_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Base URL for API. Defaults to https://anoteroslogos.com
   */
  baseURL?: string;

  /**
   * Request timeout in milliseconds. Defaults to 60000 (60s)
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;

  /**
   * Circuit breaker configuration
   */
  circuit?: CircuitConfig;

  /**
   * Additional HTTP headers
   */
  headers?: Record<string, string>;
}

/**
 * Anóteros Lógos SDK Client
 * 
 * Production-grade TypeScript client for AI agent infrastructure platform
 * 
 * @example
 * ```typescript
 * const client = new AnterosClient({
 *   apiKey: process.env.ANTEROS_API_KEY
 * });
 * 
 * const result = await client.audit('https://example.com');
 * console.log(result.score); // 85
 * ```
 */
export class AnterosClient {
  private readonly factory: ResilienceFactory;

  /**
   * Audit service for GEO audits
   */
  readonly audit: AuditService;

  /**
   * Knowledge graph service
   */
  readonly knowledge: KnowledgeGraphService;

  /**
   * Citation prediction service
   */
  readonly citation: CitationService;

  /**
   * Causal Contribution Credits service
   */
  readonly ccc: CCCService;

  constructor(config: AnterosConfig = {}) {
    // Resolve API key from config or environment
    const apiKey = config.apiKey ?? (typeof process !== 'undefined' ? process.env?.[API_KEY_ENV_VAR] : undefined);

    if (!apiKey) {
      throw new Error(
        `API key is required. Provide it via config.apiKey or ${API_KEY_ENV_VAR} environment variable.`
      );
    }

    // Initialize transport layer
    const http = new HTTPClient({
      apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
      ...(config.timeout && { timeout: config.timeout }),
      ...(config.headers && { headers: config.headers }),
    });

    // Initialize resilience factory for isolated circuit breakers
    this.factory = new ResilienceFactory(config.retry, config.circuit);

    // Initialize services with isolated resilience components
    this.audit = new AuditService(
      http,
      this.factory.createRetryStrategy(),
      this.factory.getCircuitBreaker('audit'),
      this.factory.createIdempotencyManager()
    );
    
    this.knowledge = new KnowledgeGraphService(
      http,
      this.factory.createRetryStrategy(),
      this.factory.getCircuitBreaker('knowledge'),
      this.factory.createIdempotencyManager()
    );
    
    this.citation = new CitationService(
      http,
      this.factory.createRetryStrategy(),
      this.factory.getCircuitBreaker('citation'),
      this.factory.createIdempotencyManager()
    );
    
    this.ccc = new CCCService(
      http,
      this.factory.createRetryStrategy(),
      this.factory.getCircuitBreaker('ccc'),
      this.factory.createIdempotencyManager()
    );
  }

  // Convenience methods for common operations

  /**
   * Audit a URL (convenience wrapper for audit.create)
   * 
   * @example
   * ```typescript
   * const result = await client.auditURL('https://example.com', {
   *   depth: 'deep',
   *   options: { includeScreenshots: true }
   * });
   * ```
   */
  async auditURL(url: string, options?: Partial<Omit<AuditRequest, 'url'>>): Promise<AuditResult> {
    return this.audit.create({ url, depth: 'standard', ...options });
  }

  /**
   * Extract knowledge graph from URL (convenience wrapper)
   */
  async extractGraph(url: string, options?: Partial<Omit<KnowledgeGraphRequest, 'url'>>): Promise<KnowledgeGraphResult> {
    return this.knowledge.extract({ url, includeClaims: true, maxEntities: 100, ...options });
  }

  /**
   * Predict citation probability (convenience wrapper)
   */
  async predictCitation(url: string, options?: Partial<Omit<CitationRequest, 'url'>>): Promise<CitationResult> {
    return this.citation.predict({ url, ...options });
  }

  /**
   * Get circuit breaker status for all services (for monitoring)
   */
  getCircuitStatus(): Record<string, { state: string; failures: number }> {
    return this.factory.getCircuitStatus();
  }
}
