/**
 * Universal Agent Protocol (UAP) v1.0 Type Definitions
 * Complete type system for UAP messaging with Anóteros trust extensions
 * 
 * @module src/protocols/uap/types
 * @version 1.0.0
 */

import type { UAPMessageType } from './constants';

// =====================================================
// TYPE ALIASES
// =====================================================

/** Alias for UAPMessageType for backward compatibility */
export type MessageType = UAPMessageType;

// =====================================================
// CORE UAP TYPES
// =====================================================

/**
 * DID (Decentralized Identifier) format
 * Supports did:aid:, did:web:, did:key: methods
 */
export type DIDString = `did:${string}:${string}`;

/**
 * ULID-based message identifier
 * 26 characters, lexicographically sortable
 */
export type MessageId = string;

/**
 * ISO 8601 timestamp
 */
export type Timestamp = string;

/**
 * Ed25519 signature (base64url encoded)
 */
export type Signature = string;

/**
 * UAP Header - Required metadata for all messages
 */
export interface UAPHeader {
  /** Protocol version (e.g., "1.0") */
  version: string;
  
  /** Unique message identifier (ULID) */
  messageId: MessageId;
  
  /** Sender's DID */
  senderId: DIDString;
  
  /** Recipient's DID (null for broadcast) */
  recipientId: DIDString | null;
  
  /** Message creation timestamp (ISO 8601) */
  timestamp: Timestamp;
  
  /** Message type discriminator */
  messageType: UAPMessageType | string;
  
  /** Ed25519 signature over canonical message */
  signature: Signature;
  
  /** Optional correlation ID for request-response matching */
  correlationId?: MessageId;
}

/**
 * Anóteros Trust Attestation
 * Injected during handshake by trust middleware
 */
export interface TrustAttestation {
  /** Computed trust score (0-100) */
  trustScore: number;
  
  /** Ed25519 proof signature */
  proof: Signature;
  
  /** BFT watermark reference */
  watermark: string;
  
  /** Consensus round number */
  consensusRound: number;
  
  /** Ledger state hash */
  ledgerHash: string;
  
  /** Attestation timestamp */
  attestedAt: Timestamp;
}

/**
 * Base UAP Message structure
 * All messages extend this interface
 */
export interface UAPMessage<T = unknown> {
  header: UAPHeader;
  payload: T;
  trustAttestation?: TrustAttestation;
}

// =====================================================
// HANDSHAKE MESSAGES
// =====================================================

/**
 * Agent capabilities declaration
 */
export interface AgentCapabilities {
  /** Supported capability identifiers */
  capabilities: string[];
  
  /** Supported protocols */
  protocols: string[];
  
  /** Agent name */
  name: string;
  
  /** Agent version */
  version: string;
  
  /** Public endpoints */
  endpoints: {
    message?: string;
    stream?: string;
  };
  
  /** Anóteros-specific capabilities */
  'x-anoteros'?: {
    causalRelayEnabled?: boolean;
    bftConsensus?: string;
    trustLayerVersion?: string;
    watermarkLedger?: string;
  };
}

/**
 * HandshakeSYN payload
 * Initial connection request
 */
export interface HandshakeSYNPayload {
  /** Agent capabilities */
  capabilities: AgentCapabilities;
  
  /** Requested session parameters */
  sessionParams?: {
    timeout?: number;
    keepalive?: number;
  };
  
  /** Authentication challenge response */
  authChallenge?: string;
}

/**
 * HandshakeACK payload
 * Response with trust attestation
 */
export interface HandshakeACKPayload {
  /** Server capabilities */
  capabilities: AgentCapabilities;
  
  /** Session established parameters */
  sessionParams: {
    sessionId: string;
    timeout: number;
    keepalive: number;
  };
  
  /** Rejection reason (if rejected) */
  rejectionReason?: string;
}

/**
 * HandshakeFIN payload
 * Session termination request
 */
export interface HandshakeFINPayload {
  /** Session identifier to terminate */
  sessionId: string;
  
  /** Termination reason */
  reason?: string;
}

// =====================================================
// REQUEST/RESPONSE ALIASES
// =====================================================

/** Generic request payload (alias for DelegationRequestPayload) */
export type RequestPayload = DelegationRequestPayload;

/** Generic response payload (alias for DelegationResponsePayload) */
export type ResponsePayload = DelegationResponsePayload;

// =====================================================
// DELEGATION MESSAGES
// =====================================================

/**
 * Task delegation request
 */
export interface DelegationRequestPayload {
  /** Task identifier */
  taskId: string;
  
  /** Capability being invoked */
  capability: string;
  
  /** Task parameters */
  parameters: Record<string, unknown>;
  
  /** Expected completion time (ms) */
  expectedDuration?: number;
  
  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'critical';
  
  /** Callback endpoint for progress updates */
  callbackEndpoint?: string;
}

