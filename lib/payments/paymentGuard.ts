/**
 * @file lib/payments/paymentGuard.ts
 * @description Middleware for A2A API payment enforcement
 * @standards JSON-RPC 2.0 error codes, HTTP 402 Payment Required
 * @security Invoice verification, balance deduction atomicity, rate limiting
 */

// import { z } from "zod"; // Unused
// Using standard Request instead of NextRequest for compatibility
// import type { NextRequest } from "next/server";
import { createInvoice, getInvoice, type Invoice } from "./invoice";
import { /* verifyTransaction, */ processVerifiedTransaction } from "./chainWatcher";
import { getUserBalance, debitBalance } from "./ledger";
// import { getWalletForUser } from "./wallet"; // Unused
import type { TokenSymbol } from "./types";
import { PRICING_MATRIX } from "./types";

// =====================================================
// Types
// =====================================================

export interface PaymentContext {
  userId: string;
  agentId?: string;
  method: string;
  params: unknown;
  tier: "free" | "basic" | "pro";
  preferredToken: TokenSymbol;
}

export interface PaymentResult {
  success: boolean;
  requiresPayment: boolean;
  mode: PaymentMode;
  invoice?: Invoice;
  error?: string;
  errorCode?: string;
}

export type PaymentMode = "pay-per-request" | "pre-deposit" | "free";

// =====================================================
// Payment Mode Detection
// =====================================================

/**
 * Determines payment mode based on method pricing and user tier
 * @param method - JSON-RPC method name
 * @param tier - User tier
 * @returns Payment mode
 */
function determinePaymentMode(
  method: string,
  tier: "free" | "basic" | "pro"
): PaymentMode {
  const methodPricing = PRICING_MATRIX[method];
  
  // Method not in pricing matrix = free
  if (!methodPricing) {
    return "free";
  }

  const price = methodPricing[tier];
  
  // Price is 0 = free
  if (price === 0) {
    return "free";
  }

  // Non-zero price = requires payment
  // Default to pre-deposit for better UX (agents can switch to pay-per-request if preferred)
  return "pre-deposit";
}

// =====================================================
// Payment Enforcement
// =====================================================

/**
 * Validates payment for an A2A method call
 * 
 * Flow:
 * 1. Check if method requires payment
 * 2. If free, allow immediately
 * 3. If requires payment:
 *    a. Check if user has sufficient balance (pre-deposit)
 *    b. If yes, debit balance and allow
 *    c. If no, check if invoice_id or tx_hash provided (pay-per-request)
 *    d. Verify payment and allow
 * 
 * @param context - Payment context
 * @param invoiceId - Optional invoice ID (pay-per-request mode)
 * @param txHash - Optional transaction hash (pay-per-request mode)
 * @returns Payment result
 */
