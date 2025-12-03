/**
 * Common API Helper Utilities
 * Extracted from duplicated patterns across API endpoints
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create Supabase client with authorization
 */
export function createAuthorizedSupabaseClient(
  req: VercelRequest
): { client: SupabaseClient; userId: string } | { error: string; status: number } {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.substring(7);
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { error: 'Server configuration error', status: 500 };
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Extract user ID from token (simplified - in production, verify JWT)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return { client, userId: payload.sub };
  } catch {
    return { error: 'Invalid token', status: 401 };
  }
}

/**
 * Standard error response handler
 */
export function sendErrorResponse(
  res: VercelResponse,
  status: number,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: message,
  });
}

/**
 * Standard success response handler
 */
export function sendSuccessResponse<T>(
  res: VercelResponse,
  data: T,
  status: number = 200
): void {
  res.status(status).json({
    success: true,
    data,
  });
}

/**
 * Validate request body against Zod schema
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    }
    return { success: false, error: 'Invalid request body' };
  }
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(res: VercelResponse): void {
  res.status(200).end();
}

/**
 * Set CORS headers
 */
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Standard API handler wrapper with error handling
 */
export async function withApiHandler<T>(
  req: VercelRequest,
  res: VercelResponse,
  handler: (req: VercelRequest, res: VercelResponse) => Promise<T>
): Promise<void> {
  try {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
      handleCorsPreflightRequest(res);
      return;
    }

    await handler(req, res);
  } catch (error) {
    console.error('API handler error:', error);
    sendErrorResponse(
      res,
      500,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
}

/**
 * Extract pagination parameters from query
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

export function extractPaginationParams(
  query: VercelRequest['query']
): PaginationParams {
  const limit = Math.min(
    parseInt(query.limit as string) || 50,
    100
  );
  const offset = parseInt(query.offset as string) || 0;
  
  return { limit, offset };
}

/**
 * Standard paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    total,
    limit: params.limit,
    offset: params.offset,
    hasMore: params.offset + params.limit < total,
  };
}

/**
 * Verify tenant access for multi-tenancy
 */
export async function verifyTenantAccess(
  client: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await client
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

/**
 * Standard method not allowed handler
 */
export function handleMethodNotAllowed(
  res: VercelResponse,
  allowedMethods: string[]
): void {
  res.setHeader('Allow', allowedMethods.join(', '));
  sendErrorResponse(res, 405, `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`);
}
