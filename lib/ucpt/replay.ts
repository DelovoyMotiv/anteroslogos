/**
 * UCPT Replay Protection - Token Nonce Tracking
 * Prevents token reuse attacks
 */

import { createRedisClient } from '../a2a/redisAdapter';
import { sha3_512 } from '@noble/hashes/sha3.js';
import { base64urlEncode } from './serializer';

// =====================================================
// REPLAY CLIENT
// =====================================================

let replayClient: ReturnType<typeof createRedisClient> | null = null;

function getReplayClient() {
  if (!replayClient) {
    replayClient = createRedisClient();
  }
  return replayClient;
}

// =====================================================
// TOKEN HASH COMPUTATION
// =====================================================

/**
 * Compute token hash for nonce tracking
 * Uses SHA3-512(token) as unique identifier
 */
function computeTokenHash(token: string): string {
  const bytes = Buffer.from(token, 'utf-8');
  const hash = sha3_512(bytes);
  return base64urlEncode(hash);
}

// =====================================================
// REPLAY DETECTION
// =====================================================

/**
 * Check if token has been seen before (replay attack detection)
 * Returns true if token is replayed (attack detected)
 * Returns false if token is new (safe to process)
 */
export async function checkReplayAttack(token: string): Promise<boolean> {
  const client = getReplayClient();
  const tokenHash = computeTokenHash(token);
  const key = `ucpt:nonce:${tokenHash}`;
  
  try {
    // Check if token hash exists in Redis
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Replay check failed:', error);
    // Fail-safe: reject token if Redis unavailable (security over availability)
    return true;
  }
}

/**
 * Record token as seen (prevent future replay)
 * TTL = token expiration time (auto-cleanup after exp)
 */
export async function recordToken(token: string, exp: number): Promise<void> {
  const client = getReplayClient();
  const tokenHash = computeTokenHash(token);
  const key = `ucpt:nonce:${tokenHash}`;
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(exp - now, 60); // Minimum 60s TTL
    
    // Atomic check-and-set with NX flag
    const result = await client.set(key, '1', { EX: ttl, NX: true });
    
    if (result === null) {
      console.warn(`⚠️  Token already recorded: ${tokenHash.slice(0, 16)}...`);
    }
  } catch (error) {
    console.error('Failed to record token:', error);
    throw new Error(`Replay protection write failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check and record token atomically
 * Returns true if token is new (recorded successfully)
 * Returns false if token is replayed (already exists)
 */
export async function checkAndRecordToken(token: string, exp: number): Promise<boolean> {
  const client = getReplayClient();
  const tokenHash = computeTokenHash(token);
  const key = `ucpt:nonce:${tokenHash}`;
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(exp - now, 60);
    
    // Atomic SET NX operation
    const result = await client.set(key, '1', { EX: ttl, NX: true });
    
    // result === 'OK' means key was set (new token)
    // result === null means key already exists (replay)
    return result === 'OK';
  } catch (error) {
    console.error('Atomic replay check failed:', error);
    // Fail-safe: reject token if Redis unavailable
    return false;
  }
}

/**
 * Get token usage count (for monitoring)
 * Returns number of times token hash has been seen
 */
export async function getTokenUsageCount(token: string): Promise<number> {
  const client = getReplayClient();
  const tokenHash = computeTokenHash(token);
  const key = `ucpt:nonce:${tokenHash}`;
  
  try {
    const exists = await client.exists(key);
    return exists;
  } catch (error) {
    console.error('Failed to get token usage count:', error);
    return 0;
  }
}

/**
 * Clear token record (admin use only, for testing)
 */
export async function clearTokenRecord(token: string): Promise<void> {
  const client = getReplayClient();
  const tokenHash = computeTokenHash(token);
  const key = `ucpt:nonce:${tokenHash}`;
  
  try {
    await client.del(key);
  } catch (error) {
    console.error('Failed to clear token record:', error);
  }
}
