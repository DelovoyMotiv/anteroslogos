/**
 * Centralized error handling for Blog API endpoints
 * Ensures consistent error responses with appropriate HTTP status codes
 */

import type { VercelResponse } from '@vercel/node';

export interface ApiError {
  error: string;
  message?: string;
  details?: string[];
  statusCode: number;
}

/**
 * Standard error response structure
 */
export class BlogApiError extends Error {
  statusCode: number;
  details?: string[];

  constructor(message: string, statusCode: number, details?: string[]) {
    super(message);
    this.name = 'BlogApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Send error response with appropriate status code and message
 */
export function sendErrorResponse(
  res: VercelResponse,
  error: unknown,
  defaultMessage = 'Internal server error'
): void {
  console.error('API Error:', error);

  if (error instanceof BlogApiError) {
    const response: ApiError = {
      error: error.message,
      statusCode: error.statusCode,
    };

    if (error.details && error.details.length > 0) {
      response.details = error.details;
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string; details?: string };
    
    // Map common Supabase error codes to HTTP status codes
    const statusCode = mapSupabaseErrorToStatus(supabaseError.code);
    
    res.status(statusCode).json({
      error: supabaseError.message || defaultMessage,
      details: supabaseError.details ? [supabaseError.details] : undefined,
      statusCode,
    });
    return;
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : defaultMessage;
  res.status(500).json({
    error: message,
    statusCode: 500,
  });
}

/**
 * Map Supabase error codes to HTTP status codes
 */
function mapSupabaseErrorToStatus(code: string): number {
  const errorMap: Record<string, number> = {
    'PGRST116': 404, // Not found
    '23505': 409,    // Unique violation (conflict)
    '23503': 400,    // Foreign key violation
    '23502': 400,    // Not null violation
    '23514': 400,    // Check violation
    '42P01': 500,    // Undefined table
    '42703': 500,    // Undefined column
  };

  return errorMap[code] || 500;
}

/**
 * Validation error (400)
 */
export function validationError(message: string, details?: string[]): BlogApiError {
  return new BlogApiError(message, 400, details);
}

/**
 * Authentication error (401)
 */
export function authenticationError(message = 'Authentication required'): BlogApiError {
  return new BlogApiError(message, 401);
}

/**
 * Authorization error (403)
 */
export function authorizationError(message = 'Insufficient permissions'): BlogApiError {
  return new BlogApiError(message, 403);
}

/**
 * Not found error (404)
 */
export function notFoundError(resource: string): BlogApiError {
  return new BlogApiError(`${resource} not found`, 404);
}

/**
 * Conflict error (409)
 */
export function conflictError(message: string): BlogApiError {
  return new BlogApiError(message, 409);
}

/**
 * Database error (500)
 */
export function databaseError(message = 'Database operation failed'): BlogApiError {
  return new BlogApiError(message, 500);
}

/**
 * Validate required fields
 */
export function validateRequired(
  fields: Record<string, any>,
  requiredFields: string[]
): void {
  const errors: string[] = [];

  for (const field of requiredFields) {
    const value = fields[field];
    
    if (value === undefined || value === null) {
      errors.push(`${field} is required`);
      continue;
    }

    if (typeof value === 'string' && value.trim().length === 0) {
      errors.push(`${field} must be a non-empty string`);
      continue;
    }

    if (typeof value === 'number' && value <= 0) {
      errors.push(`${field} must be a positive number`);
    }
  }

  if (errors.length > 0) {
    throw validationError('Validation failed', errors);
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, fieldName: string): void {
  if (!url) return; // Allow empty URLs

  try {
    new URL(url);
  } catch {
    throw validationError('Validation failed', [`${fieldName} must be a valid URL`]);
  }
}

/**
 * Validate slug format
 */
export function validateSlug(slug: string): void {
  if (!slug) {
    throw validationError('Validation failed', ['slug is required']);
  }

  // Slug should only contain lowercase letters, numbers, and hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  if (!slugRegex.test(slug)) {
    throw validationError(
      'Validation failed',
      ['slug must contain only lowercase letters, numbers, and hyphens']
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string, fieldName: string): void {
  if (!email) return; // Allow empty emails

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw validationError('Validation failed', [`${fieldName} must be a valid email address`]);
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: T,
  allowedValues: readonly T[],
  fieldName: string
): void {
  if (!allowedValues.includes(value)) {
    throw validationError(
      'Validation failed',
      [`${fieldName} must be one of: ${allowedValues.join(', ')}`]
    );
  }
}
