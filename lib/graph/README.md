# Distributed Unified Graph Metrics Cache

Production-grade distributed caching system for graph-theoretic metrics with Redis backing and pub/sub invalidation.

## Architecture

### Three-Tier Cache Hierarchy

```
Request → Local Memory Cache (LRU, 90s TTL)
            ↓ miss
          Redis Cache (90s TTL)
            ↓ miss
          Compute (PageRank, Betweenness, etc.)
```

### Performance Characteristics

- **Local Cache Hit**: <1ms latency
- **Redis Cache Hit**: <5ms latency
- **Computation**: 10-100ms depending on graph size
- **Target Hit Rate**: 95%+
- **Invalidation Propagation**: <100ms across all instances

### Circuit Breaker

Graceful degradation when Redis is unavailable:
- Opens after 5 consecutive failures
- Stays open for 30 seconds
- Falls back to local cache only
- Automatically recovers when Redis is available

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
# or for Upstash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io

# Optional: Redis password
REDIS_PASSWORD=your-password

# Optional: Redis DB number (default: 0)
REDIS_DB=0
```

### Programmatic Configuration

```typescript
import { DistributedUnifiedCache } from './lib/graph/distributedMetricsCache';

// Standalone Redis
const cache = new DistributedUnifiedCache({
  host: 'localhost',
  port: 6379,
  password: 'optional-password',
  db: 0,
  keyPrefix: 'ugmc:',
  enableCompression: true,
  compressionThreshold: 1024, // bytes
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
}, 'instance-id');

// Redis Cluster
const clusterCache = new DistributedUnifiedCache({
  nodes: [
    { host: 'node1.redis.com', port: 6379 },
    { host: 'node2.redis.com', port: 6379 },
    { host: 'node3.redis.com', port: 6379 },
  ],
  options: {
    enableReadyCheck: true,
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
    scaleReads: 'slave',
  },
}, 'instance-id');
```

## Usage

### Basic Usage

```typescript
import { getDistributedCache } from './lib/graph/distributedMetricsCache';
import type { CausalGraph } from './types/causalTracer.types';

const cache = getDistributedCache();

// Get PageRank (three-tier cache)
const pageRank = await cache.getPageRank(
  'node-123',
  graph,
  epochNumber,
  currentEpoch
);

console.log(`PageRank: ${pageRank.rank}`);
console.log(`In-degree: ${pageRank.inDegree}`);
console.log(`Out-degree: ${pageRank.outDegree}`);

// Get Betweenness Centrality
const betweenness = await cache.getBetweenness(
  'node-123',
  graph,
  epochNumber,
  currentEpoch
);

console.log(`Centrality: ${betweenness.centrality}`);
console.log(`Paths through: ${betweenness.pathsThrough}`);

// Check novelty
const entityNovelty = await cache.isEntityNovel(
  'Entity Name',
  'EntityType',
  'entity-id'
);

console.log(`Is novel: ${entityNovelty.isNovel}`);
console.log(`Existing count: ${entityNovelty.existingCount}`);
```

### Cache Invalidation

```typescript
// Invalidate specific node (broadcasts to all instances)
await cache.invalidateNode('node-123', 'graph-domain');

// Recompute PageRank for entire graph (invalidates all PageRank cache)
await cache.recomputePageRank(graph);
```

### Monitoring

```typescript
const metrics = cache.getDistributedMetrics();

console.log('Cache Performance:');
console.log(`  Overall Hit Rate: ${(metrics.hitRate * 100).toFixed(2)}%`);
console.log(`  Local Hits: ${metrics.localHits}`);
console.log(`  Redis Hits: ${metrics.redisHits}`);
console.log(`  Computations: ${metrics.computations}`);
console.log(`  Redis Hit Rate: ${(metrics.redisHitRate * 100).toFixed(2)}%`);

console.log('\nCompression:');
console.log(`  Compressions: ${metrics.compressions}`);
console.log(`  Decompressions: ${metrics.decompressions}`);

console.log('\nInvalidations:');
console.log(`  Sent: ${metrics.invalidationsSent}`);
console.log(`  Received: ${metrics.invalidationsReceived}`);

console.log('\nReliability:');
console.log(`  Redis Errors: ${metrics.redisErrors}`);
console.log(`  Circuit Breaker State: ${metrics.circuitBreakerState.state}`);
console.log(`  Circuit Breaker Trips: ${metrics.circuitBreakerTrips}`);

