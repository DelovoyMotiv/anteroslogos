/**
 * Property-Based Tests for Entity Extractor
 * Feature: agent-middleware
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { EntityExtractor } from '../entityExtractor';
import type { SchemaMarkupData } from '../../../types/agent-middleware.types';

describe('Entity Extractor - Property-Based Tests', () => {
  describe('Property 8: Entity normalization completeness', () => {
    it('should ensure all normalized entities have required fields', () => {
      // Feature: agent-middleware, Property 8: Entity normalization completeness
      // Validates: Requirements 2.4
      
      const extractor = new EntityExtractor();
      
      // Generator for raw entity data
      const rawEntityArbitrary = fc.record({
        type: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        properties: fc.dictionary(fc.string(), fc.anything()),
        source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
        url: fc.option(fc.webUrl({ validSchemes: ['http', 'https'] }), { nil: undefined }),
        image: fc.option(fc.webUrl({ validSchemes: ['http', 'https'] }), { nil: undefined }),
        description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
      });
      
      fc.assert(
        fc.property(
          rawEntityArbitrary,
          (rawEntity) => {
            // Property: For any raw entity, normalization should produce an entity with all required fields
            const normalized = extractor.normalizeEntity(rawEntity);
            
            // Check all required fields are present
            expect(normalized).toHaveProperty('id');
            expect(normalized).toHaveProperty('type');
            expect(normalized).toHaveProperty('name');
            expect(normalized).toHaveProperty('confidence');
            expect(normalized).toHaveProperty('properties');
            expect(normalized).toHaveProperty('source');
            
            // Check field types
            expect(typeof normalized.id).toBe('string');
            expect(typeof normalized.type).toBe('string');
            expect(typeof normalized.name).toBe('string');
            expect(typeof normalized.confidence).toBe('number');
            expect(typeof normalized.properties).toBe('object');
            expect(['schema', 'content', 'inferred']).toContain(normalized.source);
            
            // Check id is not empty
            expect(normalized.id.length).toBeGreaterThan(0);
            
            // Check type is not empty
            expect(normalized.type.length).toBeGreaterThan(0);
            
            // Check name is not empty
            expect(normalized.name.length).toBeGreaterThan(0);
            
            // Check properties is an object (not null or array)
            expect(normalized.properties).not.toBeNull();
            expect(Array.isArray(normalized.properties)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique IDs for each normalized entity', () => {
      // Feature: agent-middleware, Property 8: Entity normalization completeness
      // Validates: Requirements 2.4
      
      const extractor = new EntityExtractor();
      
      const rawEntityArbitrary = fc.record({
        type: fc.string({ minLength: 1, maxLength: 50 }),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        properties: fc.dictionary(fc.string(), fc.anything()),
        source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
      });
      
      fc.assert(
        fc.property(
          fc.array(rawEntityArbitrary, { minLength: 2, maxLength: 10 }),
          (rawEntities) => {
            // Property: Each normalized entity should have a unique ID
            const normalized = rawEntities.map(e => extractor.normalizeEntity(e));
            const ids = normalized.map(e => e.id);
            const uniqueIds = new Set(ids);
            
            expect(uniqueIds.size).toBe(ids.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve source field from raw entity', () => {
      // Feature: agent-middleware, Property 8: Entity normalization completeness
      // Validates: Requirements 2.4
      
      const extractor = new EntityExtractor();
      
      const rawEntityArbitrary = fc.record({
        type: fc.string({ minLength: 1, maxLength: 50 }),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        properties: fc.dictionary(fc.string(), fc.anything()),
        source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
      });
      
      fc.assert(
        fc.property(
          rawEntityArbitrary,
          (rawEntity) => {
            // Property: The source field should be preserved during normalization
            const normalized = extractor.normalizeEntity(rawEntity);
            
            expect(normalized.source).toBe(rawEntity.source);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use default values when required fields are missing', () => {
      // Feature: agent-middleware, Property 8: Entity normalization completeness
      // Validates: Requirements 2.4
      
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
          (source) => {
            // Property: Missing type should default to 'Thing', missing name should default to type
            const rawEntity = {
              source,
              properties: {},
            };
            
            const normalized = extractor.normalizeEntity(rawEntity);
            
            // Should have default type
            expect(normalized.type).toBe('Thing');
            
            // Should have default name (same as type)
            expect(normalized.name).toBe('Thing');
            
            // Should still have all required fields
            expect(normalized.id).toBeDefined();
            expect(normalized.confidence).toBeDefined();
            expect(normalized.properties).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve optional fields when present', () => {
      // Feature: agent-middleware, Property 8: Entity normalization completeness
      // Validates: Requirements 2.4
      
      const extractor = new EntityExtractor();
      
      const rawEntityArbitrary = fc.record({
        type: fc.string({ minLength: 1, maxLength: 50 }),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        properties: fc.dictionary(fc.string(), fc.anything()),
        source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
        url: fc.webUrl({ validSchemes: ['http', 'https'] }),
        image: fc.webUrl({ validSchemes: ['http', 'https'] }),
        description: fc.string({ minLength: 1, maxLength: 200 }),
      });
      
      fc.assert(
        fc.property(
          rawEntityArbitrary,
          (rawEntity) => {
            // Property: Optional fields should be preserved when present
            const normalized = extractor.normalizeEntity(rawEntity);
            
            expect(normalized.url).toBe(rawEntity.url);
            expect(normalized.image).toBe(rawEntity.image);
            expect(normalized.description).toBe(rawEntity.description);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 32: Confidence score bounds', () => {
    it('should ensure confidence scores are between 0 and 1', () => {
      // Feature: agent-middleware, Property 32: Confidence score bounds
      // Validates: Requirements 10.5
      
      const extractor = new EntityExtractor();
      
      const rawEntityArbitrary = fc.record({
        type: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        properties: fc.dictionary(fc.string(), fc.anything()),
        source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
        url: fc.option(fc.webUrl({ validSchemes: ['http', 'https'] }), { nil: undefined }),
        image: fc.option(fc.webUrl({ validSchemes: ['http', 'https'] }), { nil: undefined }),
        description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
      });
      
      fc.assert(
        fc.property(
          rawEntityArbitrary,
          (rawEntity) => {
            // Property: For any entity, the confidence score should be between 0 and 1 inclusive
            const normalized = extractor.normalizeEntity(rawEntity);
            
            expect(normalized.confidence).toBeGreaterThanOrEqual(0);
            expect(normalized.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign higher confidence to schema-sourced entities', () => {
      // Feature: agent-middleware, Property 32: Confidence score bounds
      // Validates: Requirements 10.5
      
      const extractor = new EntityExtractor();
      
      const rawEntityArbitrary = fc.record({
        type: fc.string({ minLength: 1, maxLength: 50 }),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        properties: fc.dictionary(fc.string(), fc.anything()),
      });
      
      fc.assert(
        fc.property(
          rawEntityArbitrary,
          (baseEntity) => {
            // Property: Schema-sourced entities should have higher confidence than content or inferred
            const schemaEntity = extractor.normalizeEntity({ ...baseEntity, source: 'schema' });
            const contentEntity = extractor.normalizeEntity({ ...baseEntity, source: 'content' });
            const inferredEntity = extractor.normalizeEntity({ ...baseEntity, source: 'inferred' });
            
            expect(schemaEntity.confidence).toBeGreaterThan(contentEntity.confidence);
            expect(contentEntity.confidence).toBeGreaterThan(inferredEntity.confidence);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should increase confidence with more complete entity data', () => {
      // Feature: agent-middleware, Property 32: Confidence score bounds
      // Validates: Requirements 10.5
      
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
          (type, name, source) => {
            // Property: Entities with more fields should have higher confidence
            const minimalEntity = extractor.normalizeEntity({
              type,
              name,
              source,
              properties: {},
            });
            
            const completeEntity = extractor.normalizeEntity({
              type,
              name,
              source,
              properties: {},
              url: 'https://example.com',
              image: 'https://example.com/image.jpg',
              description: 'A complete entity',
            });
            
            expect(completeEntity.confidence).toBeGreaterThanOrEqual(minimalEntity.confidence);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never exceed confidence of 1.0', () => {
      // Feature: agent-middleware, Property 32: Confidence score bounds
      // Validates: Requirements 10.5
      
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (type, name) => {
            // Property: Even with all optional fields, confidence should not exceed 1.0
            const maximalEntity = extractor.normalizeEntity({
              type,
              name,
              source: 'schema',
              properties: { extra: 'data' },
              url: 'https://example.com',
              image: 'https://example.com/image.jpg',
              description: 'A maximal entity with all fields',
            });
            
            expect(maximalEntity.confidence).toBeLessThanOrEqual(1.0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Entity extraction from schema', () => {
    it('should extract entities from valid schema markup', () => {
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (type, name) => {
            // Property: Valid schema markup should produce entities
            const schemaData: SchemaMarkupData = {
              types: [type],
              data: [
                {
                  '@type': type,
                  'name': name,
                },
              ],
            };
            
            const entities = extractor.extractEntities('', schemaData);
            
            expect(entities.length).toBeGreaterThan(0);
            expect(entities[0].type).toBe(type);
            expect(entities[0].name).toBe(name.trim());
            expect(entities[0].source).toBe('schema');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty schema markup', () => {
      const extractor = new EntityExtractor();
      
      const schemaData: SchemaMarkupData = {
        types: [],
        data: [],
      };
      
      const entities = extractor.extractEntities('', schemaData);
      
      expect(Array.isArray(entities)).toBe(true);
    });

    it('should skip schema objects without type', () => {
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (name) => {
            // Property: Schema objects without @type should be skipped
            const schemaData: SchemaMarkupData = {
              types: [],
              data: [
                {
                  'name': name,
                  // Missing @type
                },
              ],
            };
            
            const entities = extractor.extractEntities('', schemaData);
            
            // Should not extract entities without type
            expect(entities.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should skip schema objects without name', () => {
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (type) => {
            // Property: Schema objects without name should be skipped
            const schemaData: SchemaMarkupData = {
              types: [type],
              data: [
                {
                  '@type': type,
                  // Missing name
                },
              ],
            };
            
            const entities = extractor.extractEntities('', schemaData);
            
            // Should not extract entities without name
            expect(entities.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Relationship building', () => {
    it('should return empty array for entities without relationships', () => {
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.string({ minLength: 1, maxLength: 50 }),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              properties: fc.constant({}),
              source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (rawEntities) => {
            // Property: Entities without relationship properties should produce no relationships
            const entities = rawEntities.map(e => extractor.normalizeEntity(e));
            const relationships = extractor.buildRelationships(entities);
            
            expect(Array.isArray(relationships)).toBe(true);
            expect(relationships.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure relationship confidence is bounded', () => {
      const extractor = new EntityExtractor();
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.string({ minLength: 1, maxLength: 50 }),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              properties: fc.dictionary(fc.string(), fc.anything()),
              source: fc.constantFrom('schema', 'content', 'inferred') as fc.Arbitrary<'schema' | 'content' | 'inferred'>,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (rawEntities) => {
            // Property: All relationship confidence scores should be between 0 and 1
            const entities = rawEntities.map(e => extractor.normalizeEntity(e));
            const relationships = extractor.buildRelationships(entities);
            
            for (const rel of relationships) {
              expect(rel.confidence).toBeGreaterThanOrEqual(0);
              expect(rel.confidence).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
