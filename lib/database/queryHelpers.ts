/**
 * Type-Safe Supabase Query Helpers
 * 
 * Production-grade wrappers for Supabase queries that ensure type safety
 * and proper error handling. All queries validate results using Zod schemas
 * before returning data to the application.
 * 
 * @module lib/database/queryHelpers
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { z } from 'zod';
import { parseDbResult, parseDbResults } from '@/lib/utils/typeGuards';

/**
 * Standard database operation result type
 */
export type DbResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Type-safe wrapper for Supabase select queries
 * 
 * Executes a select query and validates all results using the provided Zod schema.
 * Invalid rows are filtered out and logged.
 * 
 * @template T - The expected result type
 * @param client - Supabase client instance
 * @param table - Table name to query
 * @param schema - Zod schema for validation
 * @param filters - Optional key-value filters
 * @returns Promise resolving to DbResult with typed data array
 * 
 * @example
 * ```typescript
 * const { data, error } = await selectQuery(
 *   supabase,
 *   'api_keys',
 *   APIKeySchema,
 *   { user_id: userId, is_active: true }
 * );
 * 
 * if (error) {
 *   console.error('Query failed:', error);
 *   return;
 * }
 * 
 * // data is typed as APIKey[]
 * data.forEach(key => console.log(key.name));
 * ```
 */
