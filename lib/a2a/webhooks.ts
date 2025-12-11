/**
 * @file lib/a2a/webhooks.ts
 * @description Webhook Callback System
 * 
 * Features:
 * - HMAC-SHA256 signatures for security
 * - Exponential backoff retry logic
 * - Delivery status tracking
 * - Failed webhook retry via CRON
 * 
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import type { AuditJob } from './queue';
import type { JSONValue } from '../../types/common.types';
import { toJSONValue } from '../utils/typeGuards';

// =====================================================
// TYPES
// =====================================================

export interface WebhookConfig {
  url: string;
  secret?: string; // HMAC signature secret
  headers?: Record<string, string>;
  maxAttempts?: number; // Default 3
}

export interface WebhookPayload {
  event: 'job.completed' | 'job.failed' | 'batch.completed';
  timestamp: number;
  job: {
    id: string;
    url: string;
    status: string;
    result?: JSONValue;
    error?: string;
    progress: number;
    created_at: number;
    completed_at?: number;
  };
}

// =====================================================
// WEBHOOK DELIVERY
// =====================================================

/**
 * Send webhook notification for job completion
 */
export async function sendWebhook(
  job: AuditJob,
  config: WebhookConfig,
  supabase: SupabaseClient
): Promise<boolean> {
  const payload: WebhookPayload = {
    event: job.status === 'completed' ? 'job.completed' : 'job.failed',
    timestamp: Date.now(),
    job: {
      id: job.id,
      url: job.url,
      status: job.status,
      result: job.result ? toJSONValue(job.result) : undefined,
      error: job.error,
      progress: job.progress,
      created_at: job.created_at,
      completed_at: job.completed_at,
    },
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Anoteros-Logos-Webhook/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': String(payload.timestamp),
    ...config.headers,
  };

  // Add HMAC signature if secret provided
  if (config.secret) {
    const signature = createHmac('sha256', config.secret)
      .update(body)
      .digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  try {
    console.log(`[Webhook] Sending to ${config.url} for job ${job.id}`);

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    const responseBody = await response.text().catch(() => '');

    // Log delivery to database
    await logWebhookDelivery(supabase, job.id, config.url, {
      status: response.ok ? 'delivered' : 'failed',
      response_code: response.status,
      response_body: responseBody.substring(0, 1000), // Limit to 1KB
    });

    if (response.ok) {
      console.log(`[Webhook] ✅ Delivered to ${config.url} (${response.status})`);
      return true;
    } else {
      console.warn(`[Webhook] ⚠️  Failed: ${response.status} ${responseBody.substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Webhook] ❌ Error sending to ${config.url}:`, errorMessage);

    // Log failed attempt
    await logWebhookDelivery(supabase, job.id, config.url, {
      status: 'failed',
      error: errorMessage,
    });

    return false;
  }
}

/**
 * Log webhook delivery attempt to database
 */
async function logWebhookDelivery(
  supabase: SupabaseClient,
  jobId: string,
  webhookUrl: string,
  result: {
    status: 'delivered' | 'failed';
    response_code?: number;
    response_body?: string;
    error?: string;
  }
): Promise<void> {
  try {
    // Find webhook record
    const { data: webhooks } = await supabase
      .from('job_webhooks')
      .select('id, attempts')
      .eq('job_id', jobId)
      .eq('webhook_url', webhookUrl);

    if (!webhooks || webhooks.length === 0) {
      return; // No webhook configured
    }

    const webhook = webhooks[0];
    const attempts = webhook.attempts + 1;

    // Calculate next retry time (exponential backoff)
    const nextRetryAt = result.status === 'failed'
      ? calculateNextRetry(attempts)
      : null;

    // Update webhook record
    await supabase
      .from('job_webhooks')
      .update({
        status: result.status,
        response_code: result.response_code,
        response_body: result.response_body || result.error,
        attempts,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
      })
      .eq('id', webhook.id);
  } catch (error) {
    console.error('[Webhook] Failed to log delivery:', error);
  }
}

/**
 * Calculate next retry timestamp with exponential backoff
 * Backoff: 1min, 5min, 15min
 */
function calculateNextRetry(attempts: number): string {
  const delays = [60, 300, 900]; // seconds
  const delay = delays[Math.min(attempts - 1, delays.length - 1)];
  const nextRetry = new Date(Date.now() + delay * 1000);
  return nextRetry.toISOString();
}

// =====================================================
// RETRY FAILED WEBHOOKS
// =====================================================

/**
 * Retry failed webhooks (called by CRON)
 * Returns number of webhooks retried
 */
export async function retryFailedWebhooks(supabase: SupabaseClient): Promise<number> {
  try {
    // Find pending webhooks that are due for retry
    const { data: webhooks, error } = await supabase
      .from('job_webhooks')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .lt('attempts', 'max_attempts');

    if (error) {
      console.error('[Webhook] Failed to query pending webhooks:', error);
      return 0;
    }

    if (!webhooks || webhooks.length === 0) {
      return 0; // No webhooks to retry
    }

    console.log(`[Webhook] Retrying ${webhooks.length} failed webhooks`);

    let retried = 0;

    for (const webhook of webhooks) {
      // Get job data
      const { data: job } = await supabase
        .from('audit_jobs')
        .select('*')
        .eq('id', webhook.job_id)
        .single();

      if (!job) {
        console.warn(`[Webhook] Job ${webhook.job_id} not found`);
        continue;
      }

      // Map database row to AuditJob
      const auditJob: AuditJob = {
        id: job.id,
        url: job.url,
        priority: job.priority,
        status: job.status,
        depth: job.depth,
        created_at: new Date(job.created_at).getTime(),
        started_at: job.started_at ? new Date(job.started_at).getTime() : undefined,
        completed_at: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
        progress: job.progress,
        result: job.result,
        error: job.error,
        metadata: job.metadata,
      };

      // Retry webhook
      const success = await sendWebhook(
        auditJob,
        {
          url: webhook.webhook_url,
          secret: webhook.secret,
          maxAttempts: webhook.max_attempts,
        },
        supabase
      );

      if (success) {
        retried++;
      }
    }

    console.log(`[Webhook] Retried ${retried}/${webhooks.length} webhooks successfully`);

    return retried;
  } catch (error) {
    console.error('[Webhook] Retry process failed:', error);
    return 0;
  }
}

// =====================================================
// WEBHOOK REGISTRATION
// =====================================================

/**
 * Register webhook for job completion
 */
export async function registerWebhook(
  supabase: SupabaseClient,
  jobId: string,
  tenantId: string,
  config: WebhookConfig
): Promise<string> {
  const { data, error } = await supabase
    .from('job_webhooks')
    .insert({
      job_id: jobId,
      tenant_id: tenantId,
      webhook_url: config.url,
      secret: config.secret,
      status: 'pending',
      max_attempts: config.maxAttempts || 3,
      next_retry_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to register webhook: ${error.message}`);
  }

  console.log(`[Webhook] Registered webhook for job ${jobId}`);

  return data.id;
}

/**
 * Verify webhook signature (for webhook receivers)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Extract hash from "sha256=..." format
  const providedHash = signature.replace('sha256=', '');

  // Calculate expected hash
  const expectedHash = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return providedHash === expectedHash;
}
