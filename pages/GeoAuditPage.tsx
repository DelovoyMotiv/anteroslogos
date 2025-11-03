import { useState } from 'react';
import { auditWebsite, type AuditResult } from '../utils/geoAudit';
import { Search, AlertCircle, CheckCircle, TrendingUp, Download, Share2, ExternalLink } from 'lucide-react';

const GeoAuditPage = () => {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const auditResult = await auditWebsite(url);
      setResult(auditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze website');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number): string => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  const downloadReport = () => {
    if (!result) return;
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `geo-audit-${new URL(result.url).hostname}-${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const shareResults = () => {
    if (!result) return;
    const text = `I analyzed ${result.url} with GEO Audit Tool and got a score of ${result.overallScore}/100! Check your site's AI optimization: https://anoteroslogos.com/geo-audit`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent)]"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
            <TrendingUp className="w-4 h-4 text-brand-accent" />
            <span className="font-mono text-xs tracking-wider uppercase text-brand-accent">Free GEO Analysis Tool</span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
              GEO Score Calculator
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Instantly analyze your website's readiness for AI-powered search. Get a comprehensive GEO score with actionable recommendations.
          </p>

          {/* Analysis Form */}
          <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your website URL (e.g., example.com)"
                className="w-full px-6 py-5 pr-32 bg-white/5 border-2 border-brand-secondary focus:border-brand-accent rounded-xl text-lg focus:outline-none transition-colors"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-accent hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { title: 'Schema Analysis', desc: 'Check JSON-LD structured data' },
              { title: 'AI Crawler Support', desc: 'Verify robots.txt for AI bots' },
              { title: 'E-E-A-T Signals', desc: 'Measure expertise & authority' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      {result && (
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Overall Score */}
            <div className="mb-12 p-8 bg-gradient-to-br from-brand-secondary/30 to-transparent border border-brand-accent/30 rounded-2xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Overall GEO Score</h2>
                  <p className="text-white/60">Analyzed: {new URL(result.url).hostname}</p>
                </div>
                <div className="text-center">
                  <div className={`text-7xl font-bold ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore}
                  </div>
                  <div className="text-white/40 text-sm mt-1">out of 100</div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={downloadReport}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-brand-secondary hover:border-brand-accent rounded-lg transition-all"
                    title="Download Report"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={shareResults}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-brand-secondary hover:border-brand-accent rounded-lg transition-all"
                    title="Share Results"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6">Score Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(result.scores).map(([key, score]) => (
                  <div key={key} className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${getScoreGradient(score)} transition-all duration-1000`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {Object.entries(result.details).map(([category, details]) => (
                <div key={category} className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
                  <h4 className="text-xl font-bold mb-4 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  
                  {details.strengths.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-green-400 font-semibold mb-2">✓ Strengths</p>
                      <ul className="space-y-1">
                        {details.strengths.map((strength, i) => (
                          <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {details.issues.length > 0 && (
                    <div>
                      <p className="text-sm text-orange-400 font-semibold mb-2">⚠ Issues</p>
                      <ul className="space-y-1">
                        {details.issues.map((issue, i) => (
                          <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-6">Action Plan</h3>
                <div className="space-y-4">
                  {result.recommendations.map((rec, i) => (
                    <div 
                      key={i} 
                      className={`p-6 border rounded-xl ${
                        rec.priority === 'high' 
                          ? 'bg-red-500/5 border-red-500/30' 
                          : rec.priority === 'medium'
                          ? 'bg-yellow-500/5 border-yellow-500/30'
                          : 'bg-blue-500/5 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          rec.priority === 'high'
                            ? 'bg-red-500/20 text-red-400'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {rec.priority}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold">{rec.title}</h4>
                            <span className="text-xs text-white/40">• {rec.category}</span>
                          </div>
                          <p className="text-white/70 mb-3">{rec.description}</p>
                          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-sm text-brand-accent">💡 Impact: {rec.impact}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-16 p-8 bg-gradient-to-br from-brand-accent/10 to-transparent border border-brand-accent/30 rounded-2xl text-center">
              <h3 className="text-2xl font-bold mb-4">Need Expert Help?</h3>
              <p className="text-white/70 mb-6 max-w-2xl mx-auto">
                Our GEO specialists can implement these recommendations and transform your website into an AI-cited authority in your industry.
              </p>
              <a 
                href="/#contact"
                className="inline-flex items-center gap-2 bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all"
              >
                Schedule Consultation
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16 px-6 bg-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">How GEO Score Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Schema Markup (25%)', desc: 'Evaluates JSON-LD structured data for Organization, Person, Article, and other AI-friendly schemas' },
              { title: 'AI Crawlers (20%)', desc: 'Checks robots.txt support for GPTBot, Claude, Perplexity, and other AI systems' },
              { title: 'E-E-A-T (20%)', desc: 'Measures Experience, Expertise, Authoritativeness, and Trustworthiness signals' },
              { title: 'Meta Tags (15%)', desc: 'Analyzes title, description, Open Graph, and Twitter Card optimization' },
              { title: 'Structure (10%)', desc: 'Assesses HTML semantics, heading hierarchy, and accessibility' },
              { title: 'Performance (10%)', desc: 'Evaluates page size, external resources, and loading optimization' }
            ].map((item, i) => (
              <div key={i} className="text-left">
                <h4 className="font-bold text-brand-accent mb-2">{item.title}</h4>
                <p className="text-sm text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default GeoAuditPage;
