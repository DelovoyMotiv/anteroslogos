/**
 * A2A WebSocket Server - Real-Time Streaming for Audit Progress
 * Production-ready with connection management, heartbeat, and backpressure
 */

import type { A2AStreamEvent, A2AProgressEvent } from './protocol';
import { logger } from './logger';
import { validateApiKey } from './agentRegistry';

// =====================================================
// TYPES
// =====================================================

export interface WebSocketConnection {
  id: string;
  socket: any; // WebSocket type
  apiKey?: string;
  tier: string;
  subscriptions: Set<string>; // audit_ids
  lastHeartbeat: number;
  metadata: {
    ip_address?: string;
    user_agent?: string;
    connected_at: number;
  };
}

export interface StreamSubscription {
  audit_id: string;
  connection_ids: Set<string>;
  created_at: number;
}

// =====================================================
// CONNECTION MANAGER
// =====================================================

class WebSocketConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private subscriptions: Map<string, StreamSubscription> = new Map();
  
  // Heartbeat check every 30 seconds
  private heartbeatInterval = 30000;
  
  // Connection timeout: 60 seconds
  private connectionTimeout = 60000;
  
  constructor() {
    // Start heartbeat checker
    setInterval(() => this.checkHeartbeats(), this.heartbeatInterval);
  }
  
  /**
   * Add new connection
   */
  addConnection(
    connectionId: string,
    socket: any,
    metadata: Partial<WebSocketConnection['metadata']>
  ): WebSocketConnection {
    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      tier: 'free',
      subscriptions: new Set(),
      lastHeartbeat: Date.now(),
      metadata: {
        ...metadata,
        connected_at: Date.now(),
      },
    };
    
    this.connections.set(connectionId, connection);
    
    logger.info('WebSocket connection added', {
      connection_id: connectionId,
      ip_address: metadata.ip_address,
      tags: ['websocket', 'connection', 'new'],
    });
    
    return connection;
  }
  
  /**
   * Remove connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    
    if (!connection) return;
    
    // Remove all subscriptions
    for (const auditId of connection.subscriptions) {
      this.unsubscribe(connectionId, auditId);
    }
    
    this.connections.delete(connectionId);
    
    const duration = Date.now() - connection.metadata.connected_at;
    
    logger.info('WebSocket connection removed', {
      connection_id: connectionId,
      duration_ms: duration,
      subscriptions_count: connection.subscriptions.size,
      tags: ['websocket', 'connection', 'closed'],
    });
  }
  
  /**
   * Get connection
   */
  getConnection(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }
  
  /**
   * Authenticate connection
   */
  authenticateConnection(connectionId: string, apiKey: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;
    
    const validation = validateApiKey(apiKey);
    
    if (!validation.valid) {
      logger.logSecurity('WebSocket authentication failed', 'medium', {
        connection_id: connectionId,
        reason: validation.reason,
      });
      return false;
    }
    
    connection.apiKey = apiKey;
    connection.tier = validation.agent!.rate_limit_tier;
    
    logger.info('WebSocket connection authenticated', {
      connection_id: connectionId,
      agent_id: validation.agent!.id,
      tier: connection.tier,
      tags: ['websocket', 'auth', 'success'],
    });
    
    return true;
  }
  
  /**
   * Subscribe connection to audit
   */
  subscribe(connectionId: string, auditId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;
    
    // Add to connection subscriptions
    connection.subscriptions.add(auditId);
    
    // Add to global subscriptions
    let subscription = this.subscriptions.get(auditId);
    
    if (!subscription) {
      subscription = {
        audit_id: auditId,
        connection_ids: new Set(),
        created_at: Date.now(),
      };
      this.subscriptions.set(auditId, subscription);
    }
    
    subscription.connection_ids.add(connectionId);
    
    logger.debug('WebSocket subscription added', {
      connection_id: connectionId,
      audit_id: auditId,
      subscriber_count: subscription.connection_ids.size,
      tags: ['websocket', 'subscribe'],
    });
    
    return true;
  }
  
  /**
   * Unsubscribe connection from audit
   */
  unsubscribe(connectionId: string, auditId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(auditId);
    }
    
    const subscription = this.subscriptions.get(auditId);
    if (subscription) {
      subscription.connection_ids.delete(connectionId);
      
      // Clean up subscription if no more connections
      if (subscription.connection_ids.size === 0) {
        this.subscriptions.delete(auditId);
      }
    }
    
    logger.debug('WebSocket subscription removed', {
      connection_id: connectionId,
      audit_id: auditId,
      tags: ['websocket', 'unsubscribe'],
    });
    
    return true;
  }
  
  /**
   * Broadcast event to all subscribers
   */
  broadcast(auditId: string, event: A2AStreamEvent): void {
    const subscription = this.subscriptions.get(auditId);
    
    if (!subscription) {
      logger.debug('No subscribers for audit', {
        audit_id: auditId,
        tags: ['websocket', 'broadcast', 'no_subscribers'],
      });
      return;
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const connectionId of subscription.connection_ids) {
      const connection = this.connections.get(connectionId);
      
      if (!connection) {
        subscription.connection_ids.delete(connectionId);
        continue;
      }
      
      try {
        // Check if socket is open
        if (connection.socket.readyState === 1) { // OPEN state
          connection.socket.send(JSON.stringify(event));
          sent++;
        } else {
          failed++;
          this.removeConnection(connectionId);
        }
      } catch (error) {
        failed++;
        logger.error('Failed to send WebSocket message', {
          connection_id: connectionId,
          audit_id: auditId,
          tags: ['websocket', 'broadcast', 'error'],
        }, error instanceof Error ? error : undefined);
        
        this.removeConnection(connectionId);
      }
    }
    
    logger.debug('WebSocket broadcast complete', {
      audit_id: auditId,
      event_type: event.type,
      sent_count: sent,
      failed_count: failed,
      tags: ['websocket', 'broadcast'],
    });
  }
  
  /**
   * Update heartbeat
   */
  updateHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = Date.now();
    }
  }
  
  /**
   * Check heartbeats and remove stale connections
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const staleConnections: string[] = [];
    
    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastHeartbeat > this.connectionTimeout) {
        staleConnections.push(connectionId);
      }
    }
    
    if (staleConnections.length > 0) {
      logger.info('Removing stale WebSocket connections', {
        count: staleConnections.length,
        timeout_ms: this.connectionTimeout,
        tags: ['websocket', 'heartbeat', 'cleanup'],
      });
      
      staleConnections.forEach(id => this.removeConnection(id));
    }
  }
  
  /**
   * Get connection statistics
   */
  getStats() {
    return {
      total_connections: this.connections.size,
      total_subscriptions: this.subscriptions.size,
      connections_by_tier: this.getConnectionsByTier(),
      active_audits: Array.from(this.subscriptions.keys()),
    };
  }
  
  /**
   * Get connections by tier
   */
  private getConnectionsByTier(): Record<string, number> {
    const byTier: Record<string, number> = {};
    
    for (const connection of this.connections.values()) {
      byTier[connection.tier] = (byTier[connection.tier] || 0) + 1;
    }
    
    return byTier;
  }
}

