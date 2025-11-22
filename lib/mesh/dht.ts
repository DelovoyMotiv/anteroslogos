/**
 * Distributed Hash Table (DHT) Implementation
 * Kademlia-inspired peer discovery and routing for Agent Mesh Network
 * 
 * Based on research:
 * - Maymounkov & Mazières (2002) "Kademlia: A Peer-to-Peer Information System Based on the XOR Metric"
 * - Baumgart & Mies (2007) "S/Kademlia: A Practicable Approach Towards Secure Key-Based Routing"
 * 
 * Features:
 * - 160-bit node IDs (SHA-1 of aid_uri)
 * - k-bucket routing table (k=20)
 * - XOR distance metric for peer selection
 * - Bucket refresh protocol (every 5 minutes)
 * - Automatic peer eviction (least-recently-seen)
 * 
 * @module lib/mesh/dht
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { z } from 'zod';

// =====================================================
// CONSTANTS
// =====================================================

/** Bucket size (maximum peers per bucket) */
const K_BUCKET_SIZE = 20;

/** Number of bits in node ID */
const NODE_ID_BITS = 160;

/** Bucket refresh interval (24 hours - Vercel CRON limit) */
const BUCKET_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

/** Peer timeout (30 minutes of inactivity) */
const PEER_TIMEOUT = 30 * 60 * 1000;

/** Number of closest nodes to return */
const ALPHA = 3;

/** Maximum retries for unresponsive peers */
const MAX_PEER_FAILURES = 3;

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * DHT Peer node
 */
export const DHTNodeSchema = z.object({
  nodeId: z.string(), // 160-bit hex string
  aidUri: z.string(), // agent://domain.com
  endpoint: z.string().url(), // https://domain.com/api/a2a
  capabilities: z.array(z.string()),
  trustScore: z.number().min(0).max(100),
  lastSeen: z.number(), // Unix timestamp
  rtt: z.number().optional(), // Round-trip time in ms
  failureCount: z.number().default(0),
  metadata: z.object({
    version: z.string().optional(),
    publicKey: z.string().optional(), // Ed25519 public key for signatures
    costPerCall: z.object({
      token: z.string(),
      amount: z.number(),
    }).optional(),
  }).optional(),
});

export type DHTNode = z.infer<typeof DHTNodeSchema>;

/**
 * K-Bucket for storing peers
 */
interface KBucket {
  prefix: string; // Binary prefix for this bucket
  nodes: DHTNode[];
  lastRefresh: number;
}

/**
 * DHT lookup result
 */
export interface DHTLookupResult {
  nodes: DHTNode[];
  distance: string; // XOR distance to target
  hops: number;
}

// =====================================================
// NODE ID UTILITIES
// =====================================================

/**
 * Generate 160-bit node ID from aid_uri using SHA-1
 */
export function generateNodeId(aidUri: string): string {
  const hash = createHash('sha1').update(aidUri).digest('hex');
  return hash; // 40 hex characters = 160 bits
}

/**
 * Calculate XOR distance between two node IDs
 * Returns BigInt for precise distance calculation
 */
function xorDistance(id1: string, id2: string): bigint {
  const buf1 = Buffer.from(id1, 'hex');
  const buf2 = Buffer.from(id2, 'hex');
  
  let distance = 0n;
  for (let i = 0; i < buf1.length; i++) {
    distance = (distance << 8n) | BigInt(buf1[i] ^ buf2[i]);
  }
  
  return distance;
}

/**
 * Find common prefix length (number of matching bits from left)
 */
function commonPrefixLength(id1: string, id2: string): number {
  const buf1 = Buffer.from(id1, 'hex');
  const buf2 = Buffer.from(id2, 'hex');
  
  let prefixLength = 0;
  
  for (let i = 0; i < buf1.length; i++) {
    const xor = buf1[i] ^ buf2[i];
    
    if (xor === 0) {
      prefixLength += 8;
    } else {
      // Count leading zeros in XOR byte
      prefixLength += Math.clz32(xor) - 24; // clz32 counts leading zeros in 32-bit int
      break;
    }
  }
  
  return prefixLength;
}

/**
 * Convert node ID to binary string
 */
function toBinaryString(nodeId: string): string {
  return Buffer.from(nodeId, 'hex')
    .toString('binary')
    .split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
}

