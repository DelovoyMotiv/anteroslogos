/**
 * LLM Reasoning Service - Unit Tests
 * 
 * Tests for the LLMReasoningService class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMReasoningService } from '../LLMReasoningService';
import type { ScrapedData } from '../types';

// Mock the enhanced OpenRouter client
vi.mock('../../citationIntelligence/llm/enhancedClient', () => ({
  createEnhancedOpenRouterClient: vi.fn(),
}));

describe('LLMReasoningService', () => {
  let service: LLMReasoningService;
  
  beforeEach(() => {
    service = new LLMReasoningService();
  });
  
  describe('buildPrompt', () => {
    it('should build a comprehensive prompt with all scraped data', () => {
      const scrapedData: ScrapedData = {
        ariaScore: 75.5,
        protocols: [
          { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: false, url: 'https://example.com/.well-known/ai-plugin.json' },
        ],
        interactiveElements: [
          {
            tag: 'button',
            selector: '#submit-btn',
            hasAriaLabel: true,
            ariaLabel: 'Submit form',
            role: 'button',
            text: 'Submit',
          },
          {
            tag: 'a',
            selector: '.nav-link',
            hasAriaLabel: false,
            text: 'Home',
          },
        ],
        frictionPoints: [
          {
            type: 'captcha',
            description: 'reCAPTCHA detected on login form',
            severity: 'high',
            location: '#login-form',
          },
        ],
        forms: [
          {
            selector: '#login-form',
            action: '/login',
            method: 'POST',
            inputs: [
              {
                tag: 'input',
                selector: '#username',
                hasAriaLabel: true,
                ariaLabel: 'Username',
                type: 'text',
              },
            ],
          },
        ],
      };
      
      const prompt = service.buildPrompt(scrapedData);
      
      // Verify prompt contains key information
      expect(prompt).toContain('75.5%');
      expect(prompt).toContain('agents.json');
      expect(prompt).toContain('✓ Available');
      expect(prompt).toContain('✗ Not Found');
      expect(prompt).toContain('button');
      expect(prompt).toContain('Submit form');
      expect(prompt).toContain('captcha');
      expect(prompt).toContain('reCAPTCHA detected');
      expect(prompt).toContain('/login');
      expect(prompt).toContain('POST');
      expect(prompt).toContain('valid JSON');
    });
    
    it('should handle empty data gracefully', () => {
      const scrapedData: ScrapedData = {
        ariaScore: 0,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const prompt = service.buildPrompt(scrapedData);
      
      expect(prompt).toContain('0.0%');
      expect(prompt).toContain('No agent-specific protocols detected');
      expect(prompt).toContain('No interactive elements found');
      expect(prompt).toContain('No friction points detected');
      expect(prompt).toContain('No forms found');
    });
    
    it('should truncate long lists of interactive elements', () => {
      const scrapedData: ScrapedData = {
        ariaScore: 50,
        protocols: [],
        interactiveElements: Array.from({ length: 20 }, (_, i) => ({
          tag: 'button',
          selector: `#btn-${i}`,
          hasAriaLabel: false,
        })),
        frictionPoints: [],
        forms: [],
      };
      
      const prompt = service.buildPrompt(scrapedData);
      
      expect(prompt).toContain('Found 20 interactive elements');
      expect(prompt).toContain('... and 10 more');
    });
  });
  
  describe('parseResponse', () => {
    it('should parse valid JSON response', () => {
      const validResponse = JSON.stringify({
        score: 75,
        frictionPoints: ['CAPTCHA on login', 'No ARIA labels'],
        riskLevel: 'medium',
        summary: 'Site is agent-capable but has some friction',
        recommendations: [
          {
            title: 'Add ARIA labels',
            description: 'Add aria-label attributes to interactive elements',
            priority: 'high',
            impact: 20,
            codeExample: '<button aria-label="Submit">Submit</button>',
          },
        ],
        intentTriggers: [
          {
            intent: 'login',
            selector: '#login-btn',
            confidence: 'high',
            element: {
              tag: 'button',
              selector: '#login-btn',
              hasAriaLabel: true,
              ariaLabel: 'Login',
            },
          },
        ],
      });
      
      const analysis = service.parseResponse(validResponse);
      
      expect(analysis.score).toBe(75);
      expect(analysis.riskLevel).toBe('medium');
      expect(analysis.summary).toBe('Site is agent-capable but has some friction');
      expect(analysis.frictionPoints).toHaveLength(2);
      expect(analysis.recommendations).toHaveLength(1);
      expect(analysis.intentTriggers).toHaveLength(1);
    });
    
    it('should parse JSON wrapped in markdown code blocks', () => {
      const markdownResponse = '```json\n' + JSON.stringify({
        score: 80,
        frictionPoints: [],
        riskLevel: 'low',
        summary: 'Site is agent-ready',
        recommendations: [],
        intentTriggers: [],
      }) + '\n```';
      
      const analysis = service.parseResponse(markdownResponse);
      
      expect(analysis.score).toBe(80);
      expect(analysis.riskLevel).toBe('low');
    });
    
    it('should throw error for invalid JSON', () => {
      const invalidResponse = 'This is not JSON';
      
      expect(() => service.parseResponse(invalidResponse)).toThrow('Failed to parse LLM response as JSON');
    });
    
    it('should throw error for missing required fields', () => {
      const incompleteResponse = JSON.stringify({
        score: 75,
        // Missing other required fields
      });
      
      expect(() => service.parseResponse(incompleteResponse)).toThrow();
    });
    
    it('should throw error for invalid score range', () => {
      const invalidScoreResponse = JSON.stringify({
        score: 150, // Invalid: > 100
        frictionPoints: [],
        riskLevel: 'low',
        summary: 'Test',
        recommendations: [],
        intentTriggers: [],
      });
      
      expect(() => service.parseResponse(invalidScoreResponse)).toThrow('Score must be between 0 and 100');
    });
    
    it('should throw error for invalid risk level', () => {
      const invalidRiskResponse = JSON.stringify({
        score: 75,
        frictionPoints: [],
        riskLevel: 'invalid', // Invalid risk level
        summary: 'Test',
        recommendations: [],
        intentTriggers: [],
      });
      
      expect(() => service.parseResponse(invalidRiskResponse)).toThrow('Missing or invalid "riskLevel" field');
    });
    
    it('should throw error for invalid recommendation structure', () => {
      const invalidRecResponse = JSON.stringify({
        score: 75,
        frictionPoints: [],
        riskLevel: 'low',
        summary: 'Test',
        recommendations: [
          {
            title: 'Test',
            // Missing required fields
          },
        ],
        intentTriggers: [],
      });
      
      expect(() => service.parseResponse(invalidRecResponse)).toThrow('Invalid recommendation structure');
    });
    
    it('should throw error for invalid recommendation priority', () => {
      const invalidPriorityResponse = JSON.stringify({
        score: 75,
        frictionPoints: [],
        riskLevel: 'low',
        summary: 'Test',
        recommendations: [
          {
            title: 'Test',
            description: 'Test',
            priority: 'invalid', // Invalid priority
            impact: 10,
          },
        ],
        intentTriggers: [],
      });
      
      expect(() => service.parseResponse(invalidPriorityResponse)).toThrow('Invalid recommendation priority');
    });
    
    it('should throw error for invalid intent trigger structure', () => {
      const invalidTriggerResponse = JSON.stringify({
        score: 75,
        frictionPoints: [],
        riskLevel: 'low',
        summary: 'Test',
        recommendations: [],
        intentTriggers: [
          {
            intent: 'login',
            // Missing required fields
          },
        ],
      });
      
      expect(() => service.parseResponse(invalidTriggerResponse)).toThrow('Invalid intent trigger structure');
    });
  });
  
  describe('analyzeAUX', () => {
    it('should throw error when OpenRouter client is not configured', async () => {
      const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
      vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(null);
      
      const scrapedData: ScrapedData = {
        ariaScore: 50,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      await expect(service.analyzeAUX(scrapedData)).rejects.toThrow('LLM service is not configured');
    });
    
    it('should successfully analyze data when client is configured', async () => {
      const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
      
      const mockClient = {
        chatWithModel: vi.fn(async () => {
          return JSON.stringify({
            score: 75,
            frictionPoints: ['Test friction'],
            riskLevel: 'medium',
            summary: 'Test summary',
            recommendations: [
              {
                title: 'Test rec',
                description: 'Test desc',
                priority: 'high',
                impact: 20,
              },
            ],
            intentTriggers: [],
          });
        }),
      };
      
      vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(mockClient as any);
      
      const scrapedData: ScrapedData = {
        ariaScore: 50,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const analysis = await service.analyzeAUX(scrapedData);
      
      expect(analysis.score).toBe(75);
      expect(analysis.riskLevel).toBe('medium');
      expect(mockClient.chatWithModel).toHaveBeenCalledWith(
        'anthropic/claude-sonnet-4.5',
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({
          temperature: 0.3,
          maxTokens: 2000,
          taskType: 'analysis',
        })
      );
    });
    
    it('should handle LLM errors gracefully', async () => {
      const { createEnhancedOpenRouterClient } = await import('../../citationIntelligence/llm/enhancedClient');
      
      const mockClient = {
        chatWithModel: vi.fn(async () => {
          throw new Error('API rate limit exceeded');
        }),
      };
      
      vi.mocked(createEnhancedOpenRouterClient).mockReturnValue(mockClient as any);
      
      const scrapedData: ScrapedData = {
        ariaScore: 50,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      await expect(service.analyzeAUX(scrapedData)).rejects.toThrow('LLM analysis failed: API rate limit exceeded');
    });
  });
});
