// @ts-nocheck
/**
 * API Keys Management - Client-side functions
 * Browser-safe operations without Node.js crypto
 */

import { supabase } from '../supabase';

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scoped_tools: string[] | null;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * List all API keys for authenticated user
 */
export async function listAPIKeys(): Promise<APIKey[] | { error: string }> {
  try {
    // Dev mode: return mock data if supabase not configured
    if (!supabase) {
      console.warn('[DEV MODE] api-keys-client: Returning empty API keys list');
      return [];
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('revoked', false)
      .order('created_at', { ascending: false });

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
    // Dev mode: simulate success
    if (!supabase) {
      console.warn('[DEV MODE] api-keys-client: Simulating API key revocation');
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