// =====================================================
// DISTRIBUTED HASH TABLE
// =====================================================

export class DistributedHashTable {
  private localNodeId: string;
  private localAidUri: string;
  private buckets: Map<number, KBucket> = new Map();
  private refreshTimer?: NodeJS.Timeout;

  constructor(localAidUri: string) {
    this.localAidUri = localAidUri;
    this.localNodeId = generateNodeId(localAidUri);
    
    // Initialize empty buckets (lazy initialization)
    console.log(`[DHT] Initialized with node ID: ${this.localNodeId}`);
    
    // Start bucket refresh timer
    this.startRefreshTimer();
  }

  /**
   * Add or update peer in routing table
   */
  addNode(node: DHTNode): boolean {
    // Don't add self
    if (node.nodeId === this.localNodeId) {
      return false;
    }

    // Validate node
    try {
      DHTNodeSchema.parse(node);
    } catch (error) {
      console.error('[DHT] Invalid node data:', error);
      return false;
    }

    const prefixLength = commonPrefixLength(this.localNodeId, node.nodeId);
    const bucketIndex = prefixLength;

    // Get or create bucket
    let bucket = this.buckets.get(bucketIndex);
    if (!bucket) {
      bucket = {
        prefix: toBinaryString(this.localNodeId).substring(0, prefixLength),
        nodes: [],
        lastRefresh: Date.now(),
      };
      this.buckets.set(bucketIndex, bucket);
    }

    // Check if node already exists
    const existingIndex = bucket.nodes.findIndex(n => n.nodeId === node.nodeId);

    if (existingIndex !== -1) {
      // Update existing node (move to front - most recently seen)
      bucket.nodes[existingIndex] = {
        ...node,
        lastSeen: Date.now(),
        failureCount: 0, // Reset failure count on successful contact
      };
      // Move to front
      const [updated] = bucket.nodes.splice(existingIndex, 1);
      bucket.nodes.unshift(updated);
      
      console.log(`[DHT] Updated node ${node.aidUri} in bucket ${bucketIndex}`);
      return true;
    }

    // Add new node
    if (bucket.nodes.length < K_BUCKET_SIZE) {
      // Bucket not full, add to front
      bucket.nodes.unshift({
        ...node,
        lastSeen: Date.now(),
        failureCount: 0,
      });
      
      console.log(`[DHT] Added node ${node.aidUri} to bucket ${bucketIndex} (${bucket.nodes.length}/${K_BUCKET_SIZE})`);
      return true;
    } else {
      // Bucket full - evict least recently seen node
      const leastRecent = bucket.nodes[bucket.nodes.length - 1];
      const timeSinceLastSeen = Date.now() - leastRecent.lastSeen;

      if (timeSinceLastSeen > PEER_TIMEOUT || leastRecent.failureCount >= MAX_PEER_FAILURES) {
        // Evict least recent and add new
        bucket.nodes.pop();
        bucket.nodes.unshift({
          ...node,
          lastSeen: Date.now(),
          failureCount: 0,
        });
        
        console.log(`[DHT] Evicted ${leastRecent.aidUri}, added ${node.aidUri} to bucket ${bucketIndex}`);
        return true;
      } else {
        // Bucket full with active nodes - reject new node
        console.log(`[DHT] Bucket ${bucketIndex} full, rejected ${node.aidUri}`);
        return false;
      }
    }
  }

  /**
   * Find k closest nodes to target ID
   */
  findClosestNodes(targetId: string, count: number = K_BUCKET_SIZE): DHTNode[] {
    const allNodes: Array<{ node: DHTNode; distance: bigint }> = [];

    // Collect all nodes from buckets
    for (const bucket of this.buckets.values()) {
      for (const node of bucket.nodes) {
        // Skip expired nodes
        if (Date.now() - node.lastSeen > PEER_TIMEOUT) continue;
        // Skip failed nodes
        if (node.failureCount >= MAX_PEER_FAILURES) continue;

        const distance = xorDistance(targetId, node.nodeId);
        allNodes.push({ node, distance });
      }
    }

    // Sort by XOR distance (ascending)
    allNodes.sort((a, b) => {
      if (a.distance < b.distance) return -1;
      if (a.distance > b.distance) return 1;
      return 0;
    });

    // Return k closest
    return allNodes.slice(0, count).map(item => item.node);
  }

