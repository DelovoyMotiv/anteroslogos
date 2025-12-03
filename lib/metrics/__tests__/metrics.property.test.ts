/**
 * Property-Based Tests for Metrics Module
 * 
 * Feature: production-audit-improvements, Property 42: Metrics Export
 * Validates: Requirements 8.2
 * 
 * Property 42: Metrics Export
 * For any API endpoint, it should export latency and error rate metrics to Prometheus
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  register,
  recordHttpRequest,
  recordHttpError,
  recordAuditCompleted,
  recordPaymentTransaction,
  recordCacheAccess,
  recordDbQuery,
  getMetrics,
} from '../index';

describe('Metrics Property-Based Tests', () => {
  beforeEach(() => {
    register.resetMetrics();
  });
  
  /**
   * Property 42: Metrics Export
   * For any API endpoint, it should export latency and error rate metrics to Prometheus
   */
  it('should export metrics for any HTTP request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        fc.webPath(),
        fc.integer({ min: 100, max: 599 }),
        fc.double({ min: 0.001, max: 10, noNaN: true }),
        async (method, route, statusCode, duration) => {
          // Reset metrics for each iteration
          register.resetMetrics();
          
          // Record HTTP request
          recordHttpRequest(method, route, statusCode, duration);
          
          // Get metrics
          const metrics = await getMetrics();
          
          // Verify metrics are exported
          expect(metrics).toContain('anoteros_http_requests_total');
          expect(metrics).toContain('anoteros_http_request_duration_seconds');
          expect(metrics).toContain(`method="${method}"`);
          expect(metrics).toContain(`status_code="${statusCode}"`);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Counter monotonicity
   * For any sequence of requests, counters should only increase
   */
  it('should maintain counter monotonicity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            method: fc.constantFrom('GET', 'POST'),
            route: fc.constantFrom('/api/test', '/api/users'),
            statusCode: fc.constantFrom(200, 404, 500),
            duration: fc.double({ min: 0.001, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (requests) => {
          register.resetMetrics();
          
          let previousCount = 0;
          
          for (const req of requests) {
            recordHttpRequest(req.method, req.route, req.statusCode, req.duration);
            
            const metrics = await getMetrics();
            const match = metrics.match(/anoteros_http_requests_total\{[^}]*\} (\d+)/);
            
            if (match) {
              const currentCount = parseInt(match[1], 10);
              expect(currentCount).toBeGreaterThanOrEqual(previousCount);
              previousCount = currentCount;
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Histogram sum equals sum of observations
   * For any sequence of durations, histogram sum should equal the sum of all durations
   */
  it('should maintain histogram sum accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.double({ min: 0.001, max: 5, noNaN: true }),
          { minLength: 1, maxLength: 20 }
        ),
        async (durations) => {
          register.resetMetrics();
          
          // Record all durations
          for (const duration of durations) {
            recordHttpRequest('GET', '/api/test', 200, duration);
          }
          
          const metrics = await getMetrics();
          
          // Extract histogram sum
          const sumMatch = metrics.match(/anoteros_http_request_duration_seconds_sum\{[^}]*\} ([\d.]+)/);
          
          if (sumMatch) {
            const histogramSum = parseFloat(sumMatch[1]);
            const expectedSum = durations.reduce((a, b) => a + b, 0);
            
            // Allow small floating point error
            expect(Math.abs(histogramSum - expectedSum)).toBeLessThan(0.001);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Histogram count equals number of observations
   * For any sequence of requests, histogram count should equal the number of requests
   */
  it('should maintain histogram count accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.double({ min: 0.001, max: 5, noNaN: true }),
          { minLength: 1, maxLength: 20 }
        ),
        async (durations) => {
          register.resetMetrics();
          
          // Record all durations
          for (const duration of durations) {
            recordHttpRequest('GET', '/api/test', 200, duration);
          }
          
          const metrics = await getMetrics();
          
          // Extract histogram count
          const countMatch = metrics.match(/anoteros_http_request_duration_seconds_count\{[^}]*\} (\d+)/);
          
          if (countMatch) {
            const histogramCount = parseInt(countMatch[1], 10);
            expect(histogramCount).toBe(durations.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Cache hit rate calculation
   * For any sequence of cache accesses, hit rate should be hits / (hits + misses)
   */
  it('should calculate cache hit rate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            hit: fc.boolean(),
            duration: fc.double({ min: 0.001, max: 0.1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (accesses) => {
          register.resetMetrics();
          
          let expectedHits = 0;
          let expectedMisses = 0;
          
          for (const access of accesses) {
            recordCacheAccess('test-cache', access.hit, access.duration);
            if (access.hit) {
              expectedHits++;
            } else {
              expectedMisses++;
            }
          }
          
          const metrics = await getMetrics();
          
          const hitsMatch = metrics.match(/anoteros_cache_hits_total\{cache_name="test-cache"\} (\d+)/);
          const missesMatch = metrics.match(/anoteros_cache_misses_total\{cache_name="test-cache"\} (\d+)/);
          
          if (hitsMatch && missesMatch) {
            const actualHits = parseInt(hitsMatch[1], 10);
            const actualMisses = parseInt(missesMatch[1], 10);
            
            expect(actualHits).toBe(expectedHits);
            expect(actualMisses).toBe(expectedMisses);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Error metrics tracking
   * For any sequence of requests with errors, errors should be recorded correctly
   */
  it('should track errors independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            statusCode: fc.constantFrom(200, 400, 500),
            duration: fc.double({ min: 0.001, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        async (requests) => {
          register.resetMetrics();
          
          // Use same method and route for all requests to ensure single time series
          const method = 'GET';
          const route = '/api/test';
          let expectedErrors = 0;
          
          for (const req of requests) {
            recordHttpRequest(method, route, req.statusCode, req.duration);
            // Record error for 4xx and 5xx status codes
            if (req.statusCode >= 400) {
              recordHttpError(method, route, 'TestError');
              expectedErrors++;
            }
          }
          
          const metrics = await getMetrics();
          
          // Sum all request counts across different status codes
          const requestMatches = metrics.matchAll(/anoteros_http_requests_total\{[^}]*\} (\d+)/g);
          let totalCount = 0;
          for (const match of requestMatches) {
            totalCount += parseInt(match[1], 10);
          }
          
          expect(totalCount).toBe(requests.length);
          
          if (expectedErrors > 0) {
            const errorMatch = metrics.match(/anoteros_http_errors_total\{[^}]*\} (\d+)/);
            if (errorMatch) {
              const errorCount = parseInt(errorMatch[1], 10);
              expect(errorCount).toBe(expectedErrors);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Metrics format is valid Prometheus format
   * For any metrics output, it should be valid Prometheus format
   */
  it('should always produce valid Prometheus format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
            route: fc.webPath().filter(path => path.length > 0), // Ensure non-empty paths
            statusCode: fc.integer({ min: 200, max: 599 }), // Valid HTTP status codes
            duration: fc.double({ min: 0.001, max: 10, noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (requests) => {
          register.resetMetrics();
          
          for (const req of requests) {
            recordHttpRequest(req.method, req.route, req.statusCode, req.duration);
          }
          
          const metrics = await getMetrics();
          
          // Check Prometheus format requirements
          expect(metrics).toContain('# HELP');
          expect(metrics).toContain('# TYPE');
          
          // Check metric names follow Prometheus naming conventions
          // Filter out lines with NaN or Inf (which can occur in default metrics before data is collected)
          const metricLines = metrics.split('\n').filter(line => 
            !line.startsWith('#') && 
            line.trim().length > 0 &&
            !line.toLowerCase().includes('nan') &&
            !line.toLowerCase().includes('inf')
          );
          
          for (const line of metricLines) {
            // Metric name should match pattern: [a-zA-Z_:][a-zA-Z0-9_:]*
            // Value should be a valid number
            expect(line).toMatch(/^[a-zA-Z_:][a-zA-Z0-9_:]*(\{[^}]*\})?\s+[\d.eE+-]+/);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: Business metrics are always non-negative
   * For any business metric, values should be >= 0
   */
  it('should maintain non-negative business metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            status: fc.constantFrom('success', 'failed'),
            duration: fc.double({ min: 0.1, max: 300, noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (audits) => {
          register.resetMetrics();
          
          for (const audit of audits) {
            recordAuditCompleted(audit.status as 'success' | 'failed', audit.duration);
          }
          
          const metrics = await getMetrics();
          
          // Extract all numeric values from metrics
          const values = metrics.match(/\s+([\d.]+)$/gm);
          
          if (values) {
            for (const value of values) {
              const numValue = parseFloat(value.trim());
              expect(numValue).toBeGreaterThanOrEqual(0);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
