/**
 * UAP Transport Layer
 * Exports all transport components
 * 
 * @module src/protocols/uap/transport
 * @version 1.0.0
 */

// Main server
export { UAPServer, getUAPServer, initUAPServer } from './uapServer';
export type { UAPServerConfig, ServerStats } from './uapServer';

// HTTP/2 adapter
export { HTTP2Adapter, getHTTP2Adapter, initHTTP2Adapter } from './http2Adapter';
export type { HTTP2AdapterConfig } from './http2Adapter';

// WebSocket adapter
export { WSAdapter, getWSAdapter, initWSAdapter } from './wsAdapter';
export type { WSAdapterConfig, WSClientConnection } from './wsAdapter';

// Message router
export { MessageRouter, getMessageRouter } from './messageRouter';
export type { MessageHandler, MessageContext, RouteConfig } from './messageRouter';

// Rate limiter
export { RateLimiter, getRateLimiter, initRateLimiter } from './rateLimiter';
export type {
  RateLimitConfig,
  TokenBucket,
  RateLimitResult,
} from './rateLimiter';
export { DEFAULT_RATE_LIMITS } from './rateLimiter';

// Circuit breaker
export { CircuitBreaker, getCircuitBreaker, initCircuitBreaker } from './circuitBreaker';
export type {
  CircuitState,
  CircuitBreakerConfig,
  CircuitMetrics,
} from './circuitBreaker';
