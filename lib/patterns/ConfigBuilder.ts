/**
 * Builder Pattern for Complex Configurations
 * 
 * Provides fluent API for building complex configuration objects
 * with validation and sensible defaults.
 * 
 * @module lib/patterns/ConfigBuilder
 */

import type { PoolConfig } from '../database/connectionPool';
import type { SandboxConfig } from '../mcp/sandbox';
import type { RoutingOptions } from '../mesh/network';
import type { CircuitBreakerConfig } from '../reliability/circuitBreaker';
import type { RetryConfig } from '../reliability/retry';

/**
 * Connection Pool Configuration Builder
 * 
 * @example
 * ```typescript
 * const config = new PoolConfigBuilder()
 *   .setMinConnections(5)
 *   .setMaxConnections(20)
 *   .setIdleTimeout(60000)
 *   .build();
 * ```
 */
export class PoolConfigBuilder {
  private config: Partial<PoolConfig> = {};

  setMinConnections(min: number): this {
    if (min < 1) {
      throw new Error('Minimum connections must be at least 1');
    }
    this.config.minConnections = min;
    return this;
  }

  setMaxConnections(max: number): this {
    if (max < 1) {
      throw new Error('Maximum connections must be at least 1');
    }
    if (this.config.minConnections && max < this.config.minConnections) {
      throw new Error('Maximum connections must be >= minimum connections');
    }
    this.config.maxConnections = max;
    return this;
  }

  setIdleTimeout(ms: number): this {
    if (ms < 0) {
      throw new Error('Idle timeout must be non-negative');
    }
    this.config.idleTimeoutMs = ms;
    return this;
  }

  setConnectionTimeout(ms: number): this {
    if (ms < 0) {
      throw new Error('Connection timeout must be non-negative');
    }
    this.config.connectionTimeoutMs = ms;
    return this;
  }

  setStatementTimeout(ms: number): this {
    if (ms < 0) {
      throw new Error('Statement timeout must be non-negative');
    }
    this.config.statementTimeoutMs = ms;
    return this;
  }

  /**
   * Set configuration for specific plan tier
   */
  forPlan(plan: 'free' | 'pro' | 'agency'): this {
    const configs = {
      free: {
        minConnections: 2,
        maxConnections: 5,
        idleTimeoutMs: 30000,
        connectionTimeoutMs: 5000,
        statementTimeoutMs: 30000,
      },
      pro: {
        minConnections: 5,
        maxConnections: 20,
        idleTimeoutMs: 60000,
        connectionTimeoutMs: 10000,
        statementTimeoutMs: 60000,
      },
      agency: {
        minConnections: 10,
        maxConnections: 50,
        idleTimeoutMs: 120000,
        connectionTimeoutMs: 15000,
        statementTimeoutMs: 120000,
      },
    };

    this.config = { ...configs[plan] };
    return this;
  }

  build(): PoolConfig {
    return {
      minConnections: this.config.minConnections ?? 2,
      maxConnections: this.config.maxConnections ?? 10,
      idleTimeoutMs: this.config.idleTimeoutMs ?? 30000,
      connectionTimeoutMs: this.config.connectionTimeoutMs ?? 5000,
      statementTimeoutMs: this.config.statementTimeoutMs ?? 30000,
    };
  }

  reset(): this {
    this.config = {};
    return this;
  }
}

/**
 * Sandbox Configuration Builder
 * 
 * @example
 * ```typescript
 * const config = new SandboxConfigBuilder()
 *   .setMemoryLimit(256)
 *   .setCpuTimeout(2000)
 *   .enableSignatureVerification()
 *   .build();
 * ```
 */
export class SandboxConfigBuilder {
  private config: Partial<SandboxConfig> = {};

  setMemoryLimit(mb: number): this {
    if (mb < 32 || mb > 512) {
      throw new Error('Memory limit must be between 32MB and 512MB');
    }
    this.config.memoryLimitMB = mb;
    return this;
  }

  setCpuTimeout(ms: number): this {
    if (ms < 100 || ms > 5000) {
      throw new Error('CPU timeout must be between 100ms and 5000ms');
    }
    this.config.cpuTimeoutMs = ms;
    return this;
  }

  allowNetworkAccess(allow: boolean = true): this {
    this.config.allowNetworkAccess = allow;
    return this;
  }

  allowFileSystem(allow: boolean = true): this {
    this.config.allowFileSystem = allow;
    return this;
  }

  setTmpDir(dir: string): this {
    this.config.tmpDir = dir;
    return this;
  }

  enableSignatureVerification(enable: boolean = true): this {
    this.config.enableSignatureVerification = enable;
    return this;
  }

  enableBillingHooks(enable: boolean = true): this {
    this.config.enableBillingHooks = enable;
    return this;
  }

