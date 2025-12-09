/**
 * Property-Based Tests for Agent Authentication Middleware
 * Tests invalid token rejection and valid token acceptance
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { AuthMiddleware, AUTH_ERROR_CODES } from '../agentAuth';
import type { ApiKey } from '../agentAuth';

// Mock Supabase
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Agent Authentication Middleware - Property-Based Tests', () => {
  let authMiddleware: AuthMiddleware;
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authMiddleware = new AuthMiddleware();
    const { supabase } = await import('../../supabase');
    mockSupabase = supabase as unknown as typeof mockSupabase;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 10: Invalid token rejection', () => {
    it('should reject requests with no token', async () => {
      // Feature: agent-middleware, Property 10: Invalid token rejection
      // Validates: Requirements 3.2

      await fc.assert(
        fc.asyncProperty(
          fc.constant(undefined),
          async (token) => {
            const result = await authMiddleware.authenticate(token);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe(AUTH_ERROR_CODES.ERR_AUTH_MISSING);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with empty token', async () => {
      // Feature: agent-middleware, Property 10: Invalid token rejection
      // Validates: Requirements 3.2

      await fc.assert(
        fc.asyncProperty(
          fc.constant(''),
          async (token) => {
            const result = await authMiddleware.authenticate(token);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe(AUTH_ERROR_CODES.ERR_AUTH_INVALID);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with invalid token format', async () => {
      // Feature: agent-middleware, Property 10: Invalid token rejection
      // Validates: Requirements 3.2

      // Mock database to return no results
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (token) => {
            const result = await authMiddleware.authenticate(`Bearer ${token}`);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe(AUTH_ERROR_CODES.ERR_AUTH_INVALID);
            expect(result.error?.message).toContain('Invalid API key');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject revoked API keys', async () => {
      // Feature: agent-middleware, Property 10: Invalid token rejection
      // Validates: Requirements 3.2

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 64 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (token, revokedReason) => {
            // Mock database to return a revoked API key
            const revokedApiKey: ApiKey = {
              id: 'test-id',
              user_id: 'test-user-id',
              name: 'Test Key',
              key_hash: 'hash',
              key_prefix: 'sk_test_abc',
              scoped_tools: null,
              rate_limit_per_minute: 10,
              rate_limit_per_hour: 100,
              expires_at: null,
              last_used_at: null,
              usage_count: 0,
              revoked: true,
              revoked_at: new Date().toISOString(),
              revoked_reason: revokedReason,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockSupabase.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: revokedApiKey, error: null }),
                }),
              }),
            });

            const result = await authMiddleware.authenticate(`Bearer ${token}`);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe(AUTH_ERROR_CODES.ERR_AUTH_INVALID);
            expect(result.error?.message).toContain('revoked');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject expired API keys', async () => {
      // Feature: agent-middleware, Property 10: Invalid token rejection
      // Validates: Requirements 3.2

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 64 }),
          fc.date({ max: new Date(Date.now() - 86400000) }), // Expired at least 1 day ago
          async (token, expiresAt) => {
            // Mock database to return an expired API key
            const expiredApiKey: ApiKey = {
              id: 'test-id',
              user_id: 'test-user-id',
              name: 'Test Key',
              key_hash: 'hash',
              key_prefix: 'sk_test_abc',
              scoped_tools: null,
              rate_limit_per_minute: 10,
              rate_limit_per_hour: 100,
              expires_at: expiresAt.toISOString(),
              last_used_at: null,
              usage_count: 0,
              revoked: false,
              revoked_at: null,
              revoked_reason: null,
              created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockSupabase.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: expiredApiKey, error: null }),
                }),
              }),
            });

            const result = await authMiddleware.authenticate(`Bearer ${token}`);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe(AUTH_ERROR_CODES.ERR_AUTH_INVALID);
            expect(result.error?.message).toContain('expired');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Valid token acceptance', () => {
    it('should accept valid, non-revoked, non-expired API keys', async () => {
      // Feature: agent-middleware, Property 11: Valid token acceptance
      // Validates: Requirements 3.3

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 64 }),
          fc.string({ minLength: 3, maxLength: 100 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 10, max: 10000 }),
          async (token, keyName, ratePerMinute, ratePerHour) => {
            // Mock database to return a valid API key
            const validApiKey: ApiKey = {
              id: 'test-id',
              user_id: 'test-user-id',
              name: keyName,
              key_hash: 'hash',
              key_prefix: 'sk_test_abc',
              scoped_tools: null,
              rate_limit_per_minute: ratePerMinute,
              rate_limit_per_hour: ratePerHour,
              expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), // Expires in 30 days
              last_used_at: null,
              usage_count: 0,
              revoked: false,
              revoked_at: null,
              revoked_reason: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockSupabase.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: validApiKey, error: null }),
                }),
              }),
            });

            const result = await authMiddleware.authenticate(`Bearer ${token}`);

            expect(result.success).toBe(true);
            expect(result.apiKey).toBeDefined();
            expect(result.apiKey?.id).toBe('test-id');
            expect(result.apiKey?.name).toBe(keyName);
            expect(result.apiKey?.revoked).toBe(false);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid API keys without expiration date', async () => {
      // Feature: agent-middleware, Property 11: Valid token acceptance
      // Validates: Requirements 3.3

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 64 }),
          fc.string({ minLength: 3, maxLength: 100 }),
          async (token, keyName) => {
            // Mock database to return a valid API key without expiration
            const validApiKey: ApiKey = {
              id: 'test-id',
              user_id: 'test-user-id',
              name: keyName,
              key_hash: 'hash',
              key_prefix: 'sk_test_abc',
              scoped_tools: null,
              rate_limit_per_minute: 10,
              rate_limit_per_hour: 100,
              expires_at: null, // No expiration
              last_used_at: null,
              usage_count: 0,
              revoked: false,
              revoked_at: null,
              revoked_reason: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockSupabase.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: validApiKey, error: null }),
                }),
              }),
            });

            const result = await authMiddleware.authenticate(`Bearer ${token}`);

            expect(result.success).toBe(true);
            expect(result.apiKey).toBeDefined();
            expect(result.apiKey?.expires_at).toBeNull();
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should increment usage counter when tracking usage for valid keys', async () => {
      // Feature: agent-middleware, Property 11: Valid token acceptance
      // Validates: Requirements 3.3

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 10 }),
          async (initialUsageCount, unitsToConsume) => {
            const validApiKey: ApiKey = {
              id: 'test-id',
              user_id: 'test-user-id',
              name: 'Test Key',
              key_hash: 'hash',
              key_prefix: 'sk_test_abc',
              scoped_tools: null,
              rate_limit_per_minute: 10,
              rate_limit_per_hour: 100,
              expires_at: null,
              last_used_at: null,
              usage_count: initialUsageCount,
              revoked: false,
              revoked_at: null,
              revoked_reason: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // Mock quota check to return subscription ID
            mockSupabase.rpc.mockImplementation((funcName: string) => {
              if (funcName === 'check_subscription_quota') {
                return Promise.resolve({
                  data: [{ available: true, remaining: 100, subscription_id: 'sub-id' }],
                  error: null,
                });
              }
              if (funcName === 'consume_subscription_quota') {
                return Promise.resolve({ data: 99, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            });

            // Mock update operation
            mockSupabase.from.mockReturnValue({
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            });

            const result = await authMiddleware.trackUsage(validApiKey, unitsToConsume);

            expect(result).toBe(true);
            expect(mockSupabase.rpc).toHaveBeenCalledWith(
              'consume_subscription_quota',
              expect.objectContaining({
                p_subscription_id: 'sub-id',
                p_units: unitsToConsume,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
