/**
 * Simple validator for AgentsJSON without zod dependency
 * Minimal validation for serverless functions
 * 
 * @module lib/agentManifest/simpleValidator
 * @version 1.0.0
 */

import type { AgentsJSON } from './types';

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { message: string; errors: Array<{ path: string; message: string }> } };

/**
 * Simple validation for AgentsJSON manifest
 * Does basic structure checks without zod
 */
export function validateManifest(input: unknown): ValidationResult<AgentsJSON> {
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
  if (manifest.$schema !== 'https://anoteroslogos.com/schemas/agents-v1.json') {
    errors.push({ path: '$schema', message: 'Invalid schema URL' });
  }

  // Validate version
  if (manifest.version !== '1.0') {
    errors.push({ path: 'version', message: 'Version must be "1.0"' });
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
    if (!Array.isArray(manifest.identity.tags) || manifest.identity.tags.length === 0) {
      errors.push({ path: 'identity.tags', message: 'At least one tag is required' });
    }
  }

  // Validate knowledge
  if (!Array.isArray(manifest.knowledge) || manifest.knowledge.length === 0) {
    errors.push({ path: 'knowledge', message: 'At least one knowledge entry is required' });
  } else {
    const validRoles = ['documentation', 'pricing', 'about', 'product', 'contact', 'support'];
    manifest.knowledge.forEach((entry: any, index: number) => {
      if (!entry.role) {
        errors.push({ path: `knowledge[${index}].role`, message: 'Role is required' });
      } else if (!validRoles.includes(entry.role)) {
        errors.push({ path: `knowledge[${index}].role`, message: `Role must be one of: ${validRoles.join(', ')}` });
      }
      if (!entry.url) {
        errors.push({ path: `knowledge[${index}].url`, message: 'URL is required' });
      }
      if (!entry.description || entry.description.length < 5) {
        errors.push({ path: `knowledge[${index}].description`, message: 'Description must be at least 5 characters' });
      }
    });
  }

  // Validate actions (can be empty array)
  if (!Array.isArray(manifest.actions)) {
    errors.push({ path: 'actions', message: 'Actions must be an array' });
  } else if (manifest.actions.length > 0) {
    const validTypes = ['GET', 'POST', 'PUT', 'DELETE'];
    manifest.actions.forEach((action: any, index: number) => {
      if (!action.name) {
        errors.push({ path: `actions[${index}].name`, message: 'Action name is required' });
      }
      if (!action.type) {
        errors.push({ path: `actions[${index}].type`, message: 'Action type is required' });
      } else if (!validTypes.includes(action.type)) {
        errors.push({ path: `actions[${index}].type`, message: `Type must be one of: ${validTypes.join(', ')}` });
      }
      if (!action.path) {
        errors.push({ path: `actions[${index}].path`, message: 'Action path is required' });
      }
    });
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
    data: manifest as AgentsJSON,
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
