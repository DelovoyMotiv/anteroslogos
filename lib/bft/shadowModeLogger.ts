/**
 * Shadow Mode Logger
 * 
 * Logs Byzantine resistance detections in shadow mode without blocking operations.
 * Compares shadow results with production behavior for validation.
 * 
 * @module lib/bft/shadowModeLogger
 * @version 1.0.0
 */

import { getFeatureFlagManager } from './featureFlags';
import type { FeatureFlagName } from '../../types/byzantine.types';

/**
 * Detection types for shadow mode logging
 */
export type DetectionType =
  | 'CIRCULAR_DEPENDENCY'
  | 'TEMPORAL_ORDERING_VIOLATION'
  | 'GRAPH_INVARIANT_VIOLATION'
  | 'SYBIL_PATTERN'
  | 'COLLUSION_CLUSTER'
  | 'MERKLE_PROOF_INVALID'
  | 'SIGNATURE_VERIFICATION_FAILED';

/**
 * Shadow mode detection result
 */
export interface ShadowDetection {
  type: DetectionType;
  featureFlag: FeatureFlagName;
  timestamp: Date;
  identifier: string; // Request ID, agent ID, etc.
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details: Record<string, any>;
  wouldBlock: boolean; // Would this detection block in production mode?
  productionBehavior?: 'ALLOWED' | 'BLOCKED' | 'THROTTLED';
}

/**
 * Shadow mode comparison result
 */
export interface ShadowComparison {
  detection: ShadowDetection;
  shadowDecision: 'BLOCK' | 'ALLOW' | 'THROTTLE';
  productionDecision: 'BLOCK' | 'ALLOW' | 'THROTTLE';
  match: boolean;
  divergenceReason?: string;
}

/**
 * Shadow mode statistics
 */
export interface ShadowModeStats {
  totalDetections: number;
  detectionsByType: Record<DetectionType, number>;
  detectionsBySeverity: Record<string, number>;
  wouldBlockCount: number;
  comparisonsMade: number;
  matchRate: number; // Percentage of shadow/production agreement
  divergences: ShadowComparison[];
}

/**
 * Shadow Mode Logger
 * 
 * Handles logging and comparison of detections in shadow mode
 */
export class ShadowModeLogger {
  private detections: ShadowDetection[] = [];
  private comparisons: ShadowComparison[] = [];
  private maxDetections: number = 10000; // Prevent memory overflow
  private maxComparisons: number = 1000;

  /**
   * Log a detection in shadow mode
   * 
   * @param detection - Detection to log
   */
  logDetection(detection: Omit<ShadowDetection, 'timestamp'>): void {
    const fullDetection: ShadowDetection = {
      ...detection,
      timestamp: new Date(),
    };

    // Add to detections array
    this.detections.push(fullDetection);

    // Trim if exceeding max
    if (this.detections.length > this.maxDetections) {
      this.detections = this.detections.slice(-this.maxDetections);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(fullDetection);
    }

    // Log to structured logging system
    this.logToStructuredLogger(fullDetection);
  }

  /**
   * Compare shadow detection with production behavior
   * 
   * @param detection - Shadow detection
   * @param shadowDecision - Decision made in shadow mode
   * @param productionDecision - Decision made in production mode
   */
  compareWithProduction(
    detection: ShadowDetection,
    shadowDecision: 'BLOCK' | 'ALLOW' | 'THROTTLE',
    productionDecision: 'BLOCK' | 'ALLOW' | 'THROTTLE'
  ): void {
    const match = shadowDecision === productionDecision;
    
    const comparison: ShadowComparison = {
      detection,
      shadowDecision,
      productionDecision,
      match,
      divergenceReason: match ? undefined : this.analyzeDivergence(shadowDecision, productionDecision),
    };

    this.comparisons.push(comparison);

    // Trim if exceeding max
    if (this.comparisons.length > this.maxComparisons) {
      this.comparisons = this.comparisons.slice(-this.maxComparisons);
    }

    // Log divergences
    if (!match) {
      this.logDivergence(comparison);
    }
  }

