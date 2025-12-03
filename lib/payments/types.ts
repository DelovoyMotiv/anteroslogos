/**
 * Agent-Pay-Agent (APA) Payment Types
 * Compact version with all required exports
 */

import { z } from 'zod';
import { ulid } from 'ulid';
import type { JSONValue } from '../../types/common.types';

// =====================================================
// TOKEN & NETWORK
// =====================================================

export const TokenSchema = z.enum(['USDC', 'ETH']);
export type Token = z.infer<typeof TokenSchema>;
export type TokenSymbol = Token;

export const ChainIdSchema = z.literal(8453);
export type ChainId = z.infer<typeof ChainIdSchema>;

export const BASE_L2_CHAIN_ID = 8453 as const;

// Production token addresses on Base L2 (chainId 8453)
export const TOKEN_ADDRESSES: Record<Token, `0x${string}`> = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Circle USDC on Base
  ETH: '0x0000000000000000000000000000000000000000',  // Native ETH (NOT YET SUPPORTED - requires oracle)
};

// Supported tokens for payments (only USDC until oracle implemented)
export const SUPPORTED_PAYMENT_TOKENS: Token[] = ['USDC'];

export function isPaymentTokenSupported(token: Token): boolean {
  return SUPPORTED_PAYMENT_TOKENS.includes(token);
}

export const USDC_ADDRESS_BASE = TOKEN_ADDRESSES.USDC;

// =====================================================
// WALLET TYPES
// =====================================================

export interface WalletRow {
  id: string;
  user_id: string | null;
  agent_id: string | null;
  address: string;
  chain_id: number;
  is_custodial: boolean;
  encrypted_key: string | null;
  encryption_nonce: string | null;
  encryption_algorithm: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustodialWallet {
  id: string;
  userId?: string;
  agentId?: string;
  address: string;
  chainId: 8453;
  isCustodial: true;
  encryptionAlgorithm: string;
  createdAt: Date;
}

export interface NonCustodialWallet {
  id: string;
  userId?: string;
  agentId?: string;
  address: string;
  chainId: 8453;
  isCustodial: false;
  createdAt: Date;
}

export const CustodialWalletSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.literal(8453),
  isCustodial: z.literal(true),
  encryptionAlgorithm: z.string(),
  createdAt: z.date(),
});

export const NonCustodialWalletSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.literal(8453),
  isCustodial: z.literal(false),
  createdAt: z.date(),
});

export const WalletCreateInputSchema = z.object({
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
}).refine((data) => data.userId || data.agentId, {
  message: "Either userId or agentId must be provided",
});

// =====================================================
// INVOICE TYPES
// =====================================================

export const InvoiceStatusSchema = z.enum([
  'pending',
  'confirming',
  'paid',
  'expired',
  'refunded',
]);

