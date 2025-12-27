/**
 * Protocol Cache Tests
 * 
 * Tests for the protocol discovery caching layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProtocolCache } from '../ProtocolCache';
import type { ProtocolStatus } from '../types';

describe('ProtocolCache', () => {
  let cache: ProtocolCache;
  
  beforeEach(() => {
    cache = new ProtocolCache();
  });
  
  describe('Cache Key Generation', () => {
    it('should generate consistent keys for the same domain', async () => {
      const url1 = 'https://example.com';
      const url2 = 'https://example.com/path';
      const url3 = 'http://example.com';
      
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      // Set with first URL
      await cache.set(url1, protocols);
      
      // Should retrieve with different paths/protocols on same domain
      const cached2 = await cache.get(url2);
      const cached3 = await cache.get(url3);
      
      expect(cached2).toEqual(protocols);
      expect(cached3).toEqual(protocols);
    });
    
    it('should generate different keys for different domains', async () => {
      const url1 = 'https://example.com';
      const url2 = 'https://different.com';
      
      const protocols1: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      const protocols2: ProtocolStatus[] = [
        { name: 'agents.json', available: false, url: 'https://different.com/agents.json' }
      ];
      
      await cache.set(url1, protocols1);
      await cache.set(url2, protocols2);
      
      const cached1 = await cache.get(url1);
      const cached2 = await cache.get(url2);
      
      expect(cached1).toEqual(protocols1);
      expect(cached2).toEqual(protocols2);
    });
    
    it('should handle URLs without protocol', async () => {
      const url = 'example.com';
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      await cache.set(url, protocols);
      const cached = await cache.get(url);
      
      expect(cached).toEqual(protocols);
    });
  });
  
  describe('Cache Operations', () => {
    it('should return null for cache miss', async () => {
      const result = await cache.get('https://nonexistent.com');
      expect(result).toBeNull();
    });
    
    it('should store and retrieve protocol results', async () => {
      const url = 'https://example.com';
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
        { name: 'ai-plugin.json', available: false, url: 'https://example.com/.well-known/ai-plugin.json' },
        { name: 'mcp.json', available: true, url: 'https://example.com/.well-known/mcp.json' },
        { name: 'robots.txt', available: true, url: 'https://example.com/robots.txt' }
      ];
      
      await cache.set(url, protocols);
      const cached = await cache.get(url);
      
      expect(cached).toEqual(protocols);
    });
    
    it('should handle protocol results with content', async () => {
      const url = 'https://example.com';
      const protocols: ProtocolStatus[] = [
        {
          name: 'agents.json',
          available: true,
          url: 'https://example.com/agents.json',
          content: { version: '1.0', capabilities: ['search', 'browse'] }
        }
      ];
      
      await cache.set(url, protocols);
      const cached = await cache.get(url);
      
      expect(cached).toEqual(protocols);
      expect(cached?.[0].content).toEqual({ version: '1.0', capabilities: ['search', 'browse'] });
    });
    
    it('should invalidate cache entry', async () => {
      const url = 'https://example.com';
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      await cache.set(url, protocols);
      expect(await cache.get(url)).toEqual(protocols);
      
      await cache.invalidate(url);
      expect(await cache.get(url)).toBeNull();
    });
    
    it('should check if cache entry exists', async () => {
      const url = 'https://example.com';
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      expect(await cache.has(url)).toBe(false);
      
      await cache.set(url, protocols);
      expect(await cache.has(url)).toBe(true);
      
      await cache.invalidate(url);
      expect(await cache.has(url)).toBe(false);
    });
  });
  
  describe('TTL Management', () => {
    it('should set TTL on cache entries', async () => {
      const url = 'https://example.com';
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      await cache.set(url, protocols);
      const ttl = await cache.getTTL(url);
      
      // TTL should be close to 24 hours (86400 seconds)
      // Allow some variance for execution time
      expect(ttl).toBeGreaterThan(86300);
      expect(ttl).toBeLessThanOrEqual(86400);
    });
    
    it('should return negative value for non-existent entries', async () => {
      const ttl = await cache.getTTL('https://nonexistent.com');
      // Mock Redis returns -1, real Redis returns -2
      expect(ttl).toBeLessThan(0);
    });
  });
  
  describe('Cache Clearing', () => {
    it('should clear all cache entries', async () => {
      const urls = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com'
      ];
      
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      // Set multiple entries
      for (const url of urls) {
        await cache.set(url, protocols);
      }
      
      // Verify all exist
      for (const url of urls) {
        expect(await cache.has(url)).toBe(true);
      }
      
      // Clear all
      await cache.clear();
      
      // Verify all cleared
      for (const url of urls) {
        expect(await cache.has(url)).toBe(false);
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should handle malformed URLs gracefully', async () => {
      const malformedUrl = 'not-a-valid-url';
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' }
      ];
      
      // Should not throw
      await expect(cache.set(malformedUrl, protocols)).resolves.not.toThrow();
      await expect(cache.get(malformedUrl)).resolves.toBeDefined();
    });
    
    it('should handle empty protocol arrays', async () => {
      const url = 'https://example.com';
      const protocols: ProtocolStatus[] = [];
      
      await cache.set(url, protocols);
      const cached = await cache.get(url);
      
      expect(cached).toEqual([]);
    });
  });
});
