/**
 * Database Query Analyzer
 * Identifies N+1 queries, missing indexes, and slow queries
 * Production-ready with EXPLAIN ANALYZE integration
 */

import { supabase } from '../supabase';

export interface QueryAnalysisResult {
  query: string;
  executionTime: number;
  planType: 'seq_scan' | 'index_scan' | 'bitmap_scan' | 'unknown';
  recommendations: IndexRecommendation[];
  estimatedImprovement: number;
  isNPlusOne: boolean;
  affectedTables: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  indexType: 'btree' | 'gin' | 'gist' | 'hash';
  reason: string;
  estimatedCost: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface NPlusOnePattern {
  location: string;
  description: string;
  queryCount: number;
  suggestedFix: string;
}

/**
 * Analyze a query using EXPLAIN ANALYZE
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysisResult> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    // Execute EXPLAIN ANALYZE
    const { data, error } = await supabase.rpc('explain_query', {
      query_text: query
    } as any);

    if (error) {
      console.error('Query analysis error:', error);
      throw error;
    }

    // Parse EXPLAIN output
    const planType = detectPlanType(data);
    const executionTime = extractExecutionTime(data);
    const affectedTables = extractTables(query);
    const recommendations = generateRecommendations(data, query, affectedTables);
    const isNPlusOne = false; // Detected at runtime, not from EXPLAIN

    return {
      query,
      executionTime,
      planType,
      recommendations,
      estimatedImprovement: calculateImprovement(recommendations),
      isNPlusOne,
      affectedTables
    };
  } catch (error) {
    console.error('analyzeQuery error:', error);
    throw error;
  }
}

/**
 * Detect plan type from EXPLAIN output
 */
function detectPlanType(explainOutput: unknown): 'seq_scan' | 'index_scan' | 'bitmap_scan' | 'unknown' {
  const output = JSON.stringify(explainOutput).toLowerCase();
  
  if (output.includes('seq scan')) return 'seq_scan';
  if (output.includes('index scan') || output.includes('index only scan')) return 'index_scan';
  if (output.includes('bitmap')) return 'bitmap_scan';
  
  return 'unknown';
}

/**
 * Extract execution time from EXPLAIN ANALYZE output
 */
function extractExecutionTime(explainOutput: unknown): number {
  const output = JSON.stringify(explainOutput);
  const match = output.match(/Execution Time: ([\d.]+) ms/i);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Extract table names from query
 */
function extractTables(query: string): string[] {
  const tables: string[] = [];
  const fromMatch = query.match(/FROM\s+([a-z_]+)/gi);
  const joinMatch = query.match(/JOIN\s+([a-z_]+)/gi);
  
  if (fromMatch) {
    fromMatch.forEach(match => {
      const table = match.replace(/FROM\s+/i, '').trim();
      if (!tables.includes(table)) tables.push(table);
    });
  }
  
  if (joinMatch) {
    joinMatch.forEach(match => {
      const table = match.replace(/JOIN\s+/i, '').trim();
      if (!tables.includes(table)) tables.push(table);
    });
  }
  
  return tables;
}

/**
 * Generate index recommendations based on EXPLAIN output
 */
function generateRecommendations(
  explainOutput: unknown,
  query: string,
  tables: string[]
): IndexRecommendation[] {
  const recommendations: IndexRecommendation[] = [];
  const output = JSON.stringify(explainOutput).toLowerCase();
  
  // Check for sequential scans
  if (output.includes('seq scan')) {
    // Extract WHERE clause columns
    const whereColumns = extractWhereColumns(query);
    const orderByColumns = extractOrderByColumns(query);
    
    tables.forEach(table => {
      if (whereColumns.length > 0) {
        recommendations.push({
          table,
          columns: whereColumns,
          indexType: 'btree',
          reason: 'Sequential scan detected on WHERE clause',
          estimatedCost: 100,
          priority: 'high'
        });
      }
      
      if (orderByColumns.length > 0) {
        recommendations.push({
          table,
          columns: orderByColumns,
          indexType: 'btree',
          reason: 'Sequential scan detected on ORDER BY clause',
          estimatedCost: 80,
          priority: 'medium'
        });
      }
    });
  }
  
  // Check for JSONB operations
  if (query.toLowerCase().includes('jsonb') || query.includes('->') || query.includes('->>')) {
    const jsonbColumns = extractJsonbColumns(query);
    tables.forEach(table => {
      if (jsonbColumns.length > 0) {
        recommendations.push({
          table,
          columns: jsonbColumns,
          indexType: 'gin',
          reason: 'JSONB operations detected, GIN index recommended',
          estimatedCost: 150,
          priority: 'high'
        });
      }
    });
  }
  
  return recommendations;
}

/**
 * Extract columns from WHERE clause
 */
function extractWhereColumns(query: string): string[] {
  const columns: string[] = [];
  const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/is);
  
  if (whereMatch) {
    const whereClause = whereMatch[1];
    // Simple extraction: column = value or column IN (...)
    const columnMatches = whereClause.match(/([a-z_]+)\s*(?:=|IN|>|<|>=|<=|LIKE|ILIKE)/gi);
    
    if (columnMatches) {
      columnMatches.forEach(match => {
        const column = match.replace(/\s*(?:=|IN|>|<|>=|<=|LIKE|ILIKE).*/i, '').trim();
        if (!columns.includes(column)) columns.push(column);
      });
    }
  }
  
  return columns;
}

/**
 * Extract columns from ORDER BY clause
 */
function extractOrderByColumns(query: string): string[] {
  const columns: string[] = [];
  const orderByMatch = query.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/is);
  