  /**
   * Lookup: Find nodes closest to target (iterative algorithm)
   */
  async lookup(targetId: string): Promise<DHTLookupResult> {
    const closestNodes = this.findClosestNodes(targetId, ALPHA);
    const queried = new Set<string>([this.localNodeId]);
    
    let hops = 0;
    let lastDistance = xorDistance(targetId, this.localNodeId);

    // Iterative lookup - query closest unqueried nodes
    while (hops < 5) { // Max 5 hops to prevent infinite loops
      hops++;

      // Find unqueried nodes from current results
      const toQuery = closestNodes
        .filter(node => !queried.has(node.nodeId))
        .slice(0, ALPHA);

      if (toQuery.length === 0) break;

      // Mark as queried
      toQuery.forEach(node => queried.add(node.nodeId));

      // Query each node for their closest nodes (would be actual network calls)
      // For now, this is a local operation
      for (const _node of toQuery) {
        // In production, this would be: await queryNode(node, targetId)
        // For now, skip (no network layer yet)
      }

      // Check if we're converging
      const currentClosest = closestNodes[0];
      if (currentClosest) {
        const currentDistance = xorDistance(targetId, currentClosest.nodeId);
        if (currentDistance >= lastDistance) {
          // No improvement, stop
          break;
        }
        lastDistance = currentDistance;
      }
    }

    const finalNodes = this.findClosestNodes(targetId, K_BUCKET_SIZE);
    const closestDistance = finalNodes.length > 0
      ? xorDistance(targetId, finalNodes[0].nodeId).toString(16)
      : '0';

    return {
      nodes: finalNodes,
      distance: closestDistance,
      hops,
    };
  }

  /**
   * Find nodes with specific capability
   */
  findNodesByCapability(capability: string, maxNodes: number = 10): DHTNode[] {
    const matchingNodes: DHTNode[] = [];

    for (const bucket of this.buckets.values()) {
      for (const node of bucket.nodes) {
        // Skip expired or failed nodes
        if (Date.now() - node.lastSeen > PEER_TIMEOUT) continue;
        if (node.failureCount >= MAX_PEER_FAILURES) continue;

        if (node.capabilities.includes(capability)) {
          matchingNodes.push(node);
          if (matchingNodes.length >= maxNodes) break;
        }
      }
      if (matchingNodes.length >= maxNodes) break;
    }

    // Sort by trust score (descending)
    matchingNodes.sort((a, b) => b.trustScore - a.trustScore);

    return matchingNodes;
  }

  /**
   * Get node by node ID
   */
  getNode(nodeId: string): DHTNode | null {
    for (const bucket of this.buckets.values()) {
      const node = bucket.nodes.find(n => n.nodeId === nodeId);
      if (node) return node;
    }
    return null;
  }

  /**
   * Get node by AID URI
   */
  getNodeByUri(aidUri: string): DHTNode | null {
    const nodeId = generateNodeId(aidUri);
    return this.getNode(nodeId);
  }

