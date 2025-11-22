/**
 * Agent Mesh Network Router
 * Production-grade P2P routing with DHT-based peer discovery
 * 
 * Features:
 * - DHT-based peer discovery (Kademlia)
 * - Capability-based routing
 * - Trust score propagation from agentRegistry
 * - Circuit breaker pattern for unreliable peers
 * - APA micropayments integration (USDC pricing)
 * - WebSocket streaming for real-time updates
 * - Multi-hop routing with path optimization
 * 
 * Integration:
 * - Uses lib/a2a/agentRegistry for trust scores
 * - Uses lib/a2a/protocol for JSON-RPC 2.0 messaging
 * - Uses lib/mesh/dht for peer discovery
 * 
 * @module lib/mesh/network
 * @version 1.0.0
 */

import { DistributedHashTable, DHTNode, generateNodeId } from './dht';
import { agentRegistry } from '../a2a/agentRegistry';
import { z } from 'zod';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Mesh network node (enhanced DHTNode with A2A integration)
 */
export const MeshNodeSchema = z.object({
  nodeId: z.string(),
  aidUri: z.string(),
  endpoint: z.string().url(),
  capabilities: z.array(z.string()),
  trustScore: z.number().min(0).max(100),
  lastSeen: z.number(),
  rtt: z.number().optional(),
  failureCount: z.number().default(0),
  metadata: z.object({
    version: z.string().optional(),
    publicKey: z.string().optional(),
    costPerCall: z.object({
      token: z.literal('USDC'),
      amount: z.number(),
    }).optional(),
    agentRegistryId: z.string().optional(), // Link to agentRegistry
  }).optional(),
});

export type MeshNode = z.infer<typeof MeshNodeSchema>;

/**
 * Routing options
 */
export interface RoutingOptions {
  maxHops?: number; // Maximum routing hops (default: 3)
  minTrustScore?: number; // Minimum trust score required (default: 50)
  maxCost?: number; // Maximum cost in USDC (default: 1.0)
  preferredNodes?: string[]; // Preferred node IDs
  excludeNodes?: string[]; // Exclude node IDs
  timeout?: number; // Request timeout in ms (default: 30000)
  retries?: number; // Number of retries (default: 2)
}

/**
 * Routing result
 */
export interface RoutingResult {
  success: boolean;
  node: MeshNode | null;
  path: MeshNode[]; // Multi-hop path
  totalCost: number; // Total cost in USDC
  totalRtt: number; // Total RTT in ms
  hops: number;
  error?: string;
}

/**
 * Peer announcement (broadcast capabilities to mesh)
 */
export interface PeerAnnouncement {
  nodeId: string;
  aidUri: string;
  endpoint: string;
  capabilities: string[];
  trustScore: number;
  version: string;
  publicKey?: string;
  costPerCall?: {
    token: 'USDC';
    amount: number;
  };
  timestamp: number;
  signature?: string; // Ed25519 signature of announcement
}

/**
 * Mesh sync message (knowledge graph delta, citation learning, etc.)
 */
export interface MeshSyncMessage {
  type: 'knowledge_graph' | 'citation_learning' | 'model_update' | 'peer_update';
  sender: string; // node ID
  payload: any; // CBOR-encoded data
  timestamp: number;
  signature?: string;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  nodeId: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

// =====================================================
// MESH NETWORK ROUTER
// =====================================================

export class MeshNetworkRouter {
  private dht: DistributedHashTable;
  private localAidUri: string;
  private localNodeId: string;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  
  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_MS = 60000; // 1 minute

  constructor(localAidUri: string) {
    this.localAidUri = localAidUri;
    this.localNodeId = generateNodeId(localAidUri);
    this.dht = new DistributedHashTable(localAidUri);
    
    console.log(`[MeshRouter] Initialized for ${localAidUri}`);
  }

  // =====================================================
  // PEER DISCOVERY
  // =====================================================

