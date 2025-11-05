/**
 * A2A Queue System - Job Queue for Async Audit Processing
 * Production-ready with priority, progress tracking, and error handling
 */

import type { A2AAuditResult } from './protocol';

// =====================================================
// TYPES
// =====================================================

export type JobPriority = 'high' | 'normal' | 'low';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface AuditJob {
  id: string;
  url: string;
  priority: JobPriority;
  status: JobStatus;
  depth: 'quick' | 'standard' | 'deep';
  created_at: number;
  started_at?: number;
  completed_at?: number;
  progress: number; // 0-100
  result?: A2AAuditResult;
  error?: string;
  metadata: {
    api_key?: string;
    tier: string;
    agent_name?: string;
    retry_count: number;
    max_retries: number;
  };
}

export interface BatchJob {
  id: string;
  urls: string[];
  priority: JobPriority;
  status: JobStatus;
  created_at: number;
  started_at?: number;
  completed_at?: number;
  progress: number; // 0-100
  jobs: string[]; // Individual job IDs
  completed_jobs: number;
  failed_jobs: number;
  metadata: {
    api_key?: string;
    tier: string;
    agent_name?: string;
  };
}

// =====================================================
// IN-MEMORY QUEUE STORAGE
// =====================================================

class QueueStorage {
  private jobs: Map<string, AuditJob> = new Map();
  private batches: Map<string, BatchJob> = new Map();
  private queues: {
    high: string[];
    normal: string[];
    low: string[];
  } = {
    high: [],
    normal: [],
    low: [],
  };
  
  // Add job to queue
  enqueue(job: AuditJob): void {
    this.jobs.set(job.id, job);
    this.queues[job.priority].push(job.id);
  }
  
  // Get next job from queue (priority-based)
  dequeue(): AuditJob | null {
    // Check high priority first
    for (const priority of ['high', 'normal', 'low'] as JobPriority[]) {
      const queue = this.queues[priority];
      while (queue.length > 0) {
        const jobId = queue.shift()!;
        const job = this.jobs.get(jobId);
        if (job && job.status === 'pending') {
          return job;
        }
      }
    }
    return null;
  }
  
  // Get job by ID
  getJob(jobId: string): AuditJob | undefined {
    return this.jobs.get(jobId);
  }
  
  // Update job
  updateJob(jobId: string, updates: Partial<AuditJob>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(jobId, job);
    }
  }
  
  // Get batch by ID
  getBatch(batchId: string): BatchJob | undefined {
    return this.batches.get(batchId);
  }
  
  // Update batch
  updateBatch(batchId: string, updates: Partial<BatchJob>): void {
    const batch = this.batches.get(batchId);
    if (batch) {
      Object.assign(batch, updates);
      this.batches.set(batchId, batch);
    }
  }
  
  // Create batch
  createBatch(batch: BatchJob): void {
    this.batches.set(batch.id, batch);
  }
  
  // Get queue stats
  getStats() {
    return {
      total_jobs: this.jobs.size,
      total_batches: this.batches.size,
      pending: Array.from(this.jobs.values()).filter(j => j.status === 'pending').length,
      processing: Array.from(this.jobs.values()).filter(j => j.status === 'processing').length,
      completed: Array.from(this.jobs.values()).filter(j => j.status === 'completed').length,
      failed: Array.from(this.jobs.values()).filter(j => j.status === 'failed').length,
      queue_lengths: {
        high: this.queues.high.length,
        normal: this.queues.normal.length,
        low: this.queues.low.length,
      },
    };
  }
  
  // Cleanup old jobs (older than 24 hours)
  cleanup(): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let removed = 0;
    
    for (const [id, job] of this.jobs.entries()) {
      if (job.created_at < cutoff && ['completed', 'failed', 'cancelled'].includes(job.status)) {
        this.jobs.delete(id);
        removed++;
      }
    }
    
    for (const [id, batch] of this.batches.entries()) {
      if (batch.created_at < cutoff && ['completed', 'failed', 'cancelled'].includes(batch.status)) {
        this.batches.delete(id);
        removed++;
      }
    }
    
    return removed;
  }
}

// Global queue storage
const queueStorage = new QueueStorage();

// Auto-cleanup every hour
setInterval(() => {
  const removed = queueStorage.cleanup();
  if (removed > 0) {
    console.log(`🧹 Cleaned up ${removed} old jobs from queue`);
  }
}, 60 * 60 * 1000);

// =====================================================
// QUEUE OPERATIONS
// =====================================================

/**
 * Create and enqueue a new audit job
 */
export function createAuditJob(
  url: string,
  options: {
    priority?: JobPriority;
    depth?: 'quick' | 'standard' | 'deep';
    api_key?: string;
    tier?: string;
    agent_name?: string;
  } = {}
): AuditJob {
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
  
  queueStorage.enqueue(job);
  console.log(`📋 Job ${job.id} created for ${url} (priority: ${job.priority})`);
  
  return job;
}

/**
 * Create a batch of audit jobs
 */
