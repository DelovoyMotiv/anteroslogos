/**
 * Mesh Network Discovery Service
 * Production-grade peer discovery with DNS TXT and HTTPS fallback
 * 
 * Features:
 * - DNS TXT record discovery (agent-id._aid.domain.com)
 * - HTTPS well-known endpoint (/.well-known/agent-id)
 * - Bootstrap node list
 * - Periodic peer refresh (5 minutes)
 * - Capability broadcasting
 * 
 * DNS TXT Format:
 * agent-id._aid.example.com. 300 IN TXT "aid=agent://example.com/agent;endpoint=https://example.com/api/a2a;capabilities=geo.audit,kg.extract;trust=85"
 * 
 * HTTPS Well-Known Format:
 * GET /.well-known/agent-id
 * {
 *   "aid": "agent://example.com/agent",
 *   "endpoint": "https://example.com/api/a2a",
 *   "capabilities": ["geo.audit", "kg.extract"],
 *   "trust_score": 85,
 *   "public_key": "ed25519:...",
 *   "version": "1.0.0"
 * }
 * 
 * @module lib/mesh/discovery
 * @version 1.0.0
 */

import type { PeerAnnouncement } from './network';
import { generateNodeId } from './dht';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Bootstrap node configuration
 */
export interface BootstrapNode {
  domain: string;
  endpoint: string;
  capabilities: string[];
}

/**
 * Discovery result
 */
export interface DiscoveryResult {
  peers: PeerAnnouncement[];
  method: 'dns' | 'https' | 'bootstrap' | 'cache';
  timestamp: number;
  errors: string[];
}

/**
 * Well-known agent-id format
 */
interface WellKnownAgentId {
  aid: string;
  endpoint: string;
  capabilities: string[];
  trust_score?: number;
  public_key?: string;
  version?: string;
  cost_per_call?: {
    token: 'USDC';
    amount: number;
  };
}

// =====================================================
// DISCOVERY SERVICE
// =====================================================

export class MeshDiscoveryService {
  private bootstrapNodes: BootstrapNode[] = [];
  private discoveredPeers: Map<string, PeerAnnouncement> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;
  
  private readonly REFRESH_INTERVAL = 86400000; // 24 hours (Vercel CRON limit)
  private readonly HTTPS_TIMEOUT = 10000; // 10 seconds
  
  // Default bootstrap nodes (production mesh seeds)
  private readonly DEFAULT_BOOTSTRAP_NODES: BootstrapNode[] = [
    {
      domain: 'bootstrap.anoteroslogos.com',
      endpoint: 'https://anoteroslogos.com/api/a2a',
      capabilities: ['geo.audit', 'kg.extract', 'citation.predict'],
    },
  ];

  constructor(bootstrapNodes?: BootstrapNode[]) {
    this.bootstrapNodes = bootstrapNodes || this.DEFAULT_BOOTSTRAP_NODES;
    console.log(`[MeshDiscovery] Initialized with ${this.bootstrapNodes.length} bootstrap nodes`);
  }

  // =====================================================
  // PEER DISCOVERY
  // =====================================================