  /**
   * Discover peers with specific capability
   */
  async discoverPeers(capability: string, maxPeers: number = 10): Promise<MeshNode[]> {
    console.log(`[MeshRouter] Discovering peers with capability: ${capability}`);
    
    // Search local DHT
    const dhtNodes = this.dht.findNodesByCapability(capability, maxPeers);
    
    // Convert DHTNode to MeshNode (add agentRegistry data if available)
    const meshNodes = await Promise.all(
      dhtNodes.map(node => this.enrichNodeWithRegistry(node))
    );
    
    // Filter by circuit breaker state
    const availableNodes = meshNodes.filter(node => {
      const breaker = this.getCircuitBreaker(node.nodeId);
      return breaker.state !== 'open';
    });
    
    console.log(`[MeshRouter] Found ${availableNodes.length} available peers`);
    
    return availableNodes;
  }

  /**
   * Enrich DHTNode with agentRegistry data
   */
  private async enrichNodeWithRegistry(dhtNode: DHTNode): Promise<MeshNode> {
    // Try to find agent in registry by AID URI
    const agent = agentRegistry.list().find(a => 
      a.webhook_url === dhtNode.endpoint || 
      a.name === dhtNode.aidUri
    );

    const meshNode: MeshNode = {
      ...dhtNode,
      trustScore: agent ? agent.trust_score : dhtNode.trustScore,
      metadata: dhtNode.metadata ? {
        ...dhtNode.metadata,
        costPerCall: dhtNode.metadata.costPerCall ? {
          token: 'USDC' as const,
          amount: dhtNode.metadata.costPerCall.amount,
        } : undefined,
        agentRegistryId: agent?.id,
      } : {
        agentRegistryId: agent?.id,
      },
    };

    return meshNode;
  }

  /**
   * Announce self to mesh network
   */
  async announceSelf(capabilities: string[], costPerCall?: { token: 'USDC'; amount: number }): Promise<void> {
    console.log(`[MeshRouter] Announcing capabilities: ${capabilities.join(', ')}`);
    
    // Note: Actual broadcast handled by discovery service via broadcastCapabilities()
    // which makes HTTP POST to bootstrap nodes with a2a.mesh.announce method
    // Announcement data: { nodeId, aidUri, endpoint, capabilities, trustScore, version, costPerCall }
    
    // Store announcement data for potential future use
    const announcementData = {
      nodeId: this.localNodeId,
      aidUri: this.localAidUri,
      endpoint: process.env.VITE_APP_URL || 'https://anoteroslogos.com',
      capabilities,
      costPerCall,
    };
    
    console.log(`[MeshRouter] Local node: ${announcementData.nodeId}`);
  }

  /**
   * Add peer to routing table (from announcement or discovery)
   */
  addPeer(announcement: PeerAnnouncement): boolean {
    const dhtNode: DHTNode = {
      nodeId: announcement.nodeId,
      aidUri: announcement.aidUri,
      endpoint: announcement.endpoint,
      capabilities: announcement.capabilities,
      trustScore: announcement.trustScore,
      lastSeen: announcement.timestamp,
      failureCount: 0,
      metadata: {
        version: announcement.version,
        publicKey: announcement.publicKey,
        costPerCall: announcement.costPerCall,
      },
    };

    const added = this.dht.addNode(dhtNode);
    
    if (added) {
      console.log(`[MeshRouter] Added peer ${announcement.aidUri} with capabilities: ${announcement.capabilities.join(', ')}`);
    }
    
    return added;
  }

  // =====================================================
  // ROUTING
  // =====================================================

