/**
 * UAP WebSocket Adapter
 * Bidirectional streaming for UAP sessions
 * 
 * @module src/protocols/uap/transport/wsAdapter
 * @version 1.0.0
 */

import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { IncomingMessage } from 'http';
import type { UAPMessage, DIDString, HandshakeACKPayload } from '../types';
import { getMessageRouter, type MessageContext } from './messageRouter';
import { UAP_ERROR_CODES } from '../constants';

// =====================================================
// TYPES
// =====================================================

export interface WSClientConnection {
  /** WebSocket connection */
  ws: WebSocket;
  /** Agent DID */
  agentDid: DIDString | null;
  /** Session ID */
  sessionId: string | null;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Message count */
  messageCount: number;
  /** Remote address */
  remoteAddr: string;
  /** Tenant ID */
  tenantId: string | null;
}

export interface WSAdapterConfig {
  /** Port to listen on */
  port?: number;
  /** Path for WebSocket endpoint */
  path?: string;
  /** Heartbeat interval (ms) */
  heartbeatInterval?: number;
  /** Connection timeout (ms) */
  connectionTimeout?: number;
  /** Max payload size (bytes) */
  maxPayloadSize?: number;
  /** Enable per-message compression */
  perMessageDeflate?: boolean;
}

// =====================================================
// WEBSOCKET ADAPTER
// =====================================================

