/**
 * @file lib/subscriptions/manager.ts
 * @description Business logic layer for subscription management
 * @standards Atomic operations, quota enforcement, payment verification
 */

import { createClient } from "@supabase/supabase-js";
import { verifyTransaction } from "../payments/chainWatcher";
import {
  type PlanTier,
  type UserSubscription,
  type SubscriptionInvoice,
  type QuotaCheckResult,
  type SubscribeResponse,
  type SubscriptionStatusResponse,
} from "./types";
import * as storage from "./storage";
import { getRedisCache, CacheKeys, CacheTTL } from "../database/redisCache";
import { dispatchWebhookEvent } from "./webhooks";
import { 
  captureError, 
  addBreadcrumb,
  setSubscriptionContext,
  clearSubscriptionContext,
  addPaymentBreadcrumb,
  captureSubscriptionError,
} from "../error-tracking";
import { setTag } from "../error-tracking/sentry";

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
// Subscribe to Plan
// =====================================================

/**
 * Initiates subscription to a plan
 * Creates subscription record + generates first invoice
 * Returns invoice with payment instructions
 */
export async function subscribeToPlan(
  userId: string,
  planTier: PlanTier,
  billingWalletAddress?: string
): Promise<SubscribeResponse> {
  // Set subscription context for error tracking
  setSubscriptionContext(userId);

  // Add breadcrumb for tracking
  addBreadcrumb({
    type: 'default',
    category: 'subscription',
    message: 'User initiating subscription',
    level: 'info',
    data: {
      userId,
      planTier,
      hasWalletAddress: !!billingWalletAddress,
    },
  });

  // Set context tags
  setTag('operation', 'subscribe_to_plan');
  setTag('plan_tier', planTier);

  try {
    // Prevent explicit subscription to FREE plan (auto-activated on registration)
    if (planTier === "free") {
      throw new Error(
        "Cannot subscribe to FREE plan explicitly. FREE plan is automatically activated upon registration."
      );
    }

    // Check for existing active subscription
    const existingSubscription = await storage.getUserSubscription(userId);
    if (existingSubscription) {
      // Get current plan details
      const currentPlan = await storage.getPlanById(existingSubscription.planId);
      
      // Allow upgrades from FREE plan (cancel FREE, create new)
      if (currentPlan?.planName === "free") {
        // Cancel FREE subscription
        await storage.updateSubscriptionStatus(existingSubscription.id, "cancelled", {
          cancelledAt: new Date(),
        });
        
        addBreadcrumb({
          type: 'default',
          category: 'subscription',
          message: 'Cancelled FREE plan for upgrade',
          level: 'info',
          data: { subscriptionId: existingSubscription.id },
        });
      } else {
        const error = new Error(
          `User already has active ${currentPlan?.planName || "unknown"} subscription. Cancel existing subscription before subscribing to new plan.`
        );
        captureSubscriptionError(
          error,
          userId,
          existingSubscription.id,
          undefined,
          {
            operation: 'subscribe_to_plan',
            planTier,
            existingPlan: currentPlan?.planName || 'unknown',
          }
        );
        throw error;
      }
    }

    // Get plan details
    const plan = await storage.getPlanByName(planTier);
    if (!plan) {
      const error = new Error(`Plan ${planTier} not found or inactive`);
      captureSubscriptionError(
        error,
        userId,
        undefined,
        undefined,
        {
          operation: 'subscribe_to_plan',
          planTier,
        }
      );
      throw error;
    }

  // Create subscription record with pending_payment status
  const subscription = await storage.createSubscription({
    userId,
    planId: plan.id,
    billingWalletAddress,
  });

  // Calculate first billing period
  const now = new Date();
  const periodStart = now;
  const periodEnd = new Date(
    now.getTime() + plan.billingCycleDays * 24 * 60 * 60 * 1000
  );

  // Generate invoice for first period
  const invoice = await storage.createSubscriptionInvoice({
    subscriptionId: subscription.id,
    userId,
    amount: plan.priceUsd,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
  });

    // Dispatch webhook notification (fire and forget)
    dispatchWebhookEvent(userId, "subscription.created", {
      subscriptionId: subscription.id,
      planTier: planTier,
      planName: plan.displayName,
      amount: plan.priceUsd,
      invoiceId: invoice.invoiceId,
      billingPeriodStart: periodStart.toISOString(),
      billingPeriodEnd: periodEnd.toISOString(),
    }).catch((error) => {
      console.error("[SubscriptionManager] Failed to dispatch webhook:", error);
      captureSubscriptionError(
        error,
        userId,
        subscription.id,
        invoice.invoiceId,
        {
          operation: 'webhook_dispatch',
          event: 'subscription.created',
        }
      );
    });

    addBreadcrumb({
      type: 'default',
      category: 'subscription',
      message: 'Subscription created successfully',
      level: 'info',
      data: {
        subscriptionId: subscription.id,
        invoiceId: invoice.invoiceId,
      },
    });

    // Clear subscription context
    clearSubscriptionContext();

    return {
      subscription,
      invoice,
      paymentInstructions: {
        amount: invoice.amount,
        token: "USDC",
        recipientAddress: invoice.recipientAddress,
        memoHash: invoice.memoHash,
        chainId: 8453,
        expiresAt: invoice.expiresAt,
      },
    };
  } catch (error) {
    // Clear subscription context on error
    clearSubscriptionContext();
    
    // Error already captured in specific cases above
    // Only capture if not already captured
    if (error instanceof Error && !error.message.includes('already has active')) {
      captureSubscriptionError(
        error,
        userId,
        undefined,
        undefined,
        {
          operation: 'subscribe_to_plan',
          planTier,
        }
      );
    }
    throw error;
  }
}