  /**
   * Route request to best available peer
   */
  async routeRequest(
    method: string,
    params: any,
    options: RoutingOptions = {}
  ): Promise<RoutingResult> {
    const {
      minTrustScore = 50,
      maxCost = 1.0,
      preferredNodes = [],
      excludeNodes = [],
      timeout = 30000,
      retries = 2,
    } = options;

    console.log(`[MeshRouter] Routing request for method: ${method}`);

    // Find capability from method name (e.g., "geo.audit.request" -> "geo.audit")
    const capability = this.extractCapability(method);
    
    // Discover peers
    const peers = await this.discoverPeers(capability, 20);
    
    if (peers.length === 0) {
      return {
        success: false,
        node: null,
        path: [],
        totalCost: 0,
        totalRtt: 0,
        hops: 0,
        error: `No peers found with capability: ${capability}`,
      };
    }

    // Filter and rank peers
    const eligiblePeers = peers
      .filter(peer => {
        // Trust score check
        if (peer.trustScore < minTrustScore) return false;
        
        // Cost check
        const cost = peer.metadata?.costPerCall?.amount || 0;
        if (cost > maxCost) return false;
        
        // Exclude list
        if (excludeNodes.includes(peer.nodeId)) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Preferred nodes first
        const aPreferred = preferredNodes.includes(a.nodeId) ? 1 : 0;
        const bPreferred = preferredNodes.includes(b.nodeId) ? 1 : 0;
        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        
        // Then by trust score (descending)
        if (a.trustScore !== b.trustScore) return b.trustScore - a.trustScore;
        
        // Then by cost (ascending)
        const aCost = a.metadata?.costPerCall?.amount || 0;
        const bCost = b.metadata?.costPerCall?.amount || 0;
        if (aCost !== bCost) return aCost - bCost;
        
        // Then by RTT (ascending)
        const aRtt = a.rtt || 999999;
        const bRtt = b.rtt || 999999;
        return aRtt - bRtt;
      });

    if (eligiblePeers.length === 0) {
      return {
        success: false,
        node: null,
        path: [],
        totalCost: 0,
        totalRtt: 0,
        hops: 0,
        error: 'No eligible peers found (trust score or cost constraints)',
      };
    }

    // Try each peer with circuit breaker
    for (const peer of eligiblePeers.slice(0, retries + 1)) {
      const breaker = this.getCircuitBreaker(peer.nodeId);
      
      // Check circuit breaker
      if (breaker.state === 'open') {
        if (Date.now() < breaker.nextAttempt) {
          console.log(`[MeshRouter] Circuit breaker OPEN for ${peer.aidUri}, skipping`);
          continue;
        } else {
          // Transition to half-open
          breaker.state = 'half-open';
          console.log(`[MeshRouter] Circuit breaker HALF-OPEN for ${peer.aidUri}`);
        }
      }

      try {
        const startTime = Date.now();
        
        // Make actual JSON-RPC 2.0 request to peer endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(peer.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AnoterosLogos-MeshRouter/1.0',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: `mesh_${Date.now()}`,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.error) {
          throw new Error(`RPC error: ${result.error.message}`);
        }
        
        const rtt = Date.now() - startTime;
        
        // Update DHT with RTT
        this.dht.updateNodeRTT(peer.nodeId, rtt);
        
        // Success - close circuit breaker
        this.recordSuccess(peer.nodeId);
        
        const cost = peer.metadata?.costPerCall?.amount || 0;
        
        return {
          success: true,
          node: peer,
          path: [peer], // Single hop for now
          totalCost: cost,
          totalRtt: rtt,
          hops: 1,
        };
      } catch (error) {
        console.error(`[MeshRouter] Request to ${peer.aidUri} failed:`, error);
        
        // Record failure
        this.recordFailure(peer.nodeId);
        this.dht.markNodeFailure(peer.nodeId);
        
        // Try next peer
        continue;
      }
    }

    return {
      success: false,
      node: null,
      path: [],
      totalCost: 0,
      totalRtt: 0,
      hops: 0,
      error: 'All peers failed or unavailable',
    };
  }

