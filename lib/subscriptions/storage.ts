/**
 * @file lib/subscriptions/storage.ts
 * @description Database storage layer for subscription billing
 * @standards Type-safe Supabase queries, zero mocks, error handling
 */

import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";
import { keccak256, toUtf8Bytes } from "ethers";
import {
  type SubscriptionPlan,
  type UserSubscription,
  type SubscriptionInvoice,
  type SubscriptionUsageLog,
  type SubscriptionPlanRow,
  type UserSubscriptionRow,
  type SubscriptionInvoiceRow,
  type SubscriptionUsageLogRow,
  type PlanTier,
  type SubscriptionStatus,
  type SubscriptionInvoiceStatus,
  planRowToObject,
  subscriptionRowToObject,
  invoiceRowToObject,
  usageLogRowToObject,
} from "./types";

// =====================================================
// Environment & Configuration
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

// Platform wallet address (owner's wallet on Base L2)
// Fallback to hardcoded address if env var not set
// Owner wallet: 0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93
const PLATFORM_WALLET_ADDRESS =
  process.env.PLATFORM_WALLET_ADDRESS ||
  "0x8dc66e84c31fe4dd455e1b32fe42d42d026abb93";

// Default invoice expiration: 7 days
const DEFAULT_INVOICE_TTL_SECONDS = 7 * 24 * 3600;

// =====================================================
// Utility Functions
// =====================================================

/**
 * Generates subscription invoice ID
 * Format: sub_inv_{ULID}
 */
function generateSubscriptionInvoiceId(): string {
  return `sub_inv_${ulid()}`;
}

/**
 * Computes keccak256 hash of invoice ID for on-chain memo
 */
function generateMemoHash(invoiceId: string): string {
  return keccak256(toUtf8Bytes(invoiceId));
}

// =====================================================
// Subscription Plans
// =====================================================

/**
 * Fetches all active subscription plans from database
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select()
    .eq("is_active", true)
    .order("price_usd", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch subscription plans: ${error.message}`);
  }

  return (data as SubscriptionPlanRow[]).map(planRowToObject);
}

/**
 * Gets specific plan by plan name
 */
export async function getPlanByName(
  planName: PlanTier
): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select()
    .eq("plan_name", planName)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch plan ${planName}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return planRowToObject(data as SubscriptionPlanRow);
}

/**
 * Gets plan by ID
 */
export async function getPlanById(
  planId: string
): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select()
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch plan by ID: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return planRowToObject(data as SubscriptionPlanRow);
}

// =====================================================
// User Subscriptions
// =====================================================

/**
 * Gets user's active subscription with plan details
 */
export async function getUserSubscription(
  userId: string
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select()
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user subscription: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return subscriptionRowToObject(data as UserSubscriptionRow);
}

/**
 * Gets subscription by ID
 */
export async function getSubscriptionById(
  subscriptionId: string
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select()
    .eq("id", subscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return subscriptionRowToObject(data as UserSubscriptionRow);
}

/**
 * Creates new subscription record
 */
export async function createSubscription(input: {
  userId: string;
  planId: string;
  billingWalletAddress?: string;
}): Promise<UserSubscription> {
  const row: Partial<UserSubscriptionRow> = {
    user_id: input.userId,
    plan_id: input.planId,
    status: "pending_payment",
    billing_wallet_address: input.billingWalletAddress || null,
    cancel_at_period_end: false,
  };

  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }

  if (!data) {
    throw new Error("Subscription created but no data returned");
  }

  return subscriptionRowToObject(data as UserSubscriptionRow);
}

/**
 * Updates subscription status and metadata
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  metadata?: {
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelledAt?: Date;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<UserSubscription> {
  const updates: Partial<UserSubscriptionRow> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (metadata?.currentPeriodStart) {
    updates.current_period_start = metadata.currentPeriodStart.toISOString();
  }

  if (metadata?.currentPeriodEnd) {
    updates.current_period_end = metadata.currentPeriodEnd.toISOString();
  }

  if (metadata?.cancelledAt) {
    updates.cancelled_at = metadata.cancelledAt.toISOString();
  }

  if (metadata?.cancelAtPeriodEnd !== undefined) {
    updates.cancel_at_period_end = metadata.cancelAtPeriodEnd;
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .update(updates)
    .eq("id", subscriptionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update subscription status: ${error.message}`);
  }

  if (!data) {
    throw new Error("Subscription updated but no data returned");
  }

  return subscriptionRowToObject(data as UserSubscriptionRow);
}

/**
 * Gets expired subscriptions (past current_period_end)
 */
export async function getExpiredSubscriptions(): Promise<UserSubscription[]> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select()
    .eq("status", "active")
    .lt("current_period_end", new Date().toISOString());

  if (error) {
    throw new Error(`Failed to fetch expired subscriptions: ${error.message}`);
  }

  return (data as UserSubscriptionRow[]).map(subscriptionRowToObject);
}

/**
 * Gets subscriptions needing renewal invoice generation
 */
export async function getPendingRenewals(
  beforeDate: Date
): Promise<UserSubscription[]> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select()
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .lt("current_period_end", beforeDate.toISOString());

  if (error) {
    throw new Error(`Failed to fetch pending renewals: ${error.message}`);
  }

  return (data as UserSubscriptionRow[]).map(subscriptionRowToObject);
}

// =====================================================
// Subscription Invoices
// =====================================================

/**
 * Creates subscription invoice
 */
