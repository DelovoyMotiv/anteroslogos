/**
 * @file lib/subscriptions/paymentDetector.ts
 * @description Automatic payment detection for subscription invoices
 * @standards Reuses chainWatcher pattern, USDC Transfer event parsing
 * 
 * **Feature: billing-system-enhancement, Task 2.2: Retry logic for blockchain RPC calls**
 * **Feature: billing-system-enhancement, Task 2.4: Enhanced error logging with Sentry**
 * **Validates: Requirements 4.1, 8.1, 8.5**
 */

import { getRpcProviderManager } from "../payments/rpcProvider";
import { USDC_ADDRESS_BASE } from "../payments/types";
import * as storage from "./storage";
import { activateSubscription } from "./manager";
import type { PublicClient } from "viem";
import { capturePaymentDetectionError, addBreadcrumb } from "../error-tracking";
import { getRedisCache, CacheTTL } from "../database/redisCache";
import { dispatchWebhookEvent } from "./webhooks";

// =====================================================
// Configuration
// =====================================================

const REQUIRED_CONFIRMATIONS = 2;
const BLOCKS_PER_24_HOURS = 7200; // Base L2: ~12s per block
const BLOCK_CACHE_KEY = "payment_detector:last_scanned_block";
const BLOCK_CACHE_TTL = CacheTTL.DAY; // 24 hours

// Parallel processing configuration
const MAX_CONCURRENT_VERIFICATIONS = 10;
const VERIFICATION_TIMEOUT_MS = 30000; // 30 seconds

// Retry configuration for RPC calls
const RPC_RETRY_CONFIG = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true,
};

// =====================================================
// Payment Detection
// =====================================================

/**
 * Process invoices in parallel with concurrency limit and timeout
 */
async function processInvoicesInParallel(
  invoices: Awaited<ReturnType<typeof storage.getPendingInvoices>>,
  currentBlock: bigint,
  blocksToScan: number,
  maxConcurrency: number
): Promise<Array<{
  invoiceId: string;
  detected: boolean;
  activated: boolean;
  error?: string;
}>> {
  const results: Array<{
    invoiceId: string;
    detected: boolean;
    activated: boolean;
    error?: string;
  }> = [];

  // Process in batches to limit concurrency
  for (let i = 0; i < invoices.length; i += maxConcurrency) {
    const batch = invoices.slice(i, i + maxConcurrency);
    
    // Process batch in parallel with timeout
    const batchResults = await Promise.all(
      batch.map(invoice => processInvoiceWithTimeout(invoice, currentBlock, blocksToScan))
    );
    
    results.push(...batchResults);
  }

  return results;
}

/**
 * Process single invoice with timeout
 */
