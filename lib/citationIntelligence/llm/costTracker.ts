/**
 * Cost Tracker
 * Tracks LLM API usage costs and manages budget alerts
 * 
 * This module provides:
 * - Real-time cost tracking for all LLM requests
 * - Budget limit enforcement and alerts
 * - Usage logging to database
 * - Cost reporting and analytics
 * 
 * @module lib/citationIntelligence/llm/costTracker
 */

import type { 
  TaskType, 
  UsageLog, 
  CostReport, 
  CostTrackerConfig,
  TokenUsage 
} from '../types/llm.types';
import { getModelPricing } from '../config/modelRegistry';
import { supabase, isSupabaseConfigured } from '../../supabase';

// ============================================================================
// Cost Tracker Class
// ============================================================================

/**
 * CostTracker
 * Tracks LLM API usage costs and manages budget alerts
 * 
 * Features:
 * - Real-time cost calculation based on token usage
 * - Budget limit enforcement with configurable thresholds
 * - Alert system for budget warnings (80%) and critical (100%)
 * - In-memory cache for fast access
 * - Database persistence for historical analysis
 * - Cost reporting by model, task type, and time period
 * 
 * @example
 * ```typescript
 * const tracker = new CostTracker({
 *   budgetLimit: 100,
 *   alertThreshold: 0.8,
 *   enableLogging: true,
 *   onAlert: (level, message, data) => {
 *     console.log(`[${level}] ${message}`, data);
 *   }
 * });
 * 
 * // Track a request
 * await tracker.trackRequest('anthropic/claude-sonnet-4.5', 'content_opt', {
 *   prompt: 1000,
 *   completion: 500,
 *   total: 1500
 * });
 * 
 * // Check budget status
 * const utilization = tracker.getBudgetUtilization();
 * console.log(`Budget used: ${utilization}%`);
 * ```
 */
export class CostTracker {
  /** Running total cost in USD */
  private totalCost: number = 0;
  
  /** Monthly budget limit in USD */
  private budgetLimit: number;
  
  /** Alert threshold (0-1, e.g., 0.8 for 80%) */
  private alertThreshold: number;
  
  /** In-memory cache of usage logs */
  private usageLogs: UsageLog[] = [];
  
  /** Maximum number of logs to keep in memory */
  private readonly MAX_CACHE_SIZE = 1000;
  
  /** Whether database logging is enabled */
  private enableLogging: boolean;
  
  /** Alert callback function */
  private onAlert?: (level: 'warning' | 'critical', message: string, data: any) => void;
  
  /** Whether warning alert has been sent */
  private warningAlertSent: boolean = false;
  
  /** Whether critical alert has been sent */
  private criticalAlertSent: boolean = false;
  
  /** Start of current tracking period */
  private periodStart: Date;
  
  /**
   * Create a new CostTracker instance
   * 
   * @param config - Cost tracker configuration
   */
  constructor(config: CostTrackerConfig) {
    this.budgetLimit = config.budgetLimit;
    this.alertThreshold = config.alertThreshold;
    this.enableLogging = config.enableLogging;
    this.onAlert = config.onAlert;
    this.periodStart = new Date();
    
    // Validate configuration
    if (this.budgetLimit <= 0) {
      throw new Error('Budget limit must be greater than 0');
    }
    
    if (this.alertThreshold < 0 || this.alertThreshold > 1) {
      throw new Error('Alert threshold must be between 0 and 1');
    }
  }
  
  // ==========================================================================
  // Core Tracking Methods
  // ==========================================================================
  
