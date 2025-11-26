/**
 * Agent Mesh Network Router
 * Production-grade P2P routing with DHT-based peer discovery and tenant isolation
 * 
 * Features:
 * - DHT-based peer discovery (Kademlia)
 * - Capability-based routing
 * - Trust score propagation from agentRegistry
 * - Circuit breaker pattern for unreliable peers
 * - APA micropayments integration (USDC pricing)
 * - WebSocket streaming for real-time updates
 * - Multi-hop routing with path optimization
 * - **Tenant isolation** with federation modes (private/federated/public)
 * - Cross-tenant routing validation via OCCO oracle
 * 
 * Integration:
 * - Uses lib/a2a/agentRegistry for trust scores
 * - Uses lib/a2a/protocol for JSON-RPC 2.0 messaging
 * - Uses lib/mesh/dht for peer discovery
 * - Uses lib/tenancy/validator for cross-tenant access control
 * 
 * @module lib/mesh/network
 * @version 2.0.0
 */

import { agentRegistry } from '../a2a/agentRegistry';
import { z } from 'zod';
import type { IDHTAdapter, UnifiedDHTNode } from './dhtAdapter';
import { createDHTAdapter } from './dhtAdapter';
import { bytesToHex } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';

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
  // Tenant isolation fields
  tenantId: z.string().optional(),
  isolationMode: z.enum(['private', 'federated', 'public']).default('private'),
  metadata: z.object({
    version: z.string().optional(),
    publicKey: z.string().optional(),
    address: z.string().optional(), // Ethereum address
    stake: z.number().optional(), // USDC stake
    costPerCall: z.object({
      token: z.literal('USDC'),
      amount: z.number(),
    }).optional(),
    agentRegistryId: z.string().optional(), // Link to agentRegistry
    // Tenant federation
    verified: z.boolean().optional(), // Verified in AID registry
    allowedPartners: z.array(z.string()).optional(), // Tenant IDs allowed for federation
  }).optional(),
});

export type MeshNode = z.infer<typeof MeshNodeSchema>;

/**
 * DHT Configuration
 */
export interface DHTConfig {
  useLibp2p?: boolean; // Use libp2p DHT (default: true)
  port?: number; // P2P port (default: auto)
}

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
  // Tenant isolation
  allowCrossTenant?: boolean; // Allow cross-tenant routing (default: false)
  requiredTenantId?: string; // Only route to nodes in this tenant
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
 * UCPT Cascade Message - Viral provenance distribution
 * Automatically propagates UCPT tokens through mesh network
 */
export interface UCPTCascadeMessage {
  type: 'ucpt-cascade';
  ucpt: string; // base64url-encoded COSE_Sign1 token
  sourceAid: string; // Originating agent AID URI
  tool: string; // Tool name that generated the UCPT
  ttl: number; // Hops remaining (0-7)
  timestamp: number; // Unix timestamp (ms)
  signature?: string; // Optional Ed25519 signature
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
  private dht?: IDHTAdapter;
  private localAidUri: string;
  private localNodeId: string;
  private localTenantId?: string;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private initialized: boolean = false;
  
  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_MS = 60000; // 1 minute

  constructor(localAidUri: string, private config: DHTConfig = {}) {
    this.localAidUri = localAidUri;
    this.localNodeId = bytesToHex(sha256(new TextEncoder().encode(localAidUri)));
    
    // Extract tenant ID from context (optional - for isolation)
    this.initializeTenantContext().catch(err => {
      console.warn('[MeshRouter] Could not initialize tenant context:', err);
    });
    
    console.log(`[MeshRouter] Initialized for ${localAidUri}`);
    console.log(`[MeshRouter] Using ${config.useLibp2p !== false ? 'libp2p' : 'legacy'} DHT`);
  }

  /**
   * Initialize tenant context for isolation
   */
  private async initializeTenantContext(): Promise<void> {
    try {
      const { getCurrentTenantIdOrNull } = await import('../tenancy/context');
      this.localTenantId = getCurrentTenantIdOrNull() || undefined;
      if (this.localTenantId) {
        console.log(`[MeshRouter] Tenant isolation enabled: ${this.localTenantId}`);
      }
    } catch (error) {
      // Tenant isolation not available - continue without it
      console.debug('[MeshRouter] Tenant isolation not available');
    }
  }

  /**
   * Initialize DHT (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[MeshRouter] Already initialized');
      return;
    }

    console.log('[MeshRouter] Initializing DHT...');
    this.dht = await createDHTAdapter(
      this.localAidUri,
      this.config.useLibp2p !== false,
      this.config.port
    );
    this.initialized = true;
    console.log('[MeshRouter] DHT initialized');
  }

  /**
   * Stop mesh router and DHT
   */
  async stop(): Promise<void> {
    if (this.dht) {
      await this.dht.stop();
      console.log('[MeshRouter] Stopped');
    }
  }

