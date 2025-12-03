/**
 * UAP Discovery Integration
 * Integrates UAP with existing mesh network for agent discovery
 * 
 * @module src/protocols/uap/discovery
 * @version 1.0.0
 */

import type { DIDString, AgentCapabilities } from './types';
import type { MeshNode, PeerAnnouncement } from '../../../lib/mesh/network';
import { UAPClient } from './client/uapClient';

// =====================================================
// TYPES
// =====================================================

export interface UAP_Discovery_Result {
  did: DIDString;
  endpoint: string;
  capabilities: AgentCapabilities;
  trustScore: number;
  rtt?: number;
}

export interface DiscoveryOptions {
  /** Filter by specific capabilities */
  capabilities?: string[];
  
  /** Minimum trust score (0-100) */
  minTrustScore?: number;
  
  /** Maximum RTT in ms */
  maxRtt?: number;
  
  /** Tenant ID for isolation */
  tenantId?: string;
  
  /** Maximum results to return */
  limit?: number;
}

// =====================================================
// UAP DISCOVERY
// =====================================================

/**
 * Discover UAP-capable agents in mesh network
 */
export async function discoverUAPAgents(
  options: DiscoveryOptions = {}
): Promise<UAP_Discovery_Result[]> {
  try {
    // Get or create mesh router instance
    const meshRouter = getMeshRouter();
    if (!meshRouter) {
      console.warn('[UAP Discovery] Mesh network not available');
      return [];
    }

    // Query mesh for all nodes
    const meshNodes = await queryMeshNodes(meshRouter);
    
    // Filter nodes supporting UAP protocol
    const uapNodes = meshNodes.filter(node => 
      node.capabilities.includes('uap/1.0') || 
      node.capabilities.includes('uap')
    );

    // Apply filters
    let filtered = uapNodes;
    
    if (options.capabilities && options.capabilities.length > 0) {
      filtered = filtered.filter(node =>
        options.capabilities!.some(cap => node.capabilities.includes(cap))
      );
    }
    
    if (options.minTrustScore !== undefined) {
      filtered = filtered.filter(node => node.trustScore >= options.minTrustScore!);
    }
    
    if (options.maxRtt !== undefined) {
      filtered = filtered.filter(node => 
        node.rtt === undefined || node.rtt <= options.maxRtt!
      );
    }
    
    if (options.tenantId) {
      filtered = filtered.filter(node => node.tenantId === options.tenantId);
    }

    // Sort by trust score (descending)
    filtered.sort((a, b) => b.trustScore - a.trustScore);

    // Apply limit
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    // Convert to discovery results
    const results: UAP_Discovery_Result[] = filtered.map(node => ({
      did: node.aidUri as DIDString,
      endpoint: node.endpoint,
      capabilities: parseNodeCapabilities(node),
      trustScore: node.trustScore,
      rtt: node.rtt,
    }));

    console.log(`[UAP Discovery] Found ${results.length} UAP-capable agents`);
    
    return results;
  } catch (error) {
    console.error('[UAP Discovery] Discovery failed:', error);
    return [];
  }
}

/**
 * Announce UAP capabilities to mesh network
 */
export async function announceUAPCapabilities(
  did: DIDString,
  endpoint: string,
  capabilities: AgentCapabilities,
  trustScore: number
): Promise<boolean> {
  try {
    const meshRouter = getMeshRouter();
    if (!meshRouter) {
      console.warn('[UAP Discovery] Mesh network not available for announcement');
      return false;
    }

    // Get Ed25519 public key for this agent
    let publicKey: string | undefined;
    try {
      const { SupabaseEd25519KeyStorage } = await import('../../../lib/a2a/ed25519KeyStorage');
      const keyStorage = new SupabaseEd25519KeyStorage();
      const nodeId = extractNodeIdFromDID(did);
      const keys = await keyStorage.listKeysForDomain(nodeId, false);
      if (keys && keys.length > 0) {
        // Use the most recent non-revoked key
        const activeKey = keys.find((k: any) => !k.revoked);
        if (activeKey) {
          publicKey = activeKey.publicKey;
        }
      }
    } catch (error) {
      console.warn('[UAP Discovery] Could not retrieve Ed25519 public key:', error);
    }

    const announcement: PeerAnnouncement = {
      nodeId: extractNodeIdFromDID(did),
      aidUri: did,
      endpoint,
      capabilities: [
        'uap/1.0',
        ...capabilities.capabilities,
        ...capabilities.protocols,
      ],
      trustScore,
      version: capabilities.version,
      publicKey,
      timestamp: Date.now(),
    };

    await broadcastAnnouncement(meshRouter, announcement);
    
    console.log(`[UAP Discovery] Announced capabilities for ${did}`);
    return true;
  } catch (error) {
    console.error('[UAP Discovery] Announcement failed:', error);
    return false;
  }
}

