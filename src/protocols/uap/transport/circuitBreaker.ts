/**
 * UAP Circuit Breaker
 * Per-agent fault tolerance with Byzantine detection
 * 
 * @module src/protocols/uap/transport/circuitBreaker
 * @version 1.0.0
 */

import { DIDString } from '../types';
import { CIRCUIT_BREAKER_PARAMS } from '../constants';

// =====================================================
// TYPES
// =====================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Failure threshold before opening */
  failureThreshold: number;
  /** Success threshold in half-open to close */
  successThreshold: number;
  /** Timeout before attempting half-open (ms) */
  timeout: number;
  /** Rolling window size (ms) */
  windowSize: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Maximum backoff time (ms) */
  maxBackoff: number;
}

export interface CircuitMetrics {
  /** Total requests */
  totalRequests: number;
  /** Failed requests */
  failures: number;
  /** Successful requests */
  successes: number;
  /** Last failure timestamp */
  lastFailure: number | null;
  /** Last success timestamp */
  lastSuccess: number | null;
  /** Current state */
  state: CircuitState;
  /** Open since timestamp */
  openedAt: number | null;
  /** Consecutive failures */
  consecutiveFailures: number;
  /** Current backoff duration (ms) */
  currentBackoff: number;
}

// =====================================================
// CIRCUIT BREAKER
// =====================================================