  /**
   * Track a request and update costs
   * 
   * @param model - Model identifier
   * @param taskType - Task type
   * @param tokens - Token usage
   * @param success - Whether request succeeded
   * @param durationMs - Request duration in milliseconds
   * @param errorMessage - Error message if failed
   * @param metadata - Optional metadata
   * 
   * @example
   * ```typescript
   * await tracker.trackRequest(
   *   'anthropic/claude-sonnet-4.5',
   *   'content_opt',
   *   { prompt: 1000, completion: 500, total: 1500 },
   *   true,
   *   2500
   * );
   * ```
   */
  async trackRequest(
    model: string,
    taskType: TaskType,
    tokens: TokenUsage,
    success: boolean = true,
    durationMs?: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Calculate cost for this request
    const cost = this.calculateCost(model, tokens);
    
    // Update running total
    this.totalCost += cost;
    
    // Create usage log entry
    const log: UsageLog = {
      model,
      taskType,
      tokens,
      costUsd: cost,
      success,
      timestamp: new Date(),
      durationMs,
      errorMessage,
      metadata,
    };
    
    // Add to in-memory cache
    this.usageLogs.push(log);
    
    // Trim cache if too large
    if (this.usageLogs.length > this.MAX_CACHE_SIZE) {
      this.usageLogs = this.usageLogs.slice(-this.MAX_CACHE_SIZE);
    }
    
    // Check if we should send alerts
    if (this.shouldAlert()) {
      const utilization = this.getBudgetUtilization();
      
      // Send warning alert at threshold
      if (utilization >= this.alertThreshold * 100 && !this.warningAlertSent) {
        this.sendAlert('warning', `Budget utilization at ${utilization.toFixed(1)}%`, {
          totalCost: this.totalCost,
          budgetLimit: this.budgetLimit,
          utilization,
          threshold: this.alertThreshold * 100,
        });
        this.warningAlertSent = true;
      }
      
      // Send critical alert at 100%
      if (utilization >= 100 && !this.criticalAlertSent) {
        this.sendAlert('critical', `Budget limit exceeded: $${this.totalCost.toFixed(2)} / $${this.budgetLimit}`, {
          totalCost: this.totalCost,
          budgetLimit: this.budgetLimit,
          utilization,
          overage: this.totalCost - this.budgetLimit,
        });
        this.criticalAlertSent = true;
      }
    }
    
    // Save to database if enabled
    if (this.enableLogging) {
      await this.saveToDatabase(log);
    }
  }
  
  /**
   * Calculate cost for a request
   * 
   * @param model - Model identifier
   * @param tokens - Token usage
   * @returns Cost in USD
   * 
   * @example
   * ```typescript
   * const cost = tracker.calculateCost('anthropic/claude-sonnet-4.5', {
   *   prompt: 1000,
   *   completion: 500,
   *   total: 1500
   * });
   * // Returns: 0.0105 (1000 * 3.0 / 1M + 500 * 15.0 / 1M)
   * ```
   */
  calculateCost(model: string, tokens: TokenUsage): number {
    const pricing = getModelPricing(model);
    
    let cost = 0;
    
    // Calculate input cost
    cost += (tokens.prompt * pricing.input) / 1_000_000;
    
    // Calculate output cost
    cost += (tokens.completion * pricing.output) / 1_000_000;
    
    // Calculate cached token cost (if applicable)
    if (tokens.cached && tokens.cached > 0 && pricing.cached) {
      cost += (tokens.cached * pricing.cached) / 1_000_000;
    }
    
    return cost;
  }
  
  // ==========================================================================
  // Budget Management Methods
  // ==========================================================================
  
  /**
   * Get total cost
   * 
   * @returns Total cost in USD
   * 
   * @example
   * ```typescript
   * const total = tracker.getTotalCost();
   * console.log(`Total spent: $${total.toFixed(2)}`);
   * ```
   */
  getTotalCost(): number {
    return this.totalCost;
  }
  
  /**
   * Get budget utilization percentage
   * 
   * @returns Budget utilization (0-100+)
   * 
   * @example
   * ```typescript
   * const utilization = tracker.getBudgetUtilization();
   * console.log(`Budget used: ${utilization.toFixed(1)}%`);
   * ```
   */
  getBudgetUtilization(): number {
    return (this.totalCost / this.budgetLimit) * 100;
  }
  
