/**
 * Property-Based Tests for SchemaValidator
 * 
 * Tests recursive JSON-LD schema extraction using fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { SchemaValidator } from '../SchemaValidator';

/**
 * Generators for property-based testing
 */

// Generate a valid schema type
const schemaTypeArb = fc.oneof(
  fc.constant('Organization'),
  fc.constant('WebSite'),
  fc.constant('Person'),
  fc.constant('Article'),
  fc.constant('BlogPosting'),
  fc.constant('Product'),
  fc.constant('Review'),
  fc.constant('BreadcrumbList'),
  fc.constant('FAQPage'),
  fc.constant('LocalBusiness'),
  fc.constant('Event')
);

// Generate a simple schema object with @type
const simpleSchemaArb = fc.record({
  '@type': schemaTypeArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  url: fc.webUrl(),
});

// Generate a schema object that might be in @graph
const graphItemArb: fc.Arbitrary<Record<string, unknown>> = fc.record({
  '@type': schemaTypeArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  url: fc.option(fc.webUrl(), { nil: undefined }),
});

/**
 * Property 10: Complete @graph Traversal
 * **Feature: geo-audit-engine-hardening, Property 10: Complete @graph Traversal**
 * **Validates: Requirements 3.1**
 * 
 * For any JSON-LD structure containing an @graph array, when the SchemaValidator 
 * processes it, all nested objects within the graph should be traversed using 
 * depth-first search.
 */
