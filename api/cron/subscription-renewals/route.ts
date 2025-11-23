/**
 * @file api/cron/subscription-renewals/route.ts
 * @description CRON endpoint for subscription renewal processing
 * @schedule Daily at midnight UTC
 * @security Requires CRON_SECRET header
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processRenewals } from "../../../lib/subscriptions/renewalEngine";

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
    console.log("[CRON] Starting subscription renewal processing...");

    const result = await processRenewals();

    console.log(
      `[CRON] Renewal processing complete: renewals=${result.renewalsGenerated}, expired=${result.subscriptionsExpired}, errors=${result.errors.length}`
    );

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        renewalsGenerated: result.renewalsGenerated,
        subscriptionsExpired: result.subscriptionsExpired,
        errorCount: result.errors.length,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("[CRON] Subscription renewal processing failed:", error);

    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
