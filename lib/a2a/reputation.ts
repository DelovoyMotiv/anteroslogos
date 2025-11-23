/**
 * A2A Agent Reputation System - Linux Foundation A2A Protocol v1.0
 * 
 * Tracks agent performance and calculates reputation scores
 * Based on task success rate, cost accuracy, response time, and consensus verification
 * 
 * Reputation Model: Weighted scoring across multiple dimensions
 */

import { z } from 'zod';
import { Task, TaskStatus } from './taskManager';
import { AgentCard } from './agentCard';

// =====================================================
// REPUTATION TYPES
// =====================================================

export interface AgentReputationMetrics {
  agent_id: string;
  
  // Success Metrics (40% weight)
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  success_rate: number; // 0-100
  
  // Cost Accuracy (25% weight)
  total_cost_estimates: number;
  cost_variance_sum: number; // Sum of (actual - estimated) / estimated
  cost_accuracy: number; // 0-100 (lower variance = higher accuracy)
  
  // Response Time (20% weight)
  total_response_times_ms: number;
  avg_response_time_ms: number;
  response_time_score: number; // 0-100 (faster = higher)
  
  // Consensus Verification (15% weight)
  consensus_tasks: number;
  consensus_passed: number;
  consensus_success_rate: number; // 0-100
  
  // Overall Reputation Score (weighted average)
  reputation_score: number; // 0-100
  reputation_grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Metadata
  first_task_at?: string;
  last_task_at?: string;
  last_updated_at: string;
}

export const ReputationMetricsSchema = z.object({
  agent_id: z.string(),
  total_tasks: z.number(),
  completed_tasks: z.number(),
  failed_tasks: z.number(),
  success_rate: z.number(),
  total_cost_estimates: z.number(),
  cost_variance_sum: z.number(),
  cost_accuracy: z.number(),
  total_response_times_ms: z.number(),
  avg_response_time_ms: z.number(),
  response_time_score: z.number(),
  consensus_tasks: z.number(),
  consensus_passed: z.number(),
  consensus_success_rate: z.number(),
  reputation_score: z.number(),
  reputation_grade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']),
  first_task_at: z.string().datetime().optional(),
  last_task_at: z.string().datetime().optional(),
  last_updated_at: z.string().datetime(),
});

// =====================================================
// REPUTATION WEIGHTS
// =====================================================

const REPUTATION_WEIGHTS = {
  SUCCESS_RATE: 0.40,      // 40%
  COST_ACCURACY: 0.25,     // 25%
  RESPONSE_TIME: 0.20,     // 20%
  CONSENSUS: 0.15,         // 15%
};

// Response time thresholds (ms)
const RESPONSE_TIME_THRESHOLDS = {
  EXCELLENT: 1000,   // < 1s = 100 score
  GOOD: 5000,        // < 5s = 80 score
  ACCEPTABLE: 15000, // < 15s = 60 score
  SLOW: 30000,       // < 30s = 40 score
  POOR: 60000,       // < 60s = 20 score
  // > 60s = 0 score
};

// =====================================================
// REPUTATION MANAGER
// =====================================================

export class ReputationManager {
  private static instance: ReputationManager;
  private reputations: Map<string, AgentReputationMetrics> = new Map();
  
  private constructor() {}
  
  static getInstance(): ReputationManager {
    if (!ReputationManager.instance) {
      ReputationManager.instance = new ReputationManager();
    }
    return ReputationManager.instance;
  }
  
  /**
   * Get or initialize agent reputation
   */
  getReputation(agentId: string): AgentReputationMetrics {
    let reputation = this.reputations.get(agentId);
    
    if (!reputation) {
      reputation = this.initializeReputation(agentId);
      this.reputations.set(agentId, reputation);
    }
    
    return reputation;
  }
  
  /**
   * Initialize new agent reputation
   */
  private initializeReputation(agentId: string): AgentReputationMetrics {
    return {
      agent_id: agentId,
      total_tasks: 0,
      completed_tasks: 0,
      failed_tasks: 0,
      success_rate: 0,
      total_cost_estimates: 0,
      cost_variance_sum: 0,
      cost_accuracy: 100, // Start at perfect
      total_response_times_ms: 0,
      avg_response_time_ms: 0,
      response_time_score: 100, // Start at perfect
      consensus_tasks: 0,
      consensus_passed: 0,
      consensus_success_rate: 100, // Start at perfect
      reputation_score: 100, // Start at perfect (benefit of doubt)
      reputation_grade: 'S',
      last_updated_at: new Date().toISOString(),
    };
  }
  
