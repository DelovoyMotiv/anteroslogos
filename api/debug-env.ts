/**
 * Debug endpoint to check environment variables
 * GET /api/debug-env
 * 
 * IMPORTANT: Remove this file after debugging!
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow in development or with secret key
  const debugSecret = req.query.secret as string;
  
  if (process.env.NODE_ENV === 'production' && debugSecret !== 'debug-2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Get all SUPABASE related env vars
  const supabaseVars = Object.keys(process.env)
    .filter(key => key.includes('SUPABASE'))
    .reduce((acc, key) => {
      const value = process.env[key];
      // Only show first 20 chars for security
      acc[key] = value ? `${value.substring(0, 20)}...` : 'undefined';
      return acc;
    }, {} as Record<string, string>);

  const debugInfo = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    
    // Check specific variables
    checks: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasViteSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasViteSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    },
    
    // Show partial values (safe)
    partialValues: supabaseVars,
    
    // List all SUPABASE env var names
    availableSupabaseVars: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
    
    // Total env vars count
    totalEnvVars: Object.keys(process.env).length,
  };

  res.status(200).json(debugInfo);
}
