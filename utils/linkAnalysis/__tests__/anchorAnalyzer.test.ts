/**
 * Unit tests for Anchor Text Analyzer
 * Tests classification logic for different anchor text patterns
 */

import { describe, it, expect } from 'vitest';
import { classifyAnchorText, analyzeAnchorDistribution, generateAnchorRecommendations } from '../anchorAnalyzer';
import type { AnchorType } from '../types';

describe('Anchor Text Analyzer', () => {
  const brandName = 'Example Brand';
  const pageTitle = 'Complete Guide to SEO Best Practices';
  
  describe('classifyAnchorText', () => {
    it('should classify empty anchor as "empty"', () => {
      const result = classifyAnchorText('', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('empty');
    });
    
    it('should classify whitespace-only anchor as "empty"', () => {
      const result = classifyAnchorText('   ', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('empty');
    });
    
    it('should classify "click here" as "generic"', () => {
      const result = classifyAnchorText('click here', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('generic');
    });
    
    it('should classify "read more" as "generic"', () => {
      const result = classifyAnchorText('read more', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('generic');
    });
    
    it('should classify "learn more" as "generic"', () => {
      const result = classifyAnchorText('learn more', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('generic');
    });
    
    it('should classify URL in text as "naked"', () => {
      const result = classifyAnchorText('https://example.com', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('naked');
    });
    
    it('should classify domain in text as "naked"', () => {
      const result = classifyAnchorText('example.com', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('naked');
    });
    
    it('should classify www domain as "naked"', () => {
      const result = classifyAnchorText('www.example.com', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('naked');
    });
    
    it('should classify brand name as "branded"', () => {
      const result = classifyAnchorText('Example Brand', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('branded');
    });
    
    it('should classify brand name with extra text as "branded"', () => {
      const result = classifyAnchorText('Visit Example Brand Today', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('branded');
    });
    
    it('should classify exact title match as "exact"', () => {
      const result = classifyAnchorText('Complete Guide to SEO Best Practices', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('exact');
    });
    
    it('should classify close title match as "exact"', () => {
      const result = classifyAnchorText('Guide to SEO Best Practices', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('exact');
    });
    
    it('should classify partial title match as "partial"', () => {
      const result = classifyAnchorText('SEO Best Practices', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('partial');
    });
    
    it('should classify descriptive text as "partial"', () => {
      const result = classifyAnchorText('Learn about SEO optimization', 'https://example.com', brandName, pageTitle, false);
      expect(result).toBe('partial');
    });
    
    it('should classify image with minimal text as "image"', () => {
      const result = classifyAnchorText('Go', 'https://example.com', brandName, pageTitle, true);
      expect(result).toBe('image');
    });
    
    it('should not classify image with substantial text as "image"', () => {
      const result = classifyAnchorText('Read our guide', 'https://example.com', brandName, pageTitle, true);
      expect(result).not.toBe('image');
    });
  });
  
  describe('analyzeAnchorDistribution', () => {
    it('should count anchor types correctly', () => {
      const anchors: AnchorType[] = [
        'exact', 'exact',
        'partial', 'partial', 'partial',
        'branded',
        'generic', 'generic',
        'naked',
        'image',
        'empty',
      ];
      
      const result = analyzeAnchorDistribution(anchors);
      
      expect(result.exactMatch).toBe(2);
      expect(result.partialMatch).toBe(3);
      expect(result.branded).toBe(1);
      expect(result.generic).toBe(2);
      expect(result.nakedUrl).toBe(1);
      expect(result.image).toBe(1);
      expect(result.empty).toBe(1);
      expect(result.total).toBe(11);
    });
    
    it('should handle empty array', () => {
      const result = analyzeAnchorDistribution([]);
      
      expect(result.total).toBe(0);
      expect(result.exactMatch).toBe(0);
    });
  });
  
  describe('generateAnchorRecommendations', () => {
    it('should flag over-optimization when exact match > 30%', () => {
      const distribution = {
        exactMatch: 4,
        partialMatch: 2,
        branded: 1,
        generic: 1,
        nakedUrl: 1,
        image: 1,
        empty: 0,
        total: 10,
      };
      
      const result = generateAnchorRecommendations(distribution);
      
      expect(result.issues.some(issue => issue.includes('over-optimization'))).toBe(true);
    });
    
    it('should flag generic anchors when > 40%', () => {
      const distribution = {
        exactMatch: 1,
        partialMatch: 2,
        branded: 1,
        generic: 5,
        nakedUrl: 1,
        image: 0,
        empty: 0,
        total: 10,
      };
      
      const result = generateAnchorRecommendations(distribution);
      
      expect(result.issues.some(issue => issue.includes('generic anchors'))).toBe(true);
    });
    
    it('should flag empty anchors when > 10%', () => {
      const distribution = {
        exactMatch: 1,
        partialMatch: 5,
        branded: 1,
        generic: 1,
        nakedUrl: 0,
        image: 0,
        empty: 2,
        total: 10,
      };
      
      const result = generateAnchorRecommendations(distribution);
      
      expect(result.issues.some(issue => issue.includes('empty anchors'))).toBe(true);
    });
    
    it('should praise good descriptive anchor usage', () => {
      const distribution = {
        exactMatch: 1,
        partialMatch: 5,
        branded: 2,
        generic: 1,
        nakedUrl: 1,
        image: 0,
        empty: 0,
        total: 10,
      };
      
      const result = generateAnchorRecommendations(distribution);
      
      expect(result.strengths.some(strength => strength.includes('descriptive anchor text'))).toBe(true);
    });
    
    it('should praise low generic anchor percentage', () => {
      const distribution = {
        exactMatch: 1,
        partialMatch: 7,
        branded: 1,
        generic: 1,
        nakedUrl: 0,
        image: 0,
        empty: 0,
        total: 10,
      };
      
      const result = generateAnchorRecommendations(distribution);
      
      expect(result.strengths.some(strength => strength.includes('Low percentage of generic anchors'))).toBe(true);
    });
    
    it('should praise no empty anchors', () => {
      const distribution = {
        exactMatch: 1,
        partialMatch: 7,
        branded: 1,
        generic: 1,
        nakedUrl: 0,
        image: 0,
        empty: 0,
        total: 10,
      };
      
      const result = generateAnchorRecommendations(distribution);
      
      expect(result.strengths.some(strength => strength.includes('No empty anchors'))).toBe(true);
    });
    
    it('should handle empty distribution', () => {
      const distribution = {
        exactMatch: 0,
        partialMatch: 0,
        branded: 0,
        generic: 0,
        nakedUrl: 0,
        image: 0,
        empty: 0,
        total: 0,
      };
      
      const result = generateAnchorRecommendations(distribution);
      
      expect(result.issues).toEqual([]);
      expect(result.strengths).toEqual([]);
    });
  });
});
