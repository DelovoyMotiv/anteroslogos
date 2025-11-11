/**
 * Ed25519 Key Storage - Supabase Persistence
 * Production key management with rotation, revocation, and audit trail
 */

import { getSupabaseClient } from './supabaseStorage';
import type { StoredKey } from './ed25519Signatures';
import { logger } from './logger';

// =====================================================
// DATABASE SCHEMA
// =====================================================

export interface DbEd25519Key {
  key_id: string;
  public_key: string;
  algorithm: string;
  domain: string;
  created: string;
  expires: string | null;
  revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  agent_id: string | null;
  metadata: any;
}

export interface DbKeyAuditLog {
  id: string;
  key_id: string;
  action: string; // created, used, revoked, expired
  performed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

// =====================================================
// SUPABASE KEY STORAGE
// =====================================================

export class SupabaseEd25519KeyStorage {
  private supabase;
  
  constructor() {
    this.supabase = getSupabaseClient();
  }
  
  /**
   * Store new key
   */
  async storeKey(key: StoredKey, agentId?: string): Promise<void> {
    const dbKey: Partial<DbEd25519Key> = {
      key_id: key.keyId,
      public_key: key.publicKey,
      algorithm: key.algorithm,
      domain: key.domain,
      created: key.created,
      expires: key.expires || null,
      revoked: key.revoked,
      agent_id: agentId || null,
      metadata: {},
    };
    
    const { error } = await this.supabase
      .from('a2a_ed25519_keys')
      .insert(dbKey);
    
    if (error) {
      logger.error('Failed to store Ed25519 key', { key_id: key.keyId }, error);
      throw error;
    }
    
    // Log creation
    await this.logKeyAction(key.keyId, 'created', null);
    
    logger.info('Ed25519 key stored', {
      key_id: key.keyId,
      domain: key.domain,
      tags: ['ed25519', 'key', 'created'],
    });
  }
  
  /**
   * Get key by key ID
   */
  async getKey(keyId: string): Promise<StoredKey | null> {
    const { data, error } = await this.supabase
      .from('a2a_ed25519_keys')
      .select('*')
      .eq('key_id', keyId)
      .single();
    
    if (error || !data) return null;
    
    // Check if expired
    if (data.expires) {
      const expiresDate = new Date(data.expires);
      if (expiresDate < new Date()) {
        logger.debug('Key expired', { key_id: keyId });
        return null;
      }
    }
    
    // Check if revoked
    if (data.revoked) {
      logger.debug('Key revoked', { key_id: keyId });
      return null;
    }
    
    return this.mapDbKeyToStoredKey(data);
  }
  
