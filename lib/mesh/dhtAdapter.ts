/**
 * DHT Adapter
 * 
 * Provides backward compatibility between old custom DHT and new libp2p DHT.
 * Allows MeshNetworkRouter to use either implementation transparently.
 * 
 * @module lib/mesh/dhtAdapter
 * @version 1.0.0
 */

import type { DHTNode as LegacyDHTNode } from './dht';
import type { DHTNodeLibp2p, SybilProof, Libp2pDHT } from './dhtLibp2p';
import { createSybilProof } from './dhtLibp2p';
import type { PeerId } from '@libp2p/interface';
import { peerIdFromString } from '@libp2p/peer-id';

// =====================================================
// ADAPTER TYPES
// =====================================================

/**
 * Unified DHT node (combines legacy and libp2p)
 */
export interface UnifiedDHTNode {
  nodeId: string;
  aidUri: string;
  endpoint: string;
  capabilities: string[];
  trustScore: number;
  lastSeen: number;
  rtt?: number;
  failureCount: number;
  metadata?: {
    version?: string;
    publicKey?: string;
    address?: string;
    stake?: number;
    costPerCall?: {
      token: string;
      amount: number;
    };
    agentRegistryId?: string;
  };
  // Libp2p-specific (optional)
  peerId?: PeerId;
  sybilProof?: SybilProof;
}

// =====================================================
// CONVERSION UTILITIES
// =====================================================

/**
 * Convert legacy DHTNode to UnifiedDHTNode
 */
export function legacyToUnified(node: LegacyDHTNode): UnifiedDHTNode {
  return {
    nodeId: node.nodeId,
    aidUri: node.aidUri,
    endpoint: node.endpoint,
    capabilities: node.capabilities,
    trustScore: node.trustScore,
    lastSeen: node.lastSeen,
    rtt: node.rtt,
    failureCount: node.failureCount,
    metadata: node.metadata ? {
      version: node.metadata.version,
      publicKey: node.metadata.publicKey,
      costPerCall: node.metadata.costPerCall,
    } : undefined,
  };
}

/**
 * Convert libp2p DHTNodeLibp2p to UnifiedDHTNode
 */
export function libp2pToUnified(node: DHTNodeLibp2p): UnifiedDHTNode {
  return {
    nodeId: node.nodeId,
    aidUri: node.aidUri,
    endpoint: node.endpoint,
    capabilities: node.capabilities,
    trustScore: node.trustScore,
    lastSeen: node.lastSeen,
    failureCount: 0,
    metadata: node.metadata ? {
      version: node.metadata.version,
      publicKey: node.metadata.publicKey,
      address: node.metadata.address,
      stake: node.metadata.stake,
    } : undefined,
    peerId: node.peerId,
    sybilProof: node.sybilProof,
  };
}

/**
 * Convert UnifiedDHTNode to DHTNodeLibp2p (requires peerId and sybilProof)
 */
export async function unifiedToLibp2p(
  node: UnifiedDHTNode,
  generateProof: boolean = true
): Promise<DHTNodeLibp2p> {
  // Generate peer ID if not present
  let peerId: PeerId;
  if (node.peerId) {
    peerId = node.peerId;
  } else if (node.metadata?.publicKey) {
    // Try to create from public key
    try {
      peerId = peerIdFromString(node.metadata.publicKey);
    } catch {
      // Fallback: generate from nodeId
      peerId = peerIdFromString(node.nodeId);
    }
  } else {
    // Last resort: generate from nodeId
    peerId = peerIdFromString(node.nodeId);
  }

  // Generate sybil proof if not present
  let sybilProof: SybilProof;
  if (node.sybilProof) {
    sybilProof = node.sybilProof;
  } else if (generateProof) {
    console.log(`[Adapter] Generating sybil proof for ${node.nodeId.substring(0, 16)}...`);
    sybilProof = await createSybilProof(node.nodeId);
  } else {
    // Create dummy proof (for testing only!)
    sybilProof = {
      nodeId: node.nodeId,
      nonce: 0,
      powHash: '0'.repeat(64),
      vdfProof: '0'.repeat(64),
      timestamp: Date.now(),
    };
  }

  return {
    peerId,
    nodeId: node.nodeId,
    aidUri: node.aidUri,
    endpoint: node.endpoint,
    capabilities: node.capabilities,
    trustScore: node.trustScore,
    lastSeen: node.lastSeen,
    sybilProof,
    metadata: node.metadata ? {
      version: node.metadata.version,
      publicKey: node.metadata.publicKey,
      address: node.metadata.address,
      stake: node.metadata.stake,
    } : undefined,
  };
}

