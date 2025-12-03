/**
 * Graceful Shutdown Manager
 * 
 * Features:
 * - SIGTERM/SIGINT signal handling
 * - Drain active connections before shutdown
 * - Configurable shutdown timeout (default: 30 seconds)
 * - Close database connections gracefully
 * - Cleanup hooks for custom resources
 * 
 * **Feature: production-audit-improvements**
 * **Validates: Requirements 5.4**
 * 
 * @module lib/reliability/shutdown
 */

/**
 * Cleanup function type
 */
export type CleanupFunction = () => Promise<void> | void;

/**
 * Shutdown configuration
 */
export interface ShutdownConfig {
  /** Timeout in milliseconds before forcing shutdown (default: 30000) */
  timeout: number;
  
  /** Signals to listen for (default: ['SIGTERM', 'SIGINT']) */
  signals: NodeJS.Signals[];
  
  /** Callback when shutdown starts */
  onShutdownStart?: () => void;
  
  /** Callback when shutdown completes */
  onShutdownComplete?: () => void;
  
  /** Callback when shutdown times out */
  onShutdownTimeout?: () => void;
}

/**
 * Default shutdown configuration
 */
export const DEFAULT_SHUTDOWN_CONFIG: ShutdownConfig = {
  timeout: 30000, // 30 seconds
  signals: ['SIGTERM', 'SIGINT'],
};

/**
 * Graceful Shutdown Manager
 * 
 * Manages graceful shutdown of the application by:
 * 1. Stopping acceptance of new requests
 * 2. Draining active connections
 * 3. Running cleanup hooks
 * 4. Closing database connections
 * 5. Exiting the process
 * 
 * @example
 * ```typescript
 * const shutdownManager = new ShutdownManager({
 *   timeout: 30000,
 * });
 * 
 * // Register cleanup hooks
 * shutdownManager.registerCleanup('database', async () => {
 *   await db.close();
 * });
 * 
 * shutdownManager.registerCleanup('cache', async () => {
 *   await redis.quit();
 * });
 * 
 * // Start listening for shutdown signals
 * shutdownManager.listen();
 * ```
 */
export class ShutdownManager {
  private cleanupHooks: Map<string, CleanupFunction> = new Map();
  private isShuttingDown: boolean = false;
  private shutdownPromise?: Promise<void>;
  private readonly config: ShutdownConfig;
  
  constructor(config: Partial<ShutdownConfig> = {}) {
    this.config = { ...DEFAULT_SHUTDOWN_CONFIG, ...config };
  }
  
  /**
   * Register a cleanup hook
   * 
   * @param name - Unique name for the cleanup hook
   * @param cleanup - Cleanup function to execute during shutdown
   */
  registerCleanup(name: string, cleanup: CleanupFunction): void {
    if (this.cleanupHooks.has(name)) {
      console.warn(`[ShutdownManager] Cleanup hook "${name}" already registered, overwriting`);
    }
    this.cleanupHooks.set(name, cleanup);
  }
  
  /**
   * Unregister a cleanup hook
   * 
   * @param name - Name of the cleanup hook to remove
   * @returns true if hook was removed, false if not found
   */
  unregisterCleanup(name: string): boolean {
    return this.cleanupHooks.delete(name);
  }
  
  /**
   * Check if shutdown is in progress
   */
  isShutdown(): boolean {
    return this.isShuttingDown;
  }
  
  /**
   * Start listening for shutdown signals
   */
  listen(): void {
    for (const signal of this.config.signals) {
      process.on(signal, () => {
        console.log(`[ShutdownManager] Received ${signal}, starting graceful shutdown`);
        this.shutdown().catch(error => {
          console.error('[ShutdownManager] Error during shutdown:', error);
          process.exit(1);
        });
      });
    }
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[ShutdownManager] Uncaught exception:', error);
      this.shutdown().catch(() => {
        process.exit(1);
      });
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[ShutdownManager] Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown().catch(() => {
        process.exit(1);
      });
    });
  }
  
  /**
   * Perform graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Prevent multiple simultaneous shutdowns
    if (this.isShuttingDown) {
      return this.shutdownPromise;
    }
    
    this.isShuttingDown = true;
    
    // Invoke shutdown start callback
    if (this.config.onShutdownStart) {
      this.config.onShutdownStart();
    }
    
    // Create shutdown promise with timeout
    this.shutdownPromise = this.performShutdown();
    
    // Set timeout
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Shutdown timeout exceeded'));
      }, this.config.timeout);
    });
    
    try {
      await Promise.race([this.shutdownPromise, timeoutPromise]);
      
      // Invoke shutdown complete callback
      if (this.config.onShutdownComplete) {
        this.config.onShutdownComplete();
      }
      
      console.log('[ShutdownManager] Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      // Invoke shutdown timeout callback
      if (this.config.onShutdownTimeout) {
        this.config.onShutdownTimeout();
      }
      
      console.error('[ShutdownManager] Shutdown timeout or error:', error);
      console.log('[ShutdownManager] Forcing shutdown');
      process.exit(1);
    }
  }
  
  /**
   * Perform the actual shutdown sequence
   */
  private async performShutdown(): Promise<void> {
    console.log('[ShutdownManager] Running cleanup hooks...');
    
    // Run all cleanup hooks in parallel
    const cleanupPromises = Array.from(this.cleanupHooks.entries()).map(
      async ([name, cleanup]) => {
        try {
          console.log(`[ShutdownManager] Running cleanup: ${name}`);
          await cleanup();
          console.log(`[ShutdownManager] Cleanup completed: ${name}`);
        } catch (error) {
          console.error(`[ShutdownManager] Cleanup failed: ${name}`, error);
          // Continue with other cleanups even if one fails
        }
      }
    );
    
    await Promise.all(cleanupPromises);
    
    console.log('[ShutdownManager] All cleanup hooks completed');
  }
  
  /**
   * Force immediate shutdown (not graceful)
   */
  forceShutdown(exitCode: number = 1): void {
    console.log('[ShutdownManager] Forcing immediate shutdown');
    process.exit(exitCode);
  }
}

/**
 * Global shutdown manager instance
 */
export const globalShutdownManager = new ShutdownManager();

/**
 * Helper function to create a database cleanup hook
 */
export function createDatabaseCleanup(
  db: { end?: () => Promise<void>; destroy?: () => Promise<void> }
): CleanupFunction {
  return async () => {
    console.log('[ShutdownManager] Closing database connections');
    if (db.end) {
      await db.end();
    } else if (db.destroy) {
      await db.destroy();
    }
    console.log('[ShutdownManager] Database connections closed');
  };
}

/**
 * Helper function to create a Redis cleanup hook
 */
export function createRedisCleanup(
  redis: { quit: () => Promise<string> }
): CleanupFunction {
  return async () => {
    console.log('[ShutdownManager] Closing Redis connection');
    await redis.quit();
    console.log('[ShutdownManager] Redis connection closed');
  };
}

/**
 * Helper function to create an HTTP server cleanup hook
 */
export function createServerCleanup(
  server: {
    close: (callback?: (err?: Error) => void) => void;
  }
): CleanupFunction {
  return () => {
    return new Promise<void>((resolve, reject) => {
      console.log('[ShutdownManager] Closing HTTP server');
      server.close((err) => {
        if (err) {
          console.error('[ShutdownManager] Error closing HTTP server:', err);
          reject(err);
        } else {
          console.log('[ShutdownManager] HTTP server closed');
          resolve();
        }
      });
    });
  };
}
