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
  // Check for existing active subscription
  const existingSubscription = await storage.getUserSubscription(userId);
  if (existingSubscription) {
    throw new Error(
      `User already has active ${existingSubscription.status} subscription. Cancel existing subscription before subscribing to new plan.`
    );
  }

  // Get plan details
  const plan = await storage.getPlanByName(planTier);
  if (!plan) {
    throw new Error(`Plan ${planTier} not found or inactive`);
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
}

// =====================================================
// Activate Subscription
// =====================================================

/**
 * Activates subscription after payment verification
 * Verifies on-chain transaction, updates invoice, activates subscription
 */
export async function activateSubscription(
  invoiceId: string,
  txHash: string
): Promise<{
  subscription: UserSubscription;
  invoice: SubscriptionInvoice;
  verified: boolean;
}> {
  // Get invoice
  const invoice = await storage.getSubscriptionInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  // Check invoice not already paid
  if (invoice.status === "paid") {
    const subscription = await storage.getSubscriptionById(
      invoice.subscriptionId
    );
    if (!subscription) {
      throw new Error("Subscription not found for paid invoice");
    }
    return {
      subscription,
      invoice,
      verified: true,
    };
  }

  // Check invoice not expired
  if (invoice.expiresAt < new Date()) {
    throw new Error(`Invoice ${invoiceId} has expired`);
  }

  // Verify transaction on-chain
  const verification = await verifyTransaction(txHash, invoiceId);
  if (!verification.verified) {
    throw new Error(
      `Payment verification failed: ${verification.reason || "Unknown error"}`
    );
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

  return {
    subscription: activatedSubscription,
    invoice: updatedInvoice,
    verified: true,
  };
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
  const { data, error } = await supabase.rpc("check_subscription_quota", {
    p_user_id: userId,
    p_required_units: requiredUnits,
  });

  if (error) {
    throw new Error(`Failed to check quota: ${error.message}`);
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
  // Get active subscription
  const subscription = await storage.getUserSubscription(userId);
  if (!subscription) {
    throw new Error("No active subscription found for user");
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
    throw new Error(`Failed to consume quota: ${error.message}`);
  }

  return data as number;
}

// =====================================================
// Subscription Status
// =====================================================

/**
 * Gets complete subscription status for user
 * Includes subscription, plan, usage stats, pending invoices
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatusResponse> {
  // Get active subscription
  const subscription = await storage.getUserSubscription(userId);

  if (!subscription) {
    return {
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

  return {
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

  if (immediate) {
    // Cancel immediately
    return await storage.updateSubscriptionStatus(subscription.id, "cancelled", {
      cancelledAt: new Date(),
      cancelAtPeriodEnd: false,
    });
  } else {
    // Cancel at period end
    return await storage.updateSubscriptionStatus(subscription.id, "active", {
      cancelAtPeriodEnd: true,
    });
  }
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
