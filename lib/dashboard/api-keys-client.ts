/**
 * API Keys Management - Client-side functions
 * Browser-safe operations without Node.js crypto
 */

import { supabase } from '../supabase';
import { APIKeySchema, type APIKey } from './schemas';
import { selectQuery } from '../database/queryHelpers';

// Re-export APIKey type for external use
export type { APIKey };

/**
 * List all API keys for authenticated user
 */
export async function listAPIKeys(): Promise<APIKey[] | { error: string }> {
  try {
    // Dev mode: return mock data if supabase not configured (local only)
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalDev && !supabase) {
      console.warn('[DEV MODE] api-keys-client: Returning empty API keys list (LOCAL ONLY)');
      return [];
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data: keys, error } = await selectQuery(
      supabase,
      'api_keys',
      APIKeySchema,
      { user_id: user.id, revoked: false }
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
    // Dev mode: simulate success (local only)
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalDev && !supabase) {
      console.warn('[DEV MODE] api-keys-client: Simulating API key revocation (LOCAL ONLY)');
      return { success: true };
    }

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
