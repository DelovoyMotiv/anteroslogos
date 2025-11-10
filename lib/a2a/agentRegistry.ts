/**
 * A2A Agent Registry - Enterprise-Level Agent Management
 * Tracks registered agents, their capabilities, and authentication state
 * Production-ready with Redis-compatible interface
 */

import type { A2AAgentInfo } from './protocol';

// =====================================================
// TYPES
// =====================================================

export interface RegisteredAgent extends A2AAgentInfo {
  id: string;
  api_key?: string;
  status: 'active' | 'inactive' | 'banned' | 'pending_verification';
  registered_at: string;
  last_seen_at?: string;
  total_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
  trust_score: number; // 0-100, based on behavior
  metadata: {
    ip_addresses: string[];
    user_agents: string[];
    error_rate: number;
    uptime_percentage: number;
  };
  rate_limit_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  webhook_url?: string;
  notification_email?: string;
}

export interface AgentRegistrationRequest {
  name: string;
  version?: string;
  type: 'search' | 'assistant' | 'crawler' | 'analytics' | 'other';
  capabilities: string[];
  contact?: string;
  webhook_url?: string;
  notification_email?: string;
  tier?: 'free' | 'basic' | 'pro' | 'enterprise';
}

export interface AgentStats {
  total_agents: number;
  active_agents: number;
  agents_by_type: Record<string, number>;
  agents_by_tier: Record<string, number>;
  top_agents: Array<{
    id: string;
    name: string;
    total_requests: number;
    trust_score: number;
  }>;
}

// =====================================================
// AGENT REGISTRY STORAGE
// =====================================================

class AgentRegistryStorage {
  private agents: Map<string, RegisteredAgent> = new Map();
  private apiKeyIndex: Map<string, string> = new Map(); // api_key -> agent_id
  private nameIndex: Map<string, string> = new Map(); // agent_name -> agent_id
  
  /**
   * Register new agent
   */
  register(request: AgentRegistrationRequest): RegisteredAgent {
    const id = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const apiKey = this.generateApiKey(request.tier || 'free');
    
    const agent: RegisteredAgent = {
      id,
      name: request.name,
      version: request.version,
      type: request.type,
      capabilities: request.capabilities,
      contact: request.contact,
      webhook_url: request.webhook_url,
      notification_email: request.notification_email,
      api_key: apiKey,
      status: 'pending_verification',
      registered_at: new Date().toISOString(),
      total_requests: 0,
      failed_requests: 0,
      avg_response_time_ms: 0,
      trust_score: 50, // Start at neutral
      metadata: {
        ip_addresses: [],
        user_agents: [],
        error_rate: 0,
        uptime_percentage: 100,
      },
      rate_limit_tier: request.tier || 'free',
    };
    
    this.agents.set(id, agent);
    this.apiKeyIndex.set(apiKey, id);
    this.nameIndex.set(request.name.toLowerCase(), id);
    
    console.log(`✅ Registered agent: ${request.name} (${id})`);
    
    return agent;
  }
  
  /**
   * Generate API key
   */
  private generateApiKey(tier: string): string {
    const randomPart = Array.from({ length: 32 }, () =>
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(
        Math.floor(Math.random() * 62)
      )
    ).join('');
    
    return `sk_${tier}_${randomPart}`;
  }
  
  /**
   * Get agent by ID
   */
  getById(id: string): RegisteredAgent | null {
    return this.agents.get(id) || null;
  }
  
  /**
   * Get agent by API key
   */
  getByApiKey(apiKey: string): RegisteredAgent | null {
    const agentId = this.apiKeyIndex.get(apiKey);
    if (!agentId) return null;
    return this.agents.get(agentId) || null;
  }
  
  /**
   * Get agent by name
   */
  getByName(name: string): RegisteredAgent | null {
    const agentId = this.nameIndex.get(name.toLowerCase());
    if (!agentId) return null;
    return this.agents.get(agentId) || null;
  }
  
  /**
   * Update agent
   */
  update(id: string, updates: Partial<RegisteredAgent>): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    
    Object.assign(agent, updates);
    this.agents.set(id, agent);
    
