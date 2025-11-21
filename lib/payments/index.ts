/**
 * @file lib/payments/index.ts
 * @description Agent-Pay-Agent (APA) Micropayments Layer - Main Export
 * @version 1.0.0
 * @standards Base L2 (Chain ID 8453), USDC/ETH, JSON-RPC 2.0
 */

// =====================================================
// Core Types
// =====================================================
export * from "./types";

// =====================================================
// Wallet Management
// =====================================================
export {
  createCustodialWallet,
  registerNonCustodialWallet,
  getWalletForUser,
  getWalletForAgent,
  getSignerWallet,
  listWalletsForUser,
} from "./wallet";

// =====================================================
// Invoice Management
// =====================================================
export {
  createInvoice,
  getInvoice,
  getInvoiceByTransaction,
  updateInvoice,
  listInvoicesForUser,
  findPendingInvoiceByMemo,
  expireStaleInvoices,
} from "./invoice";

export type { InvoiceUpdateInput } from "./invoice";

// =====================================================
// Chain Watching & Verification
// =====================================================
export {
  verifyTransaction,
  processVerifiedTransaction,
  runChainWatcher,
  getConfirmations,
  isTransactionFinalized,
} from "./chainWatcher";

// =====================================================
// Reorg Monitoring (Background Job)
// =====================================================
export {
  runReorgMonitor,
  startReorgMonitorDaemon,
} from "./reorgMonitor";

// =====================================================
// RPC Provider Management (Automatic Failover)
// =====================================================
export {
  getRpcClient,
  getRpcEndpointStatus,
  markRpcEndpointFailed,
  shutdownRpcProvider,
} from "./rpcProvider";

// =====================================================
// Payment Detection Analytics
// =====================================================
export {
  getDetectionStats,
  getRecentDetections,
  getConfidenceDistribution,
  getFailedDetections,
  getDetectionRateByHour,
  getMostCommonMatchCriteria,
} from "./detectionAnalytics";

export type {
  DetectionStats,
  DetectionDetails,
  ConfidenceDistribution,
} from "./detectionAnalytics";

// =====================================================
// Ledger & Accounting
// =====================================================
export {
  getUserBalance,
  listLedgerEntries,
  recordDeposit,
  debitBalance,
  recordRefund,
  getBalanceSummary,
  validateLedgerIntegrity,
  getLedgerStatistics,
} from "./ledger";

export type { DepositInput, DebitInput, RefundInput } from "./ledger";

// =====================================================
// Payment Guard Middleware
// =====================================================
export {
  enforcePayment,
  withPaymentGuard,
  checkSufficientBalance,
} from "./paymentGuard";

export type {
  PaymentContext,
  PaymentResult,
  PaymentMode,
} from "./paymentGuard";
