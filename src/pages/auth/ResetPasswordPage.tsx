/**
 * Reset Password Page
 * Complete password reset with new password
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updatePassword } from '../../../lib/supabase';
import { Lock, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';
import { logAuthEvent } from '../../../lib/auth/auditLogger';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a recovery token in URL (Supabase automatically handles this)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (!accessToken) {
      toast.error('Invalid or expired reset link');
      setTimeout(() => {
        navigate('/auth/forgot-password');
      }, 2000);
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await logAuthEvent('password_reset_attempt', 'token', {});
      const { error } = await updatePassword(password);
      
      if (error) {
        throw error;
      }

      await logAuthEvent('password_reset_success', 'token', {});
      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (error: unknown) {
      console.error('Password update error:', error);
      await logAuthEvent('password_reset_failure', 'token', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
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
              Password updated!
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Your password has been successfully reset. Redirecting to login...
            </p>
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
              Set new password
            </h1>
            <p className="text-zinc-400 text-xs">
              Choose a strong password for your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Update password
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-5 pt-5 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              Remember your password?{' '}
              <Link
                to="/auth/login"
                className="text-brand-accent hover:text-blue-400 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
