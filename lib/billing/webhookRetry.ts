/**
 * Webhook Retry Mechanism
 * Implements exponential backoff for failed webhook processing
 * 
 * Requirements: 9.5
 * Property 25: Webhook retry with exponential backoff
 */

import { supabase } from '../supabase';
import { BillingService } from './BillingService';
import { processWebhookEvent } from './stripe';
import type Stripe from 'stripe';

// Exponential backoff delays: 1s, 2s, 4s, 8s, 16s
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];
const MAX_RETRY_ATTEMPTS = RETRY_DELAYS_MS.length;

// Alert threshold: alert if more than this many webhooks fail repeatedly
const ALERT_THRESHOLD = 5;

export interface WebhookRetryJob {
  id: string;
  event_id: string;
  event_type: string;
  event_data: any;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface RetryResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

export interface AlertInfo {
  failedCount: number;
  threshold: number;
  shouldAlert: boolean;
  recentFailures: WebhookRetryJob[];
}

/**
 * Webhook Retry Service
 * Manages retry queue and exponential backoff for failed webhooks
 */
export class WebhookRetryService {
  private billingService: BillingService;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(billingService?: BillingService) {
    this.billingService = billingService || new BillingService();
  }

  /**
   * Queue a failed webhook for retry
   * Creates a retry job with exponential backoff schedule
   */
  async queueRetry(
    event: Stripe.Event,
    error: Error
  ): Promise<RetryResult> {
    if (!supabase) {
      console.error('Supabase not configured, cannot queue webhook retry');
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Calculate next retry time (1 second from now for first attempt)
      const nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[0]);

      // Insert retry job into database
      const { data, error: insertError } = (await (supabase as any)
        .from('webhook_retry_queue')
        .insert({
          event_id: event.id,
          event_type: event.type,
          event_data: event,
          attempt_count: 0,
          max_attempts: MAX_RETRY_ATTEMPTS,
          next_retry_at: nextRetryAt.toISOString(),
          last_error: error.message,
        })
        .select()
        .single()) as any;

      if (insertError) {
        console.error('Failed to queue webhook retry:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(
        `Queued webhook ${event.id} for retry. Next attempt at ${nextRetryAt.toISOString()}`
      );

      return { success: true, jobId: data.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error queueing webhook retry:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process pending retry jobs
   * Checks for jobs ready to retry and processes them
   */
  async processPendingRetries(): Promise<number> {
    if (!supabase) {
      console.error('Supabase not configured, cannot process retries');
      return 0;
    }

    if (this.isProcessing) {
      console.log('Already processing retries, skipping...');
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      // Get jobs ready for retry
      const { data: jobs, error: fetchError } = (await (supabase as any)
        .from('webhook_retry_queue')
        .select('*')
        .lte('next_retry_at', new Date().toISOString())
        .lt('attempt_count', MAX_RETRY_ATTEMPTS)
        .order('next_retry_at', { ascending: true })
        .limit(10)) as any;

      if (fetchError) {
        console.error('Failed to fetch retry jobs:', fetchError);
        return 0;
      }

      if (!jobs || jobs.length === 0) {
        return 0;
      }

      console.log(`Processing ${jobs.length} webhook retry jobs`);

      // Process each job
      for (const job of jobs) {
        try {
          await this.processRetryJob(job);
          processedCount++;
        } catch (error) {
          console.error(`Failed to process retry job ${job.id}:`, error);
        }
      }

      // Check if we should alert on repeated failures
      await this.checkAndAlert();

      return processedCount;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single retry job
   * Attempts to process the webhook event with exponential backoff
   */
  private async processRetryJob(job: WebhookRetryJob): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const attemptNumber = job.attempt_count;

    try {
      console.log(
        `Attempting webhook retry ${attemptNumber + 1}/${MAX_RETRY_ATTEMPTS} for event ${job.event_id}`
      );

      // Reconstruct Stripe event from stored data
      const event = job.event_data as Stripe.Event;

      // Process the webhook event
      await processWebhookEvent(event, this.billingService);

      // Success! Delete the retry job
      const { error: deleteError } = (await (supabase as any)
        .from('webhook_retry_queue')
        .delete()
        .eq('id', job.id)) as any;

      if (deleteError) {
        console.error(`Failed to delete successful retry job ${job.id}:`, deleteError);
      } else {
        console.log(`Successfully processed webhook ${job.event_id} on retry attempt ${attemptNumber + 1}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Retry attempt ${attemptNumber + 1} failed for webhook ${job.event_id}:`, errorMessage);

      // Update retry job with new attempt count and next retry time
      const newAttemptCount = attemptNumber + 1;

      if (newAttemptCount >= MAX_RETRY_ATTEMPTS) {
        // Max attempts reached, mark as failed
        console.error(
          `Webhook ${job.event_id} failed after ${MAX_RETRY_ATTEMPTS} attempts. Manual intervention required.`
        );

        // Update job to mark as permanently failed
        await (supabase as any)
          .from('webhook_retry_queue')
          .update({
            attempt_count: newAttemptCount,
            last_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      } else {
        // Calculate next retry time with exponential backoff
        const nextDelay = RETRY_DELAYS_MS[newAttemptCount];
        const nextRetryAt = new Date(Date.now() + nextDelay);

        await (supabase as any)
          .from('webhook_retry_queue')
          .update({
            attempt_count: newAttemptCount,
            next_retry_at: nextRetryAt.toISOString(),
            last_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        console.log(
          `Scheduled next retry for webhook ${job.event_id} at ${nextRetryAt.toISOString()} (delay: ${nextDelay}ms)`
        );
      }
    }
  }

  /**
   * Check for repeated failures and trigger alerts
   * Alerts if more than ALERT_THRESHOLD webhooks have failed repeatedly
   */
  async checkAndAlert(): Promise<AlertInfo> {
    if (!supabase) {
      return {
        failedCount: 0,
        threshold: ALERT_THRESHOLD,
        shouldAlert: false,
        recentFailures: [],
      };
    }

    try {
      // Get jobs that have reached max attempts
      const { data: failedJobs, error } = (await (supabase as any)
        .from('webhook_retry_queue')
        .select('*')
        .gte('attempt_count', MAX_RETRY_ATTEMPTS)
        .order('updated_at', { ascending: false })
        .limit(20)) as any;

      if (error) {
        console.error('Failed to check for failed webhooks:', error);
        return {
          failedCount: 0,
          threshold: ALERT_THRESHOLD,
          shouldAlert: false,
          recentFailures: [],
        };
      }

      const failedCount = failedJobs?.length || 0;
      const shouldAlert = failedCount >= ALERT_THRESHOLD;

      if (shouldAlert) {
        console.error(
          `⚠️ ALERT: ${failedCount} webhooks have failed after maximum retry attempts. Manual intervention required.`
        );
        console.error('Failed webhook IDs:', failedJobs?.map((j: any) => j.event_id).join(', '));

        // In production, this would trigger actual alerting (email, Slack, PagerDuty, etc.)
        await this.sendAlert(failedCount, failedJobs || []);
      }

      return {
        failedCount,
        threshold: ALERT_THRESHOLD,
        shouldAlert,
        recentFailures: failedJobs || [],
      };
    } catch (err) {
      console.error('Error checking for alerts:', err);
      return {
        failedCount: 0,
        threshold: ALERT_THRESHOLD,
        shouldAlert: false,
        recentFailures: [],
      };
    }
  }

  /**
   * Send alert for repeated webhook failures
   * In production, this would integrate with alerting systems
   */
  private async sendAlert(failedCount: number, failedJobs: WebhookRetryJob[]): Promise<void> {
    // Log alert details
    console.error('='.repeat(80));
    console.error('WEBHOOK FAILURE ALERT');
    console.error('='.repeat(80));
    console.error(`Failed webhooks: ${failedCount}`);
    console.error(`Threshold: ${ALERT_THRESHOLD}`);
    console.error('Recent failures:');
    
    for (const job of failedJobs.slice(0, 5)) {
      console.error(`  - Event ${job.event_id} (${job.event_type}): ${job.last_error}`);
    }
    
    console.error('='.repeat(80));

    // In production, integrate with:
    // - Email notifications
    // - Slack/Discord webhooks
    // - PagerDuty
    // - Sentry
    // - Custom monitoring dashboards
  }

  /**
   * Start automatic retry processing
   * Polls for pending retries at regular intervals
   */
  startAutoProcessing(intervalMs: number = 5000): void {
    if (this.processingInterval) {
      console.warn('Auto-processing already started');
      return;
    }

    console.log(`Starting webhook retry auto-processing (interval: ${intervalMs}ms)`);

    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingRetries();
      } catch (error) {
        console.error('Error in auto-processing:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop automatic retry processing
   */
  stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Stopped webhook retry auto-processing');
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(): Promise<{
    pending: number;
    failed: number;
    totalInQueue: number;
  }> {
    if (!supabase) {
      return { pending: 0, failed: 0, totalInQueue: 0 };
    }

    try {
      const { count: totalCount } = (await (supabase as any)
        .from('webhook_retry_queue')
        .select('*', { count: 'exact', head: true })) as any;

      const { count: pendingCount } = (await (supabase as any)
        .from('webhook_retry_queue')
        .select('*', { count: 'exact', head: true })
        .lt('attempt_count', MAX_RETRY_ATTEMPTS)) as any;

      const { count: failedCount } = (await (supabase as any)
        .from('webhook_retry_queue')
        .select('*', { count: 'exact', head: true })
        .gte('attempt_count', MAX_RETRY_ATTEMPTS)) as any;

      return {
        pending: pendingCount || 0,
        failed: failedCount || 0,
        totalInQueue: totalCount || 0,
      };
    } catch (error) {
      console.error('Error getting retry stats:', error);
      return { pending: 0, failed: 0, totalInQueue: 0 };
    }
  }

  /**
   * Clean up old completed/failed retry jobs
   * Removes jobs older than the specified age
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    if (!supabase) {
      return 0;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = (await (supabase as any)
        .from('webhook_retry_queue')
        .delete()
        .gte('attempt_count', MAX_RETRY_ATTEMPTS)
        .lt('updated_at', cutoffDate.toISOString())
        .select()) as any;

      if (error) {
        console.error('Failed to cleanup old retry jobs:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old webhook retry jobs`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
      return 0;
    }
  }
}

/**
 * Calculate the delay for a given retry attempt
 * Uses exponential backoff: 1s, 2s, 4s, 8s, 16s
 */
export function calculateRetryDelay(attemptNumber: number): number {
  if (attemptNumber < 0) {
    return RETRY_DELAYS_MS[0];
  }
  
  if (attemptNumber >= RETRY_DELAYS_MS.length) {
    return RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  }
  
  return RETRY_DELAYS_MS[attemptNumber];
}

/**
 * Verify exponential backoff pattern
 * Returns true if delays follow exponential backoff (each delay is 2x previous)
 */
export function verifyExponentialBackoff(delays: number[]): boolean {
  if (delays.length < 2) {
    return true;
  }

  for (let i = 1; i < delays.length; i++) {
    const expectedDelay = delays[i - 1] * 2;
    if (delays[i] !== expectedDelay) {
      return false;
    }
  }

  return true;
}

// Verify our retry delays follow exponential backoff
if (!verifyExponentialBackoff(RETRY_DELAYS_MS)) {
  console.warn('RETRY_DELAYS_MS does not follow exponential backoff pattern!');
}

// Export constants for testing
export { RETRY_DELAYS_MS, MAX_RETRY_ATTEMPTS, ALERT_THRESHOLD };
