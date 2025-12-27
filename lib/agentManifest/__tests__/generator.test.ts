/**
 * Unit tests for manifest generator
 * Tests the core generation logic and error handling
 * 
 * @module lib/agentManifest/__tests__/generator.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateManifest, ManifestGenerationError, InvalidJSONError, SchemaValidationError } from '../generator';
import { buildSystemPrompt, buildUserPrompt } from '../prompts';

// Mock the OpenRouter client
vi.mock('../openRouterClient', () => ({
  createSimpleOpenRouterClient: vi.fn(),
}));

describe('Prompt Builders', () => {
  describe('buildSystemPrompt', () => {
    it('should contain Agent-Native Web standards keywords', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('Agent-Native Web');
      expect(prompt).toContain('agents.json');
      expect(prompt).toContain('industry-standard');
    });
    
    it('should contain standard web semantic roles', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('documentation');
      expect(prompt).toContain('pricing');
      expect(prompt).toContain('about');
      expect(prompt).toContain('product');
      expect(prompt).toContain('contact');
      expect(prompt).toContain('support');
    });
    
    it('should NOT contain academic terminology in instructions', () => {
      const prompt = buildSystemPrompt();
      
      // Extract the part before FORBIDDEN TERMS section
      const forbiddenSection = prompt.indexOf('FORBIDDEN TERMS');
      const instructionsPart = prompt.substring(0, forbiddenSection);
      
      // Academic terms should NOT appear in the instructions
      expect(instructionsPart).not.toContain('Semantic Topology');
      expect(instructionsPart).not.toContain('knowledge topology');
      
      // But they SHOULD appear in the FORBIDDEN TERMS section
      const forbiddenPart = prompt.substring(forbiddenSection);
      expect(forbiddenPart).toContain('axiom');
      expect(forbiddenPart).toContain('theorem');
      expect(forbiddenPart).toContain('lemma');
      expect(forbiddenPart).toContain('corollary');
    });
    
    it('should include schema structure', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('$schema');
      expect(prompt).toContain('identity');
      expect(prompt).toContain('knowledge');
      expect(prompt).toContain('actions');
    });
    
    it('should emphasize JSON-only output', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('ONLY valid JSON');
      expect(prompt).toContain('no markdown');
      expect(prompt).toContain('no explanations');
    });
    
    it('should include forbidden terms list', () => {
      const prompt = buildSystemPrompt();
      
      expect(prompt).toContain('FORBIDDEN TERMS');
      expect(prompt).toContain('do NOT use');
    });
  });
  
  describe('buildUserPrompt', () => {
    it('should include the provided URL', () => {
      const url = 'https://example.com';
      const prompt = buildUserPrompt(url);
      
      expect(prompt).toContain(url);
    });
    
    it('should request agents.json file', () => {
      const prompt = buildUserPrompt('https://example.com');
      
      expect(prompt).toContain('agents.json');
    });
    
    it('should mention standard web terminology', () => {
      const prompt = buildUserPrompt('https://example.com');
      
      expect(prompt).toContain('standard web terminology');
    });
    
    it('should NOT mention academic terminology', () => {
      const prompt = buildUserPrompt('https://example.com');
      
      expect(prompt).not.toContain('semantic topology');
      expect(prompt).not.toContain('axiom');
      expect(prompt).not.toContain('theorem');
    });
  });
});

describe('generateManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should throw ManifestGenerationError when client is not configured', async () => {
    const { createSimpleOpenRouterClient } = await import('../openRouterClient');
    vi.mocked(createSimpleOpenRouterClient).mockReturnValue(null);
    
    await expect(generateManifest('https://example.com')).rejects.toThrow(ManifestGenerationError);
    await expect(generateManifest('https://example.com')).rejects.toThrow('AI service is not configured');
  });
  
  it('should throw InvalidJSONError when LLM returns invalid JSON', async () => {
    const { createSimpleOpenRouterClient } = await import('../openRouterClient');
    
    const mockClient = {
      chat: vi.fn().mockResolvedValue('This is not JSON'),
    };
    
    vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);
    
    await expect(generateManifest('https://example.com')).rejects.toThrow(InvalidJSONError);
  });
  
  it('should throw SchemaValidationError when manifest fails validation', async () => {
    const { createSimpleOpenRouterClient } = await import('../openRouterClient');
    
    const invalidManifest = {
      $schema: 'https://anoteroslogos.com/schemas/agents-v1.json',
      // Missing required fields
    };
    
    const mockClient = {
      chat: vi.fn().mockResolvedValue(JSON.stringify(invalidManifest)),
    };
    
    vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);
    
    await expect(generateManifest('https://example.com')).rejects.toThrow(SchemaValidationError);
  });
  
  it('should successfully generate valid manifest', async () => {
    const { createSimpleOpenRouterClient } = await import('../openRouterClient');
    
    const validManifest = {
      $schema: 'https://anoteroslogos.com/schemas/agents-v1.json',
      version: '1.0',
      identity: {
        name: 'Example Corp',
        description: 'A comprehensive example website for testing purposes and validation',
        tags: ['Technology', 'Innovation', 'Testing'],
      },
      knowledge: [
        {
          role: 'about',
          url: '/about',
          description: 'About page - core company information',
        },
        {
          role: 'product',
          url: '/products',
          description: 'Products page - main offerings',
        },
        {
          role: 'documentation',
          url: '/docs',
          description: 'Technical documentation and guides',
        },
      ],
      actions: [],
    };
    
    const mockClient = {
      chat: vi.fn().mockResolvedValue(JSON.stringify(validManifest)),
    };
    
    vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);
    
    const result = await generateManifest('https://example.com');
    
    expect(result).toEqual(validManifest);
    expect(mockClient.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user' }),
      ]),
      expect.objectContaining({
        temperature: 0.7,
        max_tokens: 2000,
      })
    );
  });
  
  it('should handle markdown-wrapped JSON responses', async () => {
    const { createSimpleOpenRouterClient } = await import('../openRouterClient');
    
    const validManifest = {
      $schema: 'https://anoteroslogos.com/schemas/agents-v1.json',
      version: '1.0',
      identity: {
        name: 'Example Corp',
        description: 'A comprehensive example website for testing purposes and validation',
        tags: ['Technology', 'Innovation', 'Testing'],
      },
      knowledge: [
        {
          role: 'about',
          url: '/about',
          description: 'About page with company information',
        },
      ],
      actions: [],
    };
    
    const markdownWrapped = '```json\n' + JSON.stringify(validManifest, null, 2) + '\n```';
    
    const mockClient = {
      chat: vi.fn().mockResolvedValue(markdownWrapped),
    };
    
    vi.mocked(createSimpleOpenRouterClient).mockReturnValue(mockClient as any);
    
    const result = await generateManifest('https://example.com');
    
    expect(result).toEqual(validManifest);
  });
});
