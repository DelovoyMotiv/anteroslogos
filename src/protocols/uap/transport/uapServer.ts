/**
 * UAP Server
 * Unified server orchestrating HTTP/2 and WebSocket transports
 * 
 * @module src/protocols/uap/transport/uapServer
 * @version 1.0.0
 */

import type { HTTP2Adapter, HTTP2AdapterConfig } from './http2Adapter';
import type { WSAdapter, WSAdapterConfig } from './wsAdapter';
import { initHTTP2Adapter } from './http2Adapter';
import { initWSAdapter } from './wsAdapter';
import { getMessageRouter } from './messageRouter';
import { getRateLimiter } from './rateLimiter';
import { getCircuitBreaker } from './circuitBreaker';
import { getTrustMiddleware } from '../../../core/trust/middleware';

// =====================================================
// TYPES
// =====================================================

export interface UAPServerConfig {
  /** HTTP/2 configuration */
  http2?: HTTP2AdapterConfig;
  /** WebSocket configuration */
  ws?: WSAdapterConfig;
  /** Enable HTTP/2 transport */
  enableHTTP2?: boolean;
  /** Enable WebSocket transport */
  enableWS?: boolean;
  /** Server identification */
  serverDID?: string;
  /** Tenant ID (if multi-tenant) */
  tenantId?: string | null;
}

export interface ServerStats {
  /** Server uptime (seconds) */
  uptime: number;
  /** HTTP/2 statistics */
  http2?: ReturnType<HTTP2Adapter['getStats']>;
  /** WebSocket statistics */
  ws?: ReturnType<WSAdapter['getStats']>;
  /** Message router statistics */
  router: ReturnType<ReturnType<typeof getMessageRouter>['getStats']>;
  /** Rate limiter statistics */
  rateLimiter: ReturnType<ReturnType<typeof getRateLimiter>['getGlobalStats']>;
  /** Circuit breaker statistics */
  circuitBreaker: ReturnType<ReturnType<typeof getCircuitBreaker>['getGlobalStats']>;
}

// =====================================================
// UAP SERVER
// =====================================================

export class UAPServer {
  private http2Adapter: HTTP2Adapter | null = null;
  private wsAdapter: WSAdapter | null = null;
  private router = getMessageRouter();
  private rateLimiter = getRateLimiter();
  private circuitBreaker = getCircuitBreaker();
  private trustMiddleware = getTrustMiddleware();
  private config: Required<Omit<UAPServerConfig, 'http2' | 'ws'>> & {
    http2?: HTTP2AdapterConfig;
    ws?: WSAdapterConfig;
  };
  private startTime: number = 0;
  private running: boolean = false;

  constructor(config: UAPServerConfig = {}) {
    this.config = {
      http2: config.http2,
      ws: config.ws,
      enableHTTP2: config.enableHTTP2 !== false,
      enableWS: config.enableWS !== false,
      serverDID: config.serverDID || 'did:aid:anoteroslogos',
      tenantId: config.tenantId || null,
    };

    console.log('[UAPServer] Initialized with config:', {
      enableHTTP2: this.config.enableHTTP2,
      enableWS: this.config.enableWS,
      serverDID: this.config.serverDID,
      tenantId: this.config.tenantId,
    });
  }

  /**
   * Start UAP server
   * Starts configured transports
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn('[UAPServer] Server already running');
      return;
    }

    this.startTime = Date.now();

    try {
      // Start HTTP/2 adapter
      if (this.config.enableHTTP2) {
        this.http2Adapter = initHTTP2Adapter({
          port: 8443,
          enableTLS: false, // Development mode
          ...this.config.http2,
        });
        await this.http2Adapter.start();
        console.log('[UAPServer] HTTP/2 adapter started');
      }

      // Start WebSocket adapter
      if (this.config.enableWS) {
        this.wsAdapter = initWSAdapter({
          port: 8080,
          path: '/uap/ws',
          ...this.config.ws,
        });
        await this.wsAdapter.start();
        console.log('[UAPServer] WebSocket adapter started');
      }

      this.running = true;
      console.log('[UAPServer] Server started successfully');

      // Log active endpoints
      this.logEndpoints();
    } catch (error) {
      console.error('[UAPServer] Failed to start:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop UAP server
   * Gracefully shuts down all transports
   */
  async stop(): Promise<void> {
    if (!this.running) {
      console.warn('[UAPServer] Server not running');
      return;
    }

    console.log('[UAPServer] Stopping server...');

    // Stop adapters
    const stopPromises: Promise<void>[] = [];

    if (this.http2Adapter) {
      stopPromises.push(this.http2Adapter.stop());
    }

    if (this.wsAdapter) {
      stopPromises.push(this.wsAdapter.stop());
    }

    await Promise.all(stopPromises);

    // Cleanup rate limiter
    this.rateLimiter.stopCleanup();

    this.running = false;
    console.log('[UAPServer] Server stopped');
  }

