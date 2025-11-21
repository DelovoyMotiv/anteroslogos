/**
 * @file lib/payments/reorgMonitor.ts
 * @description Blockchain reorg monitoring and invoice re-verification
 * @purpose Protects against 12-block reorgs by re-verifying invoices with <12 confirmations
 * @schedule Run every 5 minutes as cron job or background worker
 */

import { createClient } from "@supabase/supabase-js";
import { type Hash } from "viem";
import { getRpcClient } from "./rpcProvider";
import { getConfirmations, verifyTransaction } from "./chainWatcher";
import { updateInvoice } from "./invoice";
// import type { InvoiceRow } from "./types"; // Unused

// =====================================================
// Environment & Configuration
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

/**
 * Gets RPC client with automatic fallback
 */
function getPublicClient() {
  return getRpcClient();
}

// Reorg protection constants
const REORG_SAFE_CONFIRMATIONS = 12; // Deep finality threshold
const MAX_INVOICES_PER_RUN = 100; // Batch size for re-verification

// =====================================================
// Types
// =====================================================

interface ReorgMonitorResult {
  checkedInvoices: number;
  reVerifiedInvoices: number;
  invalidatedInvoices: number;
  errors: Array<{ invoiceId: string; error: string }>;
  duration: number;
}

interface InvoiceToReVerify {
  id: string;
  invoice_id: string;
  tx_hash: string;
  block_number: number;
  confirmations: number;
  amount: number;
  token: string;
  recipient_address: string;
}

// =====================================================
// Database Operations
// =====================================================

/**
 * Fetches invoices that need re-verification
 * Criteria: status='paid' or 'confirming', confirmations < 12
 * @param limit - Max invoices to fetch
 * @returns Array of invoices to re-verify
 */
