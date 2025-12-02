/**
 * Signup Page
 * Enterprise-grade user registration
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { Mail, Lock, User, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';
import { checkRateLimit, recordAttempt, getRateLimitMessage } from '../../../lib/auth/rateLimiter';
import { logAuthEvent } from '../../../lib/auth/auditLogger';
import { Spinner } from '../../components/auth/SkeletonLoader';

export function SignupPage() {
  const { signUp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(formData.email, 'signup');
    if (!rateLimit.allowed) {
      const message = getRateLimitMessage(rateLimit);
      setRateLimitError(message);
      toast.error(message);
      await logAuthEvent('rate_limit_exceeded', 'signup', { email: formData.email });
      return;
    }

    setRateLimitError(null);
    setLoading(true);
    try {
      await logAuthEvent('signup_attempt', 'email', { email: formData.email });
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
      });
      
      await logAuthEvent('signup_success', 'email', { email: formData.email });
      setSuccess(true);
      toast.success('Account created! Check your email to verify.');
    } catch (error: any) {
      console.error('Signup error:', error);
      
      await recordAttempt(formData.email, 'signup');
      await logAuthEvent('signup_failure', 'email', { 
        email: formData.email, 
        error: error.message 
      });
      
      if (error.message?.includes('already registered')) {
        toast.error('Email already registered. Try logging in.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    // Rate limit OAuth
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
    } catch (error: any) {
      console.error('Google signup error:', error);
      await recordAttempt('oauth', 'oauth');
      await logAuthEvent('oauth_failure', 'google', { error: error.message });
      toast.error(error.message || 'Failed to sign up with Google');
      setOauthLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Check your email
            </h2>
            <p className="text-sm text-zinc-400 mb-1">
              We sent a verification link to
            </p>
            <p className="text-sm text-white font-mono mb-6">{formData.email}</p>
            <p className="text-xs text-zinc-500 mb-6">
              Click the link in the email to verify your account and start building.
            </p>
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm rounded transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              Create your account
            </h1>
            <p className="text-zinc-400 text-xs">
              Free forever • No credit card required
            </p>
            {rateLimitError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{rateLimitError}</p>
              </div>
            )}
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignup}
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
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-900/50 text-zinc-500">Or with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-5 pt-5 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              Already have an account?{' '}
              <Link
                to="/auth/login"
                className="text-brand-accent hover:text-blue-400 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
          
          {/* Terms */}
          <p className="mt-4 text-xs text-zinc-600 text-center">
            By creating an account, you agree to our{' '}
            <Link to="/privacy-policy" className="text-zinc-500 hover:text-zinc-400 underline transition-colors">
              Terms
            </Link>
            {' '}and{' '}
            <Link to="/privacy-policy" className="text-zinc-500 hover:text-zinc-400 underline transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