export async function createSubscriptionInvoice(input: {
  subscriptionId: string;
  userId: string;
  amount: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  ttlSeconds?: number;
}): Promise<SubscriptionInvoice> {
  const invoiceId = generateSubscriptionInvoiceId();
  const memoHash = generateMemoHash(invoiceId);
  const expiresAt = new Date(
    Date.now() + (input.ttlSeconds || DEFAULT_INVOICE_TTL_SECONDS) * 1000
  );

  const row: Partial<SubscriptionInvoiceRow> = {
    invoice_id: invoiceId,
    subscription_id: input.subscriptionId,
    user_id: input.userId,
    amount: input.amount.toString(),
    token: "USDC",
    chain_id: 8453,
    recipient_address: PLATFORM_WALLET_ADDRESS,
    memo_hash: memoHash,
    status: "pending",
    confirmations: 0,
    billing_period_start: input.billingPeriodStart.toISOString(),
    billing_period_end: input.billingPeriodEnd.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const { data, error } = await supabase
    .from("subscription_invoices")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create subscription invoice: ${error.message}`);
  }

  if (!data) {
    throw new Error("Subscription invoice created but no data returned");
  }

  return invoiceRowToObject(data as SubscriptionInvoiceRow);
}

/**
 * Gets subscription invoice by invoice ID
 */
export async function getSubscriptionInvoice(
  invoiceId: string
): Promise<SubscriptionInvoice | null> {
  const { data, error } = await supabase
    .from("subscription_invoices")
    .select()
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch subscription invoice: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return invoiceRowToObject(data as SubscriptionInvoiceRow);
}

/**
 * Gets all invoices for subscription
 */
export async function getSubscriptionInvoices(
  subscriptionId: string
): Promise<SubscriptionInvoice[]> {
  const { data, error } = await supabase
    .from("subscription_invoices")
    .select()
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch subscription invoices: ${error.message}`
    );
  }

  return (data as SubscriptionInvoiceRow[]).map(invoiceRowToObject);
}

/**
 * Gets pending invoices (unpaid and not expired)
 */
export async function getPendingInvoices(): Promise<SubscriptionInvoice[]> {
  const { data, error } = await supabase
    .from("subscription_invoices")
    .select()
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (error) {
    throw new Error(`Failed to fetch pending invoices: ${error.message}`);
  }

  return (data as SubscriptionInvoiceRow[]).map(invoiceRowToObject);
}

/**
 * Updates subscription invoice status
 */
export async function updateSubscriptionInvoice(
  invoiceId: string,
  updates: {
    status?: SubscriptionInvoiceStatus;
    txHash?: string;
    blockNumber?: bigint;
    confirmations?: number;
    paidAt?: Date;
  }
): Promise<SubscriptionInvoice> {
  const dbUpdates: Partial<SubscriptionInvoiceRow> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) {
    dbUpdates.status = updates.status;
  }

  if (updates.txHash) {
    dbUpdates.tx_hash = updates.txHash;
  }

  if (updates.blockNumber !== undefined) {
    dbUpdates.block_number = Number(updates.blockNumber);
  }

  if (updates.confirmations !== undefined) {
    dbUpdates.confirmations = updates.confirmations;
  }

  if (updates.paidAt) {
    dbUpdates.paid_at = updates.paidAt.toISOString();
  }

  const { data, error } = await supabase
    .from("subscription_invoices")
    .update(dbUpdates)
    .eq("invoice_id", invoiceId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to update subscription invoice: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Subscription invoice updated but no data returned");
  }

  return invoiceRowToObject(data as SubscriptionInvoiceRow);
}

/**
 * Checks if renewal invoice exists for billing period
 */
export async function hasRenewalInvoice(
  subscriptionId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<boolean> {
  const { data, error } = await supabase
    .from("subscription_invoices")
    .select("invoice_id")
    .eq("subscription_id", subscriptionId)
    .eq("billing_period_start", periodStart.toISOString())
    .eq("billing_period_end", periodEnd.toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check renewal invoice: ${error.message}`);
  }

  return data !== null;
}

// =====================================================
// Usage Logs
// =====================================================

/**
 * Records usage log entry
 */
export async function recordUsage(input: {
  subscriptionId: string;
  userId: string;
  auditId?: string;
  eventType: "audit_completed" | "audit_failed";
  quotaRemaining: number;
  metadata?: Record<string, unknown>;
}): Promise<SubscriptionUsageLog> {
  const row: Partial<SubscriptionUsageLogRow> = {
    subscription_id: input.subscriptionId,
    user_id: input.userId,
    audit_id: input.auditId || null,
    event_type: input.eventType,
    resource_type: "geo_audit",
    cost_units: 1,
    quota_remaining: input.quotaRemaining,
    metadata: (input.metadata || {}) as any,
  };

  const { data, error } = await supabase
    .from("subscription_usage_logs")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record usage: ${error.message}`);
  }

  if (!data) {
    throw new Error("Usage log created but no data returned");
  }

  return usageLogRowToObject(data as SubscriptionUsageLogRow);
}

/**
 * Gets usage logs for subscription in current period
 */
export async function getUsageLogs(
  subscriptionId: string,
  periodStart: Date
): Promise<SubscriptionUsageLog[]> {
  const { data, error } = await supabase
    .from("subscription_usage_logs")
    .select()
    .eq("subscription_id", subscriptionId)
    .gte("timestamp", periodStart.toISOString())
    .order("timestamp", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch usage logs: ${error.message}`);
  }

  return (data as SubscriptionUsageLogRow[]).map(usageLogRowToObject);
}

/**
 * Gets usage count for subscription in current period
 */
export async function getUsageCount(
  subscriptionId: string,
  periodStart: Date
): Promise<number> {
  const { count, error } = await supabase
    .from("subscription_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("subscription_id", subscriptionId)
    .gte("timestamp", periodStart.toISOString());

  if (error) {
    throw new Error(`Failed to count usage: ${error.message}`);
  }

  return count || 0;
}
