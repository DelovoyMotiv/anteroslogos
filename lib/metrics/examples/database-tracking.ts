/**
 * Example: Database Query Tracking
 * 
 * Shows how to track database query metrics
 */

import { recordDbQuery, dbConnectionPoolSize } from '../index';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseQueryResult, DatabaseQueryFunction } from '../../../types/lib.types';

// Suppress unused variable warning for example code
// @ts-ignore

/**
 * Wrapper for Supabase queries with metrics
 */
export async function queryWithMetrics<T>(
  _supabase: SupabaseClient,
  table: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  queryFn: DatabaseQueryFunction<T>
): Promise<SupabaseQueryResult<T>> {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const duration = (Date.now() - startTime) / 1000;
    
    // Record successful query
    recordDbQuery(operation, table, duration);
    
    if (result.error) {
      // Record error
      recordDbQuery(operation, table, duration, result.error.code || 'unknown');
    }
    
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    const errorType = error instanceof Error ? error.constructor.name : 'unknown';
    
    // Record error
    recordDbQuery(operation, table, duration, errorType);
    
    throw error;
  }
}

/**
 * Example usage
 */
// @ts-ignore - supabase used in function body
export async function getUserById(supabase: SupabaseClient, userId: string) {
  return queryWithMetrics(
    supabase,
    'users',
    'SELECT',
    async () => supabase.from('users').select('*').eq('id', userId).single()
  );
}

export async function createUser(supabase: SupabaseClient, userData: Record<string, any>) {
  return queryWithMetrics(
    supabase,
    'users',
    'INSERT',
    async () => supabase.from('users').insert(userData).select().single()
  );
}

/**
 * Monitor connection pool
 */
export function updateConnectionPoolMetrics(
  idle: number,
  active: number,
  waiting: number
) {
  dbConnectionPoolSize.set({ state: 'idle' }, idle);
  dbConnectionPoolSize.set({ state: 'active' }, active);
  dbConnectionPoolSize.set({ state: 'waiting' }, waiting);
}
