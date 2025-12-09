/**
 * Semantic Serializer for Agent Middleware
 * Converts entities and relationships into token-efficient formats
 */

import type {
  Entity,
  Relationship,
  SerializableData,
  JsonLdDocument,
  CompactKnowledgeGraph,
} from '../../types/agent-middleware.types';

/**
 * SemanticSerializer class
 * Service for converting entities to token-efficient formats
 */
export class SemanticSerializer {
  /**
   * Converts data to schema-separated columnar format
   * This format reduces token usage by separating field names from values
   * 
   * @param data - Data to serialize
   * @returns Compact JSON with schema and data arrays
   */
  toCompactJson(data: SerializableData): CompactKnowledgeGraph {
    // Normalize keys to reduce redundancy
    const normalizedEntities = data.entities.map(e => this.normalizeEntityKeys(e));
    
    // Extract unique schema from all entities
    const entitySchema = this.extractSchema(normalizedEntities);
    
    // Convert entities to columnar format
    const entityData = normalizedEntities.map(entity => 
      this.entityToRow(entity, entitySchema)
    );
    
    // Convert relationships to triplet format
    const relationSchema = ['source', 'target', 'type', 'confidence'];
    const relationData = data.relationships.map(rel => 
      this.relationshipToTriplet(rel)
    );
    
    return {
      schema: entitySchema,
      entities: entityData,
      relations: {
        schema: relationSchema,
        data: relationData,
      },
    };
  }

  /**
   * Converts data to standard JSON-LD format
   * 
   * @param data - Data to serialize
   * @returns JSON-LD document
   */
  toJsonLd(data: SerializableData): JsonLdDocument {
    // Create JSON-LD context
    const context = {
      '@vocab': 'http://schema.org/',
      'entities': '@graph',
    };
    
    // Convert entities to JSON-LD format
    const graph = data.entities.map(entity => this.entityToJsonLd(entity));
    
    return {
      '@context': context,
      '@type': 'Dataset',
      entities: graph,
      relationships: data.relationships.map(rel => ({
        '@type': 'Relationship',
        source: rel.source,
        target: rel.target,
        relationType: rel.type,
        confidence: rel.confidence,
      })),
    };
  }

  /**
   * Normalizes entity keys to reduce redundancy
   * Standardizes common field variations
   * 
   * @param entity - Entity to normalize
   * @returns Entity with normalized keys
   */
  private normalizeEntityKeys(entity: Entity): Entity {
    const normalized = { ...entity };
    const normalizedProps: Record<string, unknown> = {};
    
    // Normalize property keys
    for (const [key, value] of Object.entries(entity.properties)) {
      const normalizedKey = this.normalizeKey(key);
      normalizedProps[normalizedKey] = value;
    }
    
    normalized.properties = normalizedProps;
    return normalized;
  }

  /**
   * Normalizes a single key
   * Converts variations to standard form
   * 
   * @param key - Key to normalize
   * @returns Normalized key
   */
  normalizeKey(key: string): string {
    // Convert to lowercase
    let normalized = key.toLowerCase();
    
    // Remove common prefixes
    normalized = normalized.replace(/^(og:|twitter:|schema:)/, '');
    
    // Standardize common variations
    const keyMappings: Record<string, string> = {
      'img': 'image',
      'pic': 'image',
      'photo': 'image',
      'desc': 'description',
      'summary': 'description',
      'link': 'url',
      'href': 'url',
      'webpage': 'url',
      'title': 'name',
      'heading': 'name',
    };
    
    return keyMappings[normalized] || normalized;
  }

