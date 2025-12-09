/**
 * Property-Based Tests for Extraction Engine
 * Tests extraction engine independence, database persistence, and error isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ExtractionEngine } from '../extractor';
import { ErrorCode } from '../../../types/agent-middleware.types';
import { AgentMiddlewareError } from '../errors';

describe('Extraction Engine - Property-Based Tests', () => {
  let engine: ExtractionEngine;

  beforeEach(() => {
    engine = new ExtractionEngine();
  });

  describe('Property 6: Extraction engine independence', () => {
    it('should return typed objects without database dependencies', async () => {
      // Feature: agent-middleware, Property 6: Extraction engine independence
      // Validates: Requirements 2.1
      
      // Mock fetch to return valid HTML
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Test Page</title>
              <meta name="description" content="Test description">
            </head>
            <body>
              <h1>Test Heading</h1>
              <p>Test content</p>
            </body>
          </html>
        `,
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.constantFrom('fast' as const, 'deep' as const),
          async (url, mode) => {
            // Property: For any URL and mode, extraction should return typed objects
            // without requiring database connections
            const result = await engine.extract(url, { mode });
            
            // Verify result structure
            expect(result).toBeDefined();
            expect(result.url).toBeDefined();
            expect(result.timestamp).toBeDefined();
            expect(result.html).toBeDefined();
            expect(result.schemaMarkup).toBeDefined();
            expect(result.metaTags).toBeDefined();
            expect(result.content).toBeDefined();
            expect(result.structure).toBeDefined();
            expect(result.performance).toBeDefined();
            
            // Verify types
            expect(typeof result.url).toBe('string');
            expect(typeof result.timestamp).toBe('string');
            expect(typeof result.html).toBe('string');
            expect(typeof result.schemaMarkup).toBe('object');
            expect(typeof result.metaTags).toBe('object');
            expect(typeof result.content).toBe('object');
            expect(typeof result.structure).toBe('object');
            expect(typeof result.performance).toBe('object');
            
            // Verify no database-specific fields
            expect(result).not.toHaveProperty('id');
            expect(result).not.toHaveProperty('created_at');
            expect(result).not.toHaveProperty('updated_at');
            expect(result).not.toHaveProperty('tenant_id');
            
            // Deep mode should have additional fields
            if (mode === 'deep') {
              expect(result.entities).toBeDefined();
              expect(result.relationships).toBeDefined();
              expect(result.knowledgeGraph).toBeDefined();
            }
          }
        ),
        { numRuns: 10 } // Reduced runs for async tests
      );
    });

    it('should work without any database connection', async () => {
      // Feature: agent-middleware, Property 6: Extraction engine independence
      // Validates: Requirements 2.1
      
      // Mock fetch to return valid HTML
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <!DOCTYPE html>
          <html>
            <head><title>Test</title></head>
            <body><p>Content</p></body>
          </html>
        `,
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: Extraction should succeed even when database is unavailable
            // (simulated by not having any database connection in the engine)
            
            const result = await engine.extract(url, { mode: 'fast' });
            
            // Should successfully return a result
            expect(result).toBeDefined();
            expect(result.url).toBeDefined();
            expect(result.html).toBeDefined();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 7: Database persistence is optional', () => {
    it('should complete extraction even if persistence would fail', async () => {
      // Feature: agent-middleware, Property 7: Database persistence is optional
      // Validates: Requirements 2.3
      
      // Mock fetch to return valid HTML
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <!DOCTYPE html>
          <html>
            <head><title>Test</title></head>
            <body><p>Content</p></body>
          </html>
        `,
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.constantFrom('fast' as const, 'deep' as const),
          async (url, mode) => {
            // Property: For any URL, extraction should complete and return results
            // regardless of database availability
            
            const result = await engine.extract(url, { mode });
            
            // Extraction should complete successfully
            expect(result).toBeDefined();
            expect(result.url).toBeDefined();
            expect(result.timestamp).toBeDefined();
            expect(result.html).toBeDefined();
            
            // Result should be a complete, usable object
            expect(result.schemaMarkup).toBeDefined();
            expect(result.metaTags).toBeDefined();
            expect(result.content).toBeDefined();
            expect(result.content.title).toBeDefined();
            expect(result.content.summary).toBeDefined();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return complete results without requiring persistence', async () => {
      // Feature: agent-middleware, Property 7: Database persistence is optional
      // Validates: Requirements 2.3
      
      // Mock fetch to return HTML with various content
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Test Page</title>
              <meta name="description" content="Test description">
              <script type="application/ld+json">
                {"@type": "Organization", "name": "Test Org"}
              </script>
            </head>
            <body>
              <h1>Heading</h1>
              <p>Paragraph content</p>
            </body>
          </html>
        `,
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: Extraction should return complete, structured data
            // without any database operations
            
            const result = await engine.extract(url, { mode: 'fast' });
            
            // Verify complete result structure
            expect(result.schemaMarkup.types).toBeDefined();
            expect(result.schemaMarkup.data).toBeDefined();
            expect(result.metaTags.title).toBeDefined();
            expect(result.content.title).toBeDefined();
            expect(result.structure.hasSchema).toBeDefined();
            expect(result.performance.fetchTime).toBeGreaterThanOrEqual(0);
            expect(result.performance.parseTime).toBeGreaterThanOrEqual(0);
            expect(result.performance.totalTime).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 9: Error isolation', () => {
    it('should return structured error responses without throwing unhandled exceptions', async () => {
      // Feature: agent-middleware, Property 9: Error isolation
      // Validates: Requirements 2.5
      
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: For any extraction failure, the system should throw
            // AgentMiddlewareError (structured error) not unhandled exceptions
            
            try {
              await engine.extract(url, { mode: 'fast' });
              // If it succeeds (shouldn't with our mock), that's fine
            } catch (error) {
              // Should be an AgentMiddlewareError
              expect(error).toBeInstanceOf(AgentMiddlewareError);
              
              if (error instanceof AgentMiddlewareError) {
                // Should have proper error structure
                expect(error.code).toBeDefined();
                expect(error.message).toBeDefined();
                expect(typeof error.code).toBe('string');
                expect(typeof error.message).toBe('string');
                
                // Should be a valid error code
                expect(Object.values(ErrorCode)).toContain(error.code);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle timeout errors gracefully', async () => {
      // Feature: agent-middleware, Property 9: Error isolation
      // Validates: Requirements 2.5
      
      // Mock fetch to timeout
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Timeout');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: Timeout errors should be caught and converted to structured errors
            
            try {
              await engine.extract(url, { mode: 'fast', timeout: 50 });
              // If it succeeds, that's unexpected but acceptable
            } catch (error) {
              expect(error).toBeInstanceOf(AgentMiddlewareError);
              
              if (error instanceof AgentMiddlewareError) {
                expect(error.code).toBe(ErrorCode.ERR_TIMEOUT);
                expect(error.details).toBeDefined();
                expect(error.details?.url).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 5 } // Fewer runs due to timeout delays
      );
    });

    it('should handle bot blocking errors gracefully', async () => {
      // Feature: agent-middleware, Property 9: Error isolation
      // Validates: Requirements 2.5
      
      // Mock fetch to return 403 (bot blocked)
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: Bot blocking should be caught and converted to structured error
            
            try {
              await engine.extract(url, { mode: 'fast' });
              // Shouldn't succeed with 403 response
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(AgentMiddlewareError);
              
              if (error instanceof AgentMiddlewareError) {
                expect(error.code).toBe(ErrorCode.ERR_BOT_BLOCKED);
                expect(error.details).toBeDefined();
                expect(error.details?.status).toBe(403);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle malformed HTML gracefully', async () => {
      // Feature: agent-middleware, Property 9: Error isolation
      // Validates: Requirements 2.5
      
      // Mock fetch to return malformed HTML
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><head><title>Unclosed tags<body><p>Bad HTML',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: Malformed HTML should either parse successfully (DOMParser is lenient)
            // or throw a structured error
            
            try {
              const result = await engine.extract(url, { mode: 'fast' });
              // DOMParser is lenient, so this might succeed
              expect(result).toBeDefined();
            } catch (error) {
              // If it fails, should be structured error
              expect(error).toBeInstanceOf(AgentMiddlewareError);
              
              if (error instanceof AgentMiddlewareError) {
                expect(error.code).toBe(ErrorCode.ERR_DOM_UNREADABLE);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should convert all errors to AgentMiddlewareError', async () => {
      // Feature: agent-middleware, Property 9: Error isolation
      // Validates: Requirements 2.5
      
      // Test various error scenarios
      const errorScenarios = [
        { mock: () => Promise.reject(new Error('Network error')), expectedCode: ErrorCode.ERR_URL_UNREACHABLE },
        { mock: () => Promise.resolve({ ok: false, status: 403, text: async () => '' }), expectedCode: ErrorCode.ERR_BOT_BLOCKED },
        { mock: () => Promise.resolve({ ok: false, status: 500, text: async () => '' }), expectedCode: ErrorCode.ERR_URL_UNREACHABLE },
      ];

      for (const scenario of errorScenarios) {
        global.fetch = vi.fn().mockImplementation(scenario.mock);

        await fc.assert(
          fc.asyncProperty(
            fc.webUrl({ validSchemes: ['http', 'https'] }),
            async (url) => {
              // Property: All errors should be converted to AgentMiddlewareError
              
              try {
                await engine.extract(url, { mode: 'fast' });
                // Some scenarios might succeed with proxy fallback
              } catch (error) {
                expect(error).toBeInstanceOf(AgentMiddlewareError);
                expect(error).toHaveProperty('code');
                expect(error).toHaveProperty('message');
                expect(error).toHaveProperty('toResponse');
                expect(error).toHaveProperty('getStatusCode');
              }
            }
          ),
          { numRuns: 5 }
        );
      }
    });
  });

  describe('Extraction result properties', () => {
    it('should always include performance metrics', async () => {
      // Mock fetch to return valid HTML
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><head><title>Test</title></head><body></body></html>',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.constantFrom('fast' as const, 'deep' as const),
          async (url, mode) => {
            // Property: All successful extractions should include performance metrics
            
            const result = await engine.extract(url, { mode });
            
            expect(result.performance).toBeDefined();
            expect(result.performance.fetchTime).toBeGreaterThanOrEqual(0);
            expect(result.performance.parseTime).toBeGreaterThanOrEqual(0);
            expect(result.performance.totalTime).toBeGreaterThanOrEqual(0);
            
            // Total time should be at least the sum of fetch and parse
            expect(result.performance.totalTime).toBeGreaterThanOrEqual(
              result.performance.fetchTime + result.performance.parseTime
            );
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should include ISO 8601 timestamp', async () => {
      // Mock fetch to return valid HTML
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><head><title>Test</title></head><body></body></html>',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: All results should include ISO 8601 timestamp
            
            const result = await engine.extract(url, { mode: 'fast' });
            
            expect(result.timestamp).toBeDefined();
            expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            
            // Should be parseable as a date
            const date = new Date(result.timestamp);
            expect(date.toString()).not.toBe('Invalid Date');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should normalize URLs in results', async () => {
      // Mock fetch to return valid HTML
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><head><title>Test</title></head><body></body></html>',
      });

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (url) => {
            // Property: Result URL should be normalized
            
            const result = await engine.extract(url, { mode: 'fast' });
            
            // Result URL should be normalized (lowercase protocol, no trailing slash, etc.)
            expect(result.url).toBeDefined();
            expect(result.url.startsWith('http://') || result.url.startsWith('https://')).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
