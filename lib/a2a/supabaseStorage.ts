/**
 * Supabase Storage Adapter - Production Persistence Layer
 * Replaces in-memory storage with Supabase PostgreSQL
 * Provides tables for agents, rate limits, jobs, audits
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RegisteredAgent } from './agentRegistry';
import type { AuditJob, BatchJob } from './queue';
import type { A2AAuditResult } from './protocol';
import { logger } from './logger';

// =====================================================
// DATABASE SCHEMA TYPES
// =====================================================

export interface DbAgent {
  id: string;
  name: string;
  version: string | null;
  type: string;
  capabilities: string[];
  contact: string | null;
  api_key: string;
  status: string;
  registered_at: string;
  last_seen_at: string | null;
  total_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  trust_score: number;
  metadata: any;
  rate_limit_tier: string;
  webhook_url: string | null;
  notification_email: string | null;
}

export interface DbRateLimit {
  api_key: string;
  tier: string;
  tokens: number;
  last_refill: string;
  concurrent: number;
  updated_at: string;
}

export interface DbAuditJob {
  id: string;
  url: string;
  priority: string;
  status: string;
  depth: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress: number;
  result: any | null;
  error: string | null;
  metadata: any;
}

export interface DbBatchJob {
  id: string;
  urls: string[];
  priority: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress: number;
  jobs: string[];
  completed_jobs: number;
  failed_jobs: number;
  metadata: any;
}

export interface DbAuditResult {
  id: string;
  audit_id: string;
  url: string;
  result: any;
  cached_until: string;
  created_at: string;
}

// =====================================================
// SUPABASE CLIENT
// =====================================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  logger.info('Supabase client initialized', {
    url: supabaseUrl,
    tags: ['supabase', 'init'],
  });
  
  return supabaseClient;
}

// =====================================================
// AGENT STORAGE
// =====================================================

export class SupabaseAgentStorage {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = getSupabaseClient();
  }
  
  /**
   * Save agent to database
   */
  async saveAgent(agent: RegisteredAgent): Promise<void> {
    const dbAgent: Partial<DbAgent> = {
      id: agent.id,
      name: agent.name,
      version: agent.version || null,
      type: agent.type,
      capabilities: agent.capabilities,
      contact: agent.contact || null,
      api_key: agent.api_key || '',
      status: agent.status,
      registered_at: agent.registered_at,
      last_seen_at: agent.last_seen_at || null,
      total_requests: agent.total_requests,
      failed_requests: agent.failed_requests,
      avg_response_time_ms: agent.avg_response_time_ms,
      trust_score: agent.trust_score,
      metadata: agent.metadata,
      rate_limit_tier: agent.rate_limit_tier,
      webhook_url: agent.webhook_url || null,
      notification_email: agent.notification_email || null,
    };
    
    const { error } = await this.supabase
      .from('a2a_agents')
      .upsert(dbAgent);
    
    if (error) {
      logger.error('Failed to save agent to Supabase', { agent_id: agent.id }, error);
      throw error;
    }
  }
  
  /**
   * Get agent by ID
   */
  async getAgent(id: string): Promise<RegisteredAgent | null> {
    const { data, error } = await this.supabase
      .from('a2a_agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    
    return this.mapDbAgentToRegisteredAgent(data);
  }
  
  /**
   * Get agent by API key
   */
  async getAgentByApiKey(apiKey: string): Promise<RegisteredAgent | null> {
    const { data, error } = await this.supabase
      .from('a2a_agents')
      .select('*')
      .eq('api_key', apiKey)
      .single();
    
    if (error || !data) return null;
    
    return this.mapDbAgentToRegisteredAgent(data);
  }
  
  /**
   * Get agent by name
   */
  async getAgentByName(name: string): Promise<RegisteredAgent | null> {
    const { data, error } = await this.supabase
      .from('a2a_agents')
      .select('*')
      .ilike('name', name)
      .single();
    
    if (error || !data) return null;
    
    return this.mapDbAgentToRegisteredAgent(data);
  }
  
  /**
   * Update agent
   */
  async updateAgent(id: string, updates: Partial<RegisteredAgent>): Promise<boolean> {
    const { error } = await this.supabase
      .from('a2a_agents')
      .update(updates as any)
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * List agents with filters
   */
  async listAgents(filters?: {
    status?: string;
    type?: string;
    tier?: string;
  }): Promise<RegisteredAgent[]> {
    let query = this.supabase.from('a2a_agents').select('*');
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    
    if (filters?.tier) {
      query = query.eq('rate_limit_tier', filters.tier);
    }
    
    const { data, error } = await query;
    
    if (error || !data) return [];
    
    return data.map(agent => this.mapDbAgentToRegisteredAgent(agent));
  }
  
  /**
   * Map database agent to RegisteredAgent type
   */
  private mapDbAgentToRegisteredAgent(dbAgent: any): RegisteredAgent {
    return {
      id: dbAgent.id,
      name: dbAgent.name,
      version: dbAgent.version,
      type: dbAgent.type,
      capabilities: dbAgent.capabilities,
      contact: dbAgent.contact,
      api_key: dbAgent.api_key,
      status: dbAgent.status,
      registered_at: dbAgent.registered_at,
      last_seen_at: dbAgent.last_seen_at,
      total_requests: dbAgent.total_requests,
      failed_requests: dbAgent.failed_requests,
      avg_response_time_ms: dbAgent.avg_response_time_ms,
      trust_score: dbAgent.trust_score,
      metadata: dbAgent.metadata,
      rate_limit_tier: dbAgent.rate_limit_tier,
      webhook_url: dbAgent.webhook_url,
      notification_email: dbAgent.notification_email,
    };
  }
}

// =====================================================
// RATE LIMIT STORAGE
// =====================================================

export class SupabaseRateLimitStorage {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = getSupabaseClient();
  }
  
  /**
   * Get rate limit state
   */
  async getRateLimit(apiKey: string): Promise<DbRateLimit | null> {
    const { data, error } = await this.supabase
      .from('a2a_rate_limits')
      .select('*')
      .eq('api_key', apiKey)
      .single();
    
    if (error || !data) return null;
    
    return data;
  }
  
  /**
   * Update rate limit state
   */
  async updateRateLimit(apiKey: string, updates: Partial<DbRateLimit>): Promise<void> {
    const { error } = await this.supabase
      .from('a2a_rate_limits')
      .upsert({
        api_key: apiKey,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      logger.error('Failed to update rate limit', { api_key: apiKey }, error);
    }
  }
}

// =====================================================
// JOB QUEUE STORAGE
// =====================================================

export class SupabaseQueueStorage {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = getSupabaseClient();
  }
  
  /**
   * Save job
   */
  async saveJob(job: AuditJob): Promise<void> {
    const dbJob: Partial<DbAuditJob> = {
      id: job.id,
      url: job.url,
      priority: job.priority,
      status: job.status,
      depth: job.depth,
      created_at: new Date(job.created_at).toISOString(),
      started_at: job.started_at ? new Date(job.started_at).toISOString() : null,
      completed_at: job.completed_at ? new Date(job.completed_at).toISOString() : null,
      progress: job.progress,
      result: job.result || null,
      error: job.error || null,
      metadata: job.metadata,
    };
    
    const { error } = await this.supabase
      .from('a2a_audit_jobs')
      .upsert(dbJob);
    
    if (error) {
      logger.error('Failed to save job', { job_id: job.id }, error);
      throw error;
    }
  }
  
  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<AuditJob | null> {
    const { data, error } = await this.supabase
      .from('a2a_audit_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error || !data) return null;
    
    return this.mapDbJobToAuditJob(data);
  }
  
  /**
   * Get pending jobs by priority
   */
  async getPendingJobs(priority: string, limit: number = 10): Promise<AuditJob[]> {
    const { data, error } = await this.supabase
      .from('a2a_audit_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('priority', priority)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error || !data) return [];
    
    return data.map(job => this.mapDbJobToAuditJob(job));
  }
  
  /**
   * Update job
   */
  async updateJob(jobId: string, updates: Partial<AuditJob>): Promise<void> {
    const { error } = await this.supabase
      .from('a2a_audit_jobs')
      .update(updates as any)
      .eq('id', jobId);
    
    if (error) {
      logger.error('Failed to update job', { job_id: jobId }, error);
    }
  }
  
  /**
   * Save batch job
   */
  async saveBatchJob(batch: BatchJob): Promise<void> {
    const dbBatch: Partial<DbBatchJob> = {
      id: batch.id,
      urls: batch.urls,
      priority: batch.priority,
      status: batch.status,
      created_at: new Date(batch.created_at).toISOString(),
      started_at: batch.started_at ? new Date(batch.started_at).toISOString() : null,
      completed_at: batch.completed_at ? new Date(batch.completed_at).toISOString() : null,
      progress: batch.progress,
      jobs: batch.jobs,
      completed_jobs: batch.completed_jobs,
      failed_jobs: batch.failed_jobs,
      metadata: batch.metadata,
    };
    
    const { error } = await this.supabase
      .from('a2a_batch_jobs')
      .upsert(dbBatch);
    
    if (error) {
      logger.error('Failed to save batch job', { batch_id: batch.id }, error);
      throw error;
    }
  }
  
  /**
   * Get batch job by ID
   */
  async getBatchJob(batchId: string): Promise<BatchJob | null> {
    const { data, error } = await this.supabase
      .from('a2a_batch_jobs')
      .select('*')
      .eq('id', batchId)
      .single();
    
    if (error || !data) return null;
    
    return this.mapDbBatchToBatchJob(data);
  }
  
  /**
   * Map database job to AuditJob type
   */
  private mapDbJobToAuditJob(dbJob: any): AuditJob {
    return {
      id: dbJob.id,
      url: dbJob.url,
      priority: dbJob.priority,
      status: dbJob.status,
      depth: dbJob.depth,
      created_at: new Date(dbJob.created_at).getTime(),
      started_at: dbJob.started_at ? new Date(dbJob.started_at).getTime() : undefined,
      completed_at: dbJob.completed_at ? new Date(dbJob.completed_at).getTime() : undefined,
      progress: dbJob.progress,
      result: dbJob.result,
      error: dbJob.error,
      metadata: dbJob.metadata,
    };
  }
  
  /**
   * Map database batch to BatchJob type
   */
  private mapDbBatchToBatchJob(dbBatch: any): BatchJob {
    return {
      id: dbBatch.id,
      urls: dbBatch.urls,
      priority: dbBatch.priority,
      status: dbBatch.status,
      created_at: new Date(dbBatch.created_at).getTime(),
      started_at: dbBatch.started_at ? new Date(dbBatch.started_at).getTime() : undefined,
      completed_at: dbBatch.completed_at ? new Date(dbBatch.completed_at).getTime() : undefined,
      progress: dbBatch.progress,
      jobs: dbBatch.jobs,
      completed_jobs: dbBatch.completed_jobs,
      failed_jobs: dbBatch.failed_jobs,
      metadata: dbBatch.metadata,
    };
  }
}

// =====================================================
// AUDIT RESULT CACHE
// =====================================================

export class SupabaseAuditCache {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = getSupabaseClient();
  }
  
  /**
   * Cache audit result
   */
  async cacheResult(auditId: string, url: string, result: A2AAuditResult, ttlSeconds: number = 3600): Promise<void> {
    const cachedUntil = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    const dbResult: Partial<DbAuditResult> = {
      audit_id: auditId,
      url,
      result,
      cached_until: cachedUntil,
      created_at: new Date().toISOString(),
    };
    
    const { error } = await this.supabase
      .from('a2a_audit_cache')
      .upsert(dbResult);
    
    if (error) {
      logger.error('Failed to cache audit result', { audit_id: auditId }, error);
    }
  }
  
  /**
   * Get cached result
   */
  async getCachedResult(url: string): Promise<A2AAuditResult | null> {
    const { data, error } = await this.supabase
      .from('a2a_audit_cache')
      .select('*')
      .eq('url', url)
      .gt('cached_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    
    return data.result;
  }
  
  /**
   * Invalidate cache
   */
  async invalidateCache(url: string): Promise<void> {
    await this.supabase
      .from('a2a_audit_cache')
      .delete()
      .eq('url', url);
  }
  
  /**
   * Cleanup expired cache entries
   */
  async cleanupExpired(): Promise<number> {
    const { data, error } = await this.supabase
      .from('a2a_audit_cache')
      .delete()
      .lt('cached_until', new Date().toISOString())
      .select('id');
    
    if (error) return 0;
    
    return data?.length || 0;
  }
}

// =====================================================
// MIGRATION SQL
// =====================================================

export const SUPABASE_MIGRATION_SQL = `
-- A2A Agents table
CREATE TABLE IF NOT EXISTS a2a_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  type TEXT NOT NULL,
  capabilities TEXT[] NOT NULL,
  contact TEXT,
  api_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  total_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms NUMERIC NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 50,
  metadata JSONB,
  rate_limit_tier TEXT NOT NULL,
  webhook_url TEXT,
  notification_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_a2a_agents_api_key ON a2a_agents(api_key);
CREATE INDEX IF NOT EXISTS idx_a2a_agents_name ON a2a_agents(name);
CREATE INDEX IF NOT EXISTS idx_a2a_agents_status ON a2a_agents(status);

-- A2A Rate Limits table
CREATE TABLE IF NOT EXISTS a2a_rate_limits (
  api_key TEXT PRIMARY KEY,
  tier TEXT NOT NULL,
  tokens NUMERIC NOT NULL DEFAULT 0,
  last_refill TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  concurrent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A2A Audit Jobs table
CREATE TABLE IF NOT EXISTS a2a_audit_jobs (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  depth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_a2a_audit_jobs_status ON a2a_audit_jobs(status);
CREATE INDEX IF NOT EXISTS idx_a2a_audit_jobs_priority ON a2a_audit_jobs(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_a2a_audit_jobs_url ON a2a_audit_jobs(url);

-- A2A Batch Jobs table
CREATE TABLE IF NOT EXISTS a2a_batch_jobs (
  id TEXT PRIMARY KEY,
  urls TEXT[] NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER NOT NULL DEFAULT 0,
  jobs TEXT[] NOT NULL,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_a2a_batch_jobs_status ON a2a_batch_jobs(status);

-- A2A Audit Cache table
CREATE TABLE IF NOT EXISTS a2a_audit_cache (
  id SERIAL PRIMARY KEY,
  audit_id TEXT NOT NULL,
  url TEXT NOT NULL,
  result JSONB NOT NULL,
  cached_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_a2a_audit_cache_url ON a2a_audit_cache(url, cached_until);
CREATE INDEX IF NOT EXISTS idx_a2a_audit_cache_expires ON a2a_audit_cache(cached_until);
`;
