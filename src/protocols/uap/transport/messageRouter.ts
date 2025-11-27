/**
 * UAP Message Router
 * Routes and validates UAP messages with session tracking
 * 
 * @module src/protocols/uap/transport/messageRouter
 * @version 1.0.0
 */

import { ulid } from 'ulid';
import type {
  UAPMessage,
  DIDString,
  MessageType,
  HandshakeSYNPayload,
  HandshakeFINPayload,
  RequestPayload,
  ResponsePayload,
  ErrorPayload,
} from '../types';
import {
  HandshakeSYNSchema,
  HandshakeACKSchema,
  HandshakeFINSchema,
  RequestSchema,
  ResponseSchema,
  ErrorResponseSchema,
} from '../schemas';
import { UAP_ERROR_CODES, MESSAGE_TYPES } from '../constants';
import { getTrustMiddleware } from '../../../core/trust/middleware';
import { getRateLimiter } from './rateLimiter';
import { getCircuitBreaker } from './circuitBreaker';

// =====================================================
// TYPES
// =====================================================

export interface MessageHandler {
  (message: UAPMessage, context: MessageContext): Promise<UAPMessage | null>;
}

export interface MessageContext {
  /** Source agent DID */
  agentDid: DIDString;
  /** Session ID (if applicable) */
  sessionId?: string;
  /** Request timestamp */
  timestamp: string;
  /** Remote address */
  remoteAddr?: string;
  /** Trust score (if available) */
  trustScore?: number;
  /** Tenant ID (if applicable) */
  tenantId?: string | null;
}

export interface RouteConfig {
  /** Message type */
  type: MessageType | string;
  /** Handler function */
  handler: MessageHandler;
  /** Require trust attestation */
  requireTrust?: boolean;
  /** Rate limit type */
  rateLimitType?: string;
}

// =====================================================
// MESSAGE ROUTER
// =====================================================

export class MessageRouter {
  private routes: Map<MessageType | string, RouteConfig> = new Map();
  private sessions: Map<string, MessageContext> = new Map();
  private trustMiddleware = getTrustMiddleware();
  private rateLimiter = getRateLimiter();
  private circuitBreaker = getCircuitBreaker();

  constructor() {
    // Register default handlers
    this.registerDefaultHandlers();
    console.log('[MessageRouter] Initialized');
  }