async function processInvoiceWithTimeout(
  invoice: Awaited<ReturnType<typeof storage.getPendingInvoices>>[0],
  currentBlock: bigint,
  blocksToScan: number
): Promise<{
  invoiceId: string;
  detected: boolean;
  activated: boolean;
  error?: string;
}> {
  const result = {
    invoiceId: invoice.invoiceId,
    detected: false,
    activated: false,
    error: undefined as string | undefined,
  };

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Verification timeout')), VERIFICATION_TIMEOUT_MS);
    });

    // Race between verification and timeout
    const matchingTx = await Promise.race([
      findMatchingUSDCTransfer(
        invoice.recipientAddress,
        invoice.amount,
        currentBlock,
        blocksToScan,
        invoice.memoHash
      ),
      timeoutPromise,
    ]);

    if (matchingTx) {
      result.detected = true;
      console.log(`[PaymentDetector] Payment detected for invoice ${invoice.invoiceId}: tx ${matchingTx.txHash}`);

      // Verify confirmations
      const confirmations = Number(currentBlock - matchingTx.blockNumber);
      if (confirmations >= REQUIRED_CONFIRMATIONS) {
        // Activate subscription
        try {
          await activateSubscription(invoice.invoiceId, matchingTx.txHash);
          result.activated = true;
          console.log(`[PaymentDetector] Subscription activated for invoice ${invoice.invoiceId}`);
        } catch (error) {
          const errorMsg = `Activation failed: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[PaymentDetector] ${errorMsg}`, error);
          
          // Capture error with context (don't log sensitive data)
          capturePaymentDetectionError(
            error instanceof Error ? error : new Error(errorMsg),
            invoice.invoiceId,
            'activate_subscription',
            {
              txHash: matchingTx.txHash,
              confirmations,
              blockNumber: matchingTx.blockNumber.toString(),
            }
          );
          
          result.error = errorMsg;
        }
      } else {
        // Update invoice with tx_hash but don't activate yet
        await storage.updateSubscriptionInvoice(invoice.invoiceId, {
          txHash: matchingTx.txHash,
          blockNumber: matchingTx.blockNumber,
          confirmations,
        });
        console.log(`[PaymentDetector] Payment found but waiting for confirmations (${confirmations}/${REQUIRED_CONFIRMATIONS}) for invoice ${invoice.invoiceId}`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[PaymentDetector] Error processing invoice ${invoice.invoiceId}:`, error);
    
    // Capture error with context (filter sensitive data)
    capturePaymentDetectionError(
      error instanceof Error ? error : new Error(errorMsg),
      invoice.invoiceId,
      'process_invoice',
      {
        amount: invoice.amount,
        // Don't log recipient address or other sensitive data
      }
    );
    
    result.error = errorMsg;
  }

  return result;
}

/**
 * Scans pending subscription invoices for matching on-chain payments
 * Uses probabilistic matching via USDC Transfer events
 * Should be called from CRON job every 5 minutes
 * 
 * Features:
 * - Exponential backoff retry for failed RPC requests
 * - Automatic fallback to alternative RPC endpoints
 * - Circuit breaker pattern for persistent failures
 * - Comprehensive logging of retry attempts and outcomes
 * - Block range caching to avoid re-scanning
 * - Parallel processing with concurrency limit
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
    // Add breadcrumb for payment detection scan
    addBreadcrumb({
      type: 'default',
      category: 'payment_detection',
      message: 'Starting payment detection scan',
      level: 'info',
    });

    // Get all pending invoices
    const pendingInvoices = await storage.getPendingInvoices();
    results.scanned = pendingInvoices.length;

    if (pendingInvoices.length === 0) {
      addBreadcrumb({
        type: 'default',
        category: 'payment_detection',
        message: 'No pending invoices to scan',
        level: 'info',
      });
      return results;
    }

    // Get current block number with retry and circuit breaker
    const currentBlock = await executeRpcWithResilience(
      async (client) => await client.getBlockNumber(),
      "getBlockNumber"
    );

    // Get last scanned block from cache
    const cache = getRedisCache();
    const lastScannedBlock = await cache.get<string>(BLOCK_CACHE_KEY);
    const fromBlock = lastScannedBlock 
      ? BigInt(lastScannedBlock) 
      : currentBlock - BigInt(BLOCKS_PER_24_HOURS); // Fallback to 24h scan

    console.log(`[PaymentDetector] Scanning ${pendingInvoices.length} pending invoices from block ${fromBlock} to ${currentBlock}`);
    
    addBreadcrumb({
      type: 'default',
      category: 'payment_detection',
      message: 'Retrieved current block number',
      level: 'info',
      data: {
        currentBlock: currentBlock.toString(),
        fromBlock: fromBlock.toString(),
        lastScannedBlock: lastScannedBlock || 'cache_miss',
        pendingInvoices: pendingInvoices.length,
      },
    });

    // Calculate blocks to scan based on cached range
    const blocksToScan = Number(currentBlock - fromBlock);
    
    // Process invoices in parallel with concurrency limit
    const invoiceResults = await processInvoicesInParallel(
      pendingInvoices,
      currentBlock,
      blocksToScan,
      MAX_CONCURRENT_VERIFICATIONS
    );
    
    // Aggregate results
    for (const result of invoiceResults) {
      if (result.detected) {
        results.detected++;
      }
      if (result.activated) {
        results.activated++;
      }
      if (result.error) {
        results.errors.push({
          invoiceId: result.invoiceId,
          error: result.error,
        });
      }
    }

    // Update cache with current block number for next scan
    await cache.set(BLOCK_CACHE_KEY, currentBlock.toString(), { ttl: BLOCK_CACHE_TTL });
    
    console.log(`[PaymentDetector] Scan complete: ${results.detected} detected, ${results.activated} activated, ${results.errors.length} errors`);
    
    addBreadcrumb({
      type: 'default',
      category: 'payment_detection',
      message: 'Payment detection scan complete',
      level: results.errors.length > 0 ? 'warning' : 'info',
      data: {
        scanned: results.scanned,
        detected: results.detected,
        activated: results.activated,
        errors: results.errors.length,
        cachedBlock: currentBlock.toString(),
      },
    });
    
    return results;
  } catch (error) {
    const errorMsg = `Payment detection failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[PaymentDetector] ${errorMsg}`, error);
    
    // Capture critical error
    capturePaymentDetectionError(
      error instanceof Error ? error : new Error(errorMsg),
      'scan_all',
      'scan_subscription_payments',
      {}
    );
    
    throw new Error(errorMsg);
  }
}

/**
 * Finds USDC transfer matching invoice amount and recipient
 * Scans recent blocks for Transfer events
 * Uses retry logic with exponential backoff and circuit breaker
 * Parses transaction input data for memo hash matching
 */
async function findMatchingUSDCTransfer(
  recipientAddress: string,
  expectedAmount: number,
  currentBlock: bigint,
  blocksToScan: number,
  memoHash?: string
): Promise<{ txHash: string; blockNumber: bigint; memoMatch: boolean } | null> {
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
    // Get Transfer event logs for USDC contract with retry and circuit breaker
    // Transfer(address indexed from, address indexed to, uint256 value)
    // Topic 0: keccak256("Transfer(address,address,uint256)")
    const logs = await executeRpcWithResilience(
      async (client) => {
        return await client.getLogs({
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
      },
      `getLogs-${fromBlock}-${toBlock}`
    );

    // Collect matching transfers with memo information
    const matchingTransfers: Array<{
      txHash: string;
      blockNumber: bigint;
      memoMatch: boolean;
    }> = [];

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
        // Check for memo match in transaction input data
        let memoMatch = false;
        if (memoHash && log.transactionHash) {
          try {
            const tx = await executeRpcWithResilience(
              async (client) => await client.getTransaction({ hash: log.transactionHash as `0x${string}` }),
              `getTransaction-${log.transactionHash}`
            );
            
            // Parse transaction input data for memo hash
            // USDC transfer with memo: transfer(address,uint256) + memo data
            if (tx.input && tx.input.length > 10) {
              const inputData = tx.input.toLowerCase();
              const memoHashLower = memoHash.toLowerCase();
              
              // Check if memo hash appears in input data
              if (inputData.includes(memoHashLower.slice(2))) { // Remove 0x prefix
                memoMatch = true;
                console.log(`[PaymentDetector] Memo match found for tx ${log.transactionHash}`);
              }
            }
          } catch (error) {
            console.warn(`[PaymentDetector] Failed to parse transaction input for ${log.transactionHash}:`, error);
            // Continue without memo match
          }
        }

        console.log(`[PaymentDetector] Found matching transfer: tx=${log.transactionHash}, block=${log.blockNumber}, amount=${value}, memoMatch=${memoMatch}`);
        matchingTransfers.push({
          txHash: log.transactionHash || "",
          blockNumber: log.blockNumber || BigInt(0),
          memoMatch,
        });
      }
    }

    // Prioritize transfers with memo match
    const memoMatchTransfer = matchingTransfers.find(t => t.memoMatch);
    if (memoMatchTransfer) {
      console.log(`[PaymentDetector] Prioritizing memo-matched transfer: ${memoMatchTransfer.txHash}`);
      return memoMatchTransfer;
    }

    // Return first matching transfer if no memo match
    return matchingTransfers.length > 0 ? matchingTransfers[0] : null;
  } catch (error) {
    console.error(
      `[PaymentDetector] Error scanning blocks ${fromBlock}-${toBlock}:`,
      error
    );
    
    // Capture error (don't log recipient address or sensitive data)
    capturePaymentDetectionError(
      error instanceof Error ? error : new Error(String(error)),
      'block_scan',
      'find_matching_transfer',
      {
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        expectedAmount: expectedAmount,
        // Don't log recipient address
      }
    );
    
    throw error;
  }
}

/**
 * Check for stuck payments and send alerts
 * Queries invoices pending > 24 hours and sends webhook alerts
 * Should be called from CRON job periodically
 */
export async function alertStuckPayments(): Promise<{
  checked: number;
  alerted: number;
  errors: Array<{ invoiceId: string; error: string }>;
}> {
  const results = {
    checked: 0,
    alerted: 0,
    errors: [] as Array<{ invoiceId: string; error: string }>,
  };

  try {
    addBreadcrumb({
      type: 'default',
      category: 'payment_detection',
      message: 'Starting stuck payment alert check',
      level: 'info',
    });

    // Query invoices pending > 24 hours
    const stuckInvoices = await storage.getStuckInvoices(24); // 24 hours
    results.checked = stuckInvoices.length;

    if (stuckInvoices.length === 0) {
      console.log('[PaymentDetector] No stuck payments found');
      return results;
    }

    console.log(`[PaymentDetector] Found ${stuckInvoices.length} stuck payments`);

    // Send alert for each stuck invoice
    for (const invoice of stuckInvoices) {
      try {
        // Get user info for alert
        const subscription = await storage.getSubscriptionById(invoice.subscriptionId);
        if (!subscription) {
          console.warn(`[PaymentDetector] Subscription not found for invoice ${invoice.invoiceId}`);
          continue;
        }

        // Dispatch webhook event for stuck payment
        await dispatchWebhookEvent(
          invoice.userId,
          'payment.stuck',
          {
            invoiceId: invoice.invoiceId,
            subscriptionId: invoice.subscriptionId,
            userId: invoice.userId,
            amount: invoice.amount,
            token: invoice.token,
            recipientAddress: invoice.recipientAddress,
            memoHash: invoice.memoHash,
            createdAt: invoice.createdAt,
            expiresAt: invoice.expiresAt,
            hoursPending: Math.floor((Date.now() - new Date(invoice.createdAt).getTime()) / (1000 * 60 * 60)),
          }
        );

        results.alerted++;
        console.log(`[PaymentDetector] Alert sent for stuck payment: ${invoice.invoiceId}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[PaymentDetector] Failed to alert for invoice ${invoice.invoiceId}:`, error);
        
        capturePaymentDetectionError(
          error instanceof Error ? error : new Error(errorMsg),
          invoice.invoiceId,
          'alert_stuck_payment',
          {}
        );
        
        results.errors.push({
          invoiceId: invoice.invoiceId,
          error: errorMsg,
        });
      }
    }

    console.log(`[PaymentDetector] Stuck payment alerts complete: ${results.alerted} alerted, ${results.errors.length} errors`);
    
    addBreadcrumb({
      type: 'default',
      category: 'payment_detection',
      message: 'Stuck payment alert check complete',
      level: results.errors.length > 0 ? 'warning' : 'info',
      data: {
        checked: results.checked,
        alerted: results.alerted,
        errors: results.errors.length,
      },
    });

    return results;
  } catch (error) {
    const errorMsg = `Stuck payment alert check failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[PaymentDetector] ${errorMsg}`, error);
    
    capturePaymentDetectionError(
      error instanceof Error ? error : new Error(errorMsg),
      'alert_all',
      'alert_stuck_payments',
      {}
    );
    
    throw new Error(errorMsg);
  }
}

/**
 * Manual payment detection for specific invoice
 * Can be called from API endpoint for immediate verification
 * Uses retry logic with exponential backoff and circuit breaker
 */
export async function detectPaymentForInvoice(
  invoiceId: string
): Promise<{ detected: boolean; txHash?: string }> {
  console.log(`[PaymentDetector] Manual detection triggered for invoice ${invoiceId}`);
  
  addBreadcrumb({
    type: 'default',
    category: 'payment_detection',
    message: 'Manual payment detection triggered',
    level: 'info',
    data: {
      invoiceId,
    },
  });
  
  const invoice = await storage.getSubscriptionInvoice(invoiceId);
  if (!invoice) {
    const error = new Error(`Invoice ${invoiceId} not found`);
    capturePaymentDetectionError(
      error,
      invoiceId,
      'detect_payment_for_invoice',
      {}
    );
    throw error;
  }

  if (invoice.status !== "pending") {
    console.log(`[PaymentDetector] Invoice ${invoiceId} already ${invoice.status}`);
    addBreadcrumb({
      type: 'default',
      category: 'payment_detection',
      message: 'Invoice already processed',
      level: 'info',
      data: {
        invoiceId,
        status: invoice.status,
      },
    });
    return {
      detected: invoice.status === "paid",
      txHash: invoice.txHash,
    };
  }

  // Get current block number with retry and circuit breaker
  const currentBlock = await executeRpcWithResilience(
    async (client) => await client.getBlockNumber(),
    "getBlockNumber-manual"
  );

  const matchingTx = await findMatchingUSDCTransfer(
    invoice.recipientAddress,
    invoice.amount,
    currentBlock,
    100, // Check last 100 blocks for manual trigger
    invoice.memoHash
  );

  if (matchingTx) {
    const confirmations = Number(currentBlock - matchingTx.blockNumber);
    console.log(`[PaymentDetector] Payment found for invoice ${invoiceId}: tx=${matchingTx.txHash}, confirmations=${confirmations}`);

    if (confirmations >= REQUIRED_CONFIRMATIONS) {
      // Activate immediately
      await activateSubscription(invoice.invoiceId, matchingTx.txHash);
      console.log(`[PaymentDetector] Subscription activated for invoice ${invoiceId}`);
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
      console.log(`[PaymentDetector] Payment found but waiting for confirmations (${confirmations}/${REQUIRED_CONFIRMATIONS})`);
      return {
        detected: true,
        txHash: matchingTx.txHash,
      };
    }
  }

  console.log(`[PaymentDetector] No payment found for invoice ${invoiceId}`);
  return { detected: false };
}

// =====================================================
// Resilience Helpers
// =====================================================

/**
 * Execute RPC operation with retry, circuit breaker, and fallback
 * 
 * Features:
 * - Exponential backoff retry (5 attempts, 2s base delay, 30s max)
 * - Automatic fallback to alternative RPC endpoints
 * - Circuit breaker pattern for persistent failures
 * - Comprehensive logging of retry attempts and outcomes
 * 
 * @param operation - RPC operation to execute
 * @param operationName - Name for logging purposes
 * @returns Promise resolving to operation result
 */
async function executeRpcWithResilience<T>(
  operation: (client: any) => Promise<T>,
  operationName: string
): Promise<T> {
  const rpcManager = getRpcProviderManager();
  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt < RPC_RETRY_CONFIG.maxAttempts) {
    try {
      // Log retry attempt
      if (attempt > 0) {
        console.log(`[PaymentDetector] Retry attempt ${attempt}/${RPC_RETRY_CONFIG.maxAttempts} for ${operationName}`);
      }

      // Execute with circuit breaker and retry
      const result = await rpcManager.executeWithResilience(operation);
      
      // Log success after retry
      if (attempt > 0) {
        console.log(`[PaymentDetector] ${operationName} succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      // Log failure
      console.error(
        `[PaymentDetector] ${operationName} failed (attempt ${attempt}/${RPC_RETRY_CONFIG.maxAttempts}):`,
        lastError.message
      );

      // If this was the last attempt, throw
      if (attempt >= RPC_RETRY_CONFIG.maxAttempts) {
        console.error(`[PaymentDetector] ${operationName} failed after ${attempt} attempts, giving up`);
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateBackoffDelay(attempt);
      console.log(`[PaymentDetector] Waiting ${delay}ms before retry...`);
      
      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error(`${operationName} failed after ${RPC_RETRY_CONFIG.maxAttempts} attempts`);
}

/**
 * Calculate exponential backoff delay with jitter
 * 
 * @param attempt - Current attempt number (1-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  // Calculate exponential backoff: baseDelay * (exponentialBase ^ (attempt - 1))
  let delay = Math.min(
    RPC_RETRY_CONFIG.baseDelay * Math.pow(RPC_RETRY_CONFIG.exponentialBase, attempt - 1),
    RPC_RETRY_CONFIG.maxDelay
  );

  // Add jitter: multiply by random value between 0.5 and 1.0
  if (RPC_RETRY_CONFIG.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
