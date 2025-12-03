/**
 * @file lib/subscriptions/types.ts
 * @description Type system for USDC subscription billing
 * @standards Zod validation, TypeScript strict mode, ULID invoice IDs
 */

import { z } from "zod";
import type { SubscriptionPlanFeatures, UsageRecordMetadata } from '../../types/lib.types';

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export const PlanTierSchema = z.enum(["free", "starter", "pro", "enterprise"]);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const SubscriptionStatusSchema = z.enum([
  "pending_payment",
  "active",
  "cancelled",
  "expired",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionInvoiceStatusSchema = z.enum([
  "pending",
  "paid",
  "expired",
]);
export type SubscriptionInvoiceStatus = z.infer<
  typeof SubscriptionInvoiceStatusSchema
>;

export const UsageEventTypeSchema = z.enum(["audit_completed", "audit_failed"]);
export type UsageEventType = z.infer<typeof UsageEventTypeSchema>;

// =====================================================
// SUBSCRIPTION PLANS METADATA
// =====================================================

export interface SubscriptionPlanMetadata {
  planName: PlanTier;
  displayName: string;
  priceUsd: number;
  billingCycleDays: number;
  auditQuota: number;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<PlanTier, SubscriptionPlanMetadata> = {
  free: {
    planName: "free",
    displayName: "Free",
    priceUsd: 0.0,
    billingCycleDays: 30,
    auditQuota: 1,
    description: "Free tier with basic access - perfect for trying out the platform",
    features: [
      "1 GEO audit per month",
      "Basic website analysis",
      "Community support",
      "7-day audit history",
    ],
  },
  starter: {
    planName: "starter",
    displayName: "Starter",
    priceUsd: 19.0,
    billingCycleDays: 30,
    auditQuota: 10,
    description: "Ideal for freelancers and small projects",
    features: [
      "10 GEO audits per month",
      "Full citation tracking",
      "Email support",
      "30-day audit history",
      "Export reports",
    ],
  },
  pro: {
    planName: "pro",
    displayName: "Pro",
    priceUsd: 49.0,
    billingCycleDays: 30,
    auditQuota: 100,
    description: "For agencies and growing businesses",
    features: [
      "100 GEO audits per month",
      "Advanced citation prediction",
      "Priority support",
      "90-day audit history",
      "Competitive intelligence",
      "API access",
      "Custom branding",
    ],
  },
  enterprise: {
    planName: "enterprise",
    displayName: "Enterprise",
    priceUsd: 499.0,
    billingCycleDays: 30,
    auditQuota: 999999,
    description: "Unlimited audits for large organizations",
    features: [
      "Unlimited GEO audits",
      "Real-time citation monitoring",
      "Dedicated support",
      "Unlimited audit history",
      "Knowledge graph extraction",
      "Custom integrations",
      "SLA guarantees",
      "White-label solution",
      "Dedicated account manager",
    ],
  },
};

// =====================================================
// DATABASE ROW TYPES
// =====================================================

export interface SubscriptionPlanRow {
  id: string;
  plan_name: string;
  display_name: string;
  price_usd: string | number;
  billing_cycle_days: number;
  audit_quota: number;
  description: string | null;
  features: SubscriptionPlanFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_wallet_address: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInvoiceRow {
  id: string;
  invoice_id: string;
  subscription_id: string;
  user_id: string;
  amount: string | number;
  token: string;
  chain_id: number;
  recipient_address: string;
  memo_hash: string;
  status: string;
  tx_hash: string | null;
  block_number: number | null;
  confirmations: number;
  billing_period_start: string;
  billing_period_end: string;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsageLogRow {
  id: string;
  subscription_id: string;
  user_id: string;
  audit_id: string | null;
  event_type: string;
  resource_type: string;
  cost_units: number;
  quota_remaining: number;
  metadata: UsageRecordMetadata;
  timestamp: string;
}

// =====================================================
// API TYPES (camelCase)
// =====================================================

export interface SubscriptionPlan {
  id: string;
  planName: PlanTier;
  displayName: string;
  priceUsd: number;
  billingCycleDays: number;
  auditQuota: number;
  description?: string;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  billingWalletAddress?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceId: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  token: "USDC";
  chainId: 8453;
  recipientAddress: string;
  memoHash: string;
  status: SubscriptionInvoiceStatus;
  txHash?: string;
  blockNumber?: bigint;
  confirmations: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  expiresAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsageLog {
  id: string;
  subscriptionId: string;
  userId: string;
  auditId?: string;
  eventType: UsageEventType;
  resourceType: "geo_audit";
  costUnits: number;
  quotaRemaining: number;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

// =====================================================
// ZOD SCHEMAS
// =====================================================

export const SubscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  planName: PlanTierSchema,
  displayName: z.string(),
  priceUsd: z.number().nonnegative(),
  billingCycleDays: z.number().int().positive(),
  auditQuota: z.number().int().positive(),
  description: z.string().optional(),
  features: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserSubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  status: SubscriptionStatusSchema,
  billingWalletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  cancelAtPeriodEnd: z.boolean(),
  cancelledAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SubscriptionInvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().regex(/^sub_inv_[0-9A-HJKMNP-TV-Z]{26}$/),
  subscriptionId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive(),
  token: z.literal("USDC"),
  chainId: z.literal(8453),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  memoHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  status: SubscriptionInvoiceStatusSchema,
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  blockNumber: z.bigint().optional(),
  confirmations: z.number().int().nonnegative(),
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
  expiresAt: z.date(),
  paidAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SubscriptionUsageLogSchema = z.object({
  id: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  userId: z.string().uuid(),
  auditId: z.string().uuid().optional(),
  eventType: UsageEventTypeSchema,
  resourceType: z.literal("geo_audit"),
  costUnits: z.number().int().positive(),
  quotaRemaining: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()),
  timestamp: z.date(),
});

// =====================================================
// INPUT SCHEMAS (for API validation)
// =====================================================

export const SubscribeInputSchema = z.object({
  planTier: PlanTierSchema.refine((tier) => tier !== "free", {
    message: "Cannot explicitly subscribe to FREE plan. FREE plan is automatically activated.",
  }),
  billingWalletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
});

export type SubscribeInput = z.infer<typeof SubscribeInputSchema>;

export const VerifyPaymentInputSchema = z.object({
  invoiceId: z.string().regex(/^sub_inv_[0-9A-HJKMNP-TV-Z]{26}$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentInputSchema>;

export const CancelSubscriptionInputSchema = z.object({
  immediate: z.boolean().default(false),
});

export type CancelSubscriptionInput = z.infer<
  typeof CancelSubscriptionInputSchema
>;

// =====================================================
// RESPONSE TYPES
// =====================================================

export interface SubscriptionWithPlan extends UserSubscription {
  plan: SubscriptionPlan;
}

export interface SubscriptionStatusResponse {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  usage: {
    quota: number;
    used: number;
    remaining: number;
  };
  currentPeriod: {
    start: Date | null;
    end: Date | null;
  };
  pendingInvoices: SubscriptionInvoice[];
}

export interface QuotaCheckResult {
  available: boolean;
  remaining: number;
  subscriptionId?: string;
}

export interface SubscribeResponse {
  subscription: UserSubscription;
  invoice: SubscriptionInvoice;
  paymentInstructions: {
    amount: number;
    token: "USDC";
    recipientAddress: string;
    memoHash: string;
    chainId: 8453;
    expiresAt: Date;
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Converts database row to SubscriptionPlan object
 */
export function planRowToObject(row: SubscriptionPlanRow): SubscriptionPlan {
  return SubscriptionPlanSchema.parse({
    id: row.id,
    planName: row.plan_name,
    displayName: row.display_name,
    priceUsd: Number(row.price_usd),
    billingCycleDays: row.billing_cycle_days,
    auditQuota: row.audit_quota,
    description: row.description || undefined,
    features: Array.isArray(row.features) ? row.features : [],
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

/**
 * Converts database row to UserSubscription object
 */
export function subscriptionRowToObject(
  row: UserSubscriptionRow
): UserSubscription {
  return UserSubscriptionSchema.parse({
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    billingWalletAddress: row.billing_wallet_address || undefined,
    currentPeriodStart: row.current_period_start
      ? new Date(row.current_period_start)
      : undefined,
    currentPeriodEnd: row.current_period_end
      ? new Date(row.current_period_end)
      : undefined,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

/**
 * Converts database row to SubscriptionInvoice object
 */
export function invoiceRowToObject(
  row: SubscriptionInvoiceRow
): SubscriptionInvoice {
  return SubscriptionInvoiceSchema.parse({
    id: row.id,
    invoiceId: row.invoice_id,
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    amount: Number(row.amount),
    token: row.token,
    chainId: row.chain_id,
    recipientAddress: row.recipient_address,
    memoHash: row.memo_hash,
    status: row.status,
    txHash: row.tx_hash || undefined,
    blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
    confirmations: row.confirmations,
    billingPeriodStart: new Date(row.billing_period_start),
    billingPeriodEnd: new Date(row.billing_period_end),
    expiresAt: new Date(row.expires_at),
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

/**
 * Converts database row to SubscriptionUsageLog object
 */
export function usageLogRowToObject(
  row: SubscriptionUsageLogRow
): SubscriptionUsageLog {
  return SubscriptionUsageLogSchema.parse({
    id: row.id,
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    auditId: row.audit_id || undefined,
    eventType: row.event_type,
    resourceType: row.resource_type,
    costUnits: row.cost_units,
    quotaRemaining: row.quota_remaining,
    metadata: row.metadata || {},
    timestamp: new Date(row.timestamp),
  });
}