  /**
   * Check if we should send an alert
   * 
   * @returns True if alert should be sent
   * 
   * @example
   * ```typescript
   * if (tracker.shouldAlert()) {
   *   console.log('Budget alert triggered!');
   * }
   * ```
   */
  shouldAlert(): boolean {
    const utilization = this.getBudgetUtilization();
    
    // Send warning alert if at threshold and not yet sent
    if (utilization >= this.alertThreshold * 100 && !this.warningAlertSent) {
      return true;
    }
    
    // Send critical alert if at 100% and not yet sent
    if (utilization >= 100 && !this.criticalAlertSent) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Send an alert
   * 
   * @param level - Alert level ('warning' or 'critical')
   * @param message - Alert message
   * @param data - Additional data
   * 
   * @example
   * ```typescript
   * tracker.sendAlert('warning', 'Budget at 80%', {
   *   totalCost: 80,
   *   budgetLimit: 100
   * });
   * ```
   */
  sendAlert(level: 'warning' | 'critical', message: string, data: any): void {
    // Log to console
    const emoji = level === 'warning' ? '⚠️' : '🚨';
    console[level === 'warning' ? 'warn' : 'error'](`${emoji} [CostTracker] ${message}`, data);
    
    // Call custom alert handler if provided
    if (this.onAlert) {
      try {
        this.onAlert(level, message, data);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    }
  }
  
  /**
   * Reset alert flags
   * Call this when starting a new budget period
   * 
   * @example
   * ```typescript
   * tracker.resetAlerts();
   * ```
   */
  resetAlerts(): void {
    this.warningAlertSent = false;
    this.criticalAlertSent = false;
  }
  
  /**
   * Reset cost tracking
   * Call this when starting a new budget period
   * 
   * @example
   * ```typescript
   * tracker.resetCosts();
   * ```
   */
  resetCosts(): void {
    this.totalCost = 0;
    this.usageLogs = [];
    this.periodStart = new Date();
    this.resetAlerts();
  }
  
  // ==========================================================================
  // Database Methods
  // ==========================================================================
  
  /**
   * Save usage log to database
   * 
   * @param log - Usage log entry
   * 
   * @example
   * ```typescript
   * await tracker.saveToDatabase({
   *   model: 'anthropic/claude-sonnet-4.5',
   *   taskType: 'content_opt',
   *   tokens: { prompt: 1000, completion: 500, total: 1500 },
   *   costUsd: 0.0105,
   *   success: true,
   *   timestamp: new Date()
   * });
   * ```
   */
  async saveToDatabase(log: UsageLog): Promise<void> {
    // Skip if Supabase not configured
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }
    
    try {
      // Type assertion needed because llm_usage_logs table doesn't exist in types yet
      // This will be resolved after running the migration
      const { error } = await (supabase as any)
        .from('llm_usage_logs')
        .insert({
          user_id: log.userId,
          model: log.model,
          task_type: log.taskType,
          prompt_tokens: log.tokens.prompt,
          completion_tokens: log.tokens.completion,
          total_tokens: log.tokens.total,
          cached_tokens: log.tokens.cached,
          cost_usd: log.costUsd,
          duration_ms: log.durationMs,
          success: log.success,
          error_message: log.errorMessage,
          metadata: log.metadata,
          created_at: log.timestamp.toISOString(),
        });
      
      if (error) {
        console.error('Error saving usage log to database:', error);
      }
    } catch (error) {
      console.error('Error saving usage log to database:', error);
    }
  }
  
  // ==========================================================================
  // Reporting Methods
  // ==========================================================================
  
  /**
   * Get cost report for a time period
   * 
   * @param period - Time period ('day', 'week', 'month', or custom date range)
   * @param startDate - Start date for custom period
   * @param endDate - End date for custom period
   * @returns Cost report
   * 
   * @example
   * ```typescript
   * // Get report for current month
   * const report = await tracker.getCostReport('month');
   * 
   * // Get report for custom date range
   * const customReport = await tracker.getCostReport(
   *   'custom',
   *   new Date('2025-01-01'),
   *   new Date('2025-01-31')
   * );
   * ```
   */
  async getCostReport(
    period: 'day' | 'week' | 'month' | 'custom' = 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<CostReport> {
    // Calculate date range
    const now = new Date();
    let start: Date;
    const end: Date = endDate || now;
    
    if (period === 'custom' && startDate) {
      start = startDate;
    } else {
      // Calculate start date based on period
      start = new Date(now);
      switch (period) {
        case 'day':
          start.setDate(start.getDate() - 1);
          break;
        case 'week':
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start.setMonth(start.getMonth() - 1);
          break;
      }
    }
    
    // Filter logs by date range
    const filteredLogs = this.usageLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });
    
    // Calculate total cost
    const totalCost = filteredLogs.reduce((sum, log) => sum + log.costUsd, 0);
    
    // Calculate cost by model
    const costByModel = new Map<string, number>();
    filteredLogs.forEach(log => {
      const current = costByModel.get(log.model) || 0;
      costByModel.set(log.model, current + log.costUsd);
    });
    
    // Calculate cost by task type
    const costByTaskType = new Map<TaskType, number>();
    filteredLogs.forEach(log => {
      const current = costByTaskType.get(log.taskType) || 0;
      costByTaskType.set(log.taskType, current + log.costUsd);
    });
    
    // Calculate total tokens
    const totalTokens = filteredLogs.reduce((sum, log) => sum + log.tokens.total, 0);
    
    // Calculate request count
    const requestCount = filteredLogs.length;
    
    // Calculate average cost per request
    const averageCostPerRequest = requestCount > 0 ? totalCost / requestCount : 0;
    
    // Calculate budget utilization
    const budgetUtilization = (totalCost / this.budgetLimit) * 100;
    
    // Project monthly cost based on current usage
    const daysInPeriod = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const daysInMonth = 30;
    const projectedMonthlyCost = daysInPeriod > 0 
      ? (totalCost / daysInPeriod) * daysInMonth 
      : 0;
    
    return {
      totalCost,
      costByModel,
      costByTaskType,
      requestCount,
      averageCostPerRequest,
      totalTokens,
      period: {
        start,
        end,
      },
      budgetUtilization,
      projectedMonthlyCost,
    };
  }
  
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  
  /**
   * Get in-memory usage logs
   * 
   * @returns Array of usage logs
   * 
   * @example
   * ```typescript
   * const logs = tracker.getUsageLogs();
   * console.log(`${logs.length} requests tracked`);
   * ```
   */
  getUsageLogs(): UsageLog[] {
    return [...this.usageLogs];
  }
  