export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export interface InvoiceRow {
  id: string;
  invoice_id: string;
  user_id: string | null;
  agent_id: string | null;
  method: string;
  params: JSONValue;
  params_hash: string;
  amount: number | string;
  token: string;
  chain_id: number;
  recipient_address: string;
  memo_hash: string;
  status: string;
  tx_hash: string | null;
  block_number: number | null;
  confirmations: number;
  expires_at: string;
  paid_at: string | null;
  confirmed_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  userId?: string;
  agentId?: string;
  method: string;
  params: unknown;
  paramsHash: string;
  amount: number;
  token: TokenSymbol;
  chainId: 8453;
  recipientAddress: string;
  memoHash: string;
  status: InvoiceStatus;
  txHash?: string;
  blockNumber?: bigint;
  confirmations: number;
  expiresAt: Date;
  paidAt?: Date;
  confirmedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().regex(/^inv_[0-9A-HJKMNP-TV-Z]{26}$/),
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  method: z.string(),
  params: z.unknown(),
  paramsHash: z.string(),
  amount: z.number().positive(),
  token: TokenSchema,
  chainId: z.literal(8453),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  memoHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  status: InvoiceStatusSchema,
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  blockNumber: z.bigint().optional(),
  confirmations: z.number().int().nonnegative(),
  expiresAt: z.date(),
  paidAt: z.date().optional(),
  confirmedAt: z.date().optional(),
  refundedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const InvoiceCreateInputSchema = z.object({
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  method: z.string(),
  params: z.unknown(),
  tier: z.enum(['free', 'basic', 'pro']),
  token: TokenSchema,
  ttlSeconds: z.number().int().positive().optional(),
});

// =====================================================
// LEDGER TYPES
// =====================================================

export const LedgerEntryTypeSchema = z.enum(['deposit', 'debit', 'refund']);
export type LedgerEntryType = z.infer<typeof LedgerEntryTypeSchema>;

export interface LedgerRow {
  id: string;
  user_id: string;
  wallet_id: string | null;
  entry_type: string;
  amount: number | string;
  token: string;
  balance_after: number | string;
  reference_type: string | null;
  reference_id: string | null;
  tx_hash: string | null;
  description: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  walletId?: string;
  entryType: LedgerEntryType;
  amount: number;
  token: TokenSymbol;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  txHash?: string;
  description?: string;
  createdAt: Date;
}

export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  walletId: z.string().uuid().optional(),
  entryType: LedgerEntryTypeSchema,
  amount: z.number(),
  token: TokenSchema,
  balanceAfter: z.number(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  description: z.string().optional(),
  createdAt: z.date(),
});

// =====================================================
// TRANSACTION VERIFICATION
// =====================================================

export interface TransactionVerification {
  verified: boolean;
  reason: string;
  txHash: string;
  blockNumber: bigint;
  confirmations: number;
}

export const TransactionVerificationSchema = z.object({
  verified: z.boolean(),
  reason: z.string(),
  txHash: z.string(),
  blockNumber: z.bigint(),
  confirmations: z.number().int().nonnegative(),
});

// =====================================================
// PRICING
// =====================================================

// PRICING MATRIX (USD prices for USDC payments)
// NOTE: In production, move this to database table 'a2a_pricing' for hot-reload capability
// Current implementation requires code deployment to change prices - NOT IDEAL for dynamic pricing
export const PRICING_MATRIX: Record<string, Record<'free' | 'basic' | 'pro', number>> = {
  'geo.audit.request': {
    free: 0,      // Free tier (rate-limited)
    basic: 0.10,  // $0.10 USDC per request
    pro: 0,       // Included in pro subscription
  },
  'causal_citation_trace': {
    free: 0,      // Free tier (rate-limited)
    basic: 0.50,  // $0.50 USDC per request
    pro: 0.25,    // $0.25 USDC per request (50% discount)
  },
};

// TODO: Replace with database-driven pricing
// CREATE TABLE a2a_pricing (
//   id UUID PRIMARY KEY,
//   method TEXT NOT NULL,
//   tier TEXT NOT NULL,
//   price DECIMAL(18,6) NOT NULL,
//   effective_from TIMESTAMPTZ DEFAULT NOW(),
//   version INT DEFAULT 1
// );

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function generateInvoiceId(): string {
  return `inv_${ulid()}`;
}

export function toTokenUnits(amount: number, token: Token): bigint {
  const decimals = token === 'USDC' ? 6 : 18;
  const amountStr = amount.toFixed(decimals);
  const [whole, fraction = ''] = amountStr.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

export function fromTokenUnits(units: bigint, token: Token): string {
  const decimals = token === 'USDC' ? 6 : 18;
  const str = units.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const fraction = str.slice(-decimals);
  return `${whole}.${fraction}`;
}

export async function generateMemoHash(invoiceId: string): Promise<string> {
  const { keccak256 } = await import('viem');
  const { toBytes } = await import('viem');
  return keccak256(toBytes(invoiceId));
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
