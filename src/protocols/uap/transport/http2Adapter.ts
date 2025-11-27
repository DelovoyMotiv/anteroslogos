/**
 * UAP HTTP/2 Adapter
 * HTTP/2 transport for UAP handshakes and requests
 * 
 * @module src/protocols/uap/transport/http2Adapter
 * @version 1.0.0
 */

import http2 from 'http2';
import type {
  Http2Server,
  Http2SecureServer,
  Http2ServerRequest,
  Http2ServerResponse,
} from 'http2';
import type { UAPMessage } from '../types';
import { getMessageRouter, type MessageContext } from './messageRouter';
import { UAP_ERROR_CODES } from '../constants';

// =====================================================
// TYPES
// =====================================================

export interface HTTP2AdapterConfig {
  /** Port to listen on */
  port?: number;
  /** Enable TLS */
  enableTLS?: boolean;
  /** TLS certificate path */
  tlsCertPath?: string;
  /** TLS key path */
  tlsKeyPath?: string;
  /** Max concurrent streams */
  maxConcurrentStreams?: number;
  /** Initial window size */
  initialWindowSize?: number;
  /** Max frame size */
  maxFrameSize?: number;
  /** Enable server push */
  enablePush?: boolean;
}

// =====================================================
// HTTP/2 ADAPTER
// =====================================================

export class HTTP2Adapter {
  private server: Http2Server | Http2SecureServer | null = null;
  private router = getMessageRouter();
  private config: Required<Omit<HTTP2AdapterConfig, 'tlsCertPath' | 'tlsKeyPath'>> & {
    tlsCertPath?: string;
    tlsKeyPath?: string;
  };
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor(config: HTTP2AdapterConfig = {}) {
    this.config = {
      port: config.port || 8443,
      enableTLS: config.enableTLS !== false,
      tlsCertPath: config.tlsCertPath,
      tlsKeyPath: config.tlsKeyPath,
      maxConcurrentStreams: config.maxConcurrentStreams || 100,
      initialWindowSize: config.initialWindowSize || 65535,
      maxFrameSize: config.maxFrameSize || 16384,
      enablePush: config.enablePush !== false,
    };
  }

