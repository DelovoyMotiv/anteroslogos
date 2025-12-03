/**
 * Integration Tests for JWT Refresh Token Mechanism
 * Tests token rotation, family tracking, and security features
 * 
 * Note: These tests require a test database connection
 * They are skipped if Supabase is not configured
 */

/**
 * Integration Tests for JWT Refresh Token Mechanism
 * Tests token rotation, family tracking, and security features
 * 
 * Note: These tests require a test database connection
 * They are skipped if Supabase is not configured
 * 
 * @vitest-environment node
 */

import './setup'; // Load environment variables first
import { describe, it, expect, vi } from 'vitest';
import {
  login,
  logout,
  refreshAccessToken,
  revokeAllUserTokens,
  getUserActiveTokens,
  verifyAccessToken,
} from '../jwtAuth';
import { supabase } from '../../supabase';

// Skip tests if Supabase not configured
const describeIfSupabase = supabase ? describe : describe.skip;

describeIfSupabase('JWT Refresh Token Integration', () => {
  const testUserId = 'test-user-' + Date.now();
  const testEmail = `test-${Date.now()}@example.com`;

  describe('login', () => {
    it('should generate both access and refresh tokens', async () => {
      const tokens = await login(testUserId, testEmail);

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900); // 15 minutes

      // Verify access token is valid
      const result = verifyAccessToken(tokens.accessToken);
      expect(result.valid).toBe(true);
    });

    it('should store refresh token in database', async () => {
      const tokens = await login(testUserId, testEmail);

      // Check database for stored token
      const activeTokens = await getUserActiveTokens(testUserId);
      expect(activeTokens.length).toBeGreaterThan(0);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new token pair from valid refresh token', async () => {
      // Login to get initial tokens
      const initialTokens = await login(testUserId, testEmail);

      // Wait a moment to ensure different iat
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh tokens
      const newTokens = await refreshAccessToken(initialTokens.refreshToken);

      expect(newTokens).not.toBeNull();
      expect(newTokens!.accessToken).toBeDefined();
      expect(newTokens!.refreshToken).toBeDefined();

      // New tokens should be different
      expect(newTokens!.accessToken).not.toBe(initialTokens.accessToken);
      expect(newTokens!.refreshToken).not.toBe(initialTokens.refreshToken);

      // Both should be valid
      const result = verifyAccessToken(newTokens!.accessToken);
      expect(result.valid).toBe(true);
    });

    it('should revoke old refresh token after rotation', async () => {
      const initialTokens = await login(testUserId, testEmail);

      // Refresh once
      const newTokens = await refreshAccessToken(initialTokens.refreshToken);
      expect(newTokens).not.toBeNull();

      // Try to use old refresh token again - should fail
      const reusedTokens = await refreshAccessToken(initialTokens.refreshToken);
      expect(reusedTokens).toBeNull();
    });

    it('should detect token reuse attack', async () => {
      const initialTokens = await login(testUserId, testEmail);

      // Refresh once
      const newTokens = await refreshAccessToken(initialTokens.refreshToken);
      expect(newTokens).not.toBeNull();

      // Try to reuse old token - should detect attack and revoke family
      const attackTokens = await refreshAccessToken(initialTokens.refreshToken);
      expect(attackTokens).toBeNull();

      // New token should also be revoked (family revocation)
      const afterAttack = await refreshAccessToken(newTokens!.refreshToken);
      expect(afterAttack).toBeNull();
    });

    it('should return null for invalid refresh token', async () => {
      const result = await refreshAccessToken('invalid.refresh.token');
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should revoke all user tokens', async () => {
      // Create multiple sessions
      await login(testUserId, testEmail);
      await login(testUserId, testEmail);

      const beforeLogout = await getUserActiveTokens(testUserId);
      expect(beforeLogout.length).toBeGreaterThanOrEqual(2);

      // Logout
      await logout(testUserId);

      const afterLogout = await getUserActiveTokens(testUserId);
      expect(afterLogout.length).toBe(0);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all active tokens for user', async () => {
      await login(testUserId, testEmail);
      await login(testUserId, testEmail);

      const count = await revokeAllUserTokens(testUserId);
      expect(count).toBeGreaterThanOrEqual(2);

      const activeTokens = await getUserActiveTokens(testUserId);
      expect(activeTokens.length).toBe(0);
    });
  });

  describe('getUserActiveTokens', () => {
    it('should return only active tokens', async () => {
      // Create tokens
      const tokens1 = await login(testUserId, testEmail);
      const tokens2 = await login(testUserId, testEmail);

      const active = await getUserActiveTokens(testUserId);
      expect(active.length).toBeGreaterThanOrEqual(2);

      // Revoke one
      await refreshAccessToken(tokens1.refreshToken);

      const afterRevoke = await getUserActiveTokens(testUserId);
      expect(afterRevoke.length).toBeLessThan(active.length);
    });

    it('should include token metadata', async () => {
      await login(testUserId, testEmail, '192.168.1.1', 'Test User Agent');

      const tokens = await getUserActiveTokens(testUserId);
      expect(tokens.length).toBeGreaterThan(0);

      const token = tokens[0];
      expect(token.id).toBeDefined();
      expect(token.createdAt).toBeDefined();
      expect(token.expiresAt).toBeDefined();
    });
  });

  describe('Token Family Tracking', () => {
    it('should maintain same family through rotations', async () => {
      const tokens1 = await login(testUserId, testEmail);
      
      // Multiple rotations
      const tokens2 = await refreshAccessToken(tokens1.refreshToken);
      expect(tokens2).not.toBeNull();

      const tokens3 = await refreshAccessToken(tokens2!.refreshToken);
      expect(tokens3).not.toBeNull();

      // All should be part of same family (verified by successful rotations)
      expect(tokens3).not.toBeNull();
    });

    it('should create new family on new login', async () => {
      const session1 = await login(testUserId, testEmail);
      const session2 = await login(testUserId, testEmail);

      // Both should be valid (different families)
      const refresh1 = await refreshAccessToken(session1.refreshToken);
      const refresh2 = await refreshAccessToken(session2.refreshToken);

      expect(refresh1).not.toBeNull();
      expect(refresh2).not.toBeNull();
    });
  });
});

