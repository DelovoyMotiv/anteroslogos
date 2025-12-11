/**
 * Auth Callback Page
 * Handles OAuth redirects and magic link verification
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Logo } from '../../../components/Icons';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { verifySignupFlow, logSignupStatus } from '../../../lib/auth/freePlanVerification';
import { config } from '../../../lib/config/env';

type CallbackState = 'loading' | 'success' | 'error';

export function CallbackPage() {
  const [state, setState] = useState<CallbackState>('loading');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get error from URL if present
        const errorCode = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorCode) {
          setError(errorDescription || 'Authentication failed');
          setState('error');
          return;
        }

        // Check for session (OAuth or magic link)
        if (!supabase) {
          setError('Authentication service not configured');
          setState('error');
          return;
        }
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          setError('No session found. Please try logging in again.');
          setState('error');
          return;
        }

        // In development: verify signup flow
        if (config.isDevelopment) {
          try {
            const signupStatus = await verifySignupFlow(session.user.id);
            logSignupStatus(signupStatus);
            
            // Warn if signup incomplete
            if (!signupStatus.signupComplete) {
              console.warn('⚠️ Signup flow incomplete:', signupStatus.missingSteps);
            }
          } catch (err) {
            console.error('Signup verification error:', err);
          }
        }

        // Success - redirect directly to dashboard
        setState('success');
        
        // Always redirect to dashboard (onboarding is now optional)
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setState('error');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Logo className="h-9 w-9 text-brand-accent" />
          <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Anóteros Lógos
          </span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-8 shadow-xl text-center">
          {state === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-brand-accent animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">
                Verifying authentication...
              </h2>
              <p className="text-sm text-zinc-400">
                Please wait while we complete the sign-in process
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Authentication successful!
              </h2>
              <p className="text-sm text-zinc-400">
                Redirecting you to the dashboard...
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Authentication failed
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                {error || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => navigate('/auth/login')}
                className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallbackPage;
