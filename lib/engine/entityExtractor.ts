/**
 * Entity Extractor for Agent Middleware
 * Identifies, normalizes, and structures semantic entities from parsed HTML
 */

import { ulid } from 'ulid';
import type {
  Entity,
  Relationship,
  SchemaMarkupData,
} from '../../types/agent-middleware.types';

/**
 * Raw entity data before normalization
 */
interface RawEntity {
  type?: string;
  name?: string;
  properties?: Record<string, unknown>;
  source: 'schema' | 'content' | 'inferred';
  url?: string;
  image?: string;
  description?: string;
}

/**
 * EntityExtractor class
 * Service for extracting and normalizing semantic entities
 */
export class EntityExtractor {
  /**
   * Extracts entities from HTML and schema markup
   * 
   * @param html - HTML content to analyze
   * @param schemaData - Parsed schema markup data
   * @returns Array of normalized entities
   */
  extractEntities(html: string, schemaData: SchemaMarkupData): Entity[] {
    const entities: Entity[] = [];
    
    // Extract entities from schema markup
    const schemaEntities = this.extractFromSchema(schemaData);
    entities.push(...schemaEntities);
    
    // Extract entities from HTML content (if needed for deep mode)
    const contentEntities = this.extractFromContent(html);
    entities.push(...contentEntities);
    
    return entities;
  }

  /**
   * Extracts entities from schema markup
   * 
   * @param schemaData - Schema markup data
   * @returns Array of entities from schema
   */
  private extractFromSchema(schemaData: SchemaMarkupData): Entity[] {
    const entities: Entity[] = [];
    
    for (const schema of schemaData.data) {
      const rawEntity = this.parseSchemaObject(schema);
      if (rawEntity) {
        const normalized = this.normalizeEntity(rawEntity);
        entities.push(normalized);
      }
    }
    
    return entities;
  }

  /**
   * Parses a schema object into a raw entity
   * 
   * @param schema - Schema.org object
   * @returns Raw entity or null if invalid
   */
  private parseSchemaObject(schema: Record<string, unknown>): RawEntity | null {
    // Extract @type
    const type = schema['@type'];
    if (!type) {
      return null;
    }
    
    const typeStr = Array.isArray(type) ? type[0] : String(type);
    
    // Extract name (try multiple fields)
    const name = this.extractName(schema);
    if (!name) {
      return null;
    }
    
    // Extract other properties
    const url = this.extractUrl(schema);
    const image = this.extractImage(schema);
    const description = this.extractDescription(schema);
    
    // Copy all properties
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (!key.startsWith('@')) {
        properties[key] = value;
      }
    }
    
