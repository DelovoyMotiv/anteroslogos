/**
 * Manifest generation service for Agent Manifest Generator
 * Core logic for generating agents.json using LLM
 * 
 * @module lib/agentManifest/generator
 * @version 2.0.0
 */

import { ManifestGeneratorOrchestrator } from './orchestrator';
import { ManifestGenerationError as OrchestratorError, ErrorCode } from './errors';
import type { AgentsJSON } from './types';

/**
 * Error thrown when manifest generation fails
 * Maintained for backward compatibility with existing code
 */
export class ManifestGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ManifestGenerationError';
  }
}

/**
 * Error thrown when LLM returns invalid JSON
 * Maintained for backward compatibility with existing code
 */
export class InvalidJSONError extends ManifestGenerationError {
  constructor(
    message: string,
    public readonly rawResponse: string
  ) {
    super(message);
    this.name = 'InvalidJSONError';
  }
}

/**
 * Error thrown when manifest fails schema validation
 * Maintained for backward compatibility with existing code
 */
export class SchemaValidationError extends ManifestGenerationError {
  constructor(
    message: string,
    public readonly validationErrors: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Generates an agents.json manifest for a given URL using LLM
 * 
 * This function now delegates to ManifestGeneratorOrchestrator which:
 * 1. Scrapes actual HTML content from the URL
 * 2. Validates content meets minimum quality thresholds
 * 3. Passes scraped content to LLM with strict "no inference" constraints
 * 4. Validates generated manifest comprehensively
 * 5. Returns the validated manifest
 * 
 * Error handling maintains backward compatibility by wrapping orchestrator errors
 * into the legacy error types (ManifestGenerationError, InvalidJSONError, SchemaValidationError)
 * 
 * @param url - The website URL to generate manifest for
 * @returns Promise resolving to validated AgentsJSON manifest
 * @throws ManifestGenerationError if generation fails
 * @throws InvalidJSONError if LLM returns invalid JSON
 * @throws SchemaValidationError if manifest fails validation
 * 
 * @example
 * ```typescript
 * try {
 *   const manifest = await generateManifest('https://example.com');
 *   console.log('Generated manifest:', manifest);
 * } catch (error) {
 *   if (error instanceof SchemaValidationError) {
 *     console.error('Validation errors:', error.validationErrors);
 *   } else if (error instanceof InvalidJSONError) {
 *     console.error('Invalid JSON:', error.rawResponse);
 *   } else {
 *     console.error('Generation failed:', error.message);
 *   }
 * }
 * ```
 */
export async function generateManifest(url: string): Promise<AgentsJSON> {
  // Create orchestrator instance
  const orchestrator = new ManifestGeneratorOrchestrator();
  
  try {
    // Delegate to orchestrator
    const manifest = await orchestrator.generate(url);
    
    // Cleanup resources
    await orchestrator.cleanup();
    
    return manifest;
    
  } catch (error) {
    // Cleanup resources on error
    try {
      await orchestrator.cleanup();
    } catch (cleanupError) {
      // Ignore cleanup errors
      console.error('[generateManifest] Cleanup failed:', cleanupError);
    }
    
    // Wrap orchestrator errors for backward compatibility
    if (error instanceof OrchestratorError) {
      // Map orchestrator error codes to legacy error types
      switch (error.code) {
        case ErrorCode.INVALID_JSON:
          // Extract raw response from details if available
          const rawResponse = error.details?.rawResponse as string || 'Unable to retrieve raw response';
          throw new InvalidJSONError(
            error.message,
            rawResponse
          );
        
        case ErrorCode.VALIDATION_FAILED:
          // Extract validation errors from details
          const validationErrors = error.details?.validationErrors as Array<{ path: string; message: string }> || [];
          throw new SchemaValidationError(
            error.message,
            validationErrors
          );
        
        default:
          // Wrap all other orchestrator errors as ManifestGenerationError
          throw new ManifestGenerationError(
            error.message,
            error.cause
          );
      }
    }
    
    // Re-throw legacy errors as-is
    if (error instanceof ManifestGenerationError) {
      throw error;
    }
    
    // Wrap unknown errors
    throw new ManifestGenerationError(
      'Failed to generate manifest',
      error
    );
  }
}
