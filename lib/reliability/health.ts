/**
 * Health Check System
 * 
 * Features:
 * - Liveness probe (/health) - is the service running?
 * - Readiness probe (/ready) - is the service ready to accept traffic?
 * - Database connectivity checks
 * - External service health checks
 * - Detailed health status reporting
 * 
 * **Feature: production-audit-improvements, Property 22: Health Check Accuracy**
 * **Validates: Requirements 5.5**
 * 
 * @module lib/reliability/health
 */

// createClient reserved for future use
// @ts-expect-error - Reserved for future use
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Health check status
 */
export enum HealthStatus {
  /** Service is healthy */
  HEALTHY = 'healthy',
  
  /** Service is degraded but operational */
  DEGRADED = 'degraded',
  
  /** Service is unhealthy */
  UNHEALTHY = 'unhealthy',
}

/**
 * Individual component health
 */
export interface ComponentHealth {
  /** Component name */
  name: string;
  
  /** Health status */
  status: HealthStatus;
  
  /** Optional error message */
  message?: string;
  
  /** Response time in milliseconds */
  responseTime?: number;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
  /** Overall status */
  status: HealthStatus;
  
  /** Timestamp of check */
  timestamp: Date;
  
  /** Individual component health */
  components: ComponentHealth[];
  
  /** Service version */
  version?: string;
  
  /** Service uptime in seconds */
  uptime?: number;
}

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<ComponentHealth>;

/**
 * Health Check Manager
 */
export class HealthCheckManager {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private startTime: number = Date.now();
  private version?: string;
  
  constructor(version?: string) {
    this.version = version;
  }
  
  /**
   * Register a health check
   */
  register(name: string, check: HealthCheckFunction): void {
    this.checks.set(name, check);
  }
  
  /**
   * Unregister a health check
   */
  unregister(name: string): boolean {
    return this.checks.delete(name);
  }
  
  /**
   * Run all health checks
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const components: ComponentHealth[] = [];
    
    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, check]) => {
        try {
          const result = await check();
          components.push(result);
        } catch (error) {
          components.push({
            name,
            status: HealthStatus.UNHEALTHY,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    );
    
    await Promise.all(checkPromises);
    
    // Determine overall status
    const overallStatus = this.determineOverallStatus(components);
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      components,
      version: this.version,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
  
  /**
   * Determine overall health status from components
   */
  private determineOverallStatus(components: ComponentHealth[]): HealthStatus {
    if (components.length === 0) {
      return HealthStatus.HEALTHY;
    }
    
    const hasUnhealthy = components.some(c => c.status === HealthStatus.UNHEALTHY);
    const hasDegraded = components.some(c => c.status === HealthStatus.DEGRADED);
    
    if (hasUnhealthy) {
      return HealthStatus.UNHEALTHY;
    }
    
    if (hasDegraded) {
      return HealthStatus.DEGRADED;
    }
    
    return HealthStatus.HEALTHY;
  }
  
  /**
   * Simple liveness check (always returns healthy if service is running)
   */
  async checkLiveness(): Promise<HealthCheckResult> {
    return {
      status: HealthStatus.HEALTHY,
      timestamp: new Date(),
      components: [
        {
          name: 'service',
          status: HealthStatus.HEALTHY,
          message: 'Service is running',
        },
      ],
      version: this.version,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
  
  /**
   * Readiness check (checks if service can accept traffic)
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.checkHealth();
  }
}

/**
 * Create a database health check
 */
export function createDatabaseHealthCheck(
  supabase: SupabaseClient,
  name: string = 'database'
): HealthCheckFunction {
  return async (): Promise<ComponentHealth> => {
    const startTime = Date.now();
    
    try {
      // Simple query to check database connectivity
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      const responseTime = Date.now() - startTime;
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        return {
          name,
          status: HealthStatus.UNHEALTHY,
          message: `Database error: ${error.message}`,
          responseTime,
        };
      }
      
      // Check response time
      if (responseTime > 1000) {
        return {
          name,
          status: HealthStatus.DEGRADED,
          message: 'Database response time is slow',
          responseTime,
        };
      }
      
      return {
        name,
        status: HealthStatus.HEALTHY,
        responseTime,
      };
    } catch (error) {
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  };
}

/**
 * Create an HTTP endpoint health check
 */
export function createHttpHealthCheck(
  url: string,
  name?: string,
  timeout: number = 5000
): HealthCheckFunction {
  return async (): Promise<ComponentHealth> => {
    const startTime = Date.now();
    const checkName = name || new URL(url).hostname;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          name: checkName,
          status: HealthStatus.UNHEALTHY,
          message: `HTTP ${response.status}: ${response.statusText}`,
          responseTime,
        };
      }
      
      if (responseTime > 2000) {
        return {
          name: checkName,
          status: HealthStatus.DEGRADED,
          message: 'Response time is slow',
          responseTime,
        };
      }
      
      return {
        name: checkName,
        status: HealthStatus.HEALTHY,
        responseTime,
      };
    } catch (error) {
      return {
        name: checkName,
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  };
}

/**
 * Create a Redis health check
 */
export function createRedisHealthCheck(
  redis: { ping: () => Promise<string> },
  name: string = 'redis'
): HealthCheckFunction {
  return async (): Promise<ComponentHealth> => {
    const startTime = Date.now();
    
    try {
      const result = await redis.ping();
      const responseTime = Date.now() - startTime;
      
      if (result !== 'PONG') {
        return {
          name,
          status: HealthStatus.UNHEALTHY,
          message: 'Redis ping failed',
          responseTime,
        };
      }
      
      if (responseTime > 100) {
        return {
          name,
          status: HealthStatus.DEGRADED,
          message: 'Redis response time is slow',
          responseTime,
        };
      }
      
      return {
        name,
        status: HealthStatus.HEALTHY,
        responseTime,
      };
    } catch (error) {
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  };
}

/**
 * Global health check manager instance
 */
export const globalHealthCheckManager = new HealthCheckManager(
  process.env.npm_package_version
);