// =====================================================
// Activate Subscription
// =====================================================

/**
 * Activates subscription after payment verification
 * Verifies on-chain transaction, updates invoice, activates subscription
 * Includes retry logic with exponential backoff for blockchain verification
 */
export async function activateSubscription(
  invoiceId: string,
  txHash: string
): Promise<{
  subscription: UserSubscription;
  invoice: SubscriptionInvoice;
  verified: boolean;
}> {
  // Get invoice first to set context
  const invoice = await storage.getSubscriptionInvoice(invoiceId);
  if (!invoice) {
    const error = new Error(`Invoice ${invoiceId} not found`);
    captureError(error, {
      tags: {
        invoice_id: invoiceId,
        tx_hash: txHash,
      },
    });
    throw error;
  }

  // Set subscription context for error tracking
  setSubscriptionContext(invoice.userId, invoice.subscriptionId, invoiceId);

  // Add payment verification breadcrumb
  addPaymentBreadcrumb('verification_started', {
    invoiceId,
    txHash,
  });

  // Set context tags
  setTag('operation', 'activate_subscription');
  setTag('invoice_id', invoiceId);

  try {
    addPaymentBreadcrumb('invoice_retrieved', {
      invoiceStatus: invoice.status,
      amount: invoice.amount,
    });

    // Check invoice not already paid
    if (invoice.status === "paid") {
      const subscription = await storage.getSubscriptionById(
        invoice.subscriptionId
      );
      if (!subscription) {
        throw new Error("Subscription not found for paid invoice");
      }
      
      addPaymentBreadcrumb('verification_complete', {
        alreadyPaid: true,
        subscriptionId: subscription.id,
      });
      
      // Clear context
      clearSubscriptionContext();
      
      return {
        subscription,
        invoice,
        verified: true,
      };
    }

    // Check invoice not expired
    if (invoice.expiresAt < new Date()) {
      const error = new Error(`Invoice ${invoiceId} has expired`);
      captureSubscriptionError(
        error,
        invoice.userId,
        invoice.subscriptionId,
        invoiceId,
        {
          operation: 'activate_subscription',
          expiresAt: invoice.expiresAt.toISOString(),
          now: new Date().toISOString(),
        }
      );
      addPaymentBreadcrumb('verification_failed', {
        reason: 'invoice_expired',
      });
      clearSubscriptionContext();
      throw error;
    }

    // Verify transaction on-chain with retry logic
    // The verifyTransaction function already uses executeRpcCall which includes:
    // - Exponential backoff retry (up to 5 attempts)
    // - Circuit breaker pattern
    // - Automatic fallback to alternative RPC endpoints
    let verification;
    try {
      addPaymentBreadcrumb('blockchain_check', {
        txHash,
      });

      console.log(`[SubscriptionManager] Verifying transaction ${txHash} for invoice ${invoiceId}`);
      verification = await verifyTransaction(txHash, invoiceId);
      console.log(`[SubscriptionManager] Transaction verification result:`, {
        verified: verification.verified,
        reason: verification.reason,
        confirmations: verification.confirmations,
      });

      addPaymentBreadcrumb('transaction_verified', {
        verified: verification.verified,
        confirmations: verification.confirmations,
      });
    } catch (error) {
      console.error(`[SubscriptionManager] Transaction verification failed after all retries:`, {
        invoiceId,
        txHash,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      captureSubscriptionError(
        error,
        invoice.userId,
        invoice.subscriptionId,
        invoiceId,
        {
          operation: 'blockchain_verification',
          amount: invoice.amount,
          // Don't log full recipient address
        }
      );
      
      addPaymentBreadcrumb('verification_failed', {
        reason: 'blockchain_error',
      });
      
      clearSubscriptionContext();
      throw error;
    }

    if (!verification.verified) {
      const error = new Error(
        `Payment verification failed: ${verification.reason || "Unknown error"}`
      );
      
      captureSubscriptionError(
        error,
        invoice.userId,
        invoice.subscriptionId,
        invoiceId,
        {
          operation: 'payment_verification',
          verificationReason: verification.reason || 'unknown',
          confirmations: verification.confirmations,
          blockNumber: verification.blockNumber?.toString() || null,
        }
      );
      
      addPaymentBreadcrumb('verification_failed', {
        reason: verification.reason || 'unknown',
        confirmations: verification.confirmations,
      });
      
      clearSubscriptionContext();
      throw error;
    }

  // Update invoice to paid
  const updatedInvoice = await storage.updateSubscriptionInvoice(invoiceId, {
    status: "paid",
    txHash,
    blockNumber: verification.blockNumber,
    confirmations: verification.confirmations,
    paidAt: new Date(),
  });

  // Get subscription
  const subscription = await storage.getSubscriptionById(
    invoice.subscriptionId
  );
  if (!subscription) {
    throw new Error(`Subscription ${invoice.subscriptionId} not found`);
  }

  // Activate subscription
  const activatedSubscription = await storage.updateSubscriptionStatus(
    subscription.id,
    "active",
    {
      currentPeriodStart: invoice.billingPeriodStart,
      currentPeriodEnd: invoice.billingPeriodEnd,
    }
  );

    console.log(`[SubscriptionManager] Subscription activated successfully:`, {
      subscriptionId: activatedSubscription.id,
      userId: activatedSubscription.userId,
      invoiceId,
    });

    addPaymentBreadcrumb('subscription_activated', {
      subscriptionId: activatedSubscription.id,
    });

    // Dispatch webhook notifications (fire and forget)
    Promise.all([
      dispatchWebhookEvent(activatedSubscription.userId, "subscription.activated", {
        subscriptionId: activatedSubscription.id,
        invoiceId: updatedInvoice.invoiceId,
        currentPeriodStart: activatedSubscription.currentPeriodStart?.toISOString(),
        currentPeriodEnd: activatedSubscription.currentPeriodEnd?.toISOString(),
      }),
      dispatchWebhookEvent(activatedSubscription.userId, "payment.verified", {
        invoiceId: updatedInvoice.invoiceId,
        subscriptionId: activatedSubscription.id,
        amount: updatedInvoice.amount,
        txHash: updatedInvoice.txHash,
        blockNumber: updatedInvoice.blockNumber?.toString(),
        confirmations: updatedInvoice.confirmations,
      }),
    ]).catch((error) => {
      console.error("[SubscriptionManager] Failed to dispatch webhooks:", error);
      captureSubscriptionError(
        error,
        activatedSubscription.userId,
        activatedSubscription.id,
        invoiceId,
        {
          operation: 'webhook_dispatch',
          events: ['subscription.activated', 'payment.verified'],
        }
      );
    });

    addPaymentBreadcrumb('verification_complete', {
      success: true,
    });

    // Clear subscription context
    clearSubscriptionContext();

    return {
      subscription: activatedSubscription,
      invoice: updatedInvoice,
      verified: true,
    };
  } catch (error) {
    // Clear subscription context on error
    clearSubscriptionContext();
    
    // Error already captured in specific cases above
    // Only capture if not already captured
    if (error instanceof Error && 
        !error.message.includes('not found') && 
        !error.message.includes('expired') &&
        !error.message.includes('verification failed')) {
      captureSubscriptionError(
        error,
        invoice.userId,
        invoice.subscriptionId,
        invoiceId,
        {
          operation: 'activate_subscription',
        }
      );
    }
    throw error;
  }
}

// =====================================================
// Quota Management
// =====================================================

/**
 * Checks if user has available quota
 * Uses database function for atomic operation
 */
export async function checkQuota(
  userId: string,
  requiredUnits: number = 1
): Promise<QuotaCheckResult> {
  try {
    const { data, error } = await supabase.rpc("check_subscription_quota", {
      p_user_id: userId,
      p_required_units: requiredUnits,
    });

    if (error) {
      const err = new Error(`Failed to check quota: ${error.message}`);
      captureError(err, {
        tags: {
          user_id: userId,
          operation: 'check_quota',
        },
        extra: {
          requiredUnits,
          errorCode: error.code,
        },
      });
      throw err;
    }

    if (!data || data.length === 0) {
      return {
        available: false,
        remaining: 0,
      };
    }

    const result = data[0];
    return {
      available: result.available,
      remaining: result.remaining,
      subscriptionId: result.subscription_id || undefined,
    };
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Failed to check quota')) {
      captureError(error, {
        tags: {
          user_id: userId,
          operation: 'check_quota',
        },
      });
    }
    throw error;
  }
}

/**
 * Consumes quota units atomically
 * Records usage log entry
 */
export async function consumeQuota(
  userId: string,
  auditId?: string,
  metadata?: Record<string, unknown>
): Promise<number> {
  try {
    // Get active subscription
    const subscription = await storage.getUserSubscription(userId);
    if (!subscription) {
      const error = new Error("No active subscription found for user");
      captureError(error, {
        tags: {
          user_id: userId,
          operation: 'consume_quota',
        },
        extra: {
          auditId: auditId || null,
        },
      });
      throw error;
    }

    // Call database function for atomic quota consumption
    const { data, error } = await supabase.rpc("consume_subscription_quota", {
      p_subscription_id: subscription.id,
      p_units: 1,
      p_audit_id: auditId || null,
      p_event_type: "audit_completed",
      p_metadata: metadata || {},
    });

    if (error) {
      const err = new Error(`Failed to consume quota: ${error.message}`);
      captureError(err, {
        tags: {
          user_id: userId,
          subscription_id: subscription.id,
          operation: 'consume_quota',
        },
        extra: {
          auditId: auditId || null,
          errorCode: error.code || null,
          errorDetails: error.details || null,
        },
      });
      throw err;
    }

    return data as number;
  } catch (error) {
    if (error instanceof Error && 
        !error.message.includes('No active subscription') &&
        !error.message.includes('Failed to consume quota')) {
      captureError(error, {
        tags: {
          user_id: userId,
          operation: 'consume_quota',
        },
      });
    }
    throw error;
  }
}

// =====================================================
// Subscription Status
// =====================================================

/**
 * Gets complete subscription status for user
 * Includes subscription, plan, usage stats, pending invoices
 * Implements cache-aside pattern with 60s TTL
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatusResponse> {
  const cache = getRedisCache();
  const cacheKey = CacheKeys.subscription(userId);

  // Try to get from cache first
  const cached = await cache.get<SubscriptionStatusResponse>(cacheKey);
  if (cached) {
    // Deserialize dates
    return {
      ...cached,
      currentPeriod: {
        start: cached.currentPeriod.start ? new Date(cached.currentPeriod.start) : null,
        end: cached.currentPeriod.end ? new Date(cached.currentPeriod.end) : null,
      },
      subscription: cached.subscription ? {
        ...cached.subscription,
        createdAt: new Date(cached.subscription.createdAt),
        updatedAt: new Date(cached.subscription.updatedAt),
        currentPeriodStart: cached.subscription.currentPeriodStart 
          ? new Date(cached.subscription.currentPeriodStart) 
          : undefined,
        currentPeriodEnd: cached.subscription.currentPeriodEnd 
          ? new Date(cached.subscription.currentPeriodEnd) 
          : undefined,
        cancelledAt: cached.subscription.cancelledAt 
          ? new Date(cached.subscription.cancelledAt) 
          : undefined,
      } : null,
      plan: cached.plan ? {
        ...cached.plan,
        createdAt: new Date(cached.plan.createdAt),
        updatedAt: new Date(cached.plan.updatedAt),
      } : null,
      pendingInvoices: cached.pendingInvoices.map(inv => ({
        ...inv,
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
        billingPeriodStart: new Date(inv.billingPeriodStart),
        billingPeriodEnd: new Date(inv.billingPeriodEnd),
        expiresAt: new Date(inv.expiresAt),
        paidAt: inv.paidAt ? new Date(inv.paidAt) : undefined,
        blockNumber: inv.blockNumber ? BigInt(inv.blockNumber as any) : undefined,
      })),
    };
  }

  // Cache miss - fetch from database
  const subscription = await storage.getUserSubscription(userId);

  if (!subscription) {
    const emptyResponse = {
      subscription: null,
      plan: null,
      usage: {
        quota: 0,
        used: 0,
        remaining: 0,
      },
      currentPeriod: {
        start: null,
        end: null,
      },
      pendingInvoices: [],
    };
    
    // Cache empty response with shorter TTL (10s)
    await cache.set(cacheKey, emptyResponse, { ttl: 10 });
    
    return emptyResponse;
  }

  // Get plan details
  const plan = await storage.getPlanById(subscription.planId);
  if (!plan) {
    throw new Error(`Plan ${subscription.planId} not found`);
  }

  // Get usage statistics via database function
  const { data: activeSubData, error: activeSubError } = await supabase.rpc(
    "get_active_subscription",
    {
      p_user_id: userId,
    }
  );

  if (activeSubError) {
    throw new Error(`Failed to get subscription status: ${activeSubError.message}`);
  }

  const usageData =
    activeSubData && activeSubData.length > 0 ? activeSubData[0] : null;
  const usageCount = usageData?.usage_count || 0;
  const quotaRemaining = usageData?.quota_remaining || plan.auditQuota;

  // Get pending invoices
  const allInvoices = await storage.getSubscriptionInvoices(subscription.id);
  const pendingInvoices = allInvoices.filter(
    (inv) => inv.status === "pending" && inv.expiresAt > new Date()
  );

  const response: SubscriptionStatusResponse = {
    subscription,
    plan,
    usage: {
      quota: plan.auditQuota,
      used: Number(usageCount),
      remaining: quotaRemaining,
    },
    currentPeriod: {
      start: subscription.currentPeriodStart || null,
      end: subscription.currentPeriodEnd || null,
    },
    pendingInvoices,
  };

  // Store in cache with 60s TTL
  await cache.set(cacheKey, response, { ttl: CacheTTL.SHORT });

  return response;
}

// =====================================================
// Cancellation
// =====================================================

/**
 * Cancels subscription
 * @param immediate - If true, cancels immediately. If false, cancels at period end.
 */
export async function cancelSubscription(
  userId: string,
  immediate: boolean = false
): Promise<UserSubscription> {
  // Get active subscription
  const subscription = await storage.getUserSubscription(userId);
  if (!subscription) {
    throw new Error("No active subscription found for user");
  }

  let updatedSubscription: UserSubscription;

  if (immediate) {
    // Cancel immediately
    updatedSubscription = await storage.updateSubscriptionStatus(subscription.id, "cancelled", {
      cancelledAt: new Date(),
      cancelAtPeriodEnd: false,
    });
  } else {
    // Cancel at period end
    updatedSubscription = await storage.updateSubscriptionStatus(subscription.id, "active", {
      cancelAtPeriodEnd: true,
    });
  }

  // Dispatch webhook notification (fire and forget)
  dispatchWebhookEvent(userId, "subscription.cancelled", {
    subscriptionId: updatedSubscription.id,
    immediate,
    cancelledAt: updatedSubscription.cancelledAt?.toISOString(),
    cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
    currentPeriodEnd: updatedSubscription.currentPeriodEnd?.toISOString(),
  }).catch((error) => {
    console.error("[SubscriptionManager] Failed to dispatch webhook:", error);
  });

  return updatedSubscription;
}

// =====================================================
// Admin Operations
// =====================================================

/**
 * Extends subscription period (for manual renewals or adjustments)
 */
export async function extendSubscription(
  subscriptionId: string,
  additionalDays: number
): Promise<UserSubscription> {
  const subscription = await storage.getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (!subscription.currentPeriodEnd) {
    throw new Error("Cannot extend subscription without current period end date");
  }

  const newPeriodEnd = new Date(
    subscription.currentPeriodEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000
  );

  return await storage.updateSubscriptionStatus(subscription.id, "active", {
    currentPeriodEnd: newPeriodEnd,
  });
}

/**
 * Manually activates subscription without payment (admin only)
 */
export async function manuallyActivateSubscription(
  subscriptionId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<UserSubscription> {
  return await storage.updateSubscriptionStatus(subscriptionId, "active", {
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });
}
