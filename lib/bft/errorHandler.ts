/**
 * Byzantine Resistance Error Handler
 * 
 * Centralized error handling for Byzantine resistance components.
 * Implements severity-based responses and comprehensive logging.
 * 
 * Requirements: 1.3, 4.4, 5.4, 7.2
 * 
 * @module lib/bft/errorHandler
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export type ByzantineErrorType =
  | 'TEMPORAL_ORDERING_VIOLATION'
  | 'CIRCULAR_DEPENDENCY_DETECTED'
  | 'GRAPH_INVARIANT_VIOLATION'
  | 'SIGNATURE_VERIFICATION_FAILED'
  | 'MERKLE_PROOF_INVALID'
  | 'SYBIL_PATTERN_DETECTED'
  | 'COLLUSION_DETECTED'
  | 'EPOCH_CHAIN_BROKEN'
  | 'SCC_DETECTION_TIMEOUT'
  | 'QUALITY_METRICS_FAILURE';

export type ErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ErrorAction = 
  | 'REJECT_AND_REPORT'
  | 'REJECT'
  | 'THROTTLE'
  | 'WARN'
  | 'DEGRADE_GRACEFULLY';

export interface ByzantineError {
  type: ByzantineErrorType;
  message: string;
  nodeId?: string;
  agentId?: string;
  evidence?: any;
  details?: any;
  timestamp: Date;
  stackTrace?: string;
}

export interface ErrorResponse {
  action: ErrorAction;
  retry: boolean;
  backoff?: number;
  degradedMode?: boolean;
  message: string;
}

/**
 * Byzantine Resistance Error Handler
 * 
 * Handles errors from all Byzantine resistance components:
 * - Temporal ordering violations
 * - Circular dependency detection
 * - Cryptographic verification failures
 * - Economic attack detection
 * 
 * Implements:
 * - Severity assessment
 * - Appropriate response actions
 * - Comprehensive logging
 * - Graceful degradation
 */
export class ByzantineResistanceErrorHandler {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  
  /**
   * Handle Byzantine resistance error
   * 
   * @param error - Error to handle
   * @returns Response with recommended action
   */
  async handleError(error: ByzantineError): Promise<ErrorResponse> {
    // Log error with full context
    await this.logError(error);
    
    // Determine severity
    const severity = this.assessSeverity(error);
    
    // Check circuit breaker
    if (error.nodeId && this.isCircuitOpen(error.nodeId)) {
      return {
        action: 'REJECT_AND_REPORT',
        retry: false,
        message: `Circuit breaker open for node ${error.nodeId}`,
      };
    }
    
    // Apply appropriate response based on severity
    switch (severity) {
      case 'CRITICAL':
        return await this.handleCriticalError(error);
      
      case 'HIGH':
        return await this.handleHighSeverityError(error);
      
      case 'MEDIUM':
        return await this.handleMediumSeverityError(error);
      
      case 'LOW':
        return this.handleLowSeverityError(error);
    }
  }
  
  /**
   * Assess error severity
   */
  private assessSeverity(error: ByzantineError): ErrorSeverity {
    switch (error.type) {
      // Critical: Cryptographic failures, clear Byzantine behavior
      case 'SIGNATURE_VERIFICATION_FAILED':
      case 'MERKLE_PROOF_INVALID':
      case 'EPOCH_CHAIN_BROKEN':
        return 'CRITICAL';
      
      // High: Structural violations, possible attack
      case 'CIRCULAR_DEPENDENCY_DETECTED':
      case 'GRAPH_INVARIANT_VIOLATION':
        return 'HIGH';
      
      // Medium: Quality issues, possible Sybil/collusion
      case 'SYBIL_PATTERN_DETECTED':
      case 'COLLUSION_DETECTED':
        return 'MEDIUM';
      
      // Low: Minor issues, likely benign
      case 'TEMPORAL_ORDERING_VIOLATION':
      case 'SCC_DETECTION_TIMEOUT':
      case 'QUALITY_METRICS_FAILURE':
        return 'LOW';
      
      default:
        return 'MEDIUM';
    }
  }
  
  /**
   * Handle critical severity errors
   */
  private async handleCriticalError(error: ByzantineError): Promise<ErrorResponse> {
    console.error('CRITICAL Byzantine error:', error);
    
    // Report Byzantine behavior
    if (error.nodeId) {
      await this.reportByzantineNode(error.nodeId, error.evidence);
      await this.openCircuitBreaker(error.nodeId);
    }
    
    // Log security event
    await this.logSecurityEvent('CRITICAL', error);
    
    return {
      action: 'REJECT_AND_REPORT',
      retry: false,
      message: `Critical security violation: ${error.message}`,
    };
  }
  
  /**
   * Handle high severity errors
   */
  private async handleHighSeverityError(error: ByzantineError): Promise<ErrorResponse> {
    console.warn('HIGH severity Byzantine error:', error);
    
    // Flag for review
    if (error.nodeId || error.agentId) {
      await this.flagForReview(error.nodeId || error.agentId!, error.details);
    }
    
    // Log security event
    await this.logSecurityEvent('HIGH', error);
    
    return {
      action: 'REJECT',
      retry: true,
      backoff: 60000, // 1 minute
      message: `Structural violation detected: ${error.message}`,
    };
  }
  
