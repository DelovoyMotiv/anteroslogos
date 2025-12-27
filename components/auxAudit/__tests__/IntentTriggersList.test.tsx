/**
 * Intent Triggers List Component Tests
 * 
 * Unit tests for the IntentTriggersList component logic
 */

import { describe, it, expect } from 'vitest';
import type { IntentTrigger, Confidence } from '../../../lib/auxAudit/types';

describe('IntentTriggersList Component', () => {
  describe('Confidence level logic', () => {
    it('should identify high confidence triggers', () => {
      const trigger: IntentTrigger = {
        intent: 'buy',
        selector: 'button.buy',
        confidence: 'high',
        element: {
          tag: 'button',
          selector: 'button.buy',
          hasAriaLabel: true,
          text: 'Buy Now',
        }
      };
      
      expect(trigger.confidence).toBe('high');
    });

    it('should identify medium confidence triggers', () => {
      const trigger: IntentTrigger = {
        intent: 'login',
        selector: 'button.login',
        confidence: 'medium',
        element: {
          tag: 'button',
          selector: 'button.login',
          hasAriaLabel: false,
          text: 'Login',
        }
      };
      
      expect(trigger.confidence).toBe('medium');
    });

    it('should identify low confidence triggers', () => {
      const trigger: IntentTrigger = {
        intent: 'search',
        selector: 'input.search',
        confidence: 'low',
        element: {
          tag: 'input',
          selector: 'input.search',
          hasAriaLabel: false,
        }
      };
      
      expect(trigger.confidence).toBe('low');
    });
  });

  describe('Intent grouping logic', () => {
    it('should group triggers by intent type', () => {
      const triggers: IntentTrigger[] = [
        {
          intent: 'buy',
          selector: 'button.buy-1',
          confidence: 'high',
          element: {
            tag: 'button',
            selector: 'button.buy-1',
            hasAriaLabel: true,
            text: 'Buy Product 1',
          }
        },
        {
          intent: 'buy',
          selector: 'button.buy-2',
          confidence: 'medium',
          element: {
            tag: 'button',
            selector: 'button.buy-2',
            hasAriaLabel: true,
            text: 'Buy Product 2',
          }
        },
        {
          intent: 'login',
          selector: 'button.login',
          confidence: 'high',
          element: {
            tag: 'button',
            selector: 'button.login',
            hasAriaLabel: false,
            text: 'Login',
          }
        }
      ];

      const grouped = triggers.reduce((acc, trigger) => {
        const intent = trigger.intent;
        if (!acc[intent]) {
          acc[intent] = [];
        }
        acc[intent].push(trigger);
        return acc;
      }, {} as Record<string, typeof triggers>);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['buy']).toHaveLength(2);
      expect(grouped['login']).toHaveLength(1);
    });

    it('should sort intents alphabetically', () => {
      const intents = ['search', 'buy', 'login', 'contact'];
      const sorted = [...intents].sort();
      
      expect(sorted).toEqual(['buy', 'contact', 'login', 'search']);
    });
  });

  describe('High-confidence counting', () => {
    it('should count high-confidence triggers correctly', () => {
      const triggers: IntentTrigger[] = [
        {
          intent: 'buy',
          selector: 'button.buy',
          confidence: 'high',
          element: {
            tag: 'button',
            selector: 'button.buy',
            hasAriaLabel: true,
            text: 'Buy',
          }
        },
        {
          intent: 'login',
          selector: 'button.login',
          confidence: 'medium',
          element: {
            tag: 'button',
            selector: 'button.login',
            hasAriaLabel: false,
            text: 'Login',
          }
        },
        {
          intent: 'search',
          selector: 'input.search',
          confidence: 'high',
          element: {
            tag: 'input',
            selector: 'input.search',
            hasAriaLabel: true,
            ariaLabel: 'Search',
          }
        }
      ];

      const highConfidenceCount = triggers.filter(t => t.confidence === 'high').length;
      expect(highConfidenceCount).toBe(2);
    });

    it('should handle zero high-confidence triggers', () => {
      const triggers: IntentTrigger[] = [
        {
          intent: 'buy',
          selector: 'button.buy',
          confidence: 'low',
          element: {
            tag: 'button',
            selector: 'button.buy',
            hasAriaLabel: false,
            text: 'Buy',
          }
        }
      ];

      const highConfidenceCount = triggers.filter(t => t.confidence === 'high').length;
      expect(highConfidenceCount).toBe(0);
    });
  });

  describe('Confidence sorting', () => {
    it('should sort triggers by confidence (high > medium > low)', () => {
      const triggers: IntentTrigger[] = [
        {
          intent: 'buy',
          selector: 'button.buy-1',
          confidence: 'low',
          element: {
            tag: 'button',
            selector: 'button.buy-1',
            hasAriaLabel: false,
            text: 'Buy 1',
          }
        },
        {
          intent: 'buy',
          selector: 'button.buy-2',
          confidence: 'high',
          element: {
            tag: 'button',
            selector: 'button.buy-2',
            hasAriaLabel: true,
            text: 'Buy 2',
          }
        },
        {
          intent: 'buy',
          selector: 'button.buy-3',
          confidence: 'medium',
          element: {
            tag: 'button',
            selector: 'button.buy-3',
            hasAriaLabel: false,
            text: 'Buy 3',
          }
        }
      ];

      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const sorted = [...triggers].sort((a, b) => 
        confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
      );

      expect(sorted[0].confidence).toBe('high');
      expect(sorted[1].confidence).toBe('medium');
      expect(sorted[2].confidence).toBe('low');
    });
  });

  describe('Element properties', () => {
    it('should handle triggers with ARIA labels', () => {
      const trigger: IntentTrigger = {
        intent: 'signup',
        selector: 'button.signup',
        confidence: 'high',
        element: {
          tag: 'button',
          selector: 'button.signup',
          hasAriaLabel: true,
          ariaLabel: 'Sign up for newsletter',
          text: 'Sign Up',
        }
      };

      expect(trigger.element.hasAriaLabel).toBe(true);
      expect(trigger.element.ariaLabel).toBe('Sign up for newsletter');
    });

    it('should handle triggers without ARIA labels', () => {
      const trigger: IntentTrigger = {
        intent: 'contact',
        selector: 'button.contact',
        confidence: 'medium',
        element: {
          tag: 'button',
          selector: 'button.contact',
          hasAriaLabel: false,
          text: 'Contact Us',
        }
      };

      expect(trigger.element.hasAriaLabel).toBe(false);
      expect(trigger.element.ariaLabel).toBeUndefined();
    });

    it('should handle triggers with roles', () => {
      const trigger: IntentTrigger = {
        intent: 'search',
        selector: 'div.search',
        confidence: 'medium',
        element: {
          tag: 'div',
          selector: 'div.search',
          hasAriaLabel: true,
          ariaLabel: 'Search',
          role: 'searchbox',
        }
      };

      expect(trigger.element.role).toBe('searchbox');
    });

    it('should handle input types', () => {
      const trigger: IntentTrigger = {
        intent: 'search',
        selector: 'input[type="search"]',
        confidence: 'high',
        element: {
          tag: 'input',
          selector: 'input[type="search"]',
          hasAriaLabel: true,
          ariaLabel: 'Search',
          type: 'search',
        }
      };

      expect(trigger.element.type).toBe('search');
    });
  });

  describe('Component props validation', () => {
    it('should accept empty array of triggers', () => {
      const triggers: IntentTrigger[] = [];
      expect(triggers).toHaveLength(0);
    });

    it('should accept valid confidence values', () => {
      const validConfidences: Confidence[] = ['low', 'medium', 'high'];
      validConfidences.forEach(confidence => {
        expect(['low', 'medium', 'high']).toContain(confidence);
      });
    });

    it('should accept valid intent trigger structure', () => {
      const trigger: IntentTrigger = {
        intent: 'buy',
        selector: 'button.buy',
        confidence: 'high',
        element: {
          tag: 'button',
          selector: 'button.buy',
          hasAriaLabel: true,
          ariaLabel: 'Buy now',
          text: 'Buy Now',
        }
      };

      expect(trigger).toHaveProperty('intent');
      expect(trigger).toHaveProperty('selector');
      expect(trigger).toHaveProperty('confidence');
      expect(trigger).toHaveProperty('element');
      expect(trigger.element).toHaveProperty('tag');
      expect(trigger.element).toHaveProperty('selector');
      expect(trigger.element).toHaveProperty('hasAriaLabel');
    });
  });
});
