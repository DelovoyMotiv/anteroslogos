// @ts-nocheck
/**
 * Agent Keys Management - Client-side functions
 * Browser-safe operations
 */

import { supabase } from '../supabase';

export interface AgentKey {
  id: string;
  user_id: string;
  agent_name: string;
  domain: string;
  aid_uri: string;
  public_key: string;
  created_at: string;
  revoked: boolean;
  revoked_at: string | null;
}

/**
 * List all agent keys for authenticated user
 */
export async function listAgentKeys(): Promise<AgentKey[] | { error: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    const { data: keys, error } = await supabase
      .from('agent_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('revoked', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('listAgentKeys error:', error);
      return { error: 'Failed to fetch agent keys' };
    }

    return keys || [];
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

    const { error } = await supabase
      .from('agent_keys')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
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