    return {
      type: typeStr,
      name,
      properties,
      source: 'schema',
      url,
      image,
      description,
    };
  }

  /**
   * Extracts name from schema object
   */
  private extractName(schema: Record<string, unknown>): string | undefined {
    // Try common name fields
    const nameFields = ['name', 'title', 'headline', 'alternateName'];
    
    for (const field of nameFields) {
      const value = schema[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    
    return undefined;
  }

  /**
   * Extracts URL from schema object
   */
  private extractUrl(schema: Record<string, unknown>): string | undefined {
    const urlFields = ['url', '@id', 'sameAs', 'mainEntityOfPage'];
    
    for (const field of urlFields) {
      const value = schema[field];
      if (typeof value === 'string' && this.isValidUrl(value)) {
        return value;
      }
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        return value[0];
      }
    }
    
    return undefined;
  }

  /**
   * Extracts image URL from schema object
   */
  private extractImage(schema: Record<string, unknown>): string | undefined {
    const imageField = schema['image'];
    
    if (typeof imageField === 'string' && this.isValidUrl(imageField)) {
      return imageField;
    }
    
    if (typeof imageField === 'object' && imageField !== null) {
      const imageObj = imageField as Record<string, unknown>;
      const url = imageObj['url'];
      if (typeof url === 'string' && this.isValidUrl(url)) {
        return url;
      }
    }
    
    if (Array.isArray(imageField) && imageField.length > 0) {
      const first = imageField[0];
      if (typeof first === 'string' && this.isValidUrl(first)) {
        return first;
      }
      if (typeof first === 'object' && first !== null) {
        const url = (first as Record<string, unknown>)['url'];
        if (typeof url === 'string' && this.isValidUrl(url)) {
          return url;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extracts description from schema object
   */
  private extractDescription(schema: Record<string, unknown>): string | undefined {
    const descFields = ['description', 'abstract', 'summary'];
    
    for (const field of descFields) {
      const value = schema[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    
    return undefined;
  }

  /**
   * Validates if a string is a valid URL
   */
  private isValidUrl(str: string): boolean {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Extracts entities from HTML content
   * 
   * @param _html - HTML content (unused for now)
   * @returns Array of entities from content
   */
  private extractFromContent(_html: string): Entity[] {
    // Parameter _html is reserved for future NLP/pattern matching implementation
    // For now, return empty array
    // This can be enhanced with NLP or pattern matching in the future
    return [];
  }

  /**
   * Normalizes a raw entity to standard format
   * Ensures all required fields are present
   * 
   * @param entity - Raw entity data
   * @returns Normalized entity with all required fields
   */
  normalizeEntity(entity: RawEntity): Entity {
    // Generate ULID for entity ID
    const id = ulid();
    
    // Ensure type is present (default to 'Thing' if missing)
    const type = entity.type || 'Thing';
    
    // Ensure name is present (use type as fallback)
    const name = entity.name || type;
    
    // Calculate confidence score based on data source quality
    const confidence = this.calculateConfidence(entity);
    
    // Ensure properties is an object
    const properties = entity.properties || {};
    
    return {
      id,
      type,
      name,
      properties,
      confidence,
      source: entity.source,
      url: entity.url,
      image: entity.image,
      description: entity.description,
    };
  }

  /**
   * Calculates confidence score based on data source quality
   * 
   * @param entity - Raw entity data
   * @returns Confidence score between 0 and 1
   */
  calculateConfidence(entity: RawEntity): number {
    let confidence = 0;
    
    // Base confidence by source
    switch (entity.source) {
      case 'schema':
        confidence = 0.9; // High confidence for schema markup
        break;
      case 'content':
        confidence = 0.6; // Medium confidence for content extraction
        break;
      case 'inferred':
        confidence = 0.4; // Lower confidence for inferred entities
        break;
    }
    
    // Boost confidence if entity has more complete data
    let completeness = 0;
    if (entity.name) completeness += 0.02;
    if (entity.type) completeness += 0.02;
    if (entity.url) completeness += 0.02;
    if (entity.image) completeness += 0.02;
    if (entity.description) completeness += 0.02;
    
    confidence = Math.min(1.0, confidence + completeness);
    
    return confidence;
  }

  /**
   * Builds relationships between entities
   * 
   * @param entities - Array of entities
   * @returns Array of relationships
   */
  buildRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Build relationships from entity properties
    for (const entity of entities) {
      const entityRelationships = this.extractRelationshipsFromEntity(entity, entities);
      relationships.push(...entityRelationships);
    }
    
    return relationships;
  }

  /**
   * Extracts relationships from a single entity
   * 
   * @param entity - Source entity
   * @param allEntities - All available entities
   * @returns Array of relationships
   */
  private extractRelationshipsFromEntity(entity: Entity, allEntities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Common relationship properties in Schema.org
    const relationshipFields = [
      'author',
      'creator',
      'publisher',
      'provider',
      'manufacturer',
      'brand',
      'offers',
      'member',
      'employee',
      'founder',
      'parent',
      'children',
      'sibling',
      'spouse',
      'knows',
      'owns',
      'worksFor',
      'alumniOf',
      'memberOf',
      'affiliation',
    ];
    
    for (const field of relationshipFields) {
      const value = entity.properties[field];
      
      if (!value) continue;
      
      // Handle object references
      if (typeof value === 'object' && value !== null) {
        const targetEntity = this.findOrCreateEntity(value as Record<string, unknown>, allEntities);
        if (targetEntity) {
          relationships.push({
            source: entity.id,
            target: targetEntity.id,
            type: field,
            confidence: Math.min(entity.confidence, targetEntity.confidence),
          });
        }
      }
      
      // Handle array of references
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const targetEntity = this.findOrCreateEntity(item as Record<string, unknown>, allEntities);
            if (targetEntity) {
              relationships.push({
                source: entity.id,
                target: targetEntity.id,
                type: field,
                confidence: Math.min(entity.confidence, targetEntity.confidence),
              });
            }
          }
        }
      }
    }
    
    return relationships;
  }

  /**
   * Finds an existing entity or creates a new one from a reference
   * 
   * @param ref - Reference object
   * @param entities - Existing entities
   * @returns Found or created entity, or null
   */
  private findOrCreateEntity(ref: Record<string, unknown>, entities: Entity[]): Entity | null {
    // Try to find by URL or @id
    const refUrl = ref['url'] || ref['@id'];
    if (typeof refUrl === 'string') {
      const found = entities.find(e => e.url === refUrl);
      if (found) return found;
    }
    
    // Try to find by name
    const refName = ref['name'];
    if (typeof refName === 'string') {
      const found = entities.find(e => e.name === refName);
      if (found) return found;
    }
    
    // Create new entity from reference
    const rawEntity: RawEntity = {
      type: typeof ref['@type'] === 'string' ? ref['@type'] : 'Thing',
      name: typeof ref['name'] === 'string' ? ref['name'] : undefined,
      properties: ref,
      source: 'inferred',
      url: typeof refUrl === 'string' ? refUrl : undefined,
    };
    
    // Only create if we have a name
    if (!rawEntity.name) {
      return null;
    }
    
    return this.normalizeEntity(rawEntity);
  }
}

/**
 * Creates a new EntityExtractor instance
 */
export function createEntityExtractor(): EntityExtractor {
  return new EntityExtractor();
}