  /**
   * Record task completion and update reputation
   */
  recordTaskCompletion(task: Task): AgentReputationMetrics {
    const reputation = this.getReputation(task.agent_id);
    const now = new Date().toISOString();
    
    // Update task counters
    reputation.total_tasks++;
    
    if (task.status === TaskStatus.COMPLETED) {
      reputation.completed_tasks++;
    } else if (task.status === TaskStatus.FAILED) {
      reputation.failed_tasks++;
    }
    
    // Update timestamps
    if (!reputation.first_task_at) {
      reputation.first_task_at = task.created_at;
    }
    reputation.last_task_at = task.completed_at || now;
    reputation.last_updated_at = now;
    
    // Calculate success rate
    reputation.success_rate = (reputation.completed_tasks / reputation.total_tasks) * 100;
    
    // Update cost accuracy (if cost info available)
    if (task.cost && task.cost.total_cost > 0) {
      reputation.total_cost_estimates++;
      
      // Calculate variance if we have estimated vs actual cost
      // For now, assume cost is accurate (no variance tracking yet)
      // TODO: Implement cost estimation tracking
      
      // Cost accuracy remains high unless we detect variance
      reputation.cost_accuracy = 100 - (reputation.cost_variance_sum / reputation.total_cost_estimates);
      reputation.cost_accuracy = Math.max(0, Math.min(100, reputation.cost_accuracy));
    }
    
    // Update response time
    if (task.started_at && task.completed_at) {
      const responseTime = new Date(task.completed_at).getTime() - new Date(task.started_at).getTime();
      reputation.total_response_times_ms += responseTime;
      reputation.avg_response_time_ms = Math.round(reputation.total_response_times_ms / reputation.total_tasks);
      
      // Calculate response time score
      reputation.response_time_score = this.calculateResponseTimeScore(reputation.avg_response_time_ms);
    }
    
    // Update consensus metrics (if consensus extension used)
    if (task.extensions?.consensus) {
      reputation.consensus_tasks++;
      
      if (task.extensions.consensus.achieved) {
        reputation.consensus_passed++;
      }
      
      reputation.consensus_success_rate = (reputation.consensus_passed / reputation.consensus_tasks) * 100;
    }
    
    // Calculate overall reputation score
    reputation.reputation_score = this.calculateOverallScore(reputation);
    reputation.reputation_grade = this.getReputationGrade(reputation.reputation_score);
    
    this.reputations.set(task.agent_id, reputation);
    
    return reputation;
  }
  
  /**
   * Calculate response time score (0-100)
   */
  private calculateResponseTimeScore(avgResponseTimeMs: number): number {
    if (avgResponseTimeMs <= RESPONSE_TIME_THRESHOLDS.EXCELLENT) {
      return 100;
    } else if (avgResponseTimeMs <= RESPONSE_TIME_THRESHOLDS.GOOD) {
      return 80;
    } else if (avgResponseTimeMs <= RESPONSE_TIME_THRESHOLDS.ACCEPTABLE) {
      return 60;
    } else if (avgResponseTimeMs <= RESPONSE_TIME_THRESHOLDS.SLOW) {
      return 40;
    } else if (avgResponseTimeMs <= RESPONSE_TIME_THRESHOLDS.POOR) {
      return 20;
    } else {
      return 0;
    }
  }
  
  /**
   * Calculate overall reputation score (weighted average)
   */
  private calculateOverallScore(metrics: AgentReputationMetrics): number {
    const score = 
      (metrics.success_rate * REPUTATION_WEIGHTS.SUCCESS_RATE) +
      (metrics.cost_accuracy * REPUTATION_WEIGHTS.COST_ACCURACY) +
      (metrics.response_time_score * REPUTATION_WEIGHTS.RESPONSE_TIME) +
      (metrics.consensus_success_rate * REPUTATION_WEIGHTS.CONSENSUS);
    
    return parseFloat(score.toFixed(2));
  }
  
