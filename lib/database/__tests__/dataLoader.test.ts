/**
 * DataLoader Tests
 * Validates N+1 query prevention and batching behavior
 * Property 11: Constant Query Count
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataLoader } from '../dataLoader';

describe('DataLoader', () => {
  describe('batching behavior', () => {
    it('should batch multiple load calls into single batch function call', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn });

      // Load multiple keys
      const promises = [
        loader.load(1),
        loader.load(2),
        loader.load(3),
      ];

      const results = await Promise.all(promises);

      // Should call batch function only once
      expect(batchFn).toHaveBeenCalledTimes(1);
      expect(batchFn).toHaveBeenCalledWith([1, 2, 3]);
      expect(results).toEqual([2, 4, 6]);
    });

    it('should handle duplicate keys in same batch', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn });

      // Load same key multiple times
      const promises = [
        loader.load(1),
        loader.load(1),
        loader.load(2),
        loader.load(1),
      ];

      const results = await Promise.all(promises);

      // Should still batch all calls
      expect(batchFn).toHaveBeenCalledTimes(1);
      expect(results).toEqual([2, 2, 4, 2]);
    });

    it('should respect maxBatchSize', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn, maxBatchSize: 2 });

      // Load more than maxBatchSize
      const promises = [
        loader.load(1),
        loader.load(2),
        loader.load(3),
        loader.load(4),
      ];

      await Promise.all(promises);

      // Should split into multiple batches
      expect(batchFn).toHaveBeenCalledTimes(2);
      expect(batchFn).toHaveBeenNthCalledWith(1, [1, 2]);
      expect(batchFn).toHaveBeenNthCalledWith(2, [3, 4]);
    });
  });

  describe('caching behavior', () => {
    it('should cache results by default', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn });

      // First load
      const result1 = await loader.load(1);
      
      // Second load of same key
      const result2 = await loader.load(1);

      // Should only call batch function once (cached)
      expect(batchFn).toHaveBeenCalledTimes(1);
      expect(result1).toBe(2);
      expect(result2).toBe(2);
    });

    it('should not cache when cache option is false', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn, cache: false });

      // First load
      await loader.load(1);
      
      // Second load of same key
      await loader.load(1);

      // Should call batch function twice (no cache)
      expect(batchFn).toHaveBeenCalledTimes(2);
    });

    it('should clear cache for specific key', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn });

      // First load
      await loader.load(1);
      
      // Clear cache
      loader.clear(1);
      
      // Second load
      await loader.load(1);

      // Should call batch function twice
      expect(batchFn).toHaveBeenCalledTimes(2);
    });

    it('should prime cache with value', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn });

      // Prime cache
      loader.prime(1, 100);
      
      // Load primed key
      const result = await loader.load(1);

      // Should not call batch function (primed)
      expect(batchFn).not.toHaveBeenCalled();
      expect(result).toBe(100);
    });
  });

  describe('error handling', () => {
    it('should reject all promises in batch if batch function fails', async () => {
      const batchFn = vi.fn(async () => {
        throw new Error('Batch failed');
      });

      const loader = new DataLoader({ batchFn });

      const promises = [
        loader.load(1),
        loader.load(2),
      ];

      await expect(Promise.all(promises)).rejects.toThrow('Batch failed');
    });

    it('should reject promise if value not found', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        // Return undefined for key 2
        return keys.map(k => k === 2 ? undefined : k * 2);
      });

      const loader = new DataLoader({ batchFn });

      const promise1 = loader.load(1);
      const promise2 = loader.load(2);

      await expect(promise1).resolves.toBe(2);
      await expect(promise2).rejects.toThrow('No value found for key');
    });
  });

  describe('loadMany', () => {
    it('should load multiple keys at once', async () => {
      const batchFn = vi.fn(async (keys: number[]) => {
        return keys.map(k => k * 2);
      });

      const loader = new DataLoader({ batchFn });

      const results = await loader.loadMany([1, 2, 3]);

      expect(batchFn).toHaveBeenCalledTimes(1);
      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('custom cache key function', () => {
    it('should use custom cache key function', async () => {
      interface User {
        id: number;
        name: string;
      }

      const batchFn = vi.fn(async (users: User[]) => {
        return users.map(u => ({ ...u, loaded: true }));
      });

      const loader = new DataLoader<User, User & { loaded: boolean }>({
        batchFn,
        cacheKeyFn: (user) => `user:${user.id}`,
      });

      const user1 = { id: 1, name: 'Alice' };
      const user1Duplicate = { id: 1, name: 'Alice' };

      // Load same user (by ID)
      await loader.load(user1);
      await loader.load(user1Duplicate);

      // Should only call batch function once (cached by ID)
      expect(batchFn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('DataLoader - N+1 Prevention', () => {
  /**
   * Property 11: Constant Query Count
   * For any API endpoint, number of database queries should be O(1) relative to result size
   */
  it('should prevent N+1 queries when loading related data', async () => {
    // Simulate database query
    const queryCount = { count: 0 };
    
    const batchFn = async (userIds: string[]) => {
      queryCount.count++; // Track query count
      
      // Simulate single batched query
      return userIds.map(id => ({
        id,
        name: `User ${id}`,
        email: `user${id}@example.com`,
      }));
    };

    const loader = new DataLoader({ batchFn });

    // Simulate loading users for 100 items
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      userId: `user-${i % 10}`, // 10 unique users
    }));

    // Load all users
    await Promise.all(
      items.map(item => loader.load(item.userId))
    );

    // Should execute only 1 query (batched), not 100 queries (N+1)
    expect(queryCount.count).toBe(1);
  });

  it('should maintain O(1) query count regardless of result size', async () => {
    const queryCount = { count: 0 };
    
    const batchFn = async (ids: string[]) => {
      queryCount.count++;
      return ids.map(id => ({ id, data: `Data ${id}` }));
    };

    // Use large maxBatchSize to ensure single batch
    const loader = new DataLoader({ batchFn, maxBatchSize: 10000 });

    // Test with different result sizes
    const sizes = [10, 100, 1000];

    for (const size of sizes) {
      queryCount.count = 0;
      loader.clearAll();

      const ids = Array.from({ length: size }, (_, i) => `id-${i}`);
      await Promise.all(ids.map(id => loader.load(id)));

      // Query count should be constant (1) regardless of size
      expect(queryCount.count).toBe(1);
    }
  });
});
