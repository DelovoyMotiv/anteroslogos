/**
 * Sybil Attack Monitoring Service
 * 
 * Background job for detecting and flagging Sybil attack patterns.
 * Analyzes agent contribution patterns periodically and applies throttling.
 * 
 * Requirements: 5.3, 5.4, 8.4
 * 
 * @module lib/bft/monitoring/sybilMonitor
 * @version 1.0.0
 */

import { QualityAnalyzer } from '../qualityAnalyzer';
import type { SybilDetectionResult } from '../../../types/byzantine.types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface SybilMonitorConfig {
  analysisIntervalMs: number;
  lookbackWindowMs: number;
  enableThrottling: boolean;
  enableAutoBlocking: boolean;
}

const DEFAULT_CONFIG: SybilMonitorConfig = {
  analysisIntervalMs: 300000, // 5 minutes
  lookbackWindowMs: 3600000, // 1 hour
  enableThrottling: true,
  enableAutoBlocking: false, // Require manual review for blocking
};

/**
 * Sybil Attack Monitor
 * 
 * Periodically analyzes agent behavior for Sybil attack patterns:
 * - High volume, low novelty contributions
 * - Low entropy content
 * - Duplicate entity submissions
 * 
 * Actions:
 * - FLAG: Mark for manual review
 * - THROTTLE: Rate limit submissions
 * - BLOCK: Prevent further submissions (requires manual approval)
 */
export class SybilMonitor {
  private analyzer: QualityAnalyzer;
  private config: SybilMonitorConfig;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  constructor(config: Partial<SybilMonitorConfig> = {}) {
    this.analyzer = new QualityAnalyzer();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Start monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.warn('SybilMonitor already running');
      return;
    }
    
    this.isRunning = true;
    console.log('SybilMonitor started', {
      interval: this.config.analysisIntervalMs,
      lookback: this.config.lookbackWindowMs,
    });
    
    // Run immediately
    this.runAnalysis().catch(err => {
      console.error('SybilMonitor initial analysis failed:', err);
    });
    