export async function enforcePayment(
  context: PaymentContext,
  invoiceId?: string,
  txHash?: string
): Promise<PaymentResult> {
  const { userId, agentId, method, params, tier, preferredToken } = context;

  // Determine payment mode
  const paymentMode = determinePaymentMode(method, tier);

  // Free methods pass immediately
  if (paymentMode === "free") {
    return {
      success: true,
      requiresPayment: false,
      mode: "free",
    };
  }

  // Get method price
  const methodPricing = PRICING_MATRIX[method];
  if (!methodPricing) {
    throw new Error(`No pricing configured for method: ${method}`);
  }

  const price = methodPricing[tier];

  // === PRE-DEPOSIT MODE ===
  // Try to debit from user balance first
  try {
    const balance = await getUserBalance(userId, preferredToken);

    if (balance >= price) {
      // Sufficient balance - debit and proceed
      await debitBalance({
        userId,
        amount: price,
        token: preferredToken,
        referenceType: "usage_event",
        description: `A2A method call: ${method}`,
      });

      return {
        success: true,
        requiresPayment: false,
        mode: "pre-deposit",
      };
    }
  } catch (error) {
    // Balance check failed - fall through to pay-per-request
    console.warn(`Balance check failed for user ${userId}:`, error);
  }

  // === PAY-PER-REQUEST MODE ===
  // If insufficient balance, check for invoice_id or tx_hash

  // Case 1: No payment info provided - generate invoice
  if (!invoiceId && !txHash) {
    const invoice = await createInvoice({
      userId,
      agentId,
      method,
      params,
      tier,
      token: preferredToken,
      ttlSeconds: 3600, // 1 hour expiration
    });

    return {
      success: false,
      requiresPayment: true,
      mode: "pay-per-request",
      invoice,
      errorCode: "PAYMENT_REQUIRED",
      error: `Payment required: ${price} ${preferredToken}. Pay invoice: ${invoice.invoiceId}`,
    };
  }

  // Case 2: Invoice ID provided - verify invoice status
  if (invoiceId) {
    const invoice = await getInvoice(invoiceId);
    
    if (!invoice) {
      return {
        success: false,
        requiresPayment: true,
        mode: "pay-per-request",
        errorCode: "INVOICE_NOT_FOUND",
        error: `Invoice not found: ${invoiceId}`,
      };
    }

    // Check if invoice matches request context
    if (invoice.userId !== userId) {
      return {
        success: false,
        requiresPayment: true,
        mode: "pay-per-request",
        errorCode: "INVOICE_USER_MISMATCH",
        error: "Invoice belongs to different user",
      };
    }

    if (invoice.method !== method) {
      return {
        success: false,
        requiresPayment: true,
        mode: "pay-per-request",
        errorCode: "INVOICE_METHOD_MISMATCH",
        error: `Invoice is for method ${invoice.method}, not ${method}`,
      };
    }

    // Check invoice status
    if (invoice.status === "expired") {
      return {
        success: false,
        requiresPayment: true,
        mode: "pay-per-request",
        invoice,
        errorCode: "INVOICE_EXPIRED",
        error: "Invoice has expired. Please create a new invoice.",
      };
    }

    if (invoice.status === "pending") {
      return {
        success: false,
        requiresPayment: true,
        mode: "pay-per-request",
        invoice,
        errorCode: "PAYMENT_PENDING",
        error: `Payment pending. Please pay invoice: ${invoiceId}`,
      };
    }

    if (invoice.status === "confirming") {
      return {
        success: false,
        requiresPayment: true,
        mode: "pay-per-request",
        invoice,
        errorCode: "PAYMENT_CONFIRMING",
        error: "Payment is being confirmed on-chain. Please wait.",
      };
    }

    if (invoice.status === "paid") {
      // Invoice paid - allow request
      return {
        success: true,
        requiresPayment: false,
        mode: "pay-per-request",
        invoice,
      };
    }

    // Unexpected status
    return {
      success: false,
      requiresPayment: true,
      mode: "pay-per-request",
      invoice,
      errorCode: "INVOICE_INVALID_STATUS",
      error: `Invalid invoice status: ${invoice.status}`,
    };
  }

  // Case 3: Transaction hash provided - verify transaction
  if (txHash) {
    // First, try to find invoice by txHash (if it exists)
    // This prevents duplicate processing of same transaction
    let invoice: Invoice | null = null;

    try {
      // Check if we have an invoice for this tx
      const { getInvoiceByTransaction } = await import("./invoice");
      invoice = await getInvoiceByTransaction(txHash);
    } catch {
      // Invoice not found by txHash - need to create one and verify
    }

    // If no invoice found, create one for this request
    if (!invoice) {
      invoice = await createInvoice({
        userId,
        agentId,
        method,
        params,
        tier,
        token: preferredToken,
        ttlSeconds: 3600,
      });
    }

    // Verify and process transaction
    try {
      await processVerifiedTransaction(txHash, invoice.invoiceId);

      // Fetch updated invoice
      invoice = await getInvoice(invoice.invoiceId);

      if (invoice && invoice.status === "paid") {
        return {
          success: true,
          requiresPayment: false,
          mode: "pay-per-request",
          invoice,
        };
      } else {
        return {
          success: false,
          requiresPayment: true,
          mode: "pay-per-request",
          invoice: invoice || undefined,
          errorCode: "PAYMENT_VERIFICATION_PENDING",
          error: "Payment verification in progress. Please wait.",
        };
      }
    } catch (error) {
      return {
        success: false,
        requiresPayment: true,
        mode: "pay-per-request",
        invoice: invoice || undefined,
        errorCode: "PAYMENT_VERIFICATION_FAILED",
        error: `Payment verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // Should never reach here
  return {
    success: false,
    requiresPayment: true,
    mode: "pay-per-request",
    errorCode: "INTERNAL_ERROR",
    error: "Internal payment enforcement error",
  };
}

// =====================================================
// Middleware Factory
// =====================================================

/**
 * Creates a payment guard middleware for Next.js API routes
 * 
 * Usage:
 * ```ts
 * export const POST = withPaymentGuard(async (req, context) => {
 *   // Your handler logic
 * });
 * ```
 * 
 * @param handler - API route handler
 * @returns Wrapped handler with payment enforcement
 */
export function withPaymentGuard<T>(
  handler: (req: Request, context: PaymentContext) => Promise<T>
) {
  return async (req: Request): Promise<T | Response> => {
    try {
      // Parse JSON-RPC request
      const body = await req.json();
      const method = body.method;
      const params = body.params;

      // Extract payment context from request
      // This assumes authentication middleware has already run
      // and attached user info to request headers or context

      // TODO: Extract from auth context (implementation depends on auth middleware)
      const userId = req.headers.get("x-user-id");
      const agentId = req.headers.get("x-agent-id") || undefined;
      const tier = (req.headers.get("x-user-tier") as "free" | "basic" | "pro") || "free";
      const preferredToken = (req.headers.get("x-preferred-token") as TokenSymbol) || "USDC";

      if (!userId) {
        return Response.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Authentication required",
            },
            id: body.id || null,
          },
          { status: 401 }
        );
      }

      // Check for payment info in request
      const invoiceId = params?.invoice_id;
      const txHash = params?.tx_hash;

      // Build payment context
      const paymentContext: PaymentContext = {
        userId,
        agentId,
        method,
        params,
        tier,
        preferredToken,
      };

      // Enforce payment
      const paymentResult = await enforcePayment(
        paymentContext,
        invoiceId,
        txHash
      );

      // If payment failed, return 402 Payment Required
      if (!paymentResult.success) {
        return Response.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32001, // Custom JSON-RPC error code for payment required
              message: paymentResult.error,
              data: {
                error_code: paymentResult.errorCode,
                invoice: paymentResult.invoice,
              },
            },
            id: body.id || null,
          },
          { status: 402 } // HTTP 402 Payment Required
        );
      }

      // Payment successful - proceed with handler
      return await handler(req, paymentContext);
    } catch (error) {
      console.error("Payment guard error:", error);

      return Response.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error in payment guard",
            data: {
              error_message: error instanceof Error ? error.message : "Unknown error",
            },
          },
          id: null,
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Checks if user has sufficient balance for a method call
 * Useful for agents to pre-check before making requests
 * @param userId - User UUID
 * @param method - JSON-RPC method name
 * @param tier - User tier
 * @param token - Payment token
 * @returns True if sufficient balance, false otherwise
 */
export async function checkSufficientBalance(
  userId: string,
  method: string,
  tier: "free" | "basic" | "pro",
  token: TokenSymbol
): Promise<boolean> {
  const paymentMode = determinePaymentMode(method, tier);

  if (paymentMode === "free") {
    return true;
  }

  const methodPricing = PRICING_MATRIX[method];
  if (!methodPricing) {
    return true; // Method not priced = free
  }

  const price = methodPricing[tier];
  if (price === 0) {
    return true;
  }

  const balance = await getUserBalance(userId, token);
  return balance >= price;
}