  /**
   * Start HTTP/2 server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serverOptions: http2.ServerOptions = {
          settings: {
            maxConcurrentStreams: this.config.maxConcurrentStreams,
            initialWindowSize: this.config.initialWindowSize,
            maxFrameSize: this.config.maxFrameSize,
            enablePush: this.config.enablePush,
          },
        };

        // Create HTTP/2 server (plain or secure)
        if (this.config.enableTLS && this.config.tlsCertPath && this.config.tlsKeyPath) {
          // TLS mode - requires cert files
          // For production: load from file system
          // For development: use self-signed certs
          const fs = require('fs');
          const secureOptions: http2.SecureServerOptions = {
            ...serverOptions,
            key: fs.readFileSync(this.config.tlsKeyPath),
            cert: fs.readFileSync(this.config.tlsCertPath),
          };
          this.server = http2.createSecureServer(secureOptions, this.handleRequest.bind(this));
        } else {
          // Plain HTTP/2 (h2c - cleartext)
          this.server = http2.createServer(serverOptions, this.handleRequest.bind(this));
        }

        this.server.on('error', (error) => {
          console.error('[HTTP2Adapter] Server error:', error);
          this.errorCount++;
        });

        this.server.on('sessionError', (error) => {
          console.error('[HTTP2Adapter] Session error:', error);
        });

        this.server.listen(this.config.port, () => {
          const protocol = this.config.enableTLS ? 'https' : 'http';
          console.log(`[HTTP2Adapter] Started on ${protocol}://localhost:${this.config.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop HTTP/2 server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[HTTP2Adapter] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle HTTP/2 request
   */
  private async handleRequest(
    req: Http2ServerRequest,
    res: Http2ServerResponse
  ): Promise<void> {
    this.requestCount++;
    const startTime = Date.now();

    try {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle OPTIONS (preflight)
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Route based on path
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      switch (url.pathname) {
        case '/uap/handshake':
          await this.handleHandshake(req, res, url);
          break;
        case '/uap/request':
          await this.handleUAPRequest(req, res, url);
          break;
        case '/uap/health':
          await this.handleHealth(req, res);
          break;
        case '/uap/stats':
          await this.handleStats(req, res);
          break;
        default:
          this.sendError(res, 1404, 'Endpoint not found', 404);
      }

      const duration = Date.now() - startTime;
      console.log(`[HTTP2Adapter] ${req.method} ${url.pathname} - ${res.statusCode} (${duration}ms)`);
    } catch (error) {
      this.errorCount++;
      console.error('[HTTP2Adapter] Request handling error:', error);
      this.sendError(
        res,
        UAP_ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  }

  /**
   * Handle UAP handshake endpoint
   */
  private async handleHandshake(
    req: Http2ServerRequest,
    res: Http2ServerResponse,
    url: URL
  ): Promise<void> {
    if (req.method !== 'POST') {
      this.sendError(res, 1405, 'POST required', 405);
      return;
    }

    // Parse body
    const body = await this.readBody(req);
    let message: UAPMessage;

    try {
      message = JSON.parse(body);
    } catch {
      this.sendError(res, UAP_ERROR_CODES.INVALID_MESSAGE, 'Invalid JSON', 400);
      return;
    }

    // Extract context
    const tenantId = url.searchParams.get('tenant');
    const remoteAddr = this.getRemoteAddr(req);

    const context: Partial<MessageContext> = {
      remoteAddr,
      tenantId,
    };

    // Route through UAP router
    const response = await this.router.routeMessage(message, context);

    // Send response
    this.sendJSON(res, response, 200);
  }

  /**
   * Handle UAP request endpoint
   */
  private async handleUAPRequest(
    req: Http2ServerRequest,
    res: Http2ServerResponse,
    url: URL
  ): Promise<void> {
    if (req.method !== 'POST') {
      this.sendError(res, 1405, 'POST required', 405);
      return;
    }

    // Parse body
    const body = await this.readBody(req);
    let message: UAPMessage;

    try {
      message = JSON.parse(body);
    } catch {
      this.sendError(res, UAP_ERROR_CODES.INVALID_MESSAGE, 'Invalid JSON', 400);
      return;
    }

    // Extract context
    const sessionId = url.searchParams.get('session');
    const tenantId = url.searchParams.get('tenant');
    const remoteAddr = this.getRemoteAddr(req);

    const context: Partial<MessageContext> = {
      sessionId: sessionId || undefined,
      remoteAddr,
      tenantId,
    };

    // Route through UAP router
    const response = await this.router.routeMessage(message, context);

    // Send response
    this.sendJSON(res, response, 200);
  }

  /**
   * Handle health check endpoint
   */
  private async handleHealth(
    _req: Http2ServerRequest,
    res: Http2ServerResponse
  ): Promise<void> {
    this.sendJSON(
      res,
      {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      200
    );
  }

  /**
   * Handle stats endpoint
   */
  private async handleStats(
    _req: Http2ServerRequest,
    res: Http2ServerResponse
  ): Promise<void> {
    const routerStats = this.router.getStats();

    this.sendJSON(
      res,
      {
        http2: {
          requestCount: this.requestCount,
          errorCount: this.errorCount,
        },
        router: routerStats,
        uptime: process.uptime(),
      },
      200
    );
  }

  /**
   * Read request body
   */
  private async readBody(req: Http2ServerRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = 10 * 1024 * 1024; // 10MB limit

      req.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });

      req.on('error', reject);
    });
  }

  /**
   * Get remote address from request
   */
  private getRemoteAddr(req: Http2ServerRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Send JSON response
   */
  private sendJSON(res: Http2ServerResponse, data: unknown, statusCode: number = 200): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(data));
  }

  /**
   * Send error response
   */
  private sendError(
    res: Http2ServerResponse,
    errorCode: number,
    message: string,
    statusCode: number = 400
  ): void {
    this.sendJSON(
      res,
      {
        errorCode,
        message,
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: process.uptime(),
      config: {
        port: this.config.port,
        enableTLS: this.config.enableTLS,
        maxConcurrentStreams: this.config.maxConcurrentStreams,
        initialWindowSize: this.config.initialWindowSize,
        maxFrameSize: this.config.maxFrameSize,
        enablePush: this.config.enablePush,
      },
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let http2AdapterInstance: HTTP2Adapter | null = null;

export function getHTTP2Adapter(): HTTP2Adapter {
  if (!http2AdapterInstance) {
    http2AdapterInstance = new HTTP2Adapter();
  }
  return http2AdapterInstance;
}

export function initHTTP2Adapter(config?: HTTP2AdapterConfig): HTTP2Adapter {
  if (http2AdapterInstance) {
    http2AdapterInstance.stop();
  }
  http2AdapterInstance = new HTTP2Adapter(config);
  return http2AdapterInstance;
}

export default HTTP2Adapter;
