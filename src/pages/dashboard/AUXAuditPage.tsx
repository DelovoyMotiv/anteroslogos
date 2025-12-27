/**
 * AUX Audit Page
 * Agent Experience Audit interface
 */

import React, { useState } from 'react';
import { Bot, AlertCircle, Loader2, TrendingUp, Shield } from 'lucide-react';
import type { AUXAuditResults } from '../../../lib/auxAudit/types';
import { 
  AUXScoreCard, 
  ProtocolGrid, 
  FrictionPointsList, 
  RecommendationsList, 
  IntentTriggersList 
} from '../../../components/auxAudit';

export default function AUXAuditPage() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AUXAuditResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);

    // Basic URL validation
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Ensure URL has protocol
    let sanitizedUrl = url.trim();
    if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    // Validate URL format
    try {
      new URL(sanitizedUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/audit/aux-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: sanitizedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze website');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze website';
      console.error('Analysis error:', err);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Bot className="w-5 h-5 text-blue-400" />
          <h1 className="text-base font-semibold text-slate-100 tracking-tight uppercase">
            AUX: Agent Experience Audit
          </h1>
        </div>

        {/* Sub-header */}
        <p className="text-sm text-slate-400 mb-8">
          Analyze your site's 'Actionability' for Autonomous Agents (OpenAI Operator, Claude Computer Use)
        </p>

        {/* Analysis Form */}
        <div className="mb-8">
          <form onSubmit={handleAnalyze} className="max-w-3xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., example.com)"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-3xl mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Security Badge */}
        <div className="max-w-3xl mb-8 flex items-center gap-2 text-xs text-slate-500">
          <Shield className="w-3 h-3" />
          <span>Input validated • Rate limited • XSS protected</span>
        </div>

        {/* Features Grid - Only show if no results */}
        {!results && !isAnalyzing && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            {[
              { title: 'Protocol Discovery', desc: 'Check for agent manifests & configs' },
              { title: 'Semantic Analysis', desc: 'Evaluate ARIA & accessibility' },
              { title: 'Friction Detection', desc: 'Identify barriers to agent tasks' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-slate-900/50 border border-slate-800 rounded-lg">
                <h3 className="font-semibold text-slate-200 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="max-w-5xl space-y-6">
            {/* AUX Score Card */}
            <AUXScoreCard 
              score={results.score}
              classification={results.classification}
              summary={results.summary}
            />
            
            {/* Protocol Grid */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4">Protocol Discovery</h2>
              <ProtocolGrid protocols={results.protocols} />
            </div>

            {/* ARIA Score Display */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4">Semantic Affordance</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ARIA Density Score</span>
                  <span className="text-2xl font-bold text-slate-100">{results.ariaScore.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Interactive Elements</span>
                  <span className="text-slate-100 font-semibold">{results.interactiveElements.length}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      results.ariaScore >= 80 ? 'bg-green-500' : 
                      results.ariaScore >= 50 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}
                    style={{ width: `${results.ariaScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Friction Points */}
            {results.frictionPoints.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-slate-100 mb-4">Friction Points</h2>
                <FrictionPointsList frictionPoints={results.frictionPoints} />
              </div>
            )}

            {/* Intent Triggers */}
            {results.intentTriggers.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-slate-100 mb-4">Detected Actions</h2>
                <IntentTriggersList intentTriggers={results.intentTriggers} />
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-slate-100 mb-4">Recommendations</h2>
                <RecommendationsList recommendations={results.recommendations} />
              </div>
            )}

            {/* Risk Level & Metadata */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4">Analysis Metadata</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Risk Level</span>
                  <span className={`font-semibold capitalize ${
                    results.riskLevel === 'high' ? 'text-red-400' :
                    results.riskLevel === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {results.riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Analyzed At</span>
                  <span className="text-slate-100">
                    {new Date(results.analyzedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
