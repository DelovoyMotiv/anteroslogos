import { DEFAULT_CIRCUIT_CONFIG } from '../utils/constants.js';
import { CircuitOpenError } from '../errors/types.js';

export interface CircuitConfig {
  failureThreshold?: number;
  timeout?: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly timeout: number;

  constructor(config: CircuitConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? DEFAULT_CIRCUIT_CONFIG.failureThreshold;
    this.timeout = config.timeout ?? DEFAULT_CIRCUIT_CONFIG.timeout;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      
      if (elapsed < this.timeout) {
        const retryAfter = this.timeout - elapsed;
        throw new CircuitOpenError(`Circuit breaker open, retry after ${retryAfter}ms`, retryAfter);
      }
      
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.reset();
    } else if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
}
