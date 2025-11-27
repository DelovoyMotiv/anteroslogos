/**
 * UAP Connection Manager
 * Manages WebSocket connections with auto-reconnect and health monitoring
 * 
 * @module src/protocols/uap/client/connectionManager
 * @version 1.0.0
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import type { DIDString, UAPMessage } from '../types';
import { TIMEOUTS } from '../constants';

// =====================================================
// TYPES
// =====================================================

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface ConnectionConfig {
  /** Server WebSocket URL */
  url: string;
  
  /** Client DID */
  clientDid: DIDString;
  
  /** Tenant ID (if multi-tenant) */
  tenantId?: string | null;
  
  /** Enable auto-reconnect */
  autoReconnect?: boolean;
  
  /** Initial reconnect delay (ms) */
  reconnectDelay?: number;
  
  /** Max reconnect delay (ms) */
  maxReconnectDelay?: number;
  
  /** Reconnect backoff multiplier */
  reconnectMultiplier?: number;
  
  /** Max reconnect attempts (0 = infinite) */
  maxReconnectAttempts?: number;
  
  /** Connection timeout (ms) */
  connectionTimeout?: number;
  
  /** Heartbeat interval (ms) */
  heartbeatInterval?: number;
  
  /** Request timeout (ms) */
  requestTimeout?: number;
}

export interface ConnectionMetrics {
  /** Connection state */
  state: ConnectionState;
  
  /** Connected since timestamp */
  connectedSince: Date | null;
  
  /** Total connect attempts */
  connectAttempts: number;
  
  /** Current reconnect attempt */
  currentReconnectAttempt: number;
  
  /** Messages sent */
  messagesSent: number;
  
  /** Messages received */
  messagesReceived: number;
  
  /** Last message timestamp */
  lastMessageAt: Date | null;
  
  /** Last error */
  lastError: Error | null;
  
  /** Average RTT (ms) */
  averageRTT: number;
}

// =====================================================
// CONNECTION MANAGER
// =====================================================

