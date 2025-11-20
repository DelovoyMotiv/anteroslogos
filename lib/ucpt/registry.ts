/**
 * UCPT Public Key Registry - AID → Public Key Resolution
 * Redis-backed registry for zero-trust verification
 */

import { createRedisClient } from '../a2a/redisAdapter';
import { sha3_512 } from '@noble/hashes/sha3.js';
import { base64urlEncode } from './serializer';

// =====================================================
// REGISTRY CLIENT
// =====================================================

let registryClient: ReturnType<typeof createRedisClient> | null = null;

function getRegistryClient() {
  if (!registryClient) {
    registryClient = createRedisClient();
  }
  return registryClient;
}

// =====================================================
// KEY RESOLUTION
// =====================================================

/**
 * Resolve public key for AID
 * Returns null if AID not registered
 */
export async function resolvePublicKey(aid: string): Promise<Uint8Array | null> {
  const client = getRegistryClient();
  const key = `ucpt:registry:${aid}`;
  
  try {
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    
    // Decode base64-encoded public key
    const buffer = Buffer.from(value, 'base64');
    if (buffer.length !== 32) {
      console.error(`Invalid public key length for AID ${aid}: ${buffer.length} bytes`);
      return null;
    }
    
    return new Uint8Array(buffer);
  } catch (error) {
    console.error(`Failed to resolve public key for ${aid}:`, error);
    return null;
  }
}

/**
 * Register public key for AID
 * TTL in seconds (default: 30 days)
 */
export async function registerPublicKey(
  aid: string,
  publicKey: Uint8Array,
  ttl: number = 2592000  // 30 days
): Promise<void> {
  if (publicKey.length !== 32) {
    throw new Error(`Invalid public key length: ${publicKey.length} (expected 32)`);
  }
  
  const client = getRegistryClient();
  const key = `ucpt:registry:${aid}`;
  
  try {
    // Encode public key as base64
    const value = Buffer.from(publicKey).toString('base64');
    
    // Store with TTL
    await client.set(key, value, { EX: ttl });
    
    console.log(`✅ Registered public key for ${aid} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`Failed to register public key for ${aid}:`, error);
    throw new Error(`Registry write failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if AID is registered
 */
export async function isAIDRegistered(aid: string): Promise<boolean> {
  const publicKey = await resolvePublicKey(aid);
  return publicKey !== null;
}

/**
 * Compute key fingerprint (SHA3-512 hash of public key)
 * Used for key identification and verification
 */
export function computeKeyFingerprint(publicKey: Uint8Array): string {
  const hash = sha3_512(publicKey);
  return base64urlEncode(hash);
}
