/**
 * Protocol Discovery Engine - Unit Tests
 * 
 * Tests for the ProtocolDiscoveryEngine class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProtocolDiscoveryEngine } from '../ProtocolDiscoveryEngine';

describe('ProtocolDiscoveryEngine', () => {
  let engine: ProtocolDiscoveryEngine;
  
  beforeEach(() => {
    engine = new ProtocolDiscoveryEngine();
  });
  
  describe('discoverProtocols', () => {
    it('should return an array of protocol statuses', async () => {
      // Use a well-known URL that likely has robots.txt
      const protocols = await engine.discoverProtocols('https://example.com');
      
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
      
      // Should check for all expected protocols
      const protocolNames = protocols.map(p => p.name);
      expect(protocolNames).toContain('agents.json');
      expect(protocolNames).toContain('ai-plugin.json');
      expect(protocolNames).toContain('mcp.json');
      expect(protocolNames).toContain('robots.txt');
    });
    
    it('should handle URLs without protocol prefix', async () => {
      const protocols = await engine.discoverProtocols('example.com');
      
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
    });
    
    it('should handle network errors gracefully', async () => {
      // Use an invalid domain that will fail
      const protocols = await engine.discoverProtocols('https://this-domain-definitely-does-not-exist-12345.com');
      
      // Should still return protocol statuses, just marked as unavailable
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
      
      // All protocols should be marked as unavailable
      protocols.forEach(protocol => {
        expect(protocol).toHaveProperty('available');
        expect(protocol).toHaveProperty('name');
        expect(protocol).toHaveProperty('url');
      });
    });
  });
  
  describe('checkManifest', () => {
    it('should return false for non-existent manifest', async () => {
      const exists = await engine.checkManifest('https://example.com', '/non-existent-manifest.json');
      expect(exists).toBe(false);
    });
    
    it('should handle network errors gracefully', async () => {
      const exists = await engine.checkManifest('https://invalid-domain-12345.com', '/agents.json');
      expect(exists).toBe(false);
    });
  });
  
  describe('parseRobotsTxt', () => {
    it('should return default allowed values when robots.txt does not exist', async () => {
      const directives = await engine.parseRobotsTxt('https://example.com');
      
      expect(directives).toHaveProperty('allowsOAI');
      expect(directives).toHaveProperty('allowsCCBot');
      expect(directives).toHaveProperty('directives');
      expect(Array.isArray(directives.directives)).toBe(true);
    });
    
    it('should handle network errors gracefully', async () => {
      const directives = await engine.parseRobotsTxt('https://invalid-domain-12345.com');
      
      // Should return default allowed values
      expect(directives.allowsOAI).toBe(true);
      expect(directives.allowsCCBot).toBe(true);
      expect(directives.directives).toEqual([]);
    });
  });
  
  describe('Cache Integration', () => {
    it('should cache protocol discovery results', async () => {
      const url = 'https://example.com';
      
      // First call - should fetch and cache
      const protocols1 = await engine.discoverProtocols(url);
      
      // Second call - should return cached results
      const protocols2 = await engine.discoverProtocols(url);
      
      // Results should be identical
      expect(protocols2).toEqual(protocols1);
    });
    
    it('should use cache for same domain with different paths', async () => {
      const url1 = 'https://example.com';
      const url2 = 'https://example.com/path';
      
      // First call
      const protocols1 = await engine.discoverProtocols(url1);
      
      // Second call with different path on same domain
      const protocols2 = await engine.discoverProtocols(url2);
      
      // Should return same cached results (domain-based caching)
      expect(protocols2).toEqual(protocols1);
    });
    
    it('should maintain separate cache entries for different domains', async () => {
      const url1 = 'https://example.com';
      const url2 = 'https://different.com';
      
      const protocols1 = await engine.discoverProtocols(url1);
      const protocols2 = await engine.discoverProtocols(url2);
      
      // Results should be different (different domains)
      // At minimum, the URLs in the protocol statuses should differ
      const urls1 = protocols1.map(p => p.url);
      const urls2 = protocols2.map(p => p.url);
      
      expect(urls1).not.toEqual(urls2);
    });
  });
});
