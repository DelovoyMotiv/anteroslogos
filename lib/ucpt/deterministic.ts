/**
 * UCPT Deterministic Execution Context
 * Sandboxed execution with fixed Math.random and Date.now
 */

import type { DeterministicContext } from './types';

// =====================================================
// CONTEXT CREATION
// =====================================================

/**
 * Create deterministic execution context
 * Fixed timestamp and random seed for reproducibility
 */
export function createDeterministicContext(iat: number): DeterministicContext {
  return {
    timestamp: iat * 1000, // Convert to milliseconds for Date.now()
    random_seed: 0, // Always seed 0 for determinism
    graph_commit: '', // Filled by caller
    disable_network: true,
    disable_filesystem: false, // Allow FS read for graph data
  };
}

// =====================================================
// DETERMINISTIC EXECUTION
// =====================================================

/**
 * Execute function in deterministic context
 * Overrides Math.random() and Date.now() during execution
 * 
 * WARNING: This is NOT a complete sandbox. For full isolation, use VM or Worker.
 * This provides determinism for well-behaved tool functions.
 */
export function executeDeterministic<T>(
  ctx: DeterministicContext,
  fn: () => T | Promise<T>
): Promise<T> {
  // Save original functions
  const originalRandom = Math.random;
  const originalDateNow = Date.now;
  
  // Seeded random number generator (LCG algorithm)
  let seed = ctx.random_seed;
  const deterministicRandom = (): number => {
    // Linear Congruential Generator (same as glibc)
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  
  // Fixed timestamp
  const deterministicDateNow = (): number => {
    return ctx.timestamp;
  };
  
  // Override global functions
  Math.random = deterministicRandom;
  Date.now = deterministicDateNow;
  
  try {
    // Execute function
    const result = fn();
    
    // Handle both sync and async functions
    if (result instanceof Promise) {
      return result.finally(() => {
        // Restore original functions
        Math.random = originalRandom;
        Date.now = originalDateNow;
      });
    } else {
      // Restore original functions
      Math.random = originalRandom;
      Date.now = originalDateNow;
      return Promise.resolve(result);
    }
  } catch (error) {
    // Restore original functions on error
    Math.random = originalRandom;
    Date.now = originalDateNow;
    throw error;
  }
}

/**
 * Verify determinism by executing function twice
 * Returns true if results are identical (deep equal)
 */
export async function verifyDeterminism<T>(
  ctx: DeterministicContext,
  fn: () => T | Promise<T>
): Promise<boolean> {
  const result1 = await executeDeterministic(ctx, fn);
  const result2 = await executeDeterministic(ctx, fn);
  
  // Deep equality check
  return JSON.stringify(result1) === JSON.stringify(result2);
}

/**
 * Get current deterministic context (read from overridden globals)
 */
export function getCurrentContext(): DeterministicContext | null {
  // Check if we're in deterministic mode
  const isDateFixed = Date.now() !== Date.now.call(Date);
  if (!isDateFixed) {
    return null;
  }
  
  return {
    timestamp: Date.now(),
    random_seed: 0, // Cannot recover seed from current state
    graph_commit: '',
    disable_network: true,
    disable_filesystem: false,
  };
}