    // Schedule periodic runs
    this.intervalHandle = setInterval(() => {
      this.runAnalysis().catch(err => {
        console.error('SybilMonitor analysis failed:', err);
      });
    }, this.config.analysisIntervalMs);
  }
  
  /**
   * Stop monitoring service
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    console.log('SybilMonitor stopped');
  }
  
  /**
   * Run Sybil detection analysis
   */
  private async runAnalysis(): Promise<void> {
    const startTime = Date.now();
    console.log('SybilMonitor: Starting analysis');
    
    try {
      // Get active agents from recent contributions
      const agents = await this.getActiveAgents();
      console.log(`SybilMonitor: Analyzing ${agents.length} active agents`);
      
      let flaggedCount = 0;
      let throttledCount = 0;
      let blockedCount = 0;
      
      // Analyze each agent
      for (const agentId of agents) {
        try {
          const result = await this.analyzeAgent(agentId);
          
          if (result.isSuspicious) {
            // Store detection result
            await this.storeDetectionResult(agentId, result);
            
            // Apply action based on recommendation
            switch (result.recommendedAction) {
              case 'FLAG':
                await this.flagAgent(agentId, result);
                flaggedCount++;
                break;
              case 'THROTTLE':
                if (this.config.enableThrottling) {
                  await this.throttleAgent(agentId, result);
                  throttledCount++;
                }
                break;
              case 'BLOCK':
                if (this.config.enableAutoBlocking) {
                  await this.blockAgent(agentId, result);
                  blockedCount++;
                } else {
                  // Flag for manual review instead
                  await this.flagAgent(agentId, result);
                  flaggedCount++;
                }
                break;
            }
          }
        } catch (err) {
          console.error(`SybilMonitor: Failed to analyze agent ${agentId}:`, err);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log('SybilMonitor: Analysis complete', {
        duration,
        analyzed: agents.length,
        flagged: flaggedCount,
        throttled: throttledCount,
        blocked: blockedCount,
      });
    } catch (err) {
      console.error('SybilMonitor: Analysis failed:', err);
      throw err;
    }
  }
  
  /**
   * Get list of active agents from recent contributions
   */
  private async getActiveAgents(): Promise<string[]> {
    const cutoff = new Date(Date.now() - this.config.lookbackWindowMs);
    
    // Query knowledge graph contributions
    const { data, error } = await supabase
      .from('knowledge_graph_nodes')
      .select('created_by')
      .gte('created_at', cutoff.toISOString())
      .not('created_by', 'is', null);
    
    if (error) {
      console.error('Failed to fetch active agents:', error);
      return [];
    }
    
    // Get unique agent IDs
    const agents = new Set<string>();
    for (const row of data || []) {
      if (row.created_by) {
        agents.add(row.created_by);
      }
    }
    
    return Array.from(agents);
  }
  
  /**
   * Analyze single agent for Sybil patterns
   */
  private async analyzeAgent(agentId: string): Promise<SybilDetectionResult> {
    // Get agent's recent contributions
    const contributions = await this.getAgentContributions(agentId);
    
    // Update quality metrics
    for (const contrib of contributions) {
      this.analyzer.updateMetrics(
        agentId,
        contrib.entities,
        contrib.novelCount,
        contrib.entropy
      );
    }
    
    // Detect Sybil patterns
    return this.analyzer.detectSybilPatterns(agentId);
  }
  
  /**
   * Get agent's recent contributions
   */
  private async getAgentContributions(agentId: string): Promise<Array<{
    entities: any[];
    novelCount: number;
    entropy: number;
  }>> {
    const cutoff = new Date(Date.now() - this.config.lookbackWindowMs);
    
    const { data, error } = await supabase
      .from('knowledge_graph_nodes')
      .select('*')
      .eq('created_by', agentId)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false });
    
    if (error || !data) {
      return [];
    }
    
    // Group by submission batch (approximate)
    const contributions: Array<{
      entities: any[];
      novelCount: number;
      entropy: number;
    }> = [];
    
    // Simple grouping: treat each node as a contribution
    // In production, you'd group by transaction/batch ID
    for (const node of data) {
      const entities = [{
        id: node.id,
        name: node.name || '',
        type: node.type || 'unknown',
        data: node.data,
      }];
      
      // Calculate entropy for this contribution
      const entropy = this.analyzer.calculateEntropy(entities, []);
      
      contributions.push({
        entities,
        novelCount: 1, // Simplified: assume each node is novel
        entropy,
      });
    }
    
    return contributions;
  }
  
  /**
   * Store detection result in database
   */
  private async storeDetectionResult(
    agentId: string,
    result: SybilDetectionResult
  ): Promise<void> {
    const { error } = await supabase
      .from('sybil_detection_results')
      .insert({
        agent_id: agentId,
        is_suspicious: result.isSuspicious,
        confidence: result.confidence,
        novelty_volume_ratio: result.noveltyVolumeRatio,
        entropy_score: result.entropyScore,
        indicators: result.indicators,
        recommended_action: result.recommendedAction,
        detected_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Failed to store detection result:', error);
    }
  }
  
  /**
   * Flag agent for manual review
   */
  private async flagAgent(
    agentId: string,
    result: SybilDetectionResult
  ): Promise<void> {
    console.log(`SybilMonitor: Flagging agent ${agentId}`, {
      confidence: result.confidence,
      ratio: result.noveltyVolumeRatio,
    });
    
    // Update agent metadata with flag
    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: {
          sybil_flagged: true,
          sybil_confidence: result.confidence,
          sybil_flagged_at: new Date().toISOString(),
        },
      })
      .eq('id', agentId);
    
    if (error) {
      console.error('Failed to flag agent:', error);
    }
  }
  
  /**
   * Throttle agent submissions
   */
  private async throttleAgent(
    agentId: string,
    result: SybilDetectionResult
  ): Promise<void> {
    console.log(`SybilMonitor: Throttling agent ${agentId}`, {
      confidence: result.confidence,
    });
    
    // Calculate throttle rate based on confidence
    // Higher confidence = more aggressive throttling
    const baseRate = 10; // requests per minute
    const throttleRate = Math.max(1, baseRate * (1 - result.confidence));
    
    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: {
          throttled: true,
          throttle_rate: throttleRate,
          throttled_at: new Date().toISOString(),
          throttle_reason: 'sybil_detection',
        },
      })
      .eq('id', agentId);
    
    if (error) {
      console.error('Failed to throttle agent:', error);
    }
  }
  
  /**
   * Block agent from further submissions
   */
  private async blockAgent(
    agentId: string,
    result: SybilDetectionResult
  ): Promise<void> {
    console.log(`SybilMonitor: Blocking agent ${agentId}`, {
      confidence: result.confidence,
    });
    
    const { error } = await supabase
      .from('profiles')
      .update({
        metadata: {
          blocked: true,
          blocked_at: new Date().toISOString(),
          block_reason: 'sybil_detection',
          block_confidence: result.confidence,
        },
      })
      .eq('id', agentId);
    
    if (error) {
      console.error('Failed to block agent:', error);
    }
  }
  
  /**
   * Get monitoring statistics
   */
  async getStatistics(): Promise<{
    totalDetections: number;
    flaggedAgents: number;
    throttledAgents: number;
    blockedAgents: number;
    avgConfidence: number;
  }> {
    const { data, error } = await supabase
      .from('sybil_detection_results')
      .select('*')
      .eq('is_suspicious', true)
      .gte('detected_at', new Date(Date.now() - 86400000).toISOString()); // Last 24h
    
    if (error || !data) {
      return {
        totalDetections: 0,
        flaggedAgents: 0,
        throttledAgents: 0,
        blockedAgents: 0,
        avgConfidence: 0,
      };
    }
    
    const flagged = data.filter(d => d.recommended_action === 'FLAG').length;
    const throttled = data.filter(d => d.recommended_action === 'THROTTLE').length;
    const blocked = data.filter(d => d.recommended_action === 'BLOCK').length;
    const avgConfidence = data.reduce((sum, d) => sum + (d.confidence || 0), 0) / data.length;
    
    return {
      totalDetections: data.length,
      flaggedAgents: flagged,
      throttledAgents: throttled,
      blockedAgents: blocked,
      avgConfidence,
    };
  }
}
