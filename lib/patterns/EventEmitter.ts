/**
 * Observer Pattern Implementation
 * 
 * Provides type-safe event emitter for decoupled event handling
 * across the application. Supports both synchronous and asynchronous
 * event handlers.
 * 
 * @module lib/patterns/EventEmitter
 */

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Event subscription
 */
export interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Event emitter options
 */
export interface EventEmitterOptions {
  maxListeners?: number;
  captureRejections?: boolean;
}

/**
 * Type-safe Event Emitter
 * 
 * Implements Observer pattern for decoupled event handling.
 * 
 * @example
 * ```typescript
 * interface Events {
 *   'user:created': { id: string; email: string };
 *   'user:deleted': { id: string };
 * }
 * 
 * const emitter = new TypedEventEmitter<Events>();
 * 
 * // Subscribe to events
 * const subscription = emitter.on('user:created', (user) => {
 *   console.log('User created:', user.email);
 * });
 * 
 * // Emit events
 * await emitter.emit('user:created', { id: '123', email: 'test@example.com' });
 * 
 * // Unsubscribe
 * subscription.unsubscribe();
 * ```
 */
export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private listeners: Map<keyof TEvents, Set<EventHandler<unknown>>> = new Map();
  private onceListeners: Map<keyof TEvents, Set<EventHandler<unknown>>> = new Map();
  private maxListeners: number;
  private captureRejections: boolean;

  constructor(options: EventEmitterOptions = {}) {
    this.maxListeners = options.maxListeners ?? 10;
    this.captureRejections = options.captureRejections ?? true;
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;
    
    if (handlers.size >= this.maxListeners) {
      console.warn(
        `Max listeners (${this.maxListeners}) exceeded for event "${String(event)}". ` +
        'This may indicate a memory leak.'
      );
    }

    handlers.add(handler as EventHandler<unknown>);

    return {
      unsubscribe: () => {
        handlers.delete(handler as EventHandler<unknown>);
      },
    };
  }

  /**
   * Subscribe to an event (fires only once)
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): EventSubscription {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }

    const handlers = this.onceListeners.get(event)!;
    handlers.add(handler as EventHandler<unknown>);

    return {
      unsubscribe: () => {
        handlers.delete(handler as EventHandler<unknown>);
      },
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<unknown>);
    }

    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      onceHandlers.delete(handler as EventHandler<unknown>);
    }
  }

  /**
   * Emit an event
   */
  async emit<K extends keyof TEvents>(
    event: K,
    data: TEvents[K]
  ): Promise<void> {
    const handlers = this.listeners.get(event);
    const onceHandlers = this.onceListeners.get(event);

    const allHandlers = [
      ...(handlers ? Array.from(handlers) : []),
      ...(onceHandlers ? Array.from(onceHandlers) : []),
    ];

    // Clear once listeners
    if (onceHandlers) {
      onceHandlers.clear();
    }

    // Execute all handlers
    const promises = allHandlers.map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        if (this.captureRejections) {
          console.error(`Error in event handler for "${String(event)}":`, error);
          // Emit error event if available
          if ('error' in this.listeners) {
            await this.emit('error' as K, error as TEvents[K]);
          }
        } else {
          throw error;
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Emit an event synchronously (does not wait for async handlers)
   */
  emitSync<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const handlers = this.listeners.get(event);
    const onceHandlers = this.onceListeners.get(event);

    const allHandlers = [
      ...(handlers ? Array.from(handlers) : []),
      ...(onceHandlers ? Array.from(onceHandlers) : []),
    ];

    // Clear once listeners
    if (onceHandlers) {
      onceHandlers.clear();
    }

    // Execute all handlers synchronously
    for (const handler of allHandlers) {
      try {
        const result = handler(data);
        // If handler returns a promise, we don't wait for it
        if (result instanceof Promise && this.captureRejections) {
          result.catch((error) => {
            console.error(`Error in async event handler for "${String(event)}":`, error);
          });
        }
      } catch (error) {
        if (this.captureRejections) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const handlers = this.listeners.get(event);
    const onceHandlers = this.onceListeners.get(event);
    return (handlers?.size ?? 0) + (onceHandlers?.size ?? 0);
  }

  /**
   * Get all event names
   */
  eventNames(): Array<keyof TEvents> {
    const names = new Set<keyof TEvents>();
    for (const name of this.listeners.keys()) {
      names.add(name);
    }
    for (const name of this.onceListeners.keys()) {
      names.add(name);
    }
    return Array.from(names);
  }

  /**
   * Set max listeners
   */
  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  /**
   * Get max listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}

/**
 * Circuit Breaker Events
 */
export interface CircuitBreakerEvents {
  'state:open': { nodeId: string; failures: number };
  'state:closed': { nodeId: string };
  'state:half-open': { nodeId: string };
  'failure': { nodeId: string; error: Error };
  'success': { nodeId: string; duration: number };
}

/**
 * Connection Pool Events
 */
export interface ConnectionPoolEvents {
  'connection:acquired': { connectionId: string };
  'connection:released': { connectionId: string };
  'connection:created': { connectionId: string };
  'connection:error': { connectionId: string; error: Error };
  'pool:exhausted': { waitingRequests: number };
  'pool:healthy': { stats: unknown };
}

/**
 * Mesh Network Events
 */
export interface MeshNetworkEvents {
  'peer:discovered': { nodeId: string; capabilities: string[] };
  'peer:lost': { nodeId: string };
  'peer:updated': { nodeId: string; trustScore: number };
  'routing:success': { nodeId: string; duration: number };
  'routing:failure': { nodeId: string; error: Error };
  'sync:started': { type: string };
  'sync:completed': { type: string; sent: number; failed: number };
}

/**
 * Database Events
 */
export interface DatabaseEvents {
  'query:started': { query: string; table?: string };
  'query:completed': { query: string; duration: number };
  'query:error': { query: string; error: Error };
  'transaction:started': { id: string };
  'transaction:committed': { id: string };
  'transaction:rolled-back': { id: string; error?: Error };
}

/**
 * Create typed event emitter for specific event types
 */
export function createEventEmitter<T extends Record<string, any>>(
  options?: EventEmitterOptions
): TypedEventEmitter<T> {
  return new TypedEventEmitter<T>(options);
}

/**
 * Global event emitters for common subsystems
 */
export const circuitBreakerEvents = createEventEmitter<CircuitBreakerEvents>();
export const connectionPoolEvents = createEventEmitter<ConnectionPoolEvents>();
export const meshNetworkEvents = createEventEmitter<MeshNetworkEvents>();
export const databaseEvents = createEventEmitter<DatabaseEvents>();
