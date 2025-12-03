/**
 * Design Patterns Module
 * 
 * Centralized export of all design pattern implementations.
 * 
 * @module lib/patterns
 */

// Factory Pattern
export {
  ErrorFactory,
  ErrorType,
  errorFactory,
  createErrorFactory,
  type ErrorOptions,
  type SecurityErrorOptions,
  type ValidationErrorOptions,
  type DatabaseErrorOptions,
  type ExternalServiceErrorOptions,
  type NetworkErrorOptions,
  type RateLimitErrorOptions,
  type NotFoundErrorOptions,
  type ConflictErrorOptions,
} from './ErrorFactory';

// Builder Pattern
export {
  PoolConfigBuilder,
  SandboxConfigBuilder,
  RoutingOptionsBuilder,
  CircuitBreakerConfigBuilder,
  RetryConfigBuilder,
} from './ConfigBuilder';

// Observer Pattern
export {
  TypedEventEmitter,
  createEventEmitter,
  circuitBreakerEvents,
  connectionPoolEvents,
  meshNetworkEvents,
  databaseEvents,
  type EventHandler,
  type EventSubscription,
  type EventEmitterOptions,
  type CircuitBreakerEvents,
  type ConnectionPoolEvents,
  type MeshNetworkEvents,
  type DatabaseEvents,
} from './EventEmitter';
