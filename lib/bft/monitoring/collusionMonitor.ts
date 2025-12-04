/**
 * Collusion Detection Monitoring Service
 * 
 * Background job for detecting coordinated attacks through correlation analysis.
 * Identifies agent clusters with suspicious similarity patterns.
 * 
 * Requirements: 7.1, 7.2, 7.4
 * 
 * @module lib/bft/monitoring/collusionMonitor
 * @version 1.0.0
 */

import { CollusionDetector } from '../collusionDetector';
import type { CollusionCluster } from '../../../types/byzantine.types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface CollusionMonitorConfig {
  analysisIntervalMs: number;
  lookbackWindowMs: number;
  correlationThreshold: number;
  minClusterSize: number;
  enableReputationPenalties: boolean;
}

const DEFAULT_CONFIG: CollusionMonitorConfig = {
  analysisIntervalMs: 600000, // 10 minutes
  lookbackWindowMs: 7200000, // 2 hours
  correlationThreshold: 0.7,
  minClusterSize: 2,
  enableReputationPenalties: true,
};

/**
 * Collusion Monitor
 * 
 * Periodically analyzes agent behavior for collusion patterns:
 * - High temporal correlation in contributions
 * - Structural similarity in submitted graphs
 * - High entity overlap (Jaccard similarity)
 * 
 * Actions:
 * - Detect and store collusion clusters
 * - Apply reputation penalties proportional to correlation
 * - Flag clusters for manual review
 */
export class CollusionMonitor {
  private detector: CollusionDetector;
  private config: CollusionMonitorConfig;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  constructor(config: Partial<CollusionMonitorConfig> = {}) {
    this.detector = new CollusionDetector();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Start monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.warn('CollusionMonitor already running');
      return;
    }
    
    this.isRunning = true;
    console.log('CollusionMonitor started', {
      interval: this.config.analysisIntervalMs,
      lookback: this.config.lookbackWindowMs,
      threshold: this.config.correlationThreshold,
    });
    
    // Run immediately
    this.runAnalysis().catch(err => {
      console.error('CollusionMonitor initial analysis failed:', err);
    });
    