  /**
   * Discover peers for domain (tries DNS, then HTTPS, then bootstrap)
   */
  async discoverPeers(domain: string): Promise<DiscoveryResult> {
    const errors: string[] = [];
    let peers: PeerAnnouncement[] = [];

    console.log(`[MeshDiscovery] Discovering peers for ${domain}...`);

    // Try DNS TXT first
    try {
      peers = await this.discoverViaDNS(domain);
      
      if (peers.length > 0) {
        console.log(`[MeshDiscovery] Found ${peers.length} peers via DNS`);
        this.cachePeers(peers);
        
        return {
          peers,
          method: 'dns',
          timestamp: Date.now(),
          errors,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'DNS discovery failed';
      console.warn(`[MeshDiscovery] DNS discovery failed: ${errorMsg}`);
      errors.push(errorMsg);
    }

    // Fallback to HTTPS well-known
    try {
      peers = await this.discoverViaHTTPS(domain);
      
      if (peers.length > 0) {
        console.log(`[MeshDiscovery] Found ${peers.length} peers via HTTPS`);
        this.cachePeers(peers);
        
        return {
          peers,
          method: 'https',
          timestamp: Date.now(),
          errors,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'HTTPS discovery failed';
      console.warn(`[MeshDiscovery] HTTPS discovery failed: ${errorMsg}`);
      errors.push(errorMsg);
    }

    // Fallback to bootstrap nodes
    console.log('[MeshDiscovery] Falling back to bootstrap nodes');
    peers = this.getBootstrapPeers();
    
    return {
      peers,
      method: 'bootstrap',
      timestamp: Date.now(),
      errors,
    };
  }

  // =====================================================
  // DNS TXT DISCOVERY
  // =====================================================

  /**
   * Discover via DNS TXT records
   * Format: agent-id._aid.domain.com TXT "aid=...;endpoint=...;capabilities=...;trust=..."
   */
  private async discoverViaDNS(_domain: string): Promise<PeerAnnouncement[]> {
    // In production, this would use dns.promises.resolveTxt()
    // For now, return empty (DNS not available in browser/serverless)
    
    // Node.js implementation (server-side):
    // const dns = require('dns').promises;
    // const hostname = `agent-id._aid.${domain}`;
    // const records = await dns.resolveTxt(hostname);
    // return this.parseDNSTxtRecords(records);
    
    console.log('[MeshDiscovery] DNS TXT discovery not available in this environment');
    return [];
  }

  /**
   * Parse DNS TXT records to peer announcements
   */
  private parseDNSTxtRecords(records: string[][]): PeerAnnouncement[] {
    const peers: PeerAnnouncement[] = [];

    for (const record of records) {
      try {
        const txt = record.join('');
        const parts = txt.split(';');
        const data: Record<string, string> = {};

        for (const part of parts) {
          const [key, value] = part.split('=');
          if (key && value) {
            data[key.trim()] = value.trim();
          }
        }

        if (!data.aid || !data.endpoint) {
          console.warn('[MeshDiscovery] Invalid DNS TXT record (missing aid or endpoint)');
          continue;
        }

        const announcement: PeerAnnouncement = {
          nodeId: generateNodeId(data.aid),
          aidUri: data.aid,
          endpoint: data.endpoint,
          capabilities: data.capabilities ? data.capabilities.split(',') : [],
          trustScore: data.trust ? parseInt(data.trust) : 50,
          version: data.version || '1.0.0',
          timestamp: Date.now(),
        };

        peers.push(announcement);
      } catch (error) {
        console.error('[MeshDiscovery] Failed to parse DNS TXT record:', error);
      }
    }

    return peers;
  }

  // =====================================================
  // HTTPS WELL-KNOWN DISCOVERY
  // =====================================================

  /**
   * Discover via HTTPS well-known endpoint
   * GET https://domain/.well-known/agent-id
   */
  private async discoverViaHTTPS(domain: string): Promise<PeerAnnouncement[]> {
    const url = `https://${domain}/.well-known/agent-id`;
    
    console.log(`[MeshDiscovery] Fetching ${url}...`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.HTTPS_TIMEOUT);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AnoterosLogos-MeshDiscovery/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as WellKnownAgentId;

      // Validate response
      if (!data.aid || !data.endpoint || !data.capabilities) {
        throw new Error('Invalid well-known format (missing required fields)');
      }

      const announcement: PeerAnnouncement = {
        nodeId: generateNodeId(data.aid),
        aidUri: data.aid,
        endpoint: data.endpoint,
        capabilities: data.capabilities,
        trustScore: data.trust_score || 50,
        version: data.version || '1.0.0',
        publicKey: data.public_key,
        costPerCall: data.cost_per_call,
        timestamp: Date.now(),
      };

      return [announcement];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`HTTPS discovery failed: ${error.message}`);
      }
      throw error;
    }
  }

  // =====================================================
  // BOOTSTRAP NODES
  // =====================================================

  /**
   * Get bootstrap nodes as peer announcements
   */
  private getBootstrapPeers(): PeerAnnouncement[] {
    return this.bootstrapNodes.map(node => ({
      nodeId: generateNodeId(`agent://${node.domain}`),
      aidUri: `agent://${node.domain}`,
      endpoint: node.endpoint,
      capabilities: node.capabilities,
      trustScore: 100, // Bootstrap nodes have max trust
      version: '1.0.0',
      timestamp: Date.now(),
    }));
  }

  /**
   * Add bootstrap node
   */
  addBootstrapNode(node: BootstrapNode): void {
    this.bootstrapNodes.push(node);
    console.log(`[MeshDiscovery] Added bootstrap node: ${node.domain}`);
  }

  /**
   * Remove bootstrap node
   */
  removeBootstrapNode(domain: string): void {
    const index = this.bootstrapNodes.findIndex(n => n.domain === domain);
    if (index !== -1) {
      this.bootstrapNodes.splice(index, 1);
      console.log(`[MeshDiscovery] Removed bootstrap node: ${domain}`);
    }
  }

  // =====================================================
  // PEER CACHING
  // =====================================================

  /**
   * Cache discovered peers
   */
  private cachePeers(peers: PeerAnnouncement[]): void {
    for (const peer of peers) {
      this.discoveredPeers.set(peer.nodeId, peer);
    }
  }

  /**
   * Get cached peers
   */
  getCachedPeers(): PeerAnnouncement[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Clear peer cache
   */
  clearCache(): void {
    this.discoveredPeers.clear();
    console.log('[MeshDiscovery] Peer cache cleared');
  }

  // =====================================================
  // PERIODIC REFRESH
  // =====================================================

  /**
   * Start periodic peer refresh
   */
  startPeriodicRefresh(domains: string[]): void {
    if (this.refreshInterval) {
      console.warn('[MeshDiscovery] Periodic refresh already running');
      return;
    }

    console.log(`[MeshDiscovery] Starting periodic refresh for ${domains.length} domains (every ${this.REFRESH_INTERVAL / 1000}s)`);

    this.refreshInterval = setInterval(async () => {
      console.log('[MeshDiscovery] Running periodic peer refresh...');
      
      for (const domain of domains) {
        try {
          await this.discoverPeers(domain);
        } catch (error) {
          console.error(`[MeshDiscovery] Periodic refresh failed for ${domain}:`, error);
        }
      }
    }, this.REFRESH_INTERVAL);
  }

  /**
   * Stop periodic refresh
   */
  stopPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('[MeshDiscovery] Stopped periodic refresh');
    }
  }

