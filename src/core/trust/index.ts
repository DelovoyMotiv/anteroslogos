/**
 * Anóteros Trust Layer
 * Main export module
 * 
 * @module src/core/trust
 * @version 1.0.0
 */

// Types
export * from './types';

// Ledger Client
export * from './ledger';

// Trust Middleware (THE KILLER FEATURE)
export * from './middleware';

// Re-export for convenience
export {
  RejectionReason,
  type TrustHistory,
  type TrustScoreComponents,
  type AttestationResult,
  type VerificationResult,
} from './types';

export {
  WatermarkLedgerClient,
  getLedgerClient,
  initLedgerClient,
} from './ledger';

export {
  TrustMiddleware,
  getTrustMiddleware,
  initTrustMiddleware,
} from './middleware';