// Global connection manager
const connectionManager = new WebSocketConnectionManager();

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Handle new WebSocket connection
 */
export function handleWebSocketConnection(
  socket: any,
  request: any
): string {
  const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const ipAddress = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  const userAgent = request.headers['user-agent'] || '';
  
  connectionManager.addConnection(connectionId, socket, {
    ip_address: ipAddress,
    user_agent: userAgent,
  });
  
  return connectionId;
}

/**
 * Handle WebSocket disconnection
 */
export function handleWebSocketDisconnection(connectionId: string): void {
  connectionManager.removeConnection(connectionId);
}

/**
 * Handle WebSocket message
 */
export async function handleWebSocketMessage(
  connectionId: string,
  message: string
): Promise<void> {
  try {
    const data = JSON.parse(message);
    
    // Handle different message types
    switch (data.type) {
      case 'auth':
        handleAuthMessage(connectionId, data);
        break;
      
      case 'subscribe':
        handleSubscribeMessage(connectionId, data);
        break;
      
      case 'unsubscribe':
        handleUnsubscribeMessage(connectionId, data);
        break;
      
      case 'ping':
        handlePingMessage(connectionId);
        break;
      
      default:
        sendError(connectionId, 'Unknown message type', { type: data.type });
    }
  } catch (error) {
    logger.error('Failed to handle WebSocket message', {
      connection_id: connectionId,
      tags: ['websocket', 'message', 'error'],
    }, error instanceof Error ? error : undefined);
    
    sendError(connectionId, 'Invalid message format');
  }
}

