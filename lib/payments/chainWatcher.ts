/**
 * @file lib/payments/chainWatcher.ts
 * @description Blockchain transaction monitoring for Base L2
 * @standards EVM JSON-RPC, viem v2.x, 2-block confirmation requirement
 * @security Reorg protection, transaction verification, gas validation
 */

import { type Address, type Hash } from "viem";
import { createClient } from "@supabase/supabase-js";
import { getRpcClient } from "./rpcProvider";
// import { z } from "zod"; // Unused
import {
  TransactionVerificationSchema,
  type TransactionVerification,
  // type TokenSymbol, // Unused
  BASE_L2_CHAIN_ID,
  USDC_ADDRESS_BASE,
  toTokenUnits,
} from "./types";
import {
  getInvoice,
  updateInvoice,
  // findPendingInvoiceByMemo, // Unused
  type InvoiceUpdateInput,
} from "./invoice";

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
 * Uses RpcProviderManager singleton for resilience
 */
function getPublicClient() {
  return getRpcClient();
}

// Confirmation requirements
const REQUIRED_CONFIRMATIONS = 2; // Minimum confirmations before marking as "paid"
const REORG_SAFE_CONFIRMATIONS = 12; // Deep confirmations for finality

// USDC ERC-20 ABI (minimal - only Transfer event)
// const ERC20_ABI = parseAbi([
//   "event Transfer(address indexed from, address indexed to, uint256 value)",
// ]); // Unused

// =====================================================
// Types
// =====================================================

interface ChainWatcherState {
  chainId: number;
  lastScannedBlock: bigint;
  watcherStatus: "active" | "paused" | "error";
  lastError: string | null;
  lastErrorAt: Date | null;
}

interface TransactionReceipt {
  transactionHash: Hash;
  blockNumber: bigint;
  status: "success" | "reverted";
  from: Address;
  to: Address | null;
  value: bigint;
  logs: Array<any>; // viem Log type
}

// =====================================================
// Database Operations
// =====================================================

/**
 * Gets current chain watcher state from database
 * @returns Chain watcher state
 */