  /**
   * Get budget configuration
   * 
   * @returns Budget configuration
   * 
   * @example
   * ```typescript
   * const config = tracker.getBudgetConfig();
   * console.log(`Budget: $${config.budgetLimit}, Alert at: ${config.alertThreshold * 100}%`);
   * ```
   */
  getBudgetConfig(): { budgetLimit: number; alertThreshold: number } {
    return {
      budgetLimit: this.budgetLimit,
      alertThreshold: this.alertThreshold,
    };
  }
  
  /**
   * Update budget configuration
   * 
   * @param budgetLimit - New budget limit
   * @param alertThreshold - New alert threshold
   * 
   * @example
   * ```typescript
   * tracker.updateBudgetConfig(200, 0.9);
   * ```
   */
  updateBudgetConfig(budgetLimit?: number, alertThreshold?: number): void {
    if (budgetLimit !== undefined) {
      if (budgetLimit <= 0) {
        throw new Error('Budget limit must be greater than 0');
      }
      this.budgetLimit = budgetLimit;
    }
    
    if (alertThreshold !== undefined) {
      if (alertThreshold < 0 || alertThreshold > 1) {
        throw new Error('Alert threshold must be between 0 and 1');
      }
      this.alertThreshold = alertThreshold;
    }
    
    // Reset alert flags when config changes
    this.resetAlerts();
  }
  
  /**
   * Get period start date
   * 
   * @returns Period start date
   * 
   * @example
   * ```typescript
   * const start = tracker.getPeriodStart();
   * console.log(`Tracking since: ${start.toISOString()}`);
   * ```
   */
  getPeriodStart(): Date {
    return this.periodStart;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Safely get environment variable from import.meta.env or process.env
 */
function getEnvVar(key: string): string | undefined {
  try {
    // Try import.meta.env first (browser/Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      return (import.meta as any).env[key];
    }
  } catch {
    // import.meta not available, fall through to process.env
  }
  
  // Fallback to process.env (Node.js/Vercel)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return undefined;
}

/**
 * Create a new CostTracker instance with default configuration
 * 
 * @param config - Optional configuration overrides
 * @returns CostTracker instance
 * 
 * @example
 * ```typescript
 * const tracker = createCostTracker({
 *   budgetLimit: 100,
 *   alertThreshold: 0.8,
 * });
 * ```
 */
export function createCostTracker(config?: Partial<CostTrackerConfig>): CostTracker {
  // Get defaults from environment variables
  const budgetLimit = parseFloat(
    getEnvVar('VITE_OPENROUTER_BUDGET_LIMIT') || 
    getEnvVar('OPENROUTER_BUDGET_LIMIT') || 
    '100'
  );
  
  const alertThreshold = parseFloat(
    getEnvVar('VITE_OPENROUTER_ALERT_THRESHOLD') || 
    getEnvVar('OPENROUTER_ALERT_THRESHOLD') || 
    '0.8'
  );
  
  const defaultConfig: CostTrackerConfig = {
    budgetLimit,
    alertThreshold,
    enableLogging: true,
  };
  
  return new CostTracker({
    ...defaultConfig,
    ...config,
  });
}
