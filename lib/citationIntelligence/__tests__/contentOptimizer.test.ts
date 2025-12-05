/**
 * Content Optimizer Tests
 * Unit tests for content variation generation
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ContentOptimizer } from '../contentOptimizer';
import type { KnowledgeGraph, OptimizationConstraints } from '../../../types/citation-intelligence.types';

// Mock the enhanced client
vi.mock('../llm/enhancedClient', () => ({
  createEnhancedOpenRouterClient: () => ({
    chatWithModel: vi.fn(async () => {
      return JSON.stringify({
        variations: [
          {
            content: 'Optimized variation 1 with enhanced semantic density and additional entities.',
            changes: [
              { type: 'addition', location: 'paragraph 1', description: 'Added entity: Organization X' }
            ]
          },
          {
            content: 'Optimized variation 2 with different optimization strategy and improved structure.',
            changes: [
              { type: 'modification', location: 'paragraph 2', description: 'Strengthened claims with data' }
            ]
          },
          {
            content: 'Optimized variation 3 with comprehensive enhancements and citation-worthy statements.',
            changes: [
              { type: 'restructure', location: 'overall', description: 'Improved content structure' }
            ]
          }
        ]
      });
    }),
  }),
}));

// Mock citation predictor
vi.mock('../citationPredictor', () => ({
  citationPredictor: {
    initialize: vi.fn(async () => {}),
    calculateProbability: vi.fn(() => ({
      score: 75.5,
      confidence: { lower: 70, upper: 80 },
      factors: [],
      quickWins: [],
    })),
  },
}));

describe('ContentOptimizer', () => {
  let optimizer: ContentOptimizer;
  
  const sampleKnowledgeGraph: KnowledgeGraph = {
    entities: [
      {
        id: 'e1',
        name: 'Machine Learning',
        type: 'Concept',
        properties: {},
        mentions: 5,
        firstSeen: new Date(),
        lastSeen: new Date(),
      },
      {
        id: 'e2',
        name: 'Google',
        type: 'Organization',
        properties: {},
        mentions: 3,
        firstSeen: new Date(),
        lastSeen: new Date(),
      },
    ],
    relationships: [],
    claims: [],
    metadata: {
      sourceUrl: 'https://example.com',
      extractedAt: new Date(),
      version: '1.0',
    },
  };
  
  const sampleConstraints: OptimizationConstraints = {
    preserveFactualAccuracy: true,
    maintainEEAT: true,
    maxLengthIncrease: 30,
    targetAudience: 'general',
  };
  
  beforeAll(async () => {
    optimizer = new ContentOptimizer();
    await optimizer.initialize();
  });
  
  describe('generateVariations', () => {
    it('should generate exactly 3 variations', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      expect(variations).toHaveLength(3);
    });
    
    it('should include all required fields in each variation', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      variations.forEach(variation => {
        expect(variation).toHaveProperty('id');
        expect(variation).toHaveProperty('content');
        expect(variation).toHaveProperty('predictedScore');
        expect(variation).toHaveProperty('improvements');
        expect(variation).toHaveProperty('changes');
        expect(variation).toHaveProperty('implementation');
        
        // Check improvements structure
        expect(variation.improvements).toHaveProperty('semanticDensity');
        expect(variation.improvements).toHaveProperty('entityCount');
        expect(variation.improvements).toHaveProperty('claimStrength');
        
        // Check implementation structure
        expect(variation.implementation).toHaveProperty('html');
        expect(variation.implementation).toHaveProperty('schema');
        expect(variation.implementation).toHaveProperty('structural');
      });
    });
    
    it('should have distinct content for each variation', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      const contents = variations.map(v => v.content);
      const uniqueContents = new Set(contents);
      
      expect(uniqueContents.size).toBe(3);
    });
    
    it('should sort variations by predicted score (highest first)', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      for (let i = 0; i < variations.length - 1; i++) {
        expect(variations[i].predictedScore).toBeGreaterThanOrEqual(
          variations[i + 1].predictedScore
        );
      }
    });
    
    it('should include predicted scores for all variations', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      variations.forEach(variation => {
        expect(typeof variation.predictedScore).toBe('number');
        expect(variation.predictedScore).toBeGreaterThanOrEqual(0);
        expect(variation.predictedScore).toBeLessThanOrEqual(100);
      });
    });
    
    it('should track improvements for each variation', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      variations.forEach(variation => {
        expect(typeof variation.improvements.semanticDensity).toBe('number');
        expect(typeof variation.improvements.entityCount).toBe('number');
        expect(typeof variation.improvements.claimStrength).toBe('number');
      });
    });
    
    it('should include changes for each variation', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      variations.forEach(variation => {
        expect(Array.isArray(variation.changes)).toBe(true);
        expect(variation.changes.length).toBeGreaterThan(0);
        
        variation.changes.forEach(change => {
          expect(['addition', 'modification', 'restructure']).toContain(change.type);
          expect(typeof change.location).toBe('string');
          expect(typeof change.description).toBe('string');
        });
      });
    });
    
    it('should generate implementation guidance', async () => {
      const originalContent = 'Machine learning is a subset of artificial intelligence.';
      
      const variations = await optimizer.generateVariations(
        originalContent,
        sampleKnowledgeGraph,
        undefined,
        sampleConstraints
      );
      
      variations.forEach(variation => {
        expect(typeof variation.implementation.html).toBe('string');
        expect(variation.implementation.html).toContain('<article');
        expect(variation.implementation.html).toContain('</article>');
        
        expect(typeof variation.implementation.schema).toBe('object');
        expect(variation.implementation.schema['@context']).toBe('https://schema.org');
        
        expect(Array.isArray(variation.implementation.structural)).toBe(true);
        expect(variation.implementation.structural.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('enhanceSemanticDensity', () => {
    it('should return enhanced content', async () => {
      const content = 'Machine learning is a subset of artificial intelligence.';
      
      const enhanced = await optimizer.enhanceSemanticDensity(content);
      
      expect(typeof enhanced).toBe('string');
      expect(enhanced.length).toBeGreaterThan(0);
    });
  });
  
  describe('addEntityRelationships', () => {
    it('should return content with entity relationships', async () => {
      const content = 'Machine learning is a subset of artificial intelligence.';
      
      const enhanced = await optimizer.addEntityRelationships(
        content,
        sampleKnowledgeGraph
      );
      
      expect(typeof enhanced).toBe('string');
      expect(enhanced.length).toBeGreaterThan(0);
    });
  });
  
  describe('strengthenClaims', () => {
    it('should return content with strengthened claims', async () => {
      const content = 'Machine learning is a subset of artificial intelligence.';
      
      const enhanced = await optimizer.strengthenClaims(content);
      
      expect(typeof enhanced).toBe('string');
      expect(enhanced.length).toBeGreaterThan(0);
    });
  });
  
  describe('validateFactualAccuracy', () => {
    it('should validate content with no changes as accurate', () => {
      const content = 'Machine learning was developed in 1959 by Arthur Samuel. The field has grown to include 85% of Fortune 500 companies.';
      
      const result = optimizer.validateFactualAccuracy(content, content);
      
      expect(result.isValid).toBe(true);
      expect(result.factualAccuracyScore).toBe(1.0);
      expect(result.discrepancies).toHaveLength(0);
    });
    
    it('should detect removed numbers as critical discrepancies', () => {
      const original = 'The study included 1,234 participants and achieved 95% accuracy.';
      const optimized = 'The study included many participants and achieved high accuracy.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(false);
      expect(result.discrepancies.length).toBeGreaterThan(0);
      
      const numberDiscrepancies = result.discrepancies.filter(d => d.type === 'number');
      expect(numberDiscrepancies.length).toBeGreaterThan(0);
      expect(numberDiscrepancies.every(d => d.severity === 'critical')).toBe(true);
    });
    
    it('should detect removed dates as critical discrepancies', () => {
      const original = 'The research was published on January 15, 2024 and updated in March 2024.';
      const optimized = 'The research was published recently and updated later.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(false);
      
      const dateDiscrepancies = result.discrepancies.filter(d => d.type === 'date');
      expect(dateDiscrepancies.length).toBeGreaterThan(0);
      expect(dateDiscrepancies.every(d => d.severity === 'critical')).toBe(true);
    });
    
    it('should detect removed quotes as critical discrepancies', () => {
      const original = 'Einstein said "Imagination is more important than knowledge" in his famous speech.';
      const optimized = 'Einstein emphasized the importance of imagination in his famous speech.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(false);
      
      const quoteDiscrepancies = result.discrepancies.filter(d => d.type === 'quote');
      expect(quoteDiscrepancies.length).toBeGreaterThan(0);
      expect(quoteDiscrepancies.every(d => d.severity === 'critical')).toBe(true);
    });
    
    it('should detect removed entities as warning discrepancies', () => {
      const original = 'Google and Microsoft are leading companies in artificial intelligence research.';
      const optimized = 'Leading companies are advancing artificial intelligence research.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      const entityDiscrepancies = result.discrepancies.filter(d => d.type === 'entity');
      expect(entityDiscrepancies.length).toBeGreaterThan(0);
      expect(entityDiscrepancies.every(d => d.severity === 'warning')).toBe(true);
    });
    
    it('should calculate factual accuracy score based on discrepancies', () => {
      const original = 'In 2024, Google reported 95% accuracy with 1,000 samples.';
      const optimized = 'Recently, a company reported high accuracy with many samples.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.factualAccuracyScore).toBeGreaterThanOrEqual(0);
      expect(result.factualAccuracyScore).toBeLessThanOrEqual(1);
      expect(result.factualAccuracyScore).toBeLessThan(1.0); // Should be less than perfect
    });
    
    it('should extract numbers in various formats', () => {
      const original = 'The cost is $1,234.56 and the success rate is 95.5%. The range is 10-20 units.';
      const optimized = 'The cost is $1,234.56 and the success rate is 95.5%. The range is 10-20 units.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(true);
      expect(result.factualAccuracyScore).toBe(1.0);
    });
    
    it('should extract dates in various formats', () => {
      const original = 'Published on January 15, 2024, updated 01/20/2024, and archived on 2024-03-01.';
      const optimized = 'Published on January 15, 2024, updated 01/20/2024, and archived on 2024-03-01.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(true);
      expect(result.factualAccuracyScore).toBe(1.0);
    });
    
    it('should extract quotes with different quotation marks', () => {
      const original = 'He said "hello" and she replied \'goodbye\' while they noted "final words".';
      const optimized = 'He said "hello" and she replied \'goodbye\' while they noted "final words".';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(true);
      expect(result.factualAccuracyScore).toBe(1.0);
    });
    
    it('should check E-E-A-T signals', () => {
      const original = 'Written by Dr. Jane Smith, published on January 1, 2024. According to research [1], the results show 95% accuracy.';
      const optimized = 'The results show 95% accuracy based on research.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.eeAtSignals.missing.length).toBeGreaterThan(0);
      expect(result.eeAtSignals.missing).toContain('authorAttribution');
      expect(result.eeAtSignals.missing).toContain('credentials');
      expect(result.eeAtSignals.missing).toContain('publicationDate');
    });
    
    it('should preserve E-E-A-T signals when present', () => {
      const content = 'Written by Dr. Jane Smith, published on January 1, 2024. According to research [1], the results show 95% accuracy.';
      
      const result = optimizer.validateFactualAccuracy(content, content);
      
      expect(result.eeAtSignals.present.length).toBeGreaterThan(0);
      expect(result.eeAtSignals.missing).toHaveLength(0);
    });
    
    it('should handle content with no facts gracefully', () => {
      const original = 'This is a simple sentence.';
      const optimized = 'This is another simple sentence.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(true);
      expect(result.factualAccuracyScore).toBe(1.0);
      expect(result.discrepancies).toHaveLength(0);
    });
    
    it('should handle multiple discrepancies of different types', () => {
      const original = 'Google announced in 2024 that "AI is the future" with 95% confidence based on 1,000 studies.';
      const optimized = 'A company announced recently that AI is important with high confidence based on many studies.';
      
      const result = optimizer.validateFactualAccuracy(original, optimized);
      
      expect(result.isValid).toBe(false);
      expect(result.discrepancies.length).toBeGreaterThan(0);
      
      const types = new Set(result.discrepancies.map(d => d.type));
      expect(types.size).toBeGreaterThan(1); // Multiple types of discrepancies
    });
  });
});