describe('SchemaValidator - Property 10: Complete @graph Traversal', () => {
  it('should traverse all schemas in @graph array', () => {
    fc.assert(
      fc.property(
        fc.array(graphItemArb, { minLength: 1, maxLength: 10 }),
        (graphItems) => {
          // Create a JSON-LD structure with @graph
          const jsonLd = {
            '@context': 'https://schema.org',
            '@graph': graphItems,
          };

          // Create a document with this JSON-LD
          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(jsonLd)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: All items in @graph should be discovered
          // The number of schemas found should equal the number of items in @graph
          expect(result.schemas.length).toBe(graphItems.length);
          
          // Property: hasGraph should be true
          expect(result.hasGraph).toBe(true);
          
          // Property: Each schema should have the correct type
          graphItems.forEach((item, index) => {
            const foundSchema = result.schemas.find(s => {
              const type = Array.isArray(s.type) ? s.type[0] : s.type;
              return type === item['@type'];
            });
            expect(foundSchema).toBeDefined();
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle empty @graph arrays', () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [],
    };

    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            ${JSON.stringify(jsonLd)}
          </script>
        </head>
        <body></body>
      </html>
    `);

    const validator = new SchemaValidator();
    const result = validator.extractSchemas(dom.window.document);

    // Empty @graph should result in no schemas
    expect(result.schemas.length).toBe(0);
    expect(result.hasGraph).toBe(true);
  });
});

/**
 * Property 11: Schema Detection at Any Depth
 * **Feature: geo-audit-engine-hardening, Property 11: Schema Detection at Any Depth**
 * **Validates: Requirements 3.2**
 * 
 * For any schema nested at any level in a JSON-LD structure, when the SchemaValidator 
 * traverses the structure, the schema should be extracted and its type validated.
 */
describe('SchemaValidator - Property 11: Schema Detection at Any Depth', () => {
  it('should detect schemas at any nesting level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // Nesting depth
        schemaTypeArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (depth, schemaType, name) => {
          // Build a nested structure with schema at the specified depth
          let nested: Record<string, unknown> = {
            '@type': schemaType,
            name,
          };

          // Wrap the schema in nested objects
          for (let i = 0; i < depth; i++) {
            nested = {
              [`level${i}`]: nested,
            };
          }

          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(nested)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: Schema should be found regardless of depth
          expect(result.schemas.length).toBeGreaterThanOrEqual(1);
          
          // Property: The schema type should be in the results
          expect(result.types).toContain(schemaType);
          
          // Property: The found schema should have the correct depth
          const foundSchema = result.schemas.find(s => {
            const type = Array.isArray(s.type) ? s.type[0] : s.type;
            return type === schemaType;
          });
          expect(foundSchema).toBeDefined();
          expect(foundSchema!.depth).toBe(depth);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should detect multiple schemas at different depths', () => {
    fc.assert(
      fc.property(
        schemaTypeArb,
        schemaTypeArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (type1, type2, name1, name2) => {
          // Create a structure with schemas at different depths
          const jsonLd = {
            '@type': type1,
            name: name1,
            nested: {
              deeper: {
                '@type': type2,
                name: name2,
              },
            },
          };

          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(jsonLd)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: Both schemas should be found (even if they have the same type)
          expect(result.schemas.length).toBe(2);
          
          // Property: Both types should be in the results
          expect(result.types).toContain(type1);
          expect(result.types).toContain(type2);
          
          // Property: Schemas should have different depths
          const schemasAtDepth0 = result.schemas.filter(s => s.depth === 0);
          const schemasAtDepth2 = result.schemas.filter(s => s.depth === 2);
          
          expect(schemasAtDepth0.length).toBe(1);
          expect(schemasAtDepth2.length).toBe(1);
          
          // Verify the types match
          const type1Actual = Array.isArray(schemasAtDepth0[0].type) 
            ? schemasAtDepth0[0].type[0] 
            : schemasAtDepth0[0].type;
          const type2Actual = Array.isArray(schemasAtDepth2[0].type) 
            ? schemasAtDepth2[0].type[0] 
            : schemasAtDepth2[0].type;
            
          expect(type1Actual).toBe(type1);
          expect(type2Actual).toBe(type2);
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 12: Nested Organization Schema Detection
 * **Feature: geo-audit-engine-hardening, Property 12: Nested Organization Schema Detection**
 * **Validates: Requirements 3.3**
 * 
 * For any Organization schema nested within other structures, when the SchemaValidator 
 * processes the JSON-LD, the Organization schema should be detected regardless of its 
 * parent structure.
 */
describe('SchemaValidator - Property 12: Nested Organization Schema Detection', () => {
  it('should detect Organization schema regardless of parent structure', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }), // Nesting depth
        fc.string({ minLength: 1, maxLength: 50 }), // Organization name
        fc.webUrl(), // Organization URL
        (depth, orgName, orgUrl) => {
          // Create an Organization schema
          let orgSchema: Record<string, unknown> = {
            '@type': 'Organization',
            name: orgName,
            url: orgUrl,
          };

          // Wrap it in random parent structures
          for (let i = 0; i < depth; i++) {
            const wrapperType = i % 2 === 0 ? 'WebSite' : 'Article';
            orgSchema = {
              '@type': wrapperType,
              name: `Wrapper ${i}`,
              publisher: orgSchema,
            };
          }

          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(orgSchema)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: Organization schema should be found
          expect(result.types).toContain('Organization');
          
          // Property: Should be able to retrieve Organization schemas
          const orgSchemas = validator.getSchemasByType(result.schemas, 'Organization');
          expect(orgSchemas.length).toBeGreaterThanOrEqual(1);
          
          // Property: The Organization schema should have the correct data
          const foundOrg = orgSchemas.find(s => s.data.name === orgName);
          expect(foundOrg).toBeDefined();
          expect(foundOrg!.data.url).toBe(orgUrl);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should detect Organization in @graph with other schemas', () => {
    fc.assert(
      fc.property(
        fc.array(schemaTypeArb, { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.webUrl(),
        (otherTypes, orgName, orgUrl) => {
          // Create a @graph with Organization and other schemas
          const graphItems = [
            {
              '@type': 'Organization',
              name: orgName,
              url: orgUrl,
            },
            ...otherTypes.map((type, i) => ({
              '@type': type,
              name: `Item ${i}`,
            })),
          ];

          const jsonLd = {
            '@context': 'https://schema.org',
            '@graph': graphItems,
          };

          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(jsonLd)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: Organization should be detected in @graph
          expect(result.types).toContain('Organization');
          expect(result.hasGraph).toBe(true);
          
          // Property: Should find the Organization schema
          const hasOrg = validator.hasSchemaType(result.schemas, 'Organization');
          expect(hasOrg).toBe(true);
          
          // Property: Organization data should be preserved
          const orgSchemas = validator.getSchemasByType(result.schemas, 'Organization');
          const foundOrg = orgSchemas.find(s => s.data.name === orgName);
          expect(foundOrg).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 13: Graph Structure Flattening
 * **Feature: geo-audit-engine-hardening, Property 13: Graph Structure Flattening**
 * **Validates: Requirements 3.4**
 * 
 * For any complex linked data structure with multiple nesting levels, when the 
 * SchemaValidator analyzes it, the system should flatten the graph into a list 
 * of schemas with their nesting paths.
 */
describe('SchemaValidator - Property 13: Graph Structure Flattening', () => {
  it('should flatten complex nested structures into a list with paths', () => {
    fc.assert(
      fc.property(
        fc.array(graphItemArb, { minLength: 2, maxLength: 5 }),
        (graphItems) => {
          // Create a complex structure with @graph and nested schemas
          const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Root Site',
            '@graph': graphItems,
            publisher: {
              '@type': 'Organization',
              name: 'Publisher Org',
              member: {
                '@type': 'Person',
                name: 'Member Person',
              },
            },
          };

          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(jsonLd)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: All schemas should be in a flat list
          expect(Array.isArray(result.schemas)).toBe(true);
          
          // Property: Should find root WebSite, all @graph items, Organization, and Person
          // That's 1 (WebSite) + graphItems.length + 1 (Organization) + 1 (Person)
          const expectedCount = 1 + graphItems.length + 1 + 1;
          expect(result.schemas.length).toBe(expectedCount);
          
          // Property: Each schema should have a path
          result.schemas.forEach(schema => {
            expect(Array.isArray(schema.path)).toBe(true);
          });
          
          // Property: Root schema should have empty path
          const rootSchema = result.schemas.find(s => {
            const type = Array.isArray(s.type) ? s.type[0] : s.type;
            return type === 'WebSite' && s.depth === 0;
          });
          expect(rootSchema).toBeDefined();
          expect(rootSchema!.path).toEqual([]);
          
          // Property: @graph items should have path starting with '@graph'
          const graphSchemas = result.schemas.filter(s => 
            s.path.length > 0 && s.path[0] === '@graph'
          );
          expect(graphSchemas.length).toBe(graphItems.length);
          
          // Property: Nested Person schema should have the correct path
          const nestedPersonSchema = result.schemas.find(s => {
            const type = Array.isArray(s.type) ? s.type[0] : s.type;
            return type === 'Person' && 
                   s.path.length === 2 && 
                   s.path[0] === 'publisher' && 
                   s.path[1] === 'member';
          });
          expect(nestedPersonSchema).toBeDefined();
          expect(nestedPersonSchema!.data.name).toBe('Member Person');
          
          // Property: Organization schema should have the correct path
          const orgSchema = result.schemas.find(s => {
            const type = Array.isArray(s.type) ? s.type[0] : s.type;
            return type === 'Organization' && s.path.length === 1 && s.path[0] === 'publisher';
          });
          expect(orgSchema).toBeDefined();
          expect(orgSchema!.data.name).toBe('Publisher Org');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve nesting information in flattened structure', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (maxDepth) => {
          // Build a deeply nested structure
          let nested: Record<string, unknown> = {
            '@type': 'Person',
            name: 'Deepest',
          };

          const expectedPath: string[] = [];
          for (let i = maxDepth - 1; i >= 0; i--) {
            const key = `level${i}`;
            expectedPath.unshift(key);
            nested = {
              '@type': 'Organization',
              name: `Org at level ${i}`,
              [key]: nested,
            };
          }

          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(nested)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: Should find all schemas in the chain
          expect(result.schemas.length).toBe(maxDepth + 1);
          
          // Property: Depths should range from 0 to maxDepth
          const depths = result.schemas.map(s => s.depth).sort((a, b) => a - b);
          expect(depths).toEqual(Array.from({ length: maxDepth + 1 }, (_, i) => i));
          
          // Property: Deepest schema should have the longest path
          const deepestSchema = result.schemas.find(s => s.depth === maxDepth);
          expect(deepestSchema).toBeDefined();
          expect(deepestSchema!.path.length).toBe(maxDepth);
          
          // Property: Root schema should have empty path
          const rootSchema = result.schemas.find(s => s.depth === 0);
          expect(rootSchema).toBeDefined();
          expect(rootSchema!.path).toEqual([]);
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 14: Complete Schema Discovery with Paths
 * **Feature: geo-audit-engine-hardening, Property 14: Complete Schema Discovery with Paths**
 * **Validates: Requirements 3.5**
 * 
 * For any JSON-LD structure, when the SchemaValidator completes traversal, the result 
 * should include all discovered schema types along with their complete nesting paths.
 */
describe('SchemaValidator - Property 14: Complete Schema Discovery with Paths', () => {
  it('should return all schemas with complete nesting paths', () => {
    fc.assert(
      fc.property(
        fc.array(graphItemArb, { minLength: 1, maxLength: 3 }),
        schemaTypeArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (graphItems, nestedType, nestedName) => {
          // Create a structure with multiple schemas at different levels
          const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Root',
            '@graph': graphItems,
            author: {
              '@type': nestedType,
              name: nestedName,
            },
          };

          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(jsonLd)}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: All schemas should have paths
          expect(result.schemas.length).toBeGreaterThan(0);
          result.schemas.forEach(schema => {
            expect(Array.isArray(schema.path)).toBe(true);
            expect(typeof schema.depth).toBe('number');
            expect(schema.depth).toBeGreaterThanOrEqual(0);
          });

          // Property: Path length should equal depth
          result.schemas.forEach(schema => {
            expect(schema.path.length).toBe(schema.depth);
          });

          // Property: All discovered types should be in the types array
          result.schemas.forEach(schema => {
            const schemaTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
            schemaTypes.forEach(type => {
              expect(result.types).toContain(type);
            });
          });

          // Property: Root schema should exist with empty path
          const rootSchemas = result.schemas.filter(s => s.depth === 0);
          expect(rootSchemas.length).toBeGreaterThanOrEqual(1);
          rootSchemas.forEach(schema => {
            expect(schema.path).toEqual([]);
          });

          // Property: @graph schemas should have paths starting with '@graph'
          const graphSchemas = result.schemas.filter(s => 
            s.path.length > 0 && s.path[0] === '@graph'
          );
          expect(graphSchemas.length).toBe(graphItems.length);

          // Property: Nested author schema should have correct path
          const authorSchema = result.schemas.find(s => 
            s.path.length === 1 && s.path[0] === 'author'
          );
          expect(authorSchema).toBeDefined();
          const authorType = Array.isArray(authorSchema!.type) 
            ? authorSchema!.type[0] 
            : authorSchema!.type;
          expect(authorType).toBe(nestedType);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle multiple JSON-LD scripts and track all schemas', () => {
    fc.assert(
      fc.property(
        fc.array(simpleSchemaArb, { minLength: 1, maxLength: 3 }),
        fc.array(simpleSchemaArb, { minLength: 1, maxLength: 3 }),
        (script1Schemas, script2Schemas) => {
          // Create two separate JSON-LD scripts
          const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
              <head>
                <script type="application/ld+json">
                  ${JSON.stringify(script1Schemas[0])}
                </script>
                <script type="application/ld+json">
                  ${JSON.stringify(script2Schemas[0])}
                </script>
              </head>
              <body></body>
            </html>
          `);

          const validator = new SchemaValidator();
          const result = validator.extractSchemas(dom.window.document);

          // Property: Should find schemas from both scripts
          expect(result.schemas.length).toBeGreaterThanOrEqual(2);

          // Property: All schemas should have paths
          result.schemas.forEach(schema => {
            expect(Array.isArray(schema.path)).toBe(true);
            expect(typeof schema.depth).toBe('number');
          });

          // Property: Types from both scripts should be present
          const type1 = script1Schemas[0]['@type'];
          const type2 = script2Schemas[0]['@type'];
          expect(result.types).toContain(type1);
          expect(result.types).toContain(type2);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should provide complete path information for debugging', () => {
    // Create a complex nested structure for debugging
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Main Site',
      publisher: {
        '@type': 'Organization',
        name: 'Publisher',
        founder: {
          '@type': 'Person',
          name: 'Founder',
          worksFor: {
            '@type': 'Organization',
            name: 'Company',
          },
        },
      },
    };

    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            ${JSON.stringify(jsonLd)}
          </script>
        </head>
        <body></body>
      </html>
    `);

    const validator = new SchemaValidator();
    const result = validator.extractSchemas(dom.window.document);

    // Property: Should find all 4 schemas
    expect(result.schemas.length).toBe(4);

    // Property: Each schema should have correct path
    const website = result.schemas.find(s => s.depth === 0);
    expect(website).toBeDefined();
    expect(website!.path).toEqual([]);

    const publisher = result.schemas.find(s => 
      s.path.length === 1 && s.path[0] === 'publisher'
    );
    expect(publisher).toBeDefined();
    expect(publisher!.depth).toBe(1);

    const founder = result.schemas.find(s => 
      s.path.length === 2 && s.path[0] === 'publisher' && s.path[1] === 'founder'
    );
    expect(founder).toBeDefined();
    expect(founder!.depth).toBe(2);

    const company = result.schemas.find(s => 
      s.path.length === 3 && 
      s.path[0] === 'publisher' && 
      s.path[1] === 'founder' && 
      s.path[2] === 'worksFor'
    );
    expect(company).toBeDefined();
    expect(company!.depth).toBe(3);

    // Property: All types should be discoverable
    expect(result.types).toContain('WebSite');
    expect(result.types).toContain('Organization');
    expect(result.types).toContain('Person');
  });
});
