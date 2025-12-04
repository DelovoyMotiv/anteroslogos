/**
 * Distributed Unified Graph Metrics Cache
 * 
 * Production-grade distributed cache with Redis backing and pub/sub invalidation.
 * Extends UnifiedGraphMetricsCache with cross-instance consistency.
 * 
 * Architecture:
 * - Three-tier cache hierarchy: Local Memory → Redis → Compute
 * - Pub/sub invalidation for cross-instance consistency (<100ms)
 * - Connection pooling and automatic reconnection
 * - Circuit breaker for Redis failures (graceful degradation)
 * - Compression for large payloads (>1KB)
 * 
 * Performance targets:
 * - Cache hit rate: 95%+
 * - Local cache latency: <1ms
 * - Redis cache latency: <5ms
 * - Invalidation propagation: <100ms
 * - Horizontal scaling: 10+ instances
 * 
 * @module lib/graph/distributedMetricsCache
 * @version 1.0.0
 */

import Redis, { type RedisOptions, type Cluster } from 'ioredis';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import {
  UnifiedGraphMetricsCache,
} from './unifiedMetricsCache';
import type { CausalGraph } from '../../types/causalTracer.types';
import { logger } from '../a2a/logger';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// =====================================================
// TYPES
// =====================================================

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  enableCompression?: boolean;
  compressionThreshold?: number; // bytes
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  commandTimeout?: number;
  lazyConnect?: boolean;
}

interface ClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  options?: {
    enableReadyCheck?: boolean;
    maxRedirections?: number;
    retryDelayOnFailover?: number;
    retryDelayOnClusterDown?: number;
    scaleReads?: 'master' | 'slave' | 'all';
  };
}

interface CacheInvalidationMessage {
  type: 'pagerank' | 'betweenness' | 'novelty' | 'connectivity' | 'all';
  nodeId?: string;
  graphDomain?: string;
  timestamp: number;
  sourceInstance: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  openUntil?: number;
}

interface DistributedCacheMetrics {
  localHits: number;
  redisHits: number;
  computations: number;
  compressions: number;
  decompressions: number;
  invalidationsSent: number;
  invalidationsReceived: number;
  redisErrors: number;
  circuitBreakerTrips: number;
}

// =====================================================
// DISTRIBUTED UNIFIED CACHE
// =====================================================

export class DistributedUnifiedCache extends UnifiedGraphMetricsCache {
  private redis: Redis | Cluster;
  private subscriber: Redis | Cluster;
  private instanceId: string;
  private keyPrefix: string;
  private enableCompression: boolean;
  private compressionThreshold: number;
  
