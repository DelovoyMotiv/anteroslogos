/**
 * @file api/subscriptions/cancel.ts
 * @description API endpoint to cancel subscription
 * @method POST
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { CancelSubscriptionInputSchema } from "../../lib/subscriptions/types";
import { cancelSubscription } from "../../lib/subscriptions";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
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

    // Validate input
    const input = CancelSubscriptionInputSchema.parse(req.body || {});

    // Cancel subscription
    const subscription = await cancelSubscription(user.id, input.immediate);

    res.status(200).json({
      success: true,
      cancelled: true,
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      effectiveDate: input.immediate
        ? subscription.cancelledAt
        : subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error("[API /subscriptions/cancel]", error);

    if (
      error instanceof Error &&
      error.message.includes("No active subscription")
    ) {
      res.status(404).json({
        error: "Subscription not found",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to cancel subscription",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