  /**
   * Configure for lightweight operations
   */
  forLightweight(): this {
    this.config = {
      memoryLimitMB: 64,
      cpuTimeoutMs: 1000,
      allowNetworkAccess: false,
      allowFileSystem: false,
      enableSignatureVerification: false,
      enableBillingHooks: false,
    };
    return this;
  }

  /**
   * Configure for enterprise operations
   */
  forEnterprise(): this {
    this.config = {
      memoryLimitMB: 256,
      cpuTimeoutMs: 2000,
      allowNetworkAccess: false,
      allowFileSystem: false,
      enableSignatureVerification: true,
      enableBillingHooks: true,
    };
    return this;
  }

  build(): SandboxConfig {
    return {
      memoryLimitMB: this.config.memoryLimitMB ?? 256,
      cpuTimeoutMs: this.config.cpuTimeoutMs ?? 2000,
      allowNetworkAccess: this.config.allowNetworkAccess ?? false,
      allowFileSystem: this.config.allowFileSystem ?? false,
      tmpDir: this.config.tmpDir ?? '/tmp',
      enableSignatureVerification: this.config.enableSignatureVerification ?? true,
      enableBillingHooks: this.config.enableBillingHooks ?? true,
    };
  }

  reset(): this {
    this.config = {};
    return this;
  }
}

/**
 * Routing Options Builder
 * 
 * @example
 * ```typescript
 * const options = new RoutingOptionsBuilder()
 *   .setMaxHops(3)
 *   .setMinTrustScore(70)
 *   .setMaxCost(0.5)
 *   .setTimeout(30000)
 *   .build();
 * ```
 */
export class RoutingOptionsBuilder {
  private options: Partial<RoutingOptions> = {};

  setMaxHops(hops: number): this {
    if (hops < 1) {
      throw new Error('Max hops must be at least 1');
    }
    this.options.maxHops = hops;
    return this;
  }

  setMinTrustScore(score: number): this {
    if (score < 0 || score > 100) {
      throw new Error('Trust score must be between 0 and 100');
    }
    this.options.minTrustScore = score;
    return this;
  }

  setMaxCost(cost: number): this {
    if (cost < 0) {
      throw new Error('Max cost must be non-negative');
    }
    this.options.maxCost = cost;
    return this;
  }

  setPreferredNodes(nodes: string[]): this {
    this.options.preferredNodes = [...nodes];
    return this;
  }

  addPreferredNode(nodeId: string): this {
    if (!this.options.preferredNodes) {
      this.options.preferredNodes = [];
    }
    this.options.preferredNodes.push(nodeId);
    return this;
  }

  setExcludeNodes(nodes: string[]): this {
    this.options.excludeNodes = [...nodes];
    return this;
  }

  addExcludeNode(nodeId: string): this {
    if (!this.options.excludeNodes) {
      this.options.excludeNodes = [];
    }
    this.options.excludeNodes.push(nodeId);
    return this;
  }

  setTimeout(ms: number): this {
    if (ms < 0) {
      throw new Error('Timeout must be non-negative');
    }
    this.options.timeout = ms;
    return this;
  }

  setRetries(retries: number): this {
    if (retries < 0) {
      throw new Error('Retries must be non-negative');
    }
    this.options.retries = retries;
    return this;
  }

  allowCrossTenant(allow: boolean = true): this {
    this.options.allowCrossTenant = allow;
    return this;
  }

  setRequiredTenantId(tenantId: string): this {
    this.options.requiredTenantId = tenantId;
    return this;
  }

  /**
   * Configure for high-trust routing
   */
  forHighTrust(): this {
    this.options = {
      maxHops: 2,
      minTrustScore: 80,
      maxCost: 0.5,
      timeout: 15000,
      retries: 1,
    };
    return this;
  }

  /**
   * Configure for cost-optimized routing
   */
  forCostOptimized(): this {
    this.options = {
      maxHops: 5,
      minTrustScore: 50,
      maxCost: 0.1,
      timeout: 30000,
      retries: 3,
    };
    return this;
  }

  build(): RoutingOptions {
    return {
      maxHops: this.options.maxHops ?? 3,
      minTrustScore: this.options.minTrustScore ?? 50,
      maxCost: this.options.maxCost ?? 1.0,
      preferredNodes: this.options.preferredNodes ?? [],
      excludeNodes: this.options.excludeNodes ?? [],
      timeout: this.options.timeout ?? 30000,
      retries: this.options.retries ?? 2,
      allowCrossTenant: this.options.allowCrossTenant ?? false,
      requiredTenantId: this.options.requiredTenantId,
    };
  }

  reset(): this {
    this.options = {};
    return this;
  }
}

