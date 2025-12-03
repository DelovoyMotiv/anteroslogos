/**
 * Tests for Circuit Breaker
 * 
 * **Feature: production-audit-improvements, Property 20: Circuit Breaker Activation**
 * **Validates: Requirements 5.3**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerRegistry,
  globalCircuitBreakerRegistry,
} from '../circuitBreaker';
import { CircuitBreakerError } from '../errors';

describe('Circuit Breaker', () => {
  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;
    
    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 1000,
        successThreshold: 2,
      });
    });
    
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.isHalfOpen()).toBe(false);
    });
    
    it('should execute operation successfully in CLOSED state', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await breaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should transition to OPEN after threshold failures', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow('Failure');
      }
      
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(breaker.isOpen()).toBe(true);
    });
    
    it('should reject requests immediately when OPEN', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }
      
      // Next request should be rejected immediately
      await expect(breaker.execute(operation)).rejects.toThrow(CircuitBreakerError);
      
      // Operation should not have been called the 4th time
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should transition to HALF_OPEN after timeout', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }
      
      expect(breaker.isOpen()).toBe(true);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Next request should transition to HALF_OPEN
      operation.mockResolvedValue('success');
      await breaker.execute(operation);
      
      expect(breaker.isHalfOpen()).toBe(true);
    });
    
    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Succeed twice (success threshold)
      operation.mockResolvedValue('success');
      await breaker.execute(operation);
      await breaker.execute(operation);
      
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
    
    it('should transition back to OPEN on failure in HALF_OPEN', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Fail in HALF_OPEN
      await expect(breaker.execute(operation)).rejects.toThrow('Failure');
      
      expect(breaker.isOpen()).toBe(true);
    });
    
    it('should call onOpen callback', async () => {
      const onOpen = vi.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        onOpen,
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
    
    it('should call onClose callback', async () => {
      const onClose = vi.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 1000,
        successThreshold: 1,
        onClose,
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      // Wait and succeed
      await new Promise(resolve => setTimeout(resolve, 1100));
      operation.mockResolvedValue('success');
      await breaker.execute(operation);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    it('should call onHalfOpen callback', async () => {
      const onHalfOpen = vi.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 1000,
        onHalfOpen,
      });
      
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      // Wait and try again
      await new Promise(resolve => setTimeout(resolve, 1100));
      operation.mockResolvedValue('success');
      await breaker.execute(operation);
      
      expect(onHalfOpen).toHaveBeenCalledTimes(1);
    });
    
    it('should track statistics', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');
      
      await expect(breaker.execute(operation)).rejects.toThrow();
      await breaker.execute(operation);
      
      const stats = breaker.getStats();
      
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
    });
    
    it('should reset circuit breaker', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow();
      }
      
      expect(breaker.isOpen()).toBe(true);
      
      // Reset
      breaker.reset();
      
      expect(breaker.isClosed()).toBe(true);
      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalFailures).toBe(0);
    });
  });
  
  describe('CircuitBreakerRegistry', () => {
    let registry: CircuitBreakerRegistry;
    
    beforeEach(() => {
      registry = new CircuitBreakerRegistry();
    });
    
    it('should create and retrieve circuit breakers', () => {
      const breaker = registry.getOrCreate('api-1');
      
      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(registry.get('api-1')).toBe(breaker);
    });
    
    it('should reuse existing circuit breakers', () => {
      const breaker1 = registry.getOrCreate('api-1');
      const breaker2 = registry.getOrCreate('api-1');
      
      expect(breaker1).toBe(breaker2);
    });
    
    it('should remove circuit breakers', () => {
      registry.getOrCreate('api-1');
      
      expect(registry.remove('api-1')).toBe(true);
      expect(registry.get('api-1')).toBeUndefined();
    });
    
    it('should get all circuit breaker names', () => {
      registry.getOrCreate('api-1');
      registry.getOrCreate('api-2');
      
      const names = registry.getNames();
      
      expect(names).toContain('api-1');
      expect(names).toContain('api-2');
      expect(names).toHaveLength(2);
    });
    
    it('should get all statistics', () => {
      registry.getOrCreate('api-1');
      registry.getOrCreate('api-2');
      
      const stats = registry.getAllStats();
      
      expect(stats.size).toBe(2);
      expect(stats.has('api-1')).toBe(true);
      expect(stats.has('api-2')).toBe(true);
    });
    
    it('should reset all circuit breakers', async () => {
      const breaker1 = registry.getOrCreate('api-1', { failureThreshold: 2 });
      const breaker2 = registry.getOrCreate('api-2', { failureThreshold: 2 });
      
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));
      
      // Open both circuits
      await expect(breaker1.execute(operation)).rejects.toThrow();
      await expect(breaker1.execute(operation)).rejects.toThrow();
      await expect(breaker2.execute(operation)).rejects.toThrow();
      await expect(breaker2.execute(operation)).rejects.toThrow();
      
      expect(breaker1.isOpen()).toBe(true);
      expect(breaker2.isOpen()).toBe(true);
      
      // Reset all
      registry.resetAll();
      
      expect(breaker1.isClosed()).toBe(true);
      expect(breaker2.isClosed()).toBe(true);
    });
    
    it('should clear all circuit breakers', () => {
      registry.getOrCreate('api-1');
      registry.getOrCreate('api-2');
      
      registry.clear();
      
      expect(registry.getNames()).toHaveLength(0);
    });
  });
});