export class CircuitBreaker {
  private circuits: Map<DIDString, CircuitMetrics> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold || CIRCUIT_BREAKER_PARAMS.FAILURE_THRESHOLD,
      successThreshold: config?.successThreshold || CIRCUIT_BREAKER_PARAMS.SUCCESS_THRESHOLD,
      timeout: config?.timeout || CIRCUIT_BREAKER_PARAMS.TIMEOUT,
      windowSize: config?.windowSize || CIRCUIT_BREAKER_PARAMS.WINDOW_SIZE,
      backoffMultiplier: config?.backoffMultiplier || CIRCUIT_BREAKER_PARAMS.BACKOFF_MULTIPLIER,
      maxBackoff: config?.maxBackoff || CIRCUIT_BREAKER_PARAMS.MAX_BACKOFF,
    };

    console.log('[CircuitBreaker] Initialized with config:', this.config);
  }

  /**
   * Check if request is allowed
   * Returns false if circuit is open
   */
  async isRequestAllowed(agentDid: DIDString): Promise<boolean> {
    const circuit = this.getOrCreateCircuit(agentDid);

    // CLOSED state: allow all requests
    if (circuit.state === 'CLOSED') {
      return true;
    }

    // OPEN state: check if timeout expired
    if (circuit.state === 'OPEN') {
      const now = Date.now();
      const timeSinceOpen = now - (circuit.openedAt || 0);

      // Use exponential backoff
      if (timeSinceOpen >= circuit.currentBackoff) {
        // Transition to HALF_OPEN
        circuit.state = 'HALF_OPEN';
        console.log(`[CircuitBreaker] ${agentDid} transitioned to HALF_OPEN`);
        return true;
      }

      // Still in timeout period
      return false;
    }

    // HALF_OPEN state: allow limited requests
    return true;
  }

  /**
   * Record successful request
   */
  async recordSuccess(agentDid: DIDString): Promise<void> {
    const circuit = this.getOrCreateCircuit(agentDid);
    circuit.successes++;
    circuit.totalRequests++;
    circuit.lastSuccess = Date.now();
    circuit.consecutiveFailures = 0;

    // HALF_OPEN -> CLOSED transition
    if (circuit.state === 'HALF_OPEN') {
      const recentSuccesses = this.countRecentSuccesses(agentDid);
      
      if (recentSuccesses >= this.config.successThreshold) {
        circuit.state = 'CLOSED';
        circuit.currentBackoff = this.config.timeout; // Reset backoff
        console.log(`[CircuitBreaker] ${agentDid} circuit CLOSED after recovery`);
      }
    }
  }

  /**
   * Record failed request
   */
  async recordFailure(agentDid: DIDString, error?: Error): Promise<void> {
    const circuit = this.getOrCreateCircuit(agentDid);
    circuit.failures++;
    circuit.totalRequests++;
    circuit.lastFailure = Date.now();
    circuit.consecutiveFailures++;

    console.warn(`[CircuitBreaker] ${agentDid} failure recorded:`, error?.message || 'Unknown error');

    // Check if should open circuit
    if (circuit.state === 'CLOSED' || circuit.state === 'HALF_OPEN') {
      const recentFailures = this.countRecentFailures(agentDid);

      if (recentFailures >= this.config.failureThreshold) {
        this.openCircuit(agentDid);
      }
    }

    // HALF_OPEN -> OPEN on any failure
    if (circuit.state === 'HALF_OPEN') {
      this.openCircuit(agentDid);
    }
  }

  /**
   * Open circuit for agent
   * Applies exponential backoff
   */
  private openCircuit(agentDid: DIDString): void {
    const circuit = this.getOrCreateCircuit(agentDid);
    
    circuit.state = 'OPEN';
    circuit.openedAt = Date.now();

    // Calculate exponential backoff
    if (circuit.currentBackoff === 0) {
      circuit.currentBackoff = this.config.timeout;
    } else {
      circuit.currentBackoff = Math.min(
        circuit.currentBackoff * this.config.backoffMultiplier,
        this.config.maxBackoff
      );
    }

    console.warn(
      `[CircuitBreaker] ${agentDid} circuit OPENED (backoff: ${circuit.currentBackoff}ms, failures: ${circuit.consecutiveFailures})`
    );
  }

  /**
   * Get circuit metrics
   */
  getMetrics(agentDid: DIDString): CircuitMetrics | null {
    return this.circuits.get(agentDid) || null;
  }

  /**
   * Get or create circuit
   */
  private getOrCreateCircuit(agentDid: DIDString): CircuitMetrics {
    let circuit = this.circuits.get(agentDid);

    if (!circuit) {
      circuit = {
        totalRequests: 0,
        failures: 0,
        successes: 0,
        lastFailure: null,
        lastSuccess: null,
        state: 'CLOSED',
        openedAt: null,
        consecutiveFailures: 0,
        currentBackoff: 0,
      };
      this.circuits.set(agentDid, circuit);
    }

    return circuit;
  }

  /**
   * Count recent failures in rolling window
   */
  private countRecentFailures(agentDid: DIDString): number {
    const circuit = this.circuits.get(agentDid);
    if (!circuit || !circuit.lastFailure) return 0;

    const now = Date.now();
    const windowStart = now - this.config.windowSize;

    // Approximate: use last failure timestamp and consecutive count
    // In production, would maintain failure queue
    if (circuit.lastFailure >= windowStart) {
      return circuit.consecutiveFailures;
    }

    return 0;
  }

  /**
   * Count recent successes in rolling window
   */
  private countRecentSuccesses(agentDid: DIDString): number {
    const circuit = this.circuits.get(agentDid);
    if (!circuit || !circuit.lastSuccess) return 0;

    const now = Date.now();
    const windowStart = now - this.config.windowSize;

    // Approximate: if last success is recent, count it
    if (circuit.lastSuccess >= windowStart) {
      return Math.min(circuit.successes, this.config.successThreshold);
    }

    return 0;
  }

  /**
   * Reset circuit for agent
   */
  resetCircuit(agentDid: DIDString): void {
    this.circuits.delete(agentDid);
    console.log(`[CircuitBreaker] Reset circuit for ${agentDid}`);
  }

  /**
   * Get all circuits
   */
  getAllCircuits(): Map<DIDString, CircuitMetrics> {
    return new Map(this.circuits);
  }

  /**
   * Get circuits by state
   */
  getCircuitsByState(state: CircuitState): Map<DIDString, CircuitMetrics> {
    const filtered = new Map<DIDString, CircuitMetrics>();

    for (const [did, circuit] of this.circuits.entries()) {
      if (circuit.state === state) {
        filtered.set(did, circuit);
      }
    }

    return filtered;
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): {
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
  } {
    let totalRequests = 0;
    let totalFailures = 0;
    let totalSuccesses = 0;
    let openCircuits = 0;
    let halfOpenCircuits = 0;
    let closedCircuits = 0;

    for (const circuit of this.circuits.values()) {
      totalRequests += circuit.totalRequests;
      totalFailures += circuit.failures;
      totalSuccesses += circuit.successes;

      if (circuit.state === 'OPEN') openCircuits++;
      if (circuit.state === 'HALF_OPEN') halfOpenCircuits++;
      if (circuit.state === 'CLOSED') closedCircuits++;
    }

    return {
      totalCircuits: this.circuits.size,
      openCircuits,
      halfOpenCircuits,
      closedCircuits,
      totalRequests,
      totalFailures,
      totalSuccesses,
    };
  }

  /**
   * Cleanup old circuits
   */
  cleanup(): void {
    const now = Date.now();
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    let removed = 0;

    for (const [did, circuit] of this.circuits.entries()) {
      const lastActivity = Math.max(
        circuit.lastFailure || 0,
        circuit.lastSuccess || 0
      );

      if (now - lastActivity > staleThreshold) {
        this.circuits.delete(did);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[CircuitBreaker] Cleanup: removed ${removed} stale circuits`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[CircuitBreaker] Config updated:', this.config);
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let circuitBreakerInstance: CircuitBreaker | null = null;

export function getCircuitBreaker(): CircuitBreaker {
  if (!circuitBreakerInstance) {
    circuitBreakerInstance = new CircuitBreaker();
  }
  return circuitBreakerInstance;
}

export function initCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  circuitBreakerInstance = new CircuitBreaker(config);
  return circuitBreakerInstance;
}

export default CircuitBreaker;
