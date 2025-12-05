/**
 * PostgreSQL Graph Database Adapter
 * Implements graph database operations using PostgreSQL/Supabase
 * 
 * This adapter leverages the existing Supabase infrastructure
 * and provides graph-like operations on relational data.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import type {
  GraphDatabaseAdapter,
  GraphMetrics,
  GraphHealthCheck,
} from './graphDatabase.config';
import type {
  Entity,
  Relationship,
} from '../../types/citation-intelligence.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * PostgreSQL Graph Adapter
 * Uses Supabase tables for graph storage
 */
export class PostgresGraphAdapter implements GraphDatabaseAdapter {
  private supabase = createClient<Database>(supabaseUrl, supabaseKey);

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    try {
      // Test connection with a simple query
      const { error } = await (this.supabase as any).from('kg_entities').select('id').limit(1);
      if (error) throw error;
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    // Supabase client doesn't require explicit disconnection
  }

  /**
   * Create an entity node
   */
  async createEntity(entity: {
    id: string;
    name: string;
    type: string;
    properties: Record<string, any>;
  }): Promise<void> {
    const { error } = await (this.supabase as any).from('kg_entities').insert({
      id: entity.id,
      entity_name: entity.name,
      entity_type: entity.type,
      properties: entity.properties,
      url: entity.properties.url || '',
      user_id: entity.properties.userId || null,
    });

    if (error) {
      throw new Error(`Failed to create entity: ${error.message}`);
    }
  }

  /**
   * Create a relationship between entities
   */
  async createRelationship(relationship: {
    sourceId: string;
    targetId: string;
    type: string;
    properties: Record<string, any>;
  }): Promise<void> {
    const { error } = await (this.supabase as any).from('kg_relationships').insert({
      source_entity_id: relationship.sourceId,
      target_entity_id: relationship.targetId,
      relationship_type: relationship.type,
      properties: relationship.properties,
      url: relationship.properties.url || '',
      user_id: relationship.properties.userId || null,
      strength: relationship.properties.strength || 0.5,
      confidence: relationship.properties.confidence || 0.5,
    });

    if (error) {
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }

  /**
   * Query entities by type
   */
  async queryEntitiesByType(type: string): Promise<Entity[]> {
    const { data, error } = await (this.supabase as any)
      .from('kg_entities')
      .select('*')
      .eq('entity_type', type);

    if (error) {
      throw new Error(`Failed to query entities: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * Query relationships for an entity
   */
  async queryRelationships(
    entityId: string,
    direction: 'in' | 'out' | 'both' = 'both'
  ): Promise<Relationship[]> {
    let query = (this.supabase as any).from('kg_relationships').select('*');

    if (direction === 'out') {
      query = query.eq('source_entity_id', entityId);
    } else if (direction === 'in') {
      query = query.eq('target_entity_id', entityId);
    } else {
      query = query.or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query relationships: ${error.message}`);
    }

    return (data || []).map(this.mapToRelationship);
  }

  /**
   * Execute a custom query
   */
  async executeQuery(query: string, params?: Record<string, any>): Promise<any> {
    // For PostgreSQL, we use RPC functions
    const { data, error } = await (this.supabase as any).rpc(query, params || {});

    if (error) {
      throw new Error(`Failed to execute query: ${error.message}`);
    }

    return data;
  }

  /**
   * Calculate PageRank for entities
   * Simplified implementation using relationship counts
   */
  async calculatePageRank(): Promise<Map<string, number>> {
    const { data: entities, error: entitiesError } = await (this.supabase as any)
      .from('kg_entities')
      .select('id');

    if (entitiesError || !entities) {
      throw new Error(`Failed to fetch entities: ${entitiesError?.message}`);
    }

    const pageRank = new Map<string, number>();

    // Calculate degree centrality as a proxy for PageRank
    for (const entity of entities) {
      const { data: inbound, error: inError } = await (this.supabase as any)
        .from('kg_relationships')
        .select('id')
        .eq('target_entity_id', entity.id);

      const { data: outbound, error: outError } = await (this.supabase as any)
        .from('kg_relationships')
        .select('id')
        .eq('source_entity_id', entity.id);

      if (inError || outError) continue;

      const inDegree = inbound?.length || 0;
      const outDegree = outbound?.length || 0;
      const totalDegree = inDegree + outDegree;

      // Normalize by total entities
      pageRank.set(entity.id, totalDegree / entities.length);
    }

    return pageRank;
  }

  /**
   * Find shortest path between entities
   * Uses breadth-first search
   */
  async findShortestPath(sourceId: string, targetId: string): Promise<any[]> {
    if (sourceId === targetId) {
      return [sourceId];
    }

    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: sourceId, path: [sourceId] }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // Get neighbors
      const relationships = await this.queryRelationships(current.id, 'out');

      for (const rel of relationships) {
        const nextId = rel.targetId;

        if (nextId === targetId) {
          return [...current.path, nextId];
        }

        if (!visited.has(nextId)) {
          queue.push({
            id: nextId,
            path: [...current.path, nextId],
          });
        }
      }
    }

