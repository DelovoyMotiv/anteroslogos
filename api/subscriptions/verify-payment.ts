/**
 * @file api/subscriptions/verify-payment.ts
 * @description API endpoint for manual payment verification
 * @method POST
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { activateSubscription } from "../../lib/subscriptions";

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

    // Validate input - txHash is optional for auto-detection
    const invoiceId = req.body.invoiceId as string;
    const txHash = req.body.txHash as string | undefined;

    if (!invoiceId) {
      res.status(400).json({ error: "Missing invoiceId" });
      return;
    }

    let result;
    if (txHash) {
      // Explicit transaction hash provided
      result = await activateSubscription(invoiceId, txHash);
    } else {
      // Auto-detect payment by scanning blockchain
      const { detectPaymentForInvoice } = await import(
        "../../lib/subscriptions/paymentDetector"
      );
      const detection = await detectPaymentForInvoice(invoiceId);
      if (!detection.detected || !detection.txHash) {
        res.status(400).json({
          success: false,
          error: "Payment not detected yet",
          message: "Blockchain payment not yet confirmed. Please wait a few moments and try again.",
        });
        return;
      }
      // Activate with detected txHash
      result = await activateSubscription(invoiceId, detection.txHash);
    }

    res.status(200).json({
      success: true,
      verified: result.verified,
      subscription: {
        id: result.subscription.id,
        userId: result.subscription.userId,
        planId: result.subscription.planId,
        status: result.subscription.status,
        currentPeriodStart: result.subscription.currentPeriodStart,
        currentPeriodEnd: result.subscription.currentPeriodEnd,
      },
      invoice: {
        invoiceId: result.invoice.invoiceId,
        status: result.invoice.status,
        txHash: result.invoice.txHash,
        paidAt: result.invoice.paidAt,
      },
    });
  } catch (error) {
    console.error("[API /subscriptions/verify-payment]", error);

    if (
      error instanceof Error &&
      (error.message.includes("verification failed") ||
        error.message.includes("expired"))
    ) {
      res.status(400).json({
        error: "Payment verification failed",
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to verify payment",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