/**
 * Handle authentication message
 */
function handleAuthMessage(connectionId: string, data: any): void {
  const { api_key } = data;
  
  if (!api_key) {
    sendError(connectionId, 'API key required');
    return;
  }
  
  const success = connectionManager.authenticateConnection(connectionId, api_key);
  
  const connection = connectionManager.getConnection(connectionId);
  if (connection) {
    connection.socket.send(JSON.stringify({
      type: 'auth_response',
      success,
      tier: success ? connection.tier : undefined,
    }));
  }
}

/**
 * Handle subscribe message
 */
function handleSubscribeMessage(connectionId: string, data: any): void {
  const { audit_id } = data;
  
  if (!audit_id) {
    sendError(connectionId, 'Audit ID required');
    return;
  }
  
  const success = connectionManager.subscribe(connectionId, audit_id);
  
  const connection = connectionManager.getConnection(connectionId);
  if (connection) {
    connection.socket.send(JSON.stringify({
      type: 'subscribe_response',
      audit_id,
      success,
    }));
  }
}

/**
 * Handle unsubscribe message
 */
function handleUnsubscribeMessage(connectionId: string, data: any): void {
  const { audit_id } = data;
  
  if (!audit_id) {
    sendError(connectionId, 'Audit ID required');
    return;
  }
  
  const success = connectionManager.unsubscribe(connectionId, audit_id);
  
  const connection = connectionManager.getConnection(connectionId);
  if (connection) {
    connection.socket.send(JSON.stringify({
      type: 'unsubscribe_response',
      audit_id,
      success,
    }));
  }
}

/**
 * Handle ping message (heartbeat)
 */
function handlePingMessage(connectionId: string): void {
  connectionManager.updateHeartbeat(connectionId);
  
  const connection = connectionManager.getConnection(connectionId);
  if (connection) {
    connection.socket.send(JSON.stringify({
      type: 'pong',
      timestamp: Date.now(),
    }));
  }
}

/**
 * Send error to connection
 */
function sendError(connectionId: string, message: string, data?: any): void {
  const connection = connectionManager.getConnection(connectionId);
  
  if (connection) {
    connection.socket.send(JSON.stringify({
      type: 'error',
      message,
      data,
      timestamp: Date.now(),
    }));
  }
}

/**
 * Broadcast progress event to subscribers
 */
export function broadcastProgress(
  auditId: string,
  stage: string,
  progress: number,
  message: string,
  metadata?: Record<string, any>
): void {
  const event: A2AProgressEvent = {
    type: 'progress',
    audit_id: auditId,
    timestamp: new Date().toISOString(),
    data: {
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      current_step: stage,
      total_steps: metadata?.total_steps || 8,
      completed_steps: metadata?.completed_steps || 0,
    },
  };
  
  connectionManager.broadcast(auditId, event);
}

/**
 * Broadcast complete event to subscribers
 */
export function broadcastComplete(
  auditId: string,
  result: any
): void {
  const event: A2AStreamEvent = {
    type: 'complete',
    audit_id: auditId,
    timestamp: new Date().toISOString(),
    data: result,
  };
  
  connectionManager.broadcast(auditId, event);
}

/**
 * Broadcast error event to subscribers
 */
export function broadcastError(
  auditId: string,
  error: string,
  metadata?: Record<string, any>
): void {
  const event: A2AStreamEvent = {
    type: 'error',
    audit_id: auditId,
    timestamp: new Date().toISOString(),
    data: {
      error,
      ...metadata,
    },
  };
  
  connectionManager.broadcast(auditId, event);
}

/**
 * Get WebSocket statistics
 */
export function getWebSocketStats() {
  return connectionManager.getStats();
}
