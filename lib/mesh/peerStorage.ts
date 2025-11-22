/**
 * Peer Storage with Supabase Persistence
 * Production-grade peer data persistence for mesh network
 * 
 * Features:
 * - Supabase database integration
 * - Peer reputation history tracking
 * - Connection statistics (success rate, RTT, uptime)
 * - Trust score evolution over time
 * - Automatic data cleanup (30-day retention)
 * 
 * Database Schema (Supabase):
 * 
 * Table: mesh_peers
 * - id (uuid, pk)
 * - node_id (text, unique)
 * - aid_uri (text)
 * - endpoint (text)
 * - capabilities (text[])
 * - trust_score (int)
 * - first_seen (timestamp)
 * - last_seen (timestamp)
 * - total_requests (int)
 * - successful_requests (int)
 * - failed_requests (int)
 * - avg_rtt_ms (int)
 * - metadata (jsonb)
 * - created_at (timestamp)
 * - updated_at (timestamp)
 * 
 * Table: mesh_peer_history
 * - id (uuid, pk)
 * - node_id (text, fk -> mesh_peers.node_id)
 * - trust_score (int)
 * - rtt_ms (int)
 * - success (boolean)
 * - timestamp (timestamp)
 * 
 * @module lib/mesh/peerStorage
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { MeshNode } from './network';
import type { PeerHealthMetrics } from './healthMonitor';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Peer database record
 */
export interface PeerRecord {
  id: string;
  node_id: string;
  aid_uri: string;
  endpoint: string;
  capabilities: string[];
  trust_score: number;
  first_seen: string; // ISO timestamp
  last_seen: string; // ISO timestamp
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_rtt_ms: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

/**
 * Peer history record
 */
export interface PeerHistoryRecord {
  id: string;
  node_id: string;
  trust_score: number;
  rtt_ms: number;
  success: boolean;
  timestamp: string; // ISO timestamp
}

/**
 * Peer statistics
 */
export interface PeerStats {
  node_id: string;
  aid_uri: string;
  success_rate: number;
  avg_rtt: number;
  uptime: number; // seconds since first_seen
  total_requests: number;
  trust_score_trend: 'increasing' | 'decreasing' | 'stable';
}

// =====================================================
// PEER STORAGE
// =====================================================

export class PeerStorage {
  private supabase: SupabaseClient | null = null;
  private readonly HISTORY_RETENTION_DAYS = 30;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSupabase();
    console.log('[PeerStorage] Initialized');
  }

  // =====================================================
  // SUPABASE INITIALIZATION
  // =====================================================