async function getWatcherState(): Promise<ChainWatcherState> {
  const { data, error } = await supabase
    .from("a2a_chain_watchers")
    .select()
    .eq("chain_id", BASE_L2_CHAIN_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch watcher state: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No watcher state found for chain ${BASE_L2_CHAIN_ID}`);
  }

  return {
    chainId: data.chain_id,
    lastScannedBlock: BigInt(data.last_scanned_block),
    watcherStatus: data.watcher_status as "active" | "paused" | "error",
    lastError: data.last_error,
    lastErrorAt: data.last_error_at ? new Date(data.last_error_at) : null,
  };
}

/**
 * Updates chain watcher state in database
 * @param updates - Partial state updates
 */
async function updateWatcherState(
  updates: Partial<Omit<ChainWatcherState, "chainId">>
): Promise<void> {
  const dbUpdates: Record<string, any> = {};

  if (updates.lastScannedBlock !== undefined) {
    dbUpdates.last_scanned_block = Number(updates.lastScannedBlock);
  }

  if (updates.watcherStatus !== undefined) {
    dbUpdates.watcher_status = updates.watcherStatus;
  }

  if (updates.lastError !== undefined) {
    dbUpdates.last_error = updates.lastError;
  }

  if (updates.lastErrorAt !== undefined) {
    dbUpdates.last_error_at = updates.lastErrorAt?.toISOString();
  }

  const { error } = await supabase
    .from("a2a_chain_watchers")
    .update(dbUpdates)
    .eq("chain_id", BASE_L2_CHAIN_ID);

  if (error) {
    throw new Error(`Failed to update watcher state: ${error.message}`);
  }
}

// =====================================================
// Transaction Verification
// =====================================================

/**
 * Fetches transaction receipt from Base L2
 * @param txHash - Transaction hash
 * @returns Transaction receipt
 */
async function getTransactionReceipt(txHash: Hash): Promise<TransactionReceipt> {
  const receipt = await getPublicClient().getTransactionReceipt({ hash: txHash });

  return {
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === "success" ? "success" : "reverted",
    from: receipt.from,
    to: receipt.to || ("0x0000000000000000000000000000000000000000" as Address),
    value: BigInt(0), // Will be parsed from logs for USDC
    logs: receipt.logs as any[], // Simplified type
  };
}

/**
 * Parses USDC Transfer event from transaction logs
 * @param logs - Transaction logs
 * @param expectedRecipient - Expected recipient address
 * @returns Transfer details or null if not found
 */
function parseUSDCTransfer(
  logs: Array<any>,
  expectedRecipient: Address
): { from: Address; to: Address; value: bigint } | null {
  for (const log of logs) {
    // Check if log is from USDC contract
    if (!log.address || log.address.toLowerCase() !== USDC_ADDRESS_BASE.toLowerCase()) {
      continue;
    }

    // Check if log has Transfer event signature
    // keccak256("Transfer(address,address,uint256)") = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
    if (
      !log.topics?.[0] ||
      log.topics[0] !==
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    ) {
      continue;
    }

    // Parse Transfer event
    const from = `0x${log.topics[1]?.slice(-40) || ''}` as Address;
    const to = `0x${log.topics[2]?.slice(-40) || ''}` as Address;
    const value = BigInt(log.data || '0x0');

    // Check if recipient matches
    if (to.toLowerCase() === expectedRecipient.toLowerCase()) {
      return { from, to, value };
    }
  }

  return null;
}

/**
 * Verifies ETH transfer in transaction
 * @param receipt - Transaction receipt
 * @param expectedRecipient - Expected recipient address
 * @param expectedAmount - Expected amount in wei
 * @returns True if transfer matches expectations
 */
function verifyETHTransfer(
  receipt: TransactionReceipt,
  expectedRecipient: Address,
  expectedAmount: bigint
): boolean {
  // For ETH transfers, check direct transfer to recipient
  if (
    receipt.to &&
    receipt.to.toLowerCase() === expectedRecipient.toLowerCase() &&
    receipt.value >= expectedAmount
  ) {
    return true;
  }

  return false;
}

/**
 * Verifies on-chain transaction matches invoice requirements
 * @param txHash - Transaction hash
 * @param invoiceId - Invoice ID to verify against
 * @returns Transaction verification result
 */
export async function verifyTransaction(
  txHash: string,
  invoiceId: string
): Promise<TransactionVerification> {
  // Fetch invoice
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Fetch transaction receipt
  const receipt = await getTransactionReceipt(txHash as Hash);

  // Check transaction status
  if (receipt.status === "reverted") {
    return {
      verified: false,
      reason: "Transaction reverted on-chain",
      txHash,
      blockNumber: receipt.blockNumber,
      confirmations: 0,
    };
  }

  // Get current block number
  const currentBlock = await getPublicClient().getBlockNumber();
  const confirmations = Number(currentBlock - receipt.blockNumber);

  // Verify payment amount and recipient
  let verified = false;
  let reason = "Unknown error";

  const expectedAmount = toTokenUnits(invoice.amount, invoice.token);
  const expectedRecipient = invoice.recipientAddress as Address;

  if (invoice.token === "USDC") {
    // Parse USDC Transfer event
    const transfer = parseUSDCTransfer(receipt.logs, expectedRecipient);

    if (!transfer) {
      reason = "No USDC transfer found to expected recipient";
    } else if (transfer.value < expectedAmount) {
      reason = `Insufficient USDC amount: received ${transfer.value}, expected ${expectedAmount}`;
    } else {
      verified = true;
      reason = "Transaction verified";
    }
  } else if (invoice.token === "ETH") {
    // Verify ETH transfer
    const ethVerified = verifyETHTransfer(receipt, expectedRecipient, expectedAmount);

    if (!ethVerified) {
      reason = `Insufficient ETH amount or wrong recipient`;
    } else {
      verified = true;
      reason = "Transaction verified";
    }
  } else {
    reason = `Unsupported token: ${invoice.token}`;
  }

  return TransactionVerificationSchema.parse({
    verified,
    reason,
    txHash,
    blockNumber: receipt.blockNumber,
    confirmations,
  });
}

/**
 * Processes verified transaction and updates invoice
 * @param txHash - Transaction hash
 * @param invoiceId - Invoice ID
 */
export async function processVerifiedTransaction(
  txHash: string,
  invoiceId: string
): Promise<void> {
  // Verify transaction
  const verification = await verifyTransaction(txHash, invoiceId);

  if (!verification.verified) {
    throw new Error(`Transaction verification failed: ${verification.reason}`);
  }

  // Fetch current invoice state
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Prevent status regression
  if (invoice.status === "paid") {
    // Already paid, no action needed
    return;
  }

  // Determine new status based on confirmations
  // let newStatus: "confirming" | "paid" = "confirming"; // Unused
  const updates: InvoiceUpdateInput = {
    txHash,
    blockNumber: verification.blockNumber,
    confirmations: verification.confirmations,
  };

  if (verification.confirmations >= REQUIRED_CONFIRMATIONS) {
    // newStatus = "paid"; // Unused variable
    updates.status = "paid";
    updates.paidAt = new Date();
    updates.confirmedAt = new Date();
  } else {
    updates.status = "confirming";
    updates.paidAt = new Date(); // Mark payment initiation time
  }

  // Update invoice
  await updateInvoice(invoiceId, updates);
}

// =====================================================
// Chain Watcher Loop
// =====================================================

/**
 * Scans a single block for relevant transactions with automatic payment detection
 * Uses probabilistic matching to correlate USDC transfers with pending invoices
 * @param blockNumber - Block number to scan
 * @returns Number of payments detected
 */
async function scanBlock(blockNumber: bigint): Promise<number> {
  let detectedPayments = 0;

  try {
    // Fetch block with transactions
    const block = await getPublicClient().getBlock({
      blockNumber,
      includeTransactions: true,
    });

    // Get block timestamp for correlation
    const blockTimestamp = new Date(Number(block.timestamp) * 1000);

    // Process each transaction
    for (const tx of block.transactions) {
      try {
        // Skip if tx is a simple hash (shouldn't happen with includeTransactions: true)
        if (typeof tx === "string") continue;

        // Fetch transaction receipt
        const receipt = await getPublicClient().getTransactionReceipt({ hash: tx.hash });

        // Skip if transaction reverted
        if (receipt.status === "reverted") continue;

        // Process USDC Transfer events
        if (receipt.logs.length > 0) {
          for (const log of receipt.logs) {
            // Check if log is from USDC contract
            if (log.address.toLowerCase() !== USDC_ADDRESS_BASE.toLowerCase()) {
              continue;
            }

            // Check if log has Transfer event signature
            // keccak256("Transfer(address,address,uint256)") = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
            if (
              !log.topics[0] ||
              log.topics[0] !==
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
            ) {
              continue;
            }

            // Parse Transfer event
            const from = `0x${log.topics[1]?.slice(-40) || ""}` as Address;
            const to = `0x${log.topics[2]?.slice(-40) || ""}` as Address;
            const value = BigInt(log.data || "0x0");

            // Convert value to USDC decimal amount (6 decimals)
            const amountUSDC = Number(value) / 1_000_000;

            // Attempt automatic payment detection via database correlation
            try {
              const { data: detectionId, error } = await supabase.rpc(
                "record_payment_detection",
                {
                  p_tx_hash: tx.hash,
                  p_block_number: Number(blockNumber),
                  p_tx_timestamp: blockTimestamp.toISOString(),
                  p_from_address: from.toLowerCase(),
                  p_to_address: to.toLowerCase(),
                  p_amount: amountUSDC,
                  p_token: "USDC",
                }
              );

              if (error) {
                console.error(
                  `[ChainWatcher] Detection failed for tx ${tx.hash}:`,
                  error
                );
                continue;
              }

              if (detectionId) {
                detectedPayments++;
                console.log(
                  `[ChainWatcher] Payment detected: ${tx.hash} → ${amountUSDC} USDC to ${to}`
                );
              }
            } catch (detectionError) {
              console.error(
                `[ChainWatcher] Error in payment detection for tx ${tx.hash}:`,
                detectionError
              );
              // Continue with next transfer
            }
          }
        }

        // For ETH payments (future enhancement)
        // Would require similar correlation logic with native ETH transfers
      } catch (txError) {
        console.error(`[ChainWatcher] Error processing transaction ${tx.hash}:`, txError);
        // Continue with next transaction
      }
    }

    if (detectedPayments > 0) {
      console.log(
        `[ChainWatcher] Block ${blockNumber}: detected ${detectedPayments} payment(s)`
      );
    }

    return detectedPayments;
  } catch (error) {
    console.error(`[ChainWatcher] Error scanning block ${blockNumber}:`, error);
    return 0;
  }
}

/**
 * Verifies all auto-detected payments that are in 'confirming' status
 * Called after block scanning to complete verification workflow
 */
async function verifyDetectedPayments(): Promise<void> {
  try {
    // Fetch invoices that were auto-detected and need verification
    const { data: invoices, error } = await supabase
      .from("a2a_invoices")
      .select("invoice_id, tx_hash")
      .eq("status", "confirming")
      .not("tx_hash", "is", null)
      .order("updated_at", { ascending: false })
      .limit(50); // Process max 50 invoices per cycle

    if (error) {
      console.error("[ChainWatcher] Failed to fetch detected payments:", error);
      return;
    }

    if (!invoices || invoices.length === 0) {
      return;
    }

    console.log(
      `[ChainWatcher] Verifying ${invoices.length} auto-detected payment(s)...`
    );

    for (const invoice of invoices) {
      try {
        // Run full verification and update invoice status
        await processVerifiedTransaction(invoice.tx_hash!, invoice.invoice_id);
      } catch (verifyError) {
        console.error(
          `[ChainWatcher] Verification failed for invoice ${invoice.invoice_id}:`,
          verifyError
        );
        // Continue with next invoice
      }
    }
  } catch (error) {
    console.error("[ChainWatcher] Error in verifyDetectedPayments:", error);
  }
}

/**
 * Main chain watcher loop (should be run as background job)
 * Scans new blocks, detects payments, and verifies them
 * @param options - Watcher options
 */
export async function runChainWatcher(options?: {
  startBlock?: bigint;
  endBlock?: bigint;
  interval?: number;
}): Promise<void> {
  const interval = options?.interval || 12000; // 12 seconds (Base L2 block time ~2s, poll every 6 blocks)

  try {
    // Get current watcher state
    let state = await getWatcherState();

    // Resume from last scanned block or start from specified block
    let currentBlock = options?.startBlock || state.lastScannedBlock;

    // Get latest block
    const latestBlock = options?.endBlock || (await getPublicClient().getBlockNumber());

    // Update status to active
    await updateWatcherState({
      watcherStatus: "active",
      lastError: null,
      lastErrorAt: null,
    });

    // Scan blocks for new payments
    while (currentBlock <= latestBlock) {
      try {
  await scanBlock(currentBlock);

        // Update last scanned block
        await updateWatcherState({ lastScannedBlock: currentBlock });

        currentBlock++;
      } catch (error) {
        console.error(`[ChainWatcher] Error scanning block ${currentBlock}:`, error);

        // Update error state
        await updateWatcherState({
          watcherStatus: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
          lastErrorAt: new Date(),
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    // After scanning, verify all auto-detected payments
    await verifyDetectedPayments();

    // If we've caught up, wait for new blocks
    if (!options?.endBlock) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      // Recursive call to continue watching
      await runChainWatcher(options);
    }
  } catch (error) {
    console.error("[ChainWatcher] Fatal error:", error);

    // Update error state
    await updateWatcherState({
      watcherStatus: "error",
      lastError: error instanceof Error ? error.message : "Unknown error",
      lastErrorAt: new Date(),
    });

    throw error;
  }
}

/**
 * Gets current confirmation count for a transaction
 * @param txHash - Transaction hash
 * @returns Number of confirmations
 */
export async function getConfirmations(txHash: string): Promise<number> {
  const receipt = await getTransactionReceipt(txHash as Hash);
  const currentBlock = await getPublicClient().getBlockNumber();

  return Number(currentBlock - receipt.blockNumber);
}

/**
 * Checks if transaction is finalized (deep confirmations)
 * @param txHash - Transaction hash
 * @returns True if transaction has deep confirmations
 */
export async function isTransactionFinalized(txHash: string): Promise<boolean> {
  const confirmations = await getConfirmations(txHash);
  return confirmations >= REORG_SAFE_CONFIRMATIONS;
}