  /**
   * Remove node from routing table
   */
  removeNode(nodeId: string): boolean {
    for (const bucket of this.buckets.values()) {
      const index = bucket.nodes.findIndex(n => n.nodeId === nodeId);
      if (index !== -1) {
        const removed = bucket.nodes.splice(index, 1)[0];
        console.log(`[DHT] Removed node ${removed.aidUri}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Mark node as failed (increment failure count)
   */
  markNodeFailure(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (node) {
      node.failureCount++;
      console.log(`[DHT] Node ${node.aidUri} failure count: ${node.failureCount}/${MAX_PEER_FAILURES}`);
      
      if (node.failureCount >= MAX_PEER_FAILURES) {
        this.removeNode(nodeId);
      }
    }
  }

  /**
   * Update node RTT (round-trip time)
   */
  updateNodeRTT(nodeId: string, rtt: number): void {
    const node = this.getNode(nodeId);
    if (node) {
      // Exponential moving average
      node.rtt = node.rtt ? (node.rtt * 0.7 + rtt * 0.3) : rtt;
    }
  }

  /**
   * Get all active nodes
   */
  getAllNodes(): DHTNode[] {
    const allNodes: DHTNode[] = [];
    
    for (const bucket of this.buckets.values()) {
      for (const node of bucket.nodes) {
        if (Date.now() - node.lastSeen <= PEER_TIMEOUT &&
            node.failureCount < MAX_PEER_FAILURES) {
          allNodes.push(node);
        }
      }
    }
    
    return allNodes;
  }

  /**
   * Get routing table statistics
   */
  getStats(): {
    totalNodes: number;
    totalBuckets: number;
    nodesByBucket: Record<number, number>;
    averageBucketSize: number;
    oldestNode: { aidUri: string; age: number } | null;
    newestNode: { aidUri: string; age: number } | null;
  } {
    const allNodes = this.getAllNodes();
    const nodesByBucket: Record<number, number> = {};

    for (const [index, bucket] of this.buckets.entries()) {
      nodesByBucket[index] = bucket.nodes.filter(
        n => Date.now() - n.lastSeen <= PEER_TIMEOUT &&
             n.failureCount < MAX_PEER_FAILURES
      ).length;
    }

    const sortedByAge = [...allNodes].sort((a, b) => a.lastSeen - b.lastSeen);
    const oldest = sortedByAge[0];
    const newest = sortedByAge[sortedByAge.length - 1];

    return {
      totalNodes: allNodes.length,
      totalBuckets: this.buckets.size,
      nodesByBucket,
      averageBucketSize: allNodes.length / Math.max(this.buckets.size, 1),
      oldestNode: oldest ? {
        aidUri: oldest.aidUri,
        age: Date.now() - oldest.lastSeen,
      } : null,
      newestNode: newest ? {
        aidUri: newest.aidUri,
        age: Date.now() - newest.lastSeen,
      } : null,
    };
  }

  /**
   * Refresh buckets - ping random nodes in each bucket
   */
  private async refreshBuckets(): Promise<void> {
    const now = Date.now();
    
    for (const [index, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefresh < BUCKET_REFRESH_INTERVAL) continue;

      console.log(`[DHT] Refreshing bucket ${index}...`);

      // Remove expired nodes
      bucket.nodes = bucket.nodes.filter(node => {
        const expired = now - node.lastSeen > PEER_TIMEOUT;
        const failed = node.failureCount >= MAX_PEER_FAILURES;
        return !expired && !failed;
      });

      // Generate random ID in bucket range
      const randomId = this.generateRandomIdInBucket(index);
      
      // Lookup will populate bucket with fresh nodes
      await this.lookup(randomId);

      bucket.lastRefresh = now;
    }
  }

  /**
   * Generate random node ID within bucket range
   */
  private generateRandomIdInBucket(bucketIndex: number): string {
    const localBinary = toBinaryString(this.localNodeId);
    const prefix = localBinary.substring(0, bucketIndex);
    
    // Flip the bit at bucketIndex position
    const differentBit = localBinary[bucketIndex] === '0' ? '1' : '0';
    
    // Generate random bits for remaining positions
    const randomSuffix = Array.from({ length: NODE_ID_BITS - bucketIndex - 1 }, () =>
      Math.random() < 0.5 ? '0' : '1'
    ).join('');
    
    const randomBinary = prefix + differentBit + randomSuffix;
    
    // Convert binary to hex
    const hex = parseInt(randomBinary, 2).toString(16).padStart(40, '0');
    return hex;
  }

  /**
   * Start bucket refresh timer
   */
  private startRefreshTimer(): void {
    this.refreshTimer = setInterval(() => {
      this.refreshBuckets().catch(error => {
        console.error('[DHT] Bucket refresh error:', error);
      });
    }, BUCKET_REFRESH_INTERVAL);
  }

  /**
   * Stop bucket refresh timer
   */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Get local node ID
   */
  getLocalNodeId(): string {
    return this.localNodeId;
  }

  /**
   * Get local AID URI
   */
  getLocalAidUri(): string {
    return this.localAidUri;
  }
}

// =====================================================
// EXPORTS
// =====================================================

export const DHT = {
  create: (localAidUri: string) => new DistributedHashTable(localAidUri),
  generateNodeId,
  K_BUCKET_SIZE,
  NODE_ID_BITS,
  ALPHA,
};

export default DHT;
