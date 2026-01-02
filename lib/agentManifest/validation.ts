/**
 * Validation services for Agent Manifest Generator
 * Provides liveness checks and content quality validation
 * 
 * @module lib/agentManifest/validation
 * @version 1.0.0
 */

import type { ScrapedContent } from './types';
import { ScrapeError } from './errors';
import { validateManifest } from './simpleValidator';

/**
 * LivenessValidator class
 * Validates that scraped content meets minimum quality thresholds
 */
export class LivenessValidator {
  /**
   * Validates scraped content quality
   * 
   * Validation Rules:
   * 1. HTML content length must be >= 500 characters
   * 2. Extracted text content must be >= 200 characters
   * 3. Title must be present and non-empty
   * 
   * @param content - Scraped content to validate
   * @throws ScrapeError if content fails validation
   */
  validate(content: ScrapedContent): void {
    const { url, title, metadata } = content;
    const { contentLength, textLength } = metadata;

    // Check if title is present and non-empty
    if (!title || title.trim() === '' || title === 'Untitled') {
      console.error(`[LivenessValidator] Validation failed for ${url}: No title found`);
      throw new ScrapeError(
        `No title found on the page. Unable to generate manifest.`,
        'NO_TEXT',
        {
          url,
          contentLength,
          textLength,
        }
      );
    }

    // Check HTML content length >= 500 characters
    if (contentLength < 500) {
      console.error(
        `[LivenessValidator] Validation failed for ${url}: ` +
        `HTML content too short (${contentLength} chars, minimum 500 required)`
      );
      throw new ScrapeError(
        `Scraped content is too short (${contentLength} chars). Minimum 500 characters required.`,
        'INSUFFICIENT_CONTENT',
        {
          url,
          contentLength,
          textLength,
        }
      );
    }

    // Check extracted text length >= 200 characters
    if (textLength < 200) {
      console.error(
        `[LivenessValidator] Validation failed for ${url}: ` +
        `Text content too short (${textLength} chars, minimum 200 required)`
      );
      throw new ScrapeError(
        `No meaningful text content found (${textLength} chars). Minimum 200 characters required.`,
        'NO_TEXT',
        {
          url,
          contentLength,
          textLength,
        }
      );
    }

    // Log successful validation
    console.log(
      `[LivenessValidator] Validation passed for ${url}: ` +
      `HTML=${contentLength} chars, Text=${textLength} chars, Title="${title}"`
    );
  }
}

/**
 * Enhanced validation result with errors and warnings
 */
export interface EnhancedValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    path: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * EnhancedValidator class
 * Validates generated manifests with additional quality checks
 */
export class EnhancedValidator {
  /**
   * Validates a generated manifest with comprehensive quality checks
   * 
   * Validation Rules:
   * 1. Schema validation using existing validateManifest()
   * 2. Identity description must be >= 20 characters
   * 3. Each knowledge entry description must be >= 20 characters
   * 4. Warning if identity name doesn't match scraped title (similarity check)
   * 5. Warning if knowledge entry URLs not found in scraped links
   * 
   * @param manifest - Manifest to validate
   * @param scrapedContent - Original scraped content for cross-validation
   * @returns Validation result with errors and warnings
   */
  validate(
    manifest: unknown,
    scrapedContent: ScrapedContent
  ): EnhancedValidationResult<import('./types').AgentsJSON> {
    const errors: Array<{
      path: string;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    // Step 1: Schema validation using existing validator
    const schemaResult = validateManifest(manifest);
    if (!schemaResult.success) {
      // Convert schema validation errors to our format
      schemaResult.error.errors.forEach((err: { path: string; message: string }) => {
        errors.push({
          path: err.path,
          message: err.message,
          severity: 'error',
        });
      });
    }

    // If schema validation failed, return early
    if (!schemaResult.success) {
      return {
        success: false,
        errors,
      };
    }

    const validatedManifest = schemaResult.data;

    // Step 2: Check identity description length >= 20 characters
    if (validatedManifest.identity.description.length < 20) {
      errors.push({
        path: 'identity.description',
        message: `Description too short (${validatedManifest.identity.description.length} chars). Minimum 20 characters required for substantive content.`,
        severity: 'error',
      });
    }

    // Step 3: Check each knowledge entry description >= 20 characters
    validatedManifest.knowledge.forEach((entry, index) => {
      if (entry.description.length < 20) {
        errors.push({
          path: `knowledge[${index}].description`,
          message: `Description too short (${entry.description.length} chars). Minimum 20 characters required for substantive content.`,
          severity: 'error',
        });
      }
    });

    // Step 4: Warning if identity name doesn't match scraped title
    const nameSimilarity = this.calculateTextSimilarity(
      validatedManifest.identity.name,
      scrapedContent.title
    );
    if (nameSimilarity < 0.5) {
      errors.push({
        path: 'identity.name',
        message: `Identity name "${validatedManifest.identity.name}" does not closely match scraped title "${scrapedContent.title}". This may indicate hallucination.`,
        severity: 'warning',
      });
    }

    // Step 5: Warning if knowledge entry URLs not found in scraped links
    validatedManifest.knowledge.forEach((entry, index) => {
      const urlFound = scrapedContent.links.some(link => 
        link.includes(entry.url) || entry.url.includes(link)
      );
      if (!urlFound) {
        errors.push({
          path: `knowledge[${index}].url`,
          message: `URL "${entry.url}" was not found in scraped links. This may indicate hallucination.`,
          severity: 'warning',
        });
      }
    });

    // Determine success based on presence of errors (not warnings)
    const hasErrors = errors.some(e => e.severity === 'error');

    if (hasErrors) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      data: validatedManifest,
      errors: errors.length > 0 ? errors : undefined, // Include warnings if present
    };
  }

  /**
   * Calculates text similarity using Jaccard similarity (word overlap)
   * 
   * @param text1 - First text
   * @param text2 - Second text
   * @returns Similarity score between 0 and 1
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenizeText(text1);
    const words2 = this.tokenizeText(text2);

    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }

    // Count matching words
    const matches = words1.filter(word => words2.includes(word)).length;

    // Calculate Jaccard similarity: intersection / union
    const union = new Set([...words1, ...words2]).size;

    return matches / union;
  }

  /**
   * Tokenizes text into words, removing punctuation and filtering short words
   * 
   * @param text - Text to tokenize
   * @returns Array of normalized words
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .split(/\s+/)               // Split on whitespace
      .filter(word => word.length >= 3);  // Filter out very short words
  }
}