  /**
   * Initialize Supabase client
   */
  private initializeSupabase(): void {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[PeerStorage] Supabase credentials not found, persistence disabled');
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[PeerStorage] Supabase connection established');

      // Start automatic cleanup
      this.startAutoCleanup();
    } catch (error) {
      console.error('[PeerStorage] Failed to initialize Supabase:', error);
    }
  }

  /**
   * Check if persistence is available
   */
  private isPersistenceEnabled(): boolean {
    return this.supabase !== null;
  }

  // =====================================================
  // PEER MANAGEMENT
  // =====================================================

  /**
   * Save or update peer
   */
  async savePeer(node: MeshNode): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      console.warn('[PeerStorage] Persistence disabled, skipping save');
      return;
    }

    try {
      const now = new Date().toISOString();

      // Check if peer exists
      const { data: existing } = await this.supabase!
        .from('mesh_peers')
        .select('*')
        .eq('node_id', node.nodeId)
        .single();

      if (existing) {
        // Update existing peer
        const { error } = await this.supabase!
          .from('mesh_peers')
          .update({
            aid_uri: node.aidUri,
            endpoint: node.endpoint,
            capabilities: node.capabilities,
            trust_score: node.trustScore,
            last_seen: now,
            avg_rtt_ms: node.rtt || 0,
            metadata: node.metadata || {},
            updated_at: now,
          })
          .eq('node_id', node.nodeId);

        if (error) throw error;

        console.log(`[PeerStorage] Updated peer ${node.aidUri}`);
      } else {
        // Insert new peer
        const { error } = await this.supabase!
          .from('mesh_peers')
          .insert({
            node_id: node.nodeId,
            aid_uri: node.aidUri,
            endpoint: node.endpoint,
            capabilities: node.capabilities,
            trust_score: node.trustScore,
            first_seen: now,
            last_seen: now,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            avg_rtt_ms: node.rtt || 0,
            metadata: node.metadata || {},
          });

        if (error) throw error;

        console.log(`[PeerStorage] Saved new peer ${node.aidUri}`);
      }
    } catch (error) {
      console.error('[PeerStorage] Failed to save peer:', error);
    }
  }

  /**
   * Load peer by node ID
   */
  async loadPeer(nodeId: string): Promise<PeerRecord | null> {
    if (!this.isPersistenceEnabled()) {
      return null;
    }

    try {
      const { data, error } = await this.supabase!
        .from('mesh_peers')
        .select('*')
        .eq('node_id', nodeId)
        .single();

      if (error) throw error;

      return data as PeerRecord;
    } catch (error) {
      console.error(`[PeerStorage] Failed to load peer ${nodeId}:`, error);
      return null;
    }
  }

  /**
   * Load all peers
   */
  async loadAllPeers(): Promise<PeerRecord[]> {
    if (!this.isPersistenceEnabled()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('mesh_peers')
        .select('*')
        .order('last_seen', { ascending: false });

      if (error) throw error;

      return (data as PeerRecord[]) || [];
    } catch (error) {
      console.error('[PeerStorage] Failed to load peers:', error);
      return [];
    }
  }

  /**
   * Delete peer
   */
  async deletePeer(nodeId: string): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      return;
    }

    try {
      // Delete history first (foreign key constraint)
      await this.supabase!
        .from('mesh_peer_history')
        .delete()
        .eq('node_id', nodeId);

      // Delete peer
      const { error } = await this.supabase!
        .from('mesh_peers')
        .delete()
        .eq('node_id', nodeId);

      if (error) throw error;

      console.log(`[PeerStorage] Deleted peer ${nodeId}`);
    } catch (error) {
      console.error(`[PeerStorage] Failed to delete peer ${nodeId}:`, error);
    }
  }

  // =====================================================
  // STATISTICS & HISTORY
  // =====================================================

  /**
   * Record peer activity (success/failure with RTT)
   */
  async recordActivity(
    nodeId: string,
    success: boolean,
    rtt: number,
    trustScore: number
  ): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      return;
    }

    try {
      // Update peer statistics
      const { data: peer } = await this.supabase!
        .from('mesh_peers')
        .select('total_requests, successful_requests, failed_requests')
        .eq('node_id', nodeId)
        .single();

      if (peer) {
        const totalRequests = peer.total_requests + 1;
        const successfulRequests = peer.successful_requests + (success ? 1 : 0);
        const failedRequests = peer.failed_requests + (success ? 0 : 1);

        await this.supabase!
          .from('mesh_peers')
          .update({
            total_requests: totalRequests,
            successful_requests: successfulRequests,
            failed_requests: failedRequests,
            avg_rtt_ms: rtt,
            trust_score: trustScore,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('node_id', nodeId);
      }

      // Insert history record
      await this.supabase!
        .from('mesh_peer_history')
        .insert({
          node_id: nodeId,
          trust_score: trustScore,
          rtt_ms: rtt,
          success,
          timestamp: new Date().toISOString(),
        });

      console.log(`[PeerStorage] Recorded activity for ${nodeId}: ${success ? 'success' : 'failure'}`);
    } catch (error) {
      console.error(`[PeerStorage] Failed to record activity for ${nodeId}:`, error);
    }
  }

  /**
   * Get peer statistics
   */
  async getPeerStats(nodeId: string): Promise<PeerStats | null> {
    if (!this.isPersistenceEnabled()) {
      return null;
    }

    try {
      const { data: peer, error } = await this.supabase!
        .from('mesh_peers')
        .select('*')
        .eq('node_id', nodeId)
        .single();

      if (error) throw error;

      if (!peer) return null;

      // Calculate success rate
      const successRate = peer.total_requests > 0
        ? peer.successful_requests / peer.total_requests
        : 0;

      // Calculate uptime
      const firstSeen = new Date(peer.first_seen).getTime();
      const uptime = (Date.now() - firstSeen) / 1000; // seconds

      // Get trust score trend (last 10 history records)
      const { data: history } = await this.supabase!
        .from('mesh_peer_history')
        .select('trust_score')
        .eq('node_id', nodeId)
        .order('timestamp', { ascending: false })
        .limit(10);

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      
      if (history && history.length >= 2) {
        const recent = history.slice(0, 5).map(h => h.trust_score);
        const older = history.slice(5, 10).map(h => h.trust_score);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
        
        if (recentAvg > olderAvg + 5) trend = 'increasing';
        else if (recentAvg < olderAvg - 5) trend = 'decreasing';
      }

      return {
        node_id: peer.node_id,
        aid_uri: peer.aid_uri,
        success_rate: successRate,
        avg_rtt: peer.avg_rtt_ms,
        uptime,
        total_requests: peer.total_requests,
        trust_score_trend: trend,
      };
    } catch (error) {
      console.error(`[PeerStorage] Failed to get stats for ${nodeId}:`, error);
      return null;
    }
  }

  /**
   * Get peer history
   */
  async getPeerHistory(nodeId: string, limit: number = 100): Promise<PeerHistoryRecord[]> {
    if (!this.isPersistenceEnabled()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase!
        .from('mesh_peer_history')
        .select('*')
        .eq('node_id', nodeId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as PeerHistoryRecord[]) || [];
    } catch (error) {
      console.error(`[PeerStorage] Failed to get history for ${nodeId}:`, error);
      return [];
    }
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  /**
   * Start automatic cleanup (runs every 24 hours via Vercel CRON)
   * Note: This interval is aligned with Vercel free tier CRON limitations
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) return;

    console.log('[PeerStorage] Starting automatic cleanup (24h interval - Vercel CRON)');

    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOldHistory();
    }, 86400000); // 24 hours
  }

  /**
   * Stop automatic cleanup
   */
  private stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[PeerStorage] Stopped automatic cleanup');
    }
  }

  /**
   * Cleanup old history records (older than retention period)
   */
  async cleanupOldHistory(): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      return;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.HISTORY_RETENTION_DAYS);

      const { error } = await this.supabase!
        .from('mesh_peer_history')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) throw error;

      console.log(`[PeerStorage] Cleaned up history older than ${this.HISTORY_RETENTION_DAYS} days`);
    } catch (error) {
      console.error('[PeerStorage] Failed to cleanup old history:', error);
    }
  }

  /**
   * Cleanup inactive peers (not seen in 30 days)
   */
  async cleanupInactivePeers(): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      return;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      // Get inactive peers
      const { data: inactivePeers } = await this.supabase!
        .from('mesh_peers')
        .select('node_id')
        .lt('last_seen', cutoffDate.toISOString());

      if (!inactivePeers || inactivePeers.length === 0) {
        console.log('[PeerStorage] No inactive peers to cleanup');
        return;
      }

      // Delete inactive peers
      for (const peer of inactivePeers) {
        await this.deletePeer(peer.node_id);
      }

      console.log(`[PeerStorage] Cleaned up ${inactivePeers.length} inactive peers`);
    } catch (error) {
      console.error('[PeerStorage] Failed to cleanup inactive peers:', error);
    }
  }

  // =====================================================
  // BULK OPERATIONS
  // =====================================================

  /**
   * Save multiple peers (batch operation)
   */
  async savePeersBulk(nodes: MeshNode[]): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      return;
    }

    console.log(`[PeerStorage] Saving ${nodes.length} peers in bulk...`);

    const promises = nodes.map(node => this.savePeer(node));
    await Promise.allSettled(promises);

    console.log(`[PeerStorage] Bulk save completed`);
  }

  /**
   * Update health metrics from monitor
   */
  async updateHealthMetrics(metrics: PeerHealthMetrics[]): Promise<void> {
    if (!this.isPersistenceEnabled()) {
      return;
    }

    console.log(`[PeerStorage] Updating health metrics for ${metrics.length} peers...`);

    const promises = metrics.map(async (metric) => {
      await this.recordActivity(
        metric.nodeId,
        metric.consecutiveFailures === 0,
        metric.rtt,
        metric.healthScore
      );
    });

    await Promise.allSettled(promises);

    console.log(`[PeerStorage] Health metrics update completed`);
  }

  // =====================================================
  // LIFECYCLE
  // =====================================================

  /**
   * Stop peer storage
   */
  stop(): void {
    console.log('[PeerStorage] Stopping...');
    this.stopAutoCleanup();
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalPeers: number;
    activePeers: number;
    totalHistoryRecords: number;
  }> {
    if (!this.isPersistenceEnabled()) {
      return {
        totalPeers: 0,
        activePeers: 0,
        totalHistoryRecords: 0,
      };
    }

    try {
      // Count total peers
      const { count: totalPeers } = await this.supabase!
        .from('mesh_peers')
        .select('*', { count: 'exact', head: true });

      // Count active peers (seen in last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { count: activePeers } = await this.supabase!
        .from('mesh_peers')
        .select('*', { count: 'exact', head: true })
        .gt('last_seen', oneDayAgo.toISOString());

      // Count total history records
      const { count: totalHistoryRecords } = await this.supabase!
        .from('mesh_peer_history')
        .select('*', { count: 'exact', head: true });

      return {
        totalPeers: totalPeers || 0,
        activePeers: activePeers || 0,
        totalHistoryRecords: totalHistoryRecords || 0,
      };
    } catch (error) {
      console.error('[PeerStorage] Failed to get stats:', error);
      return {
        totalPeers: 0,
        activePeers: 0,
        totalHistoryRecords: 0,
      };
    }
  }
}

// =====================================================
// GLOBAL INSTANCE
// =====================================================

let globalPeerStorage: PeerStorage | null = null;

/**
 * Get or create global peer storage
 */
export function getPeerStorage(): PeerStorage {
  if (!globalPeerStorage) {
    globalPeerStorage = new PeerStorage();
  }
  return globalPeerStorage;
}

// =====================================================
// EXPORTS
// =====================================================

export default PeerStorage;
