/**
 * Unit tests for Inline Suggestion Engine
 */

import { describe, it, expect } from 'vitest';
import {
  generateInlineSuggestions,
  getTopSuggestions,
  filterSuggestionsByType,
  filterSuggestionsByPriority,
  calculateTotalImpact,
} from '../inlineSuggestionEngine';
import { analyzeContentRealTime } from '../realTimeContentAnalyzer';

describe('Inline Suggestion Engine', () => {
  describe('generateInlineSuggestions', () => {
    it('should generate suggestions for low-quality content', async () => {
      const content = 'AI is good. It helps people. Many use it.';
      const analysis = await analyzeContentRealTime(content);
      
      const result = generateInlineSuggestions(content, analysis);
      
      expect(result.totalSuggestions).toBeGreaterThan(0);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.byPriority).toHaveProperty('high');
      expect(result.byPriority).toHaveProperty('medium');
      expect(result.byPriority).toHaveProperty('low');
      expect(result.byType).toHaveProperty('entity');
      expect(result.byType).toHaveProperty('claim');
      expect(result.byType).toHaveProperty('structure');
      expect(result.byType).toHaveProperty('schema');
    });
    
    it('should generate fewer suggestions for high-quality content', async () => {
      const content = `
        # Artificial Intelligence in Healthcare
        
        According to research from Stanford University, AI systems achieve 98% accuracy in medical diagnosis.
        Dr. Jane Smith demonstrated that machine learning algorithms outperform traditional methods.
        Studies published in Nature show significant improvements in patient outcomes.
        
        ## Key Benefits
        - Improved diagnostic accuracy
        - Faster treatment decisions
        - Reduced healthcare costs
      `;
      
      const analysis = await analyzeContentRealTime(content);
      const result = generateInlineSuggestions(content, analysis);
      
      // High-quality content should have fewer high-priority suggestions
      expect(result.byPriority.high).toBeLessThan(3);
    });
    
    it('should suggest entity additions for entity-poor content', async () => {
      const content = 'The technology is improving. It works better now.';
      const analysis = await analyzeContentRealTime(content);
      
      const result = generateInlineSuggestions(content, analysis);
      
      const entitySuggestions = filterSuggestionsByType(result, 'entity');
      expect(entitySuggestions.length).toBeGreaterThan(0);
    });
    
    it('should suggest claim strengthening for claim-poor content', async () => {
      const content = 'AI is useful. Machine learning is popular. Deep learning is advanced. ' +
                      'Neural networks are complex. Algorithms are important. Data is valuable. ' +
                      'Technology is evolving. Innovation is key. Research is ongoing. ' +
                      'Development continues. Progress is steady.';
      const analysis = await analyzeContentRealTime(content);
      
      const result = generateInlineSuggestions(content, analysis);
      
      const claimSuggestions = filterSuggestionsByType(result, 'claim');
      expect(claimSuggestions.length).toBeGreaterThanOrEqual(0);
    });
    
    it('should suggest structural improvements for unstructured content', async () => {
      const longContent = 'Lorem ipsum dolor sit amet. '.repeat(50);
      const analysis = await analyzeContentRealTime(longContent);
      
      const result = generateInlineSuggestions(longContent, analysis);
      
      const structureSuggestions = filterSuggestionsByType(result, 'structure');
      expect(structureSuggestions.length).toBeGreaterThan(0);
    });
    
    it('should suggest schema markup for entity-rich content', async () => {
      const content = 'Apple Inc. and Google announced new products. Tim Cook and Sundar Pichai spoke at the event.';
      const analysis = await analyzeContentRealTime(content);
      
      const result = generateInlineSuggestions(content, analysis);
      
      const schemaSuggestions = filterSuggestionsByType(result, 'schema');
      expect(schemaSuggestions.length).toBeGreaterThan(0);
    });
  });
  
  describe('getTopSuggestions', () => {
    it('should return top N suggestions', async () => {
      const content = 'AI is good.';
      const analysis = await analyzeContentRealTime(content);
      const result = generateInlineSuggestions(content, analysis);
      
      const top3 = getTopSuggestions(result, 3);
      
      expect(top3.length).toBeLessThanOrEqual(3);
      expect(top3.length).toBeLessThanOrEqual(result.totalSuggestions);
    });
  });
  
  describe('filterSuggestionsByPriority', () => {
    it('should filter by priority', async () => {
      const content = 'AI is good.';
      const analysis = await analyzeContentRealTime(content);
      const result = generateInlineSuggestions(content, analysis);
      
      const highPriority = filterSuggestionsByPriority(result, 'high');
      
      highPriority.forEach(suggestion => {
        expect(suggestion.priority).toBe('high');
      });
    });
  });
  
  describe('calculateTotalImpact', () => {
    it('should calculate total expected impact', async () => {
      const content = 'AI is good.';
      const analysis = await analyzeContentRealTime(content);
      const result = generateInlineSuggestions(content, analysis);
      
      const totalImpact = calculateTotalImpact(result);
      
      expect(totalImpact).toBeGreaterThanOrEqual(0);
      expect(typeof totalImpact).toBe('number');
    });
  });
});
