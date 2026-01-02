/**
 * Unit tests for EnhancedValidator
 * Tests comprehensive manifest validation with quality checks
 */

import { describe, it, expect } from 'vitest';
import { EnhancedValidator } from '../validation';
import type { ScrapedContent, AgentsJSON } from '../types';

describe('EnhancedValidator', () => {
  const validator = new EnhancedValidator();

  // Helper to create valid scraped content
  const createScrapedContent = (overrides?: Partial<ScrapedContent>): ScrapedContent => ({
    url: 'https://example.com',
    title: 'Example Company',
    description: 'Example description',
    headings: ['About Us', 'Products', 'Contact'],
    links: [
      'https://example.com/about',
      'https://example.com/products',
      'https://example.com/contact',
    ],
    textContent: 'This is example text content that is long enough to pass validation.',
    metadata: {
      contentLength: 1000,
      textLength: 500,
      extractionMethod: 'static',
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  });

  // Helper to create valid manifest
  const createValidManifest = (overrides?: Partial<AgentsJSON>): AgentsJSON => ({
    $schema: 'https://anoteroslogos.com/schemas/agents-v1.json',
    version: '1.0',
    identity: {
      name: 'Example Company',
      description: 'This is a valid description with more than 20 characters',
      tags: ['example', 'test'],
    },
    knowledge: [
      {
        role: 'about',
        url: 'https://example.com/about',
        description: 'Information about the company and its mission',
      },
      {
        role: 'product',
        url: 'https://example.com/products',
        description: 'Details about our products and services',
      },
    ],
    actions: [],
    ...overrides,
  });

  describe('validate', () => {
    it('should pass validation for a valid manifest', () => {
      const scrapedContent = createScrapedContent();
      const manifest = createValidManifest();

      const result = validator.validate(manifest, scrapedContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.identity.name).toBe('Example Company');
    });

    it('should fail validation for invalid schema', () => {
      const scrapedContent = createScrapedContent();
      const invalidManifest = {
        $schema: 'wrong-schema',
        version: '1.0',
      };

      const result = validator.validate(invalidManifest, scrapedContent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors!.some(e => e.severity === 'error')).toBe(true);
    });

    it('should fail validation for short identity description (< 20 chars)', () => {
      const scrapedContent = createScrapedContent();
      const manifest = createValidManifest({
        identity: {
          name: 'Example Company',
          description: 'Valid but short',  // 16 chars - passes schema (>10) but fails enhanced (>20)
          tags: ['example'],
        },
      });

      const result = validator.validate(manifest, scrapedContent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      const descError = result.errors!.find(e => e.path === 'identity.description');
      expect(descError).toBeDefined();
      expect(descError!.severity).toBe('error');
      expect(descError!.message).toContain('20 characters');
    });

    it('should fail validation for short knowledge entry descriptions (< 20 chars)', () => {
      const scrapedContent = createScrapedContent();
      const manifest = createValidManifest({
        knowledge: [
          {
            role: 'about',
            url: 'https://example.com/about',
            description: 'Short desc',
          },
        ],
      });

      const result = validator.validate(manifest, scrapedContent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      const descError = result.errors!.find(e => e.path === 'knowledge[0].description');
      expect(descError).toBeDefined();
      expect(descError!.severity).toBe('error');
      expect(descError!.message).toContain('too short');
    });

    it('should add warning if identity name does not match scraped title', () => {
      const scrapedContent = createScrapedContent({
        title: 'Completely Different Company Name',
      });
      const manifest = createValidManifest({
        identity: {
          name: 'Example Company',
          description: 'This is a valid description with more than 20 characters',
          tags: ['example'],
        },
      });

      const result = validator.validate(manifest, scrapedContent);

      // Should still succeed but with warnings
      expect(result.success).toBe(true);
      expect(result.errors).toBeDefined();
      const nameWarning = result.errors!.find(e => e.path === 'identity.name');
      expect(nameWarning).toBeDefined();
      expect(nameWarning!.severity).toBe('warning');
      expect(nameWarning!.message).toContain('does not closely match');
    });

    it('should add warning if knowledge entry URL not found in scraped links', () => {
      const scrapedContent = createScrapedContent({
        links: ['https://example.com/about', 'https://example.com/contact'],
      });
      const manifest = createValidManifest({
        knowledge: [
          {
            role: 'product',
            url: 'https://example.com/products',
            description: 'Details about our products and services',
          },
        ],
      });

      const result = validator.validate(manifest, scrapedContent);

      // Should still succeed but with warnings
      expect(result.success).toBe(true);
      expect(result.errors).toBeDefined();
      const urlWarning = result.errors!.find(e => e.path === 'knowledge[0].url');
      expect(urlWarning).toBeDefined();
      expect(urlWarning!.severity).toBe('warning');
      expect(urlWarning!.message).toContain('not found in scraped links');
    });

    it('should pass validation with matching identity name', () => {
      const scrapedContent = createScrapedContent({
        title: 'Example Company - Official Site',
      });
      const manifest = createValidManifest({
        identity: {
          name: 'Example Company',
          description: 'This is a valid description with more than 20 characters',
          tags: ['example'],
        },
      });

      const result = validator.validate(manifest, scrapedContent);

      expect(result.success).toBe(true);
      // Should not have name warning
      const nameWarning = result.errors?.find(e => e.path === 'identity.name');
      expect(nameWarning).toBeUndefined();
    });

    it('should pass validation when knowledge URLs are found in scraped links', () => {
      const scrapedContent = createScrapedContent({
        links: [
          'https://example.com/about',
          'https://example.com/products',
          'https://example.com/contact',
        ],
      });
      const manifest = createValidManifest();

      const result = validator.validate(manifest, scrapedContent);

      expect(result.success).toBe(true);
      // Should not have URL warnings
      const urlWarnings = result.errors?.filter(e => e.path.includes('url'));
      expect(urlWarnings?.length || 0).toBe(0);
    });

    it('should handle multiple validation errors', () => {
      const scrapedContent = createScrapedContent();
      const manifest = createValidManifest({
        identity: {
          name: 'Example',
          description: 'Valid but short',  // 16 chars - passes schema but fails enhanced
          tags: ['example'],
        },
        knowledge: [
          {
            role: 'about',
            url: 'https://example.com/about',
            description: 'Also valid but short',  // 21 chars - passes both
          },
          {
            role: 'product',
            url: 'https://example.com/products',
            description: 'Short desc here',  // 16 chars - passes schema but fails enhanced
          },
        ],
      });

      const result = validator.validate(manifest, scrapedContent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(1);
      expect(result.errors!.filter(e => e.severity === 'error').length).toBeGreaterThan(1);
    });
  });
});