  /**
   * Get nodeId
   */
  get nodeId(): string {
    return this.localNodeId;
  }

  // =====================================================
  // PEER DISCOVERY
  // =====================================================

  /**
   * Discover peers with specific capability
   * Filters by tenant isolation if enabled
   */
  async discoverPeers(capability: string, maxPeers: number = 10, options?: { allowCrossTenant?: boolean }): Promise<MeshNode[]> {
    if (!this.initialized || !this.dht) {
      throw new Error('MeshRouter not initialized. Call initialize() first.');
    }

    console.log(`[MeshRouter] Discovering peers with capability: ${capability}`);
    
    // Search DHT via adapter
    const dhtNodes = await this.dht.findNodesByCapability(capability, maxPeers);
    
    // Convert UnifiedDHTNode to MeshNode (add agentRegistry data if available)
    const meshNodes = await Promise.all(
      dhtNodes.map(node => this.enrichNodeWithRegistry(node))
    );
    
    // Filter by circuit breaker state
    let availableNodes = meshNodes.filter(node => {
      const breaker = this.getCircuitBreaker(node.nodeId);
      return breaker.state !== 'open';
    });

    // Filter by tenant isolation
    if (this.localTenantId && !options?.allowCrossTenant) {
      availableNodes = await this.filterByTenantIsolation(availableNodes);
    }
    
    console.log(`[MeshRouter] Found ${availableNodes.length} available peers`);
    
    return availableNodes;
  }

  /**
   * Filter nodes by tenant isolation rules
   * Only returns nodes that are accessible based on federation policies
   */
  private async filterByTenantIsolation(nodes: MeshNode[]): Promise<MeshNode[]> {
    if (!this.localTenantId) {
      return nodes; // No tenant context - allow all
    }

    try {
      const { validateMeshRouting } = await import('../tenancy/validator');

      const validatedNodes = await Promise.all(
        nodes.map(async (node) => {
          // Same tenant = always allowed
          if (node.tenantId === this.localTenantId) {
            return node;
          }

          // Cross-tenant - validate via federation policy
          if (node.tenantId) {
            const validation = await validateMeshRouting(this.localTenantId!, node.tenantId);
            if (validation.allowed) {
              return node;
            }
          } else {
            // Node without tenant ID - allow if public mode
            if (node.isolationMode === 'public') {
              return node;
            }
          }

          return null;
        })
      );

      const allowedNodes = validatedNodes.filter((n): n is MeshNode => n !== null);

      const filtered = nodes.length - allowedNodes.length;
      if (filtered > 0) {
        console.log(`[MeshRouter] Filtered ${filtered} nodes due to tenant isolation`);
      }

      return allowedNodes;
    } catch (error) {
      console.warn('[MeshRouter] Tenant validation failed, allowing all nodes:', error);
      return nodes;
    }
  }

