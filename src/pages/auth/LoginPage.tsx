/**
 * Login Page
 * Enterprise-grade authentication with email/password and magic links
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { Mail, Lock, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';
import { checkRateLimit, recordAttempt, resetRateLimit, getRateLimitMessage } from '../../../lib/auth/rateLimiter';
import { logAuthEvent } from '../../../lib/auth/auditLogger';
import { Spinner } from '../../components/auth/SkeletonLoader';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signInWithMagicLink, signInWithOAuth } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    // Check rate limit before attempting login
    const rateLimit = await checkRateLimit(email, 'login');
    if (!rateLimit.allowed) {
      const message = getRateLimitMessage(rateLimit);
      setRateLimitError(message);
      toast.error(message);
      await logAuthEvent('rate_limit_exceeded', 'login', { email });
      return;
    }

    // Update remaining attempts display
    setAttemptsRemaining(rateLimit.remaining);
    setRateLimitError(null);

    setLoading(true);
    try {
      await logAuthEvent('login_attempt', 'email', { email });
      await signIn(email, password);
      
      // Success - reset rate limit
      await resetRateLimit(email, 'login');
      await logAuthEvent('login_success', 'email', { email });
      
      toast.success('Welcome back!');
      navigate(redirectTo);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid credentials';
      console.error('Login error:', errorMessage);
      
      // Record failed attempt
      await recordAttempt(email, 'login');
      await logAuthEvent('login_failure', 'email', { 
        email, 
        error: errorMessage 
      });
      
      // Update remaining attempts
      const updatedLimit = await checkRateLimit(email, 'login');
      setAttemptsRemaining(updatedLimit.remaining);
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(email, 'login');
    if (!rateLimit.allowed) {
      const message = getRateLimitMessage(rateLimit);
      setRateLimitError(message);
      toast.error(message);
      await logAuthEvent('rate_limit_exceeded', 'magic_link', { email });
      return;
    }

    setLoading(true);
    try {
      await logAuthEvent('magic_link_request', 'email', { email });
      await signInWithMagicLink(email);
      await logAuthEvent('magic_link_success', 'email', { email });
      
      setMagicLinkSent(true);
      toast.success('Magic link sent! Check your email.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      console.error('Magic link error:', errorMessage);
      await recordAttempt(email, 'login');
      await logAuthEvent('login_failure', 'magic_link', { 
        email, 
        error: errorMessage 
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Rate limit OAuth by IP (use empty string as identifier)
    const rateLimit = await checkRateLimit('oauth', 'oauth');
    if (!rateLimit.allowed) {
      const message = getRateLimitMessage(rateLimit);
      toast.error(message);
      await logAuthEvent('rate_limit_exceeded', 'oauth', { provider: 'google' });
      return;
    }

    setOauthLoading(true);
    try {
      await logAuthEvent('oauth_attempt', 'google', {});
      await signInWithOAuth('google');
      // Redirect happens automatically via Supabase
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      console.error('Google login error:', errorMessage);
      await recordAttempt('oauth', 'oauth');
      await logAuthEvent('oauth_failure', 'google', { 
        error: errorMessage 
      });
      toast.error(errorMessage);
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="group flex items-center justify-center mb-12 transition-transform hover:scale-105 duration-200">
          <Logo className="h-9 w-9 text-brand-accent" />
          <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Anóteros Lógos
          </span>
        </Link>

        {/* Card */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6 shadow-xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white mb-1">
              Welcome back
            </h1>
            <p className="text-zinc-400 text-xs">
              Sign in to continue building
            </p>
            {rateLimitError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{rateLimitError}</p>
              </div>
            )}
            {attemptsRemaining !== null && attemptsRemaining <= 2 && !rateLimitError && (
              <div className="mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded">
                <p className="text-xs text-yellow-400">
                  ⚠️ {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining before temporary lockout
                </p>
              </div>
            )}
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={oauthLoading || loading}
            className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2.5 mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {oauthLoading ? (
              <>
                <Spinner size="sm" />
                Redirecting...
              </>
            ) : (
              'Continue with Google'
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-900/50 text-zinc-500">Or with credentials</span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center mb-5 bg-zinc-950 rounded p-0.5 border border-zinc-800">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                mode === 'password'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                mode === 'magic'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Password Form */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-400">
                    Password
                  </label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-brand-accent hover:text-blue-400 transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Magic Link Form */}
          {mode === 'magic' && (
            <>
              {!magicLinkSent ? (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500">
                    We'll send you a magic link to sign in without a password.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-brand-accent to-purple-600 text-white text-sm font-medium rounded hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-6"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Sending...
                      </>
                    ) : (
                      'Send magic link'
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    Check your email
                  </h3>
                  <p className="text-xs text-zinc-400 mb-1">
                    We sent a magic link to
                  </p>
                  <p className="text-sm text-white font-mono mb-5">{email}</p>
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="text-xs text-brand-accent hover:text-blue-400 transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              )}
            </>
          )}

          {/* Sign Up Link */}
          <div className="mt-5 pt-5 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              Don't have an account?{' '}
              <Link
                to="/auth/signup"
                className="text-brand-accent hover:text-blue-400 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
