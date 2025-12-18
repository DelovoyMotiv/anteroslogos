/**
 * Database connection utilities with retry logic and error handling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    '503', // Service Unavailable
    '504', // Gateway Timeout
    '408', // Request Timeout
  ],
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorString = JSON.stringify(error).toLowerCase();
  
  return retryableErrors.some(code => 
    errorString.includes(code.toLowerCase())
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), retrying in ${opts.retryDelay}ms...`,
        error
      );

      // Wait before retrying with exponential backoff
      await sleep(opts.retryDelay * Math.pow(2, attempt));
    }
  }

  // All retries exhausted
  console.error('Database operation failed after all retries:', lastError);
  throw new Error('Database connection failed. Please try again later.');
}

/**
 * Get Supabase client with connection validation
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  // For server-side (Vercel Functions), use non-VITE_ prefixed variables
  // For client-side, Vite will inject VITE_ prefixed variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasViteSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    });
    throw new Error('Database configuration is missing. Please check environment variables.');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'blog-cms',
      },
    },
  });
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    // Simple query to test connection
    const { error } = await client
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Execute a query with automatic retry on transient failures
 */
export async function executeQuery<T>(
  queryFn: (client: SupabaseClient<Database>) => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  return withRetry(async () => {
    const client = getSupabaseClient();
    const result = await queryFn(client);

    // If there's an error, throw it so retry logic can handle it
    if (result.error) {
      throw result.error;
    }

    return result;
  }, options);
}

/**
 * Log database errors for debugging
 */
export function logDatabaseError(
  operation: string,
  error: any,
  context?: Record<string, any>
): void {
  const errorDetails = {
    operation,
    timestamp: new Date().toISOString(),
    error: {
      message: error?.message || 'Unknown error',
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    },
    context,
  };

  console.error('Database Error:', JSON.stringify(errorDetails, null, 2));

  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, etc.
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Connection errors
  if (isRetryableError(error, DEFAULT_RETRY_OPTIONS.retryableErrors)) {
    return 'Unable to connect to the database. Please check your internet connection and try again.';
  }

  // Constraint violations
  if (error.code === '23505') {
    return 'This item already exists. Please use a different value.';
  }

  if (error.code === '23503') {
    return 'Cannot complete this operation due to related data constraints.';
  }

  if (error.code === '23502') {
    return 'Required information is missing. Please fill in all required fields.';
  }

  // Permission errors
  if (error.code === '42501' || error.message?.includes('permission')) {
    return 'You do not have permission to perform this action.';
  }

  // Not found
  if (error.code === 'PGRST116') {
    return 'The requested item was not found.';
  }

  // Generic database error
  if (error.code) {
    return 'A database error occurred. Please try again or contact support if the problem persists.';
  }

  // Return original message if it's user-friendly
  if (error.message && error.message.length < 100) {
    return error.message;
  }

  return 'An error occurred while processing your request. Please try again.';
}
