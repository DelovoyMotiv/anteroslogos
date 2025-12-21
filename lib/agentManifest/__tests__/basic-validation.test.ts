/**
 * Basic validation tests for Agent Manifest module
 * Verifies core functionality of data models and validators
 */

import { describe, it, expect } from 'vitest';
import {
  validateManifest,
  validateManifestUrl,
  normalizeManifestUrl,
  extractDomain,
  isAccessibleUrl,
  type LogosJSON,
} from '../index';

describe('Agent Manifest - Basic Validation', () => {
  describe('validateManifest', () => {
    it('should validate a complete valid manifest', () => {
      const validManifest: LogosJSON = {
        $schema: 'https://anoteroslogos.com/schemas/logos-v1.json',
        meta: {
          version: '1.0',
          updated: new Date().toISOString(),
          authority_level: 'self-declared',
        },
        identity: {
          name: 'Example Corp',
          description: 'A comprehensive example of a valid manifest',
          domain_focus: ['technology', 'innovation'],
        },
        knowledge_topology: {
          roots: [
            {
              url: '/about',
              semantic_role: 'axiom',
              instruction: 'Core information about the company',
            },
          ],
        },
        directives: {
          crawling: 'allow-standard',
          attribution: 'require-citation',
        },
      };

      const result = validateManifest(validManifest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validManifest);
      }
    });

    it('should reject manifest with missing required fields', () => {
      const invalidManifest = {
        $schema: 'https://anoteroslogos.com/schemas/logos-v1.json',
        meta: {
          version: '1.0',
          updated: new Date().toISOString(),
        },
        // missing authority_level and other required fields
      };

      const result = validateManifest(invalidManifest);
      expect(result.success).toBe(false);
    });

    it('should reject manifest with invalid schema URL', () => {
      const invalidManifest = {
        $schema: 'https://wrong-url.com/schema.json',
        meta: {
          version: '1.0',
          updated: new Date().toISOString(),
          authority_level: 'self-declared',
        },
        identity: {
          name: 'Test',
          description: 'Test description',
          domain_focus: ['test'],
        },
        knowledge_topology: {
          roots: [
            {
              url: '/test',
              semantic_role: 'axiom',
              instruction: 'Test instruction',
            },
          ],
        },
        directives: {
          crawling: 'allow-standard',
          attribution: 'optional',
        },
      };

      const result = validateManifest(invalidManifest);
      expect(result.success).toBe(false);
    });
  });

  describe('validateManifestUrl', () => {
    it('should validate and sanitize a valid URL', () => {
      const result = validateManifestUrl('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com/');
    });

    it('should add https protocol if missing', () => {
      const result = validateManifestUrl('example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toContain('https://');
    });

    it('should reject empty URL', () => {
      const result = validateManifestUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject IP addresses', () => {
      const result = validateManifestUrl('https://192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject URLs with credentials', () => {
      const result = validateManifestUrl('https://user:pass@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('credentials');
    });
  });

  describe('normalizeManifestUrl', () => {
    it('should remove query parameters', () => {
      const normalized = normalizeManifestUrl('https://example.com/page?param=value');
      expect(normalized).toBe('https://example.com/page');
    });

    it('should remove fragments', () => {
      const normalized = normalizeManifestUrl('https://example.com/page#section');
      expect(normalized).toBe('https://example.com/page');
    });

    it('should remove trailing slash for non-root paths', () => {
      const normalized = normalizeManifestUrl('https://example.com/page/');
      expect(normalized).toBe('https://example.com/page');
    });

    it('should keep trailing slash for root domain', () => {
      const normalized = normalizeManifestUrl('https://example.com/');
      expect(normalized).toBe('https://example.com/');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      const domain = extractDomain('https://www.example.com/path');
      expect(domain).toBe('www.example.com');
    });

    it('should return empty string for invalid URL', () => {
      const domain = extractDomain('not-a-url');
      expect(domain).toBe('');
    });
  });

  describe('isAccessibleUrl', () => {
    it('should return true for valid HTTP URL', () => {
      expect(isAccessibleUrl('http://example.com')).toBe(true);
    });

    it('should return true for valid HTTPS URL', () => {
      expect(isAccessibleUrl('https://example.com')).toBe(true);
    });

    it('should return false for invalid protocol', () => {
      expect(isAccessibleUrl('ftp://example.com')).toBe(false);
    });

    it('should return false for malformed URL', () => {
      expect(isAccessibleUrl('not a url')).toBe(false);
    });
  });
});