export async function selectQuery<T>(
  client: SupabaseClient<Database>,
  table: string,
  schema: z.ZodSchema<T>,
  filters?: Record<string, unknown>
): Promise<DbResult<T[]>> {
  try {
    let query = client.from(table).select('*');
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    if (!data) {
      return { data: [], error: null };
    }
    
    // Validate and parse each row
    const parsed = parseDbResults(data, schema);
    
    // Log if some rows failed validation
    if (parsed.length < data.length) {
      console.warn(
        `[selectQuery] ${data.length - parsed.length} rows failed validation for table ${table}`
      );
    }
    
    return { data: parsed, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Type-safe wrapper for Supabase single row select
 * 
 * @template T - The expected result type
 * @param client - Supabase client instance
 * @param table - Table name to query
 * @param schema - Zod schema for validation
 * @param filters - Key-value filters
 * @returns Promise resolving to DbResult with single typed object
 * 
 * @example
 * ```typescript
 * const { data, error } = await selectSingle(
 *   supabase,
 *   'api_keys',
 *   APIKeySchema,
 *   { id: keyId }
 * );
 * ```
 */
export async function selectSingle<T>(
  client: SupabaseClient<Database>,
  table: string,
  schema: z.ZodSchema<T>,
  filters: Record<string, unknown>
): Promise<DbResult<T>> {
  try {
    let query = client.from(table).select('*');
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query.single();
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    if (!data) {
      return { data: null, error: new Error('No data returned') };
    }
    
    // Validate and parse
    const parsed = parseDbResult(data, schema);
    
    if (!parsed) {
      return {
        data: null,
        error: new Error('Row failed schema validation')
      };
    }
    
    return { data: parsed, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Type-safe wrapper for Supabase single row insert
 * 
 * @template T - The expected result type
 * @param client - Supabase client instance
 * @param table - Table name to insert into
 * @param data - Single data object to insert
 * @param schema - Zod schema for validation of returned data
 * @returns Promise resolving to DbResult with single inserted object
 * 
 * @example
 * ```typescript
 * const { data, error } = await insertSingle(
 *   supabase,
 *   'api_keys',
 *   { user_id: userId, name: 'My Key', key_hash: hash },
 *   APIKeySchema
 * );
 * ```
 */
export async function insertSingle<T>(
  client: SupabaseClient<Database>,
  table: string,
  data: Record<string, unknown>,
  schema: z.ZodSchema<T>
): Promise<DbResult<T>> {
  try {
    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    if (!result) {
      return { data: null, error: new Error('No data returned from insert') };
    }
    
    const parsed = parseDbResult(result, schema);
    if (!parsed) {
      return {
        data: null,
        error: new Error('Inserted row failed schema validation')
      };
    }
    
    return { data: parsed, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Type-safe wrapper for Supabase insert queries
 * 
 * @template T - The expected result type
 * @param client - Supabase client instance
 * @param table - Table name to insert into
 * @param data - Data to insert (can be single object or array)
 * @param schema - Zod schema for validation of returned data
 * @returns Promise resolving to DbResult with inserted data
 * 
 * @example
 * ```typescript
 * const { data, error } = await insertQuery(
 *   supabase,
 *   'api_keys',
 *   { user_id: userId, name: 'My Key', key_hash: hash },
 *   APIKeySchema
 * );
 * ```
 */
export async function insertQuery<T>(
  client: SupabaseClient<Database>,
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  schema: z.ZodSchema<T>
): Promise<DbResult<T | T[]>> {
  try {
    const isArray = Array.isArray(data);
    
    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select();
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    if (!result) {
      return { data: null, error: new Error('No data returned from insert') };
    }
    
    // Parse results
    if (isArray) {
      const parsed = parseDbResults(result, schema);
      return { data: parsed, error: null };
    } else {
      const parsed = parseDbResult(result[0], schema);
      if (!parsed) {
        return {
          data: null,
          error: new Error('Inserted row failed schema validation')
        };
      }
      return { data: parsed, error: null };
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Type-safe wrapper for Supabase update queries
 * 
 * @template T - The expected result type
 * @param client - Supabase client instance
 * @param table - Table name to update
 * @param updates - Fields to update
 * @param filters - Filters to identify rows to update
 * @param schema - Zod schema for validation
 * @returns Promise resolving to DbResult with updated data
 * 
 * @example
 * ```typescript
 * const { data, error } = await updateQuery(
 *   supabase,
 *   'api_keys',
 *   { last_used_at: new Date().toISOString() },
 *   { id: keyId },
 *   APIKeySchema
 * );
 * ```
 */
export async function updateQuery<T>(
  client: SupabaseClient<Database>,
  table: string,
  updates: Record<string, unknown>,
  filters: Record<string, unknown>,
  schema: z.ZodSchema<T>
): Promise<DbResult<T[]>> {
  try {
    let query = client.from(table).update(updates);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query.select();
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    if (!data) {
      return { data: [], error: null };
    }
    
    // Validate and parse
    const parsed = parseDbResults(data, schema);
    
    return { data: parsed, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Type-safe wrapper for Supabase delete queries
 * 
 * @param client - Supabase client instance
 * @param table - Table name to delete from
 * @param filters - Filters to identify rows to delete
 * @returns Promise resolving to DbResult with success status
 * 
 * @example
 * ```typescript
 * const { error } = await deleteQuery(
 *   supabase,
 *   'api_keys',
 *   { id: keyId }
 * );
 * ```
 */
export async function deleteQuery(
  client: SupabaseClient<Database>,
  table: string,
  filters: Record<string, unknown>
): Promise<DbResult<boolean>> {
  try {
    let query = client.from(table).delete();
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { error } = await query;
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: true, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Type-safe wrapper for Supabase RPC calls
 * 
 * @template T - The expected result type
 * @param client - Supabase client instance
 * @param functionName - Name of the database function
 * @param params - Function parameters
 * @param schema - Zod schema for validation
 * @returns Promise resolving to DbResult with function result
 * 
 * @example
 * ```typescript
 * const { data, error } = await rpcQuery(
 *   supabase,
 *   'get_user_stats',
 *   { user_id: userId },
 *   UserStatsSchema
 * );
 * ```
 */
export async function rpcQuery<T>(
  client: SupabaseClient<Database>,
  functionName: string,
  params: Record<string, unknown>,
  schema: z.ZodSchema<T>
): Promise<DbResult<T>> {
  try {
    const { data, error } = await client.rpc(functionName, params);
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    if (!data) {
      return { data: null, error: new Error('No data returned from RPC') };
    }
    
    // Validate and parse
    const parsed = parseDbResult(data, schema);
    
    if (!parsed) {
      return {
        data: null,
        error: new Error('RPC result failed schema validation')
      };
    }
    
    return { data: parsed, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
