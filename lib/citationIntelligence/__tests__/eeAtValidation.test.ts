/**
 * E-E-A-T Signal Validation Tests
 * Tests for Experience, Expertise, Authoritativeness, and Trustworthiness signal validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ContentOptimizer } from '../contentOptimizer';

describe('E-E-A-T Signal Validation', () => {
  let optimizer: ContentOptimizer;
  
  beforeAll(async () => {
    optimizer = new ContentOptimizer();
    await optimizer.initialize();
  });
  
  describe('Author Attribution', () => {
    it('should detect author attribution in content', () => {
      const content = 'Written by Dr. Jane Smith, this article explores machine learning.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.authorAttribution.present).toBe(true);
      expect(result.originalSignals.authorAttribution.authors).toContain('Jane Smith');
    });
    
    it('should detect multiple author attribution formats', () => {
      const content = 'By John Doe and authored by Dr. Sarah Johnson, published by Professor Michael Brown.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.authorAttribution.present).toBe(true);
      expect(result.originalSignals.authorAttribution.authors.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should flag missing author attribution in variation', () => {
      const original = 'Written by Dr. Jane Smith, this article explores machine learning.';
      const variation = 'This article explores machine learning.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('authorAttribution');
      expect(result.recommendations.some(r => r.includes('author attribution'))).toBe(true);
    });
    
    it('should validate preserved author attribution', () => {
      const original = 'Written by Dr. Jane Smith, this article explores machine learning.';
      const variation = 'Written by Dr. Jane Smith, this enhanced article explores machine learning in depth.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.preserved).toContain('authorAttribution');
      expect(result.missing).not.toContain('authorAttribution');
    });
    
    it('should detect when some authors are missing', () => {
      const original = 'By John Doe and Dr. Sarah Johnson.';
      const variation = 'By John Doe.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.missing).toContain('authorAttribution');
      expect(result.recommendations.some(r => r.includes('Sarah Johnson'))).toBe(true);
    });
  });
  
  describe('Citation Presence and Validity', () => {
    it('should detect numeric citations', () => {
      const content = 'According to research [1], machine learning is effective [2,3].';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.citations.present).toBe(true);
      expect(result.originalSignals.citations.count).toBeGreaterThanOrEqual(2);
      expect(result.originalSignals.citations.types).toContain('numeric');
    });
    
    it('should detect parenthetical citations', () => {
      const content = 'Machine learning has proven effective (Smith, 2024) and continues to evolve (Jones et al., 2023).';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.citations.present).toBe(true);
      expect(result.originalSignals.citations.types).toContain('parenthetical');
    });
    
    it('should detect inline citations', () => {
      const content = 'According to recent studies, AI is advancing rapidly. Source: Nature Journal 2024.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.citations.present).toBe(true);
      expect(result.originalSignals.citations.types).toContain('inline');
    });
    
    it('should flag missing citations in variation', () => {
      const original = 'Research shows [1] that AI is effective [2,3].';
      const variation = 'Research shows that AI is effective.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('citations');
      expect(result.recommendations.some(r => r.includes('citation'))).toBe(true);
    });
    
    it('should validate preserved citations', () => {
      const original = 'Research shows [1] that AI is effective [2,3].';
      const variation = 'Enhanced research shows [1] that AI is highly effective [2,3] in various domains.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.preserved).toContain('citations');
      expect(result.missing).not.toContain('citations');
    });
    
    it('should accept increased citation count', () => {
      const original = 'Research shows [1] that AI is effective.';
      const variation = 'Research shows [1] that AI is effective [2,3,4].';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.preserved).toContain('citations');
      expect(result.variationSignals.citations.count).toBeGreaterThan(
        result.originalSignals.citations.count
      );
    });
    
    it('should detect mixed citation types', () => {
      const content = 'According to Smith (2024), research [1] shows that AI is effective. Source: Nature 2024.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.citations.present).toBe(true);
      expect(result.originalSignals.citations.types.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('Credential Mentions', () => {
    it('should detect PhD credentials', () => {
      const content = 'Dr. Jane Smith, PhD in Computer Science, leads the research.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.credentials.present).toBe(true);
      expect(result.originalSignals.credentials.credentials.some(c => c.includes('PhD'))).toBe(true);
    });
    
    it('should detect various credential types', () => {
      const content = 'Dr. Smith, Professor Johnson, MD Anderson, and Certified Expert Brown.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.credentials.present).toBe(true);
      expect(result.originalSignals.credentials.credentials.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should associate credentials with authors', () => {
      const content = 'Dr. Jane Smith and Professor Michael Brown conducted the study.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.credentials.present).toBe(true);
      expect(result.originalSignals.credentials.associatedAuthors.length).toBeGreaterThan(0);
    });
    
    it('should flag missing credentials in variation', () => {
      const original = 'Dr. Jane Smith, PhD, leads the research.';
      const variation = 'Jane Smith leads the research.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('credentials');
      expect(result.recommendations.some(r => r.includes('credential'))).toBe(true);
    });
    
    it('should validate preserved credentials', () => {
      const original = 'Dr. Jane Smith, PhD, leads the research.';
      const variation = 'Dr. Jane Smith, PhD, leads the groundbreaking research.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.preserved).toContain('credentials');
      expect(result.missing).not.toContain('credentials');
    });
    
    it('should detect credentials in various formats', () => {
      const content = 'Jane Smith, PhD and John Doe, MD, MBA collaborated on this work.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.credentials.present).toBe(true);
      expect(result.originalSignals.credentials.credentials.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('Publication Date Preservation', () => {
    it('should detect published dates', () => {
      const content = 'Published on January 15, 2024, this article discusses AI.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.publicationDate.present).toBe(true);
      expect(result.originalSignals.publicationDate.types).toContain('published');
      expect(result.originalSignals.publicationDate.dates).toContain('January 15, 2024');
    });
    
    it('should detect updated dates', () => {
      const content = 'Updated on March 20, 2024, with new findings.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.publicationDate.present).toBe(true);
      expect(result.originalSignals.publicationDate.types).toContain('updated');
    });
    
    it('should detect last modified dates', () => {
      const content = 'Last modified on April 5, 2024.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.publicationDate.present).toBe(true);
      expect(result.originalSignals.publicationDate.types).toContain('modified');
    });
    
    it('should detect multiple date types', () => {
      const content = 'Published on January 15, 2024, and updated on March 20, 2024.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.publicationDate.present).toBe(true);
      expect(result.originalSignals.publicationDate.types.length).toBeGreaterThanOrEqual(2);
      expect(result.originalSignals.publicationDate.dates.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should flag missing publication dates in variation', () => {
      const original = 'Published on January 15, 2024, this article discusses AI.';
      const variation = 'This article discusses AI.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('publicationDate');
      expect(result.recommendations.some(r => r.includes('publication date'))).toBe(true);
    });
    
    it('should validate preserved publication dates', () => {
      const original = 'Published on January 15, 2024, this article discusses AI.';
      const variation = 'Published on January 15, 2024, this enhanced article discusses AI in depth.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.preserved).toContain('publicationDate');
      expect(result.missing).not.toContain('publicationDate');
    });
    
    it('should detect when some dates are missing', () => {
      const original = 'Published on January 15, 2024, and updated on March 20, 2024.';
      const variation = 'Published on January 15, 2024.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.missing).toContain('publicationDate');
      expect(result.recommendations.some(r => r.includes('March 20, 2024'))).toBe(true);
    });
  });
  
  describe('Comprehensive E-E-A-T Validation', () => {
    it('should validate content with all E-E-A-T signals', () => {
      const content = `
        Written by Dr. Jane Smith, PhD
        Published on January 15, 2024
        
        According to recent research [1], machine learning has proven effective (Johnson, 2023).
        Professor Michael Brown, an Expert in AI, confirms these findings.
      `;
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.preserved.length).toBe(4);
      expect(result.missing.length).toBe(0);
    });
    
    it('should calculate E-E-A-T score correctly', () => {
      const original = `
        Written by Dr. Jane Smith, PhD
        Published on January 15, 2024
        According to research [1], AI is effective.
      `;
      const variation = `
        Written by Dr. Jane Smith, PhD
        AI is effective.
      `;
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThan(0);
      expect(result.preserved.length).toBeGreaterThan(0);
      expect(result.missing.length).toBeGreaterThan(0);
    });
    
    it('should provide recommendations for missing signals', () => {
      const original = `
        Written by Dr. Jane Smith, PhD
        Published on January 15, 2024
        According to research [1], AI is effective.
      `;
      const variation = 'AI is effective.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.isValid).toBe(false);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('author'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('citation'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('credential'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('publication date'))).toBe(true);
    });
    
    it('should handle content with no E-E-A-T signals', () => {
      const content = 'This is a simple article about machine learning.';
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100); // No signals to preserve
      expect(result.originalSignals.authorAttribution.present).toBe(false);
      expect(result.originalSignals.citations.present).toBe(false);
      expect(result.originalSignals.credentials.present).toBe(false);
      expect(result.originalSignals.publicationDate.present).toBe(false);
    });
    
    it('should validate partial E-E-A-T signal preservation', () => {
      const original = 'Written by Dr. Jane Smith. Published on January 15, 2024.';
      const variation = 'Written by Dr. Jane Smith. This content has been updated.';
      
      const result = optimizer.validateEEAT(original, variation);
      
      expect(result.isValid).toBe(false);
      // Original has 3 signals: author, credentials (Dr.), publication date
      // Variation has 2 signals: author, credentials (Dr.)
      // So 2 out of 3 are preserved
      expect(result.preserved.length).toBeGreaterThan(0);
      expect(result.missing).toContain('publicationDate');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
    });
    
    it('should provide detailed signal information', () => {
      const content = `
        Written by Jane Smith and authored by John Doe
        Published on January 15, 2024, updated on March 20, 2024
        According to research [1,2,3], AI is effective (Brown, 2023).
      `;
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.authorAttribution.authors.length).toBeGreaterThanOrEqual(1);
      expect(result.originalSignals.citations.count).toBeGreaterThanOrEqual(3);
      expect(result.originalSignals.publicationDate.dates.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should handle edge cases with special characters', () => {
      const content = `
        Written by Mary O'Brien
        Published on January 15, 2024
        "According to research," [1] states the author.
      `;
      
      const result = optimizer.validateEEAT(content, content);
      
      expect(result.originalSignals.authorAttribution.present).toBe(true);
      expect(result.originalSignals.citations.present).toBe(true);
      expect(result.originalSignals.publicationDate.present).toBe(true);
    });
  });
  
  describe('Integration with validateFactualAccuracy', () => {
    it('should include E-E-A-T signals in factual accuracy validation', () => {
      const original = 'Written by Dr. Jane Smith, published on January 15, 2024. Research [1] shows 95% accuracy.';
      const optimized = 'Research shows 95% accuracy.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.eeAtSignals.missing.length).toBeGreaterThan(0);
      expect(result.eeAtSignals.missing).toContain('authorAttribution');
      expect(result.eeAtSignals.missing).toContain('publicationDate');
    });
    
    it('should preserve E-E-A-T signals in factual accuracy validation', () => {
      const content = 'Written by Dr. Jane Smith, published on January 15, 2024. Research [1] shows 95% accuracy.';
      
      const result = optimizer.validateFactualAccuracy(content, content);
      
      expect(result.eeAtSignals.present.length).toBeGreaterThan(0);
      expect(result.eeAtSignals.missing.length).toBe(0);
    });
  });
});
