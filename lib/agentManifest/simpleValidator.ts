/**
 * Simple validator for LogosJSON without zod dependency
 * Minimal validation for serverless functions
 * 
 * @module lib/agentManifest/simpleValidator
 * @version 1.0.0
 */

import type { LogosJSON } from './types';

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { message: string; errors: Array<{ path: string; message: string }> } };

/**
 * Simple validation for LogosJSON manifest
 * Does basic structure checks without zod
 */
export function validateManifest(input: unknown): ValidationResult<LogosJSON> {
  const errors: Array<{ path: string; message: string }> = [];

  // Check if input is an object
  if (!input || typeof input !== 'object') {
    return {
      success: false,
      error: {
        message: 'Manifest validation failed',
        errors: [{ path: 'root', message: 'Input must be an object' }],
      },
    };
  }

  const manifest = input as any;

  // Validate $schema
  if (manifest.$schema !== 'https://anoteroslogos.com/schemas/logos-v1.json') {
    errors.push({ path: '$schema', message: 'Invalid schema URL' });
  }

  // Validate meta
  if (!manifest.meta || typeof manifest.meta !== 'object') {
    errors.push({ path: 'meta', message: 'Meta object is required' });
  } else {
    if (!manifest.meta.version) {
      errors.push({ path: 'meta.version', message: 'Version is required' });
    }
    if (!manifest.meta.updated) {
      errors.push({ path: 'meta.updated', message: 'Updated date is required' });
    }
    if (!manifest.meta.authority_level) {
      errors.push({ path: 'meta.authority_level', message: 'Authority level is required' });
    }
  }

  // Validate identity
  if (!manifest.identity || typeof manifest.identity !== 'object') {
    errors.push({ path: 'identity', message: 'Identity object is required' });
  } else {
    if (!manifest.identity.name) {
      errors.push({ path: 'identity.name', message: 'Name is required' });
    }
    if (!manifest.identity.description || manifest.identity.description.length < 10) {
      errors.push({ path: 'identity.description', message: 'Description must be at least 10 characters' });
    }
    if (!Array.isArray(manifest.identity.domain_focus) || manifest.identity.domain_focus.length === 0) {
      errors.push({ path: 'identity.domain_focus', message: 'At least one domain focus tag is required' });
    }
  }

  // Validate knowledge_topology
  if (!manifest.knowledge_topology || typeof manifest.knowledge_topology !== 'object') {
    errors.push({ path: 'knowledge_topology', message: 'Knowledge topology object is required' });
  } else {
    if (!Array.isArray(manifest.knowledge_topology.roots) || manifest.knowledge_topology.roots.length === 0) {
      errors.push({ path: 'knowledge_topology.roots', message: 'At least one knowledge root is required' });
    } else {
      manifest.knowledge_topology.roots.forEach((root: any, index: number) => {
        if (!root.url) {
          errors.push({ path: `knowledge_topology.roots[${index}].url`, message: 'URL is required' });
        }
        if (!root.semantic_role) {
          errors.push({ path: `knowledge_topology.roots[${index}].semantic_role`, message: 'Semantic role is required' });
        }
        if (!root.instruction || root.instruction.length < 10) {
          errors.push({ path: `knowledge_topology.roots[${index}].instruction`, message: 'Instruction must be at least 10 characters' });
        }
      });
    }
  }

  // Validate directives
  if (!manifest.directives || typeof manifest.directives !== 'object') {
    errors.push({ path: 'directives', message: 'Directives object is required' });
  } else {
    if (!manifest.directives.crawling) {
      errors.push({ path: 'directives.crawling', message: 'Crawling policy is required' });
    }
    if (!manifest.directives.attribution) {
      errors.push({ path: 'directives.attribution', message: 'Attribution policy is required' });
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: {
        message: 'Manifest validation failed',
        errors,
      },
    };
  }

  return {
    success: true,
    data: manifest as LogosJSON,
  };
}

/**
 * Formats validation errors into a readable structure
 */
export function formatValidationError(error: { message: string; errors: Array<{ path: string; message: string }> }): {
  message: string;
  errors: Array<{ path: string; message: string }>;
} {
  return error;
}
