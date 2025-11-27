/**
 * UAP Client
 * High-level client for UAP communication
 * 
 * @module src/protocols/uap/client/uapClient
 * @version 1.0.0
 */

import { ulid } from 'ulid';
import { EventEmitter } from 'events';
import type {
  DIDString,
  UAPMessage,
  AgentCapabilities,
  RequestPayload,
  ResponsePayload,
  ErrorPayload,
} from '../types';
import { UAPMessageType } from '../constants';
import { ConnectionManager, type ConnectionConfig } from './connectionManager';
import { SessionManager, type SessionConfig, type SessionInfo } from './sessionManager';

// =====================================================
// TYPES
// =====================================================

export interface UAPClientConfig {
  /** Server WebSocket URL */
  serverUrl: string;
  
  /** Client DID */
  clientDid: DIDString;
  
  /** Client capabilities */
  capabilities: AgentCapabilities;
  
  /** Tenant ID (if multi-tenant) */
  tenantId?: string | null;
  
  /** Enable auto-reconnect */
  autoReconnect?: boolean;
  
  /** Enable auto-handshake on connect */
  autoHandshake?: boolean;
  
  /** Session timeout (ms) */
  sessionTimeout?: number;
  
  /** Session keepalive (ms) */
  keepaliveInterval?: number;
}

export interface RequestOptions {
  /** Task ID */
  taskId?: string;
  
  /** Capability to invoke */
  capability: string;
  
  /** Request parameters */
  parameters: Record<string, unknown>;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Priority */
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

// =====================================================
// UAP CLIENT
// =====================================================

export class UAPClient extends EventEmitter {
  private connection: ConnectionManager;
  private session: SessionManager;
  private config: Required<Omit<UAPClientConfig, 'tenantId'>> & { tenantId?: string | null };

  constructor(config: UAPClientConfig) {
    super();

    this.config = {
      serverUrl: config.serverUrl,
      clientDid: config.clientDid,
      capabilities: config.capabilities,
      tenantId: config.tenantId,
      autoReconnect: config.autoReconnect !== false,
      autoHandshake: config.autoHandshake !== false,
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      keepaliveInterval: config.keepaliveInterval || 30000, // 30s
    };

    // Initialize connection manager
    const connectionConfig: ConnectionConfig = {
      url: this.config.serverUrl,
      clientDid: this.config.clientDid,
      tenantId: this.config.tenantId,
      autoReconnect: this.config.autoReconnect,
    };

    this.connection = new ConnectionManager(connectionConfig);

    // Initialize session manager
    const sessionConfig: SessionConfig = {
      clientDid: this.config.clientDid,
      capabilities: this.config.capabilities,
      sessionTimeout: this.config.sessionTimeout,
      keepaliveInterval: this.config.keepaliveInterval,
    };

    this.session = new SessionManager(this.connection, sessionConfig);

    // Setup event forwarding
    this.setupEventForwarding();

    console.log(`[UAPClient] Initialized for ${config.clientDid}`);
  }

  /**
   * Connect to UAP server and perform handshake
   */
  async connect(): Promise<SessionInfo> {
    // Connect transport
    await this.connection.connect();

    // Perform handshake if enabled
    if (this.config.autoHandshake) {
      return this.session.handshake();
    }

    return {} as SessionInfo;
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    await this.session.close();
    await this.connection.disconnect();
  }

  /**
   * Send UAP request and wait for response
   */
  async request(options: RequestOptions): Promise<UAPMessage<ResponsePayload>> {
    if (!this.session.isEstablished()) {
      throw new Error('Session not established');
    }

    const sessionInfo = this.session.getSession()!;
    const taskId = options.taskId || ulid();

    // Create request message
    const requestMessage: UAPMessage<RequestPayload> = {
      header: {
        version: sessionInfo.agreedVersion,
        messageType: UAPMessageType.DELEGATION_REQUEST,
        messageId: ulid(),
        senderId: this.config.clientDid,
        recipientId: sessionInfo.serverDid,
        timestamp: new Date().toISOString(),
        signature: '',
      },
      payload: {
        taskId,
        capability: options.capability,
        parameters: options.parameters,
        priority: options.priority,
      },
    };

    console.log(`[UAPClient] Sending request: ${options.capability} (task: ${taskId})`);

    // Send and wait for response
    const response = await this.connection.request(requestMessage);

    // Validate response type
    if (response.header.messageType === UAPMessageType.ERROR) {
      const errorPayload = response.payload as ErrorPayload;
      throw new Error(`Request failed: ${errorPayload.message || 'Unknown error'}`);
    }

    return response as UAPMessage<ResponsePayload>;
  }

  /**
   * Send fire-and-forget message
   */
  async send(message: UAPMessage): Promise<void> {
    return this.connection.send(message);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection.isConnected();
  }

  /**
   * Check if session is established
   */
  hasSession(): boolean {
    return this.session.isEstablished();
  }

  /**
   * Get session info
   */
  getSession(): SessionInfo | null {
    return this.session.getSession();
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      connection: this.connection.getMetrics(),
      session: {
        state: this.session.getState(),
        info: this.session.getSession(),
      },
    };
  }

  /**
   * Setup event forwarding from lower layers
   */
  private setupEventForwarding(): void {
    // Forward connection events
    this.connection.on('connected', () => {
      this.emit('connected');
      
      // Auto-handshake if enabled
      if (this.config.autoHandshake) {
        this.session.handshake().catch((error) => {
          console.error('[UAPClient] Auto-handshake failed:', error);
          this.emit('handshake-failed', error);
        });
      }
    });

    this.connection.on('disconnected', (data) => {
      this.emit('disconnected', data);
    });

    this.connection.on('reconnecting', () => {
      this.emit('reconnecting');
    });

    this.connection.on('reconnected', () => {
      this.emit('reconnected');
      
      // Re-handshake after reconnect
      if (this.config.autoHandshake) {
        this.session.handshake().catch((error) => {
          console.error('[UAPClient] Re-handshake failed:', error);
          this.emit('handshake-failed', error);
        });
      }
    });

    this.connection.on('error', (error) => {
      this.emit('error', error);
    });

    this.connection.on('message', (message) => {
      this.emit('message', message);
    });

    this.connection.on('state-change', (state) => {
      this.emit('connection-state', state);
    });
  }
}

export default UAPClient;
