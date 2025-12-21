import { useState } from 'react';
import { FileJson, AlertCircle, Loader2 } from 'lucide-react';
import JSONDisplay from '../components/JSONDisplay';
import SEOHead from '../components/SEOHead';
import { LogosJSON } from '../lib/agentManifest/types';

/**
 * AgentManifestPage Component
 * Dashboard page for the Agent Manifest Generator feature
 * Allows users to generate logos.json semantic topology files for their websites
 */
const AgentManifestPage = () => {
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<LogosJSON | null>(null);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // SEO metadata configuration
  const seoMetadata = {
    title: 'Agent Manifest Generator | Anóteros Lógos',
    description: 'Generate a logos.json semantic topology file for your website. Help AI agents understand and navigate your content structure, improving AI visibility and citation potential in the agentic web.',
    url: 'https://anoteroslogos.com/agent-manifest',
    type: 'website' as const,
    keywords: 'agent manifest, logos.json, semantic topology, AI agents, agentic web, AI visibility, website structure, semantic web, AI discovery, agent identity',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Agent Manifest Generator',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web Browser',
      description: 'Generate a logos.json semantic topology file for your website. Help AI agents understand and navigate your content structure, improving AI visibility and citation potential.',
      url: 'https://anoteroslogos.com/agent-manifest',
      provider: {
        '@type': 'Organization',
        name: 'Anóteros Lógos',
        url: 'https://anoteroslogos.com'
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      featureList: [
        'Generate standardized logos.json files',
        'AI-powered semantic topology mapping',
        'Improve AI agent discoverability',
        'Enhance citation potential',
        'Download or copy generated manifests',
        'Validate against logos.json schema'
      ],
      screenshot: 'https://anoteroslogos.com/images/og-image.jpg',
      softwareHelp: {
        '@type': 'CreativeWork',
        url: 'https://anoteroslogos.com/agent-manifest'
      }
    }
  };

  /**
   * Validates URL format
   * Accepts URLs with or without protocol
   */
  const validateUrl = (url: string): { isValid: boolean; error?: string } => {
    if (!url.trim()) {
      return { isValid: false, error: 'Please enter a website URL' };
    }

    try {
      // Add protocol if missing
      const urlToTest = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
      
      new URL(urlToTest);
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid URL format. Please enter a valid website URL.' };
    }
  };

  /**
   * Handles URL input changes
   */
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setError('');
  };

  /**
   * Handles manifest generation
   * Validates input, calls API, and updates state
   */
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous state
    setError('');
    setResult(null);
    setCopySuccess(false);

    // Validate URL
    const validation = validateUrl(url);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    // Normalize URL (add protocol if missing)
    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;

    setIsGenerating(true);

    try {
      console.log('[AgentManifest] Starting request to /api/tools');
      console.log('[AgentManifest] Request payload:', { tool: 'agent-manifest', url: normalizedUrl });
      
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tool: 'agent-manifest',
          url: normalizedUrl 
        }),
      });

      console.log('[AgentManifest] Response status:', response.status);
      console.log('[AgentManifest] Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[AgentManifest] Invalid content-type:', contentType);
        throw new Error('AI service is currently unavailable. Please try again later.');
      }

      const data = await response.json();
      console.log('[AgentManifest] Response data:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate manifest');
      }

      setResult(data.data.manifest);
      setError('');
    } catch (err) {
      console.error('[AgentManifest] Error:', err);
      console.error('[AgentManifest] Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('[AgentManifest] Error message:', err instanceof Error ? err.message : String(err));
      
      let errorMessage = 'Failed to generate manifest';
      
      if (err instanceof TypeError) {
        // Network errors are typically TypeErrors
        errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setResult(null);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handles download of logos.json file
   */
  const handleDownload = () => {
    if (!result) return;

    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'logos.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Handles copying JSON to clipboard
   */
  const handleCopy = async () => {
    if (!result) return;

    try {
      const jsonString = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    } catch (err) {
      setError('Failed to copy to clipboard. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black/40">
      {/* SEO Metadata */}
      <SEOHead {...seoMetadata} />
      
      {/* Hero Section */}
      <section className="relative pb-12 md:pb-16 overflow-hidden pt-8">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent)]"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          {/* Badge */}
          <div className="flex justify-start mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
              <FileJson className="w-4 h-4 text-brand-accent" />
              <span className="font-mono text-xs tracking-wider uppercase text-brand-accent">
                Identity Layer
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
              Generate Agent Manifest
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-white/70 mb-8 max-w-2xl">
            Create a logos.json semantic topology file for your domain
          </p>

          {/* Input Form */}
          <form onSubmit={handleGenerate} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
              <input
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com"
                disabled={isGenerating}
                className="flex-1 bg-brand-secondary/20 border border-brand-secondary/40 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/50 rounded-xl px-6 py-4 text-base outline-none transition-colors placeholder:text-brand-text/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-brand-accent"
                aria-label="Website URL input field"
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? "url-error" : undefined}
              />
              <button
                type="submit"
                disabled={isGenerating}
                aria-label={isGenerating ? "Generating manifest, please wait" : "Generate agent manifest"}
                aria-busy={isGenerating}
                className="bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-0.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-black/40"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Generating...</span>
                  </>
                ) : (
                  'Crystallize Logos'
                )}
              </button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <div 
              id="url-error"
              className="max-w-2xl p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-3"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="max-w-2xl text-left" role="status" aria-live="polite" aria-atomic="true">
              <p className="text-white/60 animate-pulse">
                <span className="sr-only">Loading: </span>
                Generating your semantic topology...
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      {result && (
        <section className="py-8 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Screen reader announcement for successful generation */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              Manifest generated successfully. You can now download or copy the manifest.
            </div>
            
            {/* Output Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Generated Manifest</h2>
              
              {/* Action Buttons */}
              <div className="flex gap-3" role="group" aria-label="Manifest actions">
                <button
                  onClick={handleDownload}
                  aria-label="Download logos.json file"
                  className="px-4 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-lg text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/20 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-black"
                >
                  Download logos.json
                </button>
                <button
                  onClick={handleCopy}
                  aria-label={copySuccess ? "Copied to clipboard" : "Copy manifest to clipboard"}
                  aria-live="polite"
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
                >
                  {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>

            {/* JSON Display */}
            <JSONDisplay json={result} />

            {/* Success Notification */}
            {copySuccess && (
              <div 
                className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                ✓ Copied to clipboard successfully!
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default AgentManifestPage;