    return []; // No path found
  }

  /**
   * Detect communities/clusters
   * Simplified implementation using connected components
   */
  async detectCommunities(): Promise<Map<string, string[]>> {
    const { data: entities, error } = await (this.supabase as any)
      .from('kg_entities')
      .select('id');

    if (error || !entities) {
      throw new Error(`Failed to fetch entities: ${error?.message}`);
    }

    const communities = new Map<string, string[]>();
    const visited = new Set<string>();
    let communityId = 0;

    // DFS to find connected components
    for (const entity of entities) {
      if (visited.has(entity.id)) continue;

      const component: string[] = [];
      const stack = [entity.id];

      while (stack.length > 0) {
        const currentId = stack.pop()!;

        if (visited.has(currentId)) continue;
        visited.add(currentId);
        component.push(currentId);

        const relationships = await this.queryRelationships(currentId, 'both');
        for (const rel of relationships) {
          const neighborId =
            rel.sourceId === currentId ? rel.targetId : rel.sourceId;
          if (!visited.has(neighborId)) {
            stack.push(neighborId);
          }
        }
      }

      communities.set(`community_${communityId++}`, component);
    }

    return communities;
  }

  /**
   * Get graph metrics
   */
  async getMetrics(): Promise<GraphMetrics> {
    // Count entities
    const { count: totalEntities } = await (this.supabase as any)
      .from('kg_entities')
      .select('*', { count: 'exact', head: true });

    // Count relationships
    const { count: totalRelationships } = await (this.supabase as any)
      .from('kg_relationships')
      .select('*', { count: 'exact', head: true });

    // Count entities by type
    const { data: entityTypes } = await (this.supabase as any)
      .from('kg_entities')
      .select('entity_type');

    const entitiesByType: Record<string, number> = {};
    entityTypes?.forEach((row: any) => {
      entitiesByType[row.entity_type] = (entitiesByType[row.entity_type] || 0) + 1;
    });

    // Count relationships by type
    const { data: relationshipTypes } = await (this.supabase as any)
      .from('kg_relationships')
      .select('relationship_type');

    const relationshipsByType: Record<string, number> = {};
    relationshipTypes?.forEach((row: any) => {
      relationshipsByType[row.relationship_type] =
        (relationshipsByType[row.relationship_type] || 0) + 1;
    });

    // Calculate average degree
    const averageDegree =
      totalEntities && totalEntities > 0
        ? (2 * (totalRelationships || 0)) / totalEntities
        : 0;

    // Calculate density
    const maxEdges =
      totalEntities && totalEntities > 1
        ? (totalEntities * (totalEntities - 1)) / 2
        : 1;
    const density = (totalRelationships || 0) / maxEdges;

    // Detect connected components
    const communities = await this.detectCommunities();

    return {
      totalEntities: totalEntities || 0,
      totalRelationships: totalRelationships || 0,
      entitiesByType,
      relationshipsByType,
      averageDegree,
      density,
      connectedComponents: communities.size,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<GraphHealthCheck> {
    const startTime = Date.now();

    try {
      await this.connect();
      const metrics = await this.getMetrics();
      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime,
        version: 'PostgreSQL 15+ (Supabase)',
        metrics,
      };
    } catch {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        version: 'Unknown',
        metrics: {
          totalEntities: 0,
          totalRelationships: 0,
          entitiesByType: {},
          relationshipsByType: {},
          averageDegree: 0,
          density: 0,
          connectedComponents: 0,
        },
      };
    }
  }

  /**
   * Map database row to Entity
   */
  private mapToEntity(row: any): Entity {
    return {
      id: row.id,
      name: row.entity_name,
      type: row.entity_type,
      properties: row.properties || {},
      mentions: row.mentions_count || 0,
      firstSeen: new Date(row.first_seen),
      lastSeen: new Date(row.last_seen),
    };
  }

  /**
   * Map database row to Relationship
   */
  private mapToRelationship(row: any): Relationship {
    return {
      id: row.id,
      sourceId: row.source_entity_id,
      targetId: row.target_entity_id,
      type: row.relationship_type,
      properties: row.properties || {},
      strength: row.strength || 0.5,
      confidence: row.confidence || 0.5,
    };
  }
}

/**
 * Singleton instance
 */
export const postgresGraphAdapter = new PostgresGraphAdapter();