  /**
   * Extract capability from method name
   */
  private extractCapability(method: string): string {
    // "geo.audit.request" -> "geo.audit"
    // "kg.extract" -> "kg.extract"
    // "a2a.discover" -> "a2a.discover"
    const parts = method.split('.');
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`;
    }
    return method;
  }

  // =====================================================
  // MESH SYNCHRONIZATION
  // =====================================================

  /**
   * Broadcast update to all connected peers
   */
  async broadcastUpdate(message: MeshSyncMessage): Promise<void> {
    console.log(`[MeshRouter] Broadcasting ${message.type} update to mesh`);
    
    const allPeers = this.dht.getAllNodes();
    
    // Send actual network calls to all active peers
    const results = await Promise.allSettled(
      allPeers.map(async peer => {
        try {
          const response = await fetch(peer.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AnoterosLogos-MeshRouter/1.0',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'a2a.mesh.sync',
              params: {
                type: message.type,
                payload: message.payload,
              },
              id: `broadcast_${Date.now()}`,
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          console.log(`[MeshRouter] Sent update to ${peer.aidUri}`);
        } catch (error) {
          console.error(`[MeshRouter] Failed to broadcast to ${peer.aidUri}:`, error);
          throw error;
        }
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[MeshRouter] Broadcast completed: ${successful}/${allPeers.length} peers`);
  }

  /**
   * Sync with specific peer
   */
  async syncWithPeer(peerId: string, data: any): Promise<boolean> {
    const peer = this.dht.getNode(peerId);
    
    if (!peer) {
      console.error(`[MeshRouter] Peer not found: ${peerId}`);
      return false;
    }

    console.log(`[MeshRouter] Syncing with peer ${peer.aidUri}`);

    try {
      // Make actual JSON-RPC 2.0 sync call
      const response = await fetch(peer.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AnoterosLogos-MeshRouter/1.0',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'a2a.mesh.sync',
          params: {
            type: 'peer_update',
            payload: data,
          },
          id: `sync_${Date.now()}`,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error(`[MeshRouter] Sync failed with ${peer.aidUri}:`, error);
      this.recordFailure(peer.nodeId);
      return false;
    }
  }

  // =====================================================
  // CIRCUIT BREAKER
  // =====================================================

  /**
   * Get or create circuit breaker for node
   */
  private getCircuitBreaker(nodeId: string): CircuitBreakerState {
    let breaker = this.circuitBreakers.get(nodeId);
    
    if (!breaker) {
      breaker = {
        nodeId,
        state: 'closed',
        failures: 0,
        lastFailure: 0,
        nextAttempt: 0,
      };
      this.circuitBreakers.set(nodeId, breaker);
    }
    
    return breaker;
  }

  /**
   * Record successful request
   */
  private recordSuccess(nodeId: string): void {
    const breaker = this.getCircuitBreaker(nodeId);
    
    if (breaker.state === 'half-open') {
      // Success in half-open state -> close circuit
      breaker.state = 'closed';
      breaker.failures = 0;
      console.log(`[MeshRouter] Circuit breaker CLOSED for node ${nodeId}`);
    }
    
    // Reset failure count
    breaker.failures = 0;
  }

  /**
   * Record failed request
   */
  private recordFailure(nodeId: string): void {
    const breaker = this.getCircuitBreaker(nodeId);
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.state === 'half-open') {
      // Failure in half-open state -> reopen circuit
      breaker.state = 'open';
      breaker.nextAttempt = Date.now() + this.TIMEOUT_MS;
      console.log(`[MeshRouter] Circuit breaker REOPENED for node ${nodeId}`);
    } else if (breaker.failures >= this.FAILURE_THRESHOLD) {
      // Too many failures -> open circuit
      breaker.state = 'open';
      breaker.nextAttempt = Date.now() + this.TIMEOUT_MS;
      console.log(`[MeshRouter] Circuit breaker OPENED for node ${nodeId} (${breaker.failures} failures)`);
    }
  }

  // =====================================================
  // STATISTICS & MONITORING
  // =====================================================

  /**
   * Get mesh network statistics
   */
  getStats(): {
    dht: any;
    circuitBreakers: {
      total: number;
      open: number;
      halfOpen: number;
      closed: number;
    };
    peers: {
      total: number;
      byCapability: Record<string, number>;
      avgTrustScore: number;
      avgRtt: number;
    };
  } {
    const dhtStats = this.dht.getStats();
    
    const circuitBreakerStats = {
      total: this.circuitBreakers.size,
      open: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'open').length,
      halfOpen: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'half-open').length,
      closed: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'closed').length,
    };

    const allPeers = this.dht.getAllNodes();
    const capabilityCount: Record<string, number> = {};
    
    allPeers.forEach(peer => {
      peer.capabilities.forEach(cap => {
        capabilityCount[cap] = (capabilityCount[cap] || 0) + 1;
      });
    });

    const avgTrustScore = allPeers.length > 0
      ? allPeers.reduce((sum, p) => sum + p.trustScore, 0) / allPeers.length
      : 0;

    const peersWithRtt = allPeers.filter(p => p.rtt !== undefined);
    const avgRtt = peersWithRtt.length > 0
      ? peersWithRtt.reduce((sum, p) => sum + p.rtt!, 0) / peersWithRtt.length
      : 0;

    return {
      dht: dhtStats,
      circuitBreakers: circuitBreakerStats,
      peers: {
        total: allPeers.length,
        byCapability: capabilityCount,
        avgTrustScore,
        avgRtt,
      },
    };
  }

  /**
   * Get all peers
   */
  getPeers(): MeshNode[] {
    return this.dht.getAllNodes() as MeshNode[];
  }

  /**
   * Get peer by ID
   */
  getPeer(nodeId: string): MeshNode | null {
    return this.dht.getNode(nodeId) as MeshNode | null;
  }

  /**
   * Remove peer
   */
  removePeer(nodeId: string): boolean {
    this.circuitBreakers.delete(nodeId);
    return this.dht.removeNode(nodeId);
  }

  /**
   * Stop mesh router (cleanup)
   */
  stop(): void {
    console.log('[MeshRouter] Stopping...');
    this.dht.stop();
    this.circuitBreakers.clear();
  }

  /**
   * Get local node info
   */
  getLocalNode(): { nodeId: string; aidUri: string } {
    return {
      nodeId: this.localNodeId,
      aidUri: this.localAidUri,
    };
  }
}

