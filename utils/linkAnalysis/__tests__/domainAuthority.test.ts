/**
 * Domain Authority Estimator - Unit Tests
 * Tests for multi-factor domain authority estimation
 */

import { describe, it, expect } from 'vitest';
import { estimateDomainAuthority } from '../domainAuthority';

describe('Domain Authority Estimator', () => {
  describe('Known Authority Domains', () => {
    it('should return high score for wikipedia.org', async () => {
      const result = await estimateDomainAuthority('wikipedia.org', 'https://wikipedia.org');
      expect(result.score).toBe(98);
      expect(result.factors.knownAuthority).toBe(98);
    });

    it('should return perfect score for google.com', async () => {
      const result = await estimateDomainAuthority('google.com', 'https://google.com');
      expect(result.score).toBe(100);
      expect(result.factors.knownAuthority).toBe(100);
    });

    it('should return high score for github.com', async () => {
      const result = await estimateDomainAuthority('github.com', 'https://github.com');
      expect(result.score).toBe(95);
      expect(result.factors.knownAuthority).toBe(95);
    });
  });

  describe('TLD Scoring', () => {
    it('should give high score to .gov domains', async () => {
      const result = await estimateDomainAuthority('example.gov', 'https://example.gov');
      expect(result.score).toBeGreaterThanOrEqual(80); // Base 50 + TLD 35 + SSL 5
      expect(result.factors.tldScore).toBe(35);
    });

    it('should give high score to .edu domains', async () => {
      const result = await estimateDomainAuthority('university.edu', 'https://university.edu');
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.factors.tldScore).toBe(35);
    });

    it('should give medium score to .org domains', async () => {
      const result = await estimateDomainAuthority('nonprofit.org', 'https://nonprofit.org');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.factors.tldScore).toBe(25);
    });

    it('should give base score to .com domains', async () => {
      const result = await estimateDomainAuthority('example.com', 'https://example.com');
      expect(result.factors.tldScore).toBe(10);
    });
  });

  describe('SSL Certificate Bonus', () => {
    it('should add bonus for HTTPS', async () => {
      const httpsResult = await estimateDomainAuthority('example.com', 'https://example.com');
      const httpResult = await estimateDomainAuthority('example.com', 'http://example.com');
      
      expect(httpsResult.factors.sslValid).toBe(true);
      expect(httpResult.factors.sslValid).toBe(false);
      expect(httpsResult.score).toBeGreaterThan(httpResult.score);
    });
  });

  describe('Domain Characteristics', () => {
    it('should penalize domains with hyphens', async () => {
      const normalResult = await estimateDomainAuthority('example.com', 'https://example.com');
      const hyphenResult = await estimateDomainAuthority('my-example.com', 'https://my-example.com');
      
      expect(hyphenResult.factors.hasHyphens).toBe(true);
      expect(hyphenResult.score).toBeLessThan(normalResult.score);
    });

    it('should penalize domains with numbers', async () => {
      const normalResult = await estimateDomainAuthority('example.com', 'https://example.com');
      const numberResult = await estimateDomainAuthority('example123.com', 'https://example123.com');
      
      expect(numberResult.factors.hasNumbers).toBe(true);
      expect(numberResult.score).toBeLessThan(normalResult.score);
    });

    it('should bonus short domains (<=6 chars)', async () => {
      const result = await estimateDomainAuthority('abc.com', 'https://abc.com');
      expect(result.factors.domainLength).toBe(3);
      expect(result.score).toBeGreaterThanOrEqual(60); // Should get short domain bonus
    });

    it('should penalize long domains (>15 chars)', async () => {
      const result = await estimateDomainAuthority('verylongdomainname.com', 'https://verylongdomainname.com');
      expect(result.factors.domainLength).toBeGreaterThan(15);
      expect(result.score).toBeLessThanOrEqual(60); // Should get long domain penalty
    });
  });

  describe('Spam Pattern Detection', () => {
    it('should detect and penalize spam patterns', async () => {
      const normalResult = await estimateDomainAuthority('example.com', 'https://example.com');
      const spamResult = await estimateDomainAuthority('buy-cheap-12345.com', 'https://buy-cheap-12345.com');
      
      expect(spamResult.factors.spamPatterns.length).toBeGreaterThan(0);
      expect(spamResult.score).toBeLessThan(normalResult.score);
    });

    it('should detect multiple consecutive digits as spam', async () => {
      const result = await estimateDomainAuthority('example12345.com', 'https://example12345.com');
      expect(result.factors.spamPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Subdomain Depth', () => {
    it('should not penalize www subdomain', async () => {
      const baseResult = await estimateDomainAuthority('example.com', 'https://example.com');
      const wwwResult = await estimateDomainAuthority('www.example.com', 'https://www.example.com');
      
      // www should not be counted as a real subdomain
      expect(wwwResult.score).toBe(baseResult.score);
    });

    it('should penalize deep subdomains', async () => {
      const baseResult = await estimateDomainAuthority('example.com', 'https://example.com');
      const subdomainResult = await estimateDomainAuthority('blog.api.example.com', 'https://blog.api.example.com');
      
      expect(subdomainResult.score).toBeLessThan(baseResult.score);
    });
  });

  describe('Score Bounds', () => {
    it('should return score between 0 and 100', async () => {
      const domains = [
        'example.com',
        'google.com',
        'spam-buy-cheap-12345-discount.com',
        'test.gov',
        'a.com',
        'verylongdomainnamethatexceedslimits.com',
      ];

      for (const domain of domains) {
        const result = await estimateDomainAuthority(domain, `https://${domain}`);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty domain gracefully', async () => {
      const result = await estimateDomainAuthority('', 'https://');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle malformed domain gracefully', async () => {
      const result = await estimateDomainAuthority('not a domain', 'https://not a domain');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle uppercase domains', async () => {
      const lowerResult = await estimateDomainAuthority('example.com', 'https://example.com');
      const upperResult = await estimateDomainAuthority('EXAMPLE.COM', 'https://EXAMPLE.COM');
      
      expect(upperResult.score).toBe(lowerResult.score);
    });

    it('should handle mixed case known domains', async () => {
      const result = await estimateDomainAuthority('GitHub.COM', 'https://GitHub.COM');
      expect(result.score).toBe(95); // Should match github.com
    });
  });
});
