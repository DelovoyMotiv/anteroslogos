/**
 * Forgot Password Page
 * Request password reset link via email
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../../../lib/supabase';
import { Mail, ArrowRight, Check, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';
import { checkRateLimit, recordAttempt, getRateLimitMessage } from '../../../lib/auth/rateLimiter';
import { logAuthEvent } from '../../../lib/auth/auditLogger';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(email, 'passwordReset');
    if (!rateLimit.allowed) {
      const message = getRateLimitMessage(rateLimit);
      setRateLimitError(message);
      toast.error(message);
      await logAuthEvent('rate_limit_exceeded', 'password_reset', { email });
      return;
    }

    setRateLimitError(null);
    setLoading(true);
    try {
      await logAuthEvent('password_reset_request', 'email', { email });
      const { error } = await resetPassword(email);
      
      if (error) {
        throw error;
      }

      await logAuthEvent('password_reset_success', 'email', { email });
      setSuccess(true);
      toast.success('Password reset link sent!');
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      await recordAttempt(email, 'passwordReset');
      await logAuthEvent('password_reset_failure', 'email', { 
        email, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      toast.error(error instanceof Error ? error.message : 'Failed to send reset link');
    } finally {
      setLoading(false);
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
              We sent a password reset link to
            </p>
            <p className="text-sm text-white font-mono mb-6">{email}</p>
            <p className="text-xs text-zinc-500 mb-6">
              Click the link in the email to reset your password.
            </p>
            <Link
              to="/auth/login"
              className="w-full inline-block py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm rounded transition-colors text-center"
            >
              Back to Login
            </Link>
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
              Reset your password
            </h1>
            <p className="text-zinc-400 text-xs">
              Enter your email and we'll send you a reset link
            </p>
            {rateLimitError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{rateLimitError}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Email Address
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-5 pt-5 border-t border-zinc-800">
            <Link
              to="/auth/login"
              className="flex items-center justify-center text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              <ArrowLeft className="w-3 h-3 mr-1.5" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
