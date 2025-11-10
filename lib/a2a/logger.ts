/**
 * A2A Structured Logger - Enterprise Production Logging
 * Structured logging with request tracing, performance monitoring, and error tracking
 * Compatible with DataDog, CloudWatch, and other log aggregators
 */

// =====================================================
// TYPES
// =====================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  request_id?: string;
  agent_id?: string;
  agent_name?: string;
  api_key_prefix?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  method?: string;
  url?: string;
  duration_ms?: number;
  status_code?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  performance?: {
    duration_ms: number;
    memory_mb: number;
    cpu_percent?: number;
  };
  tags?: string[];
}

// =====================================================
// STRUCTURED LOGGER
// =====================================================

class StructuredLogger {
  private level: LogLevel = 'info';
  private service = 'a2a-api';
  private version = '1.0.0';
  private environment = process.env.NODE_ENV || 'development';
  
  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const minLevelIndex = levels.indexOf(this.level);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }
  
  /**
   * Format log entry
   */
  private formatEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        service: this.service,
        version: this.version,
        environment: this.environment,
      },
      tags: context.tags || [],
    };
    
    // Add error details
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }
    
    // Add performance metrics if available
    if (context.duration_ms !== undefined) {
      const memoryUsage = process.memoryUsage();
      entry.performance = {
        duration_ms: context.duration_ms,
        memory_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      };
    }
    
    return entry;
  }
  
  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }
    
    // In production, send to log aggregator (DataDog, CloudWatch, etc.)
    // For now, output structured JSON to console
    const logString = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
      case 'fatal':
        console.error(logString);
        break;
    }
  }
  
  /**
   * Debug log
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.formatEntry('debug', message, context);
    this.output(entry);
  }
  
  /**
   * Info log
   */
  info(message: string, context?: LogContext): void {
    const entry = this.formatEntry('info', message, context);
    this.output(entry);
  }
  
  /**
   * Warning log
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.formatEntry('warn', message, context);
    this.output(entry);
  }
  
  /**
   * Error log
   */
  error(message: string, context?: LogContext, error?: Error): void {
    const entry = this.formatEntry('error', message, context, error);
    this.output(entry);
  }
  
  /**
   * Fatal log (critical errors)
   */
  fatal(message: string, context?: LogContext, error?: Error): void {
    const entry = this.formatEntry('fatal', message, context, error);
    this.output(entry);
  }
  
  /**
   * Log API request
   */
  logRequest(context: LogContext): void {
    this.info(`API Request: ${context.method} ${context.url}`, {
      ...context,
      tags: ['api', 'request', ...(context.tags || [])],
    });
  }
  
  /**
   * Log API response
   */
  logResponse(context: LogContext): void {
    const level: LogLevel = 
      context.status_code && context.status_code >= 500 ? 'error' :
      context.status_code && context.status_code >= 400 ? 'warn' :
      'info';
    
    this[level](`API Response: ${context.method} ${context.url} - ${context.status_code}`, {
      ...context,
      tags: ['api', 'response', ...(context.tags || [])],
    });
  }
  
  /**
   * Log audit execution
   */
  logAudit(url: string, status: 'started' | 'completed' | 'failed', context?: LogContext): void {
    const message = `GEO Audit ${status}: ${url}`;
    const fullContext = {
      ...context,
      url,
      audit_status: status,
      tags: ['audit', status, ...(context?.tags || [])],
    };
    
    if (status === 'failed') {
      this.error(message, fullContext);
    } else {
      this.info(message, fullContext);
    }
  }
  
  /**
   * Log rate limit event
   */
  logRateLimit(action: 'allowed' | 'blocked', context: LogContext): void {
    const message = action === 'allowed' 
      ? 'Rate limit check passed'
      : 'Rate limit exceeded';
    
    const level: LogLevel = action === 'blocked' ? 'warn' : 'debug';
    
    this[level](message, {
      ...context,
      rate_limit_action: action,
      tags: ['rate_limit', action, ...(context.tags || [])],
    });
  }
  
  /**
   * Log agent activity
   */
  logAgentActivity(
    agentId: string,
    activity: string,
    context?: LogContext
  ): void {
    this.info(`Agent activity: ${activity}`, {
      ...context,
      agent_id: agentId,
      activity,
      tags: ['agent', 'activity', ...(context?.tags || [])],
    });
  }
  
  /**
   * Log cache event
   */
  logCache(action: 'hit' | 'miss' | 'set' | 'invalidate', key: string, context?: LogContext): void {
    this.debug(`Cache ${action}: ${key}`, {
      ...context,
      cache_action: action,
      cache_key: key,
      tags: ['cache', action, ...(context?.tags || [])],
    });
  }
  
  /**
   * Log security event
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level: LogLevel = 
      severity === 'critical' ? 'fatal' :
      severity === 'high' ? 'error' :
      severity === 'medium' ? 'warn' :
      'info';
    
    this[level](`Security event: ${event}`, {
      ...context,
      security_event: event,
      severity,
      tags: ['security', severity, ...(context?.tags || [])],
    });
  }
}

// Global logger instance
export const logger = new StructuredLogger();

// =====================================================
// REQUEST TRACER
// =====================================================

export class RequestTracer {
  private startTime: number;
  private context: LogContext;
  
  constructor(requestId: string, context: LogContext = {}) {
    this.startTime = Date.now();
    this.context = {
      ...context,
      request_id: requestId,
    };
  }
  
  /**
   * Log checkpoint with timing
   */
  checkpoint(name: string, metadata?: Record<string, any>): void {
    const elapsed = Date.now() - this.startTime;
    logger.debug(`Checkpoint: ${name}`, {
      ...this.context,
      checkpoint: name,
      elapsed_ms: elapsed,
      ...metadata,
      tags: ['checkpoint', ...(this.context.tags || [])],
    });
  }
  
  /**
   * Complete trace
   */
  complete(statusCode?: number, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    logger.logResponse({
      ...this.context,
      status_code: statusCode,
      duration_ms: duration,
      ...metadata,
    });
  }
  
  /**
   * Fail trace
   */
  fail(error: Error, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    logger.error('Request failed', {
      ...this.context,
      duration_ms: duration,
      ...metadata,
    }, error);
  }
  
  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }
  
  /**
   * Update context
   */
  updateContext(updates: LogContext): void {
    this.context = {
      ...this.context,
      ...updates,
    };
  }
}

// =====================================================
// PERFORMANCE MONITOR
// =====================================================

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  /**
   * Record metric
   */
  record(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    
    this.metrics.set(name, values);
  }
  
  /**
   * Get metric statistics
   */
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  /**
   * Get all metrics
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    
    for (const [name, _values] of this.metrics.entries()) {
      stats[name] = this.getStats(name);
    }
    
    return stats;
  }
  
  /**
   * Clear metrics
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }
}

// Global performance monitor
export const perfMonitor = new PerformanceMonitor();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Create request tracer
 */
export function createRequestTracer(requestId: string, context: LogContext = {}): RequestTracer {
  const tracer = new RequestTracer(requestId, context);
  logger.logRequest(context);
  return tracer;
}

/**
 * Mask sensitive data in logs
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '***';
  }
  
  const visible = data.substring(0, visibleChars);
  return `${visible}${'*'.repeat(data.length - visibleChars)}`;
}

/**
 * Format API key for logging (show only prefix)
 */
export function formatApiKey(apiKey: string): string {
  const parts = apiKey.split('_');
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1]}_***`;
  }
  return maskSensitiveData(apiKey);
}