  /**
   * Handle medium severity errors
   */
  private async handleMediumSeverityError(error: ByzantineError): Promise<ErrorResponse> {
    console.warn('MEDIUM severity Byzantine error:', error);
    
    // Throttle agent
    if (error.agentId) {
      await this.throttleAgent(error.agentId);
    }
    
    // Log security event
    await this.logSecurityEvent('MEDIUM', error);
    
    return {
      action: 'THROTTLE',
      retry: true,
      backoff: 30000, // 30 seconds
      message: `Quality issue detected: ${error.message}`,
    };
  }
  
  /**
   * Handle low severity errors
   */
  private handleLowSeverityError(error: ByzantineError): ErrorResponse {
    console.info('LOW severity Byzantine error:', error);
    
    // Just log, no action needed
    this.logSecurityEvent('LOW', error).catch(err => {
      console.error('Failed to log security event:', err);
    });
    
    return {
      action: 'WARN',
      retry: true,
      backoff: 5000, // 5 seconds
      message: `Minor issue: ${error.message}`,
    };
  }
  
  /**
   * Log error to database
   */
  private async logError(error: ByzantineError): Promise<void> {
    try {
      await supabase.from('byzantine_error_log').insert({
        error_type: error.type,
        message: error.message,
        node_id: error.nodeId,
        agent_id: error.agentId,
        evidence: error.evidence,
        details: error.details,
        timestamp: error.timestamp.toISOString(),
        stack_trace: error.stackTrace,
      });
    } catch (err) {
      console.error('Failed to log error to database:', err);
    }
  }
  
  /**
   * Log security event
   */
  private async logSecurityEvent(
    severity: ErrorSeverity,
    error: ByzantineError
  ): Promise<void> {
    try {
      await supabase.from('security_events').insert({
        event_type: error.type,
        severity,
        message: error.message,
        node_id: error.nodeId,
        agent_id: error.agentId,
        evidence: error.evidence,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  }
  
  /**
   * Report Byzantine node behavior
   */
  private async reportByzantineNode(nodeId: string, evidence: any): Promise<void> {
    console.error(`Reporting Byzantine node: ${nodeId}`);
    
    try {
      await supabase.from('byzantine_reports').insert({
        node_id: nodeId,
        evidence,
        reported_at: new Date().toISOString(),
        status: 'PENDING_INVESTIGATION',
      });
    } catch (err) {
      console.error('Failed to report Byzantine node:', err);
    }
  }
  
  /**
   * Flag node/agent for manual review
   */
  private async flagForReview(id: string, details: any): Promise<void> {
    console.warn(`Flagging for review: ${id}`);
    
    try {
      await supabase.from('review_queue').insert({
        subject_id: id,
        reason: 'byzantine_behavior',
        details,
        flagged_at: new Date().toISOString(),
        status: 'PENDING',
      });
    } catch (err) {
      console.error('Failed to flag for review:', err);
    }
  }
  
  /**
   * Throttle agent
   */
  private async throttleAgent(agentId: string): Promise<void> {
    console.warn(`Throttling agent: ${agentId}`);
    
    try {
      await supabase
        .from('profiles')
        .update({
          metadata: {
            throttled: true,
            throttled_at: new Date().toISOString(),
            throttle_reason: 'byzantine_error',
          },
        })
        .eq('id', agentId);
    } catch (err) {
      console.error('Failed to throttle agent:', err);
    }
  }
  
  /**
   * Open circuit breaker for node
   */
  private async openCircuitBreaker(nodeId: string): Promise<void> {
    console.error(`Opening circuit breaker for node: ${nodeId}`);
    
    this.circuitBreakers.set(nodeId, {
      isOpen: true,
      openedAt: Date.now(),
      failureCount: 0,
    });
    
    // Circuit breaker auto-closes after 5 minutes
    setTimeout(() => {
      this.closeCircuitBreaker(nodeId);
    }, 300000);
  }
  
  /**
   * Close circuit breaker for node
   */
  private closeCircuitBreaker(nodeId: string): void {
    const state = this.circuitBreakers.get(nodeId);
    if (state) {
      console.info(`Closing circuit breaker for node: ${nodeId}`);
      this.circuitBreakers.delete(nodeId);
    }
  }
  
  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(nodeId: string): boolean {
    const state = this.circuitBreakers.get(nodeId);
    return state?.isOpen || false;
  }
  
  /**
   * Handle graceful degradation
   */
  async handleDegradation(
    component: string,
    error: Error
  ): Promise<ErrorResponse> {
    console.warn(`Component degradation: ${component}`, error);
    
    await this.logSecurityEvent('MEDIUM', {
      type: 'QUALITY_METRICS_FAILURE',
      message: `Component ${component} degraded: ${error.message}`,
      timestamp: new Date(),
      stackTrace: error.stack,
    });
    
    return {
      action: 'DEGRADE_GRACEFULLY',
      retry: false,
      degradedMode: true,
      message: `Operating in degraded mode: ${component} unavailable`,
    };
  }
}

interface CircuitBreakerState {
  isOpen: boolean;
  openedAt: number;
  failureCount: number;
}

// Singleton instance
export const byzantineErrorHandler = new ByzantineResistanceErrorHandler();
