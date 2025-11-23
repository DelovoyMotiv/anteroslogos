/**
 * A2A Agent Card System - Linux Foundation A2A Protocol v1.0
 * 
 * Implements Agent Card format for discovery and capability advertisement.
 * Integrates with existing agentRegistry.ts and protocol.ts.
 * 
 * Spec: https://a2a-protocol.org/specs/agent-card
 */

import { z } from 'zod';
import { A2A_VERSION, A2AMethod } from './protocol';

// =====================================================
// AGENT CARD SCHEMA (per Linux Foundation spec)
// =====================================================

export const AgentCardSchema = z.object({
  // Core Identity
  id: z.string().regex(/^agent:\/\/[a-z0-9.-]+\/[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500),
  
  // Capabilities
  capabilities: z.array(z.string()).min(1),
  protocols: z.array(z.string()).default(['a2a/1.0', 'jsonrpc/2.0']),
  
  // Endpoints
  endpoints: z.object({
    http: z.string().url(),
    websocket: z.string().url().optional(),
    stream: z.string().url().optional(),
  }),
  
  // Authentication
  authentication: z.array(z.enum(['bearer', 'oauth2', 'api_key', 'ed25519'])),
  
  // Pricing (optional, competitive advantage)
  pricing: z.object({
    model: z.enum(['pay-per-request', 'subscription', 'free', 'hybrid']),
    currency: z.string().default('USDC'),
    base_price: z.string().optional(),
    billing_details: z.string().url().optional(),
  }).optional(),
  
  // Extensions (custom features)
  extensions: z.object({
    // Payment extension (USDC on Base L2)
    payment: z.object({
      supported: z.boolean(),
      network: z.string(),
      token: z.string(),
      wallet_address: z.string().optional(),
    }).optional(),
    
    // Verification extension (Byzantine consensus)
    verification: z.object({
      supported: z.boolean(),
      method: z.string(),
      quorum_size: z.number().optional(),
    }).optional(),
    
    // Provenance extension (future)
    provenance: z.object({
      supported: z.boolean(),
      blockchain: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // Metadata
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AgentCard = z.infer<typeof AgentCardSchema>;

// =====================================================
// AGENT CARD MANAGER
// =====================================================

export class AgentCardManager {
  private static instance: AgentCardManager;
  private card: AgentCard | null = null;
  
  private constructor() {}
  
  static getInstance(): AgentCardManager {
    if (!AgentCardManager.instance) {
      AgentCardManager.instance = new AgentCardManager();
    }
    return AgentCardManager.instance;
  }
  
  /**
   * Generate agent card from current system capabilities
   */
  generateCard(): AgentCard {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://anoteroslogos.com';
    const domain = new URL(baseUrl).hostname;
    
    this.card = {
      // Core Identity
      id: `agent://${domain}/geo-audit`,
      name: 'Anóteros Lógos GEO Audit Agent',
      version: A2A_VERSION,
      description: 'Enterprise AI knowledge infrastructure platform providing GEO audits, knowledge graph extraction, citation prediction, and blockchain-based micropayments',
      
      // Capabilities (from protocol.ts)
      capabilities: [
        A2AMethod.DISCOVER,
        A2AMethod.CAPABILITIES,
        A2AMethod.AUDIT_REQUEST,
        A2AMethod.AUDIT_STATUS,
        A2AMethod.AUDIT_RESULT,
        A2AMethod.BATCH_AUDIT,
        A2AMethod.INSIGHTS_GLOBAL,
        A2AMethod.INSIGHTS_INDUSTRY,
        A2AMethod.INSIGHTS_DOMAIN,
        A2AMethod.AUDIT_STREAM,
        A2AMethod.SUBSCRIBE,
        A2AMethod.UNSUBSCRIBE,
        A2AMethod.PING,
        A2AMethod.STATUS,
        'knowledge.graph.query',
        'citation.predict',
        'agent.mesh.discover',
        'agent.mesh.announce',
      ],
      
      // Protocols
      protocols: ['a2a/1.0', 'jsonrpc/2.0', 'mcp/2.0'],
      
      // Endpoints
      endpoints: {
        http: `${baseUrl}/api/a2a`,
        websocket: `wss://${domain}/api/a2a/ws`,
        stream: `${baseUrl}/api/a2a/stream`,
      },
      
      // Authentication methods
      authentication: ['bearer', 'api_key', 'ed25519'],
      
      // Pricing
      pricing: {
        model: 'pay-per-request',
        currency: 'USDC',
        base_price: '0.10',
        billing_details: `${baseUrl}/pricing`,
      },
      
      // Extensions (competitive advantages)
      extensions: {
        // Payment extension
        payment: {
          supported: true,
          network: 'base-l2',
          token: 'USDC',
          wallet_address: process.env.PLATFORM_WALLET_ADDRESS,
        },
        
        // Verification extension
        verification: {
          supported: true,
          method: 'pbft-consensus',
          quorum_size: 7,
        },
        
        // Provenance extension
        provenance: {
          supported: false, // Future implementation
        },
      },
      
      // Metadata
      metadata: {
        version_code: '3.2.0',
        deployment: 'vercel-static',
        language: 'typescript',
        rate_limits: {
          free: '10/min',
          basic: '60/min',
          pro: '300/min',
          enterprise: '1000/min',
        },
        features: [
          'geo-audit',
          'knowledge-graph',
          'citation-prediction',
          'byzantine-consensus',
          'usdc-micropayments',
          'agent-mesh-network',
        ],
        contact: 'https://anoteroslogos.com/contact',
        documentation: 'https://anoteroslogos.com/docs',
        status_page: 'https://anoteroslogos.com/status',
      },
    };
    
    // Validate against schema
    AgentCardSchema.parse(this.card);
    
    return this.card;
  }
  
  /**
   * Get current agent card (generate if not exists)
   */
  getCard(): AgentCard {
    if (!this.card) {
      return this.generateCard();
    }
    return this.card;
  }
  
  /**
   * Refresh agent card (re-generate)
   */
  refreshCard(): AgentCard {
    return this.generateCard();
  }
  
  /**
   * Validate external agent card
   */
  validateCard(card: unknown): { valid: boolean; errors?: string[] } {
    try {
      AgentCardSchema.parse(card);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return {
        valid: false,
        errors: ['Invalid agent card format'],
      };
    }
  }
  
  /**
   * Discover agents by capability
   * (placeholder for future registry integration)
   */
  async discoverAgents(capability: string): Promise<AgentCard[]> {
    // Future: Query distributed agent registry
    // For now, return empty array
    console.log(`Discovering agents with capability: ${capability}`);
    
    // TODO: Implement when agent registry is fully distributed
    // - Query DNS TXT records for agent discovery
    // - Query DHT for agent capabilities
    // - Query centralized registry fallback
    
    return [];
  }
  
  /**
   * Publish agent card to registry
   * (placeholder for future registry integration)
   */
  async publishCard(): Promise<{ success: boolean; message: string }> {
    const card = this.getCard();
    
    console.log(`Publishing agent card: ${card.id}`);
    
    // TODO: Implement when agent registry is fully distributed
    // - Publish to DNS TXT record
    // - Announce to DHT network
    // - Register with centralized registry
    
    return {
      success: true,
      message: 'Agent card published (local only)',
    };
  }
  
  /**
   * Check if agent supports capability
   */
  hasCapability(capability: string): boolean {
    const card = this.getCard();
    return card.capabilities.includes(capability);
  }
  
  /**
   * Get agent capabilities filtered by pattern
   */
  getCapabilities(pattern?: string): string[] {
    const card = this.getCard();
    
    if (!pattern) {
      return card.capabilities;
    }
    
    const regex = new RegExp(pattern);
    return card.capabilities.filter(cap => regex.test(cap));
  }
  
  /**
   * Get extension support info
   */
  getExtensionSupport(): {
    payment: boolean;
    verification: boolean;
    provenance: boolean;
  } {
    const card = this.getCard();
    
    return {
      payment: card.extensions?.payment?.supported || false,
      verification: card.extensions?.verification?.supported || false,
      provenance: card.extensions?.provenance?.supported || false,
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const agentCardManager = AgentCardManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate agent ID from domain
 */
export function generateAgentId(domain: string, service: string): string {
  return `agent://${domain}/${service}`;
}

/**
 * Parse agent ID into components
 */
export function parseAgentId(agentId: string): {
  domain: string;
  service: string;
} | null {
  const match = agentId.match(/^agent:\/\/([a-z0-9.-]+)\/([a-z0-9-]+)$/);
  
  if (!match) {
    return null;
  }
  
  return {
    domain: match[1],
    service: match[2],
  };
}

/**
 * Validate agent ID format
 */
export function isValidAgentId(agentId: string): boolean {
  return /^agent:\/\/[a-z0-9.-]+\/[a-z0-9-]+$/.test(agentId);
}
