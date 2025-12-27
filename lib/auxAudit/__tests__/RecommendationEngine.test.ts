/**
 * RecommendationEngine Tests
 * 
 * Tests for the recommendation generation system
 */

import { describe, it, expect } from 'vitest';
import { RecommendationEngine } from '../RecommendationEngine';
import type { AUXAuditResults, FrictionPoint, InteractiveElement } from '../types';

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();

  describe('generateRecommendations', () => {
    it('should generate protocol recommendations for missing agents.json', () => {
      const auditResults: AUXAuditResults = {
        score: 50,
        classification: 'Agent-Capable',
        protocols: [
          { name: 'agents.json', available: false, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: true, url: 'https://example.com/.well-known/ai-plugin.json' },
          { name: 'mcp.json', available: true, url: 'https://example.com/.well-known/mcp.json' },
          { name: 'robots.txt', available: true, url: 'https://example.com/robots.txt' }
        ],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const agentsJsonRec = recommendations.find(r => r.title.includes('agents.json'));
      expect(agentsJsonRec).toBeDefined();
      expect(agentsJsonRec?.priority).toBe('high');
      expect(agentsJsonRec?.codeExample).toBeDefined();
      expect(agentsJsonRec?.docLink).toBeDefined();
    });

    it('should generate protocol recommendations for missing ai-plugin.json', () => {
      const auditResults: AUXAuditResults = {
        score: 50,
        classification: 'Agent-Capable',
        protocols: [
          { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: false, url: 'https://example.com/.well-known/ai-plugin.json' },
          { name: 'mcp.json', available: true, url: 'https://example.com/.well-known/mcp.json' },
          { name: 'robots.txt', available: true, url: 'https://example.com/robots.txt' }
        ],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const aiPluginRec = recommendations.find(r => r.title.includes('OpenAI plugin'));
      expect(aiPluginRec).toBeDefined();
      expect(aiPluginRec?.priority).toBe('high');
      expect(aiPluginRec?.codeExample).toBeDefined();
    });

    it('should generate protocol recommendations for missing mcp.json', () => {
      const auditResults: AUXAuditResults = {
        score: 50,
        classification: 'Agent-Capable',
        protocols: [
          { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: true, url: 'https://example.com/.well-known/ai-plugin.json' },
          { name: 'mcp.json', available: false, url: 'https://example.com/.well-known/mcp.json' },
          { name: 'robots.txt', available: true, url: 'https://example.com/robots.txt' }
        ],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const mcpRec = recommendations.find(r => r.title.includes('Model Context Protocol'));
      expect(mcpRec).toBeDefined();
      expect(mcpRec?.priority).toBe('medium');
      expect(mcpRec?.codeExample).toBeDefined();
    });

    it('should generate ARIA recommendations for low ARIA score', () => {
      const auditResults: AUXAuditResults = {
        score: 40,
        classification: 'Agent-Blind',
        protocols: [],
        ariaScore: 30,
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'high',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const ariaRec = recommendations.find(r => r.title.includes('ARIA labels'));
      expect(ariaRec).toBeDefined();
      expect(ariaRec?.priority).toBe('high');
      expect(ariaRec?.description).toContain('30.0%');
    });

    it('should generate ARIA recommendations for medium ARIA score', () => {
      const auditResults: AUXAuditResults = {
        score: 60,
        classification: 'Agent-Capable',
        protocols: [],
        ariaScore: 65,
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const ariaRec = recommendations.find(r => r.title.includes('ARIA coverage'));
      expect(ariaRec).toBeDefined();
      expect(ariaRec?.priority).toBe('medium');
    });

    it('should generate recommendations for unlabeled form inputs', () => {
      const unlabeledInputs: InteractiveElement[] = Array.from({ length: 10 }, (_, i) => ({
        tag: 'input',
        selector: `input#field${i}`,
        hasAriaLabel: false,
        type: 'text'
      }));

      const auditResults: AUXAuditResults = {
        score: 50,
        classification: 'Agent-Capable',
        protocols: [],
        ariaScore: 75,
        interactiveElements: unlabeledInputs,
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const inputRec = recommendations.find(r => r.title.includes('Label form inputs'));
      expect(inputRec).toBeDefined();
      expect(inputRec?.priority).toBe('high');
      expect(inputRec?.description).toContain('10');
    });

    it('should generate friction recommendations for CAPTCHAs', () => {
      const frictionPoints: FrictionPoint[] = [
        {
          type: 'captcha',
          description: 'CAPTCHA detected',
          severity: 'high'
        }
      ];

      const auditResults: AUXAuditResults = {
        score: 30,
        classification: 'Agent-Blind',
        protocols: [],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints,
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'high',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const captchaRec = recommendations.find(r => r.title.includes('CAPTCHA alternatives'));
      expect(captchaRec).toBeDefined();
      expect(captchaRec?.priority).toBe('high');
      expect(captchaRec?.impact).toBe(35);
    });

    it('should generate friction recommendations for interstitials', () => {
      const frictionPoints: FrictionPoint[] = [
        {
          type: 'interstitial',
          description: 'Modal detected',
          severity: 'medium'
        }
      ];

      const auditResults: AUXAuditResults = {
        score: 50,
        classification: 'Agent-Capable',
        protocols: [],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints,
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const interstitialRec = recommendations.find(r => r.title.includes('interstitials dismissible'));
      expect(interstitialRec).toBeDefined();
      expect(interstitialRec?.priority).toBe('medium');
    });

    it('should generate friction recommendations for canvas UI', () => {
      const frictionPoints: FrictionPoint[] = [
        {
          type: 'canvas',
          description: 'Canvas UI detected',
          severity: 'high'
        }
      ];

      const auditResults: AUXAuditResults = {
        score: 40,
        classification: 'Agent-Blind',
        protocols: [],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints,
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'high',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const canvasRec = recommendations.find(r => r.title.includes('DOM alternatives'));
      expect(canvasRec).toBeDefined();
      expect(canvasRec?.priority).toBe('high');
      expect(canvasRec?.impact).toBe(30);
    });

    it('should generate friction recommendations for auth walls', () => {
      const frictionPoints: FrictionPoint[] = [
        {
          type: 'auth-wall',
          description: 'Authentication required',
          severity: 'medium'
        }
      ];

      const auditResults: AUXAuditResults = {
        score: 45,
        classification: 'Agent-Blind',
        protocols: [],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints,
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const authRec = recommendations.find(r => r.title.includes('agent authentication'));
      expect(authRec).toBeDefined();
      expect(authRec?.priority).toBe('medium');
    });

    it('should prioritize recommendations by priority then impact', () => {
      const frictionPoints: FrictionPoint[] = [
        { type: 'captcha', description: 'CAPTCHA', severity: 'high' },
        { type: 'interstitial', description: 'Modal', severity: 'medium' },
        { type: 'canvas', description: 'Canvas', severity: 'high' }
      ];

      const auditResults: AUXAuditResults = {
        score: 30,
        classification: 'Agent-Blind',
        protocols: [
          { name: 'agents.json', available: false, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: false, url: 'https://example.com/.well-known/ai-plugin.json' },
          { name: 'mcp.json', available: false, url: 'https://example.com/.well-known/mcp.json' }
        ],
        ariaScore: 25,
        interactiveElements: [],
        frictionPoints,
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'high',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      // All high priority recommendations should come first
      const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
      const firstHighPriority = recommendations.slice(0, highPriorityCount);
      expect(firstHighPriority.every(r => r.priority === 'high')).toBe(true);
      
      // Within high priority, higher impact should come first
      for (let i = 0; i < firstHighPriority.length - 1; i++) {
        expect(firstHighPriority[i].impact).toBeGreaterThanOrEqual(firstHighPriority[i + 1].impact);
      }
    });

    it('should include code examples for all recommendations', () => {
      const auditResults: AUXAuditResults = {
        score: 30,
        classification: 'Agent-Blind',
        protocols: [
          { name: 'agents.json', available: false, url: 'https://example.com/agents.json' }
        ],
        ariaScore: 25,
        interactiveElements: [],
        frictionPoints: [
          { type: 'captcha', description: 'CAPTCHA', severity: 'high' }
        ],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'high',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      // Every recommendation should have either a code example or doc link
      recommendations.forEach(rec => {
        expect(rec.codeExample || rec.docLink).toBeDefined();
      });
    });

    it('should handle empty audit results gracefully', () => {
      const auditResults: AUXAuditResults = {
        score: 100,
        classification: 'Agent-Ready',
        protocols: [
          { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
          { name: 'ai-plugin.json', available: true, url: 'https://example.com/.well-known/ai-plugin.json' },
          { name: 'mcp.json', available: true, url: 'https://example.com/.well-known/mcp.json' }
        ],
        ariaScore: 95,
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Perfect site',
        riskLevel: 'low',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      // Should return empty or minimal recommendations for a perfect site
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should generate robots.txt recommendation when agents are not allowed', () => {
      const auditResults: AUXAuditResults = {
        score: 50,
        classification: 'Agent-Capable',
        protocols: [
          { 
            name: 'robots.txt', 
            available: true, 
            url: 'https://example.com/robots.txt',
            content: {
              allowsOAI: false,
              allowsCCBot: false,
              directives: []
            }
          }
        ],
        ariaScore: 75,
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
        summary: 'Test',
        riskLevel: 'medium',
        analyzedAt: new Date().toISOString()
      };

      const recommendations = engine.generateRecommendations(auditResults);
      
      const robotsRec = recommendations.find(r => r.title.includes('robots.txt'));
      expect(robotsRec).toBeDefined();
      expect(robotsRec?.priority).toBe('medium');
    });
  });
});
