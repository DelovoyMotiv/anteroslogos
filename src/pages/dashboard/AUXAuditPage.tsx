/**
 * AUX Audit Page - Technical Brutalist Design
 * Industrial Control System aesthetic
 */

import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
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

    if (!url.trim()) {
      setError('URL required');
      return;
    }

    let sanitizedUrl = url.trim();
    if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    try {
      new URL(sanitizedUrl);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/audit/aux-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sanitizedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      console.error('Analysis error:', err);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - Minimal */}
        <div className="mb-6 border-b border-slate-800 pb-3">
          <h1 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
            SYSTEM: AGENT EXPERIENCE AUDIT
          </h1>
          <p className="text-[10px] font-mono text-slate-600">
            Autonomous Agent Actionability Analysis
          </p>
        </div>

        {/* Analysis Form - Compact */}
        <div className="mb-4">
          <form onSubmit={handleAnalyze} className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="TARGET_URL"
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-blue-600 transition-colors"
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-6 py-2 bg-blue-600 text-white text-xs font-mono uppercase tracking-wider hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>ANALYZING</span>
                </>
              ) : (
                <span>EXECUTE</span>
              )}
            </button>
          </form>
        </div>

        {/* Error Display - Compact */}
        {error && (
          <div className="mb-4 p-2 bg-red-950/50 border border-red-900 text-red-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>ERROR: {error}</span>
          </div>
        )}

        {/* Results Section - Dense Layout */}
        {results && (
          <div className="space-y-3">
            {/* Score Card - Compact */}
            <AUXScoreCard 
              score={results.score}
              classification={results.classification}
              summary={results.summary}
            />
            
            {/* Data Grid - 2 Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Left Column */}
              <div className="space-y-3">
                {/* Protocol Discovery */}
                <div className="bg-slate-950 border border-slate-800 p-3">
                  <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                    PROTOCOL_DISCOVERY
                  </h2>
                  <ProtocolGrid protocols={results.protocols} />
                </div>

                {/* Semantic Affordance - Compact */}
                <div className="bg-slate-950 border border-slate-800 p-3">
                  <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                    SEMANTIC_AFFORDANCE
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600">ARIA_DENSITY</span>
                      <span className="font-mono text-slate-100">{results.ariaScore.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600">INTERACTIVE_ELEMENTS</span>
                      <span className="font-mono text-slate-100">{results.interactiveElements.length}</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1">
                      <div 
                        className={`h-1 transition-all ${
                          results.ariaScore >= 80 ? 'bg-green-500' : 
                          results.ariaScore >= 50 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${results.ariaScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metadata - Compact */}
                <div className="bg-slate-950 border border-slate-800 p-3">
                  <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                    METADATA
                  </h2>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-600">RISK_LEVEL</span>
                      <span className={`font-mono uppercase ${
                        results.riskLevel === 'high' ? 'text-red-400' :
                        results.riskLevel === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {results.riskLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-600">TIMESTAMP</span>
                      <span className="font-mono text-slate-400">
                        {new Date(results.analyzedAt).toISOString().slice(0, 19).replace('T', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* Friction Points */}
                {results.frictionPoints.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 p-3">
                    <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                      FRICTION_POINTS
                    </h2>
                    <FrictionPointsList frictionPoints={results.frictionPoints} />
                  </div>
                )}

                {/* Intent Triggers */}
                {results.intentTriggers.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 p-3">
                    <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                      DETECTED_ACTIONS
                    </h2>
                    <IntentTriggersList intentTriggers={results.intentTriggers} />
                  </div>
                )}

                {/* Recommendations */}
                {results.recommendations.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 p-3">
                    <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                      RECOMMENDATIONS
                    </h2>
                    <RecommendationsList recommendations={results.recommendations} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
