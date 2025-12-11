/**
 * SchemaValidator - Recursive JSON-LD Schema Extraction
 * 
 * Implements depth-first search (DFS) traversal to extract all schemas
 * from nested JSON-LD structures, including @graph arrays.
 */

export interface SchemaNode {
  type: string | string[];
  data: Record<string, unknown>;
  path: string[]; // Nesting path for debugging
  depth: number;
}

export interface SchemaError {
  message: string;
  path: string[];
  scriptIndex: number;
}

export interface SchemaExtractionResult {
  schemas: SchemaNode[];
  types: string[];
  hasGraph: boolean;
  errors: SchemaError[];
}

/**
 * SchemaValidator class
 * Recursively traverses and validates JSON-LD structures
 */
export class SchemaValidator {
  /**
   * Extracts all schemas from document using recursive DFS
   * @param doc - Parsed HTML document
   * @returns All discovered schemas with nesting information
   */
  extractSchemas(doc: Document): SchemaExtractionResult {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    const allSchemas: SchemaNode[] = [];
    const errors: SchemaError[] = [];
    let hasGraph = false;

    scripts.forEach((script, scriptIndex) => {
      try {
        const jsonContent = script.textContent || '{}';
        const parsed = JSON.parse(jsonContent);
        
        // Check if this script has @graph
        if (parsed && typeof parsed === 'object' && parsed['@graph']) {
          hasGraph = true;
        }
        
        // Traverse the structure recursively
        const schemas = this.traverseSchema(parsed, []);
        allSchemas.push(...schemas);
      } catch (error) {
        errors.push({
          message: error instanceof Error ? error.message : 'Failed to parse JSON-LD',
          path: [],
          scriptIndex,
        });
      }
    });

    // Extract unique types
    const types = new Set<string>();
    allSchemas.forEach(schema => {
      if (Array.isArray(schema.type)) {
        schema.type.forEach(t => types.add(t));
      } else {
        types.add(schema.type);
      }
    });

    return {
      schemas: allSchemas,
      types: Array.from(types),
      hasGraph,
      errors,
    };
  }

  /**
   * Recursively traverses a JSON-LD structure using depth-first search
   * @param node - Current node in the structure
   * @param path - Current path for debugging
   * @returns Flattened array of all schemas
   */
  traverseSchema(node: unknown, path: string[] = []): SchemaNode[] {
    const results: SchemaNode[] = [];
    
    // Base case: not an object
    if (!node || typeof node !== 'object') {
      return results;
    }
    
    const obj = node as Record<string, unknown>;
    
    // Check if this node has @type - if so, it's a schema
    if (obj['@type']) {
      results.push({
        type: obj['@type'] as string | string[],
        data: obj,
        path: [...path],
        depth: path.length,
      });
    }
    
    // Recursively traverse @graph arrays
    if (Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach((item, index) => {
        results.push(...this.traverseSchema(item, [...path, '@graph', String(index)]));
      });
    }
    
    // Recursively traverse all object properties
    for (const [key, value] of Object.entries(obj)) {
      // Skip @type and @graph as we've already handled them
      if (key === '@type' || key === '@graph') continue;
      
      if (Array.isArray(value)) {
        // Traverse each item in the array
        value.forEach((item, index) => {
          results.push(...this.traverseSchema(item, [...path, key, String(index)]));
        });
      } else if (typeof value === 'object' && value !== null) {
        // Traverse nested objects
        results.push(...this.traverseSchema(value, [...path, key]));
      }
    }
    
    return results;
  }

  /**
   * Checks if schemas contain a specific type
   * @param schemas - Array of schema nodes
   * @param type - Type to search for (e.g., 'Organization', 'WebSite')
   * @returns True if type is found at any depth
   */
  hasSchemaType(schemas: SchemaNode[], type: string): boolean {
    return schemas.some(schema => {
      if (Array.isArray(schema.type)) {
        return schema.type.includes(type);
      }
      return schema.type === type;
    });
  }

  /**
   * Filters schemas by type
   * @param schemas - Array of schema nodes
   * @param type - Type to filter by
   * @returns Schemas matching the type
   */
  getSchemasByType(schemas: SchemaNode[], type: string): SchemaNode[] {
    return schemas.filter(schema => {
      if (Array.isArray(schema.type)) {
        return schema.type.includes(type);
      }
      return schema.type === type;
    });
  }
}

/**
 * Creates a new SchemaValidator instance
 */
export function createSchemaValidator(): SchemaValidator {
  return new SchemaValidator();
}
