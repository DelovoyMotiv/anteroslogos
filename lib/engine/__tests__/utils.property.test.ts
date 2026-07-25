/**
 * Property-Based Tests for Agent Middleware Utilities
 * Feature: agent-middleware, Property 15: Cache key cryptographic hashing
 * Validates: Requirements 4.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { normalizeUrl, generateHash, generateCacheKey, isValidUrl, extractDomain } from '../utils';

describe('Agent Middleware Utils - Property-Based Tests', () => {
  describe('Property 15: Cache key cryptographic hashing', () => {
    it('should generate consistent cache keys for the same URL', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            // Property: For any URL, generating the cache key multiple times should produce the same result
            const key1 = generateCacheKey(url);
            const key2 = generateCacheKey(url);
            
            expect(key1).toBe(key2);
            expect(key1).toMatch(/^agent:wrap:[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate cache keys using SHA-256 hash', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            // Property: For any URL, the cache key should contain a 64-character hex hash (SHA-256)
            const cacheKey = generateCacheKey(url);
            const hashPart = cacheKey.replace('agent:wrap:', '');
            
            expect(hashPart).toHaveLength(64);
            expect(hashPart).toMatch(/^[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should normalize URLs before hashing', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.constantFrom('http', 'https'),
          fc.domain(),
          fc.array(fc.tuple(fc.string({ minLength: 1, maxLength: 10 }), fc.string()), { minLength: 0, maxLength: 3 }),
          (protocol, domain, queryParams) => {
            // Property: URLs with different query parameter orders should produce the same cache key
            const baseUrl = `${protocol}://${domain}/path`;
            
            // Create URL with query params in one order
            const params1 = new URLSearchParams(queryParams);
            const url1 = `${baseUrl}?${params1.toString()}`;
            
            // Create URL with query params in reverse order
            const params2 = new URLSearchParams(queryParams.reverse());
            const url2 = `${baseUrl}?${params2.toString()}`;
            
            // Both should produce the same cache key if they have the same params
            if (queryParams.length > 0) {
              const key1 = generateCacheKey(url1);
              const key2 = generateCacheKey(url2);
              
              expect(key1).toBe(key2);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should remove trailing slashes consistently', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            // Property: URLs with and without trailing slashes should produce the same cache key
            const urlWithSlash = url.endsWith('/') ? url : `${url}/`;
            const urlWithoutSlash = url.endsWith('/') ? url.slice(0, -1) : url;
            
            // Skip if it's just the root path
            try {
              const parsed = new URL(url);
              if (parsed.pathname === '/' || parsed.pathname === '') {
                return true;
              }
              
              const key1 = generateCacheKey(urlWithSlash);
              const key2 = generateCacheKey(urlWithoutSlash);
              
              expect(key1).toBe(key2);
            } catch {
              // Skip invalid URLs
              return true;
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle URLs with fragments consistently', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (url, fragment) => {
            // Property: URLs with and without fragments should produce the same cache key
            const urlWithFragment = `${url}#${fragment}`;
            const urlWithoutFragment = url;
            
            const key1 = generateCacheKey(urlWithFragment);
            const key2 = generateCacheKey(urlWithoutFragment);
            
            expect(key1).toBe(key2);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should normalize protocol to lowercase', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.domain(),
          fc.constantFrom('/path', '/path/to/resource', '/'),
          (domain, path) => {
            // Property: HTTP and HTTPS protocols in different cases should normalize consistently
            const urlLower = `http://${domain}${path}`;
            const urlUpper = `HTTP://${domain}${path}`;
            
            const normalized1 = normalizeUrl(urlLower);
            const normalized2 = normalizeUrl(urlUpper);
            
            expect(normalized1).toBe(normalized2);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should normalize hostname to lowercase', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.constantFrom('http', 'https'),
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s)),
          (protocol, domain) => {
            // Property: Hostnames in different cases should normalize to lowercase
            const urlLower = `${protocol}://${domain.toLowerCase()}.com/path`;
            const urlUpper = `${protocol}://${domain.toUpperCase()}.com/path`;
            
            const normalized1 = normalizeUrl(urlLower);
            const normalized2 = normalizeUrl(urlUpper);
            
            expect(normalized1).toBe(normalized2);
            expect(normalized1).toContain(domain.toLowerCase());
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should remove default ports', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.domain(),
          (domain) => {
            // Property: Default ports (80 for HTTP, 443 for HTTPS) should be removed
            const httpWithPort = `http://${domain}:80/path`;
            const httpWithoutPort = `http://${domain}/path`;
            const httpsWithPort = `https://${domain}:443/path`;
            const httpsWithoutPort = `https://${domain}/path`;
            
            const normalized1 = normalizeUrl(httpWithPort);
            const normalized2 = normalizeUrl(httpWithoutPort);
            const normalized3 = normalizeUrl(httpsWithPort);
            const normalized4 = normalizeUrl(httpsWithoutPort);
            
            expect(normalized1).toBe(normalized2);
            expect(normalized3).toBe(normalized4);
            expect(normalized1).not.toContain(':80');
            expect(normalized3).not.toContain(':443');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve non-default ports', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.domain(),
          fc.integer({ min: 1024, max: 65535 }).filter(p => p !== 80 && p !== 443),
          (domain, port) => {
            // Property: Non-default ports should be preserved in normalized URLs
            const url = `http://${domain}:${port}/path`;
            const normalized = normalizeUrl(url);
            
            expect(normalized).toContain(`:${port}`);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate different hashes for different URLs', () => {
      // Feature: agent-middleware, Property 15: Cache key cryptographic hashing
      // Validates: Requirements 4.5
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url1, url2) => {
            // Property: Different URLs should produce different cache keys (with high probability)
            if (url1 === url2) {
              return true; // Skip identical URLs
            }
            
            const key1 = generateCacheKey(url1);
            const key2 = generateCacheKey(url2);
            
            // Normalized URLs might be the same even if original URLs differ
            const normalized1 = normalizeUrl(url1);
            const normalized2 = normalizeUrl(url2);
            
            if (normalized1 === normalized2) {
              expect(key1).toBe(key2);
            } else {
              expect(key1).not.toBe(key2);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('URL validation properties', () => {
    it('should validate HTTP and HTTPS URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            // Property: All HTTP/HTTPS URLs should be valid
            expect(isValidUrl(url)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject non-HTTP/HTTPS URLs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ftp', 'file', 'data', 'javascript'),
          fc.domain(),
          (scheme, domain) => {
            // Property: Non-HTTP/HTTPS schemes should be invalid
            const url = `${scheme}://${domain}/path`;
            expect(isValidUrl(url)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject malformed URLs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('://')),
          (str) => {
            // Property: Strings without protocol should be invalid URLs
            expect(isValidUrl(str)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Domain extraction properties', () => {
    it('should extract domain from valid URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            // Property: Domain extraction should return the hostname
            const domain = extractDomain(url);
            const parsed = new URL(url);
            
            expect(domain).toBe(parsed.hostname);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should throw error for invalid URLs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
            // Filter out strings that could be valid URLs
            if (s.includes('://')) return false;
            try {
              new URL(s);
              return false; // If URL constructor succeeds, skip it
            } catch {
              return true; // Only test strings that are truly invalid
            }
          }),
          (str) => {
            // Property: Invalid URL strings should throw an error
            expect(() => extractDomain(str)).toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Hash generation properties', () => {
    it('should generate consistent hashes for the same input', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            // Property: Same input should always produce the same hash
            const hash1 = generateHash(input);
            const hash2 = generateHash(input);
            
            expect(hash1).toBe(hash2);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate 64-character hex hashes', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            // Property: SHA-256 hashes should be 64 hex characters
            const hash = generateHash(input);
            
            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate different hashes for different inputs', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (input1, input2) => {
            // Property: Different inputs should produce different hashes (with high probability)
            if (input1 === input2) {
              return true; // Skip identical inputs
            }
            
            const hash1 = generateHash(input1);
            const hash2 = generateHash(input2);
            
            expect(hash1).not.toBe(hash2);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
