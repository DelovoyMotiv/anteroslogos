/**
 * Content Optimizer Integration Tests
 * Tests the complete content optimization workflow
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { contentOptimizer } from '../contentOptimizer';
import type { KnowledgeGraph } from '../../../types/citation-intelligence.types';

describe.skipIf(!process.env.VITE_OPENROUTER_API_KEY)('Content Optimizer Integration', () => {
  beforeAll(async () => {
    await contentOptimizer.initialize();
  });
  
  const sampleKnowledgeGraph: KnowledgeGraph = {
    entities: [
      {
        id: 'e1',
        name: 'Generative Engine Optimization',
        type: 'Concept',
        properties: { description: 'SEO for AI systems' },
        mentions: 8,
        firstSeen: new Date('2024-01-01'),
        lastSeen: new Date('2024-12-01'),
      },
      {
        id: 'e2',
        name: 'ChatGPT',
        type: 'Product',
        properties: { vendor: 'OpenAI' },
        mentions: 5,
        firstSeen: new Date('2024-01-01'),
        lastSeen: new Date('2024-12-01'),
      },
      {
        id: 'e3',
        name: 'Claude',
        type: 'Product',
        properties: { vendor: 'Anthropic' },
        mentions: 4,
        firstSeen: new Date('2024-01-01'),
        lastSeen: new Date('2024-12-01'),
      },
    ],
    relationships: [
      {
        id: 'r1',
        sourceId: 'e1',
        targetId: 'e2',
        type: 'applies_to',
        properties: {},
        strength: 0.9,
        confidence: 0.85,
      },
    ],
    claims: [
      {
        id: 'c1',
        statement: 'GEO optimizes content for AI citation',
        subjectId: 'e1',
        predicateId: 'optimizes',
        objectId: 'content',
        evidence: [
          {
            type: 'citation',
            source: 'Research paper',
            confidence: 0.9,
          },
        ],
      },
    ],
    metadata: {
      sourceUrl: 'https://example.com/geo-guide',
      extractedAt: new Date(),
      version: '1.0',
    },
  };
  
  it('should generate 3 distinct variations with all required properties', async () => {
    const originalContent = `
Generative Engine Optimization (GEO) is the practice of optimizing content 
to increase its visibility in AI-generated responses. As AI systems like 
ChatGPT and Claude become primary information sources, traditional SEO 
strategies need to evolve.

GEO focuses on creating content that AI systems can easily understand, 
cite, and reference. This includes structured data, clear entity 
relationships, and authoritative claims backed by evidence.
    `.trim();
    
    const variations = await contentOptimizer.generateVariations(
      originalContent,
      sampleKnowledgeGraph,
      80, // target score
      {
        preserveFactualAccuracy: true,
        maintainEEAT: true,
        maxLengthIncrease: 30,
        targetAudience: 'technical',
      }
    );
    
    // Verify we got exactly 3 variations
    expect(variations).toHaveLength(3);
    
    // Verify each variation has unique content
    const contents = variations.map(v => v.content);
    const uniqueContents = new Set(contents);
    expect(uniqueContents.size).toBe(3);
    
    // Verify all variations have required properties
    variations.forEach((variation, index) => {
      expect(variation.id).toBe(`variation-${index + 1}`);
      expect(variation.content).toBeTruthy();
      expect(typeof variation.predictedScore).toBe('number');
      expect(variation.predictedScore).toBeGreaterThanOrEqual(0);
      expect(variation.predictedScore).toBeLessThanOrEqual(100);
      
      // Verify improvements
      expect(variation.improvements).toBeDefined();
      expect(typeof variation.improvements.semanticDensity).toBe('number');
      expect(typeof variation.improvements.entityCount).toBe('number');
      expect(typeof variation.improvements.claimStrength).toBe('number');
      
      // Verify changes
      expect(Array.isArray(variation.changes)).toBe(true);
      expect(variation.changes.length).toBeGreaterThan(0);
      
      // Verify implementation guidance
      expect(variation.implementation).toBeDefined();
      expect(variation.implementation.html).toContain('<article>');
      expect((variation.implementation.schema as any)['@context']).toBe('https://schema.org');
      expect(Array.isArray(variation.implementation.structural)).toBe(true);
    });
  });
  
  it('should sort variations by predicted score in descending order', async () => {
    const originalContent = 'GEO is important for AI visibility.';
    
    const variations = await contentOptimizer.generateVariations(
      originalContent,
      sampleKnowledgeGraph
    );
    
    // Verify sorting
    for (let i = 0; i < variations.length - 1; i++) {
      expect(variations[i].predictedScore).toBeGreaterThanOrEqual(
        variations[i + 1].predictedScore
      );
    }
  });
  
  it('should track improvements for semantic density, entity count, and claim strength', async () => {
    const originalContent = 'GEO is important for AI visibility.';
    
    const variations = await contentOptimizer.generateVariations(
      originalContent,
      sampleKnowledgeGraph
    );
    
    variations.forEach(variation => {
      // All improvement metrics should be numbers
      expect(typeof variation.improvements.semanticDensity).toBe('number');
      expect(typeof variation.improvements.entityCount).toBe('number');
      expect(typeof variation.improvements.claimStrength).toBe('number');
      
      // Improvements should be finite numbers (not NaN or Infinity)
      expect(Number.isFinite(variation.improvements.semanticDensity)).toBe(true);
      expect(Number.isFinite(variation.improvements.entityCount)).toBe(true);
      expect(Number.isFinite(variation.improvements.claimStrength)).toBe(true);
    });
  });
  
  it('should include implementation guidance with HTML, schema, and structural recommendations', async () => {
    const originalContent = 'GEO is important for AI visibility.';
    
    const variations = await contentOptimizer.generateVariations(
      originalContent,
      sampleKnowledgeGraph
    );
    
    variations.forEach(variation => {
      // HTML should be valid
      expect(variation.implementation.html).toContain('<article>');
      expect(variation.implementation.html).toContain('</article>');
      
      // Schema should have required fields
      expect(variation.implementation.schema).toBeDefined();
      expect(variation.implementation.schema).toHaveProperty('@context');
      expect(variation.implementation.schema).toHaveProperty('@type');
      expect((variation.implementation.schema as any)['@context']).toBe('https://schema.org');
      
      // Structural recommendations should be an array of strings
      expect(Array.isArray(variation.implementation.structural)).toBe(true);
      expect(variation.implementation.structural.length).toBeGreaterThan(0);
      variation.implementation.structural.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });
  
  it('should include detailed changes for each variation', async () => {
    const originalContent = 'GEO is important for AI visibility.';
    
    const variations = await contentOptimizer.generateVariations(
      originalContent,
      sampleKnowledgeGraph
    );
    
    variations.forEach(variation => {
      expect(Array.isArray(variation.changes)).toBe(true);
      expect(variation.changes.length).toBeGreaterThan(0);
      
      variation.changes.forEach(change => {
        // Verify change type is valid
        expect(['addition', 'modification', 'restructure']).toContain(change.type);
        
        // Verify location and description are present
        expect(typeof change.location).toBe('string');
        expect(change.location.length).toBeGreaterThan(0);
        expect(typeof change.description).toBe('string');
        expect(change.description.length).toBeGreaterThan(0);
      });
    });
  });
  
  it('should validate factual accuracy between original and optimized content', async () => {
    const originalContent = `
Generative Engine Optimization (GEO) was introduced in 2024 by researchers at Stanford University. 
The study included 1,234 participants and achieved 95% accuracy in predicting AI citations.
Dr. Jane Smith stated "GEO represents a paradigm shift in content optimization."
Published on January 15, 2024, the research has been cited by ChatGPT and Claude.
    `.trim();
    
    const variations = await contentOptimizer.generateVariations(
      originalContent,
      sampleKnowledgeGraph,
      80,
      {
        preserveFactualAccuracy: true,
        maintainEEAT: true,
        maxLengthIncrease: 30,
        targetAudience: 'technical',
      }
    );
    
    // Validate each variation against the original
    variations.forEach(variation => {
      const validation = contentOptimizer.validateFactualAccuracy(
        originalContent,
        variation.content
      );
      
      // Verify validation result structure
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(typeof validation.factualAccuracyScore).toBe('number');
      expect(validation.factualAccuracyScore).toBeGreaterThanOrEqual(0);
      expect(validation.factualAccuracyScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(validation.discrepancies)).toBe(true);
      expect(validation.eeAtSignals).toBeDefined();
      expect(Array.isArray(validation.eeAtSignals.present)).toBe(true);
      expect(Array.isArray(validation.eeAtSignals.missing)).toBe(true);
      
      // Log validation results for inspection
      console.log(`\nVariation ${variation.id} validation:`);
      console.log(`  Valid: ${validation.isValid}`);
      console.log(`  Accuracy Score: ${validation.factualAccuracyScore.toFixed(2)}`);
      console.log(`  Discrepancies: ${validation.discrepancies.length}`);
      console.log(`  E-E-A-T Present: ${validation.eeAtSignals.present.join(', ')}`);
      console.log(`  E-E-A-T Missing: ${validation.eeAtSignals.missing.join(', ')}`);
      
      if (validation.discrepancies.length > 0) {
        console.log('  Discrepancy details:');
        validation.discrepancies.forEach(d => {
          console.log(`    - ${d.type} (${d.severity}): ${d.original} -> ${d.optimized}`);
        });
      }
    });
  });
});
