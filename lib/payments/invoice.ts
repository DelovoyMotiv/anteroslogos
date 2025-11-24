/**
 * @file lib/payments/invoice.ts
 * @description Invoice generation and lifecycle management for APA micropayments
 * @standards ULID for invoice IDs, keccak256 for memo hashes, ISO 8601 timestamps
 * @security Zero-trust validation, params hashing, replay protection
 */

import { createClient } from "@supabase/supabase-js";
import { ulid } from "ulid";
import { keccak256, toUtf8Bytes } from "ethers";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  InvoiceCreateInputSchema,
  InvoiceStatusSchema,
  type Invoice,
  type InvoiceStatus,
  type InvoiceRow,
  type TokenSymbol,
  BASE_L2_CHAIN_ID,
  PRICING_MATRIX,
  SUPPORTED_PAYMENT_TOKENS,
} from "./types";

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

// Default invoice expiration: 1 hour
const DEFAULT_INVOICE_TTL_SECONDS = 3600;

// Maximum invoices per user per hour (rate limit)
const MAX_INVOICES_PER_HOUR = 10;

// Platform recipient address (REQUIRED - no fallback)
if (!process.env.PLATFORM_WALLET_ADDRESS) {
  throw new Error(
    "PLATFORM_WALLET_ADDRESS environment variable is required. " +
    "This is the Base L2 address that receives all USDC payments. " +
    "Generate a secure wallet and set this value in your environment."
  );
}
const PLATFORM_RECIPIENT_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;

// =====================================================
// Types
// =====================================================

export interface InvoiceUpdateInput {
  status?: InvoiceStatus;
  txHash?: string;
  blockNumber?: bigint;
  confirmations?: number;
  paidAt?: Date;
  confirmedAt?: Date;
  refundedAt?: Date;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Generates a ULID-based invoice ID
 * Format: inv_{ULID}
 * @returns Invoice ID string
 */
function generateInvoiceId(): string {
  return `inv_${ulid()}`;
}

/**
 * Computes keccak256 hash of invoice ID for on-chain memo
 * @param invoiceId - Invoice ID string
 * @returns Hex-encoded keccak256 hash (0x-prefixed)
 */
function generateMemoHash(invoiceId: string): string {
  return keccak256(toUtf8Bytes(invoiceId));
}

/**
 * Computes SHA3-512 hash of canonical JSON params
 * Ensures consistent hashing regardless of key order
 * @param params - JSON-serializable params object
 * @returns Hex-encoded SHA3-512 hash (no 0x prefix)
 * @throws Error if params contains circular references or is not JSON-serializable
 */
function hashParams(params: unknown): string {
  // Validate params is an object
  if (params === null || params === undefined) {
    throw new Error("Params cannot be null or undefined");
  }
  
  if (typeof params !== "object") {
    throw new Error(`Params must be an object, got ${typeof params}`);
  }
  
  // Canonicalize JSON with sorted keys
  // replacer function handles circular refs and normalizes numbers
  const seen = new WeakSet();
  const canonical = JSON.stringify(params, (_key, value) => {
    // Detect circular references
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        throw new Error("Params contains circular reference");
      }
      seen.add(value);
    }
    
    // Normalize numbers to avoid 1.0 vs 1.00 differences
    if (typeof value === "number") {
      return Number(value.toFixed(6)); // 6 decimal precision for USDC
    }
    
    return value;
  });
  
  if (!canonical) {
    throw new Error("Failed to serialize params to JSON");
  }
  
  // Sort keys for canonical representation
  const sorted = JSON.stringify(JSON.parse(canonical), Object.keys(JSON.parse(canonical)).sort());
  
  // SHA3-512 hash
  const hash = createHash("sha3-512");
  hash.update(sorted, "utf8");
  
  return hash.digest("hex");
}

/**
 * Resolves pricing for a given method and tier from database
 * @param method - JSON-RPC method name
 * @param tier - User tier (free, basic, pro)
 * @param token - Payment token symbol
 * @returns Price in token units (e.g., USDC dollars)
 * @throws Error if method not found in pricing database
 */
