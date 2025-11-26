/**
 * Provenance Cascade Storage Layer
 * Distributed UCPT token cache for viral propagation across agent mesh
 * 
 * Architecture:
 * - Upstash Redis KV for global state (multi-region replication)
 * - SHA3-512 hashing for deterministic cache keys
 * - TTL-based expiration aligned with UCPT token exp field
 * - Silent rebroadcast with TTL decay (prevents infinite loops)
 * - Metrics tracking for cascade analytics
 * 
 * @module lib/cascade/storage
 * @version 1.0.0
 */

import { sha3_512 } from '@noble/hashes/sha3.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { SerializedUCPT } from '../ucpt/types';
import { verifyUCPT } from '../ucpt/verifier';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface CascadeEntry {
  ucpt: SerializedUCPT; // Complete serialized token
  sourceAid: string; // Originating agent AID
  tool: string; // Tool name
  receivedAt: number; // Unix timestamp (ms)
  ttl: number; // Remaining hops when received
  hash: string; // SHA3-512(ucpt.token) for deduplication
}

export interface CascadeMetrics {
  totalReceived: number; // Total cascade messages received
  totalStored: number; // Unique tokens stored
  totalRebroadcast: number; // Messages rebroadcast to peers
  duplicatesRejected: number; // Duplicate tokens rejected
  invalidTokens: number; // Failed verification count
  avgTTL: number; // Average TTL at reception
  lastUpdated: number; // Last metric update timestamp
}

// =====================================================
// UPSTASH REDIS CLIENT
// =====================================================

let upstashClient: any = null;

/**
 * Get or create Upstash Redis client
 * Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
 */
async function getUpstashClient() {
  if (upstashClient) return upstashClient;
  
  // Check environment variables
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    throw new Error(
      'Upstash Redis credentials not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
    );
  }
  
  // Dynamic import to avoid bundling if not used
  const { Redis } = await import('@upstash/redis');
  
  upstashClient = new Redis({
    url,
    token,
  });
  
  console.log('[CascadeStorage] Upstash Redis client initialized');
  return upstashClient;
}

// =====================================================
// CACHE KEY GENERATION
// =====================================================

/**
 * Generate deterministic cache key from UCPT token
 * Key format: cascade:{SHA3-512(token)}
 */
export function generateCascadeKey(ucptToken: string): string {
  const hash = sha3_512(new TextEncoder().encode(ucptToken));
  const hexHash = bytesToHex(hash);
  return `cascade:${hexHash}`;
}

/**
 * Generate metrics key
 * Key format: cascade:metrics
 */
export function getMetricsKey(): string {
  return 'cascade:metrics';
}

// =====================================================
// STORAGE OPERATIONS
// =====================================================

/**
 * Store UCPT token in cascade cache
 * Returns true if stored (new token), false if duplicate
 */
export async function storeCascadeToken(
  ucpt: SerializedUCPT,
  sourceAid: string,
  tool: string,
  ttl: number
): Promise<boolean> {
  const redis = await getUpstashClient();
  
  // Generate cache key
  const hash = sha3_512(new TextEncoder().encode(ucpt.token));
  const hexHash = bytesToHex(hash);
  const key = `cascade:${hexHash}`;
  
  // Check if already exists (deduplication)
  const exists = await redis.exists(key);
  if (exists) {
    console.log(`[CascadeStorage] Duplicate token rejected: ${hexHash.slice(0, 16)}...`);
    await incrementMetric('duplicatesRejected');
    return false;
  }
  
  // Verify token before storing
  const verification = await verifyUCPT(ucpt, {
    skipRateLimit: true, // Don't rate limit cascade messages
    skipReplayCheck: true, // Replay check not needed for cascade
  });
  
  if (!verification.valid) {
    console.error(`[CascadeStorage] Invalid token rejected: ${verification.error}`);
    await incrementMetric('invalidTokens');
    return false;
  }
  
  // Extract exp from payload for TTL
  const payload = verification.payload!;
  const exp = payload[7]; // exp field (unix timestamp seconds)
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = Math.max(0, exp - now);
  
  if (ttlSeconds === 0) {
    console.warn('[CascadeStorage] Expired token, not storing');
    return false;
  }
  
  // Create entry
  const entry: CascadeEntry = {
    ucpt,
    sourceAid,
    tool,
    receivedAt: Date.now(),
    ttl,
    hash: hexHash,
  };
  
  // Store with TTL matching token expiration
  await redis.setex(key, ttlSeconds, JSON.stringify(entry));
  
  console.log(
    `[CascadeStorage] Stored token ${hexHash.slice(0, 16)}... (TTL: ${ttlSeconds}s, hops: ${ttl})`
  );
  
  // Update metrics
  await Promise.all([
    incrementMetric('totalReceived'),
    incrementMetric('totalStored'),
    updateAvgTTL(ttl),
  ]);
  
  return true;
}