  /**
   * Get active key for domain
   */
  async getActiveKeyForDomain(domain: string): Promise<StoredKey | null> {
    const now = new Date().toISOString();
    
    const { data, error } = await this.supabase
      .from('a2a_ed25519_keys')
      .select('*')
      .eq('domain', domain)
      .eq('revoked', false)
      .or(`expires.is.null,expires.gt.${now}`)
      .order('created', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    
    return this.mapDbKeyToStoredKey(data);
  }
  
  /**
   * List keys for domain
   */
  async listKeysForDomain(domain: string, includeRevoked: boolean = false): Promise<StoredKey[]> {
    let query = this.supabase
      .from('a2a_ed25519_keys')
      .select('*')
      .eq('domain', domain);
    
    if (!includeRevoked) {
      query = query.eq('revoked', false);
    }
    
    query = query.order('created', { ascending: false });
    
    const { data, error } = await query;
    
    if (error || !data) return [];
    
    return data.map(key => this.mapDbKeyToStoredKey(key));
  }
  
  /**
   * Revoke key
   */
  async revokeKey(
    keyId: string,
    reason: string,
    performedBy?: string
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('a2a_ed25519_keys')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('key_id', keyId);
    
    if (error) {
      logger.error('Failed to revoke key', { key_id: keyId }, error);
      return false;
    }
    
    // Log revocation
    await this.logKeyAction(keyId, 'revoked', performedBy || null, { reason });
    
    logger.warn('Ed25519 key revoked', {
      key_id: keyId,
      reason,
      performed_by: performedBy,
      tags: ['ed25519', 'key', 'revoked'],
    });
    
    return true;
  }
  
  /**
   * Log key usage
   */
  async logKeyUsage(
    keyId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logKeyAction(keyId, 'used', null, {
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }
  
  /**
   * Log key action
   */
  private async logKeyAction(
    keyId: string,
    action: string,
    performedBy: string | null,
    metadata?: any
  ): Promise<void> {
    const logEntry: Partial<DbKeyAuditLog> = {
      key_id: keyId,
      action,
      performed_by: performedBy,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };
    
    const { error } = await this.supabase
      .from('a2a_key_audit_log')
      .insert(logEntry);
    
    if (error) {
      logger.error('Failed to log key action', { key_id: keyId, action }, error);
    }
  }
  
  /**
   * Get key audit log
   */
  async getKeyAuditLog(
    keyId: string,
    limit: number = 100
  ): Promise<DbKeyAuditLog[]> {
    const { data, error } = await this.supabase
      .from('a2a_key_audit_log')
      .select('*')
      .eq('key_id', keyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) return [];
    
    return data;
  }
  
  /**
   * Get keys expiring soon
   */
  async getKeysExpiringSoon(daysThreshold: number = 30): Promise<StoredKey[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    const { data, error } = await this.supabase
      .from('a2a_ed25519_keys')
      .select('*')
      .eq('revoked', false)
      .not('expires', 'is', null)
      .lte('expires', thresholdDate.toISOString())
      .order('expires', { ascending: true });
    
    if (error || !data) return [];
    
    return data.map(key => this.mapDbKeyToStoredKey(key));
  }
  
  /**
   * Cleanup expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const now = new Date().toISOString();
    
    // Mark as revoked instead of deleting (for audit trail)
    const { data, error } = await this.supabase
      .from('a2a_ed25519_keys')
      .update({
        revoked: true,
        revoked_at: now,
        revoked_reason: 'Automatic cleanup - key expired',
      })
      .eq('revoked', false)
      .lt('expires', now)
      .select('key_id');
    
    if (error) return 0;
    
    const count = data?.length || 0;
    
    if (count > 0) {
      logger.info('Cleaned up expired Ed25519 keys', {
        count,
        tags: ['ed25519', 'cleanup'],
      });
    }
    
    return count;
  }
  
  /**
   * Map database key to StoredKey type
   */
  private mapDbKeyToStoredKey(dbKey: any): StoredKey {
    return {
      keyId: dbKey.key_id,
      publicKey: dbKey.public_key,
      algorithm: dbKey.algorithm,
      domain: dbKey.domain,
      created: dbKey.created,
      expires: dbKey.expires,
      revoked: dbKey.revoked,
    };
  }
}

// =====================================================
// KEY ROTATION
// =====================================================

/**
 * Rotate key for domain
 */
export async function rotateKey(
  domain: string,
  agentId?: string,
  expiresInDays: number = 365
): Promise<{ oldKeyId: string | null; newKey: StoredKey }> {
  const storage = new SupabaseEd25519KeyStorage();
  
  // Get current active key
  const oldKey = await storage.getActiveKeyForDomain(domain);
  
  // Generate new key
  const { generateEd25519KeyPair } = await import('./ed25519Signatures');
  const keyPair = await generateEd25519KeyPair(domain, expiresInDays);
  
  const newKey: StoredKey = {
    keyId: keyPair.keyId,
    publicKey: keyPair.publicKey,
    algorithm: 'ed25519',
    domain,
    created: keyPair.created,
    expires: keyPair.expires,
    revoked: false,
  };
  
  // Store new key
  await storage.storeKey(newKey, agentId);
  
  // Revoke old key if exists
  if (oldKey) {
    await storage.revokeKey(
      oldKey.keyId,
      'Key rotation - replaced with new key',
      agentId
    );
  }
  
  logger.info('Key rotation completed', {
    domain,
    old_key_id: oldKey?.keyId,
    new_key_id: newKey.keyId,
    tags: ['ed25519', 'rotation'],
  });
  
  return {
    oldKeyId: oldKey?.keyId || null,
    newKey,
  };
}

// =====================================================
// MIGRATION SQL
// =====================================================

export const ED25519_MIGRATION_SQL = `
-- Ed25519 Keys table
CREATE TABLE IF NOT EXISTS a2a_ed25519_keys (
  key_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'ed25519',
  domain TEXT NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  agent_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ed25519_keys_domain ON a2a_ed25519_keys(domain);
CREATE INDEX IF NOT EXISTS idx_ed25519_keys_revoked ON a2a_ed25519_keys(revoked);
CREATE INDEX IF NOT EXISTS idx_ed25519_keys_expires ON a2a_ed25519_keys(expires);
CREATE INDEX IF NOT EXISTS idx_ed25519_keys_domain_active ON a2a_ed25519_keys(domain, revoked, expires);

-- Key Audit Log table
CREATE TABLE IF NOT EXISTS a2a_key_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_key_audit_log_key_id ON a2a_key_audit_log(key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_key_audit_log_action ON a2a_key_audit_log(action, created_at DESC);

-- Foreign key constraint
ALTER TABLE a2a_ed25519_keys 
  ADD CONSTRAINT fk_agent_id 
  FOREIGN KEY (agent_id) 
  REFERENCES a2a_agents(id) 
  ON DELETE SET NULL;
`;
