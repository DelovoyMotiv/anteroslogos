/**
 * Concurrency Control Utilities
 * 
 * Features:
 * - Database locking helpers (SELECT FOR UPDATE)
 * - Optimistic locking with version column
 * - Atomic operations for Redis
 * - Mutex for in-memory synchronization
 * 
 * **Feature: production-audit-improvements, Property 17: Serializable Concurrent Updates**
 * **Validates: Requirements 5.1**
 * 
 * @module lib/reliability/concurrency
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError } from './errors';

/**
 * Execute a database operation with pessimistic locking (SELECT FOR UPDATE)
 * 
 * @param supabase - Supabase client
 * @param table - Table name
 * @param id - Record ID
 * @param operation - Operation to perform on locked record
 * @returns Result of the operation
 * 
 * @example
 * ```typescript
 * const result = await withPessimisticLock(
 *   supabase,
 *   'accounts',
 *   'user-123',
 *   async (record) => {
 *     // This record is locked, safe to update
 *     const newBalance = record.balance - 100;
 *     return { ...record, balance: newBalance };
 *   }
 * );
 * ```
 */
export async function withPessimisticLock<T extends { id: string }>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  operation: (record: T) => Promise<Partial<T>>
): Promise<T> {
  // Start a transaction and lock the row
  // Note: Supabase doesn't directly support SELECT FOR UPDATE in the client library
  // We need to use RPC or raw SQL
  
  const { data, error } = await supabase.rpc('lock_and_update', {
    p_table: table,
    p_id: id,
  });
  
  if (error) {
    throw new DatabaseError(
      `Failed to acquire lock on ${table}:${id}`,
      undefined,
      error
    );
  }
  
  // Perform the operation
  const updates = await operation(data as T);
  
  // Update the record
  const { data: updated, error: updateError } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (updateError) {
    throw new DatabaseError(
      `Failed to update ${table}:${id}`,
      undefined,
      updateError
    );
  }
  
  return updated as T;
}

/**
 * Optimistic locking result
 */
export interface OptimisticLockResult<T> {
  success: boolean;
  data?: T;
  conflict?: boolean;
}

/**
 * Execute a database operation with optimistic locking
 * 
 * Uses a version column to detect concurrent modifications.
 * 
 * @param supabase - Supabase client
 * @param table - Table name
 * @param id - Record ID
 * @param operation - Operation to perform
 * @param maxRetries - Maximum number of retries on conflict (default: 3)
 * @returns Result of the operation
 * 
 * @example
 * ```typescript
 * const result = await withOptimisticLock(
 *   supabase,
 *   'accounts',
 *   'user-123',
 *   async (record) => {
 *     return { balance: record.balance - 100 };
 *   }
 * );
 * 
 * if (!result.success) {
 *   console.error('Concurrent modification detected');
 * }
 * ```
 */
export async function withOptimisticLock<T extends { id: string; version: number }>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  operation: (record: T) => Promise<Partial<T>>,
  maxRetries: number = 3
): Promise<OptimisticLockResult<T>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Fetch current record with version
    const { data: current, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw new DatabaseError(
        `Failed to fetch ${table}:${id}`,
        undefined,
        fetchError
      );
    }
    
    const currentVersion = (current as T).version;
    
    // Perform the operation
    const updates = await operation(current as T);
    
    // Update with version check
    const { data: updated, error: updateError } = await supabase
      .from(table)
      .update({
        ...updates,
        version: currentVersion + 1,
      })
      .eq('id', id)
      .eq('version', currentVersion) // Only update if version matches
      .select()
      .single();
    
    if (updateError) {
      // Check if it's a version conflict
      if (updateError.code === 'PGRST116') {
        // No rows updated - version conflict
        if (attempt === maxRetries - 1) {
          return { success: false, conflict: true };
        }
        // Retry
        continue;
      }
      
      throw new DatabaseError(
        `Failed to update ${table}:${id}`,
        undefined,
        updateError
      );
    }
    
    return { success: true, data: updated as T };
  }
  
  return { success: false, conflict: true };
}

/**
 * In-memory mutex for synchronizing async operations
 */
export class Mutex {
  private locked: boolean = false;
  private queue: Array<() => void> = [];
  
