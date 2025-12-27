/**
 * Tests for AUX Scoring Utilities
 * 
 * These tests verify the correctness of AUX Score calculation and classification.
 */

import { describe, it, expect } from 'vitest';
import { calculateAUXScore, classifyScore } from '../scoringUtils';
import type { ScrapedData, LLMAnalysis } from '../types';

describe('scoringUtils', () => {
  describe('calculateAUXScore', () => {
    it('should return the LLM score when no adjustments are needed', () => {
      const data: ScrapedData = {
        ariaScore: 0,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 50,
        frictionPoints: [],
        riskLevel: 'medium',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      expect(score).toBe(50);
    });
    
    it('should add bonus for available protocols', () => {
      const data: ScrapedData = {
        ariaScore: 0,
        protocols: [
          { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: true, url: 'https://example.com/.well-known/ai-plugin.json' },
        ],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 50,
        frictionPoints: [],
        riskLevel: 'medium',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 50 + (2 protocols * 2) = 54
      expect(score).toBe(54);
    });
    
    it('should add bonus for high ARIA density', () => {
      const data: ScrapedData = {
        ariaScore: 100,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 50,
        frictionPoints: [],
        riskLevel: 'medium',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 50 + (100/100 * 5) = 55
      expect(score).toBe(55);
    });
    
    it('should apply penalty for high-severity friction points', () => {
      const data: ScrapedData = {
        ariaScore: 0,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [
          { type: 'captcha', description: 'CAPTCHA detected', severity: 'high' },
          { type: 'interstitial', description: 'Popup detected', severity: 'high' },
        ],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 60,
        frictionPoints: [],
        riskLevel: 'medium',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 60 - (2 high * 5) = 50
      expect(score).toBe(50);
    });
    
    it('should apply penalty for medium-severity friction points', () => {
      const data: ScrapedData = {
        ariaScore: 0,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [
          { type: 'canvas', description: 'Canvas UI detected', severity: 'medium' },
        ],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 60,
        frictionPoints: [],
        riskLevel: 'medium',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 60 - (1 medium * 2) = 58
      expect(score).toBe(58);
    });
    
    it('should combine multiple adjustments correctly', () => {
      const data: ScrapedData = {
        ariaScore: 80,
        protocols: [
          { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
        ],
        interactiveElements: [],
        frictionPoints: [
          { type: 'captcha', description: 'CAPTCHA detected', severity: 'high' },
        ],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 60,
        frictionPoints: [],
        riskLevel: 'medium',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 60 + (1 protocol * 2) + (0.8 * 5) - (1 high * 5) = 60 + 2 + 4 - 5 = 61
      expect(score).toBe(61);
    });
    
    it('should clamp score to 0 minimum', () => {
      const data: ScrapedData = {
        ariaScore: 0,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [
          { type: 'captcha', description: 'CAPTCHA 1', severity: 'high' },
          { type: 'captcha', description: 'CAPTCHA 2', severity: 'high' },
          { type: 'captcha', description: 'CAPTCHA 3', severity: 'high' },
        ],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 10,
        frictionPoints: [],
        riskLevel: 'high',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 10 - (3 high * 5) = -5, clamped to 0
      expect(score).toBe(0);
    });
    
    it('should clamp score to 100 maximum', () => {
      const data: ScrapedData = {
        ariaScore: 100,
        protocols: [
          { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: true, url: 'https://example.com/.well-known/ai-plugin.json' },
          { name: 'mcp.json', available: true, url: 'https://example.com/.well-known/mcp.json' },
        ],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 95,
        frictionPoints: [],
        riskLevel: 'low',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 95 + (3 protocols * 2) + (1.0 * 5) = 106, clamped to 100
      expect(score).toBe(100);
    });
    
    it('should handle LLM scores outside valid range', () => {
      const data: ScrapedData = {
        ariaScore: 0,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 150, // Invalid score
        frictionPoints: [],
        riskLevel: 'low',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      expect(score).toBe(100); // Clamped to valid range
    });
    
    it('should round fractional scores to nearest integer', () => {
      const data: ScrapedData = {
        ariaScore: 50, // Will add 2.5 bonus
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        forms: [],
      };
      
      const llmAnalysis: LLMAnalysis = {
        score: 60,
        frictionPoints: [],
        riskLevel: 'medium',
        summary: 'Test summary',
        recommendations: [],
        intentTriggers: [],
      };
      
      const score = calculateAUXScore(data, llmAnalysis);
      // Base 60 + (0.5 * 5) = 62.5, rounded to 63
      expect(score).toBe(63);
    });
  });
  
  describe('classifyScore', () => {
    it('should classify score < 50 as Agent-Blind', () => {
      expect(classifyScore(0)).toBe('Agent-Blind');
      expect(classifyScore(25)).toBe('Agent-Blind');
      expect(classifyScore(49)).toBe('Agent-Blind');
    });
    
    it('should classify score 50-80 as Agent-Capable', () => {
      expect(classifyScore(50)).toBe('Agent-Capable');
      expect(classifyScore(65)).toBe('Agent-Capable');
      expect(classifyScore(80)).toBe('Agent-Capable');
    });
    
    it('should classify score > 80 as Agent-Ready', () => {
      expect(classifyScore(81)).toBe('Agent-Ready');
      expect(classifyScore(90)).toBe('Agent-Ready');
      expect(classifyScore(100)).toBe('Agent-Ready');
    });
    
    it('should handle boundary values correctly', () => {
      expect(classifyScore(49.9)).toBe('Agent-Blind');
      expect(classifyScore(50)).toBe('Agent-Capable');
      expect(classifyScore(80)).toBe('Agent-Capable');
      expect(classifyScore(80.1)).toBe('Agent-Ready');
    });
  });
});
