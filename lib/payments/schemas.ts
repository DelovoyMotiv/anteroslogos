/**
 * Payment Domain Model Schemas
 * 
 * Zod schemas for wallets, ledger entries, and invoices.
 * These schemas provide runtime validation and type inference.
 * 
 * @module lib/payments/schemas
 */

import { z } from 'zod';

// =====================================================
// WALLET SCHEMAS
// =====================================================

/**
 * Base wallet schema with common fields
 */
const BaseWalletSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  created_at: z.date(),
  agent_id: z.string().nullable(),
  chain_id: z.literal(8453), // Base L2
});

/**
 * Custodial wallet schema (system manages private key)
 */
export const CustodialWalletSchema = BaseWalletSchema.extend({
  isCustodial: z.literal(true),
  encryptionAlgorithm: z.string(),
});

export type CustodialWallet = z.infer<typeof CustodialWalletSchema>;

/**
 * Non-custodial wallet schema (user manages private key)
 */
export const NonCustodialWalletSchema = BaseWalletSchema.extend({
  isCustodial: z.literal(false),
});

export type NonCustodialWallet = z.infer<typeof NonCustodialWalletSchema>;

/**
 * Union type for any wallet
 */
export const WalletSchema = z.union([CustodialWalletSchema, NonCustodialWalletSchema]);

export type Wallet = CustodialWallet | NonCustodialWallet;

/**
 * Convert database row to Wallet domain model
 */
export function walletFromDb(row: Record<string, unknown>): Wallet {
  const base = {
    id: row.id,
    user_id: row.user_id,
    address: row.address,
    created_at: new Date(row.created_at as string),
    agent_id: row.agent_id,
    chain_id: 8453 as const,
  };

  if (row.is_custodial === true) {
    return CustodialWalletSchema.parse({
      ...base,
      isCustodial: true,
      encryptionAlgorithm: row.encryption_algorithm,
    });
  } else {
    return NonCustodialWalletSchema.parse({
      ...base,
      isCustodial: false,
    });
  }
}

// =====================================================
// LEDGER ENTRY SCHEMAS
// =====================================================

/**
 * Ledger Entry schema matching the a2a_ledger table structure
 */
export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  walletId: z.string().uuid(),
  amount: z.number(),
  entryType: z.enum(['deposit', 'debit', 'refund']),
  balanceAfter: z.number(),
  txHash: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  description: z.string().optional(),
  token: z.enum(['USDC', 'ETH']),
  createdAt: z.date(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

/**
 * Convert database row to Ledger Entry domain model
 */
export function ledgerEntryFromDb(row: Record<string, unknown>): LedgerEntry {
  return LedgerEntrySchema.parse({
    id: row.id,
    userId: row.user_id,
    walletId: row.wallet_id,
    amount: row.amount,
    entryType: row.entry_type,
    balanceAfter: row.balance_after,
    txHash: row.tx_hash ?? undefined,
    referenceType: row.reference_type ?? undefined,
    referenceId: row.reference_id ?? undefined,
    description: row.description ?? undefined,
    token: row.token,
    createdAt: new Date(row.created_at as string),
  });
}

// =====================================================
// INVOICE SCHEMAS
// =====================================================

/**
 * Invoice schema matching the a2a_invoices table structure
 */
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string(),
  userId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable(),
  amountDue: z.number().positive(),
  amountPaid: z.number().nonnegative(),
  token: z.literal('USDC'),
  status: z.enum(['pending', 'paid', 'expired']),
  dueDate: z.date(),
  paidAt: z.date().nullable(),
  txHash: z.string().nullable(),
  walletAddress: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

/**
 * Convert database row to Invoice domain model
 */
export function invoiceFromDb(row: Record<string, unknown>): Invoice {
  return InvoiceSchema.parse({
    id: row.id,
    invoiceId: row.invoice_id,
    userId: row.user_id,
    subscriptionId: row.subscription_id,
    amountDue: row.amount_due,
    amountPaid: row.amount_paid,
    token: row.token,
    status: row.status,
    dueDate: new Date(row.due_date as string),
    paidAt: row.paid_at ? new Date(row.paid_at as string) : null,
    txHash: row.tx_hash,
    walletAddress: row.wallet_address,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    expiresAt: new Date(row.expires_at as string),
  });
}

// =====================================================
// TRANSACTION VERIFICATION SCHEMAS
// =====================================================

/**
 * Transaction Verification schema
 */
export const TransactionVerificationSchema = z.object({
  verified: z.boolean(),
  txHash: z.string().optional(),
  blockNumber: z.bigint().optional(),
  confirmations: z.number().int().nonnegative().optional(),
  reason: z.string().optional(),
});

export type TransactionVerification = z.infer<typeof TransactionVerificationSchema>;