    // Schedule periodic runs
    this.intervalHandle = setInterval(() => {
      this.runAnalysis().catch(err => {
        console.error('CollusionMonitor analysis failed:', err);
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
    console.log('CollusionMonitor stopped');
  }
  
  /**
   * Run collusion detection analysis
   */
  private async runAnalysis(): Promise<void> {
    const startTime = Date.now();
    console.log('CollusionMonitor: Starting analysis');
    
    try {
      // Get active agents
      const agents = await this.getActiveAgents();
      console.log(`CollusionMonitor: Analyzing ${agents.length} active agents`);
      
      if (agents.length < this.config.minClusterSize) {
        console.log('CollusionMonitor: Not enough agents for analysis');
        return;
      }
      
      // Compute pairwise correlations
      await this.computeCorrelations(agents);
      
      // Detect collusion clusters
      const clusters = await this.detector.detectCollusionClusters(
        agents,
        this.config.correlationThreshold
      );
      
      console.log(`CollusionMonitor: Found ${clusters.length} suspicious clusters`);
      
      // Process each cluster
      for (const cluster of clusters) {
        await this.processCluster(cluster);
      }
      
      const duration = Date.now() - startTime;
      console.log('CollusionMonitor: Analysis complete', {
        duration,
        agents: agents.length,
        clusters: clusters.length,
      });
    } catch (err) {
      console.error('CollusionMonitor: Analysis failed:', err);
      throw err;
    }
  }
  
  /**
   * Get list of active agents
   */
  private async getActiveAgents(): Promise<string[]> {
    const cutoff = new Date(Date.now() - this.config.lookbackWindowMs);
    
    const { data, error } = await supabase
      .from('knowledge_graph_nodes')
      .select('created_by')
      .gte('created_at', cutoff.toISOString())
      .not('created_by', 'is', null);
    
    if (error) {
      console.error('Failed to fetch active agents:', error);
      return [];
    }
    
    const agents = new Set<string>();
    for (const row of data || []) {
      if (row.created_by) {
        agents.add(row.created_by);
      }
    }
    
    return Array.from(agents);
  }
  
  /**
   * Compute pairwise correlations for all agents
   */
  private async computeCorrelations(agents: string[]): Promise<void> {
    // Compute pairwise correlations incrementally
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const agent1 = agents[i];
        const agent2 = agents[j];
        
        // Compute correlation using detector
        const correlation = await this.detector.computeCorrelation(
          agent1,
          agent2,
          this.config.lookbackWindowMs
        );
        
        // Store in correlation matrix (handled by detector)
        console.log(`Correlation ${agent1} <-> ${agent2}: ${correlation.toFixed(3)}`);
      }
    }
  }
  
  /**
   * Process detected collusion cluster
   */
  private async processCluster(cluster: CollusionCluster): Promise<void> {
    console.log('CollusionMonitor: Processing cluster', {
      agents: cluster.agentIds,
      correlation: cluster.avgCorrelation,
      confidence: cluster.confidence,
    });
    
    // Store cluster in database
    await this.storeCluster(cluster);
    
    // Apply reputation penalties if enabled
    if (this.config.enableReputationPenalties) {
      await this.applyReputationPenalties(cluster);
    }
    
    // Flag cluster for manual review
    await this.flagCluster(cluster);
  }
  
  /**
   * Store collusion cluster in database
   */
  private async storeCluster(cluster: CollusionCluster): Promise<void> {
    const { error } = await supabase
      .from('collusion_clusters')
      .insert({
        agent_ids: cluster.agentIds,
        avg_correlation: cluster.avgCorrelation,
        graph_similarity: cluster.graphSimilarity,
        entity_overlap: cluster.entityOverlap,
        confidence: cluster.confidence,
        evidence: cluster.evidence,
        detected_at: new Date().toISOString(),
        status: 'PENDING',
      });
    
    if (error) {
      console.error('Failed to store collusion cluster:', error);
    }
  }
  
  /**
   * Apply reputation penalties proportional to correlation strength
   */
  private async applyReputationPenalties(cluster: CollusionCluster): Promise<void> {
    // Calculate penalty based on correlation and confidence
    // Higher correlation = stronger penalty
    const basePenalty = 10; // Base reputation points
    const penalty = Math.floor(
      basePenalty * cluster.avgCorrelation * cluster.confidence
    );
    
    console.log(`CollusionMonitor: Applying penalty of ${penalty} points to cluster`);
    
    for (const agentId of cluster.agentIds) {
      try {
        // Get current reputation
        const { data: profile } = await supabase
          .from('profiles')
          .select('reputation_score, metadata')
          .eq('id', agentId)
          .single();
        
        if (!profile) continue;
        
        const currentReputation = profile.reputation_score || 100;
        const newReputation = Math.max(0, currentReputation - penalty);
        
        // Update reputation
        const { error } = await supabase
          .from('profiles')
          .update({
            reputation_score: newReputation,
            metadata: {
              ...profile.metadata,
              collusion_penalty: penalty,
              collusion_penalty_at: new Date().toISOString(),
              collusion_cluster_id: cluster.agentIds.join(','),
            },
          })
          .eq('id', agentId);
        
        if (error) {
          console.error(`Failed to apply penalty to agent ${agentId}:`, error);
        } else {
          console.log(`Applied penalty to ${agentId}: ${currentReputation} -> ${newReputation}`);
        }
      } catch (err) {
        console.error(`Error applying penalty to agent ${agentId}:`, err);
      }
    }
  }
  
  /**
   * Flag cluster for manual review
   */
  private async flagCluster(cluster: CollusionCluster): Promise<void> {
    // Update all agents in cluster with flag
    for (const agentId of cluster.agentIds) {
      const { error } = await supabase
        .from('profiles')
        .update({
          metadata: {
            collusion_flagged: true,
            collusion_confidence: cluster.confidence,
            collusion_flagged_at: new Date().toISOString(),
          },
        })
        .eq('id', agentId);
      
      if (error) {
        console.error(`Failed to flag agent ${agentId}:`, error);
      }
    }
  }
  
  /**
   * Get monitoring statistics
   */
  async getStatistics(): Promise<{
    totalClusters: number;
    totalAgentsInClusters: number;
    avgClusterSize: number;
    avgCorrelation: number;
    totalPenaltiesApplied: number;
  }> {
    const { data, error } = await supabase
      .from('collusion_clusters')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 86400000).toISOString()); // Last 24h
    
    if (error || !data || data.length === 0) {
      return {
        totalClusters: 0,
        totalAgentsInClusters: 0,
        avgClusterSize: 0,
        avgCorrelation: 0,
        totalPenaltiesApplied: 0,
      };
    }
    
    const uniqueAgents = new Set<string>();
    let totalCorrelation = 0;
    let totalSize = 0;
    
    for (const cluster of data) {
      for (const agentId of cluster.agent_ids || []) {
        uniqueAgents.add(agentId);
      }
      totalCorrelation += cluster.avg_correlation || 0;
      totalSize += (cluster.agent_ids || []).length;
    }
    
    return {
      totalClusters: data.length,
      totalAgentsInClusters: uniqueAgents.size,
      avgClusterSize: totalSize / data.length,
      avgCorrelation: totalCorrelation / data.length,
      totalPenaltiesApplied: uniqueAgents.size, // Simplified
    };
  }
}