/**
 * Connect to discovered UAP agent
 */
export async function connectToUAPAgent(
  discovery: UAP_Discovery_Result,
  clientDid: DIDString,
  clientCapabilities: AgentCapabilities
): Promise<UAPClient> {
  const client = new UAPClient({
    serverUrl: discovery.endpoint,
    clientDid,
    capabilities: clientCapabilities,
  });

  await client.connect();
  
  console.log(`[UAP Discovery] Connected to ${discovery.did}`);
  
  return client;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get mesh router instance (cached)
 */
import type { MeshRouter, MeshPeer } from '../../../types/lib-extended.types';

let meshRouterCache: MeshRouter | null = null;

function getMeshRouter(): MeshRouter | null {
  if (meshRouterCache) {
    return meshRouterCache;
  }

  try {
    // Check if there's a global instance
    const globalWithRouter = global as typeof global & { __meshRouter?: MeshRouter };
    if (globalWithRouter.__meshRouter) {
      meshRouterCache = globalWithRouter.__meshRouter;
      return meshRouterCache;
    }
    
    // If not, return null (mesh network not initialized yet)
    return null;
  } catch (error) {
    console.warn('[UAP Discovery] Could not access mesh network:', error);
    return null;
  }
}

/**
 * Query mesh network for all nodes
 */
async function queryMeshNodes(meshRouter: MeshRouter): Promise<MeshNode[]> {
  try {
    // Use mesh router's query method
    if (meshRouter.queryPeers) {
      const peers = await meshRouter.queryPeers({});
      return peers.map((peer: MeshPeer) => convertPeerToMeshNode(peer));
    }
    
    // Fallback: try DHT query
    if (meshRouter.dht && typeof meshRouter.dht.getClosestPeers === 'function') {
      const peers = await meshRouter.dht.getClosestPeers();
      return peers.map((peer: MeshPeer) => convertPeerToMeshNode(peer));
    }
    
    console.warn('[UAP Discovery] Mesh router does not support node query');
    return [];
  } catch (error) {
    console.error('[UAP Discovery] Failed to query mesh nodes:', error);
    return [];
  }
}

/**
 * Broadcast announcement to mesh network
 */
async function broadcastAnnouncement(meshRouter: MeshRouter, announcement: PeerAnnouncement): Promise<void> {
  try {
    if (meshRouter.announcePeer) {
      await meshRouter.announcePeer(announcement as any);
    } else {
      console.warn('[UAP Discovery] Mesh router does not support announcements');
    }
  } catch (error) {
    console.error('[UAP Discovery] Failed to broadcast announcement:', error);
  }
}

/**
 * Parse node capabilities into AgentCapabilities format
 */
function parseNodeCapabilities(node: MeshNode): AgentCapabilities {
  const protocols = node.capabilities.filter(cap => cap.includes('/'));
  const capabilities = node.capabilities.filter(cap => !cap.includes('/'));
  
  return {
    capabilities,
    protocols,
    name: node.metadata?.agentRegistryId || 'Unknown Agent',
    version: node.metadata?.version || '1.0.0',
    endpoints: {
      message: node.endpoint,
      stream: node.endpoint.replace('https://', 'wss://').replace('http://', 'ws://'),
    },
  };
}

/**
 * Extract node ID from DID
 */
function extractNodeIdFromDID(did: DIDString): string {
  // Extract the unique part after the DID method
  const parts = did.split(':');
  return parts[parts.length - 1];
}

/**
 * Convert DHT peer to MeshNode
 */
function convertPeerToMeshNode(peer: MeshPeer): MeshNode {
  return {
    nodeId: peer.id || peer.nodeId,
    aidUri: `did:aid:${peer.id}`,
    endpoint: peer.addresses?.[0] || '',
    capabilities: (peer.protocols as any) || [],
    trustScore: 50,
    lastSeen: Date.now(),
    failureCount: 0,
    isolationMode: 'private' as const,
    metadata: peer.metadata,
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  discover: discoverUAPAgents,
  announce: announceUAPCapabilities,
  connect: connectToUAPAgent,
};