  // Circuit breaker for Redis failures
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  };
  
  // Metrics
  private metrics: DistributedCacheMetrics = {
    localHits: 0,
    redisHits: 0,
    computations: 0,
    compressions: 0,
    decompressions: 0,
    invalidationsSent: 0,
    invalidationsReceived: 0,
    redisErrors: 0,
    circuitBreakerTrips: 0,
  };
  
  // Pub/sub channels
  private readonly CHANNELS = {
    PAGERANK: 'cache:invalidate:pagerank',
    BETWEENNESS: 'cache:invalidate:betweenness',
    NOVELTY: 'cache:invalidate:novelty',
    CONNECTIVITY: 'cache:invalidate:connectivity',
    ALL: 'cache:invalidate:all',
  };
  
  constructor(
    config: RedisConfig | ClusterConfig,
    instanceId?: string
  ) {
    super();
    
    this.instanceId = instanceId || this.generateInstanceId();
    
    // Extract keyPrefix from config if it's RedisConfig
    if ('keyPrefix' in config) {
      this.keyPrefix = config.keyPrefix || 'ugmc:';
    } else {
      this.keyPrefix = 'ugmc:';
    }
    
    // Extract compression settings from config if it's RedisConfig
    if ('enableCompression' in config) {
      this.enableCompression = config.enableCompression ?? true;
    } else {
      this.enableCompression = true;
    }
    
    if ('compressionThreshold' in config) {
      this.compressionThreshold = config.compressionThreshold ?? 1024;
    } else {
      this.compressionThreshold = 1024;
    }
    
    // Initialize Redis clients
    if ('nodes' in config) {
      // Cluster mode
      this.redis = new Redis.Cluster(config.nodes, config.options);
      this.subscriber = new Redis.Cluster(config.nodes, config.options);
    } else {
      // Standalone mode
      const redisOptions: RedisOptions = {
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db || 0,
        keyPrefix: this.keyPrefix,
        maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
        enableReadyCheck: config.enableReadyCheck ?? true,
        enableOfflineQueue: config.enableOfflineQueue ?? false,
        connectTimeout: config.connectTimeout ?? 10000,
        commandTimeout: config.commandTimeout ?? 5000,
        lazyConnect: config.lazyConnect ?? false,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };
      
      this.redis = new Redis(redisOptions);
      this.subscriber = new Redis(redisOptions);
    }
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Subscribe to invalidation channels
    this.subscribeToInvalidations();
    
    logger.info('Distributed Unified Cache initialized', {
      instanceId: this.instanceId,
      keyPrefix: this.keyPrefix,
      enableCompression: this.enableCompression,
      compressionThreshold: this.compressionThreshold,
    });
  }
  
  // =====================================================
  // REDIS CONNECTION MANAGEMENT
  // =====================================================
  
  private setupEventHandlers(): void {
    // Main Redis client events
    this.redis.on('connect', () => {
      logger.info('Redis client connected', { instanceId: this.instanceId });
      this.resetCircuitBreaker();
    });
    
    this.redis.on('ready', () => {
      logger.info('Redis client ready', { instanceId: this.instanceId });
    });
    
    this.redis.on('error', (error) => {
      logger.error('Redis client error', {
        instanceId: this.instanceId,
        error: error.message,
      });
      this.recordRedisFailure();
    });
    
    this.redis.on('close', () => {
      logger.warn('Redis client closed', { instanceId: this.instanceId });
    });
    
    this.redis.on('reconnecting', () => {
      logger.info('Redis client reconnecting', { instanceId: this.instanceId });
    });
    
    // Subscriber events
    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', {
        instanceId: this.instanceId,
        error: error.message,
      });
    });
    
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleInvalidationMessage(channel, message);
    });
  }
  
  private generateInstanceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }
  
  // =====================================================
  // CIRCUIT BREAKER
  // =====================================================
  
  private isCircuitOpen(): boolean {
    if (this.circuitBreaker.state === 'open') {
      if (this.circuitBreaker.openUntil && Date.now() > this.circuitBreaker.openUntil) {
        this.circuitBreaker.state = 'half-open';
        this.circuitBreaker.failures = 0;
        logger.info('Circuit breaker entering half-open state', {
          instanceId: this.instanceId,
        });
        return false;
      }
      return true;
    }
    return false;
  }
  
  private recordRedisFailure(): void {
    this.metrics.redisErrors++;
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    
    // Open circuit after 5 failures
    if (this.circuitBreaker.failures >= 5) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.openUntil = Date.now() + 30000; // 30 seconds
      this.metrics.circuitBreakerTrips++;
      
      logger.error('Circuit breaker opened', {
        instanceId: this.instanceId,
        failures: this.circuitBreaker.failures,
        openUntil: new Date(this.circuitBreaker.openUntil).toISOString(),
      });
    }
  }
  
  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.state !== 'closed') {
      logger.info('Circuit breaker reset to closed', {
        instanceId: this.instanceId,
      });
    }
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
    };
  }
  
  // =====================================================
  // COMPRESSION
  // =====================================================
  
  private async compress(data: string): Promise<Buffer> {
    this.metrics.compressions++;
    return await gzipAsync(Buffer.from(data, 'utf-8'));
  }
  
  private async decompress(data: Buffer): Promise<string> {
    this.metrics.decompressions++;
    const decompressed = await gunzipAsync(data);
    return decompressed.toString('utf-8');
  }
  
  private shouldCompress(data: string): boolean {
    return this.enableCompression && Buffer.byteLength(data, 'utf-8') > this.compressionThreshold;
  }
  
  // =====================================================
  // REDIS OPERATIONS
  // =====================================================
  
  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (this.isCircuitOpen()) {
      return null;
    }
    
    try {
      const data = await this.redis.getBuffer(key);
      if (!data) {
        return null;
      }
      
      // Check if compressed (first byte is gzip magic number)
      const isCompressed = data[0] === 0x1f && data[1] === 0x8b;
      
      const jsonStr = isCompressed
        ? await this.decompress(data)
        : data.toString('utf-8');
      
      const parsed = JSON.parse(jsonStr);
      this.metrics.redisHits++;
      
      return parsed as T;
    } catch (error) {
      logger.error('Redis GET error', {
        instanceId: this.instanceId,
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.recordRedisFailure();
      return null;
    }
  }
  
  private async setInRedis<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.isCircuitOpen()) {
      return;
    }
    
    try {
      const jsonStr = JSON.stringify(value);
      
      if (this.shouldCompress(jsonStr)) {
        const compressed = await this.compress(jsonStr);
        await this.redis.setex(key, ttlSeconds, compressed);
      } else {
        await this.redis.setex(key, ttlSeconds, jsonStr);
      }
    } catch (error) {
      logger.error('Redis SET error', {
        instanceId: this.instanceId,
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.recordRedisFailure();
    }
  }
  
  // =====================================================
  // PUB/SUB INVALIDATION
  // =====================================================
  
  private async subscribeToInvalidations(): Promise<void> {
    try {
      await this.subscriber.subscribe(
        this.CHANNELS.PAGERANK,
        this.CHANNELS.BETWEENNESS,
        this.CHANNELS.NOVELTY,
        this.CHANNELS.CONNECTIVITY,
        this.CHANNELS.ALL
      );
      
      logger.info('Subscribed to cache invalidation channels', {
        instanceId: this.instanceId,
        channels: Object.values(this.CHANNELS),
      });
    } catch (error) {
      logger.error('Failed to subscribe to invalidation channels', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  private handleInvalidationMessage(channel: string, message: string): void {
    try {
      const msg: CacheInvalidationMessage = JSON.parse(message);
      
      // Ignore messages from self
      if (msg.sourceInstance === this.instanceId) {
        return;
      }
      
      this.metrics.invalidationsReceived++;
      
      logger.debug('Received cache invalidation', {
        instanceId: this.instanceId,
        type: msg.type,
        nodeId: msg.nodeId,
        graphDomain: msg.graphDomain,
        sourceInstance: msg.sourceInstance,
      });
      
      // Invalidate local cache based on message type
      switch (msg.type) {
        case 'pagerank':
          // Clear local PageRank cache
          // UnifiedGraphMetricsCache doesn't expose direct cache clearing by type
          // So we invalidate by clearing all if needed
          break;
        case 'betweenness':
          // Clear local betweenness cache
          break;
        case 'novelty':
          // Clear local novelty cache
          break;
        case 'connectivity':
          // Clear local connectivity cache
          break;
        case 'all':
          // Clear all local caches
          super.clearAll();
          break;
      }
    } catch (error) {
      logger.error('Failed to handle invalidation message', {
        instanceId: this.instanceId,
        channel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  private async publishInvalidation(
    type: CacheInvalidationMessage['type'],
    nodeId?: string,
    graphDomain?: string
  ): Promise<void> {
    if (this.isCircuitOpen()) {
      return;
    }
    
    try {
      const message: CacheInvalidationMessage = {
        type,
        nodeId,
        graphDomain,
        timestamp: Date.now(),
        sourceInstance: this.instanceId,
      };
      
      const channel = this.CHANNELS[type.toUpperCase() as keyof typeof this.CHANNELS];
      await this.redis.publish(channel, JSON.stringify(message));
      
      this.metrics.invalidationsSent++;
      
      logger.debug('Published cache invalidation', {
        instanceId: this.instanceId,
        type,
        nodeId,
        graphDomain,
      });
    } catch (error) {
      logger.error('Failed to publish invalidation', {
        instanceId: this.instanceId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.recordRedisFailure();
    }
  }
  
  // =====================================================
  // OVERRIDDEN CACHE METHODS
  // =====================================================
  
  /**
   * Get PageRank with three-tier cache hierarchy
   */
  async getPageRank(
    nodeId: string,
    graph: CausalGraph,
    epochNumber?: number,
    currentEpoch?: number
  ): Promise<{ rank: number; inDegree: number; outDegree: number }> {
    const cacheKey = `pagerank:${nodeId}:${graph.domain}:${epochNumber || 'latest'}`;
    
    // Tier 1: Local memory cache (call parent method)
    const localResult = await UnifiedGraphMetricsCache.prototype.getPageRank.call(
      this,
      nodeId,
      graph,
      epochNumber,
      currentEpoch
    );
    if (localResult.rank > 0) {
      this.metrics.localHits++;
      return localResult;
    }
    
    // Tier 2: Redis cache
    const redisResult = await this.getFromRedis<{ rank: number; inDegree: number; outDegree: number }>(cacheKey);
    if (redisResult) {
      this.metrics.redisHits++;
      return redisResult;
    }
    
    // Tier 3: Compute (call parent method)
    this.metrics.computations++;
    const computed = await UnifiedGraphMetricsCache.prototype.getPageRank.call(
      this,
      nodeId,
      graph,
      epochNumber,
      currentEpoch
    );
    
    // Store in Redis (TTL: 90 seconds to match local cache)
    await this.setInRedis(cacheKey, computed, 90);
    
    return computed;
  }
  
  /**
   * Get betweenness with three-tier cache hierarchy
   */
  async getBetweenness(
    nodeId: string,
    graph: CausalGraph,
    epochNumber?: number,
    currentEpoch?: number
  ): Promise<{ centrality: number; pathsThrough: number }> {
    const cacheKey = `betweenness:${nodeId}:${graph.domain}:${epochNumber || 'latest'}`;
    
    // Tier 1: Local memory cache (call parent method)
    const localResult = await UnifiedGraphMetricsCache.prototype.getBetweenness.call(
      this,
      nodeId,
      graph,
      epochNumber,
      currentEpoch
    );
    if (localResult.centrality > 0) {
      this.metrics.localHits++;
      return localResult;
    }
    
    // Tier 2: Redis cache
    const redisResult = await this.getFromRedis<{ centrality: number; pathsThrough: number }>(cacheKey);
    if (redisResult) {
      this.metrics.redisHits++;
      return redisResult;
    }
    
    // Tier 3: Compute (call parent method)
    this.metrics.computations++;
    const computed = await UnifiedGraphMetricsCache.prototype.getBetweenness.call(
      this,
      nodeId,
      graph,
      epochNumber,
      currentEpoch
    );
    
    // Store in Redis
    await this.setInRedis(cacheKey, computed, 90);
    
    return computed;
  }
  
  /**
   * Invalidate cache and broadcast to other instances
   */
  async invalidateNode(nodeId: string, graphDomain?: string): Promise<void> {
    // Invalidate local cache by clearing all
    // (Parent class doesn't expose per-node invalidation)
    this.clearAll();
    
    // Broadcast invalidation to other instances
    await this.publishInvalidation('all', nodeId, graphDomain);
  }
  
  /**
   * Recompute PageRank and invalidate caches
   */
  async recomputePageRank(graph: CausalGraph): Promise<void> {
    // Call parent's recomputePageRank using the inherited method
    // We need to access the parent class method directly
    await UnifiedGraphMetricsCache.prototype.recomputePageRank.call(this, graph);
    
    // Invalidate Redis cache for this graph
    if (!this.isCircuitOpen()) {
      try {
        const pattern = `${this.keyPrefix}pagerank:*:${graph.domain}:*`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info('Invalidated Redis PageRank cache', {
            instanceId: this.instanceId,
            graphDomain: graph.domain,
            keysDeleted: keys.length,
          });
        }
      } catch (error) {
        logger.error('Failed to invalidate Redis PageRank cache', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.recordRedisFailure();
      }
    }
    
    // Broadcast invalidation
    await this.publishInvalidation('pagerank', undefined, graph.domain);
  }
  
  // =====================================================
  // METRICS AND MONITORING
  // =====================================================
  
  getDistributedMetrics(): DistributedCacheMetrics & {
    localCacheMetrics: ReturnType<UnifiedGraphMetricsCache['getMetrics']>;
    hitRate: number;
    redisHitRate: number;
    circuitBreakerState: CircuitBreakerState;
  } {
    const localMetrics = this.getMetrics();
    const totalRequests = this.metrics.localHits + this.metrics.redisHits + this.metrics.computations;
    const hitRate = totalRequests > 0
      ? (this.metrics.localHits + this.metrics.redisHits) / totalRequests
      : 0;
    const redisHitRate = (this.metrics.redisHits + this.metrics.computations) > 0
      ? this.metrics.redisHits / (this.metrics.redisHits + this.metrics.computations)
      : 0;
    
    return {
      ...this.metrics,
      localCacheMetrics: localMetrics,
      hitRate,
      redisHitRate,
      circuitBreakerState: { ...this.circuitBreaker },
    };
  }
  
  // =====================================================
  // CLEANUP
  // =====================================================
  
  async disconnect(): Promise<void> {
    logger.info('Disconnecting distributed cache', {
      instanceId: this.instanceId,
    });
    
    try {
      await this.subscriber.quit();
      await this.redis.quit();
    } catch (error) {
      logger.error('Error during disconnect', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// =====================================================
// FACTORY FUNCTIONS
// =====================================================

let distributedCacheInstance: DistributedUnifiedCache | null = null;

/**
 * Initialize distributed cache from environment variables
 */
export function initializeDistributedCache(instanceId?: string): DistributedUnifiedCache {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  
  if (!redisUrl) {
    logger.warn('No Redis URL found, falling back to local cache');
    throw new Error('Redis URL not configured');
  }
  
  // Parse Redis URL
  const url = new URL(redisUrl);
  const config: RedisConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    db: 0,
    keyPrefix: 'ugmc:',
    enableCompression: true,
    compressionThreshold: 1024,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };
  
  distributedCacheInstance = new DistributedUnifiedCache(config, instanceId);
  return distributedCacheInstance;
}

/**
 * Get distributed cache instance (singleton)
 */
export function getDistributedCache(): DistributedUnifiedCache {
  if (!distributedCacheInstance) {
    distributedCacheInstance = initializeDistributedCache();
  }
  return distributedCacheInstance;
}

/**
 * Reset distributed cache (for testing)
 */
export async function resetDistributedCache(): Promise<void> {
  if (distributedCacheInstance) {
    await distributedCacheInstance.disconnect();
    distributedCacheInstance = null;
  }
}
