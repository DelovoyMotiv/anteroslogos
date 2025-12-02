/**
 * Email Verification Pending Page
 * Shows when user needs to verify email before accessing dashboard
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Mail, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';
import { checkRateLimit, recordAttempt, getRateLimitMessage } from '../../../lib/auth/rateLimiter';
import { logAuthEvent } from '../../../lib/auth/auditLogger';

interface VerifyEmailPageProps {
  email?: string;
}

export function VerifyEmailPage({ email: propEmail }: VerifyEmailPageProps) {
  const [email] = useState(propEmail || '');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address is required');
      return;
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(email, 'emailVerification');
    if (!rateLimit.allowed) {
      const message = getRateLimitMessage(rateLimit);
      setRateLimitError(message);
      toast.error(message);
      await logAuthEvent('rate_limit_exceeded', 'email_verification', { email });
      return;
    }

    setRateLimitError(null);
    setResending(true);
    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      await logAuthEvent('email_verification_sent', 'resend', { email });
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        throw error;
      }

      setResent(true);
      toast.success('Verification email sent!');
    } catch (error: unknown) {
      console.error('Resend verification error:', error);
      await recordAttempt(email, 'emailVerification');
      toast.error(error instanceof Error ? error.message : 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!supabase) {
      toast.error('Authentication service not configured');
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (session?.user?.email_confirmed_at) {
        await logAuthEvent('email_verified', 'check', { email: session.user.email || '' });
        toast.success('Email verified! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      } else {
        toast.info('Email not verified yet. Please check your inbox.');
      }
    } catch (error: unknown) {
      console.error('Check verification error:', error);
      toast.error('Failed to check verification status');
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
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-brand-accent" />
          </div>

          <h1 className="text-xl font-semibold text-white mb-3">
            Verify your email
          </h1>

          {rateLimitError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2 text-left">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400">{rateLimitError}</p>
            </div>
          )}

          <p className="text-sm text-zinc-400 mb-2">
            We sent a verification link to
          </p>
          <p className="text-sm text-white font-mono mb-6">{email || 'your email'}</p>

          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-zinc-500 mb-3">
              <strong className="text-white">Next steps:</strong>
            </p>
            <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Return here and click "I've verified my email"</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleCheckVerification}
              className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors flex items-center justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              I've verified my email
            </button>

            <button
              onClick={handleResendVerification}
              disabled={resending || resent}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {resending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : resent ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Email sent!
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend verification email
                </>
              )}
            </button>
          </div>

          {/* Help text */}
          <p className="text-xs text-zinc-600 mt-6">
            Didn't receive the email? Check your spam folder or try resending.
          </p>

          {/* Back to login */}
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <Link
              to="/auth/login"
              className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
