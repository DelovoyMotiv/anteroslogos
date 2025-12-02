/**
 * Onboarding Flow Page
 * Production-grade first-time user setup with progressive disclosure
 * Collects essential data, sets up workspace, generates first API key
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { 
  Building2, 
  Globe, 
  Key, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../../components/Icons';

type OnboardingStep = 'company' | 'workspace' | 'api-key' | 'complete';

interface CompanyInfo {
  companyName: string;
  industry: string;
  websiteUrl: string;
}

interface WorkspaceInfo {
  tenantName: string;
  tenantId: string;
}

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<OnboardingStep>('company');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Company info
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: '',
    industry: '',
    websiteUrl: '',
  });
  
  // Workspace info
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  
  // Generated API key
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Check if user already completed onboarding
  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  async function checkOnboardingStatus() {
    if (!user || !supabase) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    const hasCompleted = (profile as unknown as { onboarding_completed?: boolean })?.onboarding_completed;
    if (hasCompleted) {
      // Already onboarded, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!companyInfo.companyName) {
      toast.error('Company name is required');
      return;
    }

    setLoading(true);
    try {
      if (!user || !supabase) throw new Error('Not authenticated');

      // Update profile with company info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_name: companyInfo.companyName,
          industry: companyInfo.industry || null,
          website_url: companyInfo.websiteUrl || null,
        } as never)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Fetch workspace info
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('owner_id', user.id)
        .single();

      if (tenant) {
        setWorkspaceInfo({
          tenantId: (tenant as { id: string }).id,
          tenantName: (tenant as { name: string }).name,
        });
      }

      setStep('workspace');
    } catch (error) {
      console.error('Company setup error:', error);
      toast.error('Failed to save company information');
    } finally {
      setLoading(false);
    }
  }

  async function handleWorkspaceSubmit() {
    setLoading(true);
    try {
      if (!user || !supabase) throw new Error('Not authenticated');

      // Generate API key
      const keyPrefix = 'sk_live_';
      const randomPart = Array.from(
        crypto.getRandomValues(new Uint8Array(32))
      )
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 32);
      
      const fullKey = keyPrefix + randomPart;
      const keyPrefixDisplay = fullKey.substring(0, 11); // sk_live_abc

      // Hash the key for storage (using SubtleCrypto for production)
      const encoder = new TextEncoder();
      const data = encoder.encode(fullKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Insert API key
      const { error: apiKeyError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          tenant_id: workspaceInfo?.tenantId || null,
          name: 'Default API Key',
          key_hash: keyHash,
          key_prefix: keyPrefixDisplay,
          rate_limit_per_minute: 10,
          rate_limit_per_hour: 100,
        } as never)
        .select()
        .single();

      if (apiKeyError) throw apiKeyError;

      setApiKey(fullKey);
      setStep('api-key');
    } catch (error) {
      console.error('API key generation error:', error);
      toast.error('Failed to generate API key');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    try {
      if (!user || !supabase) throw new Error('Not authenticated');

      // Mark onboarding as completed
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as never)
        .eq('id', user.id);

      if (error) throw error;

      setStep('complete');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyApiKey() {
    if (!apiKey) return;
    
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success('API key copied to clipboard');
    
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSkipToComplete() {
    setStep('complete');
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Logo className="h-9 w-9 text-brand-accent" />
          <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Anóteros Lógos
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${step === 'company' || step === 'workspace' || step === 'api-key' || step === 'complete' ? 'bg-brand-accent' : 'bg-zinc-700'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 'workspace' || step === 'api-key' || step === 'complete' ? 'bg-brand-accent' : 'bg-zinc-700'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 'api-key' || step === 'complete' ? 'bg-brand-accent' : 'bg-zinc-700'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 'complete' ? 'bg-brand-accent' : 'bg-zinc-700'}`} />
          </div>
          <p className="text-xs text-zinc-500 text-center">
            {step === 'company' && 'Step 1 of 3: Company Information'}
            {step === 'workspace' && 'Step 2 of 3: Workspace Setup'}
            {step === 'api-key' && 'Step 3 of 3: API Key'}
            {step === 'complete' && 'Setup Complete!'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-8 shadow-xl">
          
          {/* Step 1: Company Info */}
          {step === 'company' && (
            <>
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-8 h-8 text-brand-accent" />
              </div>
              
              <h1 className="text-2xl font-semibold text-white text-center mb-2">
                Welcome to Anóteros Lógos
              </h1>
              <p className="text-sm text-zinc-400 text-center mb-8">
                Let's set up your account. This will only take a minute.
              </p>

              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.companyName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                    placeholder="Acme Inc."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Industry (Optional)
                  </label>
                  <select
                    value={companyInfo.industry}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                  >
                    <option value="">Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="saas">SaaS</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="marketing">Marketing & Advertising</option>
                    <option value="media">Media & Publishing</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={companyInfo.websiteUrl}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, websiteUrl: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-6"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Workspace */}
          {step === 'workspace' && (
            <>
              <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-purple-400" />
              </div>
              
              <h1 className="text-2xl font-semibold text-white text-center mb-2">
                Your Workspace is Ready
              </h1>
              <p className="text-sm text-zinc-400 text-center mb-8">
                We've created a personal workspace for you to get started.
              </p>

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Workspace Name</p>
                    <p className="text-sm font-medium text-white">{workspaceInfo?.tenantName}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                
                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-2">What's included:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-xs text-zinc-400">
                      <CheckCircle2 className="w-3 h-3 text-green-500 mr-2" />
                      Free plan activated (10 audits/month)
                    </li>
                    <li className="flex items-center text-xs text-zinc-400">
                      <CheckCircle2 className="w-3 h-3 text-green-500 mr-2" />
                      Personal workspace with full access
                    </li>
                    <li className="flex items-center text-xs text-zinc-400">
                      <CheckCircle2 className="w-3 h-3 text-green-500 mr-2" />
                      API keys for programmatic access
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleWorkspaceSubmit}
                disabled={loading}
                className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Generate API Key
                    <Sparkles className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </>
          )}

          {/* Step 3: API Key */}
          {step === 'api-key' && apiKey && (
            <>
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Key className="w-8 h-8 text-green-500" />
              </div>
              
              <h1 className="text-2xl font-semibold text-white text-center mb-2">
                Your API Key
              </h1>
              <p className="text-sm text-zinc-400 text-center mb-6">
                Save this key securely. You won't be able to see it again.
              </p>

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-zinc-400">API Key</p>
                  <button
                    onClick={handleCopyApiKey}
                    className="text-xs text-brand-accent hover:text-blue-400 transition-colors flex items-center"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <code className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-white break-all">
                  {apiKey}
                </code>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <p className="text-xs text-yellow-500 font-medium mb-1">⚠️ Important</p>
                <p className="text-xs text-zinc-400">
                  Store this API key securely. You can create more keys anytime in Settings → API Keys.
                </p>
              </div>

              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              <button
                onClick={handleSkipToComplete}
                className="w-full mt-3 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                I'll save it later
              </button>
            </>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <>
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              
              <h1 className="text-2xl font-semibold text-white text-center mb-2">
                All Set!
              </h1>
              <p className="text-sm text-zinc-400 text-center mb-8">
                Redirecting you to the dashboard...
              </p>

              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
