/**
 * Integration Tests for OpenTelemetry Tracing
 * 
 * Tests the complete tracing flow with real operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeTracing, shutdownTracing } from '../tracer';
import {
  traceDbQuery,
  traceExternalApiCall,
  traceA2AMessage,
  traceCacheOperation,
  traceBackgroundJob,
} from '../helpers';
import type { TracingConfig } from '../tracer';

describe('Integration Tests: OpenTelemetry Tracing', () => {
  const testConfig: TracingConfig = {
    serviceName: 'integration-test',
    serviceVersion: '1.0.0',
    environment: 'test',
    enabled: true,
  };

  beforeAll(() => {
    initializeTracing(testConfig);
  });

  afterAll(async () => {
    await shutdownTracing();
  });

  describe('Database Query Tracing', () => {
    it('should trace successful database query', async () => {
      const result = await traceDbQuery('select', 'users', async () => {
        // Simulate database query
        return { id: '1', name: 'Test User' };
      });
      
      expect(result).toEqual({ id: '1', name: 'Test User' });
    });

    it('should trace failed database query', async () => {
      await expect(
        traceDbQuery('select', 'users', async () => {
          throw new Error('Database connection failed');
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should trace multiple database operations', async () => {
      const results = await Promise.all([
        traceDbQuery('select', 'users', async () => ({ count: 10 })),
        traceDbQuery('insert', 'audit_logs', async () => ({ id: 'log-1' })),
        traceDbQuery('update', 'profiles', async () => ({ updated: true })),
      ]);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ count: 10 });
      expect(results[1]).toEqual({ id: 'log-1' });
      expect(results[2]).toEqual({ updated: true });
    });
  });

  describe('External API Call Tracing', () => {
    it('should trace successful external API call', async () => {
      const result = await traceExternalApiCall(
        'test-api',
        'https://api.example.com/data',
        'GET',
        async () => {
          return { data: 'test data' };
        }
      );
      
      expect(result).toEqual({ data: 'test data' });
    });

    it('should trace failed external API call', async () => {
      await expect(
        traceExternalApiCall(
          'test-api',
          'https://api.example.com/data',
          'POST',
          async () => {
            throw new Error('API request failed');
          }
        )
      ).rejects.toThrow('API request failed');
    });

    it('should trace multiple external API calls', async () => {
      const results = await Promise.all([
        traceExternalApiCall('api-1', '/endpoint-1', 'GET', async () => 'result-1'),
        traceExternalApiCall('api-2', '/endpoint-2', 'POST', async () => 'result-2'),
        traceExternalApiCall('api-3', '/endpoint-3', 'PUT', async () => 'result-3'),
      ]);
      
      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
    });
  });

  describe('A2A Message Tracing', () => {
    it('should trace A2A message processing', async () => {
      const result = await traceA2AMessage(
        'geo.audit.request',
        'agent-123',
        async () => {
          return { status: 'processed', score: 85 };
        }
      );
      
      expect(result).toEqual({ status: 'processed', score: 85 });
    });

    it('should trace failed A2A message', async () => {
      await expect(
        traceA2AMessage('invalid.method', 'agent-456', async () => {
          throw new Error('Invalid method');
        })
      ).rejects.toThrow('Invalid method');
    });
  });

  describe('Cache Operation Tracing', () => {
    it('should trace cache get operation', async () => {
      const result = await traceCacheOperation(
        'get',
        'user-cache',
        'user:123',
        async () => {
          return { id: '123', name: 'Cached User' };
        }
      );
      
      expect(result).toEqual({ id: '123', name: 'Cached User' });
    });

    it('should trace cache set operation', async () => {
      const result = await traceCacheOperation(
        'set',
        'user-cache',
        'user:456',
        async () => {
          return true;
        }
      );
      
      expect(result).toBe(true);
    });

    it('should trace cache delete operation', async () => {
      const result = await traceCacheOperation(
        'delete',
        'user-cache',
        'user:789',
        async () => {
          return 1; // Number of keys deleted
        }
      );
      
      expect(result).toBe(1);
    });
  });

  describe('Background Job Tracing', () => {
    it('should trace background job execution', async () => {
      const result = await traceBackgroundJob(
        'email-sender',
        'job-123',
        async () => {
          return { sent: 10, failed: 0 };
        }
      );
      
      expect(result).toEqual({ sent: 10, failed: 0 });
    });

    it('should trace failed background job', async () => {
      await expect(
        traceBackgroundJob('data-processor', 'job-456', async () => {
          throw new Error('Processing failed');
        })
      ).rejects.toThrow('Processing failed');
    });
  });

  describe('Complex Scenarios', () => {
    it('should trace nested operations', async () => {
      const result = await traceDbQuery('select', 'users', async () => {
        const user = { id: '1', name: 'Test' };
        
        // Nested external API call
        const enrichedData = await traceExternalApiCall(
          'enrichment-api',
          '/enrich',
          'POST',
          async () => {
            return { ...user, enriched: true };
          }
        );
        
        // Nested cache operation
        await traceCacheOperation('set', 'user-cache', user.id, async () => {
          return enrichedData;
        });
        
        return enrichedData;
      });
      
      expect(result).toEqual({ id: '1', name: 'Test', enriched: true });
    });

    it('should trace parallel operations', async () => {
      const results = await Promise.all([
        traceDbQuery('select', 'users', async () => ({ users: 10 })),
        traceExternalApiCall('api', '/data', 'GET', async () => ({ data: 'test' })),
        traceCacheOperation('get', 'cache', 'key', async () => 'cached'),
        traceBackgroundJob('job', 'id', async () => 'completed'),
      ]);
      
      expect(results).toHaveLength(4);
      expect(results[0]).toEqual({ users: 10 });
      expect(results[1]).toEqual({ data: 'test' });
      expect(results[2]).toBe('cached');
      expect(results[3]).toBe('completed');
    });

    it('should handle mixed success and failure', async () => {
      const results = await Promise.allSettled([
        traceDbQuery('select', 'users', async () => 'success'),
        traceDbQuery('insert', 'logs', async () => {
          throw new Error('Insert failed');
        }),
        traceExternalApiCall('api', '/data', 'GET', async () => 'api-success'),
      ]);
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toBe('success');
      }
      if (results[2].status === 'fulfilled') {
        expect(results[2].value).toBe('api-success');
      }
    });
  });

  describe('Performance', () => {
    it('should handle high volume of traces', async () => {
      const operations = Array.from({ length: 100 }, (_, i) =>
        traceDbQuery('select', 'test', async () => i)
      );
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(100);
      expect(results[0]).toBe(0);
      expect(results[99]).toBe(99);
    });

    it('should not significantly impact operation performance', async () => {
      const startTime = Date.now();
      
      await traceDbQuery('select', 'performance-test', async () => {
        // Simulate 10ms operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });
      
      const duration = Date.now() - startTime;
      
      // Tracing overhead should be minimal (< 5ms)
      expect(duration).toBeLessThan(20);
    });
  });
});
