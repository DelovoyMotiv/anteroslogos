/**
 * Supabase Server Client
 * For use in Vercel serverless functions and API routes
 * Uses process.env instead of import.meta.env
 */

import { createClient } from '@supabase/supabase-js';

// Server-side environment variables (no VITE_ prefix)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn('Supabase not configured on server: Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

/**
 * Server-side Supabase client
 * Configured for serverless function usage
 */
export const supabaseServer = isConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'anoteros-logos-server',
    },
  },
  db: {
    schema: 'public',
  },
}) : null;

/**
 * Check if server Supabase client is configured
 */
export function isSupabaseServerConfigured(): boolean {
  return isConfigured;
}

/**
 * Get server Supabase client with error handling
 */
export function getSupabaseServerClient() {
  if (!supabaseServer) {
    throw new Error('Supabase server client not configured. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  return supabaseServer;
}
