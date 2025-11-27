/**
 * Universal Agent Protocol (UAP) v1.0 Zod Schemas
 * Runtime validation for all UAP message types
 * 
 * @module src/protocols/uap/schemas
 * @version 1.0.0
 */

import { z } from 'zod';
import { UAPMessageType, SIZE_LIMITS } from './constants';

// =====================================================
// PRIMITIVE SCHEMAS
// =====================================================

/** DID string format validation */
export const DIDSchema = z.string().regex(
  /^did:[a-z]+:[a-zA-Z0-9._-]+$/,
  'Invalid DID format'
);

/** ULID format validation (26 characters) */
export const MessageIdSchema = z.string().length(26, 'Message ID must be 26 characters (ULID)');

/** ISO 8601 timestamp */
export const TimestampSchema = z.string().datetime('Invalid ISO 8601 timestamp');

/** Base64url encoded signature */
export const SignatureSchema = z.string().regex(
  /^[A-Za-z0-9_-]+$/,
  'Signature must be base64url encoded'
);

// =====================================================
// HEADER SCHEMA
// =====================================================

/**
 * UAP Header validation schema
 */
export const UAPHeaderSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/, 'Version must be in format X.Y'),
  messageId: MessageIdSchema,
  senderId: DIDSchema,
  recipientId: DIDSchema.nullable(),
  timestamp: TimestampSchema,
  messageType: z.nativeEnum(UAPMessageType),
  signature: SignatureSchema,
});

// =====================================================
// TRUST ATTESTATION SCHEMA
// =====================================================

/**
 * Anóteros Trust Attestation schema
 */
export const TrustAttestationSchema = z.object({
  trustScore: z.number().min(0).max(100),
  proof: SignatureSchema,
  watermark: z.string().min(1),
  consensusRound: z.number().int().nonnegative(),
  ledgerHash: z.string().length(64, 'Ledger hash must be 64 characters (SHA256)'),
  attestedAt: TimestampSchema,
});

// =====================================================
// CAPABILITIES SCHEMAS
// =====================================================

/**
 * Agent capabilities schema
 */
export const AgentCapabilitiesSchema = z.object({
  capabilities: z.array(z.string()).min(1, 'At least one capability required'),
  protocols: z.array(z.string()).min(1, 'At least one protocol required'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver (X.Y.Z)'),
  endpoints: z.object({
    message: z.string().url().optional(),
    stream: z.string().url().optional(),
  }),
  'x-anoteros': z.object({
    causalRelayEnabled: z.boolean().optional(),
    bftConsensus: z.string().optional(),
    trustLayerVersion: z.string().optional(),
    watermarkLedger: z.string().url().optional(),
  }).optional(),
});

// =====================================================
// HANDSHAKE PAYLOAD SCHEMAS
// =====================================================

/**
 * HandshakeSYN payload schema
 */
export const HandshakeSYNPayloadSchema = z.object({
  capabilities: AgentCapabilitiesSchema,
  sessionParams: z.object({
    timeout: z.number().int().positive().optional(),
    keepalive: z.number().int().positive().optional(),
  }).optional(),
  authChallenge: z.string().optional(),
});

/**
 * HandshakeACK payload schema
 */
export const HandshakeACKPayloadSchema = z.object({
  capabilities: AgentCapabilitiesSchema,
  sessionParams: z.object({
    sessionId: z.string().min(1),
    timeout: z.number().int().positive(),
    keepalive: z.number().int().positive(),
  }),
  rejectionReason: z.string().optional(),
});

// =====================================================
// DELEGATION PAYLOAD SCHEMAS
// =====================================================

/**
 * Delegation request payload schema
 */
export const DelegationRequestPayloadSchema = z.object({
  taskId: z.string().min(1),
  capability: z.string().min(1),
  parameters: z.record(z.unknown()),
  expectedDuration: z.number().int().positive().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  callbackEndpoint: z.string().url().optional(),
});

/**
 * Delegation response payload schema
 */
export const DelegationResponsePayloadSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(['accepted', 'rejected', 'queued']),
  result: z.unknown().optional(),
  rejectionReason: z.string().optional(),
  estimatedCompletion: TimestampSchema.optional(),
});

// =====================================================
// STREAMING PAYLOAD SCHEMAS
// =====================================================

/**
 * Progress update payload schema
 */
export const ProgressUpdatePayloadSchema = z.object({
  taskId: z.string().min(1),
  progress: z.number().min(0).max(100),
  status: z.string().min(1),
  partialResult: z.unknown().optional(),
  metrics: z.object({
    processingTime: z.number().nonnegative().optional(),
    itemsProcessed: z.number().int().nonnegative().optional(),
    itemsTotal: z.number().int().nonnegative().optional(),
  }).optional(),
});

/**
 * Completion payload schema
 */
export const CompletionPayloadSchema = z.object({
  taskId: z.string().min(1),
  result: z.unknown(),
  metrics: z.object({
    totalTime: z.number().nonnegative(),
    startedAt: TimestampSchema,
    completedAt: TimestampSchema,
  }),
  provenance: z.object({
    token: z.string().min(1),
    mimeType: z.string().min(1),
  }).optional(),
});

// =====================================================
// ERROR PAYLOAD SCHEMA
// =====================================================

