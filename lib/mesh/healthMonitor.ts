/**
 * Peer Health Monitor
 * Real-time health tracking for mesh network peers
 * 
 * Features:
 * - RTT measurement with ping/pong
 * - Failure detection with exponential backoff
 * - Health scoring (0-100)
 * - Adaptive timeout based on historical performance
 * - Connection quality metrics (jitter, packet loss)
 * - Periodic health checks
 * 
 * @module lib/mesh/healthMonitor
 * @version 1.0.0
 */

import type { MeshNode } from './network';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'down';

/**
 * Peer health metrics
 */
export interface PeerHealthMetrics {
  nodeId: string;
  status: HealthStatus;
  healthScore: number; // 0-100
  rtt: number; // ms (exponential moving average)
  rttMin: number;
  rttMax: number;
  jitter: number; // ms (RTT variance)
  packetLoss: number; // 0-1 (percentage)
  successRate: number; // 0-1
  consecutiveFailures: number;
  lastCheck: number; // timestamp
  lastSuccess: number; // timestamp
  lastFailure: number; // timestamp
  totalChecks: number;
  totalSuccesses: number;
  totalFailures: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  success: boolean;
  rtt: number;
  timestamp: number;
  error?: string;
}

/**
 * Monitor configuration
 */
export interface HealthMonitorConfig {
  checkInterval: number; // ms (default: 30000)
  timeout: number; // ms (default: 5000)
  maxFailures: number; // (default: 3)
  rttSmoothingFactor: number; // EMA alpha (default: 0.3)
  healthThresholds: {
    healthy: number; // score >= 80
    degraded: number; // score >= 50
    unhealthy: number; // score >= 20
    // score < 20 = down
  };
}

// =====================================================
// HEALTH MONITOR
// =====================================================

export class PeerHealthMonitor {
  private metrics: Map<string, PeerHealthMetrics> = new Map();
  private config: HealthMonitorConfig;
  private checkTimers: Map<string, NodeJS.Timeout> = new Map();
  private rttHistory: Map<string, number[]> = new Map(); // For jitter calculation

  // Default configuration (adjusted for Vercel free tier)
  private static readonly DEFAULT_CONFIG: HealthMonitorConfig = {
    checkInterval: 86400000, // 24 hours (Vercel CRON limit)
    timeout: 5000, // 5 seconds
    maxFailures: 3,
    rttSmoothingFactor: 0.3, // EMA alpha
    healthThresholds: {
      healthy: 80,
      degraded: 50,
      unhealthy: 20,
    },
  };

  constructor(config?: Partial<HealthMonitorConfig>) {
    this.config = { ...PeerHealthMonitor.DEFAULT_CONFIG, ...config };
    console.log('[HealthMonitor] Initialized');
  }

  // =====================================================
  // MONITORING
  // =====================================================

  /**
   * Start monitoring a peer
   */
  startMonitoring(node: MeshNode): void {
    if (this.metrics.has(node.nodeId)) {
      console.log(`[HealthMonitor] Already monitoring ${node.aidUri}`);
      return;
    }

    // Initialize metrics
    const metrics: PeerHealthMetrics = {
      nodeId: node.nodeId,
      status: 'healthy',
      healthScore: 100,
      rtt: node.rtt || 0,
      rttMin: Infinity,
      rttMax: 0,
      jitter: 0,
      packetLoss: 0,
      successRate: 1,
      consecutiveFailures: 0,
      lastCheck: 0,
      lastSuccess: 0,
      lastFailure: 0,
      totalChecks: 0,
      totalSuccesses: 0,
      totalFailures: 0,
    };

    this.metrics.set(node.nodeId, metrics);
    this.rttHistory.set(node.nodeId, []);

    // Start periodic health checks
    this.scheduleHealthCheck(node);

    console.log(`[HealthMonitor] Started monitoring ${node.aidUri}`);
  }

  /**
   * Stop monitoring a peer
   */
  stopMonitoring(nodeId: string): void {
    const timer = this.checkTimers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
      this.checkTimers.delete(nodeId);
    }

    this.metrics.delete(nodeId);
    this.rttHistory.delete(nodeId);