  /**
   * Restart UAP server
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    const uptime = (Date.now() - this.startTime) / 1000;

    const stats: ServerStats = {
      uptime,
      http2: this.http2Adapter?.getStats(),
      ws: this.wsAdapter?.getStats(),
      router: this.router.getStats(),
      rateLimiter: this.rateLimiter.getGlobalStats(),
      circuitBreaker: this.circuitBreaker.getGlobalStats(),
    };
    return stats;
  }

  /**
   * Log active endpoints
   */
  private logEndpoints(): void {
    console.log('\n========================================');
    console.log('UAP Server Endpoints');
    console.log('========================================');

    if (this.http2Adapter) {
      const protocol = this.config.http2?.enableTLS ? 'https' : 'http';
      const port = this.config.http2?.port || 8443;
      console.log(`[HTTP/2] ${protocol}://localhost:${port}`);
      console.log(`  POST ${protocol}://localhost:${port}/uap/handshake`);
      console.log(`  POST ${protocol}://localhost:${port}/uap/request`);
      console.log(`  GET  ${protocol}://localhost:${port}/uap/health`);
      console.log(`  GET  ${protocol}://localhost:${port}/uap/stats`);
    }

    if (this.wsAdapter) {
      const port = this.config.ws?.port || 8080;
      const path = this.config.ws?.path || '/uap/ws';
      console.log(`[WebSocket] ws://localhost:${port}${path}`);
    }

    console.log('========================================\n');
  }

  /**
   * Get HTTP/2 adapter
   */
  getHTTP2Adapter(): HTTP2Adapter | null {
    return this.http2Adapter;
  }

  /**
   * Get WebSocket adapter
   */
  getWSAdapter(): WSAdapter | null {
    return this.wsAdapter;
  }

  /**
   * Get message router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Get rate limiter
   */
  getRateLimiter() {
    return this.rateLimiter;
  }

  /**
   * Get circuit breaker
   */
  getCircuitBreaker() {
    return this.circuitBreaker;
  }

  /**
   * Get trust middleware
   */
  getTrustMiddleware() {
    return this.trustMiddleware;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      http2: boolean;
      ws: boolean;
      router: boolean;
      uptime: number;
    };
  }> {
    const stats = this.getStats();

    const http2Healthy = this.config.enableHTTP2 ? this.http2Adapter !== null : true;
    const wsHealthy = this.config.enableWS ? this.wsAdapter !== null : true;
    const routerHealthy = this.router !== null;

    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (http2Healthy && wsHealthy && routerHealthy) {
      status = 'healthy';
    } else if (routerHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        http2: http2Healthy,
        ws: wsHealthy,
        router: routerHealthy,
        uptime: stats.uptime,
      },
    };
  }

  /**
   * Graceful shutdown handler
   */
  setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`\n[UAPServer] Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let serverInstance: UAPServer | null = null;

export function getUAPServer(): UAPServer {
  if (!serverInstance) {
    serverInstance = new UAPServer();
  }
  return serverInstance;
}

export function initUAPServer(config?: UAPServerConfig): UAPServer {
  if (serverInstance && serverInstance.isRunning()) {
    serverInstance.stop();
  }
  serverInstance = new UAPServer(config);
  return serverInstance;
}

export default UAPServer;
