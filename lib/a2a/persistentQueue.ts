/**
 * @file lib/a2a/persistentQueue.ts
 * @description Persistent Job Queue Storage using Supabase
 * 
 * Replaces in-memory queue with database-backed persistence:
 * - Jobs survive server restarts
 * - Atomic dequeue with FOR UPDATE SKIP LOCKED
 * - Tenant isolation via RLS
 * - Real-time statistics
 * 
 * @version 2.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getCurrentTenantIdOrNull } from '../tenancy/context';
import type { AuditJob, BatchJob, JobPriority, JobStatus } from './queue';
import type { A2AAuditResult } from './protocol';
import type { JSONValue } from '../../types/common.types';

// =====================================================
// TYPES
// =====================================================

export interface QueueStats {
  total_jobs: number;
  total_batches: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  avg_processing_time_seconds: number | null;
  queue_lengths: {
    high: number;
    normal: number;
    low: number;
  };
}

// =====================================================
// PERSISTENT QUEUE STORAGE
// =====================================================

export class PersistentQueueStorage {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Enqueue new job to persistent storage
   */
  async enqueue(job: AuditJob): Promise<void> {
    const tenantId = getCurrentTenantIdOrNull();
    
    if (!tenantId) {
      throw new Error('Cannot enqueue job without tenant context');
    }

    const { error } = await this.supabase
      .from('audit_jobs')
      .insert({
        id: job.id,
        tenant_id: tenantId,
        url: job.url,
        priority: job.priority,
        status: job.status,
        depth: job.depth,
        progress: job.progress,
        metadata: job.metadata,
        retry_count: job.metadata.retry_count,
        max_retries: job.metadata.max_retries,
      });

    if (error) {
      throw new Error(`Failed to enqueue job: ${error.message}`);
    }

    console.log(`📋 Job ${job.id} enqueued to persistent storage`);
  }

  /**
   * Atomically dequeue next pending job
   * Uses PostgreSQL FOR UPDATE SKIP LOCKED for concurrency
   */
  async dequeue(): Promise<AuditJob | null> {
    try {
      const { data, error } = await this.supabase.rpc('dequeue_job');

      if (error) {
        console.error('[PersistentQueue] Dequeue error:', error);
        return null;
      }

      // dequeue_job returns array, take first element
      const jobRow = Array.isArray(data) ? data[0] : data;

      if (!jobRow) {
        return null; // No jobs available
      }

      return this.mapRowToJob(jobRow);
    } catch (error) {
      console.error('[PersistentQueue] Dequeue failed:', error);
      return null;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<AuditJob | undefined> {
    const { data, error } = await this.supabase
      .from('audit_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return undefined;
    }

    return this.mapRowToJob(data);
  }

  /**
   * Update job fields
   */
  async updateJob(jobId: string, updates: Partial<AuditJob>): Promise<void> {
    const dbUpdates: Record<string, JSONValue> = {};

    // Map AuditJob fields to database columns
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.result !== undefined) dbUpdates.result = updates.result as unknown as JSONValue;
    if (updates.error !== undefined) dbUpdates.error = updates.error;
    if (updates.started_at !== undefined) dbUpdates.started_at = new Date(updates.started_at).toISOString();
    if (updates.completed_at !== undefined) dbUpdates.completed_at = new Date(updates.completed_at).toISOString();
    if (updates.metadata !== undefined) {
      dbUpdates.metadata = updates.metadata;
      dbUpdates.retry_count = updates.metadata.retry_count;
      dbUpdates.max_retries = updates.metadata.max_retries;
    }

    const { error } = await this.supabase
      .from('audit_jobs')
      .update(dbUpdates)
      .eq('id', jobId);

    if (error) {
      console.error(`[PersistentQueue] Failed to update job ${jobId}:`, error);
    }
  }

  /**
   * Create batch job
   */
  async createBatch(batch: BatchJob): Promise<void> {
    const tenantId = getCurrentTenantIdOrNull();
    
    if (!tenantId) {
      throw new Error('Cannot create batch without tenant context');
    }

    const { error } = await this.supabase
      .from('batch_jobs')
      .insert({
        id: batch.id,
        tenant_id: tenantId,
        urls: batch.urls,
        priority: batch.priority,
        status: batch.status,
        progress: batch.progress,
        job_ids: batch.jobs,
        completed_jobs: batch.completed_jobs,
        failed_jobs: batch.failed_jobs,
        metadata: batch.metadata,
      });

    if (error) {
      throw new Error(`Failed to create batch: ${error.message}`);
    }

    console.log(`📦 Batch ${batch.id} created in persistent storage`);
  }

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string): Promise<BatchJob | undefined> {
    const { data, error } = await this.supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error || !data) {
      return undefined;
    }

    return this.mapRowToBatch(data);
  }

  /**
   * Update batch
   */
  async updateBatch(batchId: string, updates: Partial<BatchJob>): Promise<void> {
    const dbUpdates: Record<string, JSONValue> = {};

    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.completed_jobs !== undefined) dbUpdates.completed_jobs = updates.completed_jobs;
    if (updates.failed_jobs !== undefined) dbUpdates.failed_jobs = updates.failed_jobs;
    if (updates.started_at !== undefined) dbUpdates.started_at = new Date(updates.started_at).toISOString();
    if (updates.completed_at !== undefined) dbUpdates.completed_at = new Date(updates.completed_at).toISOString();

    const { error } = await this.supabase
      .from('batch_jobs')
      .update(dbUpdates)
      .eq('id', batchId);

    if (error) {
      console.error(`[PersistentQueue] Failed to update batch ${batchId}:`, error);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_queue_stats');

      if (error) {
        console.error('[PersistentQueue] Failed to get stats:', error);
        return null;
      }

      // RPC returns array, take first element
      const stats = Array.isArray(data) ? data[0] : data;

      if (!stats) return null;

      return {
        total_jobs: Number(stats.total_jobs) || 0,
        total_batches: Number(stats.total_batches) || 0,
        pending_jobs: Number(stats.pending_jobs) || 0,
        processing_jobs: Number(stats.processing_jobs) || 0,
        completed_jobs: Number(stats.completed_jobs) || 0,
        failed_jobs: Number(stats.failed_jobs) || 0,
        avg_processing_time_seconds: stats.avg_processing_time_seconds 
          ? Number(stats.avg_processing_time_seconds) 
          : null,
        queue_lengths: stats.queue_lengths || { high: 0, normal: 0, low: 0 },
      };
    } catch (error) {
      console.error('[PersistentQueue] getStats error:', error);
      return null;
    }
  }

  /**
   * Cleanup old jobs (7 days retention by default)
   */
  async cleanup(retentionDays: number = 7): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_old_jobs', {
        retention_days: retentionDays,
      });

      if (error) {
        console.error('[PersistentQueue] Cleanup error:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('[PersistentQueue] Cleanup failed:', error);
      return 0;
    }
  }

  // =====================================================
  // MAPPERS
  // =====================================================

  private mapRowToJob(row: Record<string, unknown>): AuditJob {
    return {
      id: row.id as string,
      url: row.url as string,
      priority: row.priority as JobPriority,
      status: row.status as JobStatus,
      depth: row.depth as 'quick' | 'standard' | 'deep',
      created_at: new Date(row.created_at as string).getTime(),
      started_at: row.started_at ? new Date(row.started_at as string).getTime() : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
      progress: (row.progress as number) || 0,
      result: (row.result as A2AAuditResult) || undefined,
      error: (row.error as string) || undefined,
      metadata: {
        ...(row.metadata as Record<string, unknown>),
        tier: (row.tier as string) || 'free',
        retry_count: (row.retry_count as number) || 0,
        max_retries: (row.max_retries as number) || 3,
      },
    };
  }

  private mapRowToBatch(row: Record<string, unknown>): BatchJob {
    return {
      id: row.id as string,
      urls: (row.urls as string[]) || [],
      priority: row.priority as JobPriority,
      status: row.status as JobStatus,
      created_at: new Date(row.created_at as string).getTime(),
      started_at: row.started_at ? new Date(row.started_at as string).getTime() : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
      progress: (row.progress as number) || 0,
      jobs: (row.job_ids as string[]) || [],
      completed_jobs: (row.completed_jobs as number) || 0,
      failed_jobs: (row.failed_jobs as number) || 0,
      metadata: {
        tier: (row.tier as string) || 'free',
        ...(row.metadata as Record<string, unknown>),
      },
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let queueInstance: PersistentQueueStorage | null = null;

/**
 * Get or create singleton queue instance
 */
export function getPersistentQueue(): PersistentQueueStorage {
  if (!queueInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    queueInstance = new PersistentQueueStorage(supabaseUrl, supabaseKey);
  }

  return queueInstance;
}

// =====================================================
// BACKWARDS COMPATIBILITY HELPERS
// =====================================================

/**
 * Create and enqueue job (backwards compatible with queue.ts)
 */
export async function createPersistentAuditJob(
  url: string,
  options: {
    priority?: JobPriority;
    depth?: 'quick' | 'standard' | 'deep';
    api_key?: string;
    tier?: string;
    agent_name?: string;
  } = {}
): Promise<AuditJob> {
  const job: AuditJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    url,
    priority: options.priority || 'normal',
    status: 'pending',
    depth: options.depth || 'standard',
    created_at: Date.now(),
    progress: 0,
    metadata: {
      api_key: options.api_key,
      tier: options.tier || 'free',
      agent_name: options.agent_name,
      retry_count: 0,
      max_retries: 3,
    },
  };

  const queue = getPersistentQueue();
  await queue.enqueue(job);

  return job;
}

/**
 * Get job status (backwards compatible)
 */
export async function getPersistentJobStatus(jobId: string): Promise<AuditJob | null> {
  const queue = getPersistentQueue();
  return (await queue.getJob(jobId)) || null;
}

/**
 * Mark job as completed
 */
export async function completePersistentJob(jobId: string, result: A2AAuditResult): Promise<void> {
  const queue = getPersistentQueue();
  await queue.updateJob(jobId, {
    status: 'completed',
    completed_at: Date.now(),
    progress: 100,
    result,
  });
  console.log(`✅ Job ${jobId} completed`);
}

/**
 * Mark job as failed
 */
export async function failPersistentJob(jobId: string, error: string): Promise<void> {
  const queue = getPersistentQueue();
  await queue.updateJob(jobId, {
    status: 'failed',
    completed_at: Date.now(),
    error,
  });
  console.error(`❌ Job ${jobId} failed: ${error}`);
}
