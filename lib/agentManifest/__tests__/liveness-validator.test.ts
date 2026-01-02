/**
 * Unit tests for LivenessValidator
 * Tests validation logic for scraped content quality
 */

import { describe, it, expect } from 'vitest';
import { LivenessValidator } from '../validation';
import { ScrapeError } from '../errors';
import type { ScrapedContent } from '../types';

describe('LivenessValidator', () => {
  const validator = new LivenessValidator();

  const createMockContent = (overrides: Partial<ScrapedContent> = {}): ScrapedContent => ({
    url: 'https://example.com',
    title: 'Example Title',
    description: 'Example description',
    headings: ['Heading 1', 'Heading 2'],
    links: ['https://example.com/page1'],
    textContent: 'A'.repeat(250), // 250 characters of text
    metadata: {
      contentLength: 600, // Above 500 threshold
      textLength: 250, // Above 200 threshold
      extractionMethod: 'static',
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  });

  describe('validate', () => {
    it('should pass validation for content meeting all thresholds', () => {
      const content = createMockContent();
      expect(() => validator.validate(content)).not.toThrow();
    });

    it('should pass validation for content exactly at thresholds', () => {
      const content = createMockContent({
        metadata: {
          contentLength: 500, // Exactly at threshold
          textLength: 200, // Exactly at threshold
          extractionMethod: 'static',
          timestamp: new Date().toISOString(),
        },
      });
      expect(() => validator.validate(content)).not.toThrow();
    });

    it('should throw ScrapeError when HTML content is below 500 characters', () => {
      const content = createMockContent({
        metadata: {
          contentLength: 499, // Below threshold
          textLength: 250,
          extractionMethod: 'static',
          timestamp: new Date().toISOString(),
        },
      });

      expect(() => validator.validate(content)).toThrow(ScrapeError);
      
      try {
        validator.validate(content);
      } catch (error) {
        expect(error).toBeInstanceOf(ScrapeError);
        if (error instanceof ScrapeError) {
          expect(error.code).toBe('INSUFFICIENT_CONTENT');
          expect(error.message).toContain('499 chars');
          expect(error.message).toContain('Minimum 500 characters required');
          expect(error.metadata.url).toBe('https://example.com');
          expect(error.metadata.contentLength).toBe(499);
        }
      }
    });

    it('should throw ScrapeError when text content is below 200 characters', () => {
      const content = createMockContent({
        textContent: 'A'.repeat(199), // Below threshold
        metadata: {
          contentLength: 600,
          textLength: 199, // Below threshold
          extractionMethod: 'static',
          timestamp: new Date().toISOString(),
        },
      });

      expect(() => validator.validate(content)).toThrow(ScrapeError);
      
      try {
        validator.validate(content);
      } catch (error) {
        expect(error).toBeInstanceOf(ScrapeError);
        if (error instanceof ScrapeError) {
          expect(error.code).toBe('NO_TEXT');
          expect(error.message).toContain('199 chars');
          expect(error.message).toContain('Minimum 200 characters required');
          expect(error.metadata.textLength).toBe(199);
        }
      }
    });

    it('should throw ScrapeError when title is empty', () => {
      const content = createMockContent({
        title: '',
      });

      expect(() => validator.validate(content)).toThrow(ScrapeError);
      
      try {
        validator.validate(content);
      } catch (error) {
        expect(error).toBeInstanceOf(ScrapeError);
        if (error instanceof ScrapeError) {
          expect(error.code).toBe('NO_TEXT');
          expect(error.message).toContain('No title found');
        }
      }
    });

    it('should throw ScrapeError when title is only whitespace', () => {
      const content = createMockContent({
        title: '   ',
      });

      expect(() => validator.validate(content)).toThrow(ScrapeError);
      
      try {
        validator.validate(content);
      } catch (error) {
        expect(error).toBeInstanceOf(ScrapeError);
        if (error instanceof ScrapeError) {
          expect(error.code).toBe('NO_TEXT');
          expect(error.message).toContain('No title found');
        }
      }
    });

    it('should throw ScrapeError when title is "Untitled"', () => {
      const content = createMockContent({
        title: 'Untitled',
      });

      expect(() => validator.validate(content)).toThrow(ScrapeError);
      
      try {
        validator.validate(content);
      } catch (error) {
        expect(error).toBeInstanceOf(ScrapeError);
        if (error instanceof ScrapeError) {
          expect(error.code).toBe('NO_TEXT');
          expect(error.message).toContain('No title found');
        }
      }
    });

    it('should pass validation for content above thresholds', () => {
      const content = createMockContent({
        textContent: 'A'.repeat(1000),
        metadata: {
          contentLength: 2000,
          textLength: 1000,
          extractionMethod: 'browser',
          timestamp: new Date().toISOString(),
        },
      });

      expect(() => validator.validate(content)).not.toThrow();
    });
  });
});