/**
 * Circuit Breaker Configuration Builder
 * 
 * @example
 * ```typescript
 * const config = new CircuitBreakerConfigBuilder()
 *   .setFailureThreshold(5)
 *   .setTimeout(60000)
 *   .setSuccessThreshold(2)
 *   .setName('external-api')
 *   .build();
 * ```
 */
export class CircuitBreakerConfigBuilder {
  private config: Partial<CircuitBreakerConfig> = {};

  setFailureThreshold(threshold: number): this {
    if (threshold < 1) {
      throw new Error('Failure threshold must be at least 1');
    }
    this.config.failureThreshold = threshold;
    return this;
  }

  setTimeout(ms: number): this {
    if (ms < 0) {
      throw new Error('Timeout must be non-negative');
    }
    this.config.timeout = ms;
    return this;
  }

  setSuccessThreshold(threshold: number): this {
    if (threshold < 1) {
      throw new Error('Success threshold must be at least 1');
    }
    this.config.successThreshold = threshold;
    return this;
  }

  setName(name: string): this {
    this.config.name = name;
    return this;
  }

  onOpen(callback: () => void): this {
    this.config.onOpen = callback;
    return this;
  }

  onClose(callback: () => void): this {
    this.config.onClose = callback;
    return this;
  }

  onHalfOpen(callback: () => void): this {
    this.config.onHalfOpen = callback;
    return this;
  }

  /**
   * Configure for aggressive failure detection
   */
  forAggressive(): this {
    this.config = {
      failureThreshold: 3,
      timeout: 30000,
      successThreshold: 3,
    };
    return this;
  }

  /**
   * Configure for lenient failure detection
   */
  forLenient(): this {
    this.config = {
      failureThreshold: 10,
      timeout: 120000,
      successThreshold: 1,
    };
    return this;
  }

  build(): CircuitBreakerConfig {
    return {
      failureThreshold: this.config.failureThreshold ?? 5,
      timeout: this.config.timeout ?? 60000,
      successThreshold: this.config.successThreshold ?? 2,
      name: this.config.name,
      onOpen: this.config.onOpen,
      onClose: this.config.onClose,
      onHalfOpen: this.config.onHalfOpen,
    };
  }

  reset(): this {
    this.config = {};
    return this;
  }
}

/**
 * Retry Configuration Builder
 * 
 * @example
 * ```typescript
 * const config = new RetryConfigBuilder()
 *   .setMaxAttempts(3)
 *   .setBaseDelay(1000)
 *   .setMaxDelay(30000)
 *   .enableJitter()
 *   .build();
 * ```
 */
export class RetryConfigBuilder {
  private config: Partial<RetryConfig> = {};

  setMaxAttempts(attempts: number): this {
    if (attempts < 1) {
      throw new Error('Max attempts must be at least 1');
    }
    this.config.maxAttempts = attempts;
    return this;
  }

  setBaseDelay(ms: number): this {
    if (ms < 0) {
      throw new Error('Base delay must be non-negative');
    }
    this.config.baseDelay = ms;
    return this;
  }

  setMaxDelay(ms: number): this {
    if (ms < 0) {
      throw new Error('Max delay must be non-negative');
    }
    this.config.maxDelay = ms;
    return this;
  }

  setExponentialBase(base: number): this {
    if (base <= 1) {
      throw new Error('Exponential base must be > 1');
    }
    this.config.exponentialBase = base;
    return this;
  }

  enableJitter(enable: boolean = true): this {
    this.config.jitter = enable;
    return this;
  }

  setRetryableErrors(errors: string[]): this {
    this.config.retryableErrors = [...errors];
    return this;
  }

  addRetryableError(error: string): this {
    if (!this.config.retryableErrors) {
      this.config.retryableErrors = [];
    }
    this.config.retryableErrors.push(error);
    return this;
  }

  /**
   * Configure for aggressive retries
   */
  forAggressive(): this {
    this.config = {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 10000,
      exponentialBase: 2,
      jitter: true,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '503', '429'],
    };
    return this;
  }

  /**
   * Configure for conservative retries
   */
  forConservative(): this {
    this.config = {
      maxAttempts: 2,
      baseDelay: 2000,
      maxDelay: 60000,
      exponentialBase: 3,
      jitter: true,
      retryableErrors: ['ETIMEDOUT', '503'],
    };
    return this;
  }

  build(): RetryConfig {
    return {
      maxAttempts: this.config.maxAttempts ?? 3,
      baseDelay: this.config.baseDelay ?? 1000,
      maxDelay: this.config.maxDelay ?? 30000,
      exponentialBase: this.config.exponentialBase ?? 2,
      jitter: this.config.jitter ?? true,
      retryableErrors: this.config.retryableErrors ?? ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '503', '429'],
    };
  }

  reset(): this {
    this.config = {};
    return this;
  }
}
