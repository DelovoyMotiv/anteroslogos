/**
 * UAP Session Manager
 * Handles UAP handshake protocol and session lifecycle
 * 
 * @module src/protocols/uap/client/sessionManager
 * @version 1.0.0
 */

import { ulid } from 'ulid';
import type {
  DIDString,
  UAPMessage,
  HandshakeSYNPayload,
  HandshakeACKPayload,
  HandshakeFINPayload,
  AgentCapabilities,
  TrustAttestation,
} from '../types';
import { UAPMessageType } from '../constants';
import type { ConnectionManager } from './connectionManager';

// =====================================================
// TYPES
// =====================================================

export interface SessionConfig {
  /** Client DID */
  clientDid: DIDString;
  
  /** Client capabilities */
  capabilities: AgentCapabilities;
  
  /** Session timeout (ms) */
  sessionTimeout?: number;
  
  /** Session keepalive interval (ms) */
  keepaliveInterval?: number;
}

export interface SessionInfo {
  /** Session ID */
  sessionId: string;
  
  /** Server DID */
  serverDid: DIDString;
  
  /** Server capabilities */
  serverCapabilities: AgentCapabilities;
  
  /** Agreed protocol version */
  agreedVersion: string;
  
  /** Session timeout (ms) */
  timeout: number;
  
  /** Session keepalive (ms) */
  keepalive: number;
  
  /** Trust attestation (if provided) */
  trustAttestation?: TrustAttestation;
  
  /** Session established timestamp */
  establishedAt: Date;
  
  /** Session expires at */
  expiresAt: Date;
}

export type SessionState = 'idle' | 'handshaking' | 'established' | 'failed' | 'closed';

// =====================================================
// SESSION MANAGER
// =====================================================

export class SessionManager {
  private connection: ConnectionManager;
  private config: SessionConfig;
  private state: SessionState = 'idle';
  private session: SessionInfo | null = null;
  private keepaliveTimer: NodeJS.Timeout | null = null;

  constructor(connection: ConnectionManager, config: SessionConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Perform UAP handshake
   */
  async handshake(): Promise<SessionInfo> {
    if (this.state === 'established') {
      console.warn('[SessionManager] Session already established');
      return this.session!;
    }

    if (this.state === 'handshaking') {
      throw new Error('Handshake already in progress');
    }

    this.state = 'handshaking';

    try {
      // Create HandshakeSYN message
      const synMessage: UAPMessage<HandshakeSYNPayload> = {
        header: {
          version: '1.0',
          messageType: UAPMessageType.HANDSHAKE_SYN,
          messageId: ulid(),
          senderId: this.config.clientDid,
          recipientId: null,
          timestamp: new Date().toISOString(),
          signature: '', // Signed by client
        },
        payload: {
          capabilities: this.config.capabilities,
          sessionParams: {
            timeout: this.config.sessionTimeout,
            keepalive: this.config.keepaliveInterval,
          },
        },
      };

      console.log(`[SessionManager] Sending HandshakeSYN...`);

      // Send and wait for ACK
      const ackMessage = await this.connection.request(synMessage);

      // Validate ACK
      if (ackMessage.header.messageType !== UAPMessageType.HANDSHAKE_ACK) {
        throw new Error(`Expected HandshakeACK, got ${ackMessage.header.messageType}`);
      }

      const ackPayload = ackMessage.payload as HandshakeACKPayload;

      // Check for rejection
      if (ackPayload.rejectionReason) {
        this.state = 'failed';
        throw new Error(`Handshake rejected: ${ackPayload.rejectionReason}`);
      }

      // Extract session info
      const sessionParams = ackPayload.sessionParams;
      if (!sessionParams || !sessionParams.sessionId) {
        throw new Error('Invalid HandshakeACK: missing session parameters');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + sessionParams.timeout);

      this.session = {
        sessionId: sessionParams.sessionId,
        serverDid: ackMessage.header.senderId,
        serverCapabilities: ackPayload.capabilities,
        agreedVersion: ackMessage.header.version,
        timeout: sessionParams.timeout,
        keepalive: sessionParams.keepalive,
        trustAttestation: ackMessage.trustAttestation,
        establishedAt: now,
        expiresAt,
      };

      this.state = 'established';

      console.log(
        `[SessionManager] ✅ Session established: ${this.session.sessionId} (expires: ${expiresAt.toISOString()})`
      );

      // Log trust attestation if present
      if (this.session.trustAttestation) {
        console.log(
          `[SessionManager] Trust Score: ${this.session.trustAttestation.trustScore}/100 (Round: ${this.session.trustAttestation.consensusRound})`
        );
      }

      // Start keepalive
      this.startKeepalive();

      return this.session;
    } catch (error) {
      this.state = 'failed';
      console.error('[SessionManager] Handshake failed:', error);
      throw error;
    }
  }

  /**
   * Close session
   */
  async close(): Promise<void> {
    if (this.state !== 'established') {
      console.warn('[SessionManager] No active session to close');
      return;
    }

    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }

    // Send HandshakeFIN message
    if (this.session) {
      try {
        const finMessage: UAPMessage<HandshakeFINPayload> = {
          header: {
            version: this.session.agreedVersion,
            messageType: 'handshake.fin' as UAPMessageType,
            messageId: ulid(),
            senderId: this.config.clientDid,
            recipientId: this.session.serverDid,
            timestamp: new Date().toISOString(),
            signature: '',
          },
          payload: {
            sessionId: this.session.sessionId,
            reason: 'client_initiated',
          },
        };

        // Fire-and-forget (don't wait for response)
        await this.connection.send(finMessage).catch((error) => {
          console.warn('[SessionManager] Failed to send HandshakeFIN:', error);
        });

        console.log(`[SessionManager] Sent HandshakeFIN for session ${this.session.sessionId}`);
      } catch (error) {
        console.error('[SessionManager] Error sending HandshakeFIN:', error);
      }
    }

    this.session = null;
    this.state = 'closed';

    console.log('[SessionManager] Session closed');
  }

  /**
   * Check if session is established
   */
  isEstablished(): boolean {
    return this.state === 'established' && this.session !== null;
  }

  /**
   * Get session info
   */
  getSession(): SessionInfo | null {
    return this.session;
  }

  /**
   * Get session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    if (!this.session) return false;
    return new Date() > this.session.expiresAt;
  }

  /**
   * Refresh session (re-handshake)
   */
  async refresh(): Promise<SessionInfo> {
    await this.close();
    return this.handshake();
  }

  /**
   * Start session keepalive
   */
  private startKeepalive(): void {
    if (this.keepaliveTimer || !this.session) {
      return;
    }

    this.keepaliveTimer = setInterval(() => {
      // Check if session expired
      if (this.isExpired()) {
        console.warn('[SessionManager] Session expired, attempting refresh...');
        this.refresh().catch((error) => {
          console.error('[SessionManager] Failed to refresh session:', error);
          this.state = 'failed';
        });
      }
    }, this.session.keepalive);
  }
}

export default SessionManager;
