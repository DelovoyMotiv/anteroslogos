/**
 * Enhanced OpenRouter Client Tests
 * Unit tests for EnhancedOpenRouterClient components
 * 
 * Tests:
 * - Health status reporting
 * - Cost report generation
 * - Rate limit metrics
 * - Cache management
 * - Configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEnhancedOpenRouterClient } from '../index';

describe('EnhancedOpenRouterClient Factory', () => {
  it('should return null when API key is not configured', () => {
    // Clear environment variables
    const originalEnv = process.env.VITE_OPENROUTER_API_KEY;
    delete process.env.VITE_OPENROUTER_API_KEY;
    
    const client = createEnhancedOpenRouterClient();
    
    expect(client).toBeNull();
    
    // Restore environment
    if (originalEnv) {
      process.env.VITE_OPENROUTER_API_KEY = originalEnv;
    }
  });
  
  it('should create client when API key is configured', () => {
    // Set environment variable
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    
    const client = createEnhancedOpenRouterClient();
    
    expect(client).not.toBeNull();
    
    if (client) {
      // Verify client has expected methods
      expect(client.chatWithModel).toBeDefined();
      expect(client.chatWithMultipleModels).toBeDefined();
      expect(client.getHealthStatus).toBeDefined();
      expect(client.getCostReport).toBeDefined();
      expect(client.getRateLimitMetrics).toBeDefined();
      expect(client.clearCache).toBeDefined();
      expect(client.cleanup).toBeDefined();
      
      client.cleanup();
    }
  });
  
  it('should apply configuration overrides', () => {
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    
    const client = createEnhancedOpenRouterClient({
      rateLimiter: {
        capacity: 20,
        refillRate: 20 / 60,
      },
      costTracker: {
        budgetLimit: 200,
        alertThreshold: 0.9,
      },
    });
    
    expect(client).not.toBeNull();
    
    if (client) {
      const health = client.getHealthStatus();
      expect(health).toBeDefined();
      
      client.cleanup();
    }
  });
});

describe('EnhancedOpenRouterClient Health Status', () => {
  let client: ReturnType<typeof createEnhancedOpenRouterClient>;
  
  beforeEach(() => {
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    client = createEnhancedOpenRouterClient({
      rateLimiter: {
        capacity: 10,
        refillRate: 10 / 60,
      },
      costTracker: {
        budgetLimit: 100,
        alertThreshold: 0.8,
      },
    });
  });
  
  afterEach(() => {
    if (client) {
      client.cleanup();
    }
  });
  
  it('should return health status with all components', () => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    const health = client.getHealthStatus();
    
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('rateLimiter');
    expect(health).toHaveProperty('costTracker');
    expect(health).toHaveProperty('circuitBreaker');
    expect(health).toHaveProperty('cache');
    expect(health).toHaveProperty('timestamp');
    
    expect(health.rateLimiter).toHaveProperty('healthy');
    expect(health.rateLimiter).toHaveProperty('tokensAvailable');
    expect(health.rateLimiter).toHaveProperty('requestsQueued');
    
    expect(health.costTracker).toHaveProperty('healthy');
    expect(health.costTracker).toHaveProperty('budgetUtilization');
    expect(health.costTracker).toHaveProperty('totalCost');
    
    expect(health.circuitBreaker).toHaveProperty('state');
    expect(health.circuitBreaker).toHaveProperty('failureCount');
    
    expect(health.cache).toHaveProperty('enabled');
    expect(health.cache).toHaveProperty('size');
    expect(health.cache).toHaveProperty('hitRate');
  });
  
  it('should show healthy state initially', () => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    const health = client.getHealthStatus();
    
    expect(health.healthy).toBe(true);
    expect(health.rateLimiter.healthy).toBe(true);
    expect(health.costTracker.healthy).toBe(true);
    expect(health.circuitBreaker.state).toBe('closed');
  });
});

describe('EnhancedOpenRouterClient Rate Limit Metrics', () => {
  let client: ReturnType<typeof createEnhancedOpenRouterClient>;
  
  beforeEach(() => {
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    client = createEnhancedOpenRouterClient();
  });
  
  afterEach(() => {
    if (client) {
      client.cleanup();
    }
  });
  
  it('should return rate limit metrics', () => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    const metrics = client.getRateLimitMetrics();
    
    expect(metrics).toHaveProperty('tokensAvailable');
    expect(metrics).toHaveProperty('requestsQueued');
    expect(metrics).toHaveProperty('requestsRejected');
    expect(metrics).toHaveProperty('averageWaitTime');
    expect(metrics).toHaveProperty('totalRequests');
    expect(metrics).toHaveProperty('lastRefill');
    
    expect(metrics.tokensAvailable).toBeGreaterThanOrEqual(0);
    expect(metrics.requestsQueued).toBe(0);
    expect(metrics.requestsRejected).toBe(0);
  });
});

describe('EnhancedOpenRouterClient Cost Report', () => {
  let client: ReturnType<typeof createEnhancedOpenRouterClient>;
  
  beforeEach(() => {
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    client = createEnhancedOpenRouterClient();
  });
  
  afterEach(() => {
    if (client) {
      client.cleanup();
    }
  });
  
  it('should generate cost report', async () => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    const report = await client.getCostReport('day');
    
    expect(report).toHaveProperty('totalCost');
    expect(report).toHaveProperty('costByModel');
    expect(report).toHaveProperty('costByTaskType');
    expect(report).toHaveProperty('requestCount');
    expect(report).toHaveProperty('averageCostPerRequest');
    expect(report).toHaveProperty('totalTokens');
    expect(report).toHaveProperty('period');
    expect(report).toHaveProperty('budgetUtilization');
    expect(report).toHaveProperty('projectedMonthlyCost');
    
    expect(report.totalCost).toBe(0); // No requests made yet
    expect(report.requestCount).toBe(0);
  });
});

describe('EnhancedOpenRouterClient Cache Management', () => {
  let client: ReturnType<typeof createEnhancedOpenRouterClient>;
  
  beforeEach(() => {
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    client = createEnhancedOpenRouterClient({
      cache: {
        enabled: true,
        ttl: 300,
        maxSize: 100,
      },
    });
  });
  
  afterEach(() => {
    if (client) {
      client.cleanup();
    }
  });
  
  it('should have cache enabled', () => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    const health = client.getHealthStatus();
    
    expect(health.cache.enabled).toBe(true);
    expect(health.cache.size).toBe(0);
    expect(health.cache.hitRate).toBe(0);
  });
  
  it('should clear cache', () => {
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    client.clearCache();
    
    const health = client.getHealthStatus();
    expect(health.cache.size).toBe(0);
    expect(health.cache.hitRate).toBe(0);
  });
});

describe('EnhancedOpenRouterClient Cleanup', () => {
  it('should clean up resources', () => {
    process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
    const client = createEnhancedOpenRouterClient();
    
    if (!client) {
      throw new Error('Client not initialized');
    }
    
    // Should not throw
    expect(() => client.cleanup()).not.toThrow();
    
    // After cleanup, cache should be empty
    const health = client.getHealthStatus();
    expect(health.cache.size).toBe(0);
  });
});
