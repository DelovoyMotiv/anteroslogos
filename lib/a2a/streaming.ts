/**
 * A2A SSE Streaming Layer - Linux Foundation A2A Protocol v1.0
 * 
 * Implements Server-Sent Events (SSE) for real-time task progress streaming
 * Compatible with EventSource API on client side
 * 
 * Spec: https://a2a-protocol.org/specs/streaming
 */

import { TaskProgress } from './taskManager';

// =====================================================
// SSE EVENT TYPES
// =====================================================

export enum SSEEventType {
  TASK_CREATED = 'task.created',
  TASK_STARTED = 'task.started',
  TASK_PROGRESS = 'task.progress',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  TASK_CANCELLED = 'task.cancelled',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
}

// =====================================================
// SSE EVENT STRUCTURE
// =====================================================

import type { JSONValue } from '../../types/common.types';

export interface SSEEvent {
  event: SSEEventType;
  data: JSONValue;
  id?: string;
  retry?: number;
}

export interface TaskCreatedEvent {
  task_id: string;
  capability: string;
  created_at: string;
}

export interface TaskStartedEvent {
  task_id: string;
  started_at: string;
}

export interface TaskProgressEvent {
  task_id: string;
  progress: TaskProgress;
}

export interface TaskCompletedEvent {
  task_id: string;
  result: JSONValue;
  artifacts?: JSONValue[];
  cost?: JSONValue;
  completed_at: string;
}

export interface TaskFailedEvent {
  task_id: string;
  error: {
    code: string;
    message: string;
    details?: JSONValue;
  };
  failed_at: string;
}

export interface TaskCancelledEvent {
  task_id: string;
  reason?: string;
  cancelled_at: string;
}

// =====================================================
// SSE STREAM MANAGER
// =====================================================

export class SSEStreamManager {
  private static instance: SSEStreamManager;
  private streams: Map<string, SSEStream> = new Map();
  
  private constructor() {}
  
  static getInstance(): SSEStreamManager {
    if (!SSEStreamManager.instance) {
      SSEStreamManager.instance = new SSEStreamManager();
    }
    return SSEStreamManager.instance;
  }
  
  /**
   * Create new SSE stream
   */
  createStream(streamId: string): SSEStream {
    const stream = new SSEStream(streamId);
    this.streams.set(streamId, stream);
    return stream;
  }
  
  /**
   * Get existing stream
   */
  getStream(streamId: string): SSEStream | null {
    return this.streams.get(streamId) || null;
  }
  
