import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryStrategy } from '../src/resilience/retry';
import { CircuitBreaker } from '../src/resilience/circuit-breaker';
import { IdempotencyManager } from '../src/resilience/idempotency';
import { TimeoutError, NetworkError, ServerError } from '../src/errors/types';

describe('RetryStrategy', () => {
  let retry: RetryStrategy;

  beforeEach(() => {
    retry = new RetryStrategy({ maxAttempts: 3, initialDelay: 10 });
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retry.execute(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on TimeoutError', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TimeoutError('Timeout', 1000))
      .mockResolvedValue('success');

    const result = await retry.execute(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on ServerError', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ServerError('Server error', 503))
      .mockResolvedValue('success');

    const result = await retry.execute(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on validation error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Validation failed'));

    await expect(retry.execute(fn)).rejects.toThrow('Validation failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('Network failed'));

    await expect(retry.execute(fn)).rejects.toThrow('Network failed');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('CircuitBreaker', () => {
  let circuit: CircuitBreaker;

  beforeEach(() => {
    circuit = new CircuitBreaker({ failureThreshold: 2, timeout: 100 });
  });

  it('should start in closed state', () => {
    expect(circuit.getState()).toBe('closed');
  });

  it('should open after threshold failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed'));

    await expect(circuit.execute(fn)).rejects.toThrow('Failed');
    await expect(circuit.execute(fn)).rejects.toThrow('Failed');

    expect(circuit.getState()).toBe('open');
    expect(circuit.getFailureCount()).toBe(2);
  });

  it('should reject immediately when open', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed'));

    await expect(circuit.execute(fn)).rejects.toThrow('Failed');
    await expect(circuit.execute(fn)).rejects.toThrow('Failed');

    expect(circuit.getState()).toBe('open');

    await expect(circuit.execute(fn)).rejects.toThrow('Circuit breaker open');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should transition to half-open after timeout', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue('success');

    await expect(circuit.execute(fn)).rejects.toThrow('Failed');
    await expect(circuit.execute(fn)).rejects.toThrow('Failed');

    expect(circuit.getState()).toBe('open');

    await new Promise(resolve => setTimeout(resolve, 150));

    const result = await circuit.execute(fn);
    expect(result).toBe('success');
    expect(circuit.getState()).toBe('closed');
  });
});

describe('IdempotencyManager', () => {
  let idempotency: IdempotencyManager;

  beforeEach(() => {
    idempotency = new IdempotencyManager(100);
  });

  it('should execute function once for same key', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    const [result1, result2, result3] = await Promise.all([
      idempotency.execute('key1', fn),
      idempotency.execute('key1', fn),
      idempotency.execute('key1', fn),
    ]);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(result3).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should execute different keys separately', async () => {
    const fn1 = vi.fn().mockResolvedValue('result1');
    const fn2 = vi.fn().mockResolvedValue('result2');

    const [result1, result2] = await Promise.all([
      idempotency.execute('key1', fn1),
      idempotency.execute('key2', fn2),
    ]);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should generate consistent keys', async () => {
    const key1 = await idempotency.generateKey('method', { url: 'https://example.com', depth: 'standard' });
    const key2 = await idempotency.generateKey('method', { depth: 'standard', url: 'https://example.com' });

    expect(key1).toBe(key2);
  });

  it('should clear cache', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    await idempotency.execute('key1', fn);
    expect(idempotency.size()).toBe(1);

    idempotency.clear();
    expect(idempotency.size()).toBe(0);
  });
});