/**
 * Task delegation response
 */
export interface DelegationResponsePayload {
  /** Task identifier */
  taskId: string;
  
  /** Task status */
  status: 'accepted' | 'rejected' | 'queued';
  
  /** Execution result (if completed synchronously) */
  result?: unknown;
  
  /** Rejection reason */
  rejectionReason?: string;
  
  /** Estimated completion time */
  estimatedCompletion?: Timestamp;
}

// =====================================================
// STREAMING MESSAGES
// =====================================================

/**
 * Progress update message
 */
export interface ProgressUpdatePayload {
  /** Task identifier */
  taskId: string;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Current status description */
  status: string;
  
  /** Partial results */
  partialResult?: unknown;
  
  /** Metrics */
  metrics?: {
    processingTime?: number;
    itemsProcessed?: number;
    itemsTotal?: number;
  };
}

/**
 * Task completion message
 */
export interface CompletionPayload {
  /** Task identifier */
  taskId: string;
  
  /** Final result */
  result: unknown;
  
  /** Execution metrics */
  metrics: {
    totalTime: number;
    startedAt: Timestamp;
    completedAt: Timestamp;
  };
  
  /** UCPT provenance token (if available) */
  provenance?: {
    token: string;
    mimeType: string;
  };
}

// =====================================================
// ERROR MESSAGES
// =====================================================

/**
 * Error notification payload
 */
export interface ErrorPayload {
  /** Error code */
  code: number;
  
  /** Error message */
  message: string;
  
  /** Additional error details */
  details?: unknown;
  
  /** Related task ID (if applicable) */
  taskId?: string;
  
  /** Stack trace (development only) */
  stack?: string;
}

// =====================================================
// CAPABILITIES MESSAGES
// =====================================================

/**
 * Capabilities query payload
 */
export interface CapabilitiesQueryPayload {
  /** Filter by capability prefix */
  filter?: string;
  
  /** Include detailed descriptions */
  detailed?: boolean;
}

/**
 * Capabilities response payload
 */
export interface CapabilitiesResponsePayload {
  /** Agent capabilities */
  capabilities: AgentCapabilities;
  
  /** Detailed capability descriptions */
  details?: Array<{
    capability: string;
    description: string;
    parameters?: Record<string, unknown>;
    cost?: {
      token: string;
      amount: number;
    };
  }>;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard for DID format validation
 */
export function isDIDString(value: unknown): value is DIDString {
  return typeof value === 'string' && /^did:[a-z]+:[a-zA-Z0-9._-]+$/.test(value);
}

/**
 * Type guard for UAP message structure
 */
export function isUAPMessage(value: unknown): value is UAPMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Record<string, unknown>;
  
  return (
    msg.header !== undefined &&
    typeof msg.header === 'object' &&
    msg.payload !== undefined
  );
}

/**
 * Type guard for HandshakeSYN message
 */
export function isHandshakeSYN(msg: UAPMessage): msg is UAPMessage<HandshakeSYNPayload> {
  return msg.header.messageType === 'handshake.syn';
}

/**
 * Type guard for HandshakeACK message
 */
export function isHandshakeACK(msg: UAPMessage): msg is UAPMessage<HandshakeACKPayload> {
  return msg.header.messageType === 'handshake.ack';
}

/**
 * Type guard for DelegationRequest message
 */
export function isDelegationRequest(msg: UAPMessage): msg is UAPMessage<DelegationRequestPayload> {
  return msg.header.messageType === 'delegation.request';
}

/**
 * Type guard for trust attestation presence
 */
export function hasTrustAttestation(msg: UAPMessage): msg is UAPMessage & { trustAttestation: TrustAttestation } {
  return msg.trustAttestation !== undefined;
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * UAP response wrapper
 * Used for synchronous request-response patterns
 */
export interface UAPResponse<T = unknown> {
  /** Response message */
  message: UAPMessage<T>;
  
  /** Response metadata */
  metadata?: {
    processingTime?: number;
    queueTime?: number;
  };
}

/**
 * UAP error response
 */
export interface UAPErrorResponse {
  /** Error payload */
  error: ErrorPayload;
  
  /** Original message ID that caused the error */
  originalMessageId?: MessageId;
}

/**
 * Stream handler callback
 */
export type StreamHandler<T = unknown> = (message: UAPMessage<T>) => void | Promise<void>;

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  HANDSHAKING = 'handshaking',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** Agent DID */
  agentDid: DIDString;
  
  /** Remote endpoint URL */
  endpoint: string;
  
  /** Connection timeout (ms) */
  timeout?: number;
  
  /** Enable automatic reconnection */
  autoReconnect?: boolean;
  
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  
  /** TLS certificate pinning */
  certificatePin?: string;
  
  /** Custom headers */
  headers?: Record<string, string>;
}

// Exports handled by interface/enum/function declarations above