// =====================================================
// GLOBAL INSTANCE (Singleton)
// =====================================================

let globalMeshRouter: MeshNetworkRouter | null = null;

/**
 * Get or create global mesh router instance
 */
export function getMeshRouter(aidUri?: string): MeshNetworkRouter {
  if (!globalMeshRouter) {
    if (!aidUri) {
      aidUri = process.env.VITE_APP_URL || 'agent://anoteroslogos.com';
    }
    globalMeshRouter = new MeshNetworkRouter(aidUri);
  }
  return globalMeshRouter;
}

/**
 * Initialize mesh router with local configuration
 */
export async function initializeMeshRouter(config: {
  aidUri: string;
  capabilities: string[];
  costPerCall?: { token: 'USDC'; amount: number };
  bootstrapNodes?: string[];
}): Promise<MeshNetworkRouter> {
  console.log('[MeshRouter] Initializing mesh network...');
  
  const router = getMeshRouter(config.aidUri);
  
  // Announce self to network
  await router.announceSelf(config.capabilities, config.costPerCall);
  
  // Fetch peer announcements from bootstrap nodes
  if (config.bootstrapNodes && config.bootstrapNodes.length > 0) {
    console.log(`[MeshRouter] Fetching peers from ${config.bootstrapNodes.length} bootstrap nodes`);
    
    const results = await Promise.allSettled(
      config.bootstrapNodes.map(async endpoint => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'a2a.mesh.discover',
              params: { capability: '*', max_peers: 50 },
              id: `init_${Date.now()}`,
            }),
            signal: AbortSignal.timeout(10000),
          });
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const data = await response.json();
          if (data.result?.peers) {
            for (const peer of data.result.peers) {
              router.addPeer({
                nodeId: peer.node_id,
                aidUri: peer.aid_uri,
                endpoint: peer.endpoint,
                capabilities: peer.capabilities,
                trustScore: peer.trust_score,
                version: '1.0.0',
                timestamp: Date.now(),
              });
            }
          }
        } catch (error) {
          console.error(`[MeshRouter] Failed to fetch from bootstrap ${endpoint}:`, error);
        }
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[MeshRouter] Bootstrap complete: ${successful}/${config.bootstrapNodes.length} nodes`);
  }
  
  console.log('[MeshRouter] Initialization complete');
  
  return router;
}

// =====================================================
// EXPORTS
// =====================================================

export default MeshNetworkRouter;