async function fetchInvoicesForReVerification(
  limit: number = MAX_INVOICES_PER_RUN
): Promise<InvoiceToReVerify[]> {
  const { data, error } = await supabase
    .from("a2a_invoices")
    .select("id, invoice_id, tx_hash, block_number, confirmations, amount, token, recipient_address")
    .in("status", ["confirming", "paid"])
    .lt("confirmations", REORG_SAFE_CONFIRMATIONS)
    .not("tx_hash", "is", null)
    .order("confirmations", { ascending: true }) // Re-verify least confirmed first
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch invoices for re-verification: ${error.message}`);
  }

  return (data || []) as InvoiceToReVerify[];
}

/**
 * Marks invoice as invalid due to reorg
 * Sets status to 'expired' and adds note
 * @param invoiceId - Invoice ID
 * @param reason - Reason for invalidation
 */
async function invalidateInvoice(invoiceId: string, reason: string): Promise<void> {
  await updateInvoice(invoiceId, {
    status: "expired",
    // Store reason in a custom field or log it
  });

  console.error(`[ReorgMonitor] Invoice ${invoiceId} invalidated: ${reason}`);
}

// =====================================================
// Re-Verification Logic
// =====================================================

/**
 * Re-verifies a single invoice by checking blockchain state
 * @param invoice - Invoice to re-verify
 * @returns True if invoice is still valid, false if invalidated
 */
async function reVerifyInvoice(invoice: InvoiceToReVerify): Promise<boolean> {
  const { invoice_id, tx_hash, block_number } = invoice;

  try {
    // 1. Check if transaction still exists on-chain
    let receipt;
    try {
      receipt = await getPublicClient().getTransactionReceipt({ hash: tx_hash as Hash });
    } catch (error) {
      // Transaction not found - possible reorg
      console.warn(
        `[ReorgMonitor] Transaction ${tx_hash} not found for invoice ${invoice_id}. ` +
        `Possible reorg detected.`
      );
      await invalidateInvoice(invoice_id, `Transaction ${tx_hash} not found on-chain (reorg)`);
      return false;
    }

    // 2. Check if transaction reverted
    if (receipt.status === "reverted") {
      console.warn(`[ReorgMonitor] Transaction ${tx_hash} reverted for invoice ${invoice_id}.`);
      await invalidateInvoice(invoice_id, `Transaction ${tx_hash} reverted`);
      return false;
    }

    // 3. Check if block number changed (reorg indicator)
    if (receipt.blockNumber !== BigInt(block_number)) {
      console.warn(
        `[ReorgMonitor] Block number changed for tx ${tx_hash} (was ${block_number}, now ${receipt.blockNumber}). ` +
        `Reorg detected. Re-verifying payment details...`
      );
      // Continue to verify payment details even if block changed
    }

    // 4. Get current confirmations
    const currentBlock = await getPublicClient().getBlockNumber();
    const newConfirmations = Number(currentBlock - receipt.blockNumber);

    // 5. Verify payment details against invoice
    const verification = await verifyTransaction(tx_hash, invoice_id);

    if (!verification.verified) {
      console.warn(
        `[ReorgMonitor] Payment verification failed for invoice ${invoice_id}: ${verification.reason}`
      );
      await invalidateInvoice(
        invoice_id,
        `Payment verification failed after reorg: ${verification.reason}`
      );
      return false;
    }

    // 6. Update confirmations if changed
    if (newConfirmations !== invoice.confirmations || receipt.blockNumber !== BigInt(block_number)) {
      await updateInvoice(invoice_id, {
        confirmations: newConfirmations,
        blockNumber: receipt.blockNumber,
      });

      console.log(
        `[ReorgMonitor] Updated confirmations for invoice ${invoice_id}: ` +
        `${invoice.confirmations} → ${newConfirmations}`
      );
    }

    return true;
  } catch (error) {
    console.error(`[ReorgMonitor] Error re-verifying invoice ${invoice_id}:`, error);
    throw error;
  }
}

/**
 * Checks if an invoice has reached finality (12+ confirmations)
 * @param invoice - Invoice to check
 * @returns True if finalized, false otherwise
 */
async function checkFinality(invoice: InvoiceToReVerify): Promise<boolean> {
  try {
    const confirmations = await getConfirmations(invoice.tx_hash);
    
    if (confirmations >= REORG_SAFE_CONFIRMATIONS) {
      // Mark as finalized by updating confirmations
      await updateInvoice(invoice.invoice_id, {
        confirmations,
        confirmedAt: new Date(), // Mark final confirmation time
      });

      console.log(
        `[ReorgMonitor] Invoice ${invoice.invoice_id} reached finality with ${confirmations} confirmations`
      );

      return true;
    }

    return false;
  } catch (error) {
    console.error(`[ReorgMonitor] Error checking finality for invoice ${invoice.invoice_id}:`, error);
    return false;
  }
}

// =====================================================
// Main Monitor Function
// =====================================================

/**
 * Runs reorg monitoring cycle
 * Re-verifies all invoices with <12 confirmations
 * @returns Monitoring results
 */
export async function runReorgMonitor(): Promise<ReorgMonitorResult> {
  const startTime = Date.now();
  const result: ReorgMonitorResult = {
    checkedInvoices: 0,
    reVerifiedInvoices: 0,
    invalidatedInvoices: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log("[ReorgMonitor] Starting reorg monitoring cycle...");

    // Fetch invoices that need re-verification
    const invoices = await fetchInvoicesForReVerification();
    result.checkedInvoices = invoices.length;

    if (invoices.length === 0) {
      console.log("[ReorgMonitor] No invoices to re-verify.");
      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(
      `[ReorgMonitor] Re-verifying ${invoices.length} invoices with <${REORG_SAFE_CONFIRMATIONS} confirmations...`
    );

    // Re-verify each invoice
    for (const invoice of invoices) {
      try {
        // First check if invoice reached finality
        const isFinalized = await checkFinality(invoice);
        
        if (isFinalized) {
          // No need to re-verify finalized invoices
          result.reVerifiedInvoices++;
          continue;
        }

        // Re-verify payment if not yet finalized
        const isValid = await reVerifyInvoice(invoice);

        if (isValid) {
          result.reVerifiedInvoices++;
        } else {
          result.invalidatedInvoices++;
        }
      } catch (error) {
        result.errors.push({
          invoiceId: invoice.invoice_id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    result.duration = Date.now() - startTime;

    console.log(
      `[ReorgMonitor] Cycle completed in ${result.duration}ms:\n` +
      `  - Checked: ${result.checkedInvoices}\n` +
      `  - Re-verified: ${result.reVerifiedInvoices}\n` +
      `  - Invalidated: ${result.invalidatedInvoices}\n` +
      `  - Errors: ${result.errors.length}`
    );

    if (result.errors.length > 0) {
      console.error("[ReorgMonitor] Errors encountered:", result.errors);
    }

    return result;
  } catch (error) {
    console.error("[ReorgMonitor] Fatal error during monitoring cycle:", error);
    result.duration = Date.now() - startTime;
    result.errors.push({
      invoiceId: "N/A",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Runs reorg monitor in continuous loop
 * @param intervalMs - Interval between cycles (default: 5 minutes)
 */
export async function startReorgMonitorDaemon(intervalMs: number = 300000): Promise<void> {
  console.log(`[ReorgMonitor] Starting daemon with ${intervalMs / 1000}s interval...`);

  while (true) {
    try {
      await runReorgMonitor();
    } catch (error) {
      console.error("[ReorgMonitor] Daemon cycle failed:", error);
      // Continue running despite errors
    }

    // Wait for next cycle
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// =====================================================
// CLI Entry Point
// =====================================================

/**
 * CLI entry point for running as standalone script
 * Usage: node lib/payments/reorgMonitor.js [--daemon] [--interval=300000]
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDaemon = args.includes("--daemon");
  const intervalArg = args.find((arg) => arg.startsWith("--interval="));
  const interval = intervalArg ? parseInt(intervalArg.split("=")[1], 10) : 300000;

  if (isDaemon) {
    console.log("[ReorgMonitor] Starting in daemon mode...");
    startReorgMonitorDaemon(interval).catch((error) => {
      console.error("[ReorgMonitor] Daemon failed:", error);
      process.exit(1);
    });
  } else {
    console.log("[ReorgMonitor] Running single cycle...");
    runReorgMonitor()
      .then((result) => {
        console.log("[ReorgMonitor] Single cycle completed:", result);
        process.exit(0);
      })
      .catch((error) => {
        console.error("[ReorgMonitor] Single cycle failed:", error);
        process.exit(1);
      });
  }
}