async function resolvePrice(
  method: string,
  tier: "free" | "basic" | "pro",
  token: TokenSymbol
): Promise<number> {
  // ETH is not supported yet - check before database lookup
  if (token === "ETH") {
    throw new Error(
      "ETH payments are not yet supported. " +
      "Please use USDC. ETH support requires Chainlink oracle integration " +
      "for real-time USD conversion. Track implementation at: " +
      "https://github.com/anoteroslogos/issues/APA-ETH-ORACLE"
    );
  }

  // Call database function to get current price
  const { data: price, error } = await supabase.rpc("get_current_price", {
    p_method: method,
    p_tier: tier,
    p_at_time: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to fetch pricing: ${error.message}`);
  }

  if (price === null || price === undefined) {
    // Fallback to hardcoded PRICING_MATRIX if database pricing not found
    const methodPricing = PRICING_MATRIX[method];
    if (methodPricing && methodPricing[tier] !== undefined) {
      console.warn(
        `[Invoice] Database pricing not found for ${method}:${tier}, using fallback from PRICING_MATRIX`
      );
      return methodPricing[tier];
    }

    throw new Error(
      `No pricing configured for method ${method}, tier ${tier}. ` +
      `Please configure pricing in a2a_pricing table.`
    );
  }

  // Prices are in USD, applicable to USDC (1:1)
  return Number(price);
}

/**
 * Validates rate limits for invoice creation
 * @param userId - User UUID
 * @throws Error if rate limit exceeded
 */
async function checkRateLimit(userId: string): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 3600_000);

  const { count, error } = await supabase
    .from("a2a_invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo.toISOString());

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  if (count !== null && count >= MAX_INVOICES_PER_HOUR) {
    throw new Error(
      `Rate limit exceeded: ${count}/${MAX_INVOICES_PER_HOUR} invoices per hour`
    );
  }
}

/**
 * Validates Ethereum transaction hash format
 * @param txHash - Transaction hash string
 * @returns True if valid, false otherwise
 */
function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

// =====================================================
// Database Operations
// =====================================================

/**
 * Inserts invoice row into database
 * @param row - Invoice row data
 * @returns Inserted row with database-generated fields
 */
async function insertInvoiceRow(
  row: Omit<InvoiceRow, "id" | "created_at" | "updated_at">
): Promise<InvoiceRow> {
  const { data, error } = await supabase
    .from("a2a_invoices")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  if (!data) {
    throw new Error("Insert succeeded but no data returned");
  }

  return data as InvoiceRow;
}

/**
 * Fetches invoice row by invoice ID
 * @param invoiceId - Invoice ID string (inv_{ULID})
 * @returns Invoice row or null if not found
 */
async function getInvoiceByInvoiceId(
  invoiceId: string
): Promise<InvoiceRow | null> {
  const { data, error } = await supabase
    .from("a2a_invoices")
    .select()
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data as InvoiceRow | null;
}

/**
 * Fetches invoice row by transaction hash
 * @param txHash - Ethereum transaction hash (0x-prefixed)
 * @returns Invoice row or null if not found
 */
async function getInvoiceByTxHash(txHash: string): Promise<InvoiceRow | null> {
  const { data, error } = await supabase
    .from("a2a_invoices")
    .select()
    .eq("tx_hash", txHash)
    .maybeSingle();

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data as InvoiceRow | null;
}

/**
 * Updates invoice row in database
 * @param invoiceId - Invoice ID string
 * @param updates - Partial invoice row updates
 * @returns Updated row
 */
async function updateInvoiceRow(
  invoiceId: string,
  updates: Partial<InvoiceRow>
): Promise<InvoiceRow> {
  const { data, error } = await supabase
    .from("a2a_invoices")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("invoice_id", invoiceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }

  if (!data) {
    throw new Error("Update succeeded but no data returned");
  }

  return data as InvoiceRow;
}

/**
 * Marks expired invoices as expired (background job)
 * @returns Number of expired invoices
 */
// Re-export Invoice type for external use
export type { Invoice } from "./types";

export async function expireStaleInvoices(): Promise<number> {
  const { data, error } = await supabase.rpc("expire_stale_invoices");

  if (error) {
    throw new Error(`Expire stale invoices failed: ${error.message}`);
  }

  return data as number;
}

// =====================================================
// Public API
// =====================================================

/**
 * Creates a new payment invoice
 * @param input - Invoice creation parameters
 * @returns Created invoice
 * @throws Error if validation fails or database operation fails
 */
export async function createInvoice(
  input: z.infer<typeof InvoiceCreateInputSchema>
): Promise<Invoice> {
  // Validate input
  const validated = InvoiceCreateInputSchema.parse(input);

  // Validate token is supported for payments (ETH requires oracle)
  if (!SUPPORTED_PAYMENT_TOKENS.includes(validated.token)) {
    throw new Error(
      `Token ${validated.token} is not supported for payments. ` +
      `Supported tokens: ${SUPPORTED_PAYMENT_TOKENS.join(", ")}. ` +
      `ETH support requires Chainlink oracle integration for real-time USD/ETH conversion.`
    );
  }

  // Check rate limits
  if (validated.userId) {
    await checkRateLimit(validated.userId);
  }

  // Generate invoice ID and memo hash
  const invoiceId = generateInvoiceId();
  const memoHash = generateMemoHash(invoiceId);

  // Hash params for integrity verification
  const paramsHash = hashParams(validated.params);

  // Resolve pricing
  const price = await resolvePrice(validated.method, validated.tier, validated.token);

  // Calculate expiration time
  const expiresAt = new Date(
    Date.now() + (validated.ttlSeconds || DEFAULT_INVOICE_TTL_SECONDS) * 1000
  );

  // Prepare database row
  const row: Omit<InvoiceRow, "id" | "created_at" | "updated_at"> = {
    invoice_id: invoiceId,
    user_id: validated.userId || null,
    agent_id: validated.agentId || null,
    method: validated.method,
    params: validated.params as any, // JSONB
    params_hash: paramsHash,
    amount: price,
    token: validated.token,
    chain_id: BASE_L2_CHAIN_ID,
    recipient_address: PLATFORM_RECIPIENT_ADDRESS,
    memo_hash: memoHash,
    status: "pending",
    tx_hash: null,
    block_number: null,
    confirmations: 0,
    expires_at: expiresAt.toISOString(),
    paid_at: null,
    confirmed_at: null,
    refunded_at: null,
  };

  // Insert into database
  const insertedRow = await insertInvoiceRow(row);

  // Convert to public Invoice type
  const invoice: Invoice = {
    id: insertedRow.id,
    invoiceId: insertedRow.invoice_id,
    userId: insertedRow.user_id || undefined,
    agentId: insertedRow.agent_id || undefined,
    method: insertedRow.method,
    params: insertedRow.params,
    paramsHash: insertedRow.params_hash,
    amount: Number(insertedRow.amount),
    token: insertedRow.token as TokenSymbol,
    chainId: insertedRow.chain_id as 8453,
    recipientAddress: insertedRow.recipient_address,
    memoHash: insertedRow.memo_hash,
    status: insertedRow.status as InvoiceStatus,
    txHash: insertedRow.tx_hash || undefined,
    blockNumber: insertedRow.block_number ? BigInt(insertedRow.block_number) : undefined,
    confirmations: insertedRow.confirmations,
    expiresAt: new Date(insertedRow.expires_at),
    paidAt: insertedRow.paid_at ? new Date(insertedRow.paid_at) : undefined,
    confirmedAt: insertedRow.confirmed_at ? new Date(insertedRow.confirmed_at) : undefined,
    refundedAt: insertedRow.refunded_at ? new Date(insertedRow.refunded_at) : undefined,
    createdAt: new Date(insertedRow.created_at),
    updatedAt: new Date(insertedRow.updated_at),
  };

  return invoice;
}

/**
 * Retrieves invoice by invoice ID
 * @param invoiceId - Invoice ID string (inv_{ULID})
 * @returns Invoice or null if not found
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const row = await getInvoiceByInvoiceId(invoiceId);
  if (!row) return null;

  const invoice: Invoice = {
    id: row.id,
    invoiceId: row.invoice_id,
    userId: row.user_id || undefined,
    agentId: row.agent_id || undefined,
    method: row.method,
    params: row.params,
    paramsHash: row.params_hash,
    amount: Number(row.amount),
    token: row.token as TokenSymbol,
    chainId: row.chain_id as 8453,
    recipientAddress: row.recipient_address,
    memoHash: row.memo_hash,
    status: row.status as InvoiceStatus,
    txHash: row.tx_hash || undefined,
    blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
    confirmations: row.confirmations,
    expiresAt: new Date(row.expires_at),
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    refundedAt: row.refunded_at ? new Date(row.refunded_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  return invoice;
}

/**
 * Retrieves invoice by transaction hash (for chain watcher)
 * @param txHash - Ethereum transaction hash (0x-prefixed)
 * @returns Invoice or null if not found
 */
export async function getInvoiceByTransaction(
  txHash: string
): Promise<Invoice | null> {
  if (!isValidTxHash(txHash)) {
    throw new Error(`Invalid transaction hash format: ${txHash}`);
  }

  const row = await getInvoiceByTxHash(txHash);
  if (!row) return null;

  const invoice: Invoice = {
    id: row.id,
    invoiceId: row.invoice_id,
    userId: row.user_id || undefined,
    agentId: row.agent_id || undefined,
    method: row.method,
    params: row.params,
    paramsHash: row.params_hash,
    amount: Number(row.amount),
    token: row.token as TokenSymbol,
    chainId: row.chain_id as 8453,
    recipientAddress: row.recipient_address,
    memoHash: row.memo_hash,
    status: row.status as InvoiceStatus,
    txHash: row.tx_hash || undefined,
    blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
    confirmations: row.confirmations,
    expiresAt: new Date(row.expires_at),
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    refundedAt: row.refunded_at ? new Date(row.refunded_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  return invoice;
}

/**
 * Updates invoice status and payment details
 * @param invoiceId - Invoice ID string
 * @param updates - Invoice update payload
 * @returns Updated invoice
 * @throws Error if invoice not found or update fails
 */
export async function updateInvoice(
  invoiceId: string,
  updates: InvoiceUpdateInput
): Promise<Invoice> {
  // Validate status transition if provided
  if (updates.status) {
    InvoiceStatusSchema.parse(updates.status);
  }

  // Validate txHash format if provided
  if (updates.txHash && !isValidTxHash(updates.txHash)) {
    throw new Error(`Invalid transaction hash format: ${updates.txHash}`);
  }

  // Check for replay attacks (txHash reuse)
  if (updates.txHash) {
    const existingInvoiceWithTx = await getInvoiceByTxHash(updates.txHash);
    if (existingInvoiceWithTx && existingInvoiceWithTx.invoice_id !== invoiceId) {
      throw new Error(
        `Transaction hash already used for invoice ${existingInvoiceWithTx.invoice_id}`
      );
    }
  }

  // Prepare database updates
  const dbUpdates: Partial<InvoiceRow> = {};

  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
  }

  if (updates.txHash !== undefined) {
    dbUpdates.tx_hash = updates.txHash;
  }

  if (updates.blockNumber !== undefined) {
    dbUpdates.block_number = Number(updates.blockNumber);
  }

  if (updates.confirmations !== undefined) {
    dbUpdates.confirmations = updates.confirmations;
  }

  if (updates.paidAt !== undefined) {
    dbUpdates.paid_at = updates.paidAt.toISOString();
  }

  if (updates.confirmedAt !== undefined) {
    dbUpdates.confirmed_at = updates.confirmedAt.toISOString();
  }

  if (updates.refundedAt !== undefined) {
    dbUpdates.refunded_at = updates.refundedAt.toISOString();
  }

  // Update in database
  const updatedRow = await updateInvoiceRow(invoiceId, dbUpdates);

  // Convert to public Invoice type
  const invoice: Invoice = {
    id: updatedRow.id,
    invoiceId: updatedRow.invoice_id,
    userId: updatedRow.user_id || undefined,
    agentId: updatedRow.agent_id || undefined,
    method: updatedRow.method,
    params: updatedRow.params,
    paramsHash: updatedRow.params_hash,
    amount: Number(updatedRow.amount),
    token: updatedRow.token as TokenSymbol,
    chainId: updatedRow.chain_id as 8453,
    recipientAddress: updatedRow.recipient_address,
    memoHash: updatedRow.memo_hash,
    status: updatedRow.status as InvoiceStatus,
    txHash: updatedRow.tx_hash || undefined,
    blockNumber: updatedRow.block_number ? BigInt(updatedRow.block_number) : undefined,
    confirmations: updatedRow.confirmations,
    expiresAt: new Date(updatedRow.expires_at),
    paidAt: updatedRow.paid_at ? new Date(updatedRow.paid_at) : undefined,
    confirmedAt: updatedRow.confirmed_at ? new Date(updatedRow.confirmed_at) : undefined,
    refundedAt: updatedRow.refunded_at ? new Date(updatedRow.refunded_at) : undefined,
    createdAt: new Date(updatedRow.created_at),
    updatedAt: new Date(updatedRow.updated_at),
  };

  return invoice;
}

/**
 * Lists invoices for a user (pagination supported)
 * @param userId - User UUID
 * @param filters - Optional filters (status, method)
 * @param limit - Max results (default 50)
 * @param offset - Pagination offset (default 0)
 * @returns Array of invoices
 */
export async function listInvoicesForUser(
  userId: string,
  filters?: { status?: InvoiceStatus; method?: string },
  limit: number = 50,
  offset: number = 0
): Promise<Invoice[]> {
  let query = supabase
    .from("a2a_invoices")
    .select()
    .eq("user_id", userId)
    .eq("chain_id", BASE_L2_CHAIN_ID);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.method) {
    query = query.eq("method", filters.method);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return (data as InvoiceRow[]).map((row) => {
    const invoice: Invoice = {
      id: row.id,
      invoiceId: row.invoice_id,
      userId: row.user_id || undefined,
      agentId: row.agent_id || undefined,
      method: row.method,
      params: row.params,
      paramsHash: row.params_hash,
      amount: Number(row.amount),
      token: row.token as TokenSymbol,
      chainId: row.chain_id as 8453,
      recipientAddress: row.recipient_address,
      memoHash: row.memo_hash,
      status: row.status as InvoiceStatus,
      txHash: row.tx_hash || undefined,
      blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
      confirmations: row.confirmations,
      expiresAt: new Date(row.expires_at),
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
      refundedAt: row.refunded_at ? new Date(row.refunded_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    return invoice;
  });
}

/**
 * Finds pending invoices that match on-chain transaction details
 * Used by chain watcher to correlate payments
 * @param recipientAddress - Recipient address (checksummed)
 * @param memoHash - Keccak256 hash of invoice ID
 * @returns Matching invoice or null
 */
export async function findPendingInvoiceByMemo(
  recipientAddress: string,
  memoHash: string
): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("a2a_invoices")
    .select()
    .eq("recipient_address", recipientAddress)
    .eq("memo_hash", memoHash)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  if (!data) return null;

  const row = data as InvoiceRow;

  const invoice: Invoice = {
    id: row.id,
    invoiceId: row.invoice_id,
    userId: row.user_id || undefined,
    agentId: row.agent_id || undefined,
    method: row.method,
    params: row.params,
    paramsHash: row.params_hash,
    amount: Number(row.amount),
    token: row.token as TokenSymbol,
    chainId: row.chain_id as 8453,
    recipientAddress: row.recipient_address,
    memoHash: row.memo_hash,
    status: row.status as InvoiceStatus,
    txHash: row.tx_hash || undefined,
    blockNumber: row.block_number ? BigInt(row.block_number) : undefined,
    confirmations: row.confirmations,
    expiresAt: new Date(row.expires_at),
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    refundedAt: row.refunded_at ? new Date(row.refunded_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };

  return invoice;
}