export function createBatchAuditJob(
  urls: string[],
  options: {
    priority?: JobPriority;
    depth?: 'quick' | 'standard' | 'deep';
    api_key?: string;
    tier?: string;
    agent_name?: string;
  } = {}
): BatchJob {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  // Create individual jobs
  const jobIds = urls.map(url => {
    const job = createAuditJob(url, options);
    return job.id;
  });
  
  // Create batch
  const batch: BatchJob = {
    id: batchId,
    urls,
    priority: options.priority || 'normal',
    status: 'pending',
    created_at: Date.now(),
    progress: 0,
    jobs: jobIds,
    completed_jobs: 0,
    failed_jobs: 0,
    metadata: {
      api_key: options.api_key,
      tier: options.tier || 'free',
      agent_name: options.agent_name,
    },
  };
  
  queueStorage.createBatch(batch);
  console.log(`📦 Batch ${batch.id} created with ${urls.length} jobs`);
  
  return batch;
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): AuditJob | null {
  return queueStorage.getJob(jobId) || null;
}

/**
 * Get batch status
 */
export function getBatchStatus(batchId: string): BatchJob | null {
  return queueStorage.getBatch(batchId) || null;
}

/**
 * Update job progress
 */
export function updateJobProgress(jobId: string, progress: number): void {
  queueStorage.updateJob(jobId, { progress: Math.min(100, Math.max(0, progress)) });
}

/**
 * Mark job as completed
 */
export function completeJob(jobId: string, result: A2AAuditResult): void {
  const job = queueStorage.getJob(jobId);
  if (!job) return;
  
  queueStorage.updateJob(jobId, {
    status: 'completed',
    completed_at: Date.now(),
    progress: 100,
    result,
  });
  
  console.log(`✅ Job ${jobId} completed in ${Date.now() - job.created_at}ms`);
  
  // Update batch if exists
  updateBatchProgress(jobId);
}

/**
 * Mark job as failed
 */
export function failJob(jobId: string, error: string): void {
  const job = queueStorage.getJob(jobId);
  if (!job) return;
  
  queueStorage.updateJob(jobId, {
    status: 'failed',
    completed_at: Date.now(),
    error,
  });
  
  console.error(`❌ Job ${jobId} failed: ${error}`);
  
  // Update batch if exists
  updateBatchProgress(jobId);
}

/**
 * Update batch progress based on job completion
 */
function updateBatchProgress(jobId: string): void {
  // Find batch containing this job
  for (const [batchId, batch] of queueStorage['batches'].entries()) {
    if (batch.jobs.includes(jobId)) {
      const jobs = batch.jobs.map(id => queueStorage.getJob(id)).filter(Boolean) as AuditJob[];
      const completed = jobs.filter(j => j.status === 'completed').length;
      const failed = jobs.filter(j => j.status === 'failed').length;
      const total = jobs.length;
      
      queueStorage.updateBatch(batchId, {
        completed_jobs: completed,
        failed_jobs: failed,
        progress: Math.round(((completed + failed) / total) * 100),
        status: completed + failed === total ? 'completed' : batch.status,
        completed_at: completed + failed === total ? Date.now() : undefined,
      });
      
      break;
    }
  }
}

/**
 * Cancel job
 */
export function cancelJob(jobId: string): void {
  queueStorage.updateJob(jobId, {
    status: 'cancelled',
    completed_at: Date.now(),
  });
  
  console.log(`🚫 Job ${jobId} cancelled`);
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  return queueStorage.getStats();
}

// =====================================================
// WORKER PROCESSING
// =====================================================

/**
 * Process next job in queue
 * This would be called by a worker process/thread
 */
export async function processNextJob(
  processor: (job: AuditJob) => Promise<A2AAuditResult>
): Promise<boolean> {
  const job = queueStorage.dequeue();
  
  if (!job) {
    return false; // No jobs available
  }
  
  // Mark as processing
  queueStorage.updateJob(job.id, {
    status: 'processing',
    started_at: Date.now(),
  });
  
  console.log(`⚙️  Processing job ${job.id} for ${job.url}`);
  
  try {
    // Process the job
    const result = await processor(job);
    
    // Mark as completed
    completeJob(job.id, result);
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if we should retry
    if (job.metadata.retry_count < job.metadata.max_retries) {
      console.log(`🔄 Retrying job ${job.id} (attempt ${job.metadata.retry_count + 1}/${job.metadata.max_retries})`);
      
      queueStorage.updateJob(job.id, {
        status: 'pending',
        metadata: {
          ...job.metadata,
          retry_count: job.metadata.retry_count + 1,
        },
      });
      
      // Re-enqueue
      queueStorage.enqueue(job);
    } else {
      // Max retries reached, mark as failed
      failJob(job.id, errorMessage);
    }
    
    return true;
  }
}

/**
 * Start queue worker (for local/background processing)
 */
export function startQueueWorker(
  processor: (job: AuditJob) => Promise<A2AAuditResult>,
  options: {
    concurrency?: number;
    pollInterval?: number;
  } = {}
): () => void {
  const concurrency = options.concurrency || 5;
  const pollInterval = options.pollInterval || 1000;
  
  let active = true;
  const workers: Promise<void>[] = [];
  
  // Start workers
  for (let i = 0; i < concurrency; i++) {
    const workerPromise = (async () => {
      while (active) {
        const processed = await processNextJob(processor);
        
        if (!processed) {
          // No jobs available, wait before polling again
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
    })();
    
    workers.push(workerPromise);
  }
  
  console.log(`🚀 Queue worker started with ${concurrency} concurrent workers`);
  
  // Return stop function
  return () => {
    active = false;
    console.log('🛑 Stopping queue worker...');
  };
}
