/**
 * @file lib/subscriptions/paymentDetector.ts
 * @description Automatic payment detection for subscription invoices
 * @standards Reuses chainWatcher pattern, USDC Transfer event parsing
 */

import { getRpcClient } from "../payments/rpcProvider";
import { USDC_ADDRESS_BASE } from "../payments/types";
import * as storage from "./storage";
import { activateSubscription } from "./manager";

// =====================================================
// Configuration
// =====================================================

const REQUIRED_CONFIRMATIONS = 2;

// =====================================================
// Payment Detection
// =====================================================

/**
 * Scans pending subscription invoices for matching on-chain payments
 * Uses probabilistic matching via USDC Transfer events
 * Should be called from CRON job every 5 minutes
 */
export async function scanSubscriptionPayments(): Promise<{
  scanned: number;
  detected: number;
  activated: number;
  errors: Array<{ invoiceId: string; error: string }>;
}> {
  const results = {
    scanned: 0,
    detected: 0,
    activated: 0,
    errors: [] as Array<{ invoiceId: string; error: string }>,
  };

  try {
    // Get all pending invoices
    const pendingInvoices = await storage.getPendingInvoices();
    results.scanned = pendingInvoices.length;

    if (pendingInvoices.length === 0) {
      return results;
    }

    // Get RPC client
    const publicClient = getRpcClient();
    const currentBlock = await publicClient.getBlockNumber();

    // Process each invoice
    for (const invoice of pendingInvoices) {
      try {
        // Check recent blocks for matching USDC transfer
        const matchingTx = await findMatchingUSDCTransfer(
          invoice.recipientAddress,
          invoice.amount,
          currentBlock,
          50 // Check last 50 blocks (~2.5 minutes on Base)
        );

        if (matchingTx) {
          results.detected++;

          // Verify confirmations
          const confirmations = Number(currentBlock - matchingTx.blockNumber);
          if (confirmations >= REQUIRED_CONFIRMATIONS) {
            // Activate subscription
            try {
              await activateSubscription(invoice.invoiceId, matchingTx.txHash);
              results.activated++;
            } catch (error) {
              results.errors.push({
                invoiceId: invoice.invoiceId,
                error: `Activation failed: ${error instanceof Error ? error.message : String(error)}`,
              });
            }
          } else {
            // Update invoice with tx_hash but don't activate yet
            await storage.updateSubscriptionInvoice(invoice.invoiceId, {
              txHash: matchingTx.txHash,
              blockNumber: matchingTx.blockNumber,
              confirmations,
            });
          }
        }
      } catch (error) {
        results.errors.push({
          invoiceId: invoice.invoiceId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(
      `Payment detection failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Finds USDC transfer matching invoice amount and recipient
 * Scans recent blocks for Transfer events
 */
async function findMatchingUSDCTransfer(
  recipientAddress: string,
  expectedAmount: number,
  currentBlock: bigint,
  blocksToScan: number
): Promise<{ txHash: string; blockNumber: bigint } | null> {
  const publicClient = getRpcClient();

  // Calculate block range
  const fromBlock = currentBlock - BigInt(blocksToScan);
  const toBlock = currentBlock;

  // Expected amount in USDC units (6 decimals)
  const expectedAmountWei = BigInt(Math.floor(expectedAmount * 1e6));

  // Tolerance: ±0.01 USDC (10000 units)
  const tolerance = BigInt(10000);
  const minAmount = expectedAmountWei - tolerance;
  const maxAmount = expectedAmountWei + tolerance;

  try {
    // Get Transfer event logs for USDC contract
    // Transfer(address indexed from, address indexed to, uint256 value)
    // Topic 0: keccak256("Transfer(address,address,uint256)")
    const logs = await publicClient.getLogs({
      address: USDC_ADDRESS_BASE as `0x${string}`,
      event: {
        type: "event",
        name: "Transfer",
        inputs: [
          { type: "address", indexed: true, name: "from" },
          { type: "address", indexed: true, name: "to" },
          { type: "uint256", indexed: false, name: "value" },
        ],
      },
      fromBlock,
      toBlock,
    });

    // Filter for transfers to recipient address
    for (const log of logs) {
      const to = log.topics[2];
      if (!to) continue;

      // Extract address from topic (last 40 hex chars after 0x)
      const toAddress = `0x${to.slice(-40)}`.toLowerCase();
      if (toAddress !== recipientAddress.toLowerCase()) {
        continue;
      }

      // Parse value from log data
      const value = BigInt(log.data);

      // Check if amount matches within tolerance
      if (value >= minAmount && value <= maxAmount) {
        return {
          txHash: log.transactionHash || "",
          blockNumber: log.blockNumber || BigInt(0),
        };
      }
    }

    return null;
  } catch (error) {
    console.error(
      `Error scanning blocks ${fromBlock}-${toBlock}:`,
      error
    );
    throw error;
  }
}

/**
 * Manual payment detection for specific invoice
 * Can be called from API endpoint for immediate verification
 */
export async function detectPaymentForInvoice(
  invoiceId: string
): Promise<{ detected: boolean; txHash?: string }> {
  const invoice = await storage.getSubscriptionInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  if (invoice.status !== "pending") {
    return {
      detected: invoice.status === "paid",
      txHash: invoice.txHash,
    };
  }

  const publicClient = getRpcClient();
  const currentBlock = await publicClient.getBlockNumber();

  const matchingTx = await findMatchingUSDCTransfer(
    invoice.recipientAddress,
    invoice.amount,
    currentBlock,
    100 // Check last 100 blocks for manual trigger
  );

  if (matchingTx) {
    const confirmations = Number(currentBlock - matchingTx.blockNumber);

    if (confirmations >= REQUIRED_CONFIRMATIONS) {
      // Activate immediately
      await activateSubscription(invoice.invoiceId, matchingTx.txHash);
      return {
        detected: true,
        txHash: matchingTx.txHash,
      };
    } else {
      // Update invoice but don't activate yet
      await storage.updateSubscriptionInvoice(invoice.invoiceId, {
        txHash: matchingTx.txHash,
        blockNumber: matchingTx.blockNumber,
        confirmations,
      });
      return {
        detected: true,
        txHash: matchingTx.txHash,
      };
    }
  }

  return { detected: false };
}