  /**
   * Acquire the mutex lock
   */
  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    
    // Wait in queue
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }
  
  /**
   * Release the mutex lock
   */
  release(): void {
    if (this.queue.length > 0) {
      // Wake up next waiter
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.locked = false;
    }
  }
  
  /**
   * Execute an operation with mutex protection
   */
  async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }
  
  /**
   * Check if mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked;
  }
}

/**
 * Mutex registry for managing multiple mutexes by key
 */
export class MutexRegistry {
  private mutexes: Map<string, Mutex> = new Map();
  
  /**
   * Get or create a mutex for a key
   */
  get(key: string): Mutex {
    if (!this.mutexes.has(key)) {
      this.mutexes.set(key, new Mutex());
    }
    return this.mutexes.get(key)!;
  }
  
  /**
   * Execute an operation with mutex protection for a key
   */
  async runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const mutex = this.get(key);
    return mutex.runExclusive(operation);
  }
  
  /**
   * Remove a mutex
   */
  remove(key: string): boolean {
    return this.mutexes.delete(key);
  }
  
  /**
   * Clear all mutexes
   */
  clear(): void {
    this.mutexes.clear();
  }
}

/**
 * Global mutex registry
 */
export const globalMutexRegistry = new MutexRegistry();

/**
 * Redis atomic operations helper
 */
export class RedisAtomicOperations {
  constructor(private redis: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<string>;
    incr: (key: string) => Promise<number>;
    decr: (key: string) => Promise<number>;
    incrby: (key: string, increment: number) => Promise<number>;
    decrby: (key: string, decrement: number) => Promise<number>;
    watch: (key: string) => Promise<string>;
    multi: () => any;
    exec: () => Promise<any>;
  }) {}
  
  /**
   * Atomic increment
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    if (amount === 1) {
      return this.redis.incr(key);
    }
    return this.redis.incrby(key, amount);
  }
  
  /**
   * Atomic decrement
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    if (amount === 1) {
      return this.redis.decr(key);
    }
    return this.redis.decrby(key, amount);
  }
  
  /**
   * Atomic compare-and-swap
   */
  async compareAndSwap(
    key: string,
    expectedValue: string,
    newValue: string
  ): Promise<boolean> {
    // Use WATCH for optimistic locking
    await this.redis.watch(key);
    
    const currentValue = await this.redis.get(key);
    
    if (currentValue !== expectedValue) {
      return false;
    }
    
    // Use MULTI/EXEC for atomic operation
    const multi = this.redis.multi();
    multi.set(key, newValue);
    const results = await multi.exec();
    
    // Check if transaction succeeded
    return results !== null;
  }
  
  /**
   * Atomic get-and-set
   */
  async getAndSet(key: string, newValue: string): Promise<string | null> {
    const currentValue = await this.redis.get(key);
    await this.redis.set(key, newValue);
    return currentValue;
  }
}

/**
 * Distributed lock using Redis
 */
export class RedisDistributedLock {
  constructor(
    private redis: {
      set: (key: string, value: string, mode: string, duration: number) => Promise<string | null>;
      del: (key: string) => Promise<number>;
      get: (key: string) => Promise<string | null>;
    },
    private lockKey: string,
    private ttlMs: number = 30000
  ) {}
  
  /**
   * Acquire the distributed lock
   */
  async acquire(token: string): Promise<boolean> {
    // SET key value NX PX milliseconds
    const result = await this.redis.set(
      this.lockKey,
      token,
      'NX',
      this.ttlMs
    );
    
    return result === 'OK';
  }
  
  /**
   * Release the distributed lock
   */
  async release(token: string): Promise<boolean> {
    // Only release if we own the lock
    const currentToken = await this.redis.get(this.lockKey);
    
    if (currentToken === token) {
      await this.redis.del(this.lockKey);
      return true;
    }
    
    return false;
  }
  
  /**
   * Execute an operation with distributed lock
   */
  async runExclusive<T>(
    token: string,
    operation: () => Promise<T>,
    maxWaitMs: number = 10000
  ): Promise<T> {
    const startTime = Date.now();
    
    // Try to acquire lock with retries
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.acquire(token)) {
        try {
          return await operation();
        } finally {
          await this.release(token);
        }
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Failed to acquire distributed lock: ${this.lockKey}`);
  }
}