  /**
   * Route incoming UAP message
   * Validates, checks limits, and dispatches to handler
   */
  async routeMessage(
    message: UAPMessage,
    context: Partial<MessageContext>
  ): Promise<UAPMessage> {
    const startTime = Date.now();

    try {
      // 1. Extract agent DID from message
      const agentDid = this.extractAgentDID(message);
      if (!agentDid) {
        return this.createErrorResponse(
          message,
          UAP_ERROR_CODES.INVALID_MESSAGE,
          'Missing agent DID in message'
        );
      }

      // Complete context
      const fullContext: MessageContext = {
        agentDid,
        timestamp: new Date().toISOString(),
        remoteAddr: context.remoteAddr,
        sessionId: context.sessionId,
        tenantId: context.tenantId,
      };

      // 2. Circuit breaker check
      const circuitAllowed = await this.circuitBreaker.isRequestAllowed(agentDid);
      if (!circuitAllowed) {
        return this.createErrorResponse(
          message,
          UAP_ERROR_CODES.SERVICE_UNAVAILABLE,
          'Circuit breaker open - agent temporarily blocked'
        );
      }

      // 3. Rate limiting
      const route = this.routes.get(message.header.messageType);
      const rateLimitType = route?.rateLimitType || 'request';
      const rateLimit = await this.rateLimiter.checkLimit(agentDid, rateLimitType);

      if (!rateLimit.allowed) {
        return this.createErrorResponse(
          message,
          UAP_ERROR_CODES.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded: ${rateLimit.reason}`,
          { retryAfter: rateLimit.retryAfter }
        );
      }

      // 4. Validate message schema
      const validationResult = this.validateMessage(message);
      if (!validationResult.valid) {
        return this.createErrorResponse(
          message,
          UAP_ERROR_CODES.INVALID_MESSAGE,
          `Validation failed: ${validationResult.error}`
        );
      }

      // 5. Trust check (for handshakes)
      if (message.header.messageType === MESSAGE_TYPES.HANDSHAKE_SYN) {
        const trustResult = await this.trustMiddleware.verifyAndInjectTrust(
          message as UAPMessage<HandshakeSYNPayload>,
          {
            checkTenantIsolation: !!fullContext.tenantId,
            tenantId: fullContext.tenantId || undefined,
          }
        );

        if (!trustResult.verified) {
          return this.createErrorResponse(
            message,
            UAP_ERROR_CODES.LOW_TRUST_SCORE,
            `Trust verification failed: ${trustResult.rejection?.explanation || 'Unknown reason'}`,
            { trustScore: trustResult.rejection?.trustScore || 0 }
          );
        }

        // Inject trust attestation into context
        if (trustResult.attestation) {
          fullContext.trustScore = trustResult.attestation.trustScore;
        }
      }

      // 6. Dispatch to handler
      if (!route) {
        return this.createErrorResponse(
          message,
          UAP_ERROR_CODES.CAPABILITY_NOT_SUPPORTED,
          `No handler for message type: ${message.header.messageType}`
        );
      }

      const response = await route.handler(message, fullContext);

      // 7. Record success
      await this.circuitBreaker.recordSuccess(agentDid);

      const processingTime = Date.now() - startTime;
      console.log(
        `[MessageRouter] Routed ${message.header.messageType} from ${agentDid} in ${processingTime}ms`
      );

      return response || this.createAckResponse(message);
    } catch (error) {
      // Record failure
      const agentDid = this.extractAgentDID(message);
      if (agentDid) {
        await this.circuitBreaker.recordFailure(
          agentDid,
          error instanceof Error ? error : new Error('Unknown error')
        );
      }

      console.error('[MessageRouter] Routing error:', error);

      return this.createErrorResponse(
        message,
        UAP_ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal server error'
      );
    }
  }

  /**
   * Register route handler
   */
  registerRoute(config: RouteConfig): void {
    this.routes.set(config.type, config);
    console.log(`[MessageRouter] Registered handler for ${config.type}`);
  }

  /**
   * Register default handlers for core UAP messages
   */
  private registerDefaultHandlers(): void {
    // HandshakeSYN handler
    this.registerRoute({
      type: MESSAGE_TYPES.HANDSHAKE_SYN,
      handler: this.handleHandshakeSYN.bind(this) as MessageHandler,
      requireTrust: true,
      rateLimitType: 'handshake',
    });

    // HandshakeFIN handler
    this.registerRoute({
      type: MESSAGE_TYPES.HANDSHAKE_FIN,
      handler: this.handleHandshakeFIN.bind(this) as MessageHandler,
      rateLimitType: 'handshake',
    });

    // Request handler (generic)
    this.registerRoute({
      type: MESSAGE_TYPES.REQUEST,
      handler: this.handleRequest.bind(this) as MessageHandler,
      rateLimitType: 'request',
    });
  }

  /**
   * Handle HandshakeSYN
   */
  private async handleHandshakeSYN(
    message: UAPMessage<HandshakeSYNPayload>,
    context: MessageContext
  ): Promise<UAPMessage | null> {
    const { capabilities } = message.payload;
    const agentDid = message.header.senderId;

    // Create session
    const sessionId = ulid();
    this.sessions.set(sessionId, context);

    // Create ACK response
    return {
      header: {
        version: message.header.version,
        messageType: MESSAGE_TYPES.HANDSHAKE_ACK,
        messageId: ulid(),
        senderId: 'did:aid:anoteroslogos' as DIDString,
        recipientId: agentDid,
        timestamp: new Date().toISOString(),
        signature: '', // Signed by server
      },
      payload: {
        capabilities,
        sessionParams: {
          sessionId,
          timeout: 3600000, // 1 hour in ms
          keepalive: 30000, // 30s in ms
        },
      },
      trustAttestation: context.trustScore
        ? {
            trustScore: context.trustScore,
            proof: '',
            watermark: '',
            consensusRound: 0,
            ledgerHash: '',
            attestedAt: context.timestamp,
          }
        : undefined,
    } as UAPMessage;
  }

  /**
   * Handle HandshakeFIN
   */
  private async handleHandshakeFIN(
    message: UAPMessage<HandshakeFINPayload>,
    _context: MessageContext
  ): Promise<UAPMessage | null> {
    const { sessionId } = message.payload;

    // Remove session
    this.sessions.delete(sessionId);

    // Create FIN response
    return {
      header: {
        version: message.header.version,
        messageType: MESSAGE_TYPES.HANDSHAKE_FIN,
        messageId: ulid(),
        senderId: 'did:aid:anoteroslogos' as DIDString,
        recipientId: message.header.senderId,
        timestamp: new Date().toISOString(),
        signature: '',
      },
      payload: {
        sessionId,
        reason: 'acknowledged',
      },
    } as UAPMessage;
  }

  /**
   * Handle generic request
   */
  private async handleRequest(
    message: UAPMessage<RequestPayload>,
    _context: MessageContext
  ): Promise<UAPMessage | null> {
    // Generic handler - delegates to application logic
    // Application should register specific handlers via registerRoute

    return {
      header: {
        version: message.header.version,
        messageType: MESSAGE_TYPES.RESPONSE,
        messageId: ulid(),
        senderId: 'did:aid:anoteroslogos' as DIDString,
        recipientId: message.header.senderId,
        timestamp: new Date().toISOString(),
        signature: '',
      },
      payload: {
        taskId: (message.payload as RequestPayload).taskId,
        status: 'accepted' as const,
        result: { message: 'Request processed' },
      },
    } as UAPMessage;
  }

  /**
   * Validate UAP message schema
   */
  private validateMessage(message: UAPMessage): { valid: boolean; error?: string } {
    try {
      switch (message.header.messageType) {
        case MESSAGE_TYPES.HANDSHAKE_SYN:
          HandshakeSYNSchema.parse(message.payload);
          break;
        case MESSAGE_TYPES.HANDSHAKE_ACK:
          HandshakeACKSchema.parse(message.payload);
          break;
        case MESSAGE_TYPES.HANDSHAKE_FIN:
          HandshakeFINSchema.parse(message.payload);
          break;
        case MESSAGE_TYPES.REQUEST:
          RequestSchema.parse(message.payload);
          break;
        case MESSAGE_TYPES.RESPONSE:
          ResponseSchema.parse(message.payload);
          break;
        case MESSAGE_TYPES.ERROR:
          ErrorResponseSchema.parse(message.payload);
          break;
        default:
          return { valid: false, error: 'Unknown message type' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Extract agent DID from message
   */
  private extractAgentDID(message: UAPMessage): DIDString | null {
    // DID is in header.senderId
    if (message.header.senderId) {
      return message.header.senderId;
    }

    return null;
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    originalMessage: UAPMessage,
    errorCode: number,
    message: string,
    details?: Record<string, unknown>
  ): UAPMessage<ErrorPayload> {
    return {
      header: {
        version: originalMessage.header.version,
        messageType: MESSAGE_TYPES.ERROR,
        messageId: ulid(),
        senderId: 'did:aid:anoteroslogos' as DIDString,
        recipientId: originalMessage.header.senderId,
        timestamp: new Date().toISOString(),
        signature: '',
      },
      payload: {
        code: errorCode,
        message,
        details,
      },
    };
  }

  /**
   * Create generic ACK response
   */
  private createAckResponse(originalMessage: UAPMessage): UAPMessage<ResponsePayload> {
    return {
      header: {
        version: originalMessage.header.version,
        messageType: MESSAGE_TYPES.RESPONSE,
        messageId: ulid(),
        senderId: 'did:aid:anoteroslogos' as DIDString,
        recipientId: originalMessage.header.senderId,
        timestamp: new Date().toISOString(),
        signature: '',
      },
      payload: {
        taskId: 'ack',
        status: 'accepted' as const,
        result: { acknowledged: true },
      },
    };
  }

  /**
   * Get session context
   */
  getSession(sessionId: string): MessageContext | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Map<string, MessageContext> {
    return new Map(this.sessions);
  }

  /**
   * Close session
   */
  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[MessageRouter] Closed session: ${sessionId}`);
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      routes: this.routes.size,
      activeSessions: this.sessions.size,
      rateLimit: this.rateLimiter.getGlobalStats(),
      circuitBreaker: this.circuitBreaker.getGlobalStats(),
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let routerInstance: MessageRouter | null = null;

export function getMessageRouter(): MessageRouter {
  if (!routerInstance) {
    routerInstance = new MessageRouter();
  }
  return routerInstance;
}

export default MessageRouter;