/**
 * Retrieve cascade entry by token
 * Returns null if not found or expired
 */
export async function getCascadeToken(ucptToken: string): Promise<CascadeEntry | null> {
  const redis = await getUpstashClient();
  const key = generateCascadeKey(ucptToken);
  
  const data = await redis.get(key);
  if (!data) return null;
  
  try {
    return JSON.parse(data as string) as CascadeEntry;
  } catch (error) {
    console.error('[CascadeStorage] Failed to parse cascade entry:', error);
    return null;
  }
}

/**
 * Check if token already in cascade cache (deduplication)
 */
export async function hasCascadeToken(ucptToken: string): Promise<boolean> {
  const redis = await getUpstashClient();
  const key = generateCascadeKey(ucptToken);
  const exists = await redis.exists(key);
  return exists > 0;
}

// =====================================================
// METRICS OPERATIONS
// =====================================================

/**
 * Increment a metric counter
 */
async function incrementMetric(metric: keyof CascadeMetrics): Promise<void> {
  const redis = await getUpstashClient();
  const key = getMetricsKey();
  
  // Use HINCRBY for atomic increment
  await redis.hincrby(key, metric, 1);
  
  // Update lastUpdated timestamp
  await redis.hset(key, 'lastUpdated', Date.now());
}

/**
 * Update average TTL metric
 * Uses exponential moving average: new_avg = 0.9 * old_avg + 0.1 * new_value
 */
async function updateAvgTTL(newTTL: number): Promise<void> {
  const redis = await getUpstashClient();
  const key = getMetricsKey();
  
  // Get current average
  const currentAvg = await redis.hget(key, 'avgTTL');
  const currentAvgNum = currentAvg ? parseFloat(currentAvg as string) : newTTL;
  
  // Calculate exponential moving average
  const newAvg = 0.9 * currentAvgNum + 0.1 * newTTL;
  
  await redis.hset(key, 'avgTTL', newAvg.toString());
}

/**
 * Record successful rebroadcast
 */
export async function recordRebroadcast(): Promise<void> {
  await incrementMetric('totalRebroadcast');
}

/**
 * Get cascade metrics
 */
export async function getCascadeMetrics(): Promise<CascadeMetrics> {
  const redis = await getUpstashClient();
  const key = getMetricsKey();
  
  // Get all metrics at once
  const data = await redis.hgetall(key);
  
  if (!data || Object.keys(data).length === 0) {
    // Return default metrics if none exist
    return {
      totalReceived: 0,
      totalStored: 0,
      totalRebroadcast: 0,
      duplicatesRejected: 0,
      invalidTokens: 0,
      avgTTL: 0,
      lastUpdated: 0,
    };
  }
  
  return {
    totalReceived: parseInt((data.totalReceived as string) || '0'),
    totalStored: parseInt((data.totalStored as string) || '0'),
    totalRebroadcast: parseInt((data.totalRebroadcast as string) || '0'),
    duplicatesRejected: parseInt((data.duplicatesRejected as string) || '0'),
    invalidTokens: parseInt((data.invalidTokens as string) || '0'),
    avgTTL: parseFloat((data.avgTTL as string) || '0'),
    lastUpdated: parseInt((data.lastUpdated as string) || '0'),
  };
}

/**
 * Reset all metrics (admin only)
 */
export async function resetCascadeMetrics(): Promise<void> {
  const redis = await getUpstashClient();
  const key = getMetricsKey();
  await redis.del(key);
  console.log('[CascadeStorage] Metrics reset');
}

// =====================================================
// BATCH OPERATIONS
// =====================================================

/**
 * Get multiple cascade entries in batch
 * Efficient for bulk retrieval (e.g., analytics, export)
 */
export async function getCascadeTokensBatch(
  ucptTokens: string[]
): Promise<Map<string, CascadeEntry>> {
  const redis = await getUpstashClient();
  const keys = ucptTokens.map(generateCascadeKey);
  
  // Use pipeline for efficient batch retrieval
  const pipeline = redis.pipeline();
  keys.forEach(key => pipeline.get(key));
  
  const results = await pipeline.exec();
  
  const entries = new Map<string, CascadeEntry>();
  results.forEach((result: any, index: number) => {
    if (result && typeof result === 'string') {
      try {
        const entry = JSON.parse(result) as CascadeEntry;
        entries.set(ucptTokens[index], entry);
      } catch (error) {
        console.error(`[CascadeStorage] Failed to parse entry at index ${index}`);
      }
    }
  });
  
  return entries;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  storeCascadeToken,
  getCascadeToken,
  hasCascadeToken,
  getCascadeMetrics,
  resetCascadeMetrics,
  recordRebroadcast,
  getCascadeTokensBatch,
  generateCascadeKey,
};