  // =====================================================
  // CAPABILITY BROADCASTING
  // =====================================================

  /**
   * Broadcast own capabilities to bootstrap nodes
   */
  async broadcastCapabilities(announcement: PeerAnnouncement): Promise<void> {
    console.log('[MeshDiscovery] Broadcasting capabilities to bootstrap nodes...');

    const results = await Promise.allSettled(
      this.bootstrapNodes.map(async (node) => {
        try {
          const response = await fetch(node.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'a2a.mesh.announce',
              params: {
                capabilities: announcement.capabilities,
                cost_per_call: announcement.costPerCall,
              },
              id: `broadcast_${Date.now()}`,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          console.log(`[MeshDiscovery] Broadcast to ${node.domain} successful`);
        } catch (error) {
          console.error(`[MeshDiscovery] Broadcast to ${node.domain} failed:`, error);
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[MeshDiscovery] Broadcast completed: ${successful}/${this.bootstrapNodes.length} nodes`);
  }

  // =====================================================
  // LIFECYCLE
  // =====================================================

  /**
   * Stop discovery service
   */
  stop(): void {
    console.log('[MeshDiscovery] Stopping...');
    this.stopPeriodicRefresh();
    this.clearCache();
  }

  /**
   * Get statistics
   */
  getStats(): {
    bootstrapNodes: number;
    cachedPeers: number;
    refreshActive: boolean;
  } {
    return {
      bootstrapNodes: this.bootstrapNodes.length,
      cachedPeers: this.discoveredPeers.size,
      refreshActive: this.refreshInterval !== null,
    };
  }
}

// =====================================================
// GLOBAL INSTANCE
// =====================================================

let globalDiscoveryService: MeshDiscoveryService | null = null;

/**
 * Get or create global discovery service
 */
export function getDiscoveryService(bootstrapNodes?: BootstrapNode[]): MeshDiscoveryService {
  if (!globalDiscoveryService) {
    globalDiscoveryService = new MeshDiscoveryService(bootstrapNodes);
  }
  return globalDiscoveryService;
}

// =====================================================
// EXPORTS
// =====================================================

export default MeshDiscoveryService;