    return true;
  }
  
  /**
   * Record agent activity
   */
  recordActivity(
    agentId: string,
    data: {
      ip_address?: string;
      user_agent?: string;
      response_time_ms?: number;
      success: boolean;
    }
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    // Update last seen
    agent.last_seen_at = new Date().toISOString();
    
    // Update request counters
    agent.total_requests++;
    if (!data.success) {
      agent.failed_requests++;
    }
    
    // Update metadata
    if (data.ip_address && !agent.metadata.ip_addresses.includes(data.ip_address)) {
      agent.metadata.ip_addresses.push(data.ip_address);
      // Keep only last 10 IPs
      if (agent.metadata.ip_addresses.length > 10) {
        agent.metadata.ip_addresses.shift();
      }
    }
    
    if (data.user_agent && !agent.metadata.user_agents.includes(data.user_agent)) {
      agent.metadata.user_agents.push(data.user_agent);
      // Keep only last 5 user agents
      if (agent.metadata.user_agents.length > 5) {
        agent.metadata.user_agents.shift();
      }
    }
    
    // Update avg response time
    if (data.response_time_ms) {
      agent.avg_response_time_ms =
        (agent.avg_response_time_ms * (agent.total_requests - 1) + data.response_time_ms) /
        agent.total_requests;
    }
    
    // Update error rate
    agent.metadata.error_rate = agent.failed_requests / agent.total_requests;
    
    // Update trust score
    agent.trust_score = this.calculateTrustScore(agent);
    
    this.agents.set(agentId, agent);
  }
  
  /**
   * Calculate trust score (0-100)
   */
  private calculateTrustScore(agent: RegisteredAgent): number {
    let score = 50; // Base score
    
    // Successful requests increase trust
    if (agent.total_requests > 0) {
      const successRate = 1 - agent.metadata.error_rate;
      score += successRate * 30; // Up to +30 for 100% success
    }
    
    // Response time affects trust
    if (agent.avg_response_time_ms < 5000) {
      score += 10; // Fast responses
    } else if (agent.avg_response_time_ms > 30000) {
      score -= 10; // Slow responses
    }
    
    // Number of successful requests
    const successfulRequests = agent.total_requests - agent.failed_requests;
    if (successfulRequests > 1000) {
      score += 10; // Proven track record
    } else if (successfulRequests > 100) {
      score += 5;
    }
    
    // Penalize high error rate
    if (agent.metadata.error_rate > 0.5) {
      score -= 20; // More than 50% errors
    } else if (agent.metadata.error_rate > 0.2) {
      score -= 10; // More than 20% errors
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Activate agent
   */
  activate(id: string): boolean {
    return this.update(id, { status: 'active' });
  }
  
  /**
   * Deactivate agent
   */
  deactivate(id: string): boolean {
    return this.update(id, { status: 'inactive' });
  }
  
  /**
   * Ban agent
   */
  ban(id: string, reason?: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    
    agent.status = 'banned';
    console.warn(`⛔ Banned agent: ${agent.name} (${id})${reason ? ` - Reason: ${reason}` : ''}`);
    
    return true;
  }
  
  /**
   * List all agents
   */
  list(filters?: {
    status?: RegisteredAgent['status'];
    type?: RegisteredAgent['type'];
    tier?: RegisteredAgent['rate_limit_tier'];
  }): RegisteredAgent[] {
    let agents = Array.from(this.agents.values());
    
    if (filters?.status) {
      agents = agents.filter(a => a.status === filters.status);
    }
    
    if (filters?.type) {
      agents = agents.filter(a => a.type === filters.type);
    }
    
    if (filters?.tier) {
      agents = agents.filter(a => a.rate_limit_tier === filters.tier);
    }
    
    return agents;
  }
  
  /**
   * Get registry statistics
   */
  getStats(): AgentStats {
    const agents = Array.from(this.agents.values());
    
    const agentsByType: Record<string, number> = {};
    const agentsByTier: Record<string, number> = {};
    
    agents.forEach(agent => {
      agentsByType[agent.type] = (agentsByType[agent.type] || 0) + 1;
      agentsByTier[agent.rate_limit_tier] = (agentsByTier[agent.rate_limit_tier] || 0) + 1;
    });
    
    const topAgents = agents
      .sort((a, b) => b.total_requests - a.total_requests)
      .slice(0, 10)
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        total_requests: agent.total_requests,
        trust_score: agent.trust_score,
      }));
    
    return {
      total_agents: agents.length,
      active_agents: agents.filter(a => a.status === 'active').length,
      agents_by_type: agentsByType,
      agents_by_tier: agentsByTier,
      top_agents: topAgents,
    };
  }
  
  /**
   * Validate API key and check if agent is allowed to make requests
   */
  validateApiKey(apiKey: string): {
    valid: boolean;
    agent?: RegisteredAgent;
    reason?: string;
  } {
    const agent = this.getByApiKey(apiKey);
    
    if (!agent) {
      return { valid: false, reason: 'Invalid API key' };
    }
    
    if (agent.status === 'banned') {
      return { valid: false, agent, reason: 'Agent is banned' };
    }
    
    if (agent.status === 'inactive') {
      return { valid: false, agent, reason: 'Agent is inactive' };
    }
    
    if (agent.status === 'pending_verification') {
      return { valid: false, agent, reason: 'Agent is pending verification' };
    }
    
    if (agent.trust_score < 20) {
      return { valid: false, agent, reason: 'Trust score too low' };
    }
    
    return { valid: true, agent };
  }
}

// Global agent registry
export const agentRegistry = new AgentRegistryStorage();

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Register new agent
 */
export function registerAgent(request: AgentRegistrationRequest): RegisteredAgent {
  return agentRegistry.register(request);
}

/**
 * Get agent by API key
 */
export function getAgentByApiKey(apiKey: string): RegisteredAgent | null {
  return agentRegistry.getByApiKey(apiKey);
}

/**
 * Get agent by name
 */
export function getAgentByName(name: string): RegisteredAgent | null {
  return agentRegistry.getByName(name);
}

/**
 * Validate API key
 */
export function validateApiKey(apiKey: string): {
  valid: boolean;
  agent?: RegisteredAgent;
  reason?: string;
} {
  return agentRegistry.validateApiKey(apiKey);
}

/**
 * Record agent activity
 */
export function recordAgentActivity(
  agentId: string,
  data: {
    ip_address?: string;
    user_agent?: string;
    response_time_ms?: number;
    success: boolean;
  }
): void {
  agentRegistry.recordActivity(agentId, data);
}

/**
 * Get agent registry stats
 */
export function getAgentRegistryStats(): AgentStats {
  return agentRegistry.getStats();
}

/**
 * List agents
 */
export function listAgents(filters?: {
  status?: RegisteredAgent['status'];
  type?: RegisteredAgent['type'];
  tier?: RegisteredAgent['rate_limit_tier'];
}): RegisteredAgent[] {
  return agentRegistry.list(filters);
}
