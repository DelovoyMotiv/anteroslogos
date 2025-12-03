/**
 * Common Database Helper Utilities
 * Extracted from duplicated patterns across database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Standard database query result
 */
export interface DbQueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Standard database list result with pagination
 */
export interface DbListResult<T> {
  data: T[];
  total: number;
  error: Error | null;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Generic CRUD operations wrapper
 */
export class CrudOperations<T extends { id: string }> {
  constructor(
    private client: SupabaseClient,
    private tableName: string
  ) {}

  /**
   * Get single record by ID
   */
  async getById(id: string): Promise<DbQueryResult<T>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * List records with pagination
   */
  async list(options: PaginationOptions = {}): Promise<DbListResult<T>> {
    const { limit = 50, offset = 0 } = options;

    try {
      // Get total count
      const { count, error: countError } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Get paginated data
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: (data as T[]) || [],
        total: count || 0,
        error: null,
      };
    } catch (error) {
      return { data: [], total: 0, error: error as Error };
    }
  }

  /**
   * Create new record
   */
  async create(record: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<DbQueryResult<T>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update existing record
   */
  async update(id: string, updates: Partial<Omit<T, 'id' | 'created_at'>>): Promise<DbQueryResult<T>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete record
   */
  async delete(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Check if record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }
}

/**
 * Execute database transaction with retry logic
 */
export async function withTransaction<T>(
  client: SupabaseClient,
  operation: (client: SupabaseClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation(client);
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable (e.g., deadlock, timeout)
      const isRetryable = 
        error instanceof Error &&
        (error.message.includes('deadlock') ||
         error.message.includes('timeout') ||
         error.message.includes('connection'));

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Batch insert records
 */
export async function batchInsert<T>(
  client: SupabaseClient,
  tableName: string,
  records: T[],
  batchSize: number = 100
): Promise<{ success: boolean; inserted: number; error: Error | null }> {
  let inserted = 0;

  try {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await client.from(tableName).insert(batch);

      if (error) throw error;
      inserted += batch.length;
    }

    return { success: true, inserted, error: null };
  } catch (error) {
    return { success: false, inserted, error: error as Error };
  }
}

/**
 * Soft delete record (set deleted_at timestamp)
 */
export async function softDelete(
  client: SupabaseClient,
  tableName: string,
  id: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await client
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Restore soft-deleted record
 */
export async function restoreSoftDeleted(
  client: SupabaseClient,
  tableName: string,
  id: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await client
      .from(tableName)
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Count records with optional filter
 */
export async function countRecords(
  client: SupabaseClient,
  tableName: string,
  filter?: Record<string, unknown>
): Promise<{ count: number; error: Error | null }> {
  try {
    let query = client.from(tableName).select('*', { count: 'exact', head: true });

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error) {
    return { count: 0, error: error as Error };
  }
}
