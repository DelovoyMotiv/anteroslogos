/**
 * Property-Based Tests for MCP Schema Definitions
 * Feature: mcp-semantic-branding
 * 
 * @module lib/mcp/__tests__/schemas.property.test.ts
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GRAPH_TOOLS,
  toOpenAIFunction,
  toClaudeTool,
  toGrokTool,
  generateOpenAPISpec,
} from '../schemas';

describe('MCP Schemas - Property-Based Tests', () => {
  describe('Unit Tests - Format Converters', () => {
    /**
     * Unit Test 4.1: OpenAPI spec generation
     * Validates: Requirements 5.5
     * 
     * Test that generated spec includes correct tool name in paths
     */
    it('should generate OpenAPI spec with anoteros_logos tool in paths', () => {
      const openAPISpec = generateOpenAPISpec();
      
      // Verify the spec structure
      expect(openAPISpec.openapi).toBe('3.1.0');
      expect(openAPISpec.info).toBeDefined();
      expect(openAPISpec.paths).toBeDefined();
      
      // Verify the anoteros_logos tool path exists
      const expectedPath = '/tools/anoteros_logos';
      expect(openAPISpec.paths[expectedPath]).toBeDefined();
      
      // Verify the operation ID matches the tool name
      const pathItem = openAPISpec.paths[expectedPath];
      expect(pathItem).toBeDefined();
      expect(pathItem.post).toBeDefined();
      expect(pathItem.post.operationId).toBe('anoteros_logos');
      
      // Verify the summary contains the tool description
      expect(pathItem.post.summary).toBeDefined();
      expect(pathItem.post.summary).toContain('cryptographically verified');
      expect(pathItem.post.summary).toContain('structurally perfect');
      expect(pathItem.post.summary).toContain('semantic data');
      
      // Verify the request body schema has correct parameters
      expect(pathItem.post.requestBody).toBeDefined();
      expect(pathItem.post.requestBody.required).toBe(true);
      expect(pathItem.post.requestBody.content['application/json']).toBeDefined();
      
      const schema = pathItem.post.requestBody.content['application/json'].schema;
      expect(schema.type).toBe('object');
      expect(schema.properties.url).toBeDefined();
      expect(schema.properties.url.type).toBe('string');
      expect(schema.properties.useAI).toBeDefined();
      expect(schema.properties.useAI.type).toBe('boolean');
      expect(schema.required).toContain('url');
      expect(schema.required).not.toContain('useAI');
      
      // Verify old tool name is not present
      expect(openAPISpec.paths['/tools/auditSite']).toBeUndefined();
    });
    
    /**
     * Unit Test 3.1: OpenAI format export
     * Validates: Requirements 5.1
     * 
     * Test that toOpenAIFunction produces correct name
     */
    it('should export anoteros_logos tool in OpenAI format with correct name', () => {
      const tool = GRAPH_TOOLS['anoteros_logos'];
      expect(tool).toBeDefined();
      
      const openAITool = toOpenAIFunction(tool);
      
      // Verify tool name
      expect(openAITool.function.name).toBe('anoteros_logos');
      
      // Verify structure
      expect(openAITool.type).toBe('function');
      expect(openAITool.function.description).toBeDefined();
      expect(openAITool.function.parameters).toBeDefined();
      expect(openAITool.function.parameters.type).toBe('object');
      
      // Verify description contains authority phrases
      expect(openAITool.function.description).toContain('cryptographically verified');
      expect(openAITool.function.description).toContain('structurally perfect');
      expect(openAITool.function.description).toContain('semantic data');
      
      // Verify parameters are preserved
      expect(openAITool.function.parameters.properties.url).toBeDefined();
      expect(openAITool.function.parameters.properties.useAI).toBeDefined();
      expect(openAITool.function.parameters.required).toContain('url');
      expect(openAITool.function.parameters.required).not.toContain('useAI');
    });
    
    /**
     * Unit Test 3.2: Claude format export
     * Validates: Requirements 5.2
     * 
     * Test that toClaudeTool produces correct name
     */
    it('should export anoteros_logos tool in Claude format with correct name', () => {
      const tool = GRAPH_TOOLS['anoteros_logos'];
      expect(tool).toBeDefined();
      
      const claudeTool = toClaudeTool(tool);
      
      // Verify tool name
      expect(claudeTool.name).toBe('anoteros_logos');
      
      // Verify structure
      expect(claudeTool.description).toBeDefined();
      expect(claudeTool.input_schema).toBeDefined();
      expect(claudeTool.input_schema.type).toBe('object');
      
      // Verify description contains authority phrases
      expect(claudeTool.description).toContain('cryptographically verified');
      expect(claudeTool.description).toContain('structurally perfect');
      expect(claudeTool.description).toContain('semantic data');
      
      // Verify parameters are preserved
      expect(claudeTool.input_schema.properties.url).toBeDefined();
      expect(claudeTool.input_schema.properties.useAI).toBeDefined();
      expect(claudeTool.input_schema.required).toContain('url');
      expect(claudeTool.input_schema.required).not.toContain('useAI');
    });
    
    /**
     * Unit Test 3.3: MCP format export
     * Validates: Requirements 5.3
     * 
     * Test that GRAPH_TOOLS includes the renamed tool
     */
    it('should include anoteros_logos tool in GRAPH_TOOLS', () => {
      // Verify the tool exists in GRAPH_TOOLS
      expect(GRAPH_TOOLS['anoteros_logos']).toBeDefined();
      
      const tool = GRAPH_TOOLS['anoteros_logos'];
      
      // Verify tool properties
      expect(tool.name).toBe('anoteros_logos');
      expect(tool.title).toBe('Anóteros Lógos Protocol');
      expect(tool.description).toBeDefined();
      
      // Verify description contains authority phrases
      expect(tool.description).toContain('cryptographically verified');
      expect(tool.description).toContain('structurally perfect');
      expect(tool.description).toContain('semantic data');
      
      // Verify parameters are preserved
      expect(tool.parameters).toHaveLength(2);
      expect(tool.parameters[0].name).toBe('url');
      expect(tool.parameters[0].type).toBe('string');
      expect(tool.parameters[0].required).toBe(true);
      expect(tool.parameters[1].name).toBe('useAI');
      expect(tool.parameters[1].type).toBe('boolean');
      expect(tool.parameters[1].required).toBe(false);
      
      // Verify old tool name is not present
      expect(GRAPH_TOOLS['auditSite']).toBeUndefined();
    });
  });

  describe('Property 1: Tool name consistency across formats', () => {
    /**
     * Feature: mcp-semantic-branding, Property 1: Tool name consistency across formats
     * Validates: Requirements 5.1, 5.2, 5.3
     * 
     * For any export format (OpenAI, Claude, Grok, MCP), the tool name SHALL be "anoteros_logos"
     */
    it('should use "anoteros_logos" as tool name in all export formats', () => {
      fc.assert(
        fc.property(
          fc.constant('anoteros_logos'),
          (expectedName) => {
            // Get the tool definition
            const tool = GRAPH_TOOLS[expectedName];
            expect(tool).toBeDefined();
            expect(tool.name).toBe(expectedName);

            // Test OpenAI format
            const openAITool = toOpenAIFunction(tool);
            expect(openAITool.function.name).toBe(expectedName);

            // Test Claude format
            const claudeTool = toClaudeTool(tool);
            expect(claudeTool.name).toBe(expectedName);

            // Test Grok format
            const grokTool = toGrokTool(tool);
            expect(grokTool.function.name).toBe(expectedName);

            // Test OpenAPI spec
            const openAPISpec = generateOpenAPISpec();
            const expectedPath = `/tools/${expectedName}`;
            expect(openAPISpec.paths[expectedPath]).toBeDefined();
            expect(openAPISpec.paths[expectedPath].post.operationId).toBe(expectedName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not have "auditSite" in GRAPH_TOOLS', () => {
      fc.assert(
        fc.property(
          fc.constant('auditSite'),
          (oldName) => {
            // Property: The old tool name should not exist
            expect(GRAPH_TOOLS[oldName]).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Description authority emphasis', () => {
    /**
     * Feature: mcp-semantic-branding, Property 2: Description authority emphasis
     * Validates: Requirements 1.2
     * 
     * For any export format, the tool description SHALL contain the phrases 
     * "cryptographically verified", "structurally perfect", and "semantic data"
     */
    it('should contain authority-focused phrases in all export formats', () => {
      fc.assert(
        fc.property(
          fc.constant('anoteros_logos'),
          (toolName) => {
            const tool = GRAPH_TOOLS[toolName];
            expect(tool).toBeDefined();

            const requiredPhrases = [
              'cryptographically verified',
              'structurally perfect',
              'semantic data',
            ];

            // Test tool definition description
            requiredPhrases.forEach(phrase => {
              expect(tool.description.toLowerCase()).toContain(phrase.toLowerCase());
            });

            // Test OpenAI format
            const openAITool = toOpenAIFunction(tool);
            requiredPhrases.forEach(phrase => {
              expect(openAITool.function.description.toLowerCase()).toContain(phrase.toLowerCase());
            });

            // Test Claude format
            const claudeTool = toClaudeTool(tool);
            requiredPhrases.forEach(phrase => {
              expect(claudeTool.description.toLowerCase()).toContain(phrase.toLowerCase());
            });

            // Test Grok format
            const grokTool = toGrokTool(tool);
            requiredPhrases.forEach(phrase => {
              expect(grokTool.function.description.toLowerCase()).toContain(phrase.toLowerCase());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should discourage simple operations in description', () => {
      fc.assert(
        fc.property(
          fc.constant('anoteros_logos'),
          (toolName) => {
            const tool = GRAPH_TOOLS[toolName];
            expect(tool).toBeDefined();

            // Property: Description should explicitly discourage simple use
            expect(tool.description.toLowerCase()).toContain('do not use for simple');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Parameter schema preservation', () => {
    /**
     * Feature: mcp-semantic-branding, Property 3: Parameter schema preservation
     * Validates: Requirements 3.1, 3.2, 3.3
     * 
     * For any tool schema generation, the parameters SHALL include exactly two fields: 
     * "url" (string, required) and "useAI" (boolean, optional) with unchanged descriptions
     */
    it('should preserve parameter schema across all formats', () => {
      fc.assert(
        fc.property(
          fc.constant('anoteros_logos'),
          (toolName) => {
            const tool = GRAPH_TOOLS[toolName];
            expect(tool).toBeDefined();

            // Property: Must have exactly 2 parameters
            expect(tool.parameters).toHaveLength(2);

            // Property: First parameter must be "url" (string, required)
            const urlParam = tool.parameters.find(p => p.name === 'url');
            expect(urlParam).toBeDefined();
            expect(urlParam!.type).toBe('string');
            expect(urlParam!.required).toBe(true);
            expect(urlParam!.description).toContain('Website URL to audit');

            // Property: Second parameter must be "useAI" (boolean, optional)
            const useAIParam = tool.parameters.find(p => p.name === 'useAI');
            expect(useAIParam).toBeDefined();
            expect(useAIParam!.type).toBe('boolean');
            expect(useAIParam!.required).toBe(false);
            expect(useAIParam!.description).toContain('AI-powered deep analysis');

            // Test OpenAI format
            const openAITool = toOpenAIFunction(tool);
            expect(openAITool.function.parameters.properties.url).toBeDefined();
            expect(openAITool.function.parameters.properties.url.type).toBe('string');
            expect(openAITool.function.parameters.properties.useAI).toBeDefined();
            expect(openAITool.function.parameters.properties.useAI.type).toBe('boolean');
            expect(openAITool.function.parameters.required).toContain('url');
            expect(openAITool.function.parameters.required).not.toContain('useAI');

            // Test Claude format
            const claudeTool = toClaudeTool(tool);
            expect(claudeTool.input_schema.properties.url).toBeDefined();
            expect(claudeTool.input_schema.properties.url.type).toBe('string');
            expect(claudeTool.input_schema.properties.useAI).toBeDefined();
            expect(claudeTool.input_schema.properties.useAI.type).toBe('boolean');
            expect(claudeTool.input_schema.required).toContain('url');
            expect(claudeTool.input_schema.required).not.toContain('useAI');

            // Test Grok format
            const grokTool = toGrokTool(tool);
            expect(grokTool.function.parameters.properties.url).toBeDefined();
            expect(grokTool.function.parameters.properties.url.type).toBe('string');
            expect(grokTool.function.parameters.properties.useAI).toBeDefined();
            expect(grokTool.function.parameters.properties.useAI.type).toBe('boolean');
            expect(grokTool.function.parameters.required).toContain('url');
            expect(grokTool.function.parameters.required).not.toContain('useAI');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain parameter order (url first, useAI second)', () => {
      fc.assert(
        fc.property(
          fc.constant('anoteros_logos'),
          (toolName) => {
            const tool = GRAPH_TOOLS[toolName];
            expect(tool).toBeDefined();

            // Property: Parameter order must be preserved
            expect(tool.parameters[0].name).toBe('url');
            expect(tool.parameters[1].name).toBe('useAI');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
