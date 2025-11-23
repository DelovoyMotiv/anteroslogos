/**
 * @file api/subscriptions/status.ts
 * @description API endpoint to get current subscription status
 * @method GET
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getSubscriptionStatus } from "../../lib/subscriptions";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Authenticate user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Get subscription status
    const status = await getSubscriptionStatus(user.id);

    res.status(200).json({
      success: true,
      hasSubscription: status.subscription !== null,
      subscription: status.subscription
        ? {
            id: status.subscription.id,
            userId: status.subscription.userId,
            planId: status.subscription.planId,
            status: status.subscription.status,
            currentPeriodStart: status.subscription.currentPeriodStart,
            currentPeriodEnd: status.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: status.subscription.cancelAtPeriodEnd,
            createdAt: status.subscription.createdAt,
          }
        : null,
      plan: status.plan
        ? {
            planName: status.plan.planName,
            displayName: status.plan.displayName,
            priceUsd: status.plan.priceUsd,
            auditQuota: status.plan.auditQuota,
            features: status.plan.features,
          }
        : null,
      usage: status.usage,
      currentPeriod: status.currentPeriod,
      pendingInvoices: status.pendingInvoices.map((inv) => ({
        invoiceId: inv.invoiceId,
        amount: inv.amount,
        token: inv.token,
        recipientAddress: inv.recipientAddress,
        memoHash: inv.memoHash,
        expiresAt: inv.expiresAt,
        billingPeriodStart: inv.billingPeriodStart,
        billingPeriodEnd: inv.billingPeriodEnd,
      })),
    });
  } catch (error) {
    console.error("[API /subscriptions/status]", error);
    res.status(500).json({
      error: "Failed to fetch subscription status",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
