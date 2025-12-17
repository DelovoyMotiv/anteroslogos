/**
 * Blog Admin Authentication Middleware
 * Verifies JWT token from Supabase Auth and checks admin role
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for admin auth');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Verify admin authentication and authorization
 * Returns user ID if authenticated and authorized, null otherwise
 */
export async function verifyAdminAuth(req: VercelRequest): Promise<{ 
  authenticated: boolean; 
  authorized: boolean; 
  userId?: string;
  error?: string;
}> {
  if (!supabase) {
    return { 
      authenticated: false, 
      authorized: false, 
      error: 'Database not configured' 
    };
  }

  // Extract token
  const token = extractToken(req);
  
  if (!token) {
    return { 
      authenticated: false, 
      authorized: false, 
      error: 'No authentication token provided' 
    };
  }

  try {
    // Verify JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { 
        authenticated: false, 
        authorized: false, 
        error: 'Invalid or expired token' 
      };
    }

    // Check if user has admin role in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { 
        authenticated: true, 
        authorized: false, 
        userId: user.id,
        error: 'User profile not found' 
      };
    }

    // Check for admin role in metadata
    const metadata = profile.metadata as { role?: string } | null;
    const isAdmin = metadata?.role === 'admin';

    if (!isAdmin) {
      return { 
        authenticated: true, 
        authorized: false, 
        userId: user.id,
        error: 'Insufficient permissions' 
      };
    }

    return { 
      authenticated: true, 
      authorized: true, 
      userId: user.id 
    };
  } catch (error) {
    console.error('Error verifying admin auth:', error);
    return { 
      authenticated: false, 
      authorized: false, 
      error: 'Authentication verification failed' 
    };
  }
}

/**
 * Middleware wrapper for admin endpoints
 * Returns 401 for unauthenticated requests
 * Returns 403 for non-admin users
 */
export async function requireAdminAuth(
  req: VercelRequest,
  res: VercelResponse,
  handler: (req: VercelRequest, res: VercelResponse, userId: string) => Promise<void>
): Promise<void> {
  const authResult = await verifyAdminAuth(req);

  if (!authResult.authenticated) {
    res.status(401).json({
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
    return;
  }

  if (!authResult.authorized) {
    res.status(403).json({
      error: 'Forbidden',
      message: authResult.error || 'Admin access required',
    });
    return;
  }

  // Call the handler with authenticated user ID
  await handler(req, res, authResult.userId!);
}
