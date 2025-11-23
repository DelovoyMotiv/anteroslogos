/**
 * @file lib/subscriptions/renewalEngine.ts
 * @description Automated renewal processing for subscriptions
 * @standards CRON-triggered, idempotent operations, email notifications
 */

import { createClient } from "@supabase/supabase-js";
import * as storage from "./storage";
import type { UserSubscription, SubscriptionInvoice } from "./types";

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

// Renewal invoice generation: 7 days before period end
const RENEWAL_ADVANCE_DAYS = 7;

// Grace period: 7 days after period end before marking expired
const GRACE_PERIOD_DAYS = 7;

// =====================================================
// Renewal Processing
// =====================================================

/**
 * Processes subscription renewals
 * Generates renewal invoices for subscriptions approaching period end
 * Expires subscriptions past grace period
 * Should be called from CRON job daily
 */
export async function processRenewals(): Promise<{
  renewalsGenerated: number;
  subscriptionsExpired: number;
  errors: Array<{ subscriptionId: string; error: string }>;
}> {
  const results = {
    renewalsGenerated: 0,
    subscriptionsExpired: 0,
    errors: [] as Array<{ subscriptionId: string; error: string }>,
  };

  try {
    // Generate renewal invoices
    const renewalsResult = await generateRenewalInvoices();
    results.renewalsGenerated = renewalsResult.generated;
    results.errors.push(...renewalsResult.errors);

    // Expire subscriptions past grace period
    const expirationResult = await expireOverdueSubscriptions();
    results.subscriptionsExpired = expirationResult.expired;
    results.errors.push(...expirationResult.errors);

    return results;
  } catch (error) {
    throw new Error(
      `Renewal processing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generates renewal invoices for subscriptions approaching period end
 */
async function generateRenewalInvoices(): Promise<{
  generated: number;
  errors: Array<{ subscriptionId: string; error: string }>;
}> {
  const results = {
    generated: 0,
    errors: [] as Array<{ subscriptionId: string; error: string }>,
  };

  // Get subscriptions needing renewal invoice
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + RENEWAL_ADVANCE_DAYS);

  const subscriptions = await storage.getPendingRenewals(renewalDate);

  for (const subscription of subscriptions) {
    try {
      await generateRenewalInvoiceForSubscription(subscription);
      results.generated++;
    } catch (error) {
      results.errors.push({
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Generates renewal invoice for specific subscription
 * Idempotent: checks for existing invoice before creating
 */
async function generateRenewalInvoiceForSubscription(
  subscription: UserSubscription
): Promise<SubscriptionInvoice | null> {
  if (!subscription.currentPeriodEnd) {
    throw new Error(
      `Cannot generate renewal for subscription without period end: ${subscription.id}`
    );
  }

  // Get plan details
  const plan = await storage.getPlanById(subscription.planId);
  if (!plan) {
    throw new Error(`Plan ${subscription.planId} not found`);
  }

  // Calculate next billing period
  const newPeriodStart = subscription.currentPeriodEnd;
  const newPeriodEnd = new Date(
    newPeriodStart.getTime() + plan.billingCycleDays * 24 * 60 * 60 * 1000
  );

  // Check if renewal invoice already exists
  const existingInvoice = await storage.hasRenewalInvoice(
    subscription.id,
    newPeriodStart,
    newPeriodEnd
  );

  if (existingInvoice) {
    // Invoice already exists, skip
    return null;
  }

  // Create renewal invoice via database function
  const { data, error } = await supabase.rpc("generate_renewal_invoice", {
    p_subscription_id: subscription.id,
  });

  if (error) {
    throw new Error(`Failed to generate renewal invoice: ${error.message}`);
  }

  // Fetch and return the created invoice
  const invoiceId = data as string;
  const invoice = await storage.getSubscriptionInvoice(invoiceId);

  if (!invoice) {
    throw new Error(`Renewal invoice ${invoiceId} not found after creation`);
  }

  // TODO: Send email notification with payment instructions
  // await sendRenewalEmailNotification(subscription.userId, invoice);

  return invoice;
}

/**
 * Expires subscriptions past grace period without payment
 */
async function expireOverdueSubscriptions(): Promise<{
  expired: number;
  errors: Array<{ subscriptionId: string; error: string }>;
}> {
  const results = {
    expired: 0,
    errors: [] as Array<{ subscriptionId: string; error: string }>,
  };

  // Get subscriptions past grace period
  const graceDeadline = new Date();
  graceDeadline.setDate(graceDeadline.getDate() - GRACE_PERIOD_DAYS);

  const expiredSubscriptions = await storage.getExpiredSubscriptions();

  for (const subscription of expiredSubscriptions) {
    try {
      if (!subscription.currentPeriodEnd) {
        continue;
      }

      // Check if past grace period
      if (subscription.currentPeriodEnd < graceDeadline) {
        // Check for paid renewal invoice
        const renewalPaid = await hasRenewalInvoicePaid(subscription);

        if (!renewalPaid) {
          // Expire subscription
          await storage.updateSubscriptionStatus(subscription.id, "expired");
          results.expired++;

          // TODO: Send expiration notification email
          // await sendExpirationEmailNotification(subscription.userId);
        } else {
          // Renewal invoice was paid, activate for new period
          await activateRenewalPeriod(subscription);
        }
      }
    } catch (error) {
      results.errors.push({
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Checks if subscription has paid renewal invoice for next period
 */
async function hasRenewalInvoicePaid(
  subscription: UserSubscription
): Promise<boolean> {
  if (!subscription.currentPeriodEnd) {
    return false;
  }

  const plan = await storage.getPlanById(subscription.planId);
  if (!plan) {
    return false;
  }

  // Calculate next period
  const nextPeriodStart = subscription.currentPeriodEnd;
  const nextPeriodEnd = new Date(
    nextPeriodStart.getTime() + plan.billingCycleDays * 24 * 60 * 60 * 1000
  );

  // Query for paid invoice in next period
  const invoices = await storage.getSubscriptionInvoices(subscription.id);
  const paidRenewal = invoices.find(
    (inv) =>
      inv.status === "paid" &&
      inv.billingPeriodStart.getTime() === nextPeriodStart.getTime() &&
      inv.billingPeriodEnd.getTime() === nextPeriodEnd.getTime()
  );

  return paidRenewal !== undefined;
}

/**
 * Activates subscription for renewal period after payment
 */
async function activateRenewalPeriod(
  subscription: UserSubscription
): Promise<void> {
  if (!subscription.currentPeriodEnd) {
    throw new Error("Cannot activate renewal without current period end");
  }

  const plan = await storage.getPlanById(subscription.planId);
  if (!plan) {
    throw new Error(`Plan ${subscription.planId} not found`);
  }

  // Calculate new period
  const newPeriodStart = subscription.currentPeriodEnd;
  const newPeriodEnd = new Date(
    newPeriodStart.getTime() + plan.billingCycleDays * 24 * 60 * 60 * 1000
  );

  // Update subscription with new period
  await storage.updateSubscriptionStatus(subscription.id, "active", {
    currentPeriodStart: newPeriodStart,
    currentPeriodEnd: newPeriodEnd,
  });
}

// =====================================================
// Email Notifications (TODO)
// =====================================================

// TODO: Implement email notifications
// - sendRenewalEmailNotification(userId, invoice): Send renewal reminder
// - sendExpirationEmailNotification(userId): Send expiration notice
// Integration points: SendGrid, AWS SES, or other email service
// Required data: Fetch user email from auth.users table
