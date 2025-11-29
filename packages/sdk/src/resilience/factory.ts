import { CircuitBreaker, CircuitConfig } from './circuit-breaker.js';
import { RetryStrategy, RetryConfig } from './retry.js';
import { IdempotencyManager } from './idempotency.js';

/**
 * Factory for creating isolated resilience components per service
 * This prevents circuit breaker state from affecting other services
 */
export class ResilienceFactory {
  private readonly retryConfig?: RetryConfig;
  private readonly circuitConfig?: CircuitConfig;
  private readonly idempotencyTTL: number;
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(
    retryConfig?: RetryConfig,
    circuitConfig?: CircuitConfig,
    idempotencyTTL: number = 300000
  ) {
    if (retryConfig !== undefined) {
      this.retryConfig = retryConfig;
    }
    if (circuitConfig !== undefined) {
      this.circuitConfig = circuitConfig;
    }
    this.idempotencyTTL = idempotencyTTL;
  }

  /**
   * Create retry strategy instance
   */
  createRetryStrategy(): RetryStrategy {
    return new RetryStrategy(this.retryConfig);
  }

  /**
   * Get or create circuit breaker for a specific service
   * Each service gets its own circuit breaker for isolation
   */
  getCircuitBreaker(serviceName: string): CircuitBreaker {
    let circuit = this.circuitBreakers.get(serviceName);
    
    if (!circuit) {
      circuit = new CircuitBreaker(this.circuitConfig);
      this.circuitBreakers.set(serviceName, circuit);
    }
    
    return circuit;
  }

  /**
   * Create idempotency manager instance
   */
  createIdempotencyManager(): IdempotencyManager {
    return new IdempotencyManager(this.idempotencyTTL);
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitStatus(): Record<string, { state: string; failures: number }> {
    const status: Record<string, { state: string; failures: number }> = {};
    
    for (const [service, circuit] of this.circuitBreakers.entries()) {
      status[service] = {
        state: circuit.getState(),
        failures: circuit.getFailureCount(),
      };
    }
    
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.clear();
  }
}
