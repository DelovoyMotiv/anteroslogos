/**
 * @file lib/payments/ledger.ts
 * @description Double-entry bookkeeping for APA micropayments
 * @standards Append-only ledger, atomic operations, balance invariants
 * @security Row-level locking, race condition prevention, audit trail
 */

import { createClient } from "@supabase/supabase-js";
// import { z } from "zod"; // Unused
import {
  LedgerEntrySchema,
  type LedgerEntry,
  type LedgerEntryType,
  type TokenSymbol,
  type LedgerRow,
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

// =====================================================
// Types
// =====================================================

export interface DepositInput {
  userId: string;
  walletId: string;
  amount: number;
  token: TokenSymbol;
  txHash: string;
  description?: string;
}

export interface DebitInput {
  userId: string;
  amount: number;
  token: TokenSymbol;
  referenceType?: "invoice" | "usage_event";
  referenceId?: string;
  description?: string;
}

export interface RefundInput {
  userId: string;
  amount: number;
  token: TokenSymbol;
  referenceType?: "invoice" | "usage_event";
  referenceId?: string;
  description?: string;
}

// =====================================================
// Database Operations
// =====================================================

/**
 * Inserts ledger entry into database
 * @param row - Ledger entry row data
 * @returns Inserted row with database-generated fields
 */
// Note: This function is not currently used but kept for potential direct inserts
/*
async function _insertLedgerEntry(
  row: Omit<LedgerRow, "id" | "created_at">
): Promise<LedgerRow> {
  const { data, error } = await supabase
    .from("a2a_ledger")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  if (!data) {
    throw new Error("Insert succeeded but no data returned");
  }

  return data as LedgerRow;
}
*/

/**
 * Gets current balance for user + token
 * Uses optimized database function with row locking for atomic operations
 * @param userId - User UUID
 * @param token - Token symbol
 * @returns Current balance
 */
export async function getUserBalance(
  userId: string,
  token: TokenSymbol
): Promise<number> {
  const { data, error } = await supabase.rpc("get_user_balance", {
    p_user_id: userId,
    p_token: token,
  });

  if (error) {
    throw new Error(`Failed to get user balance: ${error.message}`);
  }

  return Number(data);
}

/**
 * Lists ledger entries for a user (pagination supported)
 * @param userId - User UUID
 * @param filters - Optional filters
 * @param limit - Max results (default 100)
 * @param offset - Pagination offset (default 0)
 * @returns Array of ledger entries
 */
export async function listLedgerEntries(
  userId: string,
  filters?: { entryType?: LedgerEntryType; token?: TokenSymbol },
  limit: number = 100,
  offset: number = 0
): Promise<LedgerEntry[]> {
  let query = supabase
    .from("a2a_ledger")
    .select()
    .eq("user_id", userId);

  if (filters?.entryType) {
    query = query.eq("entry_type", filters.entryType);
  }

  if (filters?.token) {
    query = query.eq("token", filters.token);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return (data as LedgerRow[]).map((row) => {
    const entry: LedgerEntry = {
      id: row.id,
      userId: row.user_id,
      walletId: row.wallet_id || undefined,
      entryType: row.entry_type as LedgerEntryType,
      amount: Number(row.amount),
      token: row.token as TokenSymbol,
      balanceAfter: Number(row.balance_after),
      referenceType: row.reference_type || undefined,
      referenceId: row.reference_id || undefined,
      txHash: row.tx_hash || undefined,
      description: row.description || undefined,
      createdAt: new Date(row.created_at),
    };
    return LedgerEntrySchema.parse(entry);
  });
}

// =====================================================
// Ledger Operations
// =====================================================

/**
 * Records a deposit (credit) to user's balance
 * Uses atomic database function to prevent race conditions
 * Idempotent: duplicate tx_hash will throw error
 * @param input - Deposit parameters
 * @returns Created ledger entry
 * @throws Error if tx_hash already exists (replay attack protection)
 */
export async function recordDeposit(input: DepositInput): Promise<LedgerEntry> {
  const { userId, walletId, amount, token, txHash, description } = input;

  // Validate amount
  if (amount <= 0) {
    throw new Error(`Deposit amount must be positive: ${amount}`);
  }

  // Call atomic credit function (handles balance calculation, locking, and duplicate detection)
  const { data: ledgerId, error } = await supabase.rpc("credit_ledger_atomic", {
    p_user_id: userId,
    p_amount: amount,
    p_token: token,
    p_wallet_id: walletId,
    p_tx_hash: txHash,
    p_reference_type: null,
    p_reference_id: null,
    p_description: description || `Deposit from wallet ${walletId}`,
  });

  if (error) {
    // Check if error is duplicate tx_hash (idempotency violation)
    if (error.message.includes("already recorded")) {
      throw new Error(
        `Duplicate transaction: ${txHash} already recorded for user ${userId}. ` +
        "This transaction was already processed. Possible replay attack or " +
        "double-processing detected. Check your payment verification logic."
      );
    }
    throw new Error(`Failed to record deposit: ${error.message}`);
  }

  // Fetch the created ledger entry
  const { data: ledgerRow, error: fetchError } = await supabase
    .from("a2a_ledger")
    .select()
    .eq("id", ledgerId as string)
    .single();

  if (fetchError || !ledgerRow) {
    throw new Error(`Failed to fetch created ledger entry: ${fetchError?.message}`);
  }

  const row = ledgerRow as LedgerRow;

  // Convert to public type
  const entry: LedgerEntry = {
    id: row.id,
    userId: row.user_id,
    walletId: row.wallet_id || undefined,
    entryType: row.entry_type as LedgerEntryType,
    amount: Number(row.amount),
    token: row.token as TokenSymbol,
    balanceAfter: Number(row.balance_after),
    referenceType: row.reference_type || undefined,
    referenceId: row.reference_id || undefined,
    txHash: row.tx_hash || undefined,
    description: row.description || undefined,
    createdAt: new Date(row.created_at),
  };

  return LedgerEntrySchema.parse(entry);
}

/**
 * Records a debit from user's balance
 * Uses atomic database function to prevent race conditions
 * @param input - Debit parameters
 * @returns Created ledger entry UUID
 */
export async function debitBalance(input: DebitInput): Promise<string> {
  const { userId, amount, token, referenceType, referenceId, description } = input;

  // Validate amount
  if (amount <= 0) {
    throw new Error(`Debit amount must be positive: ${amount}`);
  }

  // Call atomic debit function
  const { data, error } = await supabase.rpc("debit_ledger_atomic", {
    p_user_id: userId,
    p_amount: amount,
    p_token: token,
    p_reference_type: referenceType || null,
    p_reference_id: referenceId || null,
    p_description: description || null,
  });

  if (error) {
    // Check for insufficient balance error
    if (error.message.includes("Insufficient balance")) {
      throw new Error(`Insufficient balance: ${error.message}`);
    }
    throw new Error(`Debit failed: ${error.message}`);
  }

  return data as string; // Returns ledger entry UUID
}

/**
 * Records a refund (credit) to user's balance
 * Uses atomic database function to prevent race conditions
 * Used for invoice refunds or service credits
 * @param input - Refund parameters
 * @returns Created ledger entry
 */
export async function recordRefund(input: RefundInput): Promise<LedgerEntry> {
  const { userId, amount, token, referenceType, referenceId, description } = input;

  // Validate amount
  if (amount <= 0) {
    throw new Error(`Refund amount must be positive: ${amount}`);
  }

  // Call atomic credit function (refunds don't have tx_hash)
  const { data: ledgerId, error } = await supabase.rpc("credit_ledger_atomic", {
    p_user_id: userId,
    p_amount: amount,
    p_token: token,
    p_wallet_id: null,
    p_tx_hash: null, // Refunds have no blockchain transaction
    p_reference_type: referenceType || null,
    p_reference_id: referenceId || null,
    p_description: description || `Refund for ${referenceType} ${referenceId}`,
  });

  if (error) {
    throw new Error(`Failed to record refund: ${error.message}`);
  }

  // Fetch the created ledger entry
  const { data: ledgerRow, error: fetchError } = await supabase
    .from("a2a_ledger")
    .select()
    .eq("id", ledgerId as string)
    .single();

  if (fetchError || !ledgerRow) {
    throw new Error(`Failed to fetch created ledger entry: ${fetchError?.message}`);
  }

  const row = ledgerRow as LedgerRow;

  // Convert to public type
  const entry: LedgerEntry = {
    id: row.id,
    userId: row.user_id,
    walletId: row.wallet_id || undefined,
    entryType: row.entry_type as LedgerEntryType,
    amount: Number(row.amount),
    token: row.token as TokenSymbol,
    balanceAfter: Number(row.balance_after),
    referenceType: row.reference_type || undefined,
    referenceId: row.reference_id || undefined,
    txHash: row.tx_hash || undefined,
    description: row.description || undefined,
    createdAt: new Date(row.created_at),
  };

  return LedgerEntrySchema.parse(entry);
}

/**
 * Gets balance summary for all tokens for a user
 * @param userId - User UUID
 * @returns Map of token -> balance
 */
export async function getBalanceSummary(
  userId: string
): Promise<Record<TokenSymbol, number>> {
  const { data, error } = await supabase
    .from("user_balance_summary")
    .select()
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to get balance summary: ${error.message}`);
  }

  const summary: Record<TokenSymbol, number> = {
    USDC: 0,
    ETH: 0,
  };

  for (const row of data) {
    const token = row.token as TokenSymbol;
    const balance = Number(row.balance);
    summary[token] = balance;
  }

  return summary;
}

/**
 * Validates ledger integrity for a user
 * Ensures that balance_after values are consistent with transaction history
 * @param userId - User UUID
 * @param token - Token symbol
 * @returns True if ledger is consistent, throws error otherwise
 */
export async function validateLedgerIntegrity(
  userId: string,
  token: TokenSymbol
): Promise<boolean> {
  // Fetch all entries for user + token in chronological order
  const { data, error } = await supabase
    .from("a2a_ledger")
    .select()
    .eq("user_id", userId)
    .eq("token", token)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch ledger entries: ${error.message}`);
  }

  let runningBalance = 0;

  for (const row of data as LedgerRow[]) {
    const amount = Number(row.amount);
    const entryType = row.entry_type as LedgerEntryType;
    const balanceAfter = Number(row.balance_after);

    // Calculate expected balance
    if (entryType === "deposit" || entryType === "refund") {
      runningBalance += amount;
    } else if (entryType === "debit") {
      runningBalance -= amount;
    }

    // Check consistency
    if (Math.abs(runningBalance - balanceAfter) > 0.000001) {
      // Allow tiny floating point errors
      throw new Error(
        `Ledger integrity violation at entry ${row.id}: expected balance ${runningBalance}, got ${balanceAfter}`
      );
    }
  }

  return true;
}

