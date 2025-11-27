/**
 * Universal Agent Protocol (UAP) v1.0 Constants
 * Defines protocol version, error codes, header names, and configuration defaults
 * 
 * @module src/protocols/uap/constants
 * @version 1.0.0
 */

// =====================================================
// PROTOCOL VERSION
// =====================================================

/** UAP protocol version following semver */
export const UAP_VERSION = '1.0';

/** Full protocol identifier */
export const UAP_PROTOCOL_ID = `uap/${UAP_VERSION}`;

// =====================================================
// ERROR CODES (UAP Spec Compliant)
// =====================================================

/**
 * UAP error codes as defined in specification
 * Follows similar pattern to JSON-RPC 2.0 error codes
 */
export enum UAPErrorCode {
  // Protocol errors (1000-1099)
  INVALID_MESSAGE = 1000,
  UNSUPPORTED_VERSION = 1001,
  INVALID_SIGNATURE = 1002,
  AUTHENTICATION_FAILED = 1003,
  
  // Trust layer errors (1100-1199) - Anóteros specific
  UNVERIFIED_AGENT = 1100,
  LOW_TRUST_SCORE = 1101,
  WATERMARK_VALIDATION_FAILED = 1102,
  BYZANTINE_BEHAVIOR_DETECTED = 1103,
  
  // Handshake errors (1200-1299)
  HANDSHAKE_TIMEOUT = 1200,
  INCOMPATIBLE_CAPABILITIES = 1201,
  REJECTED_BY_POLICY = 1202,
  
  // Request errors (1300-1399)
  INVALID_DELEGATION = 1300,
  CAPABILITY_NOT_SUPPORTED = 1301,
  RATE_LIMIT_EXCEEDED = 1302,
  PAYLOAD_TOO_LARGE = 1303,
  
  // Internal errors (1400-1499)
  INTERNAL_ERROR = 1400,
  SERVICE_UNAVAILABLE = 1401,
  TIMEOUT = 1402,
}

/**
 * Human-readable error messages for each error code
 */