  /**
   * Extracts unique schema from entities
   * Creates ordered list of all unique field names
   * 
   * @param entities - Entities to analyze
   * @returns Array of unique field names
   */
  private extractSchema(entities: Entity[]): string[] {
    const fieldSet = new Set<string>();
    
    // Core entity fields (always included in order)
    const coreFields = ['id', 'type', 'name', 'confidence', 'source'];
    coreFields.forEach(f => fieldSet.add(f));
    
    // Optional entity fields
    const optionalFields = ['url', 'image', 'description'];
    
    // Check if any entity has these optional fields
    for (const entity of entities) {
      for (const field of optionalFields) {
        if (entity[field as keyof Entity] !== undefined) {
          fieldSet.add(field);
        }
      }
      
      // Add property keys
      for (const key of Object.keys(entity.properties)) {
        fieldSet.add(`prop_${key}`);
      }
    }
    
    return Array.from(fieldSet);
  }

  /**
   * Converts entity to row format based on schema
   * 
   * @param entity - Entity to convert
   * @param schema - Schema defining field order
   * @returns Array of values matching schema order
   */
  private entityToRow(entity: Entity, schema: string[]): unknown[] {
    return schema.map(field => {
      // Handle core fields
      if (field === 'id') return entity.id;
      if (field === 'type') return entity.type;
      if (field === 'name') return entity.name;
      if (field === 'confidence') return entity.confidence;
      if (field === 'source') return entity.source;
      if (field === 'url') return entity.url || null;
      if (field === 'image') return entity.image || null;
      if (field === 'description') return entity.description || null;
      
      // Handle property fields
      if (field.startsWith('prop_')) {
        const propKey = field.substring(5);
        return entity.properties[propKey] ?? null;
      }
      
      return null;
    });
  }

  /**
   * Converts relationship to compact triplet format
   * 
   * @param relationship - Relationship to convert
   * @returns Array [source, target, type, confidence]
   */
  private relationshipToTriplet(relationship: Relationship): unknown[] {
    return [
      relationship.source,
      relationship.target,
      relationship.type,
      relationship.confidence,
    ];
  }

  /**
   * Converts entity to JSON-LD format
   * 
   * @param entity - Entity to convert
   * @returns JSON-LD object
   */
  private entityToJsonLd(entity: Entity): JsonLdDocument {
    const jsonLd: JsonLdDocument = {
      '@context': 'http://schema.org/',
      '@type': entity.type,
      '@id': entity.id,
      name: entity.name,
      confidence: entity.confidence,
    };
    
    // Add optional fields
    if (entity.url) jsonLd.url = entity.url;
    if (entity.image) jsonLd.image = entity.image;
    if (entity.description) jsonLd.description = entity.description;
    
    // Add properties
    for (const [key, value] of Object.entries(entity.properties)) {
      if (value !== undefined && value !== null) {
        jsonLd[key] = value;
      }
    }
    
    return jsonLd;
  }

  /**
   * Calculates token savings compared to raw format
   * Estimates compression ratio of compact format vs verbose format
   * 
   * @param original - Original data size (in tokens or characters)
   * @param compressed - Compressed data size (in tokens or characters)
   * @returns Token savings as percentage (0-100)
   */
  calculateTokenSavings(original: number, compressed: number): number {
    if (original === 0) return 0;
    
    const savings = ((original - compressed) / original) * 100;
    return Math.max(0, Math.min(100, savings));
  }

  /**
   * Estimates token count for a string
   * Uses rough approximation: 1 token ≈ 4 characters
   * 
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculates token cost for serialized data
   * 
   * @param data - Serializable data
   * @param format - Output format ('compact' or 'json-ld')
   * @returns Estimated token count
   */
  calculateTokenCost(data: SerializableData, format: 'compact' | 'json-ld'): number {
    let serialized: string;
    
    if (format === 'compact') {
      const compact = this.toCompactJson(data);
      serialized = JSON.stringify(compact);
    } else {
      const jsonLd = this.toJsonLd(data);
      serialized = JSON.stringify(jsonLd);
    }
    
    return this.estimateTokens(serialized);
  }
}

/**
 * Creates a new SemanticSerializer instance
 */
export function createSemanticSerializer(): SemanticSerializer {
  return new SemanticSerializer();
}