/**
 * Gets ledger statistics for a user
 * @param userId - User UUID
 * @param token - Token symbol
 * @returns Statistics object
 */
export async function getLedgerStatistics(
  userId: string,
  token: TokenSymbol
): Promise<{
  totalDeposits: number;
  totalDebits: number;
  totalRefunds: number;
  currentBalance: number;
  transactionCount: number;
  firstTransactionAt: Date | null;
  lastTransactionAt: Date | null;
}> {
  const { data, error } = await supabase
    .from("a2a_ledger")
    .select()
    .eq("user_id", userId)
    .eq("token", token);

  if (error) {
    throw new Error(`Failed to fetch ledger statistics: ${error.message}`);
  }

  let totalDeposits = 0;
  let totalDebits = 0;
  let totalRefunds = 0;
  let firstTransactionAt: Date | null = null;
  let lastTransactionAt: Date | null = null;

  for (const row of data as LedgerRow[]) {
    const amount = Number(row.amount);
    const entryType = row.entry_type as LedgerEntryType;
    const createdAt = new Date(row.created_at);

    if (entryType === "deposit") {
      totalDeposits += amount;
    } else if (entryType === "debit") {
      totalDebits += amount;
    } else if (entryType === "refund") {
      totalRefunds += amount;
    }

    if (!firstTransactionAt || createdAt < firstTransactionAt) {
      firstTransactionAt = createdAt;
    }

    if (!lastTransactionAt || createdAt > lastTransactionAt) {
      lastTransactionAt = createdAt;
    }
  }

  const currentBalance = await getUserBalance(userId, token);

  return {
    totalDeposits,
    totalDebits,
    totalRefunds,
    currentBalance,
    transactionCount: data.length,
    firstTransactionAt,
    lastTransactionAt,
  };
}
