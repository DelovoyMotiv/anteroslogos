/**
 * Quality Analyzer Property-Based Tests
 * 
 * Property-based tests for information-theoretic quality metrics.
 * Tests Properties 21 and 25 from the design document.
 * 
 * Feature: byzantine-resistance-enhancement
 * 
 * @module lib/bft/__tests__/qualityAnalyzer.property.test
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { QualityAnalyzer } from '../qualityAnalyzer';
import type { Entity, Relationship } from '../../../types/byzantine.types';

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Arbitrary for generating entities
 */
const entityArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom('Person', 'Organization', 'Concept', 'Event', 'Location'),
  data: fc.option(fc.record({
    description: fc.string(),
    value: fc.integer(),
  }), { nil: undefined }),
});

/**
 * Arbitrary for generating relationships
 */
const relationshipArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  source: fc.string({ minLength: 1, maxLength: 20 }),
  target: fc.string({ minLength: 1, maxLength: 20 }),
  type: fc.constantFrom('KNOWS', 'WORKS_FOR', 'RELATED_TO', 'CAUSED_BY', 'LOCATED_IN'),
  confidence: fc.option(fc.double({ min: 0, max: 1 }), { nil: undefined }),
});

// =====================================================
// PROPERTY 21: ENTROPY-BASED QUALITY
// =====================================================

