/**
 * Dashboard Domain Model Schemas
 * 
 * Zod schemas for API keys, agent keys, and usage analytics.
 * These schemas provide runtime validation and type inference.
 * 
 * @module lib/dashboard/schemas
 */

import { z } from 'zod';

// =====================================================
// API KEY SCHEMAS
// =====================================================

/**
 * Flexible datetime schema that accepts both ISO 8601 and Postgres timestamp formats
 * Postgres returns: "2026-01-03 17:44:38.401264+00"
 * ISO 8601 expects: "2026-01-03T17:44:38.401264Z"
 */
const flexibleDatetime = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid datetime format' }
);

/**
 * API Key schema matching the api_keys table structure
 */
export const APIKeySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  key_prefix: z.string(),
  key_hash: z.string(),
  scoped_tools: z.array(z.string()).nullable(),
  rate_limit_per_minute: z.number().int().positive(),
  rate_limit_per_hour: z.number().int().positive(),
  expires_at: flexibleDatetime.nullable(),
  last_used_at: flexibleDatetime.nullable(),
  usage_count: z.number().int().nonnegative(),
  revoked: z.boolean(),
  revoked_at: flexibleDatetime.nullable(),
  revoked_reason: z.string().nullable(),
  created_at: flexibleDatetime,
  updated_at: flexibleDatetime,
  tenant_id: z.string().uuid().nullable(),
});

export type APIKey = z.infer<typeof APIKeySchema>;

/**
 * Convert database row to API Key domain model
 */
export function apiKeyFromDb(row: Record<string, unknown>): APIKey {
  return APIKeySchema.parse({
    ...row,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at as Date).toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at as Date).toISOString(),
    last_used_at: row.last_used_at ? (typeof row.last_used_at === 'string' ? row.last_used_at : new Date(row.last_used_at as Date).toISOString()) : null,
    expires_at: row.expires_at ? (typeof row.expires_at === 'string' ? row.expires_at : new Date(row.expires_at as Date).toISOString()) : null,
  });
}

// =====================================================
// AGENT KEY SCHEMAS
// =====================================================

/**
 * Base Agent Key schema without preprocessing
 * Accepts aid_uri directly (after mapping from aip_uri)
 */
const AgentKeyBaseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tenant_id: z.string().uuid().nullable(),
  name: z.string().min(1),
  aid_uri: z.string(),
  public_key: z.string(),
  key_algorithm: z.string(),
  permissions: z.union([z.array(z.string()), z.record(z.unknown())]),
  metadata: z.record(z.unknown()),
  revoked: z.boolean(),
  revoked_at: flexibleDatetime.nullable(),
  created_at: flexibleDatetime,
  updated_at: flexibleDatetime,
});

export type AgentKey = z.infer<typeof AgentKeyBaseSchema>;

/**
 * Agent Key schema for use with queryHelpers
 * Wraps base schema with preprocessing to handle aip_uri -> aid_uri mapping
 */
export const AgentKeySchema = AgentKeyBaseSchema;

/**
 * Parse agent key from database row
 * Maps aip_uri to aid_uri for API consistency
 */
export function parseAgentKeyFromDb(data: unknown): AgentKey | null {
  try {
    if (typeof data !== 'object' || data === null) return null;
    
    const obj = data as Record<string, unknown>;
    const normalized = {
      ...obj,
      aid_uri: obj.aip_uri || obj.aid_uri,
    };
    
    return AgentKeyBaseSchema.parse(normalized);
  } catch (error) {
    console.error('parseAgentKeyFromDb error:', error);
    return null;
  }
}

/**
 * Parse multiple agent keys from database rows
 */
export function parseAgentKeysFromDb(data: unknown[]): AgentKey[] {
  return data
    .map(item => parseAgentKeyFromDb(item))
    .filter((item): item is AgentKey => item !== null);
}

/**
 * Convert database row to Agent Key domain model
 * @deprecated Use parseAgentKeyFromDb instead
 */
export function agentKeyFromDb(row: Record<string, unknown>): AgentKey {
  const result = parseAgentKeyFromDb(row);
  if (!result) throw new Error('Failed to parse agent key from database');
  return result;
}

// =====================================================
// CREDIT PACKAGE SCHEMAS
// =====================================================

/**
 * Credit Package schema matching the credit_packages table structure
 */
export const CreditPackageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  ccc_amount: z.number().positive(),
  usd_cost: z.number().positive(),
  bonus_percentage: z.number().min(0).max(100),
  is_active: z.boolean(),
  display_order: z.number().int(),
  created_at: flexibleDatetime,
  updated_at: flexibleDatetime,
  description: z.string().nullable(),
  stripe_price_id: z.string().nullable().optional(),
  cost_per_credit: z.number().positive().optional(),
});

export type CreditPackage = z.infer<typeof CreditPackageSchema>;

/**
 * Convert database row to Credit Package domain model
 */
export function creditPackageFromDb(row: Record<string, unknown>): CreditPackage {
  return CreditPackageSchema.parse({
    ...row,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at as Date).toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at as Date).toISOString(),
  });
}

// =====================================================
// USAGE ANALYTICS SCHEMAS
// =====================================================

/**
 * Usage Event schema matching the usage_events table structure
 */
export const UsageEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  api_key_id: z.string().uuid().nullable(),
  tool_name: z.string().min(1),
  status: z.enum(['success', 'error', 'rate_limited', 'unauthorized']),
  error_message: z.string().nullable(),
  response_time_ms: z.number().int().nonnegative(),
  tokens_used: z.number().int().nonnegative().nullable(),
  cost_ccc: z.number().nonnegative(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: flexibleDatetime,
  tenant_id: z.string().uuid().nullable(),
  ucpt_hash: z.string().nullable(),
  // Additional fields from usage-analytics.ts
  duration_ms: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
  timestamp: flexibleDatetime.optional(),
});

export type UsageEvent = z.infer<typeof UsageEventSchema>;

/**
 * Convert database row to Usage Event domain model
 */
export function usageEventFromDb(row: Record<string, unknown>): UsageEvent {
  return UsageEventSchema.parse({
    ...row,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at as Date).toISOString(),
  });
}

/**
 * Daily Usage schema for aggregated statistics
 */
export const DailyUsageSchema = z.object({
  date: z.string(),
  user_id: z.string().uuid(),
  total_calls: z.number().int().nonnegative(),
  successful_calls: z.number().int().nonnegative(),
  failed_calls: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  total_cost_ccc: z.number().nonnegative(),
  unique_tools: z.number().int().nonnegative(),
  avg_response_time_ms: z.number().nonnegative(),
  p95_response_time_ms: z.number().nonnegative(),
  p99_response_time_ms: z.number().nonnegative(),
});

export type DailyUsage = z.infer<typeof DailyUsageSchema>;

/**
 * Usage Stats schema for current period statistics
 */
export const UsageStatsSchema = z.object({
  total_calls: z.number().int().nonnegative(),
  successful_calls: z.number().int().nonnegative(),
  failed_calls: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  total_cost_ccc: z.number().nonnegative(),
  unique_tools: z.number().int().nonnegative(),
  avg_response_time_ms: z.number().nonnegative(),
});

export type UsageStats = z.infer<typeof UsageStatsSchema>;
