/**
 * Authentication Guard
 * Higher-order component to protect dashboard routes
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { logAuthEvent } from '../auth/auditLogger';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * Auth Guard Component
 * Redirects to login if not authenticated
 */
export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/login',
}: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // PRODUCTION: Require Supabase configuration (no mock users)
    if (!isSupabaseConfigured() || !supabase) {
      console.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      setLoading(false);
      if (requireAuth) {
        navigate(redirectTo, { replace: true });
      }
      return;
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Failed to get session:', error.message);
      }
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setEmailVerified(!!currentUser?.email_confirmed_at);
      setLoading(false);

      if (requireAuth && !session) {
        navigate(redirectTo, { replace: true });
        return;
      }

      // Check email verification for dashboard routes
      if (requireAuth && currentUser && !currentUser.email_confirmed_at) {
        navigate('/auth/verify-email', { 
          replace: true, 
          state: { email: currentUser.email } 
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setEmailVerified(!!currentUser?.email_confirmed_at);

      // Handle session expiry/logout
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          console.log('User signed out or session expired');
        }
      }

      if (requireAuth && !session) {
        navigate(redirectTo, { 
          replace: true,
          state: { message: event === 'SIGNED_OUT' ? 'Session expired. Please log in again.' : undefined }
        });
        return;
      }

      // Check email verification for dashboard routes
      if (requireAuth && currentUser && !currentUser.email_confirmed_at) {
        navigate('/auth/verify-email', { 
          replace: true, 
          state: { email: currentUser.email } 
        });
      }
    });

    // Set up token refresh check (check every 5 minutes)
    const refreshInterval = setInterval(async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // Refresh if less than 5 minutes until expiry
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          console.log('Refreshing session token...');
          await supabase.auth.refreshSession();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [requireAuth, redirectTo, navigate]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (requireAuth && !user) {
    return null; // Redirecting
  }

  // Check email verification
  if (requireAuth && user && !emailVerified) {
    return null; // Redirecting to verify-email
  }

  return <>{children}</>;
}

/**
 * Loading skeleton while checking auth
 */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-48 bg-brand-secondary rounded"></div>
        <div className="h-4 w-64 bg-brand-secondary rounded"></div>
      </div>
    </div>
  );
}

/**
 * Hook to get current user
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // PRODUCTION: Require Supabase configuration (no mock users)
    if (!isSupabaseConfigured() || !supabase) {
      console.error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      setUser(null);
      setLoading(false);
      return;
    }

    // Use getSession() instead of getUser() to avoid unnecessary API calls
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Failed to get session:', error.message);
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase not configured');
    }
    
    await logAuthEvent('login_attempt', null, { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      await logAuthEvent('login_failure', null, { email, error: error.message });
      throw error;
    }
    
    await logAuthEvent('login_success', data.user?.id || null, { email });
    return data;
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase not configured');
    }
    
    await logAuthEvent('signup_attempt', null, { email });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      await logAuthEvent('signup_failure', null, { email, error: error.message });
      throw error;
    }
    
    await logAuthEvent('signup_success', data.user?.id || null, { email });
    await logAuthEvent('email_verification_sent', data.user?.id || null, { email });
    return data;
  };

  const signInWithMagicLink = async (email: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase not configured');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      await logAuthEvent('logout', user?.id || null, {});
    }
    
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase not configured');
    }
    
    await logAuthEvent('password_reset_request', null, { email });
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) {
      await logAuthEvent('password_reset_failure', null, { email, error: error.message });
      throw error;
    }
    
    return data;
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'twitter') => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase not configured');
    }
    
    await logAuthEvent('oauth_attempt', null, { provider });
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      await logAuthEvent('oauth_failure', null, { provider, error: error.message });
      throw error;
    }
    
    // Success will be logged in callback page
    return data;
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    resetPassword,
  };
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  return { user, loading };
}
