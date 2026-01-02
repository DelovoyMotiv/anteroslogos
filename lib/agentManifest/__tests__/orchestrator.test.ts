/**
 * Tests for ManifestGeneratorOrchestrator
 * 
 * @module lib/agentManifest/__tests__/orchestrator.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifestGeneratorOrchestrator } from '../orchestrator';
import { ScrapingService } from '../scraping';
import { LivenessValidator, EnhancedValidator } from '../validation';
import { TruthEnginePromptBuilder } from '../prompts';
import { ManifestGenerationError, ErrorCode, ScrapeError } from '../errors';
import type { ScrapedContent, AgentsJSON } from '../types';

// Mock the openRouterClient
vi.mock('../openRouterClient', () => ({
  createSimpleOpenRouterClient: vi.fn(() => ({
    chat: vi.fn(),
  })),
}));

describe('ManifestGeneratorOrchestrator', () => {
  let orchestrator: ManifestGeneratorOrchestrator;
  let mockScrapingService: ScrapingService;
  let mockLivenessValidator: LivenessValidator;
  let mockEnhancedValidator: EnhancedValidator;
  let mockPromptBuilder: TruthEnginePromptBuilder;

  const mockScrapedContent: ScrapedContent = {
    url: 'https://example.com',
    title: 'Example Site',
    description: 'An example website for testing',
    headings: ['Welcome', 'About Us', 'Contact'],
    links: ['/about', '/contact', '/pricing'],
    textContent: 'This is example text content that is long enough to pass validation. '.repeat(10),
    metadata: {
      contentLength: 1000,
      textLength: 500,
      extractionMethod: 'static',
      timestamp: new Date().toISOString(),
    },
  };

  const mockManifest: AgentsJSON = {
    $schema: 'https://anoteroslogos.com/schemas/agents-v1.json',
    version: '1.0',
    identity: {
      name: 'Example Site',
      description: 'An example website for testing purposes',
      tags: ['example', 'testing'],
    },
    knowledge: [
      {
        role: 'about',
        url: '/about',
        description: 'Information about our company and mission',
      },
    ],
    actions: [],
  };

  beforeEach(() => {
    // Create mock instances
    mockScrapingService = {
      scrapeForManifest: vi.fn(),
      cleanup: vi.fn(),
    } as any;

    mockLivenessValidator = {
      validate: vi.fn(),
    } as any;

    mockEnhancedValidator = {
      validate: vi.fn(),
    } as any;

    mockPromptBuilder = {
      buildSystemPrompt: vi.fn(() => 'system prompt'),
      buildUserPrompt: vi.fn(() => 'user prompt'),
    } as any;

    orchestrator = new ManifestGeneratorOrchestrator(
      mockScrapingService,
      mockLivenessValidator,
      mockEnhancedValidator,
      mockPromptBuilder
    );
  });

  describe('generate', () => {
    it('should successfully generate a manifest', async () => {
      // Setup mocks
      vi.mocked(mockScrapingService.scrapeForManifest).mockResolvedValue(mockScrapedContent);
      vi.mocked(mockLivenessValidator.validate).mockReturnValue(undefined);
      vi.mocked(mockEnhancedValidator.validate).mockReturnValue({
        success: true,
        data: mockManifest,
      });

      // Mock LLM client
      const { createSimpleOpenRouterClient } = await import('../openRouterClient');
      const mockClient = {
        chat: vi.fn().mockResolvedValue(JSON.stringify(mockManifest)),
      };
      vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);

      // Execute
      const result = await orchestrator.generate('https://example.com');

      // Verify
      expect(result).toEqual(mockManifest);
      expect(mockScrapingService.scrapeForManifest).toHaveBeenCalledWith('https://example.com');
      expect(mockLivenessValidator.validate).toHaveBeenCalledWith(mockScrapedContent);
      expect(mockEnhancedValidator.validate).toHaveBeenCalledWith(
        mockManifest,
        mockScrapedContent
      );
    });

    it('should throw ManifestGenerationError when scraping fails', async () => {
      // Setup mock to throw ScrapeError
      const scrapeError = new ScrapeError(
        'Content too short',
        'INSUFFICIENT_CONTENT',
        {
          url: 'https://example.com',
          contentLength: 100,
          textLength: 50,
        }
      );
      vi.mocked(mockScrapingService.scrapeForManifest).mockRejectedValue(scrapeError);

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.INSUFFICIENT_CONTENT,
      });
    });

    it('should throw ManifestGenerationError when liveness validation fails', async () => {
      // Setup mocks
      vi.mocked(mockScrapingService.scrapeForManifest).mockResolvedValue(mockScrapedContent);
      
      const scrapeError = new ScrapeError(
        'Text content too short',
        'NO_TEXT',
        {
          url: 'https://example.com',
          contentLength: 600,
          textLength: 100,
        }
      );
      vi.mocked(mockLivenessValidator.validate).mockImplementation(() => {
        throw scrapeError;
      });

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.INSUFFICIENT_CONTENT,
      });
    });

    it('should throw ManifestGenerationError when LLM times out', async () => {
      // Setup mocks
      vi.mocked(mockScrapingService.scrapeForManifest).mockResolvedValue(mockScrapedContent);
      vi.mocked(mockLivenessValidator.validate).mockReturnValue(undefined);

      // Mock LLM client to timeout
      const { createSimpleOpenRouterClient } = await import('../openRouterClient');
      const mockClient = {
        chat: vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out')), 100);
          });
        }),
      };
      vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.LLM_TIMEOUT,
      });
    }, 10000);

    it('should throw ManifestGenerationError when LLM returns invalid JSON', async () => {
      // Setup mocks
      vi.mocked(mockScrapingService.scrapeForManifest).mockResolvedValue(mockScrapedContent);
      vi.mocked(mockLivenessValidator.validate).mockReturnValue(undefined);

      // Mock LLM client to return invalid JSON
      const { createSimpleOpenRouterClient } = await import('../openRouterClient');
      const mockClient = {
        chat: vi.fn().mockResolvedValue('This is not valid JSON'),
      };
      vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.INVALID_JSON,
      });
    });

    it('should throw ManifestGenerationError when validation fails', async () => {
      // Setup mocks
      vi.mocked(mockScrapingService.scrapeForManifest).mockResolvedValue(mockScrapedContent);
      vi.mocked(mockLivenessValidator.validate).mockReturnValue(undefined);
      vi.mocked(mockEnhancedValidator.validate).mockReturnValue({
        success: false,
        errors: [
          {
            path: 'identity.description',
            message: 'Description too short',
            severity: 'error',
          },
        ],
      });

      // Mock LLM client
      const { createSimpleOpenRouterClient } = await import('../openRouterClient');
      const mockClient = {
        chat: vi.fn().mockResolvedValue(JSON.stringify(mockManifest)),
      };
      vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
      });
    });

    it('should handle bot blocking errors', async () => {
      // Setup mock to throw 403 error
      const error = new Error('HTTP 403 Forbidden');
      vi.mocked(mockScrapingService.scrapeForManifest).mockRejectedValue(error);

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.BOT_BLOCKED,
      });
    });

    it('should handle network timeout errors', async () => {
      // Setup mock to throw timeout error
      const error = new Error('ETIMEDOUT: connection timeout');
      vi.mocked(mockScrapingService.scrapeForManifest).mockRejectedValue(error);

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.NETWORK_ERROR,
      });
    });

    it('should handle LLM insufficient context error', async () => {
      // Setup mocks
      vi.mocked(mockScrapingService.scrapeForManifest).mockResolvedValue(mockScrapedContent);
      vi.mocked(mockLivenessValidator.validate).mockReturnValue(undefined);

      // Mock LLM client to return insufficient context error
      const { createSimpleOpenRouterClient } = await import('../openRouterClient');
      const mockClient = {
        chat: vi.fn().mockResolvedValue(JSON.stringify({
          error: 'INSUFFICIENT_CONTEXT',
          message: 'The provided content is insufficient',
        })),
      };
      vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);

      // Execute and verify
      await expect(orchestrator.generate('https://example.com')).rejects.toThrow(
        ManifestGenerationError
      );
      await expect(orchestrator.generate('https://example.com')).rejects.toMatchObject({
        code: ErrorCode.INSUFFICIENT_CONTENT,
      });
    });

    it('should parse markdown-wrapped JSON responses', async () => {
      // Setup mocks
      vi.mocked(mockScrapingService.scrapeForManifest).mockResolvedValue(mockScrapedContent);
      vi.mocked(mockLivenessValidator.validate).mockReturnValue(undefined);
      vi.mocked(mockEnhancedValidator.validate).mockReturnValue({
        success: true,
        data: mockManifest,
      });

      // Mock LLM client to return markdown-wrapped JSON
      const { createSimpleOpenRouterClient } = await import('../openRouterClient');
      const mockClient = {
        chat: vi.fn().mockResolvedValue(`\`\`\`json\n${JSON.stringify(mockManifest)}\n\`\`\``),
      };
      vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);

      // Execute
      const result = await orchestrator.generate('https://example.com');

      // Verify
      expect(result).toEqual(mockManifest);
    });
  });

  describe('cleanup', () => {
    it('should cleanup scraping service resources', async () => {
      await orchestrator.cleanup();
      expect(mockScrapingService.cleanup).toHaveBeenCalled();
    });
  });
});
