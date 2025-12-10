/**
 * Billing Service - CCC Economy
 * Main exports for the billing system
 */

export { BillingService, getBillingService } from './BillingService';
export { MigrationService, getMigrationService, type MigrationResult, type SubscriptionInfo } from './MigrationService';
export { InsufficientFundsError, BillingTransactionError, MigrationError } from './errors';
export type {
  Transaction,
  TransactionHistoryOptions,
  ChargeResult,
  DepositResult,
  EventType,
} from './types';
export {
  OPERATION_COSTS,
  getOperationCost,
  getOperationMetadata,
  getAllOperationCosts,
  isValidOperationType,
  type OperationType,
} from './costs';
export {
  createCheckoutSession,
  verifyWebhookSignature,
  handleCheckoutCompleted,
  processWebhookEvent,
  calculateCCCFromUSD,
  calculateUSDFromCCC,
  ANCHOR_PRICE_USD_PER_CCC,
  type CreditPackage,
} from './stripe';
export {
  verifyUSDCTransaction,
  processCryptoPayment,
  CryptoPaymentMonitor,
  startPaymentMonitors,
  type VerifiedTransaction,
} from './crypto';

// Webhook retry exports
export {
  WebhookRetryService,
  calculateRetryDelay,
  verifyExponentialBackoff,
  RETRY_DELAYS_MS,
  MAX_RETRY_ATTEMPTS,
  ALERT_THRESHOLD,
  type WebhookRetryJob,
  type RetryResult,
  type AlertInfo,
} from './webhookRetry';

// Audit logging exports
export {
  BillingAuditLogger,
  getBillingAuditLogger,
  type BillingEventType,
} from './auditLogger';

// Authorization exports
export {
  checkBillingAuthorization,
  checkUserDataAuthorization,
  checkLedgerAuthorization,
  requireBillingAuth,
  requireUserDataAuth,
  requireLedgerAuth,
  composeAuth,
  type AuthorizationContext,
  type AuthorizationResult,
} from './authorizationMiddleware';

// Middleware exports
export {
  withBilling,
  compose,
  checkBalance,
  getUserBalance,
  type BillingMiddlewareOptions,
  type BillingRequest,
} from '../middleware/billingMiddleware';
export {
  withGeoAuditBilling,
  withApiWrapperBilling,
  withAgentConsensusBilling,
  withBasicApiBilling,
  withCitationIntelligenceBilling,
  withKnowledgeGraphBilling,
  withContentAnalysisBilling,
  withCompetitiveIntelligenceBilling,
  withCausalTracerBilling,
  withA2ABilling,
} from '../middleware/billingPresets';
