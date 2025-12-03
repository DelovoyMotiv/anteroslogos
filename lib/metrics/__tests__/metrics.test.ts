/**
 * Unit Tests for Metrics Module
 * 
 * Tests core metrics functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  register,
  httpRequestTotal,
  httpRequestDuration,
  recordHttpRequest,
  recordHttpError,
  recordAuditCompleted,
  recordPaymentTransaction,
  recordCacheAccess,
  recordDbQuery,
  getMetrics,
  getMetricsContentType,
} from '../index';

describe('Metrics Module', () => {
  beforeEach(() => {
    // Reset metrics before each test
    register.resetMetrics();
  });
  
  describe('HTTP Metrics', () => {
    it('should record HTTP request metrics', async () => {
      recordHttpRequest('GET', '/api/health', 200, 0.05);
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_http_requests_total');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/health"');
      expect(metrics).toContain('status_code="200"');
    });
    
    it('should record HTTP errors', async () => {
      recordHttpError('POST', '/api/audit', 'ValidationError');
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_http_errors_total');
      expect(metrics).toContain('error_type="ValidationError"');
    });
    
    it('should track request duration histogram', async () => {
      recordHttpRequest('GET', '/api/users', 200, 0.15);
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_http_request_duration_seconds');
      expect(metrics).toContain('_bucket');
      expect(metrics).toContain('_sum');
      expect(metrics).toContain('_count');
    });
  });
  
  describe('Business Metrics', () => {
    it('should record audit completion', async () => {
      recordAuditCompleted('success', 45.2);
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_audits_completed_total');
      expect(metrics).toContain('status="success"');
      expect(metrics).toContain('anoteros_audit_duration_seconds');
    });
    
    it('should record payment transactions', async () => {
      recordPaymentTransaction('success', 'USDC', 100);
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_payment_transactions_total');
      expect(metrics).toContain('status="success"');
      expect(metrics).toContain('currency="USDC"');
      expect(metrics).toContain('anoteros_payment_amount_usdc');
    });
  });
  
  describe('Cache Metrics', () => {
    it('should record cache hits', async () => {
      recordCacheAccess('user-profiles', true, 0.005);
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_cache_hits_total');
      expect(metrics).toContain('cache_name="user-profiles"');
    });
    
    it('should record cache misses', async () => {
      recordCacheAccess('user-profiles', false, 0.005);
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_cache_misses_total');
      expect(metrics).toContain('cache_name="user-profiles"');
    });
  });
  
  describe('Database Metrics', () => {
    it('should record database queries', async () => {
      recordDbQuery('SELECT', 'users', 0.023);
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_db_query_duration_seconds');
      expect(metrics).toContain('operation="SELECT"');
      expect(metrics).toContain('table="users"');
    });
    
    it('should record database errors', async () => {
      recordDbQuery('INSERT', 'users', 0.050, 'UniqueViolation');
      
      const metrics = await getMetrics();
      
      expect(metrics).toContain('anoteros_db_errors_total');
      expect(metrics).toContain('error_type="UniqueViolation"');
    });
  });
  
  describe('Metrics Export', () => {
    it('should export metrics in Prometheus format', async () => {
      recordHttpRequest('GET', '/api/test', 200, 0.1);
      
      const metrics = await getMetrics();
      
      // Check Prometheus format
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toMatch(/anoteros_\w+/);
    });
    
    it('should return correct content type', () => {
      const contentType = getMetricsContentType();
      
      expect(contentType).toContain('text/plain');
    });
    
    it('should include default metrics', async () => {
      const metrics = await getMetrics();
      
      // Check for Node.js default metrics
      expect(metrics).toContain('anoteros_process_cpu');
      expect(metrics).toContain('anoteros_nodejs_heap_size');
    });
  });
  
  describe('Metric Labels', () => {
    it('should support multiple label combinations', async () => {
      recordHttpRequest('GET', '/api/users', 200, 0.1);
      recordHttpRequest('GET', '/api/users', 404, 0.05);
      recordHttpRequest('POST', '/api/users', 201, 0.2);
      
      const metrics = await getMetrics();
      
      // Should have separate time series for each label combination
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="404"');
      expect(metrics).toContain('status_code="201"');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('method="POST"');
    });
  });
  
  describe('Counter Behavior', () => {
    it('should increment counters correctly', async () => {
      // Record multiple requests
      recordHttpRequest('GET', '/api/test', 200, 0.1);
      recordHttpRequest('GET', '/api/test', 200, 0.1);
      recordHttpRequest('GET', '/api/test', 200, 0.1);
      
      const metrics = await getMetrics();
      
      // Counter should show 3
      expect(metrics).toMatch(/anoteros_http_requests_total\{[^}]*\} 3/);
    });
  });
  
  describe('Histogram Buckets', () => {
    it('should distribute values across histogram buckets', async () => {
      // Record requests with different durations
      recordHttpRequest('GET', '/api/fast', 200, 0.005);  // 5ms
      recordHttpRequest('GET', '/api/medium', 200, 0.15); // 150ms
      recordHttpRequest('GET', '/api/slow', 200, 0.8);    // 800ms
      
      const metrics = await getMetrics();
      
      // Check that buckets are present
      expect(metrics).toContain('le="0.01"');
      expect(metrics).toContain('le="0.05"');
      expect(metrics).toContain('le="0.1"');
      expect(metrics).toContain('le="0.5"');
      expect(metrics).toContain('le="1"');
    });
  });
});
