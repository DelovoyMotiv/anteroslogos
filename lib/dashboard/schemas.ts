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
  expires_at: z.string().datetime().nullable(),
  last_used_at: z.string().datetime().nullable(),
  usage_count: z.number().int().nonnegative(),
  revoked: z.boolean(),
  revoked_at: z.string().datetime().nullable(),
  revoked_reason: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
 * Agent Key schema matching the agent_keys table structure
 */
export const AgentKeySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  aid_registry_id: z.string().uuid().optional(),
  name: z.string().min(1),
  aid_uri: z.string(),
  public_key: z.string(),
  key_algorithm: z.string(),
  permissions: z.array(z.string()),
  metadata: z.record(z.unknown()),
  revoked: z.boolean(),
  revoked_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type AgentKey = z.infer<typeof AgentKeySchema>;

/**
 * Convert database row to Agent Key domain model
 */
export function agentKeyFromDb(row: Record<string, unknown>): AgentKey {
  return AgentKeySchema.parse({
    ...row,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at as Date).toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at as Date).toISOString(),
    revoked_at: row.revoked_at ? (typeof row.revoked_at === 'string' ? row.revoked_at : new Date(row.revoked_at as Date).toISOString()) : null,
  });
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
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
  created_at: z.string().datetime(),
  tenant_id: z.string().uuid().nullable(),
  ucpt_hash: z.string().nullable(),
  // Additional fields from usage-analytics.ts
  duration_ms: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
  timestamp: z.string().datetime().optional(),
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
