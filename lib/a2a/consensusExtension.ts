/**
 * A2A Consensus Extension - Linux Foundation A2A Protocol v1.0
 * 
 * Integrates Byzantine fault-tolerant consensus (PBFT) for critical A2A tasks
 * Routes high-priority tasks through 7-node consensus quorum
 * 
 * Extension Spec: agent-card.json extensions.verification
 */

import { BFTRouter, BFTRoutingResult } from '../bft/bftRouter';
import { Task, TaskPriority, taskManager } from './taskManager';
import { agentCardManager } from './agentCard';

// =====================================================
// CONSENSUS EXTENSION TYPES
// =====================================================

export interface TaskConsensusRequirement {
  task_id: string;
  requires_consensus: boolean;
  quorum_size: number;
  consensus_method: 'pbft' | 'raft' | 'none';
  criticality_score: number; // 0-100
}

export interface TaskConsensusResult {
  task_id: string;
  consensus_achieved: boolean;
  quorum_size: number;
  votes_for: number;
  votes_against: number;
  consensus_time_ms: number;
  validator_nodes: string[];
  consensus_hash?: string;
}

// =====================================================
// CONSENSUS EXTENSION MANAGER
// =====================================================

export class ConsensusExtensionManager {
  private static instance: ConsensusExtensionManager;
  private bftRouter: BFTRouter | null = null;
  private taskConsensus: Map<string, TaskConsensusResult> = new Map();
  
  private constructor() {}
  
  static getInstance(): ConsensusExtensionManager {
    if (!ConsensusExtensionManager.instance) {
      ConsensusExtensionManager.instance = new ConsensusExtensionManager();
    }
    return ConsensusExtensionManager.instance;
  }
  
  /**
   * Initialize with BFT Router
   */
  initializeBFTRouter(bftRouter: BFTRouter): void {
    this.bftRouter = bftRouter;
    console.log('[ConsensusExtension] BFT Router initialized');
  }
  
  /**
   * Check if consensus extension is enabled
   */
  isConsensusEnabled(): boolean {
    const card = agentCardManager.getCard();
    return card.extensions?.verification?.supported || false;
  }
  
  /**
   * Get consensus configuration from agent card
   */
  getConsensusConfig(): {
    method: string;
    quorum_size: number;
  } | null {
    const card = agentCardManager.getCard();
    
    if (!card.extensions?.verification?.supported) {
      return null;
    }
    
    return {
      method: card.extensions.verification.method,
      quorum_size: card.extensions.verification.quorum_size || 7,
    };
  }
  
  /**
   * Calculate consensus requirement for task
   */
  calculateConsensusRequirement(task: Task): TaskConsensusRequirement {
    // Criticality score based on priority
    let criticalityScore = 0;
    switch (task.priority) {
      case TaskPriority.LOW:
        criticalityScore = 20;
        break;
      case TaskPriority.NORMAL:
        criticalityScore = 40;
        break;
      case TaskPriority.HIGH:
        criticalityScore = 70;
        break;
      case TaskPriority.CRITICAL:
        criticalityScore = 100;
        break;
    }
    
    // Additional criticality factors
    // - Payment-required tasks get +20
    if (task.extensions?.payment?.required_before === 'execution') {
      criticalityScore = Math.min(100, criticalityScore + 20);
    }
    
    // - Byzantine-tagged capabilities get +30
    const byzantineCapabilities = [
      'geo.audit.deep',
      'reputation.update',
      'payment.verify',
      'mesh.topology.change',
    ];
    
    if (byzantineCapabilities.some(cap => task.capability.includes(cap))) {
      criticalityScore = Math.min(100, criticalityScore + 30);
    }
    
    // Requires consensus if criticality >= 70
    const requiresConsensus = criticalityScore >= 70;
    
    const config = this.getConsensusConfig();
    
    return {
      task_id: task.id,
      requires_consensus: requiresConsensus && this.isConsensusEnabled(),
      quorum_size: config?.quorum_size || 7,
      consensus_method: requiresConsensus && this.isConsensusEnabled() ? 'pbft' : 'none',
      criticality_score: criticalityScore,
    };
  }
  
  /**
   * Route task through consensus
   */
  async routeTaskThroughConsensus(
    task: Task,
    operation: string,
    payload: any
  ): Promise<TaskConsensusResult> {
    if (!this.bftRouter) {
      throw new Error('BFT Router not initialized. Call initializeBFTRouter() first.');
    }
    
    if (!this.isConsensusEnabled()) {
      throw new Error('Consensus extension not enabled for this agent');
    }
    
    const requirement = this.calculateConsensusRequirement(task);
    
    if (!requirement.requires_consensus) {
      throw new Error(`Task ${task.id} does not require consensus`);
    }
    
    const startTime = Date.now();
    
    // Route through BFT consensus
    const bftResult: BFTRoutingResult = await this.bftRouter.route(
      operation,
      payload,
      {
        forceConsensus: true,
        minQuorumSize: requirement.quorum_size,
      }
    );
    
    // Build consensus result
    const consensusResult: TaskConsensusResult = {
      task_id: task.id,
      consensus_achieved: bftResult.success && bftResult.consensusUsed,
      quorum_size: requirement.quorum_size,
      votes_for: (bftResult.consensusResult as any)?.votesFor || 0,
      votes_against: (bftResult.consensusResult as any)?.votesAgainst || 0,
      consensus_time_ms: Date.now() - startTime,
      validator_nodes: (bftResult.consensusResult as any)?.validators || [],
      consensus_hash: (bftResult.consensusResult as any)?.consensusHash,
    };
    
    // Store consensus result
    this.taskConsensus.set(task.id, consensusResult);
    
    // Add consensus metadata to task
    if (!task.extensions) {
      task.extensions = {};
    }
    
    task.extensions.consensus = {
      achieved: consensusResult.consensus_achieved,
      quorum_size: consensusResult.quorum_size,
      votes: {
        for: consensusResult.votes_for,
        against: consensusResult.votes_against,
      },
      time_ms: consensusResult.consensus_time_ms,
      validators: consensusResult.validator_nodes,
      hash: consensusResult.consensus_hash,
    };
    
    return consensusResult;
  }
  
