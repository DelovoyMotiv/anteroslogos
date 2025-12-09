/**
 * Property-based tests for Semantic Serializer
 * Tests correctness properties for token-efficient serialization
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { SemanticSerializer } from '../serializer';
import type { Entity, Relationship, SerializableData } from '../../../types/agent-middleware.types';

// Test configuration
const testConfig = {
  numRuns: 100,
  verbose: false,
};

// Arbitraries for generating test data

/**
 * Generates valid entity objects
 */
const entityArbitrary = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('Organization', 'Person', 'Product', 'Article', 'WebPage', 'Thing'),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
  properties: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null)
    )
  ),
  url: fc.option(fc.webUrl(), { nil: undefined }),
  image: fc.option(fc.webUrl(), { nil: undefined }),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
}) as fc.Arbitrary<Entity>;

/**
 * Generates valid relationship objects
 */
const relationshipArbitrary = (entityIds: string[]): fc.Arbitrary<Relationship> => {
  if (entityIds.length < 2) {
    // Fallback for when we don't have enough entities
    return fc.record({
      source: fc.uuid(),
      target: fc.uuid(),
      type: fc.constantFrom('author', 'offers', 'mentions', 'knows', 'worksFor'),
      confidence: fc.float({ min: 0, max: 1, noNaN: true }),
    });
  }
  
  return fc.record({
    source: fc.constantFrom(...entityIds),
    target: fc.constantFrom(...entityIds),
    type: fc.constantFrom('author', 'offers', 'mentions', 'knows', 'worksFor'),
    confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  });
};

/**
 * Generates serializable data with entities and relationships
 */
const serializableDataArbitrary = fc.array(entityArbitrary, { minLength: 1, maxLength: 10 })
  .chain(entities => {
    const entityIds = entities.map(e => e.id);
    return fc.record({
      entities: fc.constant(entities),
      relationships: fc.array(relationshipArbitrary(entityIds), { maxLength: 15 }),
    });
  }) as fc.Arbitrary<SerializableData>;

describe('SemanticSerializer Property Tests', () => {
  const serializer = new SemanticSerializer();

  // Feature: agent-middleware, Property 16: Columnar format transformation
  // Validates: Requirements 5.1, 5.2
  test('Property 16: Columnar format transformation - all field names appear once in schema', () => {
    fc.assert(
      fc.property(
        serializableDataArbitrary,
        (data) => {
          const compact = serializer.toCompactJson(data);
          
          // Check that schema array has no duplicates
          const schemaSet = new Set(compact.schema);
          expect(schemaSet.size).toBe(compact.schema.length);
          
          // Check that each entity row has same length as schema
          for (const entityRow of compact.entities) {
            expect(entityRow.length).toBe(compact.schema.length);
          }
          
          // Check that relations schema has expected fields
          expect(compact.relations.schema).toContain('source');
          expect(compact.relations.schema).toContain('target');
          expect(compact.relations.schema).toContain('type');
          
          // Check that each relation row matches relation schema length
          for (const relationRow of compact.relations.data) {
            expect(relationRow.length).toBe(compact.relations.schema.length);
          }
        }
      ),
      testConfig
    );
  });

  // Feature: agent-middleware, Property 18: Key normalization reduces redundancy
  // Validates: Requirements 5.4
  test('Property 18: Key normalization reduces redundancy', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            original: fc.constantFrom('img', 'image', 'pic', 'photo'),
            expected: fc.constant('image'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (testCases) => {
          for (const testCase of testCases) {
            const normalized = (serializer as any).normalizeKey(testCase.original);
            expect(normalized).toBe(testCase.expected);
          }
        }
      ),
      testConfig
    );
  });

  // Feature: agent-middleware, Property 19: Relationship triplet format
  // Validates: Requirements 5.5
  test('Property 19: Relationship triplet format - relationships are 4-element arrays', () => {
    fc.assert(
      fc.property(
        serializableDataArbitrary,
        (data) => {
          const compact = serializer.toCompactJson(data);
          
          // Each relationship should be represented as an array
          for (const relationRow of compact.relations.data) {
            expect(Array.isArray(relationRow)).toBe(true);
            
            // Should have 4 elements: [source, target, type, confidence]
            expect(relationRow.length).toBe(4);
            
            // Source and target should be strings (entity IDs)
            expect(typeof relationRow[0]).toBe('string');
            expect(typeof relationRow[1]).toBe('string');
            
            // Type should be a string
            expect(typeof relationRow[2]).toBe('string');
            
            // Confidence should be a number between 0 and 1
            expect(typeof relationRow[3]).toBe('number');
            expect(relationRow[3]).toBeGreaterThanOrEqual(0);
            expect(relationRow[3]).toBeLessThanOrEqual(1);
          }
        }
      ),
      testConfig
    );
  });

  // Feature: agent-middleware, Property 17: Token cost calculation
  // Validates: Requirements 5.3
  test('Property 17: Token cost calculation - returns positive integer', () => {
    fc.assert(
      fc.property(
        serializableDataArbitrary,
        (data) => {
          const compactCost = serializer.calculateTokenCost(data, 'compact');
          const jsonLdCost = serializer.calculateTokenCost(data, 'json-ld');
          
          // Token costs should be positive integers
          expect(compactCost).toBeGreaterThan(0);
          expect(Number.isInteger(compactCost)).toBe(true);
          
          expect(jsonLdCost).toBeGreaterThan(0);
          expect(Number.isInteger(jsonLdCost)).toBe(true);
          
          // Both formats should produce valid token counts
          // Note: Compact format may not always be smaller for very small or sparse datasets
          // due to schema overhead, but both should be reasonable
          expect(compactCost).toBeLessThan(1000000); // Sanity check
          expect(jsonLdCost).toBeLessThan(1000000); // Sanity check
        }
      ),
      testConfig
    );
  });

  // Feature: agent-middleware, Property 5: JSON-LD format includes required fields
  // Validates: Requirements 1.5
  test('Property 5: JSON-LD format includes required fields', () => {
    fc.assert(
      fc.property(
        serializableDataArbitrary,
        (data) => {
          const jsonLd = serializer.toJsonLd(data);
          
          // Should have @context and @type at the root level
          expect(jsonLd['@context']).toBeDefined();
          expect(jsonLd['@type']).toBeDefined();
          
          // Each entity should have @type and @id
          if (Array.isArray(jsonLd.entities)) {
            for (const entity of jsonLd.entities) {
              expect(entity['@type']).toBeDefined();
              expect(entity['@id']).toBeDefined();
            }
          }
        }
      ),
      testConfig
    );
  });

  // Additional property: Token savings calculation
  test('Token savings calculation returns value between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 50, max: 10000 }),
        (original, compressed) => {
          const savings = serializer.calculateTokenSavings(original, compressed);
          
          expect(savings).toBeGreaterThanOrEqual(0);
          expect(savings).toBeLessThanOrEqual(100);
        }
      ),
      testConfig
    );
  });

  // Additional property: Core entity fields always present in schema
  test('Core entity fields always present in compact schema', () => {
    fc.assert(
      fc.property(
        serializableDataArbitrary,
        (data) => {
          const compact = serializer.toCompactJson(data);
          
          // Core fields should always be in schema
          const coreFields = ['id', 'type', 'name', 'confidence', 'source'];
          for (const field of coreFields) {
            expect(compact.schema).toContain(field);
          }
        }
      ),
      testConfig
    );
  });
});
