/**
 * Supabase Client Configuration
 * Production-ready setup with proper error handling and type safety
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { config } from './config/env';

// Environment variables from centralized config
const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

// Check if Supabase is configured
const isConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn('Supabase not configured: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Authentication features will be disabled.');
}

/**
 * Supabase client instance
 * Configured with production settings for optimal performance
 * Throws error if env variables are not set in production
 */
if (!isConfigured && process.env.NODE_ENV === 'production') {
  throw new Error('Supabase configuration required in production. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = isConfigured ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Browser-only: localStorage used for Supabase Auth session persistence
    // This is safe and recommended by Supabase for client-side authentication
    // Server-side rendering will use undefined (no storage)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'X-Client-Info': 'anoteros-logos-geo-audit',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
}) : null;

/**
 * Check if Supabase client is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

/**
 * Get Supabase client with proper error handling
 * Throws error if not configured to help catch configuration issues early
 */
export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase client not configured. Check environment variables.');
  }
  return supabase;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isConfigured || !supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Sign up new user with email/password
 */
export async function signUpWithEmail(email: string, password: string) {
  if (!isConfigured || !supabase) return { user: null, error: new Error('Supabase not configured') };
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: config.authRedirectUrl,
      },
    });
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error };
  }
}

/**
 * Sign in existing user with email/password
 */
export async function signInWithEmail(email: string, password: string) {
  if (!isConfigured || !supabase) return { user: null, session: null, error: new Error('Supabase not configured') };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, session: null, error };
  }
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'twitter') {
  if (!isConfigured || !supabase) return { url: null, error: new Error('Supabase not configured') };
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: config.authRedirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return { url: data.url, error: null };
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error);
    return { url: null, error };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  if (!isConfigured || !supabase) return { error: new Error('Supabase not configured') };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
}

/**
 * Reset password for user
 */
export async function resetPassword(email: string) {
  if (!isConfigured || !supabase) return { error: new Error('Supabase not configured') };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.siteUrl}/auth/reset-password`,
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { error };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  if (!isConfigured || !supabase) return { error: new Error('Supabase not configured') };
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating password:', error);
    return { error };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  if (!isConfigured || !supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    callback(event, session);
  });
}