  /**
   * Get reputation grade
   */
  private getReputationGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'S';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 55) return 'D';
    return 'F';
  }
  
  /**
   * Get top agents by reputation
   */
  getTopAgents(limit: number = 10): AgentReputationMetrics[] {
    return Array.from(this.reputations.values())
      .filter(r => r.total_tasks >= 5) // Minimum 5 tasks for ranking
      .sort((a, b) => b.reputation_score - a.reputation_score)
      .slice(0, limit);
  }
  
  /**
   * Get agents by grade
   */
  getAgentsByGrade(grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'): AgentReputationMetrics[] {
    return Array.from(this.reputations.values())
      .filter(r => r.reputation_grade === grade)
      .sort((a, b) => b.reputation_score - a.reputation_score);
  }
  
  /**
   * Compare two agents
   */
  compareAgents(agentId1: string, agentId2: string): {
    agent1: AgentReputationMetrics;
    agent2: AgentReputationMetrics;
    winner: string;
    difference: number;
  } {
    const agent1 = this.getReputation(agentId1);
    const agent2 = this.getReputation(agentId2);
    
    const difference = Math.abs(agent1.reputation_score - agent2.reputation_score);
    const winner = agent1.reputation_score > agent2.reputation_score ? agentId1 : agentId2;
    
    return {
      agent1,
      agent2,
      winner,
      difference: parseFloat(difference.toFixed(2)),
    };
  }
  
  /**
   * Get reputation statistics
   */
  getStatistics(): {
    total_agents: number;
    agents_by_grade: Record<string, number>;
    average_score: number;
    average_success_rate: number;
    average_response_time_ms: number;
  } {
    const reputations = Array.from(this.reputations.values());
    
    const agentsByGrade = {
      S: reputations.filter(r => r.reputation_grade === 'S').length,
      A: reputations.filter(r => r.reputation_grade === 'A').length,
      B: reputations.filter(r => r.reputation_grade === 'B').length,
      C: reputations.filter(r => r.reputation_grade === 'C').length,
      D: reputations.filter(r => r.reputation_grade === 'D').length,
      F: reputations.filter(r => r.reputation_grade === 'F').length,
    };
    
    const avgScore = reputations.length > 0
      ? reputations.reduce((sum, r) => sum + r.reputation_score, 0) / reputations.length
      : 0;
    
    const avgSuccessRate = reputations.length > 0
      ? reputations.reduce((sum, r) => sum + r.success_rate, 0) / reputations.length
      : 0;
    
    const avgResponseTime = reputations.length > 0
      ? reputations.reduce((sum, r) => sum + r.avg_response_time_ms, 0) / reputations.length
      : 0;
    
    return {
      total_agents: reputations.length,
      agents_by_grade: agentsByGrade,
      average_score: parseFloat(avgScore.toFixed(2)),
      average_success_rate: parseFloat(avgSuccessRate.toFixed(2)),
      average_response_time_ms: Math.round(avgResponseTime),
    };
  }
  
  /**
   * Reset agent reputation (admin function)
   */
  resetReputation(agentId: string): AgentReputationMetrics {
    const reputation = this.initializeReputation(agentId);
    this.reputations.set(agentId, reputation);
    return reputation;
  }
  
  /**
   * Delete agent reputation (cleanup)
   */
  deleteReputation(agentId: string): boolean {
    return this.reputations.delete(agentId);
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const reputationManager = ReputationManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get reputation badge (for UI display)
 */
export function getReputationBadge(score: number): {
  grade: string;
  color: string;
  label: string;
} {
  if (score >= 95) {
    return { grade: 'S', color: '#FFD700', label: 'Legendary' };
  } else if (score >= 85) {
    return { grade: 'A', color: '#4CAF50', label: 'Excellent' };
  } else if (score >= 75) {
    return { grade: 'B', color: '#2196F3', label: 'Good' };
  } else if (score >= 65) {
    return { grade: 'C', color: '#FF9800', label: 'Fair' };
  } else if (score >= 55) {
    return { grade: 'D', color: '#FF5722', label: 'Poor' };
  } else {
    return { grade: 'F', color: '#F44336', label: 'Failing' };
  }
}

/**
 * Check if agent meets reputation threshold
 */
export function meetsReputationThreshold(
  agentId: string,
  minScore: number
): boolean {
  const reputation = reputationManager.getReputation(agentId);
  
  // Require minimum 5 tasks before enforcing threshold
  if (reputation.total_tasks < 5) {
    return true; // Give benefit of doubt to new agents
  }
  
  return reputation.reputation_score >= minScore;
}

/**
 * Get recommended agents for capability
 */
export function getRecommendedAgents(
  capability: string,
  minScore: number = 75,
  limit: number = 5
): AgentReputationMetrics[] {
  // TODO: Filter by capability when agent capabilities tracking is added
  
  return reputationManager.getTopAgents(limit).filter(
    r => r.reputation_score >= minScore
  );
}