  /**
   * Delete stream
   */
  deleteStream(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    
    if (stream) {
      stream.close();
      this.streams.delete(streamId);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get active streams count
   */
  getActiveStreamsCount(): number {
    return this.streams.size;
  }
  
  /**
   * Cleanup inactive streams
   */
  cleanupInactiveStreams(inactiveThresholdMs: number = 5 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [streamId, stream] of this.streams.entries()) {
      if (stream.isClosed() || (now - stream.getLastActivityTime() > inactiveThresholdMs)) {
        stream.close();
        this.streams.delete(streamId);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// =====================================================
// SSE STREAM
// =====================================================

export class SSEStream {
  private id: string;
  private listeners: Set<(event: SSEEvent) => void> = new Set();
  private closed: boolean = false;
  private lastActivityTime: number = Date.now();
  private eventCounter: number = 0;
  
  constructor(id: string) {
    this.id = id;
  }
  
  /**
   * Get stream ID
   */
  getId(): string {
    return this.id;
  }
  
  /**
   * Subscribe to stream events
   */
  subscribe(listener: (event: SSEEvent) => void): () => void {
    this.listeners.add(listener);
    this.lastActivityTime = Date.now();
    
    // Send initial heartbeat
    this.sendHeartbeat();
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Send event to all listeners
   */
  send(event: SSEEvent): void {
    if (this.closed) {
      return;
    }
    
    // Add event ID if not provided
    if (!event.id) {
      event.id = `${this.id}-${this.eventCounter++}`;
    }
    
    this.lastActivityTime = Date.now();
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('SSE listener error:', error);
      }
    });
  }
  
  /**
   * Send heartbeat
   */
  sendHeartbeat(): void {
    this.send({
      event: SSEEventType.HEARTBEAT,
      data: {
        timestamp: new Date().toISOString(),
        stream_id: this.id,
      },
    });
  }
  
  /**
   * Send task created event
   */
  sendTaskCreated(event: TaskCreatedEvent): void {
    this.send({
      event: SSEEventType.TASK_CREATED,
      data: event as unknown as JSONValue,
    });
  }
  
  /**
   * Send task started event
   */
  sendTaskStarted(event: TaskStartedEvent): void {
    this.send({
      event: SSEEventType.TASK_STARTED,
      data: event as unknown as JSONValue,
    });
  }
  
  /**
   * Send task progress event
   */
  sendTaskProgress(event: TaskProgressEvent): void {
    this.send({
      event: SSEEventType.TASK_PROGRESS,
      data: event as unknown as JSONValue,
    });
  }
  
  /**
   * Send task completed event
   */
  sendTaskCompleted(event: TaskCompletedEvent): void {
    this.send({
      event: SSEEventType.TASK_COMPLETED,
      data: event as unknown as JSONValue,
    });
  }
  
  /**
   * Send task failed event
   */
  sendTaskFailed(event: TaskFailedEvent): void {
    this.send({
      event: SSEEventType.TASK_FAILED,
      data: event as unknown as JSONValue,
    });
  }
  
  /**
   * Send task cancelled event
   */
  sendTaskCancelled(event: TaskCancelledEvent): void {
    this.send({
      event: SSEEventType.TASK_CANCELLED,
      data: event as unknown as JSONValue,
    });
  }
  
  /**
   * Send error event
   */
  sendError(code: string, message: string, details?: JSONValue): void {
    this.send({
      event: SSEEventType.ERROR,
      data: {
        code,
        message,
        details: details || null,
      } as unknown as JSONValue,
    });
  }
  
  /**
   * Check if stream is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
  
  /**
   * Get last activity time
   */
  getLastActivityTime(): number {
    return this.lastActivityTime;
  }
  
  /**
   * Get number of listeners
   */
  getListenersCount(): number {
    return this.listeners.size;
  }
  
  /**
   * Close stream
   */
  close(): void {
    if (this.closed) {
      return;
    }
    
    this.closed = true;
    this.listeners.clear();
  }
}

// =====================================================
// SSE FORMATTER
// =====================================================

/**
 * Format SSE event for HTTP response
 * 
 * According to SSE spec:
 * event: <event-type>
 * data: <event-data>
 * id: <event-id>
 * retry: <retry-ms>
 * 
 */
export function formatSSEEvent(event: SSEEvent): string {
  let formatted = '';
  
  if (event.event) {
    formatted += `event: ${event.event}\n`;
  }
  
  if (event.data !== undefined) {
    const dataStr = typeof event.data === 'string' 
      ? event.data 
      : JSON.stringify(event.data);
    
    // Multi-line data support
    const lines = dataStr.split('\n');
    lines.forEach(line => {
      formatted += `data: ${line}\n`;
    });
  }
  
  if (event.id) {
    formatted += `id: ${event.id}\n`;
  }
  
  if (event.retry) {
    formatted += `retry: ${event.retry}\n`;
  }
  
  // SSE spec requires double newline at the end
  formatted += '\n';
  
  return formatted;
}

/**
 * Create SSE headers for HTTP response
 */
export function getSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  };
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const sseStreamManager = SSEStreamManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Create heartbeat interval for stream
 */
export function createHeartbeatInterval(
  stream: SSEStream,
  intervalMs: number = 30000
): NodeJS.Timeout {
  return setInterval(() => {
    if (!stream.isClosed()) {
      stream.sendHeartbeat();
    }
  }, intervalMs);
}

/**
 * Parse SSE event from raw string
 */
export function parseSSEEvent(raw: string): SSEEvent | null {
  const lines = raw.trim().split('\n');
  const event: Partial<SSEEvent> = {};
  
  let dataLines: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event.event = line.substring(6).trim() as SSEEventType;
    } else if (line.startsWith('data:')) {
      dataLines.push(line.substring(5).trim());
    } else if (line.startsWith('id:')) {
      event.id = line.substring(3).trim();
    } else if (line.startsWith('retry:')) {
      event.retry = parseInt(line.substring(6).trim(), 10);
    }
  }
  
  if (dataLines.length > 0) {
    const dataStr = dataLines.join('\n');
    
    try {
      event.data = JSON.parse(dataStr);
    } catch {
      event.data = dataStr;
    }
  }
  
  if (!event.event || event.data === undefined) {
    return null;
  }
  
  return event as SSEEvent;
}
