/**
 * @file api/cron/subscription-payments/index.ts
 * @description CRON endpoint for automatic subscription payment detection
 * @schedule Every 5 minutes
 * @security Requires CRON_SECRET header or Vercel CRON
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { scanSubscriptionPayments } from "../../../lib/subscriptions/paymentDetector";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Verify CRON secret
  const cronSecret = req.headers.authorization?.replace("Bearer ", "");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    console.log("[CRON] Starting subscription payment detection...");

    const result = await scanSubscriptionPayments();

    console.log(
      `[CRON] Payment detection complete: scanned=${result.scanned}, detected=${result.detected}, activated=${result.activated}, errors=${result.errors.length}`
    );

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        scanned: result.scanned,
        detected: result.detected,
        activated: result.activated,
        errorCount: result.errors.length,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("[CRON] Subscription payment detection failed:", error);

    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