export class ConnectionManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<Omit<ConnectionConfig, 'tenantId'>> & { tenantId?: string | null };
  private state: ConnectionState = 'disconnected';
  private metrics: ConnectionMetrics;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private currentReconnectDelay: number;
  private pendingRequests: Map<string, {
    resolve: (message: UAPMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private rttSamples: number[] = [];
  private readonly MAX_RTT_SAMPLES = 10;

  constructor(config: ConnectionConfig) {
    super();
    
    this.config = {
      url: config.url,
      clientDid: config.clientDid,
      tenantId: config.tenantId,
      autoReconnect: config.autoReconnect !== false,
      reconnectDelay: config.reconnectDelay || TIMEOUTS.RECONNECT_BASE,
      maxReconnectDelay: config.maxReconnectDelay || TIMEOUTS.RECONNECT_MAX,
      reconnectMultiplier: config.reconnectMultiplier || 2,
      maxReconnectAttempts: config.maxReconnectAttempts || 0,
      connectionTimeout: config.connectionTimeout || TIMEOUTS.HANDSHAKE,
      heartbeatInterval: config.heartbeatInterval || TIMEOUTS.HEARTBEAT,
      requestTimeout: config.requestTimeout || TIMEOUTS.REQUEST,
    };

    this.currentReconnectDelay = this.config.reconnectDelay;

    this.metrics = {
      state: 'disconnected',
      connectedSince: null,
      connectAttempts: 0,
      currentReconnectAttempt: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastMessageAt: null,
      lastError: null,
      averageRTT: 0,
    };

    console.log(`[ConnectionManager] Initialized for ${config.clientDid}`);
  }

  /**
   * Connect to UAP server
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.warn('[ConnectionManager] Already connected or connecting');
      return;
    }

    return new Promise((resolve, reject) => {
      this.setState('connecting');
      this.metrics.connectAttempts++;

      const wsUrl = this.config.tenantId
        ? `${this.config.url}?tenant=${this.config.tenantId}`
        : this.config.url;

      console.log(`[ConnectionManager] Connecting to ${wsUrl}...`);

      try {
        this.ws = new WebSocket(wsUrl);

        // Connection timeout
        this.connectionTimer = setTimeout(() => {
          if (this.state === 'connecting') {
            const error = new Error('Connection timeout');
            this.handleError(error);
            reject(error);
          }
        }, this.config.connectionTimeout);

        this.ws.on('open', () => {
          this.handleOpen();
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
          }
          resolve();
        });

        this.ws.on('message', (data: Buffer) => this.handleMessage(data));
        this.ws.on('close', (code: number, reason: Buffer) => 
          this.handleClose(code, reason.toString())
        );
        this.ws.on('error', (error: Error) => {
          this.handleError(error);
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
          }
          reject(error);
        });
        this.ws.on('pong', () => this.handlePong());

      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error('Connection failed'));
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    // Reject all pending requests
    for (const [messageId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
      this.pendingRequests.delete(messageId);
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
    console.log('[ConnectionManager] Disconnected');
  }

  /**
   * Send UAP message
   */
  async send(message: UAPMessage): Promise<void> {
    if (!this.ws || this.state !== 'connected') {
      throw new Error('Not connected');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      try {
        const payload = JSON.stringify(message);
        this.ws!.send(payload, (error) => {
          if (error) {
            reject(error);
          } else {
            this.metrics.messagesSent++;
            this.metrics.lastMessageAt = new Date();
            
            // Record RTT sample
            const rtt = Date.now() - startTime;
            this.recordRTT(rtt);
            
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send request and wait for response
   */
  async request(message: UAPMessage): Promise<UAPMessage> {
    await this.send(message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.header.messageId);
        reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(message.header.messageId, {
        resolve,
        reject,
        timeout,
      });
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics, state: this.state };
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('[ConnectionManager] Connected');
    
    this.setState('connected');
    this.metrics.connectedSince = new Date();
    this.metrics.currentReconnectAttempt = 0;
    this.currentReconnectDelay = this.config.reconnectDelay;
    this.metrics.lastError = null;

    // Start heartbeat
    this.startHeartbeat();

    this.emit('connected');
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: Buffer): void {
    try {
      const message: UAPMessage = JSON.parse(data.toString('utf-8'));
      
      this.metrics.messagesReceived++;
      this.metrics.lastMessageAt = new Date();

      // Check if this is a response to a pending request
      const correlationId = message.header.correlationId;
      if (correlationId) {
        const pending = this.pendingRequests.get(correlationId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(message);
          this.pendingRequests.delete(correlationId);
          return;
        }
      }

      // Emit as generic message event
      this.emit('message', message);

    } catch (error) {
      console.error('[ConnectionManager] Failed to parse message:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(code: number, reason: string): void {
    console.log(`[ConnectionManager] Connection closed: ${code} - ${reason}`);
    
    this.setState('disconnected');
    this.metrics.connectedSince = null;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.emit('disconnected', { code, reason });

    // Auto-reconnect if enabled
    if (this.config.autoReconnect && code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error): void {
    console.error('[ConnectionManager] Connection error:', error);
    
    this.metrics.lastError = error;
    this.emit('error', error);

    if (this.state === 'connecting') {
      this.setState('failed');
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(): void {
    // Connection alive
  }

  /**
   * Schedule reconnect attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.metrics.currentReconnectAttempt++;

    // Check max attempts
    if (
      this.config.maxReconnectAttempts > 0 &&
      this.metrics.currentReconnectAttempt > this.config.maxReconnectAttempts
    ) {
      console.error('[ConnectionManager] Max reconnect attempts reached');
      this.setState('failed');
      this.emit('reconnect-failed');
      return;
    }

    console.log(
      `[ConnectionManager] Scheduling reconnect in ${this.currentReconnectDelay}ms (attempt ${this.metrics.currentReconnectAttempt})`
    );

    this.setState('reconnecting');

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      try {
        await this.connect();
        this.emit('reconnected');
      } catch (error) {
        console.error('[ConnectionManager] Reconnect failed:', error);
        
        // Exponential backoff
        this.currentReconnectDelay = Math.min(
          this.currentReconnectDelay * this.config.reconnectMultiplier,
          this.config.maxReconnectDelay
        );

        this.scheduleReconnect();
      }
    }, this.currentReconnectDelay);
  }

  /**
   * Start heartbeat ping
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Set connection state
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.metrics.state = state;
      this.emit('state-change', state);
    }
  }

  /**
   * Record RTT sample
   */
  private recordRTT(rtt: number): void {
    this.rttSamples.push(rtt);
    if (this.rttSamples.length > this.MAX_RTT_SAMPLES) {
      this.rttSamples.shift();
    }

    // Calculate average
    const sum = this.rttSamples.reduce((a, b) => a + b, 0);
    this.metrics.averageRTT = Math.round(sum / this.rttSamples.length);
  }
}

export default ConnectionManager;