export const ERROR_MESSAGES: Record<UAPErrorCode, string> = {
  [UAPErrorCode.INVALID_MESSAGE]: 'Message does not conform to UAP schema',
  [UAPErrorCode.UNSUPPORTED_VERSION]: 'UAP version not supported by this agent',
  [UAPErrorCode.INVALID_SIGNATURE]: 'Message signature verification failed',
  [UAPErrorCode.AUTHENTICATION_FAILED]: 'Agent authentication failed',
  
  [UAPErrorCode.UNVERIFIED_AGENT]: 'Agent not verified by Anóteros trust layer',
  [UAPErrorCode.LOW_TRUST_SCORE]: 'Agent trust score below acceptance threshold',
  [UAPErrorCode.WATERMARK_VALIDATION_FAILED]: 'BFT watermark validation failed',
  [UAPErrorCode.BYZANTINE_BEHAVIOR_DETECTED]: 'Byzantine behavior detected in ledger history',
  
  [UAPErrorCode.HANDSHAKE_TIMEOUT]: 'Handshake did not complete within timeout',
  [UAPErrorCode.INCOMPATIBLE_CAPABILITIES]: 'Agent capabilities incompatible with request',
  [UAPErrorCode.REJECTED_BY_POLICY]: 'Connection rejected by agent policy',
  
  [UAPErrorCode.INVALID_DELEGATION]: 'Delegation request malformed or unauthorized',
  [UAPErrorCode.CAPABILITY_NOT_SUPPORTED]: 'Requested capability not available',
  [UAPErrorCode.RATE_LIMIT_EXCEEDED]: 'Request rate limit exceeded for this DID',
  [UAPErrorCode.PAYLOAD_TOO_LARGE]: 'Message payload exceeds size limit',
  
  [UAPErrorCode.INTERNAL_ERROR]: 'Internal server error occurred',
  [UAPErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [UAPErrorCode.TIMEOUT]: 'Request timed out',
};

// =====================================================
// HEADER NAMES
// =====================================================

/** Standard UAP headers */
export const UAP_HEADERS = {
  VERSION: 'uap-version',
  MESSAGE_ID: 'uap-message-id',
  SENDER_ID: 'uap-sender-id',
  RECIPIENT_ID: 'uap-recipient-id',
  TIMESTAMP: 'uap-timestamp',
  SIGNATURE: 'uap-signature',
  MESSAGE_TYPE: 'uap-message-type',
} as const;

/** Anóteros trust layer extension headers */
export const ANOTEROS_HEADERS = {
  TRUST_SCORE: 'x-anoteros-trust-score',
  TRUST_PROOF: 'x-anoteros-proof',
  WATERMARK: 'x-anoteros-watermark',
  REJECTION_REASON: 'x-rejection-reason',
  CONSENSUS_ROUND: 'x-anoteros-consensus-round',
  LEDGER_HASH: 'x-anoteros-ledger-hash',
} as const;

// =====================================================
// MESSAGE TYPES
// =====================================================

/**
 * UAP message types as per specification
 */
export enum UAPMessageType {
  /** Initial handshake request */
  HANDSHAKE_SYN = 'handshake.syn',
  
  /** Handshake acknowledgment */
  HANDSHAKE_ACK = 'handshake.ack',
  
  /** Task delegation request */
  DELEGATION_REQUEST = 'delegation.request',
  
  /** Task delegation response */
  DELEGATION_RESPONSE = 'delegation.response',
  
  /** Progress update (streaming) */
  PROGRESS_UPDATE = 'progress.update',
  
  /** Task completion notification */
  COMPLETION = 'completion',
  
  /** Error notification */
  ERROR = 'error',
  
  /** Agent capabilities query */
  CAPABILITIES_QUERY = 'capabilities.query',
  
  /** Agent capabilities response */
  CAPABILITIES_RESPONSE = 'capabilities.response',
}

// =====================================================
// CONFIGURATION DEFAULTS
// =====================================================

/** Default timeout values in milliseconds */
export const TIMEOUTS = {
  /** Handshake must complete within this time */
  HANDSHAKE: 30_000,
  
  /** Standard request timeout */
  REQUEST: 60_000,
  
  /** Long-running delegation timeout */
  DELEGATION: 300_000,
  
  /** WebSocket ping/pong interval */
  HEARTBEAT: 30_000,
  
  /** WebSocket reconnection delay base */
  RECONNECT_BASE: 1_000,
  
  /** Maximum reconnection delay */
  RECONNECT_MAX: 60_000,
} as const;

/** Rate limiting configuration */
export const RATE_LIMITS = {
  /** Requests per minute per DID */
  REQUESTS_PER_MINUTE: 100,
  
  /** Handshakes per hour per DID */
  HANDSHAKES_PER_HOUR: 60,
  
  /** Stream connections per DID */
  MAX_STREAMS: 10,
} as const;

/** Message size limits */
export const SIZE_LIMITS = {
  /** Maximum message payload size (10MB) */
  MAX_PAYLOAD_SIZE: 10 * 1024 * 1024,
  
  /** Maximum header size (64KB) */
  MAX_HEADER_SIZE: 64 * 1024,
  
  /** Maximum message ID length */
  MAX_MESSAGE_ID_LENGTH: 64,
} as const;

/** Trust layer configuration */
export const TRUST_CONFIG = {
  /** Minimum trust score to accept connection (0-100) */
  MIN_TRUST_SCORE: 30,
  
  /** Consensus participation weight in trust score */
  WEIGHT_CONSENSUS: 0.4,
  
  /** Watermark validity weight in trust score */
  WEIGHT_WATERMARK: 0.3,
  
  /** Network uptime weight in trust score */
  WEIGHT_UPTIME: 0.2,
  
  /** Peer endorsements weight in trust score */
  WEIGHT_ENDORSEMENTS: 0.1,
  
  /** Trust proof signature algorithm */
  SIGNATURE_ALGORITHM: 'Ed25519',
} as const;

/** Circuit breaker configuration */
export const CIRCUIT_BREAKER = {
  /** Failures before opening circuit */
  FAILURE_THRESHOLD: 5,
  
  /** Time to wait before half-open attempt (ms) */
  COOLDOWN_MS: 60_000,
  
  /** Success count needed in half-open to close */
  SUCCESS_THRESHOLD: 2,
} as const;

/** Exponential backoff configuration */
export const BACKOFF = {
  /** Initial backoff delay (ms) */
  INITIAL_DELAY: 1_000,
  
  /** Maximum backoff delay (ms) */
  MAX_DELAY: 60_000,
  
  /** Backoff multiplier */
  MULTIPLIER: 2,
  
  /** Jitter factor (0-1) */
  JITTER: 0.1,
} as const;

// =====================================================
// WELL-KNOWN ENDPOINTS
// =====================================================

/** Standard UAP endpoint paths */
export const ENDPOINTS = {
  /** Synchronous message endpoint */
  MESSAGE: '/uap/v1/message',
  
  /** WebSocket stream endpoint */
  STREAM: '/uap/v1/stream',
  
  /** Agent manifest endpoint */
  MANIFEST: '/uap/v1/manifest',
  
  /** Health check endpoint */
  HEALTH: '/uap/v1/health',
  
  /** Trust layer verification endpoint (Anóteros) */
  TRUST_VERIFY: '/uap/v1/trust/verify',
} as const;

// =====================================================
// BACKWARD COMPATIBILITY ALIASES
// =====================================================

/** Alias for UAPErrorCode enum values as object */
export const UAP_ERROR_CODES = UAPErrorCode;

/** Alias for UAPMessageType enum values as object with additional types */
export const MESSAGE_TYPES = {
  ...UAPMessageType,
  HANDSHAKE_FIN: 'handshake.fin' as const,
  REQUEST: UAPMessageType.DELEGATION_REQUEST,
  RESPONSE: UAPMessageType.DELEGATION_RESPONSE,
};

/** Alias for CIRCUIT_BREAKER config */
export const CIRCUIT_BREAKER_PARAMS = {
  FAILURE_THRESHOLD: CIRCUIT_BREAKER.FAILURE_THRESHOLD,
  TIMEOUT: CIRCUIT_BREAKER.COOLDOWN_MS,
  SUCCESS_THRESHOLD: CIRCUIT_BREAKER.SUCCESS_THRESHOLD,
  WINDOW_SIZE: 60_000, // 1 minute rolling window
  BACKOFF_MULTIPLIER: BACKOFF.MULTIPLIER,
  MAX_BACKOFF: BACKOFF.MAX_DELAY,
} as const;

// HTTP status code aliases
export const NOT_FOUND = 404;
export const METHOD_NOT_ALLOWED = 405;
export const FORBIDDEN = 403;

// =====================================================
// EXPORTS
// =====================================================

export default {
  UAP_VERSION,
  UAP_PROTOCOL_ID,
  UAPErrorCode,
  ERROR_MESSAGES,
  UAP_HEADERS,
  ANOTEROS_HEADERS,
  UAPMessageType,
  TIMEOUTS,
  RATE_LIMITS,
  SIZE_LIMITS,
  TRUST_CONFIG,
  CIRCUIT_BREAKER,
  BACKOFF,
  ENDPOINTS,
};