  if (orderByMatch) {
    const orderByClause = orderByMatch[1];
    const columnMatches = orderByClause.match(/([a-z_]+)(?:\s+(?:ASC|DESC))?/gi);
    
    if (columnMatches) {
      columnMatches.forEach(match => {
        const column = match.replace(/\s+(?:ASC|DESC)/i, '').trim();
        if (!columns.includes(column) && column !== 'asc' && column !== 'desc') {
          columns.push(column);
        }
      });
    }
  }
  
  return columns;
}

/**
 * Extract JSONB columns
 */
function extractJsonbColumns(query: string): string[] {
  const columns: string[] = [];
  const jsonbMatches = query.match(/([a-z_]+)(?:->|->>)/gi);
  
  if (jsonbMatches) {
    jsonbMatches.forEach(match => {
      const column = match.replace(/(?:->|->>).*/g, '').trim();
      if (!columns.includes(column)) columns.push(column);
    });
  }
  
  return columns;
}

/**
 * Calculate estimated improvement percentage
 */
function calculateImprovement(recommendations: IndexRecommendation[]): number {
  if (recommendations.length === 0) return 0;
  
  const totalCost = recommendations.reduce((sum, rec) => sum + rec.estimatedCost, 0);
  return Math.min(95, totalCost / recommendations.length);
}

/**
 * Scan codebase for N+1 query patterns
 */
export function detectNPlusOnePatterns(code: string, filePath: string): NPlusOnePattern[] {
  const patterns: NPlusOnePattern[] = [];
  
  // Pattern 1: Loop with database query inside
  const loopQueryPattern = /(?:for|forEach|map)\s*\([^)]+\)\s*(?:=>)?\s*{[^}]*(?:supabase|\.from\(|\.select\()/gs;
  const matches = code.match(loopQueryPattern);
  
  if (matches && matches.length > 0) {
    patterns.push({
      location: filePath,
      description: 'Database query inside loop detected',
      queryCount: matches.length,
      suggestedFix: 'Use JOIN or eager loading with .select() to fetch related data in single query'
    });
  }
  
  // Pattern 2: Multiple sequential queries
  const sequentialPattern = /(?:await\s+supabase[^;]+;[\s\n]*){3,}/g;
  const sequentialMatches = code.match(sequentialPattern);
  
  if (sequentialMatches && sequentialMatches.length > 0) {
    patterns.push({
      location: filePath,
      description: 'Multiple sequential database queries detected',
      queryCount: sequentialMatches.length,
      suggestedFix: 'Batch queries using Promise.all() or use single query with JOINs'
    });
  }
  
  return patterns;
}

/**
 * Generate migration SQL for recommended indexes
 */
export function generateIndexMigration(recommendations: IndexRecommendation[]): string {
  let sql = `-- Database Index Optimization Migration\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Auto-generated based on query analysis\n\n`;
  
  recommendations.forEach((rec) => {
    const indexName = `idx_${rec.table}_${rec.columns.join('_')}`;
    const columnList = rec.columns.join(', ');
    
    sql += `-- ${rec.reason}\n`;
    sql += `-- Priority: ${rec.priority}, Estimated improvement: ${rec.estimatedCost}%\n`;
    
    if (rec.indexType === 'gin') {
      sql += `CREATE INDEX IF NOT EXISTS ${indexName} ON public.${rec.table} USING GIN (${columnList});\n\n`;
    } else {
      sql += `CREATE INDEX IF NOT EXISTS ${indexName} ON public.${rec.table}(${columnList});\n\n`;
    }
  });
  
  return sql;
}
