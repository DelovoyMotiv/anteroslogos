/**
 * @anteroslogos/sdk
 * 
 * Official TypeScript SDK for Anóteros Lógos API
 * 
 * @packageDocumentation
 */

// Main client
export { AnterosClient } from './client.js';
export type { AnterosConfig } from './client.js';

// Services (for tree-shaking)
export { AuditService } from './services/audit.js';
export { KnowledgeGraphService } from './services/knowledge-graph.js';
export { CitationService } from './services/citation.js';
export { CCCService } from './services/ccc.js';

// Types - Audit
export type {
  AuditRequest,
  AuditResult,
  AuditOptions,
  AuditDepth,
  Grade,
  Priority,
  Recommendation,
  CategoryScores,
  Platform,
  PlatformInsight,
  BatchAuditRequest,
  BatchAuditResult,
} from './types/audit.js';

// Types - Knowledge Graph
export type {
  KnowledgeGraphRequest,
  KnowledgeGraphResult,
  Entity,
  EntityType,
  Relationship,
  RelationshipType,
  Claim,
} from './types/knowledge-graph.js';

// Types - Citation
export type {
  CitationRequest,
  CitationResult,
  PlatformPrediction,
} from './types/citation.js';

// Types - CCC
export type {
  CCCBalance,
  CCCHistory,
  CCCTransaction,
  CCCTransferRequest,
  CCCStakeRequest,
  TransactionType,
} from './types/ccc.js';

// Errors
export { AnterosError } from './errors/base.js';
export {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  PaymentRequiredError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
  NetworkError,
  CircuitOpenError,
} from './errors/types.js';

// Resilience layer (advanced usage)
export { RetryStrategy } from './resilience/retry.js';
export type { RetryConfig } from './resilience/retry.js';
export { CircuitBreaker } from './resilience/circuit-breaker.js';
export type { CircuitConfig, CircuitState } from './resilience/circuit-breaker.js';
export { IdempotencyManager } from './resilience/idempotency.js';
export { ResilienceFactory } from './resilience/factory.js';

// Transport layer (advanced usage)
export { HTTPClient } from './transport/http.js';
export type { HTTPClientConfig, RequestConfig } from './transport/http.js';

// Utilities
export { stableStringify, generateHash } from './utils/stable-stringify.js';
export { SDK_VERSION } from './utils/constants.js';