export class WSAdapter {
  private wss: WebSocketServer | null = null;
  private connections: Map<WebSocket, WSClientConnection> = new Map();
  private router = getMessageRouter();
  private config: Required<WSAdapterConfig>;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: WSAdapterConfig = {}) {
    this.config = {
      port: config.port || 8080,
      path: config.path || '/uap/ws',
      heartbeatInterval: config.heartbeatInterval || 30000, // 30s
      connectionTimeout: config.connectionTimeout || 120000, // 2min
      maxPayloadSize: config.maxPayloadSize || 1024 * 1024, // 1MB
      perMessageDeflate: config.perMessageDeflate !== false,
    };
  }

  /**
   * Start WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.config.port,
          path: this.config.path,
          perMessageDeflate: this.config.perMessageDeflate,
          maxPayload: this.config.maxPayloadSize,
          clientTracking: true,
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        this.wss.on('error', (error) => {
          console.error('[WSAdapter] Server error:', error);
        });

        // Start heartbeat
        this.startHeartbeat();

        console.log(
          `[WSAdapter] Started on port ${this.config.port} (path: ${this.config.path})`
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Close all connections
      for (const [ws, conn] of this.connections.entries()) {
        ws.close(1000, 'Server shutting down');
        this.connections.delete(ws);
        console.log(`[WSAdapter] Closed connection: ${conn.agentDid || 'unknown'}`);
      }

      // Close server
      if (this.wss) {
        this.wss.close(() => {
          console.log('[WSAdapter] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const remoteAddr =
      request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      request.socket.remoteAddress ||
      'unknown';

    // Extract tenant ID from query params or headers
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const tenantId = url.searchParams.get('tenant') || null;

    const connection: WSClientConnection = {
      ws,
      agentDid: null,
      sessionId: null,
      connectedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      remoteAddr,
      tenantId,
    };

    this.connections.set(ws, connection);
    console.log(`[WSAdapter] New connection from ${remoteAddr} (tenant: ${tenantId || 'none'})`);

    // Setup event handlers
    ws.on('message', (data: RawData) => this.handleMessage(ws, data, connection));
    ws.on('close', (code: number, reason: Buffer) =>
      this.handleClose(ws, code, reason.toString())
    );
    ws.on('error', (error: Error) => this.handleError(ws, error));
    ws.on('pong', () => {
      connection.lastActivity = new Date();
    });

    // Send welcome message
    this.sendMessage(ws, {
      header: {
        version: '1.0.0',
        type: 'system.connected',
        messageId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sender: 'did:aid:anoteroslogos',
        recipient: '',
      },
      payload: {
        message: 'Connected to Anóteros Lógos UAP Gateway',
        serverTime: new Date().toISOString(),
      },
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(
    ws: WebSocket,
    data: RawData,
    connection: WSClientConnection
  ): Promise<void> {
    connection.lastActivity = new Date();
    connection.messageCount++;

    try {
      // Parse UAP message
      const messageText = data.toString('utf-8');
      const message: UAPMessage = JSON.parse(messageText);

      // Update connection metadata
      if (!connection.agentDid && message.header.senderId) {
        connection.agentDid = message.header.senderId;
      }

      // Route message through UAP router
      const routeContext: Partial<MessageContext> = {
        agentDid: connection.agentDid || undefined,
        sessionId: connection.sessionId || undefined,
        remoteAddr: connection.remoteAddr,
        tenantId: connection.tenantId,
      };

      const response = await this.router.routeMessage(message, routeContext);

      // Update sessionId from response if available
      if (!connection.sessionId && response.payload && typeof response.payload === 'object') {
        const payload = response.payload as HandshakeACKPayload;
        if ('sessionParams' in payload && payload.sessionParams?.sessionId) {
          connection.sessionId = payload.sessionParams.sessionId;
        }
      }

      // Send response
      this.sendMessage(ws, response);
    } catch (error) {
      console.error('[WSAdapter] Message handling error:', error);

      // Send error response
      this.sendMessage(ws, {
        header: {
          version: '1.0.0',
          type: 'error',
          messageId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          sender: 'did:aid:anoteroslogos',
          recipient: connection.agentDid || '',
        },
        payload: {
          errorCode: UAP_ERROR_CODES.INVALID_MESSAGE,
          message: error instanceof Error ? error.message : 'Invalid message format',
        },
      });
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(ws: WebSocket, code: number, reason: string): void {
    const connection = this.connections.get(ws);
    if (connection) {
      console.log(
        `[WSAdapter] Connection closed: ${connection.agentDid || 'unknown'} (code: ${code}, reason: ${reason || 'none'})`
      );

      // Clean up session
      if (connection.sessionId) {
        this.router.closeSession(connection.sessionId);
      }

      this.connections.delete(ws);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(ws: WebSocket, error: Error): void {
    const connection = this.connections.get(ws);
    console.error(
      `[WSAdapter] Connection error: ${connection?.agentDid || 'unknown'}`,
      error
    );
  }

  /**
   * Send UAP message to WebSocket client
   */
  private sendMessage(ws: WebSocket, message: UAPMessage | Record<string, unknown>): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const payload = JSON.stringify(message);
        ws.send(payload);
      } catch (error) {
        console.error('[WSAdapter] Failed to send message:', error);
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: UAPMessage, filter?: (conn: WSClientConnection) => boolean): void {
    for (const [ws, conn] of this.connections.entries()) {
      if (!filter || filter(conn)) {
        this.sendMessage(ws, message);
      }
    }
  }

  /**
   * Send message to specific agent
   */
  sendToAgent(agentDid: DIDString, message: UAPMessage): boolean {
    for (const [ws, conn] of this.connections.entries()) {
      if (conn.agentDid === agentDid) {
        this.sendMessage(ws, message);
        return true;
      }
    }
    return false;
  }

  /**
   * Send message to specific session
   */
  sendToSession(sessionId: string, message: UAPMessage): boolean {
    for (const [ws, conn] of this.connections.entries()) {
      if (conn.sessionId === sessionId) {
        this.sendMessage(ws, message);
        return true;
      }
    }
    return false;
  }

  /**
   * Start heartbeat pings
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.connectionTimeout;

      for (const [ws, conn] of this.connections.entries()) {
        // Check for stale connections
        const inactive = now - conn.lastActivity.getTime();
        if (inactive > timeout) {
          console.warn(
            `[WSAdapter] Closing stale connection: ${conn.agentDid || 'unknown'} (inactive: ${inactive}ms)`
          );
          ws.close(1000, 'Connection timeout');
          this.connections.delete(ws);
          continue;
        }

        // Send ping
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    connections: Array<{
      agentDid: DIDString | null;
      sessionId: string | null;
      remoteAddr: string;
      messageCount: number;
      connectedDuration: number;
      lastActivity: Date;
    }>;
  } {
    const connections = Array.from(this.connections.values()).map((conn) => ({
      agentDid: conn.agentDid,
      sessionId: conn.sessionId,
      remoteAddr: conn.remoteAddr,
      messageCount: conn.messageCount,
      connectedDuration: Date.now() - conn.connectedAt.getTime(),
      lastActivity: conn.lastActivity,
    }));

    return {
      totalConnections: this.connections.size,
      activeConnections: connections.filter((c) => c.agentDid !== null).length,
      connections,
    };
  }

  /**
   * Get connection by agent DID
   */
  getConnectionByAgent(agentDid: DIDString): WSClientConnection | null {
    for (const conn of this.connections.values()) {
      if (conn.agentDid === agentDid) {
        return conn;
      }
    }
    return null;
  }

  /**
   * Get all connections for tenant
   */
  getConnectionsByTenant(tenantId: string): WSClientConnection[] {
    const connections: WSClientConnection[] = [];
    for (const conn of this.connections.values()) {
      if (conn.tenantId === tenantId) {
        connections.push(conn);
      }
    }
    return connections;
  }

  /**
   * Close connection by agent DID
   */
  closeConnectionByAgent(agentDid: DIDString, reason?: string): boolean {
    for (const [ws, conn] of this.connections.entries()) {
      if (conn.agentDid === agentDid) {
        ws.close(1000, reason || 'Closed by server');
        this.connections.delete(ws);
        return true;
      }
    }
    return false;
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let wsAdapterInstance: WSAdapter | null = null;

export function getWSAdapter(): WSAdapter {
  if (!wsAdapterInstance) {
    wsAdapterInstance = new WSAdapter();
  }
  return wsAdapterInstance;
}

export function initWSAdapter(config?: WSAdapterConfig): WSAdapter {
  if (wsAdapterInstance) {
    wsAdapterInstance.stop();
  }
  wsAdapterInstance = new WSAdapter(config);
  return wsAdapterInstance;
}

export default WSAdapter;
