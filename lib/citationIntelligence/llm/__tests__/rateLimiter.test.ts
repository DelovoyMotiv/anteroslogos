/**
 * Rate Limiter Tests
 * Unit tests for token bucket rate limiting implementation
 * 
 * @module lib/citationIntelligence/llm/__tests__/rateLimiter.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, createRateLimiter } from '../rateLimiter';
import type { RateLimiterConfig } from '../../types/llm.types';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  
  afterEach(() => {
    // Clean up after each test
    if (limiter) {
      limiter.stop();
    }
  });
  
  describe('Constructor and Initialization', () => {
    it('should initialize with full capacity', () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10 / 60,
        maxQueueSize: 100,
      });
      
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBe(10);
      expect(metrics.requestsQueued).toBe(0);
      expect(metrics.requestsRejected).toBe(0);
    });
    
    it('should accept custom configuration', () => {
      limiter = new RateLimiter({
        capacity: 20,
        refillRate: 20 / 60,
        maxQueueSize: 50,
        queueTimeout: 10000,
      });
      
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBe(20);
    });
  });
  
  describe('acquire()', () => {
    it('should allow requests up to capacity', async () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10 / 60,
        maxQueueSize: 100,
      });
      
      // Should allow 10 requests immediately
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }
      
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBeLessThan(1);
      expect(metrics.totalRequests).toBe(10);
    });
    
    it('should queue requests when tokens are exhausted', async () => {
      limiter = new RateLimiter({
        capacity: 2,
        refillRate: 1 / 60, // Very slow refill
        maxQueueSize: 10,
      });
      
      // Consume all tokens
      await limiter.acquire();
      await limiter.acquire();
      
      // Next request should be queued
      const promise = limiter.acquire().catch(() => {}); // Catch rejection on cleanup
      
      // Check that request is queued
      const metrics = limiter.getMetrics();
      expect(metrics.requestsQueued).toBe(1);
      
      // Clean up
      limiter.stop();
      await promise; // Wait for promise to settle
    });
    
    it('should reject requests when queue is full', async () => {
      limiter = new RateLimiter({
        capacity: 1,
        refillRate: 1 / 60,
        maxQueueSize: 2,
      });
      
      // Consume token
      await limiter.acquire();
      
      // Queue 2 requests (fill the queue)
      const promise1 = limiter.acquire().catch(() => {});
      const promise2 = limiter.acquire().catch(() => {});
      
      // Next request should be rejected
      await expect(limiter.acquire()).rejects.toThrow('Rate limit queue is full');
      
      const metrics = limiter.getMetrics();
      expect(metrics.requestsRejected).toBe(1);
      
      // Clean up
      limiter.stop();
      await Promise.all([promise1, promise2]); // Wait for promises to settle
    });
  });
  
  describe('refill()', () => {
    it('should refill tokens over time', async () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10, // 10 tokens per second
        maxQueueSize: 100,
      });
      
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }
      
      expect(limiter.getMetrics().tokensAvailable).toBeLessThan(1);
      
      // Wait 1 second for refill
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should have refilled ~10 tokens
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBeGreaterThan(9);
      expect(metrics.tokensAvailable).toBeLessThanOrEqual(10);
    });
    
    it('should not exceed capacity when refilling', async () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10,
        maxQueueSize: 100,
      });
      
      // Wait 2 seconds (would refill 20 tokens if no cap)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should be capped at capacity
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBeLessThanOrEqual(10);
    });
  });
  
  describe('canAcquire()', () => {
    it('should return true when tokens are available', () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10 / 60,
        maxQueueSize: 100,
      });
      
      expect(limiter.canAcquire()).toBe(true);
    });
    
    it('should return false when no tokens are available', async () => {
      limiter = new RateLimiter({
        capacity: 1,
        refillRate: 1 / 60,
        maxQueueSize: 100,
      });
      
      // Consume the only token
      await limiter.acquire();
      
      expect(limiter.canAcquire()).toBe(false);
    });
  });
  
  describe('getMetrics()', () => {
    it('should return accurate metrics', async () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10 / 60,
        maxQueueSize: 100,
      });
      
      // Make some requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      
      const metrics = limiter.getMetrics();
      
      expect(metrics.tokensAvailable).toBeGreaterThan(6);
      expect(metrics.tokensAvailable).toBeLessThanOrEqual(10);
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.requestsQueued).toBe(0);
      expect(metrics.requestsRejected).toBe(0);
      expect(metrics.lastRefill).toBeInstanceOf(Date);
    });
    
    it('should calculate average wait time correctly', async () => {
      limiter = new RateLimiter({
        capacity: 2,
        refillRate: 10, // Fast refill for testing
        maxQueueSize: 10,
      });
      
      // Consume all tokens
      await limiter.acquire();
      await limiter.acquire();
      
      // Queue a request
      const promise = limiter.acquire();
      
      // Wait for it to be processed
      await promise;
      
      const metrics = limiter.getMetrics();
      expect(metrics.averageWaitTime).toBeGreaterThan(0);
    });
  });
  
  describe('Queue Processing', () => {
    it('should process queued requests when tokens become available', async () => {
      limiter = new RateLimiter({
        capacity: 2,
        refillRate: 10, // 10 tokens per second
        maxQueueSize: 10,
      });
      
      // Consume all tokens
      await limiter.acquire();
      await limiter.acquire();
      
      // Queue 3 requests
      const promises = [
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
      ];
      
      // All should eventually resolve
      await Promise.all(promises);
      
      const metrics = limiter.getMetrics();
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.requestsQueued).toBe(0);
    });
    
    it('should timeout queued requests after configured timeout', async () => {
      limiter = new RateLimiter({
        capacity: 1,
        refillRate: 0.01, // Very slow refill
        maxQueueSize: 10,
        queueTimeout: 100, // 100ms timeout
      });
      
      // Consume token
      await limiter.acquire();
      
      // Queue a request with timeout
      await expect(limiter.acquire()).rejects.toThrow('Rate limit queue timeout');
    });
  });
  
  describe('stop()', () => {
    it('should reject all queued requests when stopped', async () => {
      limiter = new RateLimiter({
        capacity: 1,
        refillRate: 0.01,
        maxQueueSize: 10,
      });
      
      // Consume token
      await limiter.acquire();
      
      // Queue requests
      const promise1 = limiter.acquire();
      const promise2 = limiter.acquire();
      
      // Stop the limiter
      limiter.stop();
      
      // Queued requests should be rejected
      await expect(promise1).rejects.toThrow('Rate limiter stopped');
      await expect(promise2).rejects.toThrow('Rate limiter stopped');
    });
  });
  
  describe('reset()', () => {
    it('should reset to initial state', async () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10 / 60,
        maxQueueSize: 100,
      });
      
      // Make some requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      
      // Reset
      limiter.reset();
      
      // Should be back to full capacity
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBe(10);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.requestsRejected).toBe(0);
    });
    
    it('should reject queued requests when reset', async () => {
      limiter = new RateLimiter({
        capacity: 1,
        refillRate: 0.01,
        maxQueueSize: 10,
      });
      
      // Consume token
      await limiter.acquire();
      
      // Queue a request
      const promise = limiter.acquire();
      
      // Reset
      limiter.reset();
      
      // Queued request should be rejected
      await expect(promise).rejects.toThrow('Rate limiter reset');
    });
  });
  
  describe('createRateLimiter()', () => {
    it('should create limiter with default configuration', () => {
      limiter = createRateLimiter();
      
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBe(10);
    });
    
    it('should accept configuration overrides', () => {
      limiter = createRateLimiter({
        capacity: 20,
        refillRate: 20 / 60,
      });
      
      const metrics = limiter.getMetrics();
      expect(metrics.tokensAvailable).toBe(20);
    });
  });
  
  describe('Real-world scenario: 10 requests per minute', () => {
    it('should enforce 10 requests per minute limit', async () => {
      limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10 / 60, // 10 per minute = 1 per 6 seconds
        maxQueueSize: 100,
      });
      
      // Make 10 requests immediately (should succeed)
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }
      
      expect(limiter.getMetrics().totalRequests).toBe(10);
      
      // 11th request should be queued
      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;
      
      // Should have waited approximately 6 seconds for 1 token to refill
      expect(elapsed).toBeGreaterThan(5000);
      expect(elapsed).toBeLessThan(7000);
    }, 10000); // 10 second timeout for this test
  });
});