  /**
   * Get shadow mode statistics
   * 
   * @returns Statistics about shadow mode detections
   */
  getStats(): ShadowModeStats {
    const detectionsByType: Record<DetectionType, number> = {
      CIRCULAR_DEPENDENCY: 0,
      TEMPORAL_ORDERING_VIOLATION: 0,
      GRAPH_INVARIANT_VIOLATION: 0,
      SYBIL_PATTERN: 0,
      COLLUSION_CLUSTER: 0,
      MERKLE_PROOF_INVALID: 0,
      SIGNATURE_VERIFICATION_FAILED: 0,
    };

    const detectionsBySeverity: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    let wouldBlockCount = 0;

    for (const detection of this.detections) {
      detectionsByType[detection.type]++;
      detectionsBySeverity[detection.severity]++;
      if (detection.wouldBlock) {
        wouldBlockCount++;
      }
    }

    const matchCount = this.comparisons.filter(c => c.match).length;
    const matchRate = this.comparisons.length > 0
      ? (matchCount / this.comparisons.length) * 100
      : 100;

    return {
      totalDetections: this.detections.length,
      detectionsByType,
      detectionsBySeverity,
      wouldBlockCount,
      comparisonsMade: this.comparisons.length,
      matchRate,
      divergences: this.comparisons.filter(c => !c.match),
    };
  }

  /**
   * Get recent detections
   * 
   * @param limit - Maximum number of detections to return
   * @param type - Optional filter by detection type
   * @returns Recent detections
   */
  getRecentDetections(limit: number = 100, type?: DetectionType): ShadowDetection[] {
    let filtered = this.detections;
    
    if (type) {
      filtered = filtered.filter(d => d.type === type);
    }

    return filtered.slice(-limit);
  }

  /**
   * Get recent divergences
   * 
   * @param limit - Maximum number of divergences to return
   * @returns Recent divergences
   */
  getRecentDivergences(limit: number = 50): ShadowComparison[] {
    return this.comparisons
      .filter(c => !c.match)
      .slice(-limit);
  }

  /**
   * Clear all detections and comparisons
   */
  clear(): void {
    this.detections = [];
    this.comparisons = [];
  }