describe('Property 21: Entropy-Based Quality', () => {
  let analyzer: QualityAnalyzer;
  
  beforeEach(() => {
    analyzer = new QualityAnalyzer();
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 21: Entropy-Based Quality
   * Validates: Requirements 5.2
   * 
   * Property: For any array of entities, the entropy should be non-negative
   */
  test('entropy is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(entityArbitrary, { minLength: 0, maxLength: 100 }),
        fc.array(relationshipArbitrary, { minLength: 0, maxLength: 50 }),
        (entities, relationships) => {
          const entropy = analyzer.calculateEntropy(entities, relationships);
          
          // Entropy should always be >= 0
          expect(entropy).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 21: Entropy-Based Quality
   * Validates: Requirements 5.2
   * 
   * Property: Empty input should have zero entropy
   */
  test('empty input has zero entropy', () => {
    const entropy = analyzer.calculateEntropy([], []);
    expect(entropy).toBe(0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 21: Entropy-Based Quality
   * Validates: Requirements 5.2
   * 
   * Property: Single entity creates two elements (type and name), so entropy = 1 bit
   */
  test('single element has entropy of 1 bit', () => {
    const entity: Entity = {
      id: '1',
      name: 'Alice',
      type: 'Person',
    };
    
    const entropy = analyzer.calculateEntropy([entity], []);
    // Single entity creates 2 elements: entity:Person and name:Alice
    // Uniform distribution over 2 elements = log₂(2) = 1 bit
    expect(entropy).toBe(1);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 21: Entropy-Based Quality
   * Validates: Requirements 5.2
   * 
   * Property: Duplicate entities should have lower entropy than unique entities
   */
  test('duplicates have lower entropy than unique entities', () => {
    fc.assert(
      fc.property(
        fc.array(entityArbitrary, { minLength: 10, maxLength: 100 }),
        (entities) => {
          // Skip if entities are already all duplicates
          const uniqueTypes = new Set(entities.map(e => e.type));
          if (uniqueTypes.size === 1) {
            return true; // Skip this case
          }
          
          const originalEntropy = analyzer.calculateEntropy(entities, []);
          
          // Create duplicates by repeating the array
          const duplicates = [...entities, ...entities];
          const duplicateEntropy = analyzer.calculateEntropy(duplicates, []);
          
          // Duplicates should have lower or equal entropy
          // (equal if already uniform distribution)
          expect(duplicateEntropy).toBeLessThanOrEqual(originalEntropy);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 21: Entropy-Based Quality
   * Validates: Requirements 5.2
   * 
   * Property: All identical elements should have entropy of 1 bit (type vs name)
   */
  test('all identical elements have entropy of 1 bit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('Person', 'Organization', 'Concept'),
        (count, name, type) => {
          const entities: Entity[] = Array(count).fill(null).map((_, i) => ({
            id: `${i}`,
            name,
            type,
          }));
          
          const entropy = analyzer.calculateEntropy(entities, []);
          
          // All identical entities create 2 unique element types: entity:type and name:name
          // Uniform distribution over 2 elements = log₂(2) = 1 bit
          expect(entropy).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 21: Entropy-Based Quality
   * Validates: Requirements 5.2
   * 
   * Property: More diverse data should have higher entropy
   */
  test('diverse data has higher entropy than repetitive data', () => {
    // Repetitive data: same type repeated
    const repetitive: Entity[] = Array(20).fill(null).map((_, i) => ({
      id: `${i}`,
      name: `Entity ${i}`,
      type: 'Person', // All same type
    }));
    
    // Diverse data: different types
    const diverse: Entity[] = Array(20).fill(null).map((_, i) => ({
      id: `${i}`,
      name: `Entity ${i}`,
      type: ['Person', 'Organization', 'Concept', 'Event', 'Location'][i % 5],
    }));
    
    const repetitiveEntropy = analyzer.calculateEntropy(repetitive, []);
    const diverseEntropy = analyzer.calculateEntropy(diverse, []);
    
    // Diverse should have higher entropy
    expect(diverseEntropy).toBeGreaterThan(repetitiveEntropy);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 21: Entropy-Based Quality
   * Validates: Requirements 5.2
   * 
   * Property: Entropy should be bounded by log₂(n) where n is unique elements
   */
  test('entropy is bounded by theoretical maximum', () => {
    fc.assert(
      fc.property(
        fc.array(entityArbitrary, { minLength: 2, maxLength: 100 }),
        (entities) => {
          const entropy = analyzer.calculateEntropy(entities, []);
          
          // Count unique elements (types and names)
          const uniqueElements = new Set<string>();
          for (const entity of entities) {
            uniqueElements.add(`entity:${entity.type}`);
            uniqueElements.add(`name:${entity.name}`);
          }
          
          // Maximum entropy is log₂(n) for uniform distribution
          const maxEntropy = Math.log2(uniqueElements.size);
          
          // Entropy should not exceed theoretical maximum
          expect(entropy).toBeLessThanOrEqual(maxEntropy + 0.01); // Small epsilon for floating point
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 25: KOLMOGOROV COMPLEXITY APPROXIMATION
// =====================================================

describe('Property 25: Kolmogorov Complexity Approximation', () => {
  let analyzer: QualityAnalyzer;
  
  beforeEach(() => {
    analyzer = new QualityAnalyzer();
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 25: Kolmogorov Complexity Approximation
   * Validates: Requirements 6.1
   * 
   * Property: Compression ratio should be in [0, 1] range
   */
  test('compression ratio is bounded between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (data) => {
          const ratio = analyzer.approximateKolmogorovComplexity(data);
          
          // Ratio should be in [0, 1]
          expect(ratio).toBeGreaterThanOrEqual(0);
          expect(ratio).toBeLessThanOrEqual(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 25: Kolmogorov Complexity Approximation
   * Validates: Requirements 6.1
   * 
   * Property: Empty string should have maximum ratio (worst quality)
   */
  test('empty string has maximum compression ratio', () => {
    const ratio = analyzer.approximateKolmogorovComplexity('');
    expect(ratio).toBe(1.0);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 25: Kolmogorov Complexity Approximation
   * Validates: Requirements 6.1
   * 
   * Property: Repetitive data should have lower compression ratio than diverse data
   */
  test('repetitive data compresses better than diverse data', () => {
    // Highly repetitive data
    const repetitive = 'spam '.repeat(100);
    
    // Diverse data with many unique words
    const diverse = 'The quick brown fox jumps over the lazy dog. ' +
      'Pack my box with five dozen liquor jugs. ' +
      'How vexingly quick daft zebras jump! ' +
      'Sphinx of black quartz, judge my vow. ' +
      'Waltz, bad nymph, for quick jigs vex.';
    
    const repetitiveRatio = analyzer.approximateKolmogorovComplexity(repetitive);
    const diverseRatio = analyzer.approximateKolmogorovComplexity(diverse);
    
    // Repetitive should compress better (lower ratio)
    expect(repetitiveRatio).toBeLessThan(diverseRatio);
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 25: Kolmogorov Complexity Approximation
   * Validates: Requirements 6.1
   * 
   * Property: Random data should have high compression ratio (incompressible)
   */
  test('random data has high compression ratio', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 100, maxLength: 500 }),
        (randomBytes) => {
          // Convert random bytes to string
          const randomData = Buffer.from(randomBytes).toString('base64');
          
          const ratio = analyzer.approximateKolmogorovComplexity(randomData);
          
          // Random data should be relatively incompressible (high ratio)
          // Typically > 0.7 for truly random data
          expect(ratio).toBeGreaterThan(0.5);
          
          return true;
        }
      ),
      { numRuns: 50 } // Fewer runs for performance
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 25: Kolmogorov Complexity Approximation
   * Validates: Requirements 6.1
   * 
   * Property: Duplicating data should improve or maintain compression ratio
   */
  test('duplicating data improves or maintains compression ratio', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 50, maxLength: 200 }),
        (data) => {
          // Skip strings that are too uniform (like all spaces)
          const uniqueChars = new Set(data).size;
          if (uniqueChars < 3) {
            return true; // Skip edge case
          }
          
          const originalRatio = analyzer.approximateKolmogorovComplexity(data);
          
          // Duplicate the data
          const duplicated = data + data;
          const duplicatedRatio = analyzer.approximateKolmogorovComplexity(duplicated);
          
          // Duplicating should improve compression (lower ratio) or stay similar
          // Allow for some variance due to gzip overhead
          expect(duplicatedRatio).toBeLessThanOrEqual(originalRatio * 1.1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: byzantine-resistance-enhancement, Property 25: Kolmogorov Complexity Approximation
   * Validates: Requirements 6.1
   * 
   * Property: Longer repetitive strings should compress better
   */
  test('longer repetitive strings have lower compression ratio', () => {
    const short = 'abc'.repeat(10);
    const long = 'abc'.repeat(100);
    
    const shortRatio = analyzer.approximateKolmogorovComplexity(short);
    const longRatio = analyzer.approximateKolmogorovComplexity(long);
    
    // Longer repetitive string should compress better (lower ratio)
    expect(longRatio).toBeLessThanOrEqual(shortRatio);
  });
});

// =====================================================
// ADDITIONAL QUALITY ANALYZER TESTS
// =====================================================

describe('Quality Analyzer - Novelty-Volume Ratio', () => {
  let analyzer: QualityAnalyzer;
  
  beforeEach(() => {
    analyzer = new QualityAnalyzer();
  });
  
  test('novelty-volume ratio is in [0, 1] range', () => {
    const agentId = 'test-agent';
    const entities: Entity[] = [
      { id: '1', name: 'Alice', type: 'Person' },
      { id: '2', name: 'Bob', type: 'Person' },
    ];
    
    analyzer.updateMetrics(agentId, entities, 2, 1.0);
    
    const ratio = analyzer.computeNoveltyVolumeRatio(agentId, 3600000);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });
  
  test('no data returns neutral ratio of 1.0', () => {
    const ratio = analyzer.computeNoveltyVolumeRatio('unknown-agent', 3600000);
    expect(ratio).toBe(1.0);
  });
  
  test('stale metrics return neutral ratio', () => {
    const agentId = 'test-agent';
    const entities: Entity[] = [
      { id: '1', name: 'Alice', type: 'Person' },
    ];
    
    analyzer.updateMetrics(agentId, entities, 1, 1.0);
    
    // Get metrics and manually set old timestamp
    const metrics = analyzer.getMetrics(agentId);
    if (metrics) {
      metrics.windowEnd = Date.now() - 7200000; // 2 hours ago
    }
    
    const ratio = analyzer.computeNoveltyVolumeRatio(agentId, 3600000); // 1 hour window
    expect(ratio).toBe(1.0);
  });
});

describe('Quality Analyzer - Sybil Detection', () => {
  let analyzer: QualityAnalyzer;
  
  beforeEach(() => {
    analyzer = new QualityAnalyzer();
  });
  
  test('no data returns not suspicious', () => {
    const result = analyzer.detectSybilPatterns('unknown-agent');
    expect(result.isSuspicious).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.recommendedAction).toBe('NONE');
  });
  
  test('low novelty-volume ratio triggers detection', () => {
    const agentId = 'suspicious-agent';
    const entities: Entity[] = Array(100).fill(null).map((_, i) => ({
      id: `${i}`,
      name: 'Spam',
      type: 'Person',
    }));
    
    // Only 10 novel out of 100 (ratio = 0.1 < 0.3 threshold)
    analyzer.updateMetrics(agentId, entities, 10, 0.5);
    
    const result = analyzer.detectSybilPatterns(agentId);
    expect(result.isSuspicious).toBe(true);
    expect(result.indicators.length).toBeGreaterThan(0);
  });
  
  test('low entropy triggers detection', () => {
    const agentId = 'low-entropy-agent';
    const entities: Entity[] = [
      { id: '1', name: 'Alice', type: 'Person' },
    ];
    
    // Low entropy (< 2.0 threshold)
    analyzer.updateMetrics(agentId, entities, 1, 0.5);
    
    const result = analyzer.detectSybilPatterns(agentId);
    expect(result.isSuspicious).toBe(true);
    expect(result.indicators.some(i => i.type === 'LOW_ENTROPY')).toBe(true);
  });
  
  test('high confidence triggers BLOCK action', () => {
    const agentId = 'malicious-agent';
    const entities: Entity[] = Array(100).fill(null).map((_, i) => ({
      id: `${i}`,
      name: 'Spam',
      type: 'Person',
    }));
    
    // Very low novelty and entropy
    analyzer.updateMetrics(agentId, entities, 5, 0.1);
    
    const result = analyzer.detectSybilPatterns(agentId);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.recommendedAction).toBe('BLOCK');
  });
});

describe('Quality Analyzer - Entity Fingerprinting', () => {
  let analyzer: QualityAnalyzer;
  
  beforeEach(() => {
    analyzer = new QualityAnalyzer();
  });
  
  test('identical entities have same fingerprint', () => {
    const entity1: Entity = { id: '1', name: 'Alice', type: 'Person' };
    const entity2: Entity = { id: '2', name: 'Alice', type: 'Person' };
    
    const fp1 = analyzer.generateEntityFingerprint(entity1);
    const fp2 = analyzer.generateEntityFingerprint(entity2);
    
    expect(fp1).toBe(fp2);
  });
  
  test('different entities have different fingerprints', () => {
    const entity1: Entity = { id: '1', name: 'Alice', type: 'Person' };
    const entity2: Entity = { id: '2', name: 'Bob', type: 'Person' };
    
    const fp1 = analyzer.generateEntityFingerprint(entity1);
    const fp2 = analyzer.generateEntityFingerprint(entity2);
    
    expect(fp1).not.toBe(fp2);
  });
  
  test('case-insensitive fingerprinting', () => {
    const entity1: Entity = { id: '1', name: 'Alice', type: 'Person' };
    const entity2: Entity = { id: '2', name: 'ALICE', type: 'PERSON' };
    
    const fp1 = analyzer.generateEntityFingerprint(entity1);
    const fp2 = analyzer.generateEntityFingerprint(entity2);
    
    expect(fp1).toBe(fp2);
  });
  
  test('whitespace normalization in fingerprinting', () => {
    const entity1: Entity = { id: '1', name: 'Alice', type: 'Person' };
    const entity2: Entity = { id: '2', name: '  Alice  ', type: '  Person  ' };
    
    const fp1 = analyzer.generateEntityFingerprint(entity1);
    const fp2 = analyzer.generateEntityFingerprint(entity2);
    
    expect(fp1).toBe(fp2);
  });
});
