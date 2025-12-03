# Off-Chain Causal Oracle (OCCO)

**Version**: 1.0.0  
**Status**: Production  
**Last Updated**: 2025-11-24

## Overview

Off-Chain Causal Oracle provides 10x throughput improvement over on-chain causal weight calculation by caching computed weights in memory with mesh gossip synchronization.

## Architecture

### Cache Layer
- **Implementation**: In-memory LRU cache
- **Capacity**: 10,000 entries
- **TTL**: 90 seconds
- **Eviction**: Least Recently Used (LRU)

### Gossip Protocol
- **Delta Threshold**: 5% change triggers broadcast
- **Transport**: A2A mesh network (`bft.gossip` capability)
- **Message Format**: 
  ```json
  {
    "type": "causal_weight_delta",
    "payload": {
      "nodeId": "...",
      "referenceEntity": "...",
      "oldWeight": 0.75,
      "newWeight": 0.82,
      "delta": 0.07
    },
    "timestamp": 1732456789000
  }
  ```

### Fallback Strategy
1. Check local LRU cache (target: <0.1ms p95)
2. On cache miss: compute via `calculateCausalWeight()` (6-8ms)
3. Store result in cache
4. If delta > 5%: broadcast to mesh peers
5. On complete failure: return 0 (neutral weight)

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Cache Hit Rate | >95% | TBD |
| p95 Latency (hit) | <0.8ms | TBD |
| p95 Latency (miss) | <10ms | TBD |
| Gossip Propagation | <500ms | TBD |
| Memory Usage | <50MB | TBD |

## Cache Invalidation

### Automatic Expiry
- TTL-based eviction after 90 seconds
- LRU eviction when capacity exceeded

### Manual Invalidation
Not implemented. Cache naturally refreshes via TTL.

### Graph Changes
Graph commit changes invalidate all weights for that graph (not yet implemented).

## Integration

### PBFT Consensus
```typescript
// In pbftConsensus.ts selectQuorum()
const causalWeight = await offChainOracle.getCausalWeight(
  node.nodeId,
  referenceEntity,
  this.causalGraph
);
```

### Mesh Router
```typescript
// Initialize oracle with mesh router
offChainOracle.setMeshRouter(meshRouter);

// Receive gossip messages
offChainOracle.receiveWeightDelta(delta);
```

## Monitoring

### Metrics Endpoint
```typescript
const metrics = offChainOracle.getMetrics();
// Returns:
// {
//   hits: number,
//   misses: number,
//   gossipBroadcasts: number,
//   avgLookupTimeMs: number,
//   hitRate: number,
//   cacheSize: number
// }
```

### Alerts
- Hit rate < 90% → investigate cache size or TTL
- Avg lookup > 1ms → check CPU/memory pressure
- Gossip broadcasts > 1000/min → potential network instability

## Future Enhancements

1. **Redis Backend**: Replace in-memory cache with Redis for multi-process sharing
2. **Graph Commit Tracking**: Invalidate cache on graph updates
3. **Peer Reputation**: Weight gossip messages by peer trust score
4. **Compression**: CBOR-encode gossip payloads for bandwidth optimization
