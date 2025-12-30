/**
 * API Keys Management
 * Enterprise-grade API key CRUD operations with scrypt hashing
 */

import { supabase } from '../supabase';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import type { UserProfileWithSubscription } from '../../types/lib-extended.types';
import { APIKeySchema, type APIKey, apiKeyFromDb } from './schemas';
import { selectQuery, insertSingle, insertQuery } from '../database/queryHelpers';

const scryptAsync = promisify(scrypt);

// API key format: sk_{tier}_{32_random_chars}
const TIER_PREFIXES = {
  free: 'fre',
  pro: 'pro',
  agency: 'agc',
} as const;

export interface CreateAPIKeyParams {
  name: string;
  scoped_tools?: string[] | null;
  expires_in_days?: number | null;
}

export interface CreateAPIKeyResult {
  key: APIKey;
  plaintext_key: string; // ONLY returned once
}

/**
 * Generate a cryptographically secure API key
 */
export function generateAPIKey(tier: 'free' | 'pro' | 'agency'): string {
  const prefix = TIER_PREFIXES[tier];
  const randomPart = randomBytes(24).toString('base64url'); // 32 chars
  return `sk_${prefix}_${randomPart}`;
}

/**
 * Hash API key using scrypt (N=16384, r=8, p=1)
 * Returns base64-encoded hash + salt
 */
export async function hashAPIKey(key: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(key, salt, 64)) as Buffer;
  
  // Store salt + derived key together (salt:key format)
  return `${salt.toString('base64')}:${derivedKey.toString('base64')}`;
}

/**
 * Verify API key against stored hash
 */
export async function verifyAPIKey(key: string, hash: string): Promise<boolean> {
  try {
    const [saltB64, keyB64] = hash.split(':');
    const salt = Buffer.from(saltB64, 'base64');
    const storedKey = Buffer.from(keyB64, 'base64');
    
    const derivedKey = (await scryptAsync(key, salt, 64)) as Buffer;
    
    return derivedKey.equals(storedKey);
  } catch (error) {
    console.error('API key verification error:', error);
    return false;
  }
}

/**
 * Extract tier from API key prefix
 */
export function getTierFromKey(key: string): 'free' | 'pro' | 'agency' | null {
  if (!key.startsWith('sk_')) return null;
  const prefix = key.substring(3, 6);
  
  if (prefix === 'fre') return 'free';
  if (prefix === 'pro') return 'pro';
  if (prefix === 'agc') return 'agency';
  return null;
}

/**
 * Get plan-based rate limits
 */
export function getPlanRateLimits(plan: 'free' | 'pro' | 'agency') {
  const limits = {
    free: { per_minute: 10, per_hour: 100 },
    pro: { per_minute: 60, per_hour: 1000 },
    agency: { per_minute: 300, per_hour: 10000 },
  };
  return limits[plan];
}

/**
 * Create new API key for authenticated user
 */
export async function createAPIKey(
  params: CreateAPIKeyParams
): Promise<CreateAPIKeyResult | { error: string }> {
  try {
    // Get current user and profile
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_plan, api_keys_count')
      .eq('id', user.id)
      .single() as { data: UserProfileWithSubscription | null; error: unknown };

    if (profileError || !profile) {
      return { error: 'Profile not found' };
    }

    // Check plan limits
    const planLimits = {
      free: 1,
      pro: 5,
      agency: 20,
    };
    
    if (profile.api_keys_count >= planLimits[profile.current_plan as keyof typeof planLimits]) {
      return { error: `Plan limit reached: ${planLimits[profile.current_plan as keyof typeof planLimits]} API keys max` };
    }

    // Generate key
    const plaintextKey = generateAPIKey(profile.current_plan as 'free' | 'pro' | 'agency');
    const keyHash = await hashAPIKey(plaintextKey);
    const keyPrefix = plaintextKey.substring(0, 11); // sk_xxx_abc...

    // Get rate limits based on plan
    const rateLimits = getPlanRateLimits(profile.current_plan as 'free' | 'pro' | 'agency');

    // Calculate expiration
    const expiresAt = params.expires_in_days
      ? new Date(Date.now() + params.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert into database
    const { data: key, error: insertError } = await insertSingle(
      supabase,
      'api_keys',
      {
        user_id: user.id,
        name: params.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scoped_tools: params.scoped_tools || null,
        rate_limit_per_minute: rateLimits.per_minute,
        expires_at: expiresAt,
      },
      APIKeySchema
    );

    if (insertError || !key) {
      console.error('API key creation error:', insertError);
      return { error: 'Failed to create API key' };
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'api_key.created',
      resource_type: 'api_key',
      resource_id: key.id,
      metadata: { name: params.name, scoped_tools: params.scoped_tools },
    });

    return {
      key: key as APIKey,
      plaintext_key: plaintextKey,
    };
  } catch (error) {
    console.error('createAPIKey error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * List all API keys for authenticated user
 */
export async function listAPIKeys(): Promise<APIKey[] | { error: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data: keys, error } = await selectQuery(
      supabase,
      'api_keys',
      APIKeySchema,
      { user_id: user.id, is_active: true }
    );

    if (error) {
      console.error('listAPIKeys error:', error);
      return { error: 'Failed to fetch API keys' };
    }

    return keys || [];
  } catch (error) {
    console.error('listAPIKeys error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Revoke API key
 */
export async function revokeAPIKey(
  keyId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('api_keys')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason || 'User revoked',
      })
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('revokeAPIKey error:', error);
      return { success: false, error: 'Failed to revoke API key' };
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'api_key.revoked',
      resource_type: 'api_key',
      resource_id: keyId,
      metadata: { reason },
    });

    return { success: true };
  } catch (error) {
    console.error('revokeAPIKey error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete API key permanently
 */
export async function deleteAPIKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('deleteAPIKey error:', error);
      return { success: false, error: 'Failed to delete API key' };
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'api_key.deleted',
      resource_type: 'api_key',
      resource_id: keyId,
    });

    return { success: true };
  } catch (error) {
    console.error('deleteAPIKey error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Validate API key from Authorization header
 * Returns key data if valid, null otherwise
 */
export async function validateAPIKeyFromHeader(
  authHeader: string | null
): Promise<APIKey | null> {
  if (!authHeader) return null;

  // Support both "Bearer sk_xxx" and just "sk_xxx"
  const key = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  if (!key.startsWith('sk_')) return null;

  try {
    // Fetch all active keys (need to check hash)
    const { data: keys, error } = await selectQuery(
      supabase,
      'api_keys',
      APIKeySchema,
      { is_active: true }
    );

    if (error || !keys) return null;

    // Find matching key by verifying hash
    for (const storedKey of keys) {
      const isValid = await verifyAPIKey(key, storedKey.key_hash);
      if (isValid) {
        // Check expiration
        if (storedKey.expires_at && new Date(storedKey.expires_at) < new Date()) {
          return null;
        }

        // Update last_used_at
        await supabase
          .from('api_keys')
          .update({
            last_used_at: new Date().toISOString(),
          })
          .eq('id', storedKey.id);

        return storedKey;
      }
    }

    return null;
  } catch (error) {
    console.error('validateAPIKeyFromHeader error:', error);
    return null;
  }
}
