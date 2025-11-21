/**
 * Signup Page
 * Enterprise-grade user registration
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { Mail, Lock, User, ArrowRight, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
      });
      
      setSuccess(true);
      toast.success('Account created! Check your email to verify.');
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.message?.includes('already registered')) {
        toast.error('Email already registered. Try logging in.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Check your email
            </h2>
            <p className="text-white/70 mb-6">
              We sent a verification link to <span className="text-white font-medium">{formData.email}</span>
            </p>
            <p className="text-sm text-white/50 mb-8">
              Click the link in the email to verify your account and start building.
            </p>
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium transition-all duration-200"
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
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Create your account
            </h1>
            <p className="text-white/60 text-sm flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-brand-accent" />
              Free forever • No credit card required
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:bg-white/10 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:bg-white/10 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:bg-white/10 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:bg-white/10 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs text-white/50 pt-1">
              By creating an account, you agree to our{' '}
              <Link to="/privacy-policy" className="text-brand-accent hover:text-blue-400 transition-colors">
                Terms
              </Link>
              {' '}and{' '}
              <Link to="/privacy-policy" className="text-brand-accent hover:text-blue-400 transition-colors">
                Privacy Policy
              </Link>
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-accent hover:bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 hover:-translate-y-0.5 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Already have an account?{' '}
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

export default SignupPage;
