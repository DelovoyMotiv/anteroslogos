/**
 * Agent Keys Management - Client-side functions
 * Browser-safe operations
 */

import { supabase } from '../supabase';
import { parseAgentKeysFromDb, parseAgentKeyFromDb, type AgentKey } from './schemas';

// Re-export AgentKey type for external use
export type { AgentKey };

/**
 * List all agent keys for authenticated user
 */
export async function listAgentKeys(): Promise<AgentKey[] | { error: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('agent_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('revoked', false);

    if (error) {
      console.error('listAgentKeys error:', error);
      return { error: 'Failed to fetch agent keys' };
    }

    return parseAgentKeysFromDb(data || []);
  } catch (error) {
    console.error('listAgentKeys error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Revoke agent key
 */
export async function revokeAgentKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('agent_keys')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('user_id', user.id)
      .select();

    if (error || !data || data.length === 0) {
      console.error('revokeAgentKey error:', error);
      return { success: false, error: 'Failed to revoke agent key' };
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'agent_key.revoked',
      resource_type: 'agent_key',
      resource_id: keyId,
    });

    return { success: true };
  } catch (error) {
    console.error('revokeAgentKey error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
