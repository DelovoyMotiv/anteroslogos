/**
 * Circuit Breaker Pattern Implementation
 * 
 * Features:
 * - Three states: CLOSED, OPEN, HALF_OPEN
 * - Configurable failure threshold (default: 5)
 * - Configurable timeout (default: 60 seconds)
 * - Half-open state with success threshold (default: 2)
 * - Automatic state transitions
 * - Event callbacks for monitoring
 * 
 * **Feature: production-audit-improvements, Property 20: Circuit Breaker Activation**
 * **Validates: Requirements 5.3**
 * 
 * @module lib/reliability/circuitBreaker
 */

import { CircuitBreakerError } from './errors';

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  /** Normal operation, requests pass through */
  CLOSED = 'CLOSED',
  
  /** Too many failures, requests are blocked */
  OPEN = 'OPEN',
  
  /** Testing if service recovered, limited requests allowed */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  
  /** Time in ms to wait before attempting half-open (default: 60000) */
  timeout: number;
  
  /** Number of successes in half-open before closing (default: 2) */
  successThreshold: number;
  
  /** Name/identifier for this circuit breaker */
  name?: string;
  
  /** Callback when circuit opens */
  onOpen?: () => void;
  
  /** Callback when circuit closes */
  onClose?: () => void;
  
  /** Callback when circuit enters half-open */
  onHalfOpen?: () => void;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  timeout: 60000, // 1 minute
  successThreshold: 2,
};

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  openedAt?: Date;
  halfOpenedAt?: Date;
  closedAt?: Date;
}

/**
 * Circuit Breaker implementation
 * 
 * Prevents cascading failures by stopping requests to failing services.
 * 
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   timeout: 60000,
 *   name: 'external-api',
 * });
 * 
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await fetch('https://api.example.com/data');
 *   });
 * } catch (error) {
 *   if (error instanceof CircuitBreakerError) {
 *     console.log('Circuit breaker is open, service unavailable');
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private openedAt?: number;
  private halfOpenedAt?: number;
  private closedAt?: number;
  
  // Statistics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  
  private readonly config: CircuitBreakerConfig;
  
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }
  
  /**
   * Execute an operation through the circuit breaker
   * 
   * @param operation - Async function to execute
   * @returns Promise resolving to operation result
   * @throws CircuitBreakerError if circuit is open
   * @throws Original error if operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.name || 'service'}`,
          undefined,
          this.config.name
        );
      }
    }
    
    try {
      // Execute the operation
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }
    return Date.now() - this.lastFailureTime > this.config.timeout;
  }
  
  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      
      // If we've had enough successes in half-open, close the circuit
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }
  
  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failureCount++;
    
    // If in half-open and we fail, immediately open again
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToOpen();
      return;
    }
    
    // If we've exceeded failure threshold, open the circuit
    if (this.failureCount >= this.config.failureThreshold) {
      this.transitionToOpen();
    }
  }
  
  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.openedAt = Date.now();
    this.successCount = 0;
    
    if (this.config.onOpen) {
      this.config.onOpen();
    }
  }
  
  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.halfOpenedAt = Date.now();
    this.successCount = 0;
    this.failureCount = 0;
    
    if (this.config.onHalfOpen) {
      this.config.onHalfOpen();
    }
  }
  
  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.closedAt = Date.now();
    this.failureCount = 0;
    this.successCount = 0;
    
    if (this.config.onClose) {
      this.config.onClose();
    }
  }
  
  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }
  
  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : undefined,
      lastSuccessTime: this.lastSuccessTime ? new Date(this.lastSuccessTime) : undefined,
      openedAt: this.openedAt ? new Date(this.openedAt) : undefined,
      halfOpenedAt: this.halfOpenedAt ? new Date(this.halfOpenedAt) : undefined,
      closedAt: this.closedAt ? new Date(this.closedAt) : undefined,
    };
  }
  
  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.transitionToClosed();
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.openedAt = undefined;
    this.halfOpenedAt = undefined;
  }
  
  /**
   * Check if circuit is currently open
   */
  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }
  
  /**
   * Check if circuit is currently closed
   */
  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }
  
  /**
   * Check if circuit is currently half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  /**
   * Get or create a circuit breaker for a service
   */
  getOrCreate(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker({ ...config, name })
      );
    }
    return this.breakers.get(name)!;
  }
  
  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }
  
  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }
  
  /**
   * Get all circuit breaker names
   */
  getNames(): string[] {
    return Array.from(this.breakers.keys());
  }
  
  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [name, breaker] of this.breakers.entries()) {
      stats.set(name, breaker.getStats());
    }
    return stats;
  }
  
  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
  
  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}

/**
 * Global circuit breaker registry
 */
export const globalCircuitBreakerRegistry = new CircuitBreakerRegistry();