/**
 * Error payload schema
 */
export const ErrorPayloadSchema = z.object({
  code: z.number().int(),
  message: z.string().min(1),
  details: z.unknown().optional(),
  taskId: z.string().optional(),
  stack: z.string().optional(),
});

// =====================================================
// CAPABILITIES PAYLOAD SCHEMAS
// =====================================================

/**
 * Capabilities query payload schema
 */
export const CapabilitiesQueryPayloadSchema = z.object({
  filter: z.string().optional(),
  detailed: z.boolean().optional(),
});

/**
 * Capabilities response payload schema
 */
export const CapabilitiesResponsePayloadSchema = z.object({
  capabilities: AgentCapabilitiesSchema,
  details: z.array(z.object({
    capability: z.string().min(1),
    description: z.string().min(1),
    parameters: z.record(z.unknown()).optional(),
    cost: z.object({
      token: z.string().min(1),
      amount: z.number().nonnegative(),
    }).optional(),
  })).optional(),
});

// =====================================================
// COMPLETE MESSAGE SCHEMAS
// =====================================================

/**
 * Base UAP message schema (generic payload)
 */
export const UAPMessageSchema = z.object({
  header: UAPHeaderSchema,
  payload: z.unknown(),
  trustAttestation: TrustAttestationSchema.optional(),
});

/**
 * HandshakeSYN message schema
 */
export const HandshakeSYNMessageSchema = z.object({
  header: UAPHeaderSchema.extend({
    messageType: z.literal(UAPMessageType.HANDSHAKE_SYN),
  }),
  payload: HandshakeSYNPayloadSchema,
  trustAttestation: TrustAttestationSchema.optional(),
});

/**
 * HandshakeACK message schema
 */
export const HandshakeACKMessageSchema = z.object({
  header: UAPHeaderSchema.extend({
    messageType: z.literal(UAPMessageType.HANDSHAKE_ACK),
  }),
  payload: HandshakeACKPayloadSchema,
  trustAttestation: TrustAttestationSchema.optional(),
});

/**
 * DelegationRequest message schema
 */
export const DelegationRequestMessageSchema = z.object({
  header: UAPHeaderSchema.extend({
    messageType: z.literal(UAPMessageType.DELEGATION_REQUEST),
  }),
  payload: DelegationRequestPayloadSchema,
  trustAttestation: TrustAttestationSchema.optional(),
});

/**
 * DelegationResponse message schema
 */
export const DelegationResponseMessageSchema = z.object({
  header: UAPHeaderSchema.extend({
    messageType: z.literal(UAPMessageType.DELEGATION_RESPONSE),
  }),
  payload: DelegationResponsePayloadSchema,
  trustAttestation: TrustAttestationSchema.optional(),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Validate UAP message with size limits
 */
export function validateUAPMessage(data: unknown): z.infer<typeof UAPMessageSchema> {
  // Check size limits first
  const json = JSON.stringify(data);
  if (json.length > SIZE_LIMITS.MAX_PAYLOAD_SIZE) {
    throw new Error(`Message payload exceeds size limit: ${json.length} > ${SIZE_LIMITS.MAX_PAYLOAD_SIZE}`);
  }
  
  return UAPMessageSchema.parse(data);
}

/**
 * Validate message by type
 */
export function validateMessageByType(data: unknown, messageType: UAPMessageType): unknown {
  const schemas: Record<UAPMessageType, z.ZodSchema> = {
    [UAPMessageType.HANDSHAKE_SYN]: HandshakeSYNMessageSchema,
    [UAPMessageType.HANDSHAKE_ACK]: HandshakeACKMessageSchema,
    [UAPMessageType.DELEGATION_REQUEST]: DelegationRequestMessageSchema,
    [UAPMessageType.DELEGATION_RESPONSE]: DelegationResponseMessageSchema,
    [UAPMessageType.PROGRESS_UPDATE]: UAPMessageSchema,
    [UAPMessageType.COMPLETION]: UAPMessageSchema,
    [UAPMessageType.ERROR]: UAPMessageSchema,
    [UAPMessageType.CAPABILITIES_QUERY]: UAPMessageSchema,
    [UAPMessageType.CAPABILITIES_RESPONSE]: UAPMessageSchema,
  };
  
  const schema = schemas[messageType];
  if (!schema) {
    throw new Error(`Unknown message type: ${messageType}`);
  }
  
  return schema.parse(data);
}

/**
 * Safe parse with detailed error formatting
 */
export function safeParseUAPMessage(data: unknown): {
  success: boolean;
  data?: z.infer<typeof UAPMessageSchema>;
  error?: string;
} {
  try {
    const parsed = validateUAPMessage(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// =====================================================
// BACKWARD COMPATIBILITY ALIASES
// =====================================================

/** Legacy schema aliases for transport layer */
export const HandshakeSYNSchema = HandshakeSYNPayloadSchema;
export const HandshakeACKSchema = HandshakeACKPayloadSchema;
export const HandshakeFINSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().optional(),
});
export const RequestSchema = DelegationRequestPayloadSchema;
export const ResponseSchema = DelegationResponsePayloadSchema;
export const ErrorResponseSchema = ErrorPayloadSchema;

// Exports handled by const/function declarations above
