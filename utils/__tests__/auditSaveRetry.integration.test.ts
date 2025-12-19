/**
 * Integration test for audit save with retry logic
 * Requirements: 2.1
 */

import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from '../retryWithBackoff';

describe('Audit Save with Retry Integration', () => {
  it('should retry network failures when saving audit', async () => {
    let attemptCount = 0;
    
    // Simulate a flaky network that fails twice then succeeds
    const mockSaveFunction = vi.fn(async () => {
      attemptCount++;
      
      if (attemptCount <= 2) {
        throw new Error('network timeout');
      }
      
      return { id: 'test-audit-id', success: true };
    });

    const result = await retryWithBackoff(mockSaveFunction, {
      maxRetries: 3,
      initialDelayMs: 10, // Use short delays for testing
      maxDelayMs: 50,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'test-audit-id', success: true });
    expect(result.attempts).toBe(3);
    expect(mockSaveFunction).toHaveBeenCalledTimes(3);
  });

  it('should not retry validation errors when saving audit', async () => {
    const mockSaveFunction = vi.fn(async () => {
      throw { code: '23505', message: 'duplicate key value violates unique constraint' };
    });

    const result = await retryWithBackoff(mockSaveFunction, {
      maxRetries: 3,
      initialDelayMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(mockSaveFunction).toHaveBeenCalledTimes(1);
  });

  it('should not retry RLS policy errors when saving audit', async () => {
    const mockSaveFunction = vi.fn(async () => {
      throw { code: '42501', message: 'new row violates row-level security policy' };
    });

    const result = await retryWithBackoff(mockSaveFunction, {
      maxRetries: 3,
      initialDelayMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(mockSaveFunction).toHaveBeenCalledTimes(1);
  });

  it('should fail after max retries for persistent network issues', async () => {
    const mockSaveFunction = vi.fn(async () => {
      throw new Error('fetch failed: network connection lost');
    });

    const result = await retryWithBackoff(mockSaveFunction, {
      maxRetries: 2,
      initialDelayMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3); // Initial + 2 retries
    expect(mockSaveFunction).toHaveBeenCalledTimes(3);
  });

  it('should handle Supabase connection timeout errors', async () => {
    let attemptCount = 0;
    
    const mockSaveFunction = vi.fn(async () => {
      attemptCount++;
      
      if (attemptCount === 1) {
        throw { code: 'PGRST301', message: 'Connection timeout' };
      }
      
      return { id: 'test-audit-id', success: true };
    });

    const result = await retryWithBackoff(mockSaveFunction, {
      maxRetries: 3,
      initialDelayMs: 10,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(mockSaveFunction).toHaveBeenCalledTimes(2);
  });

  it('should succeed immediately if no errors occur', async () => {
    const mockSaveFunction = vi.fn(async () => {
      return { id: 'test-audit-id', success: true };
    });

    const result = await retryWithBackoff(mockSaveFunction, {
      maxRetries: 3,
      initialDelayMs: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'test-audit-id', success: true });
    expect(result.attempts).toBe(1);
    expect(mockSaveFunction).toHaveBeenCalledTimes(1);
  });
});
