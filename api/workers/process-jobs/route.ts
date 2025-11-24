/**
 * @file api/workers/process-jobs/route.ts
 * @description Vercel CRON Worker - Background Job Processing
 * 
 * Processes queued audit jobs asynchronously:
 * - Runs every 1 minute via Vercel CRON
 * - Processes up to 5 jobs per run
 * - Protected by CRON_SECRET
 * - Uses PersistentQueueStorage
 * 
 * @endpoint GET /api/workers/process-jobs
 * @auth Bearer CRON_SECRET (Vercel CRON only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PersistentQueueStorage } from '../../../lib/a2a/persistentQueue';
import { performGeoAudit } from '../../../utils/geoAuditEnhanced';
import type { A2AAuditResult } from '../../../lib/a2a/protocol';

// =====================================================
// CONFIGURATION
// =====================================================

const MAX_JOBS_PER_RUN = 5; // Process 5 jobs per CRON invocation
const JOB_TIMEOUT_MS = 120000; // 2 minutes max per job

// =====================================================
// CRON WORKER ENDPOINT
// =====================================================

/**
 * GET /api/workers/process-jobs
 * Vercel CRON endpoint - processes pending jobs
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // =====================================================
  // 1. AUTHENTICATION
  // =====================================================

  // Verify CRON secret (Vercel CRON includes Authorization header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Worker] CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Worker] Unauthorized CRON attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // =====================================================
  // 2. INITIALIZE QUEUE
  // =====================================================

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Worker] Supabase credentials missing');
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  const queueStorage = new PersistentQueueStorage(supabaseUrl, supabaseServiceKey);

  // =====================================================
  // 3. PROCESS JOBS
  // =====================================================

  let processed = 0;
  let failed = 0;
  const results: Array<{ jobId: string; status: 'completed' | 'failed'; error?: string }> = [];

  console.log(`[Worker] Starting job processing (max ${MAX_JOBS_PER_RUN} jobs)`);

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    // Check if we're approaching Vercel function timeout (10 min default, use 9 min buffer)
    const elapsed = Date.now() - startTime;
    if (elapsed > 9 * 60 * 1000) {
      console.warn('[Worker] Approaching Vercel timeout, stopping processing');
      break;
    }

    // Dequeue next job
    const job = await queueStorage.dequeue();

    if (!job) {
      console.log('[Worker] No more pending jobs');
      break; // Queue empty
    }

    console.log(`[Worker] Processing job ${job.id} (${job.url}, depth: ${job.depth})`);

    try {
      // Run audit with timeout
      const result = await Promise.race([
        performGeoAudit(job.url, { depth: job.depth }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Job timeout')), JOB_TIMEOUT_MS)
        ),
      ]);

      // Mark as completed
      await queueStorage.updateJob(job.id, {
        status: 'completed',
        completed_at: Date.now(),
        progress: 100,
        result: result as A2AAuditResult,
      });

      results.push({
        jobId: job.id,
        status: 'completed',
      });

      processed++;
      console.log(`[Worker] ✅ Job ${job.id} completed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (job.metadata.retry_count < job.metadata.max_retries) {
        console.log(
          `[Worker] Retrying job ${job.id} (attempt ${job.metadata.retry_count + 1}/${job.metadata.max_retries})`
        );

        await queueStorage.updateJob(job.id, {
          status: 'pending', // Re-queue
          metadata: {
            ...job.metadata,
            retry_count: job.metadata.retry_count + 1,
          },
        });
      } else {
        // Max retries reached, mark as failed
        await queueStorage.updateJob(job.id, {
          status: 'failed',
          completed_at: Date.now(),
          error: errorMessage,
        });

        results.push({
          jobId: job.id,
          status: 'failed',
          error: errorMessage,
        });

        failed++;
        console.error(`[Worker] ❌ Job ${job.id} failed: ${errorMessage}`);
      }
    }
  }

  // =====================================================
  // 4. GET QUEUE STATISTICS
  // =====================================================

  const stats = await queueStorage.getStats();

  // =====================================================
  // 5. RESPONSE
  // =====================================================

  const duration = Date.now() - startTime;

  console.log(
    `[Worker] Completed: ${processed} jobs processed, ${failed} failed (${duration}ms)`
  );

  return NextResponse.json({
    success: true,
    processed,
    failed,
    duration_ms: duration,
    results,
    queue_stats: stats,
    timestamp: new Date().toISOString(),
  });
}

// =====================================================
// POST METHOD (for manual triggering in development)
// =====================================================

/**
 * POST /api/workers/process-jobs
 * Manual trigger (requires API key in development)
 */
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Manual triggering disabled in production' },
      { status: 403 }
    );
  }

  // Reuse GET handler logic
  return GET(req);
}