console.log('\nLocal Cache Details:');
console.log(`  PageRank Hit Rate: ${(metrics.localCacheMetrics.pageRank.hitRate * 100).toFixed(2)}%`);
console.log(`  Betweenness Hit Rate: ${(metrics.localCacheMetrics.betweenness.hitRate * 100).toFixed(2)}%`);
console.log(`  Total Computations Saved: ${metrics.localCacheMetrics.totalComputationsSaved}`);
```

## Integration with Existing Systems

### BFT Consensus

The distributed cache is automatically used in BFT consensus for quorum selection:

```typescript
// lib/bft/pbftConsensus.ts
// Automatically uses distributed cache if available
const cache = getDistributedCache(); // Falls back to local if Redis unavailable
const pageRank = await cache.getPageRank(nodeId, graph, epoch);
```

### CCC Rewards

The distributed cache is automatically used in CCC reward calculation:

```typescript
// src/core/ccc/causalValue.ts
// Automatically uses distributed cache for all metrics
const cache = getDistributedCache();
const novelty = await cache.isEntityNovel(name, type, id);
const betweenness = await cache.getBetweenness(nodeId, graph);
const pageRank = await cache.getPageRank(nodeId, graph);
```

## Pub/Sub Channels

The cache uses Redis pub/sub for cross-instance invalidation:

- `cache:invalidate:pagerank` - PageRank invalidations
- `cache:invalidate:betweenness` - Betweenness centrality invalidations
- `cache:invalidate:novelty` - Novelty detection invalidations
- `cache:invalidate:connectivity` - Connectivity metrics invalidations
- `cache:invalidate:all` - Full cache invalidation

## Compression

Automatic compression for payloads >1KB:

- Uses gzip compression
- Transparent to callers
- Reduces Redis memory usage by 60-80%
- Adds <1ms latency for compression/decompression

## Testing

### Property-Based Tests

```bash
# Run all property-based tests
npm test lib/graph/__tests__/distributedMetricsCache.property.test.ts

# Run specific property test
npm test -- -t "Property 1: Cache Consistency"
```

### Integration Tests

```bash
# Requires Redis running on localhost:6379
docker run -d -p 6379:6379 redis:7-alpine

# Run integration tests
npm test lib/graph/__tests__/distributedMetricsCache.property.test.ts
```

## Performance Tuning

### Local Cache Size

Adjust LRU cache size in `unifiedMetricsCache.ts`:

```typescript
this.pageRankCache = new LRUCache<PageRankResult>(10000, 90000);
//                                                  ^^^^^ size
```

### Redis TTL

Adjust Redis TTL in `distributedMetricsCache.ts`:

```typescript
await this.setInRedis(cacheKey, computed, 90); // 90 seconds
//                                        ^^
```

### Compression Threshold

Adjust compression threshold:

```typescript
const cache = new DistributedUnifiedCache({
  // ...
  compressionThreshold: 2048, // Only compress payloads >2KB
}, 'instance-id');
```

### Circuit Breaker Tuning

Adjust circuit breaker parameters in `distributedMetricsCache.ts`:

```typescript
// Open circuit after 5 failures
if (this.circuitBreaker.failures >= 5) {
  this.circuitBreaker.state = 'open';
  this.circuitBreaker.openUntil = Date.now() + 30000; // 30 seconds
}
```

## Deployment

### Single Instance

For single-instance deployments, the distributed cache provides:
- Redis persistence (survives restarts)
- Compression (reduced memory usage)
- Monitoring (detailed metrics)

### Multi-Instance (Horizontal Scaling)

For multi-instance deployments, the distributed cache provides:
- Shared cache across all instances
- Pub/sub invalidation (<100ms propagation)
- Consistent view of graph metrics
- Linear scaling to 10+ instances

### Redis Cluster

For high-availability deployments:

```typescript
const cache = new DistributedUnifiedCache({
  nodes: [
    { host: 'node1', port: 6379 },
    { host: 'node2', port: 6379 },
    { host: 'node3', port: 6379 },
  ],
  options: {
    scaleReads: 'slave', // Read from replicas
  },
});
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Hit Rate**: Should be >95% after warmup
2. **Redis Errors**: Should be <1% of requests
3. **Circuit Breaker Trips**: Should be 0 in healthy system
4. **Invalidation Latency**: Should be <100ms

### Prometheus Metrics

```typescript
// Export metrics for Prometheus
const metrics = cache.getDistributedMetrics();

prometheus.gauge('cache_hit_rate', metrics.hitRate);
prometheus.gauge('cache_redis_hit_rate', metrics.redisHitRate);
prometheus.counter('cache_local_hits', metrics.localHits);
prometheus.counter('cache_redis_hits', metrics.redisHits);
prometheus.counter('cache_computations', metrics.computations);
prometheus.counter('cache_redis_errors', metrics.redisErrors);
prometheus.gauge('cache_circuit_breaker_state', 
  metrics.circuitBreakerState.state === 'open' ? 1 : 0
);
```

### Grafana Dashboard

Key panels:
- Hit rate over time (target: >95%)
- Cache tier breakdown (local vs Redis vs compute)
- Invalidation propagation latency
- Circuit breaker state
- Redis connection health

## Troubleshooting

### Low Hit Rate

1. Check if cache is warming up (first 5 minutes)
2. Verify TTL is appropriate for workload
3. Check if invalidations are too frequent
4. Monitor memory pressure (LRU evictions)

### High Redis Latency

1. Check Redis server load
2. Verify network latency to Redis
3. Consider Redis cluster for scaling
4. Adjust compression threshold

### Circuit Breaker Opening

1. Check Redis server availability
2. Verify network connectivity
3. Check Redis server logs for errors
4. Verify Redis authentication

### Invalidation Not Propagating

1. Check pub/sub subscription status
2. Verify Redis pub/sub is working (`PUBSUB CHANNELS`)
3. Check network between instances
4. Verify instance IDs are unique

## License

MIT
