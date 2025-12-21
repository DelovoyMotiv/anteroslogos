/**
 * Manifest generation service for Agent Manifest Generator
 * Core logic for generating logos.json using LLM
 * 
 * @module lib/agentManifest/generator
 * @version 1.0.0
 */

import { createSimpleOpenRouterClient, type ChatMessage } from './openRouterClient';
import { buildSystemPrompt, buildUserPrompt } from './prompts';
import { validateManifest, formatValidationError, type ValidationResult } from './simpleValidator';
import type { LogosJSON } from './types';

/**
 * Error thrown when manifest generation fails
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
 * Parses the LLM response and extracts JSON
 * Handles cases where LLM returns markdown-wrapped JSON
 * 
 * @param response - Raw LLM response
 * @returns Parsed JSON object
 * @throws InvalidJSONError if response cannot be parsed
 */
function parseManifestResponse(response: string): unknown {
  let jsonString = response.trim();
  
  // Remove markdown code blocks if present
  if (jsonString.startsWith('```')) {
    // Extract content between ```json and ``` or ``` and ```
    const match = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match && match[1]) {
      jsonString = match[1].trim();
    }
  }
  
  // Try to parse JSON
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new InvalidJSONError(
      'Failed to parse LLM response as JSON',
      response
    );
  }
}

/**
 * Generates a logos.json manifest for a given URL using LLM
 * 
 * This function:
 * 1. Creates a simple OpenRouter client
 * 2. Builds system and user prompts
 * 3. Calls the LLM (Claude Sonnet 4.5)
 * 4. Parses and validates the JSON response
 * 5. Returns the validated manifest
 * 
 * @param url - The website URL to generate manifest for
 * @returns Promise resolving to validated LogosJSON manifest
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
 *   } else {
 *     console.error('Generation failed:', error.message);
 *   }
 * }
 * ```
 */
export async function generateManifest(url: string): Promise<LogosJSON> {
  // Create simple LLM client
  const client = createSimpleOpenRouterClient();
  
  if (!client) {
    throw new ManifestGenerationError(
      'AI service is not configured. Please ensure OPENROUTER_API_KEY is set.'
    );
  }
  
  try {
    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(url);
    
    // Prepare messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    
    // Call LLM with Claude Sonnet 4.5
    const response = await client.chat(messages, {
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    // Parse JSON response
    const parsedResponse = parseManifestResponse(response);
    
    // Validate against schema
    const validationResult = validateManifest(parsedResponse);
    
    if (validationResult.success) {
      return validationResult.data;
    }
    
    // Validation failed - TypeScript should narrow the type here
    // but we'll be explicit to help the compiler
    const failedResult = validationResult as Extract<ValidationResult<LogosJSON>, { success: false }>;
    const formattedError = formatValidationError(failedResult.error);
    throw new SchemaValidationError(
      formattedError.message,
      formattedError.errors
    );
    
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof ManifestGenerationError) {
      throw error;
    }
    
    // Wrap other errors
    throw new ManifestGenerationError(
      'Failed to generate manifest',
      error
    );
  }
}
