/**
 * Error types for Agent Manifest Generator
 * Provides structured error handling for the manifest generation pipeline
 * 
 * @module lib/agentManifest/errors
 * @version 1.0.0
 */

/**
 * Error codes for scraping failures
 */
export type ScrapeErrorCode = 
  | 'INSUFFICIENT_CONTENT'
  | 'EMPTY_HTML'
  | 'NO_TEXT';

/**
 * Error codes for manifest generation failures
 */
export enum ErrorCode {
  SCRAPE_FAILED = 'SCRAPE_FAILED',
  INSUFFICIENT_CONTENT = 'INSUFFICIENT_CONTENT',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  INVALID_JSON = 'INVALID_JSON',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  BOT_BLOCKED = 'BOT_BLOCKED',
}

/**
 * Error thrown when web scraping fails or content is insufficient
 */
export class ScrapeError extends Error {
  public readonly name = 'ScrapeError';
  
  constructor(
    message: string,
    public readonly code: ScrapeErrorCode,
    public readonly metadata: {
      url: string;
      contentLength: number;
      textLength: number;
    }
  ) {
    super(message);
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScrapeError);
    }
  }
}

/**
 * Error thrown when manifest generation fails at any stage
 */
export class ManifestGenerationError extends Error {
  public readonly name = 'ManifestGenerationError';
  
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ManifestGenerationError);
    }
  }
}
