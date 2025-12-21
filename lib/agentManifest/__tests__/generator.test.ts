/**
 * Unit tests for manifest generator
 * Tests the core generation logic and error handling
 * 
 * @module lib/agentManifest/__tests__/generator.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateManifest, ManifestGenerationError, InvalidJSONError, SchemaValidationError } from '../generator';
import { buildSystemPrompt, buildUserPrompt } from '../prompts';

// Mock the enhanced client
vi.mock('../../citationIntelligence/llm/enhancedClient', () => ({
  createEnhancedOpenRouterClient: vi.fn(),
}));

describe('Prompt Builders', () => {
  describe('buildSystemPrompt', () => {
    it('should contain Semantic Topology keywords', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('Semantic Topology');
      expect(prompt).toContain('Agentic Web');
      expect(prompt).toContain('logos.json');
      expect(prompt).toContain('axiom');
      expect(prompt).toContain('theorem');
      expect(prompt).toContain('lemma');
      expect(prompt).toContain('corollary');
      expect(prompt).toContain('definition');
    });
    
    it('should include schema structure', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('$schema');
      expect(prompt).toContain('meta');
      expect(prompt).toContain('identity');
      expect(prompt).toContain('knowledge_topology');
      expect(prompt).toContain('directives');
    });
    
    it('should emphasize JSON-only output', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('ONLY valid JSON');
      expect(prompt).toContain('no markdown');
      expect(prompt).toContain('no explanations');
    });
  });
  
  describe('buildUserPrompt', () => {
    it('should include the provided URL', () => {
      const url = 'https://example.com';
      const prompt = buildUserPrompt(url);
      
      expect(prompt).toContain(url);
    });
    
    it('should request comprehensive manifest', () => {
      const prompt = buildUserPrompt('https://example.com');
      
      expect(prompt).toContain('logos.json');
      expect(prompt).toContain('semantic topology');
      expect(prompt).toContain('knowledge roots');
      expect(prompt).toContain('semantic roles');
    });
  });
});

describe('generateManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should throw ManifestGenerationError when client is not configured', async () => {
    const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
    vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(null);
    
    await expect(generateManifest('https://example.com')).rejects.toThrow(ManifestGenerationError);
    await expect(generateManifest('https://example.com')).rejects.toThrow('AI service is not configured');
  });
  
  it('should throw InvalidJSONError when LLM returns invalid JSON', async () => {
    const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
    
    const mockClient = {
      chatWithModel: vi.fn().mockResolvedValue('This is not JSON'),
    };
    
    vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(mockClient as any);
    
    await expect(generateManifest('https://example.com')).rejects.toThrow(InvalidJSONError);
  });
  
  it('should throw SchemaValidationError when manifest fails validation', async () => {
    const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
    
    const invalidManifest = {
      $schema: 'https://anoteroslogos.com/schemas/logos-v1.json',
      // Missing required fields
    };
    
    const mockClient = {
      chatWithModel: vi.fn().mockResolvedValue(JSON.stringify(invalidManifest)),
    };
    
    vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(mockClient as any);
    
    await expect(generateManifest('https://example.com')).rejects.toThrow(SchemaValidationError);
  });
  
  it('should successfully generate valid manifest', async () => {
    const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
    
    const validManifest = {
      $schema: 'https://anoteroslogos.com/schemas/logos-v1.json',
      meta: {
        version: '1.0',
        updated: new Date().toISOString(),
        authority_level: 'self-declared',
      },
      identity: {
        name: 'Example Corp',
        description: 'A comprehensive example website for testing purposes',
        domain_focus: ['Technology', 'Innovation', 'Testing'],
      },
      knowledge_topology: {
        roots: [
          {
            url: '/',
            semantic_role: 'axiom',
            instruction: 'Homepage - foundational entry point',
          },
          {
            url: '/about',
            semantic_role: 'theorem',
            instruction: 'About page - core company information',
          },
          {
            url: '/products',
            semantic_role: 'theorem',
            instruction: 'Products page - main offerings',
          },
        ],
      },
      directives: {
        crawling: 'allow-standard',
        attribution: 'require-link',
      },
    };
    
    const mockClient = {
      chatWithModel: vi.fn().mockResolvedValue(JSON.stringify(validManifest)),
    };
    
    vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(mockClient as any);
    
    const result = await generateManifest('https://example.com');
    
    expect(result).toEqual(validManifest);
    expect(mockClient.chatWithModel).toHaveBeenCalledWith(
      'anthropic/claude-sonnet-4.5',
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user' }),
      ]),
      expect.objectContaining({
        temperature: 0.7,
        maxTokens: 2000,
        taskType: 'content_opt',
      })
    );
  });
  
  it('should handle markdown-wrapped JSON responses', async () => {
    const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
    
    const validManifest = {
      $schema: 'https://anoteroslogos.com/schemas/logos-v1.json',
      meta: {
        version: '1.0',
        updated: new Date().toISOString(),
        authority_level: 'self-declared',
      },
      identity: {
        name: 'Example Corp',
        description: 'A comprehensive example website for testing purposes',
        domain_focus: ['Technology', 'Innovation', 'Testing'],
      },
      knowledge_topology: {
        roots: [
          {
            url: '/',
            semantic_role: 'axiom',
            instruction: 'Homepage - foundational entry point',
          },
        ],
      },
      directives: {
        crawling: 'allow-standard',
        attribution: 'require-link',
      },
    };
    
    const markdownWrapped = '```json\n' + JSON.stringify(validManifest, null, 2) + '\n```';
    
    const mockClient = {
      chatWithModel: vi.fn().mockResolvedValue(markdownWrapped),
    };
    
    vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(mockClient as any);
    
    const result = await generateManifest('https://example.com');
    
    expect(result).toEqual(validManifest);
  });
});
