/**
 * Tests for Health Check System
 * 
 * **Feature: production-audit-improvements, Property 22: Health Check Accuracy**
 * **Validates: Requirements 5.5**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HealthCheckManager,
  HealthStatus,
  createDatabaseHealthCheck,
  createHttpHealthCheck,
  createRedisHealthCheck,
} from '../health';

describe('Health Check System', () => {
  describe('HealthCheckManager', () => {
    let manager: HealthCheckManager;
    
    beforeEach(() => {
      manager = new HealthCheckManager('1.0.0');
    });
    
    it('should register and run health checks', async () => {
      const check = vi.fn().mockResolvedValue({
        name: 'test',
        status: HealthStatus.HEALTHY,
      });
      
      manager.register('test', check);
      
      const result = await manager.checkHealth();
      
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('test');
      expect(check).toHaveBeenCalledTimes(1);
    });
    
    it('should unregister health checks', async () => {
      const check = vi.fn().mockResolvedValue({
        name: 'test',
        status: HealthStatus.HEALTHY,
      });
      
      manager.register('test', check);
      manager.unregister('test');
      
      const result = await manager.checkHealth();
      
      expect(result.components).toHaveLength(0);
    });
    
    it('should determine overall status as HEALTHY when all components healthy', async () => {
      manager.register('db', async () => ({
        name: 'db',
        status: HealthStatus.HEALTHY,
      }));
      
      manager.register('cache', async () => ({
        name: 'cache',
        status: HealthStatus.HEALTHY,
      }));
      
      const result = await manager.checkHealth();
      
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });
    
    it('should determine overall status as DEGRADED when any component degraded', async () => {
      manager.register('db', async () => ({
        name: 'db',
        status: HealthStatus.HEALTHY,
      }));
      
      manager.register('cache', async () => ({
        name: 'cache',
        status: HealthStatus.DEGRADED,
        message: 'Slow response',
      }));
      
      const result = await manager.checkHealth();
      
      expect(result.status).toBe(HealthStatus.DEGRADED);
    });
    
    it('should determine overall status as UNHEALTHY when any component unhealthy', async () => {
      manager.register('db', async () => ({
        name: 'db',
        status: HealthStatus.HEALTHY,
      }));
      
      manager.register('cache', async () => ({
        name: 'cache',
        status: HealthStatus.UNHEALTHY,
        message: 'Connection failed',
      }));
      
      const result = await manager.checkHealth();
      
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
    });
    
    it('should handle check failures gracefully', async () => {
      manager.register('failing', async () => {
        throw new Error('Check failed');
      });
      
      const result = await manager.checkHealth();
      
      expect(result.components).toHaveLength(1);
      expect(result.components[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.components[0].message).toBe('Check failed');
    });
    
    it('should include version and uptime', async () => {
      const result = await manager.checkHealth();
      
      expect(result.version).toBe('1.0.0');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
    
    it('should return healthy for liveness check', async () => {
      const result = await manager.checkLiveness();
      
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.components[0].name).toBe('service');
    });
    
    it('should run all checks for readiness', async () => {
      manager.register('db', async () => ({
        name: 'db',
        status: HealthStatus.HEALTHY,
      }));
      
      const result = await manager.checkReadiness();
      
      expect(result.components).toHaveLength(1);
    });
  });
  
  describe('createDatabaseHealthCheck', () => {
    it('should return healthy when database is accessible', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      };
      
      const check = createDatabaseHealthCheck(mockSupabase as any);
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should return degraded when database is slow', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                return new Promise(resolve => {
                  setTimeout(() => {
                    resolve({ error: null });
                  }, 1100); // Slow response
                });
              }),
            }),
          }),
        }),
      };
      
      const check = createDatabaseHealthCheck(mockSupabase as any);
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.message).toContain('slow');
    });
    
    it('should return unhealthy when database has error', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                error: { message: 'Connection failed', code: 'CONN_ERROR' },
              }),
            }),
          }),
        }),
      };
      
      const check = createDatabaseHealthCheck(mockSupabase as any);
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toContain('Connection failed');
    });
  });
  
  describe('createHttpHealthCheck', () => {
    it('should return healthy for successful HTTP request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      
      const check = createHttpHealthCheck('https://api.example.com/health');
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should return unhealthy for failed HTTP request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      const check = createHttpHealthCheck('https://api.example.com/health');
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toContain('500');
    });
    
    it('should return unhealthy on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const check = createHttpHealthCheck('https://api.example.com/health');
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toContain('Network error');
    });
  });
  
  describe('createRedisHealthCheck', () => {
    it('should return healthy when Redis responds to ping', async () => {
      const mockRedis = {
        ping: vi.fn().mockResolvedValue('PONG'),
      };
      
      const check = createRedisHealthCheck(mockRedis);
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should return degraded when Redis is slow', async () => {
      const mockRedis = {
        ping: vi.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve('PONG'), 150);
          });
        }),
      };
      
      const check = createRedisHealthCheck(mockRedis);
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.message).toContain('slow');
    });
    
    it('should return unhealthy when Redis ping fails', async () => {
      const mockRedis = {
        ping: vi.fn().mockRejectedValue(new Error('Connection refused')),
      };
      
      const check = createRedisHealthCheck(mockRedis);
      const result = await check();
      
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toContain('Connection refused');
    });
  });
});
