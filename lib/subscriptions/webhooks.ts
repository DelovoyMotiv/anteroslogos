/**
 * @file lib/subscriptions/webhooks.ts
 * @description Webhook notification system for subscription events
 * @standards HMAC-SHA256 signatures, retry with exponential backoff
 * @requirements 9.5
 */

import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

// =====================================================
// Environment
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =====================================================
// Types
// =====================================================

export type WebhookEventType =
  | "subscription.created"
  | "subscription.activated"
  | "subscription.cancelled"
  | "payment.verified"
  | "payment.stuck";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface SubscriptionWebhook {
  id: string;
  userId: string;
  webhookUrl: string;
  secretKey: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: WebhookEventType;
  payload: WebhookPayload;
  status: "pending" | "success" | "failed" | "retrying";
  httpStatusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// Webhook Management
// =====================================================

/**
 * Registers a webhook endpoint for a user
 */
export async function registerWebhook(
  userId: string,
  webhookUrl: string,
  events: WebhookEventType[],
  secretKey?: string
): Promise<SubscriptionWebhook> {
  // Generate secret key if not provided
  const secret = secretKey || generateSecretKey();

  const { data, error } = await supabase
    .from("subscription_webhooks")
    .insert({
      user_id: userId,
      webhook_url: webhookUrl,
      secret_key: secret,
      events,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register webhook: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    webhookUrl: data.webhook_url,
    secretKey: data.secret_key,
    events: data.events,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Gets all active webhooks for a user
 */
export async function getUserWebhooks(
  userId: string
): Promise<SubscriptionWebhook[]> {
  const { data, error } = await supabase
    .from("subscription_webhooks")
    .select()
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to fetch webhooks: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    webhookUrl: row.webhook_url,
    secretKey: row.secret_key,
    events: row.events,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Deletes a webhook
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  const { error } = await supabase
    .from("subscription_webhooks")
    .delete()
    .eq("id", webhookId);

  if (error) {
    throw new Error(`Failed to delete webhook: ${error.message}`);
  }
}

/**
 * Updates webhook configuration
 */
export async function updateWebhook(
  webhookId: string,
  updates: {
    webhookUrl?: string;
    events?: WebhookEventType[];
    isActive?: boolean;
  }
): Promise<SubscriptionWebhook> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.webhookUrl) {
    dbUpdates.webhook_url = updates.webhookUrl;
  }

  if (updates.events) {
    dbUpdates.events = updates.events;
  }

  if (updates.isActive !== undefined) {
    dbUpdates.is_active = updates.isActive;
  }

  const { data, error } = await supabase
    .from("subscription_webhooks")
    .update(dbUpdates)
    .eq("id", webhookId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update webhook: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    webhookUrl: data.webhook_url,
    secretKey: data.secret_key,
    events: data.events,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// =====================================================
// Webhook Dispatch
// =====================================================

/**
 * Generates HMAC-SHA256 signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Generates a random secret key for webhook signing
 */
function generateSecretKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Dispatches webhook notification to a single endpoint
 */
async function dispatchWebhook(
  webhookUrl: string,
  secretKey: string,
  payload: WebhookPayload
): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
}> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, secretKey);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": payload.event,
        "X-Webhook-Timestamp": payload.timestamp,
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseBody = await response.text();

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit response body size
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Creates a webhook delivery record
 */
async function createWebhookDelivery(
  webhookId: string,
  eventType: WebhookEventType,
  payload: WebhookPayload
): Promise<string> {
  const { data, error } = await supabase
    .from("subscription_webhook_deliveries")
    .insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload,
      status: "pending",
      attempt_count: 0,
      max_attempts: 3,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create webhook delivery: ${error.message}`);
  }

  return data.id;
}

/**
 * Updates webhook delivery status
 */
async function updateWebhookDeliveryStatus(
  deliveryId: string,
  status: "success" | "failed",
  httpStatusCode?: number,
  responseBody?: string,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase.rpc("update_webhook_delivery_status", {
    p_delivery_id: deliveryId,
    p_status: status,
    p_http_status_code: httpStatusCode || null,
    p_response_body: responseBody || null,
    p_error_message: errorMessage || null,
  });

  if (error) {
    throw new Error(`Failed to update webhook delivery: ${error.message}`);
  }
}

/**
 * Dispatches webhook event to all subscribed endpoints
 */
export async function dispatchWebhookEvent(
  userId: string,
  eventType: WebhookEventType,
  eventData: Record<string, unknown>
): Promise<void> {
  // Get all active webhooks for user that are subscribed to this event
  const webhooks = await getUserWebhooks(userId);
  const subscribedWebhooks = webhooks.filter((w) =>
    w.events.includes(eventType)
  );

  if (subscribedWebhooks.length === 0) {
    console.log(
      `[Webhooks] No webhooks subscribed to ${eventType} for user ${userId}`
    );
    return;
  }

  const payload: WebhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: eventData,
  };

  console.log(
    `[Webhooks] Dispatching ${eventType} to ${subscribedWebhooks.length} webhook(s)`
  );

  // Dispatch to all webhooks in parallel
  await Promise.all(
    subscribedWebhooks.map(async (webhook) => {
      try {
        // Create delivery record
        const deliveryId = await createWebhookDelivery(
          webhook.id,
          eventType,
          payload
        );

        // Dispatch webhook
        const result = await dispatchWebhook(
          webhook.webhookUrl,
          webhook.secretKey,
          payload
        );

        // Update delivery status
        if (result.success) {
          await updateWebhookDeliveryStatus(
            deliveryId,
            "success",
            result.statusCode,
            result.responseBody
          );
          console.log(
            `[Webhooks] Successfully delivered ${eventType} to ${webhook.webhookUrl}`
          );
        } else {
          await updateWebhookDeliveryStatus(
            deliveryId,
            "failed",
            result.statusCode,
            result.responseBody,
            result.error
          );
          console.error(
            `[Webhooks] Failed to deliver ${eventType} to ${webhook.webhookUrl}:`,
            result.error
          );
        }
      } catch (error) {
        console.error(
          `[Webhooks] Error dispatching webhook to ${webhook.webhookUrl}:`,
          error
        );
      }
    })
  );
}

/**
 * Retries failed webhook deliveries
 * Should be called periodically by a cron job
 */
export async function retryFailedWebhooks(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const { data, error } = await supabase.rpc("get_pending_webhook_deliveries");

  if (error) {
    throw new Error(`Failed to fetch pending webhooks: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[Webhooks] Retrying ${data.length} failed webhook(s)`);

  let succeeded = 0;
  let failed = 0;

  await Promise.all(
    data.map(async (delivery: any) => {
      try {
        const payload: WebhookPayload = delivery.payload;

        const result = await dispatchWebhook(
          delivery.webhook_url,
          delivery.secret_key,
          payload
        );

        if (result.success) {
          await updateWebhookDeliveryStatus(
            delivery.id,
            "success",
            result.statusCode,
            result.responseBody
          );
          succeeded++;
        } else {
          await updateWebhookDeliveryStatus(
            delivery.id,
            "failed",
            result.statusCode,
            result.responseBody,
            result.error
          );
          failed++;
        }
      } catch (error) {
        console.error(
          `[Webhooks] Error retrying webhook delivery ${delivery.id}:`,
          error
        );
        failed++;
      }
    })
  );

  return {
    processed: data.length,
    succeeded,
    failed,
  };
}

/**
 * Verifies webhook signature
 * Used by webhook receivers to validate authenticity
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return signature === expectedSignature;
}