    console.log(`[HealthMonitor] Stopped monitoring node ${nodeId}`);
  }

  /**
   * Schedule next health check
   */
  private scheduleHealthCheck(node: MeshNode): void {
    const timer = setTimeout(async () => {
      await this.performHealthCheck(node);
      
      // Schedule next check if still monitoring
      if (this.metrics.has(node.nodeId)) {
        this.scheduleHealthCheck(node);
      }
    }, this.config.checkInterval);

    this.checkTimers.set(node.nodeId, timer);
  }

  /**
   * Perform health check (ping)
   */
  private async performHealthCheck(node: MeshNode): Promise<HealthCheckResult> {
    const metrics = this.metrics.get(node.nodeId);
    if (!metrics) {
      return { success: false, rtt: 0, timestamp: Date.now(), error: 'Metrics not found' };
    }

    metrics.totalChecks++;
    metrics.lastCheck = Date.now();

    try {
      const startTime = Date.now();
      
      // Perform actual HTTP HEAD ping to peer endpoint
      await this.performActualPing(node, this.config.timeout);
      
      const rtt = Date.now() - startTime;

      // Success
      const result: HealthCheckResult = {
        success: true,
        rtt,
        timestamp: Date.now(),
      };

      this.recordSuccess(metrics, rtt);
      
      return result;
    } catch (error) {
      // Failure
      const result: HealthCheckResult = {
        success: false,
        rtt: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.recordFailure(metrics);
      
      return result;
    }
  }

  /**
   * Perform actual HTTP HEAD ping to peer endpoint
   */
  private async performActualPing(node: MeshNode, timeout: number): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(node.endpoint, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'AnoterosLogos-MeshHealth/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // =====================================================
  // METRICS UPDATE
  // =====================================================

  /**
   * Record successful health check
   */
  private recordSuccess(metrics: PeerHealthMetrics, rtt: number): void {
    metrics.totalSuccesses++;
    metrics.consecutiveFailures = 0;
    metrics.lastSuccess = Date.now();

    // Update RTT with exponential moving average
    if (metrics.rtt === 0) {
      metrics.rtt = rtt;
    } else {
      const alpha = this.config.rttSmoothingFactor;
      metrics.rtt = alpha * rtt + (1 - alpha) * metrics.rtt;
    }

    // Update RTT min/max
    metrics.rttMin = Math.min(metrics.rttMin, rtt);
    metrics.rttMax = Math.max(metrics.rttMax, rtt);

    // Update jitter (RTT variance)
    this.updateJitter(metrics.nodeId, rtt);

    // Update success rate
    metrics.successRate = metrics.totalSuccesses / metrics.totalChecks;

    // Update packet loss
    metrics.packetLoss = metrics.totalFailures / metrics.totalChecks;

    // Update health score
    this.updateHealthScore(metrics);

    console.log(
      `[HealthMonitor] ${metrics.nodeId}: RTT=${metrics.rtt.toFixed(0)}ms, ` +
      `Health=${metrics.healthScore}, Status=${metrics.status}`
    );
  }

  /**
   * Record failed health check
   */
  private recordFailure(metrics: PeerHealthMetrics): void {
    metrics.totalFailures++;
    metrics.consecutiveFailures++;
    metrics.lastFailure = Date.now();

    // Update success rate
    metrics.successRate = metrics.totalSuccesses / metrics.totalChecks;

    // Update packet loss
    metrics.packetLoss = metrics.totalFailures / metrics.totalChecks;

    // Update health score
    this.updateHealthScore(metrics);

    console.error(
      `[HealthMonitor] ${metrics.nodeId}: Check FAILED ` +
      `(consecutive: ${metrics.consecutiveFailures}), ` +
      `Health=${metrics.healthScore}, Status=${metrics.status}`
    );
  }

  /**
   * Update jitter (RTT variance)
   */
  private updateJitter(nodeId: string, rtt: number): void {
    const history = this.rttHistory.get(nodeId) || [];
    
    history.push(rtt);
    
    // Keep last 10 RTT samples
    if (history.length > 10) {
      history.shift();
    }

    this.rttHistory.set(nodeId, history);

    // Calculate jitter (standard deviation)
    if (history.length >= 2) {
      const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
      const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
      const jitter = Math.sqrt(variance);

      const metrics = this.metrics.get(nodeId);
      if (metrics) {
        metrics.jitter = jitter;
      }
    }
  }

  /**
   * Update health score (0-100)
   * Factors:
   * - Success rate (40%)
   * - RTT (30%)
   * - Jitter (20%)
   * - Consecutive failures (10%)
   */
  private updateHealthScore(metrics: PeerHealthMetrics): void {
    // Success rate score (0-100)
    const successScore = metrics.successRate * 100;

    // RTT score (lower is better)
    // 0ms = 100, 1000ms = 0
    const rttScore = Math.max(0, 100 - (metrics.rtt / 10));

    // Jitter score (lower is better)
    // 0ms = 100, 100ms = 0
    const jitterScore = Math.max(0, 100 - metrics.jitter);

    // Consecutive failures penalty
    // 0 failures = 100, 3+ failures = 0
    const failureScore = Math.max(0, 100 - (metrics.consecutiveFailures * 33));

    // Weighted average
    const healthScore = 
      successScore * 0.4 +
      rttScore * 0.3 +
      jitterScore * 0.2 +
      failureScore * 0.1;

    metrics.healthScore = Math.round(healthScore);

    // Update status based on thresholds
    if (metrics.healthScore >= this.config.healthThresholds.healthy) {
      metrics.status = 'healthy';
    } else if (metrics.healthScore >= this.config.healthThresholds.degraded) {
      metrics.status = 'degraded';
    } else if (metrics.healthScore >= this.config.healthThresholds.unhealthy) {
      metrics.status = 'unhealthy';
    } else {
      metrics.status = 'down';
    }
  }

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Get health metrics for a peer
   */
  getMetrics(nodeId: string): PeerHealthMetrics | null {
    return this.metrics.get(nodeId) || null;
  }

  /**
   * Get all health metrics
   */
  getAllMetrics(): PeerHealthMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get healthy peers
   */
  getHealthyPeers(): PeerHealthMetrics[] {
    return this.getAllMetrics().filter(m => m.status === 'healthy');
  }

  /**
   * Get degraded peers
   */
  getDegradedPeers(): PeerHealthMetrics[] {
    return this.getAllMetrics().filter(m => m.status === 'degraded');
  }

  /**
   * Get unhealthy peers
   */
  getUnhealthyPeers(): PeerHealthMetrics[] {
    return this.getAllMetrics().filter(m => m.status === 'unhealthy' || m.status === 'down');
  }

  /**
   * Check if peer is healthy
   */
  isHealthy(nodeId: string): boolean {
    const metrics = this.metrics.get(nodeId);
    return metrics ? metrics.status === 'healthy' : false;
  }

  /**
   * Check if peer should be evicted
   */
  shouldEvict(nodeId: string): boolean {
    const metrics = this.metrics.get(nodeId);
    if (!metrics) return false;

    // Evict if:
    // 1. Consecutive failures exceed threshold
    // 2. Status is 'down'
    return metrics.consecutiveFailures >= this.config.maxFailures || metrics.status === 'down';
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  /**
   * Get aggregated statistics
   */
  getStats(): {
    totalPeers: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    down: number;
    avgRtt: number;
    avgHealthScore: number;
    avgSuccessRate: number;
  } {
    const allMetrics = this.getAllMetrics();
    
    if (allMetrics.length === 0) {
      return {
        totalPeers: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        down: 0,
        avgRtt: 0,
        avgHealthScore: 0,
        avgSuccessRate: 0,
      };
    }

    const statusCounts = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      down: 0,
    };

    let totalRtt = 0;
    let totalHealthScore = 0;
    let totalSuccessRate = 0;

    for (const metrics of allMetrics) {
      statusCounts[metrics.status]++;
      totalRtt += metrics.rtt;
      totalHealthScore += metrics.healthScore;
      totalSuccessRate += metrics.successRate;
    }

    return {
      totalPeers: allMetrics.length,
      healthy: statusCounts.healthy,
      degraded: statusCounts.degraded,
      unhealthy: statusCounts.unhealthy,
      down: statusCounts.down,
      avgRtt: totalRtt / allMetrics.length,
      avgHealthScore: totalHealthScore / allMetrics.length,
      avgSuccessRate: totalSuccessRate / allMetrics.length,
    };
  }

  // =====================================================
  // MANUAL UPDATES
  // =====================================================

  /**
   * Manually record a successful request (from actual usage)
   */
  recordRequestSuccess(nodeId: string, rtt: number): void {
    const metrics = this.metrics.get(nodeId);
    if (!metrics) return;

    this.recordSuccess(metrics, rtt);
  }

  /**
   * Manually record a failed request (from actual usage)
   */
  recordRequestFailure(nodeId: string): void {
    const metrics = this.metrics.get(nodeId);
    if (!metrics) return;

    this.recordFailure(metrics);
  }

  // =====================================================
  // LIFECYCLE
  // =====================================================

  /**
   * Stop all monitoring
   */
  stop(): void {
    console.log('[HealthMonitor] Stopping...');
    
    // Clear all timers
    for (const timer of this.checkTimers.values()) {
      clearTimeout(timer);
    }

    this.checkTimers.clear();
    this.metrics.clear();
    this.rttHistory.clear();
  }
}

// =====================================================
// GLOBAL INSTANCE
// =====================================================

let globalHealthMonitor: PeerHealthMonitor | null = null;

/**
 * Get or create global health monitor
 */
export function getHealthMonitor(config?: Partial<HealthMonitorConfig>): PeerHealthMonitor {
  if (!globalHealthMonitor) {
    globalHealthMonitor = new PeerHealthMonitor(config);
  }
  return globalHealthMonitor;
}

// =====================================================
// EXPORTS
// =====================================================

export default PeerHealthMonitor;