describeIfSupabase('Token Security Properties', () => {
  const testUserId = 'security-test-' + Date.now();
  const testEmail = `security-${Date.now()}@example.com`;

  it('should not store plaintext refresh tokens', async () => {
    const tokens = await login(testUserId, testEmail);

    // Query database directly
    const { data } = await supabase!
      .from('refresh_tokens')
      .select('token_hash')
      .eq('user_id', testUserId)
      .single();

    // Token hash should not match the actual token
    expect(data?.token_hash).toBeDefined();
    expect(data?.token_hash).not.toBe(tokens.refreshToken);
    expect(data?.token_hash.length).toBe(64); // SHA-256 produces 64 hex chars
  });

  it('should enforce token expiration', async () => {
    const tokens = await login(testUserId, testEmail);

    // Manually expire token in database
    await supabase!
      .from('refresh_tokens')
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() } as never)
      .eq('user_id', testUserId);

    // Try to refresh - should fail
    const result = await refreshAccessToken(tokens.refreshToken);
    expect(result).toBeNull();
  });

  it('should prevent concurrent token use', async () => {
    const tokens = await login(testUserId, testEmail);

    // Try to use same refresh token twice concurrently
    const [result1, result2] = await Promise.all([
      refreshAccessToken(tokens.refreshToken),
      refreshAccessToken(tokens.refreshToken),
    ]);

    // Only one should succeed
    const successCount = [result1, result2].filter(r => r !== null).length;
    expect(successCount).toBeLessThanOrEqual(1);
  });
});
