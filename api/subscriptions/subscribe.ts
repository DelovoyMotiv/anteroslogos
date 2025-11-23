/**
 * @file api/subscriptions/subscribe.ts
 * @description API endpoint to create subscription
 * @method POST
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import {
  SubscribeInputSchema,
  type SubscribeResponse,
} from "../../lib/subscriptions/types";
import { subscribeToPlan } from "../../lib/subscriptions";

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
    const input = SubscribeInputSchema.parse(req.body);

    // Create subscription
    const result: SubscribeResponse = await subscribeToPlan(
      user.id,
      input.planTier,
      input.billingWalletAddress
    );

    res.status(200).json({
      success: true,
      subscription: {
        id: result.subscription.id,
        userId: result.subscription.userId,
        planId: result.subscription.planId,
        status: result.subscription.status,
        createdAt: result.subscription.createdAt,
      },
      invoice: {
        invoiceId: result.invoice.invoiceId,
        amount: result.invoice.amount,
        token: result.invoice.token,
        expiresAt: result.invoice.expiresAt,
        billingPeriodStart: result.invoice.billingPeriodStart,
        billingPeriodEnd: result.invoice.billingPeriodEnd,
      },
      paymentInstructions: result.paymentInstructions,
    });
  } catch (error) {
    console.error("[API /subscriptions/subscribe]", error);

    if (error instanceof Error && error.message.includes("already has active")) {
      res.status(409).json({
        error: "Subscription conflict",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to create subscription",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