  /**
   * Verify task through consensus (payment verification)
   */
  async verifyTaskPaymentThroughConsensus(
    taskId: string,
    txHash: string,
    amount: number,
    recipient: string
  ): Promise<{ verified: boolean; consensus: TaskConsensusResult }> {
    const task = taskManager.getTask(taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    if (!this.bftRouter) {
      throw new Error('BFT Router not initialized');
    }
    
    const bftResult = await this.bftRouter.verifyPayment(txHash, amount, recipient);
    
    const consensusResult: TaskConsensusResult = {
      task_id: taskId,
      consensus_achieved: bftResult.success && bftResult.consensusUsed,
      quorum_size: this.getConsensusConfig()?.quorum_size || 7,
      votes_for: (bftResult.consensusResult as any)?.votesFor || 0,
      votes_against: (bftResult.consensusResult as any)?.votesAgainst || 0,
      consensus_time_ms: bftResult.executionTimeMs,
      validator_nodes: (bftResult.consensusResult as any)?.validators || [],
      consensus_hash: (bftResult.consensusResult as any)?.consensusHash,
    };
    
    this.taskConsensus.set(taskId, consensusResult);
    
    return {
      verified: bftResult.success && (bftResult.data?.verified || false),
      consensus: consensusResult,
    };
  }
  
  /**
   * Update agent reputation through consensus
   */
  async updateReputationThroughConsensus(
    agentId: string,
    newScore: number,
    reason: string
  ): Promise<{ updated: boolean; consensus: TaskConsensusResult }> {
    if (!this.bftRouter) {
      throw new Error('BFT Router not initialized');
    }
    
    const bftResult = await this.bftRouter.updateReputation(agentId, newScore, reason);
    
    // Create pseudo-task for tracking
    const taskId = `reputation-${agentId}-${Date.now()}`;
    
    const consensusResult: TaskConsensusResult = {
      task_id: taskId,
      consensus_achieved: bftResult.success && bftResult.consensusUsed,
      quorum_size: this.getConsensusConfig()?.quorum_size || 7,
      votes_for: (bftResult.consensusResult as any)?.votesFor || 0,
      votes_against: (bftResult.consensusResult as any)?.votesAgainst || 0,
      consensus_time_ms: bftResult.executionTimeMs,
      validator_nodes: (bftResult.consensusResult as any)?.validators || [],
      consensus_hash: (bftResult.consensusResult as any)?.consensusHash,
    };
    
    this.taskConsensus.set(taskId, consensusResult);
    
    return {
      updated: bftResult.success && (bftResult.data?.updated || false),
      consensus: consensusResult,
    };
  }
  
  /**
   * Get task consensus result
   */
  getTaskConsensus(taskId: string): TaskConsensusResult | null {
    return this.taskConsensus.get(taskId) || null;
  }
  
  /**
   * Check if task should use consensus
   */
  shouldUseConsensus(task: Task): boolean {
    const requirement = this.calculateConsensusRequirement(task);
    return requirement.requires_consensus;
  }
  
  /**
   * Get consensus statistics
   */
  getConsensusStatistics(): {
    total_tasks: number;
    consensus_used: number;
    consensus_achieved: number;
    consensus_failed: number;
    average_time_ms: number;
  } {
    const results = Array.from(this.taskConsensus.values());
    
    const consensusAchieved = results.filter(r => r.consensus_achieved).length;
    const consensusFailed = results.filter(r => !r.consensus_achieved).length;
    
    const avgTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.consensus_time_ms, 0) / results.length
      : 0;
    
    return {
      total_tasks: results.length,
      consensus_used: results.length,
      consensus_achieved: consensusAchieved,
      consensus_failed: consensusFailed,
      average_time_ms: Math.round(avgTime),
    };
  }
  
  /**
   * Cleanup old consensus results
   */
  cleanupOldResults(_retentionMs: number = 24 * 60 * 60 * 1000): number {
    // For now, just clear all since we don't track timestamps
    // TODO: Add timestamp tracking to TaskConsensusResult
    const count = this.taskConsensus.size;
    this.taskConsensus.clear();
    return count;
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const consensusExtension = ConsensusExtensionManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Execute task with consensus verification
 */
export async function executeTaskWithConsensus(
  task: Task,
  executionFn: () => Promise<any>
): Promise<{
  success: boolean;
  result?: any;
  consensus?: TaskConsensusResult;
  error?: string;
}> {
  try {
    // Check if consensus is required
    const requirement = consensusExtension.calculateConsensusRequirement(task);
    
    if (requirement.requires_consensus) {
      console.log(`[ConsensusExtension] Task ${task.id} requires consensus`);
      
      // Execute task
      const result = await executionFn();
      
      // Route through consensus for verification
      const consensus = await consensusExtension.routeTaskThroughConsensus(
        task,
        `task.${task.capability}`,
        {
          task_id: task.id,
          result,
        }
      );
      
      if (!consensus.consensus_achieved) {
        return {
          success: false,
          error: 'Consensus not achieved',
          consensus,
        };
      }
      
      return {
        success: true,
        result,
        consensus,
      };
    } else {
      // Direct execution without consensus
      const result = await executionFn();
      
      return {
        success: true,
        result,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
