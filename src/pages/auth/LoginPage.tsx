/**
 * Login Page
 * Enterprise-grade authentication with email/password and magic links
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { Mail, Lock, ArrowRight, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signInWithMagicLink } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate(redirectTo);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid credentials');
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

    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
      toast.success('Magic link sent! Check your email.');
    } catch (error: any) {
      console.error('Magic link error:', error);
      toast.error(error.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
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
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back
            </h1>
            <p className="text-white/60 text-sm">
              Sign in to continue building
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center mb-6 bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'password'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Password
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'magic'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Magic Link
            </button>
          </div>

          {/* Password Form */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:bg-white/10 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-white/90">
                    Password
                  </label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-sm text-brand-accent hover:text-blue-400 transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:bg-white/10 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-accent hover:bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 hover:-translate-y-0.5 mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Magic Link Form */}
          {mode === 'magic' && (
            <>
              {!magicLinkSent ? (
                <form onSubmit={handleMagicLink} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:bg-white/10 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-sm text-white/60">
                    We'll send you a magic link to sign in without a password.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-brand-accent to-purple-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 hover:-translate-y-0.5 mt-6"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Send magic link
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Check your email
                  </h3>
                  <p className="text-sm text-white/70 mb-6">
                    We sent a magic link to <span className="text-white font-medium">{email}</span>
                  </p>
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="text-sm text-brand-accent hover:text-blue-400 transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              )}
            </>
          )}

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
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
