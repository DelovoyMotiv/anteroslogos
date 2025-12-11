/**
 * Subscription Domain Model Schemas
 * 
 * Zod schemas for subscription plans, user subscriptions, invoices, and usage logs.
 * These schemas provide runtime validation and type inference.
 * 
 * @module lib/subscriptions/schemas
 */

import { z } from 'zod';

// =====================================================
// SUBSCRIPTION PLAN SCHEMAS
// =====================================================

/**
 * Subscription Plan schema matching the subscription_plans table structure
 */
export const SubscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  planName: z.enum(['free', 'starter', 'pro', 'enterprise']),
  displayName: z.string().min(1),
  description: z.string().nullable(),
  priceUsd: z.number().nonnegative(),
  billingCycleDays: z.number().int().positive(),
  auditQuota: z.number().int().nonnegative(),
  features: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

/**
 * Convert database row to Subscription Plan domain model
 */
export function subscriptionPlanFromDb(row: Record<string, unknown>): SubscriptionPlan {
  return SubscriptionPlanSchema.parse({
    id: row.id,
    planName: row.plan_name,
    displayName: row.display_name,
    description: row.description,
    priceUsd: row.price_usd,
    billingCycleDays: row.billing_cycle_days,
    auditQuota: row.audit_quota,
    features: row.features,
    isActive: row.is_active,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  });
}

// =====================================================
// USER SUBSCRIPTION SCHEMAS
// =====================================================

/**
 * User Subscription schema matching the user_subscriptions table structure
 */
export const UserSubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending_payment']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean(),
  cancelledAt: z.date().nullable(),
  billingWalletAddress: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSubscription = z.infer<typeof UserSubscriptionSchema>;

/**
 * Convert database row to User Subscription domain model
 */
export function userSubscriptionFromDb(row: Record<string, unknown>): UserSubscription {
  return UserSubscriptionSchema.parse({
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    currentPeriodStart: new Date(row.current_period_start as string),
    currentPeriodEnd: new Date(row.current_period_end as string),
    cancelAtPeriodEnd: row.cancel_at_period_end,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string) : null,
    billingWalletAddress: row.billing_wallet_address,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  });
}

// =====================================================
// SUBSCRIPTION INVOICE SCHEMAS
// =====================================================

/**
 * Subscription Invoice schema matching the subscription_invoices table structure
 */
export const SubscriptionInvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string(),
  subscriptionId: z.string().uuid(),
  userId: z.string().uuid(),
  amountDue: z.number().positive(),
  amountPaid: z.number().nonnegative(),
  token: z.literal('USDC'),
  status: z.enum(['pending', 'paid', 'expired']),
  dueDate: z.date(),
  paidAt: z.date().nullable(),
  txHash: z.string().nullable(),
  walletAddress: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  stripeInvoiceId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
});

export type SubscriptionInvoice = z.infer<typeof SubscriptionInvoiceSchema>;

/**
 * Convert database row to Subscription Invoice domain model
 */
export function subscriptionInvoiceFromDb(row: Record<string, unknown>): SubscriptionInvoice {
  return SubscriptionInvoiceSchema.parse({
    id: row.id,
    invoiceId: row.invoice_id,
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    amountDue: row.amount_due,
    amountPaid: row.amount_paid,
    token: row.token,
    status: row.status,
    dueDate: new Date(row.due_date as string),
    paidAt: row.paid_at ? new Date(row.paid_at as string) : null,
    txHash: row.tx_hash,
    walletAddress: row.wallet_address,
    paymentMethod: row.payment_method,
    stripeInvoiceId: row.stripe_invoice_id,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    expiresAt: new Date(row.expires_at as string),
  });
}

// =====================================================
// SUBSCRIPTION USAGE LOG SCHEMAS
// =====================================================

/**
 * Subscription Usage Log schema matching the subscription_usage_logs table structure
 */
export const SubscriptionUsageLogSchema = z.object({
  id: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  userId: z.string().uuid(),
  eventType: z.enum(['audit_completed', 'audit_failed']),
  resourceType: z.literal('geo_audit'),
  auditId: z.string().nullable(),
  costUnits: z.number().int().positive(),
  quotaRemaining: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).nullable(),
  timestamp: z.date(),
});

export type SubscriptionUsageLog = z.infer<typeof SubscriptionUsageLogSchema>;

/**
 * Convert database row to Subscription Usage Log domain model
 */
export function subscriptionUsageLogFromDb(row: Record<string, unknown>): SubscriptionUsageLog {
  return SubscriptionUsageLogSchema.parse({
    id: row.id,
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    eventType: row.event_type,
    resourceType: row.resource_type,
    auditId: row.audit_id,
    costUnits: row.cost_units,
    quotaRemaining: row.quota_remaining,
    metadata: row.metadata as Record<string, unknown> | null,
    timestamp: new Date(row.timestamp as string),
  });
}

// =====================================================
// USDC SUBSCRIPTION SCHEMAS
// =====================================================

/**
 * USDC Subscription schema for crypto payment subscriptions
 */
export const USDCSubscriptionSchema = z.object({
  subscription_id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan_tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
  status: z.enum(['active', 'cancelled', 'expired']),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  current_period_start: z.string().datetime(),
  current_period_end: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  auto_renew: z.boolean(),
  payment_token: z.literal('USDC'),
});

export type USDCSubscription = z.infer<typeof USDCSubscriptionSchema>;

/**
 * Convert database row to USDC Subscription domain model
 */
export function usdcSubscriptionFromDb(row: Record<string, unknown>): USDCSubscription {
  return USDCSubscriptionSchema.parse({
    subscription_id: row.subscription_id,
    user_id: row.user_id,
    plan_tier: row.plan_tier,
    status: row.status,
    wallet_address: row.wallet_address,
    current_period_start: typeof row.current_period_start === 'string' 
      ? row.current_period_start 
      : new Date(row.current_period_start as Date).toISOString(),
    current_period_end: typeof row.current_period_end === 'string'
      ? row.current_period_end
      : new Date(row.current_period_end as Date).toISOString(),
    created_at: typeof row.created_at === 'string'
      ? row.created_at
      : new Date(row.created_at as Date).toISOString(),
    updated_at: typeof row.updated_at === 'string'
      ? row.updated_at
      : new Date(row.updated_at as Date).toISOString(),
    auto_renew: row.auto_renew as boolean,
    payment_token: 'USDC',
  });
}