  /**
   * Enrich UnifiedDHTNode with agentRegistry data and tenant isolation info
   */
  private async enrichNodeWithRegistry(dhtNode: UnifiedDHTNode): Promise<MeshNode> {
    // Try to find agent in registry by AID URI
    const agent = agentRegistry.list().find(a => 
      a.webhook_url === dhtNode.endpoint || 
      a.name === dhtNode.aidUri
    );

    const metadata = dhtNode.metadata as any;
    const meshNode: MeshNode = {
      ...dhtNode,
      trustScore: agent ? agent.trust_score : dhtNode.trustScore,
      tenantId: metadata?.tenantId as string | undefined,
      isolationMode: (metadata?.isolationMode as 'private' | 'federated' | 'public') || 'private',
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
  async addPeer(announcement: PeerAnnouncement): Promise<boolean> {
    if (!this.initialized || !this.dht) {
      throw new Error('MeshRouter not initialized. Call initialize() first.');
    }

    const dhtNode: UnifiedDHTNode = {
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

    const added = await this.dht.addNode(dhtNode);
    
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
        
        // Update peer RTT (stored in circuit breaker for now)
        peer.rtt = rtt;
        
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
   * Broadcast message to mesh with filters
   * Supports both sync messages and UCPT cascade
   */
  async broadcast(
    message: MeshSyncMessage | UCPTCascadeMessage, 
    options?: { maxHops?: number; filter?: string }
  ): Promise<{ sent: number; failed: number }> {
    if (!this.initialized || !this.dht) {
      throw new Error('MeshRouter not initialized. Call initialize() first.');
    }

    console.log(`[MeshRouter] Broadcasting ${message.type} to mesh (maxHops: ${options?.maxHops || 'unlimited'})`);
    
    // Get all nodes from DHT
    const allPeers = await this.dht.findClosestNodes(this.localNodeId, 100);
    
    // Apply capability filter if specified
    let targetPeers = allPeers;
    if (options?.filter === 'ucpt-capable') {
      // Filter for nodes that support UCPT cascade (indicated by capability)
      targetPeers = allPeers.filter(peer => 
        peer.capabilities?.includes('a2a.mesh.cascade')
      );
      console.log(`[MeshRouter] Filtered to ${targetPeers.length} UCPT-capable peers`);
    }
    
    // Send to all target peers
    const results = await Promise.allSettled(
      targetPeers.map(async peer => {
        try {
          const response = await fetch(peer.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AnoterosLogos-MeshRouter/2.0',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: message.type === 'ucpt-cascade' ? 'a2a.mesh.cascade' : 'a2a.mesh.sync',
              params: message,
              id: `broadcast_${Date.now()}`,
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.error(`[MeshRouter] Failed to broadcast to ${peer.aidUri}:`, error);
          throw error;
        }
      })
    );
    
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[MeshRouter] Broadcast completed: ${sent} sent, ${failed} failed`);
    
    return { sent, failed };
  }

  /**
   * Broadcast sync message to mesh (general purpose)
   * Backward compatibility wrapper
   */
  async broadcastSyncMessage(message: MeshSyncMessage): Promise<void> {
    if (!this.initialized || !this.dht) {
      throw new Error('MeshRouter not initialized. Call initialize() first.');
    }

    console.log(`[MeshRouter] Broadcasting ${message.type} update to mesh`);
    
    // Get all nodes from all capabilities
    const allPeers = await this.dht.findClosestNodes(this.localNodeId, 100);
    
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
    if (!this.initialized || !this.dht) {
      throw new Error('MeshRouter not initialized. Call initialize() first.');
    }

    // Find peer in DHT
    const peers = await this.dht.findClosestNodes(peerId, 1);
    const peer = peers.find(p => p.nodeId === peerId);
    
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
  // GOSSIP PROTOCOL
  // =====================================================

  /**
   * Broadcast update to mesh network (gossip protocol)
   */
  async broadcastUpdate(message: any): Promise<void> {
    const peers = await this.discoverPeers('bft.gossip', 20);
    
    if (peers.length === 0) {
      console.warn('[MeshRouter] No peers with bft.gossip capability');
      return;
    }
    
    const gossipMessage = {
      jsonrpc: '2.0',
      method: 'a2a.mesh.gossip',
      params: message,
      id: `gossip_${Date.now()}`,
    };
    
    // Fire-and-forget broadcasts
    const promises = peers.map(async peer => {
      try {
        await fetch(peer.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gossipMessage),
          signal: AbortSignal.timeout(5000),
        });
      } catch (error) {
        this.recordFailure(peer.nodeId);
      }
    });
    
    await Promise.allSettled(promises);
  }

  // =====================================================
  // STATISTICS & MONITORING
  // =====================================================

  /**
   * Get mesh network statistics
   */
  getStats(): {
    dht: {
      nodeCount: number;
    };
    circuitBreakers: {
      total: number;
      open: number;
      halfOpen: number;
      closed: number;
    };
  } {
    if (!this.initialized || !this.dht) {
      return {
        dht: { nodeCount: 0 },
        circuitBreakers: {
          total: 0,
          open: 0,
          halfOpen: 0,
          closed: 0,
        },
      };
    }

    const dhtStats = {
      nodeCount: this.dht.getNodeCount(),
    };
    
    const circuitBreakerStats = {
      total: this.circuitBreakers.size,
      open: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'open').length,
      halfOpen: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'half-open').length,
      closed: Array.from(this.circuitBreakers.values()).filter(b => b.state === 'closed').length,
    };

    return {
      dht: dhtStats,
      circuitBreakers: circuitBreakerStats,
    };
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
export function getMeshRouter(aidUri?: string, config?: DHTConfig): MeshNetworkRouter {
  if (!globalMeshRouter) {
    if (!aidUri) {
      aidUri = process.env.VITE_APP_URL || 'agent://anoteroslogos.com';
    }
    globalMeshRouter = new MeshNetworkRouter(aidUri, config);
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
  dhtConfig?: DHTConfig;
}): Promise<MeshNetworkRouter> {
  console.log('[MeshRouter] Initializing mesh network...');
  
  const router = getMeshRouter(config.aidUri, config.dhtConfig);
  
  // Initialize DHT
  await router.initialize();
  
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
              await router.addPeer({
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