// =====================================================
// DHT ADAPTER INTERFACE
// =====================================================

/**
 * Abstract DHT interface for both implementations
 */
export interface IDHTAdapter {
  /**
   * Add node to DHT
   */
  addNode(node: UnifiedDHTNode): Promise<boolean>;

  /**
   * Find nodes by capability
   */
  findNodesByCapability(capability: string, maxNodes?: number): Promise<UnifiedDHTNode[]>;

  /**
   * Find K closest nodes to target
   */
  findClosestNodes(targetId: string, k?: number): Promise<UnifiedDHTNode[]>;

  /**
   * Get node count
   */
  getNodeCount(): number;

  /**
   * Get local node ID
   */
  getNodeId(): string;

  /**
   * Stop DHT
   */
  stop(): Promise<void>;
}

// =====================================================
// LIBP2P DHT ADAPTER
// =====================================================

/**
 * Adapter for libp2p DHT
 */
export class Libp2pDHTAdapter implements IDHTAdapter {
  constructor(private dht: Libp2pDHT) {}

  async addNode(node: UnifiedDHTNode): Promise<boolean> {
    const libp2pNode = await unifiedToLibp2p(node, false); // Don't generate proof here
    return this.dht.addNode(libp2pNode);
  }

  async findNodesByCapability(capability: string, maxNodes: number = 10): Promise<UnifiedDHTNode[]> {
    const nodes = this.dht.findNodesByCapability(capability, maxNodes);
    return nodes.map(libp2pToUnified);
  }

  async findClosestNodes(targetId: string, k: number = 20): Promise<UnifiedDHTNode[]> {
    const nodes = this.dht.findClosestNodes(targetId, k);
    return nodes.map(libp2pToUnified);
  }

  getNodeCount(): number {
    return this.dht.getNodeCount();
  }

  getNodeId(): string {
    return this.dht.getNodeId();
  }

  async stop(): Promise<void> {
    await this.dht.stop();
  }

  /**
   * Get underlying libp2p DHT instance
   */
  getLibp2pDHT(): Libp2pDHT {
    return this.dht;
  }
}

// =====================================================
// LEGACY DHT ADAPTER
// =====================================================

import type { DistributedHashTable } from './dht';

/**
 * Adapter for legacy custom DHT
 */
export class LegacyDHTAdapter implements IDHTAdapter {
  constructor(private dht: DistributedHashTable) {}

  async addNode(node: UnifiedDHTNode): Promise<boolean> {
    const legacyNode: LegacyDHTNode = {
      nodeId: node.nodeId,
      aidUri: node.aidUri,
      endpoint: node.endpoint,
      capabilities: node.capabilities,
      trustScore: node.trustScore,
      lastSeen: node.lastSeen,
      rtt: node.rtt,
      failureCount: node.failureCount,
      metadata: node.metadata ? {
        version: node.metadata.version,
        publicKey: node.metadata.publicKey,
        costPerCall: node.metadata.costPerCall,
      } : undefined,
    };

    return this.dht.addNode(legacyNode);
  }

  async findNodesByCapability(capability: string, maxNodes: number = 10): Promise<UnifiedDHTNode[]> {
    const nodes = this.dht.findNodesByCapability(capability, maxNodes);
    return nodes.map(legacyToUnified);
  }

  async findClosestNodes(targetId: string, k: number = 20): Promise<UnifiedDHTNode[]> {
    const nodes = this.dht.findClosestNodes(targetId, k);
    return nodes.map(legacyToUnified);
  }

  getNodeCount(): number {
    return (this.dht as any).getNodeCount?.() || 0;
  }

  getNodeId(): string {
    return (this.dht as any).localNodeId || 'unknown';
  }

  async stop(): Promise<void> {
    // Legacy DHT doesn't have stop method
  }
}

// =====================================================
// FACTORY
// =====================================================

/**
 * Create DHT adapter based on configuration
 */
export async function createDHTAdapter(
  localAidUri: string,
  useLibp2p: boolean = true,
  port?: number
): Promise<IDHTAdapter> {
  if (useLibp2p) {
    const { createLibp2pDHT } = await import('./dhtLibp2p');
    const dht = await createLibp2pDHT(localAidUri, port);
    return new Libp2pDHTAdapter(dht);
  } else {
    const { DistributedHashTable } = await import('./dht');
    const dht = new DistributedHashTable(localAidUri);
    return new LegacyDHTAdapter(dht);
  }
}
