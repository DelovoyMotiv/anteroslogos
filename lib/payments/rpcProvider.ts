/**
 * @file lib/payments/rpcProvider.ts
 * @description RPC provider manager with automatic failover
 * @purpose Resilience against single RPC endpoint failures
 * @fallback Base mainnet.base.org → Alchemy → Infura → QuickNode
 * 
 * **Feature: production-audit-improvements, Property 27: External API Resilience**
 * **Validates: Requirements 6.4**
 */

import { createPublicClient, http, type PublicClient } from "viem";
import { base } from "viem/chains";
import { withRetry, NETWORK_RETRY_CONFIG } from "../reliability/retry";
import { globalCircuitBreakerRegistry } from "../reliability/circuitBreaker";
import { ExternalServiceError } from "../reliability/errors";

// =====================================================
// Configuration
// =====================================================

/**
 * RPC endpoint configuration
 * Priority order: first endpoint has highest priority
 */
interface RpcEndpoint {
  name: string;
  url: string;
  priority: number;
  isHealthy: boolean;
  failureCount: number;
  lastFailureAt: Date | null;
}

// Environment variables for RPC endpoints
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const ALCHEMY_BASE_URL = process.env.ALCHEMY_BASE_URL; // e.g., https://base-mainnet.g.alchemy.com/v2/{API_KEY}
const INFURA_BASE_URL = process.env.INFURA_BASE_URL; // e.g., https://base-mainnet.infura.io/v3/{API_KEY}
const QUICKNODE_BASE_URL = process.env.QUICKNODE_BASE_URL; // e.g., https://xxx.base-mainnet.quiknode.pro/{API_KEY}/

// Maximum failures before marking endpoint as unhealthy
const MAX_FAILURES = 3;

// Health check interval (5 minutes)
const HEALTH_CHECK_INTERVAL = 300000;

// Timeout for health checks (5 seconds)
const HEALTH_CHECK_TIMEOUT = 5000;

// =====================================================
// RPC Provider Manager
// =====================================================