  /**
   * Export detections to JSON
   * 
   * @returns JSON string of all detections
   */
  exportDetections(): string {
    return JSON.stringify({
      detections: this.detections,
      comparisons: this.comparisons,
      stats: this.getStats(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Log detection to console (development only)
   */
  private logToConsole(detection: ShadowDetection): void {
    const emoji = this.getSeverityEmoji(detection.severity);
    const blockStatus = detection.wouldBlock ? '🚫 WOULD BLOCK' : '✅ WOULD ALLOW';
    
    console.group(`${emoji} [SHADOW MODE] ${detection.type}`);
    console.log(`Feature: ${detection.featureFlag}`);
    console.log(`Severity: ${detection.severity}`);
    console.log(`Decision: ${blockStatus}`);
    console.log(`Identifier: ${detection.identifier}`);
    console.log('Details:', detection.details);
    console.groupEnd();
  }

  /**
   * Log detection to structured logging system
   */
  private logToStructuredLogger(detection: ShadowDetection): void {
    // In production, this would integrate with your logging system
    // (e.g., Winston, Pino, Datadog, etc.)
    const logEntry = {
      level: this.severityToLogLevel(detection.severity),
      message: `[SHADOW MODE] ${detection.type}`,
      shadowMode: true,
      featureFlag: detection.featureFlag,
      detectionType: detection.type,
      severity: detection.severity,
      identifier: detection.identifier,
      wouldBlock: detection.wouldBlock,
      details: detection.details,
      timestamp: detection.timestamp.toISOString(),
    };

    // Log based on severity
    if (detection.severity === 'CRITICAL' || detection.severity === 'HIGH') {
      console.warn('[SHADOW MODE]', logEntry);
    } else {
      console.info('[SHADOW MODE]', logEntry);
    }
  }

  /**
   * Log divergence between shadow and production
   */
  private logDivergence(comparison: ShadowComparison): void {
    console.group('⚠️  [SHADOW MODE] Divergence Detected');
    console.log(`Detection Type: ${comparison.detection.type}`);
    console.log(`Shadow Decision: ${comparison.shadowDecision}`);
    console.log(`Production Decision: ${comparison.productionDecision}`);
    console.log(`Reason: ${comparison.divergenceReason}`);
    console.log('Details:', comparison.detection.details);
    console.groupEnd();

    // In production, send alert for divergences
    if (comparison.detection.severity === 'CRITICAL') {
      this.alertOnCriticalDivergence(comparison);
    }
  }

  /**
   * Analyze why shadow and production diverged
   */
  private analyzeDivergence(
    shadowDecision: string,
    productionDecision: string
  ): string {
    if (shadowDecision === 'BLOCK' && productionDecision === 'ALLOW') {
      return 'Shadow mode detected issue that production missed (potential false positive or new threat)';
    }
    if (shadowDecision === 'ALLOW' && productionDecision === 'BLOCK') {
      return 'Production blocked but shadow mode allowed (shadow mode may be too lenient)';
    }
    if (shadowDecision === 'THROTTLE' && productionDecision === 'ALLOW') {
      return 'Shadow mode would throttle but production allows (potential optimization)';
    }
    if (shadowDecision === 'THROTTLE' && productionDecision === 'BLOCK') {
      return 'Production blocks but shadow mode only throttles (shadow mode may be too lenient)';
    }
    return 'Unknown divergence pattern';
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  }

  /**
   * Convert severity to log level
   */
  private severityToLogLevel(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warn';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'debug';
      default: return 'info';
    }
  }

  /**
   * Alert on critical divergence
   */
  private alertOnCriticalDivergence(comparison: ShadowComparison): void {
    // In production, this would send alerts via:
    // - PagerDuty
    // - Slack
    // - Email
    // - Monitoring dashboard
    console.error('🚨 CRITICAL DIVERGENCE ALERT', {
      type: comparison.detection.type,
      shadowDecision: comparison.shadowDecision,
      productionDecision: comparison.productionDecision,
      identifier: comparison.detection.identifier,
    });
  }
}

/**
 * Singleton instance of shadow mode logger
 */
let shadowModeLoggerInstance: ShadowModeLogger | null = null;

/**
 * Get the singleton shadow mode logger instance
 * 
 * @returns ShadowModeLogger instance
 */
export function getShadowModeLogger(): ShadowModeLogger {
  if (!shadowModeLoggerInstance) {
    shadowModeLoggerInstance = new ShadowModeLogger();
  }
  return shadowModeLoggerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetShadowModeLogger(): void {
  shadowModeLoggerInstance = null;
}

/**
 * Helper function to log detection in shadow mode
 * 
 * @param type - Detection type
 * @param featureFlag - Feature flag name
 * @param identifier - Unique identifier
 * @param severity - Severity level
 * @param details - Detection details
 * @param wouldBlock - Whether this would block in production
 */
export function logShadowDetection(
  type: DetectionType,
  featureFlag: FeatureFlagName,
  identifier: string,
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
  details: Record<string, any>,
  wouldBlock: boolean
): void {
  const logger = getShadowModeLogger();
  const flagManager = getFeatureFlagManager();

  // Only log if feature is in shadow mode
  if (flagManager.isShadowMode(featureFlag)) {
    logger.logDetection({
      type,
      featureFlag,
      identifier,
      severity,
      details,
      wouldBlock,
    });
  }
}

/**
 * Helper function to compare shadow and production behavior
 * 
 * @param detection - Shadow detection
 * @param shadowDecision - Shadow mode decision
 * @param productionDecision - Production mode decision
 */
export function compareShadowWithProduction(
  detection: ShadowDetection,
  shadowDecision: 'BLOCK' | 'ALLOW' | 'THROTTLE',
  productionDecision: 'BLOCK' | 'ALLOW' | 'THROTTLE'
): void {
  const logger = getShadowModeLogger();
  logger.compareWithProduction(detection, shadowDecision, productionDecision);
}

export default ShadowModeLogger;
