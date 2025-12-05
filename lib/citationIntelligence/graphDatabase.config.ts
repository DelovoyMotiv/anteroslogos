/**
 * Graph Database Configuration
 * Configuration for knowledge graph storage
 * 
 * Supports:
 * - PostgreSQL with JSONB (default, using existing Supabase)
 * - Neo4j (optional, for advanced graph queries)
 * - ArangoDB (optional, for multi-model support)
 */

/**
 * Graph database type
 */
export type GraphDatabaseType = 'postgresql' | 'neo4j' | 'arangodb';

/**
 * Graph database configuration
 */
export interface GraphDatabaseConfig {
  type: GraphDatabaseType;
  connection: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
  options: {
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
  };
}

/**
 * Default configuration using PostgreSQL (Supabase)
 * This leverages the existing database with optimized JSONB storage
 */
export const DEFAULT_GRAPH_CONFIG: GraphDatabaseConfig = {
  type: 'postgresql',
  connection: {
    host: process.env.SUPABASE_DB_HOST || 'db.supabase.co',
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    username: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: true,
  },
  options: {
    maxConnections: 20,
    connectionTimeout: 5000,
    queryTimeout: 30000,
  },
};

/**
 * Neo4j configuration (optional)
 * Enable by setting GRAPH_DB_TYPE=neo4j
 */
export const NEO4J_CONFIG: GraphDatabaseConfig = {
  type: 'neo4j',
  connection: {
    host: process.env.NEO4J_HOST || 'localhost',
    port: parseInt(process.env.NEO4J_PORT || '7687'),
    database: process.env.NEO4J_DATABASE || 'neo4j',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
    ssl: process.env.NEO4J_SSL === 'true',
  },
  options: {
    maxConnections: 50,
    connectionTimeout: 5000,
    queryTimeout: 30000,
  },
};

/**
 * ArangoDB configuration (optional)
 * Enable by setting GRAPH_DB_TYPE=arangodb
 */
export const ARANGODB_CONFIG: GraphDatabaseConfig = {
  type: 'arangodb',
  connection: {
    host: process.env.ARANGODB_HOST || 'localhost',
    port: parseInt(process.env.ARANGODB_PORT || '8529'),
    database: process.env.ARANGODB_DATABASE || '_system',
    username: process.env.ARANGODB_USERNAME || 'root',
    password: process.env.ARANGODB_PASSWORD || '',
    ssl: process.env.ARANGODB_SSL === 'true',
  },
  options: {
    maxConnections: 30,
    connectionTimeout: 5000,
    queryTimeout: 30000,
  },
};

/**
 * Get active graph database configuration
 */
export function getGraphDatabaseConfig(): GraphDatabaseConfig {
  const dbType = (process.env.GRAPH_DB_TYPE || 'postgresql') as GraphDatabaseType;

  switch (dbType) {
    case 'neo4j':
      return NEO4J_CONFIG;
    case 'arangodb':
      return ARANGODB_CONFIG;
    case 'postgresql':
    default:
      return DEFAULT_GRAPH_CONFIG;
  }
}

/**
 * Graph database adapter interface
 * Provides a unified interface regardless of underlying database
 */
export interface GraphDatabaseAdapter {
  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Create an entity node
   */
  createEntity(entity: {
    id: string;
    name: string;
    type: string;
    properties: Record<string, any>;
  }): Promise<void>;

  /**
   * Create a relationship between entities
   */
  createRelationship(relationship: {
    sourceId: string;
    targetId: string;
    type: string;
    properties: Record<string, any>;
  }): Promise<void>;

  /**
   * Query entities by type
   */
  queryEntitiesByType(type: string): Promise<any[]>;

  /**
   * Query relationships for an entity
   */
  queryRelationships(entityId: string, direction?: 'in' | 'out' | 'both'): Promise<any[]>;

  /**
   * Execute a custom query
   */
  executeQuery(query: string, params?: Record<string, any>): Promise<any>;

  /**
   * Calculate PageRank for entities
   */
  calculatePageRank(): Promise<Map<string, number>>;

  /**
   * Find shortest path between entities
   */
  findShortestPath(sourceId: string, targetId: string): Promise<any[]>;

  /**
   * Detect communities/clusters
   */
  detectCommunities(): Promise<Map<string, string[]>>;
}

/**
 * Graph query builder
 * Provides a fluent interface for building graph queries
 */
export class GraphQueryBuilder {
  private conditions: string[] = [];
  private returns: string[] = [];
  private orderBy: string[] = [];
  private limitValue?: number;

  match(pattern: string): this {
    this.conditions.push(`MATCH ${pattern}`);
    return this;
  }

  where(condition: string): this {
    this.conditions.push(`WHERE ${condition}`);
    return this;
  }

  return(...fields: string[]): this {
    this.returns.push(...fields);
    return this;
  }

  order(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderBy.push(`${field} ${direction}`);
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  build(): string {
    let query = this.conditions.join('\n');

    if (this.returns.length > 0) {
      query += `\nRETURN ${this.returns.join(', ')}`;
    }

    if (this.orderBy.length > 0) {
      query += `\nORDER BY ${this.orderBy.join(', ')}`;
    }

    if (this.limitValue !== undefined) {
      query += `\nLIMIT ${this.limitValue}`;
    }

    return query;
  }
}

/**
 * Graph database metrics
 */
export interface GraphMetrics {
  totalEntities: number;
  totalRelationships: number;
  entitiesByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  averageDegree: number;
  density: number;
  connectedComponents: number;
}

/**
 * Graph database health check
 */
export interface GraphHealthCheck {
  connected: boolean;
  responseTime: number;
  version: string;
  metrics: GraphMetrics;
}

/**
 * Export graph data formats
 */
export type GraphExportFormat = 'graphml' | 'gexf' | 'json' | 'cypher';

/**
 * Graph export options
 */
export interface GraphExportOptions {
  format: GraphExportFormat;
  includeProperties: boolean;
  includeMetadata: boolean;
  filterEntityTypes?: string[];
  filterRelationshipTypes?: string[];
}