class RpcProviderManager {
  private endpoints: RpcEndpoint[] = [];
  private clients: Map<string, PublicClient> = new Map();
  private currentEndpointIndex: number = 0;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeEndpoints();
    this.createClients();
    this.startHealthChecks();
  }

  /**
   * Initializes RPC endpoints from environment variables
   * Priority order: Base mainnet → Alchemy → Infura → QuickNode
   */
  private initializeEndpoints(): void {
    const endpoints: RpcEndpoint[] = [];

    // Primary: Base mainnet (always available)
    endpoints.push({
      name: "Base Mainnet",
      url: BASE_RPC_URL,
      priority: 1,
      isHealthy: true,
      failureCount: 0,
      lastFailureAt: null,
    });

    // Secondary: Alchemy (if configured)
    if (ALCHEMY_BASE_URL) {
      endpoints.push({
        name: "Alchemy",
        url: ALCHEMY_BASE_URL,
        priority: 2,
        isHealthy: true,
        failureCount: 0,
        lastFailureAt: null,
      });
    }

    // Tertiary: Infura (if configured)
    if (INFURA_BASE_URL) {
      endpoints.push({
        name: "Infura",
        url: INFURA_BASE_URL,
        priority: 3,
        isHealthy: true,
        failureCount: 0,
        lastFailureAt: null,
      });
    }

    // Quaternary: QuickNode (if configured)
    if (QUICKNODE_BASE_URL) {
      endpoints.push({
        name: "QuickNode",
        url: QUICKNODE_BASE_URL,
        priority: 4,
        isHealthy: true,
        failureCount: 0,
        lastFailureAt: null,
      });
    }

    this.endpoints = endpoints;

    console.log(
      `[RpcProvider] Initialized ${endpoints.length} RPC endpoint(s):`,
      endpoints.map((e) => e.name).join(", ")
    );
  }

  /**
   * Creates viem PublicClient instances for each endpoint
   */
  private createClients(): void {
    for (const endpoint of this.endpoints) {
      const client = createPublicClient({
        chain: base,
        transport: http(endpoint.url, {
          timeout: HEALTH_CHECK_TIMEOUT,
        }),
      }) as any as PublicClient;

      this.clients.set(endpoint.url, client);
    }
  }

  /**
   * Gets current active PublicClient
   * Automatically fails over to next endpoint if current is unhealthy
   * @returns Active PublicClient instance
   */
  public getClient(): PublicClient {
    // Find first healthy endpoint
    const healthyEndpoint = this.endpoints.find((e) => e.isHealthy);

    if (!healthyEndpoint) {
      // All endpoints unhealthy - use primary as fallback
      console.error("[RpcProvider] All endpoints unhealthy, using primary as fallback");
      const primaryEndpoint = this.endpoints[0];
      return this.clients.get(primaryEndpoint.url)!;
    }

    const client = this.clients.get(healthyEndpoint.url);

    if (!client) {
      throw new Error(`Client not found for endpoint ${healthyEndpoint.name}`);
    }

    return client;
  }

  /**
   * Execute RPC call with retry and circuit breaker
   * Wraps viem client calls with resilience features
   * @param operation - RPC operation to execute
   * @returns Promise resolving to operation result
   */
  public async executeWithResilience<T>(
    operation: (client: PublicClient) => Promise<T>
  ): Promise<T> {
    const healthyEndpoint = this.endpoints.find((e) => e.isHealthy);
    
    if (!healthyEndpoint) {
      throw new ExternalServiceError(
        "All RPC endpoints are unhealthy",
        undefined,
        "rpc-provider",
        false
      );
    }

    // Get or create circuit breaker for this endpoint
    const circuitBreaker = globalCircuitBreakerRegistry.getOrCreate(
      `rpc-${healthyEndpoint.name}`,
      {
        failureThreshold: 5,
        timeout: 60000,
      }
    );

    try {
      return await circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            const client = this.getClient();
            try {
              return await operation(client);
            } catch (error) {
              // Mark endpoint as failed
              this.markEndpointFailed(healthyEndpoint.url);
              throw error;
            }
          },
          NETWORK_RETRY_CONFIG
        );
      });
    } catch (error) {
      throw new ExternalServiceError(
        `RPC call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        "rpc-provider",
        true
      );
    }
  }

  /**
   * Marks an endpoint as failed
   * Automatically fails over if failure threshold exceeded
   * @param endpointUrl - URL of failed endpoint
   */
  public markEndpointFailed(endpointUrl: string): void {
    const endpoint = this.endpoints.find((e) => e.url === endpointUrl);

    if (!endpoint) {
      console.warn(`[RpcProvider] Unknown endpoint: ${endpointUrl}`);
      return;
    }

    endpoint.failureCount++;
    endpoint.lastFailureAt = new Date();

    console.warn(
      `[RpcProvider] Endpoint ${endpoint.name} failed (${endpoint.failureCount}/${MAX_FAILURES})`
    );

    // Mark as unhealthy if failure threshold exceeded
    if (endpoint.failureCount >= MAX_FAILURES) {
      endpoint.isHealthy = false;
      console.error(`[RpcProvider] Endpoint ${endpoint.name} marked as unhealthy`);

      // Log available healthy endpoints
      const healthyEndpoints = this.endpoints.filter((e) => e.isHealthy);
      console.log(
        `[RpcProvider] Remaining healthy endpoints: ${healthyEndpoints.map((e) => e.name).join(", ") || "NONE"}`
      );
    }
  }

  /**
   * Performs health check on an endpoint
   * @param endpoint - Endpoint to check
   * @returns True if healthy, false otherwise
   */
  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<boolean> {
    try {
      const client = this.clients.get(endpoint.url);

      if (!client) {
        return false;
      }

      // Try to fetch latest block number (lightweight check)
      const blockNumber = await client.getBlockNumber();

      if (blockNumber > 0n) {
        // Endpoint is healthy - reset failure count
        endpoint.isHealthy = true;
        endpoint.failureCount = 0;
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`[RpcProvider] Health check failed for ${endpoint.name}:`, error);
      return false;
    }
  }

  /**
   * Starts background health check loop
   */
  private startHealthChecks(): void {
    // Run initial health check
    this.runHealthChecks();

    // Schedule periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * Runs health checks on all endpoints
   */
  private async runHealthChecks(): Promise<void> {
    console.log("[RpcProvider] Running health checks...");

    const checks = this.endpoints.map((endpoint) => this.checkEndpointHealth(endpoint));

    await Promise.all(checks);

    // Log health status
    const healthyCount = this.endpoints.filter((e) => e.isHealthy).length;
    console.log(
      `[RpcProvider] Health check complete: ${healthyCount}/${this.endpoints.length} endpoints healthy`
    );
  }

  /**
   * Stops background health checks (cleanup)
   */
  public stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Gets status of all endpoints
   * @returns Array of endpoint statuses
   */
  public getEndpointStatus(): Array<{
    name: string;
    url: string;
    isHealthy: boolean;
    failureCount: number;
    lastFailureAt: Date | null;
  }> {
    return this.endpoints.map((e) => ({
      name: e.name,
      url: e.url,
      isHealthy: e.isHealthy,
      failureCount: e.failureCount,
      lastFailureAt: e.lastFailureAt,
    }));
  }

  /**
   * Manually triggers failover to next endpoint
   */
  public triggerFailover(): void {
    const currentEndpoint = this.endpoints[this.currentEndpointIndex];

    if (currentEndpoint) {
      currentEndpoint.isHealthy = false;
      console.warn(`[RpcProvider] Manual failover triggered from ${currentEndpoint.name}`);
    }

    // Find next healthy endpoint
    const nextHealthyIndex = this.endpoints.findIndex((e) => e.isHealthy);

    if (nextHealthyIndex !== -1) {
      this.currentEndpointIndex = nextHealthyIndex;
      console.log(`[RpcProvider] Failed over to ${this.endpoints[nextHealthyIndex].name}`);
    } else {
      console.error("[RpcProvider] No healthy endpoints available for failover");
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let providerManager: RpcProviderManager | null = null;

/**
 * Gets singleton RPC provider manager instance
 * @returns RpcProviderManager instance
 */
export function getRpcProviderManager(): RpcProviderManager {
  if (!providerManager) {
    providerManager = new RpcProviderManager();
  }

  return providerManager;
}

/**
 * Gets current active RPC client with automatic failover
 * @returns viem PublicClient
 */
export function getRpcClient(): PublicClient {
  return getRpcProviderManager().getClient();
}

/**
 * Marks RPC endpoint as failed (triggers failover if threshold exceeded)
 * @param endpointUrl - URL of failed endpoint
 */
export function markRpcEndpointFailed(endpointUrl: string): void {
  getRpcProviderManager().markEndpointFailed(endpointUrl);
}

/**
 * Gets status of all RPC endpoints
 * @returns Array of endpoint statuses
 */
export function getRpcEndpointStatus(): Array<{
  name: string;
  url: string;
  isHealthy: boolean;
  failureCount: number;
  lastFailureAt: Date | null;
}> {
  return getRpcProviderManager().getEndpointStatus();
}

/**
 * Cleanup function (call on shutdown)
 */
export function shutdownRpcProvider(): void {
  if (providerManager) {
    providerManager.stopHealthChecks();
    providerManager = null;
  }
}
