/**
 * Algorithm Optimization Utilities
 * Replace O(n²) operations with O(n log n) or O(n) alternatives
 * Production-ready with benchmarking support
 */

/**
 * Efficient sorting using native sort (O(n log n))
 * Replaces bubble sort or selection sort patterns
 */
export function efficientSort<T>(
  array: T[],
  compareFn?: (a: T, b: T) => number
): T[] {
  return [...array].sort(compareFn);
}

/**
 * Efficient lookup using Map (O(1))
 * Replaces array.find() in loops (O(n))
 */
export function createLookupMap<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of array) {
    map.set(keyFn(item), item);
  }
  return map;
}

/**
 * Efficient grouping using Map (O(n))
 * Replaces multiple filter() calls (O(n²))
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  
  for (const item of array) {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  return groups;
}

/**
 * Efficient deduplication using Set (O(n))
 * Replaces nested loops for uniqueness (O(n²))
 */
export function deduplicate<T>(
  array: T[],
  keyFn?: (item: T) => string | number
): T[] {
  if (!keyFn) {
    return Array.from(new Set(array));
  }
  
  const seen = new Set<string | number>();
  const result: T[] = [];
  
  for (const item of array) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Efficient intersection using Set (O(n + m))
 * Replaces nested loops (O(n * m))
 */
export function intersection<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => set2.has(item));
}

/**
 * Efficient difference using Set (O(n + m))
 * Replaces nested loops (O(n * m))
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => !set2.has(item));
}

/**
 * Efficient union using Set (O(n + m))
 */
export function union<T>(array1: T[], array2: T[]): T[] {
  return Array.from(new Set([...array1, ...array2]));
}

/**
 * Binary search (O(log n))
 * Requires sorted array
 */
export function binarySearch<T>(
  sortedArray: T[],
  target: T,
  compareFn: (a: T, b: T) => number
): number {
  let left = 0;
  let right = sortedArray.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareFn(sortedArray[mid], target);
    
    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1; // Not found
}

/**
 * Memoization decorator for expensive functions
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();
  
  return (...args: TArgs): TReturn => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Debounce function calls (prevents excessive execution)
 */
export function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  delayMs: number
): (...args: TArgs) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: TArgs) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

/**
 * Throttle function calls (rate limiting)
 */
export function throttle<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  delayMs: number
): (...args: TArgs) => void {
  let lastCall = 0;
  
  return (...args: TArgs) => {
    const now = Date.now();
    
    if (now - lastCall >= delayMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Chunk array into smaller arrays (for batch processing)
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * Flatten nested arrays (O(n))
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.flat() as T[];
}

/**
 * Deep flatten nested arrays
 */
export function deepFlatten<T>(array: unknown[]): T[] {
  return array.flat(Infinity) as T[];
}

/**
 * Partition array based on predicate (single pass, O(n))
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  
  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }
  
  return [truthy, falsy];
}

/**
 * Find top N items efficiently using partial sort
 */
export function topN<T>(
  array: T[],
  n: number,
  compareFn: (a: T, b: T) => number
): T[] {
  if (n >= array.length) {
    return efficientSort(array, compareFn);
  }
  
  // Use partial sort for better performance
  const result = array.slice(0, n);
  result.sort(compareFn);
  
  for (let i = n; i < array.length; i++) {
    if (compareFn(array[i], result[n - 1]) < 0) {
      result[n - 1] = array[i];
      // Re-sort to maintain order
      let j = n - 1;
      while (j > 0 && compareFn(result[j], result[j - 1]) < 0) {
        [result[j], result[j - 1]] = [result[j - 1], result[j]];
        j--;
      }
    }
  }
  
  return result;
}

/**
 * Benchmark function execution time
 */
export async function benchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  iterations: number = 1000
): Promise<{ name: string; avgTime: number; totalTime: number; iterations: number }> {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  return {
    name,
    avgTime,
    totalTime,
    iterations,
  };
}

/**
 * Compare performance of two implementations
 */
export async function comparePerformance<T>(
  name1: string,
  fn1: () => T | Promise<T>,
  name2: string,
  fn2: () => T | Promise<T>,
  iterations: number = 1000
): Promise<{
  faster: string;
  improvement: number;
  results: [
    { name: string; avgTime: number },
    { name: string; avgTime: number }
  ];
}> {
  const result1 = await benchmark(name1, fn1, iterations);
  const result2 = await benchmark(name2, fn2, iterations);
  
  const faster = result1.avgTime < result2.avgTime ? name1 : name2;
  const slower = faster === name1 ? result2.avgTime : result1.avgTime;
  const fasterTime = faster === name1 ? result1.avgTime : result2.avgTime;
  const improvement = ((slower - fasterTime) / slower) * 100;
  
  return {
    faster,
    improvement,
    results: [
      { name: name1, avgTime: result1.avgTime },
      { name: name2, avgTime: result2.avgTime },
    ],
  };
}

/**
 * LRU Cache implementation (O(1) get/set)
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  set(key: K, value: V): void {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to end
    this.cache.set(key, value);
    
    // Evict least recently used if over capacity
    if (this.cache.size > this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Trie data structure for efficient prefix search (O(m) where m is key length)
 */
export class Trie {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  insert(word: string): void {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    
    node.isEndOfWord = true;
  }
  
  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEndOfWord;
  }
  
  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }
  
  private findNode(prefix: string): TrieNode | null {
    let node = this.root;
    
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }
    
    return node;
  }
}

class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}
