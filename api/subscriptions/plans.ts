/**
 * @file api/subscriptions/plans.ts
 * @description API endpoint to list subscription plans
 * @method GET
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSubscriptionPlans } from "../../lib/subscriptions";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const plans = await getSubscriptionPlans();

    res.status(200).json({
      success: true,
      plans: plans.map((plan) => ({
        id: plan.id,
        planName: plan.planName,
        displayName: plan.displayName,
        priceUsd: plan.priceUsd,
        billingCycleDays: plan.billingCycleDays,
        auditQuota: plan.auditQuota,
        description: plan.description,
        features: plan.features,
      })),
    });
  } catch (error) {
    console.error("[API /subscriptions/plans]", error);
    res.status(500).json({
      error: "Failed to fetch subscription plans",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
