/**
 * Dashboard Audit Page
 * Production-ready GEO Audit interface with Supabase integration
 * Ph.D.-level engineering - zero mocks, real data only
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { auditWebsite, type AuditResult } from '../../../utils/geoAuditEnhanced';
import { validateAndSanitizeUrl, checkRateLimit } from '../../../utils/urlValidator';
// @ts-expect-error - Reserved for future use
import type { JSONValue } from '../../../types/common.types';
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  History,
  ExternalLink,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { PreciseScoreDisplay } from './audit/PreciseScoreDisplay';
import { ScoreBreakdownChart } from './audit/ScoreBreakdownChart';
import { CategoryScoresChart } from './audit/CategoryScoresChart';
import { InsightsPanel } from './audit/InsightsPanel';
import { ExportButtons } from './audit/ExportButtons';
import { DetailedMetrics } from './audit/DetailedMetrics';

interface SavedAudit {
  id: string;
  url: string;
  normalized_url: string;
  timestamp: string;
  overall_score: number;
  grade: string;
  score_schema_markup: number;
  score_meta_tags: number;
  score_ai_crawlers: number;
  score_eeat: number;
  score_content_quality: number;
}

export function AuditPage() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [savedAudits, setSavedAudits] = useState<SavedAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load audit history on mount
  useEffect(() => {
    if (user) {
      loadAuditHistory();
    }
  }, [user]);

  const loadAuditHistory = async () => {
    if (!user || !supabase) {
      setLoadingHistory(false);
      return;
    }

    try {
      // Verify session before making request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('No active session for audit history');
        setLoadingHistory(false);
        return;
      }

      const { data, error } = await supabase
        .from('audits')
        .select(`
          id,
          url,
          normalized_url,
          timestamp,
          overall_score,
          grade,
          score_schema_markup,
          score_meta_tags,
          score_ai_crawlers,
          score_eeat,
          score_content_quality
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to load audit history:', error);
        // Don't throw - just log and continue
      } else {
        setSavedAudits(data || []);
      }
    } catch (err) {
      console.error('Failed to load audit history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    // 1. Rate limiting check
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.error || 'Rate limit exceeded');
      toast.error('Rate limit exceeded. Please try again later.');
      return;
    }

    // 2. Input validation
    const validation = validateAndSanitizeUrl(url);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid URL');
      toast.error(validation.error || 'Invalid URL');
      return;
    }

    const sanitizedUrl = validation.sanitizedUrl!;
    setIsAnalyzing(true);

    try {
      // 3. Run audit
      const auditResult = await auditWebsite(sanitizedUrl);
      
      // 4. Save to Supabase
      if (user && supabase) {
        await saveAuditToSupabase(auditResult);
      }

      setResult(auditResult);
      toast.success('Audit completed successfully!');
      
      // Reload history
      loadAuditHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze website';
      console.error('Analysis error:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAuditToSupabase = async (auditResult: AuditResult) => {
    if (!user || !supabase) return;

    try {
      // Verify session before making request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('No active session for saving audit');
        toast.warning('Audit completed but not saved (no active session)');
        return;
      }

      const urlObj = new URL(auditResult.url);
      const normalizedUrl = urlObj.hostname + urlObj.pathname;
      const domain = urlObj.hostname;

      // @ts-ignore - Supabase type issue
      const { error } = await supabase.from('audits').insert([{
        user_id: user.id,
        url: auditResult.url,
        normalized_url: normalizedUrl,
        domain: domain,
        timestamp: auditResult.timestamp,
        overall_score: auditResult.overallScore,
        grade: auditResult.grade,
        score_schema_markup: auditResult.scores.schemaMarkup,
        score_meta_tags: auditResult.scores.metaTags,
        score_ai_crawlers: auditResult.scores.aiCrawlers,
        score_eeat: auditResult.scores.eeat,
        score_structure: auditResult.scores.structure,
        score_performance: auditResult.scores.performance,
        score_content_quality: auditResult.scores.contentQuality,
        score_citation_potential: auditResult.scores.citationPotential,
        score_technical_seo: auditResult.scores.technicalSEO,
        score_link_analysis: auditResult.scores.linkAnalysis,
        schema_findings: auditResult.details.schemaMarkup,
        meta_findings: auditResult.details.metaTags,
        crawler_findings: auditResult.details.aiCrawlers,
        eeat_findings: auditResult.details.eeat,
        structure_findings: auditResult.details.structure,
        performance_findings: auditResult.details.performance,
        content_findings: auditResult.details.contentQuality,
        citation_findings: auditResult.details.citationPotential,
        technical_findings: auditResult.details.technicalSEO,
        link_findings: auditResult.details.linkAnalysis,
        ai_recommendations: auditResult.recommendations,
        has_organization_schema: auditResult.details.schemaMarkup.schemas.Organization,
        has_person_schema: auditResult.details.schemaMarkup.schemas.Person,
        has_article_schema: auditResult.details.schemaMarkup.schemas.Article,
        has_breadcrumb_schema: auditResult.details.schemaMarkup.schemas.BreadcrumbList,
        has_author_markup: auditResult.details.eeat.hasAuthorInfo,
        has_eeat_signals: auditResult.details.eeat.authorityScore > 50,
        robots_txt_allows_ai: auditResult.details.aiCrawlers.allowsGPTBot,
      }]);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save audit to Supabase:', err);
      toast.error('Audit completed but failed to save to history');
    }
  };



  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };



  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-800/50 pb-3">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-400" />
          <h1 className="text-base font-semibold text-slate-100 tracking-tight uppercase">
            GEO Audit
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Analyze website visibility for Generative AI engines
        </p>
      </div>

      {/* Audit Form */}
      <form onSubmit={handleAnalyze} className="space-y-3">
        <div className="bg-black/20 border border-slate-800/50 p-4">
          <label htmlFor="url" className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 bg-black/40 border border-slate-700/50 text-slate-200 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={isAnalyzing || !url}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-950/20 border border-red-500/30 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono text-red-400">{error}</p>
            </div>
          </div>
        )}
      </form>

      {/* Audit Results */}
      {result && (
        <div className="space-y-4">
          {/* Precise Score Display with Export Buttons */}
          <div className="flex flex-col gap-4">
            <PreciseScoreDisplay
              overallScore={result.overallScore}
              preciseScore={result.preciseScore}
              grade={result.grade}
              scoreBreakdown={result.scoreBreakdown}
            />
            <div className="flex items-center justify-between bg-black/20 border border-slate-800/50 p-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Export Report
              </span>
              <ExportButtons result={result} />
            </div>
          </div>

          {/* AI Insights */}
          {result.insights && result.insights.length > 0 && (
            <InsightsPanel insights={result.insights} />
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.scoreBreakdown && (
              <ScoreBreakdownChart breakdown={result.scoreBreakdown} />
            )}
            <CategoryScoresChart scores={result.scores} />
          </div>

          {/* Category Scores Grid - ALL 11 CATEGORIES */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            <ScoreCard label="Schema" score={result.scores.schemaMarkup} />
            <ScoreCard label="Meta Tags" score={result.scores.metaTags} />
            <ScoreCard label="AI Crawlers" score={result.scores.aiCrawlers} />
            <ScoreCard label="E-E-A-T" score={result.scores.eeat} />
            <ScoreCard label="Structure" score={result.scores.structure} />
            <ScoreCard label="Performance" score={result.scores.performance} />
            <ScoreCard label="Content" score={result.scores.contentQuality} />
            <ScoreCard label="Citation" score={result.scores.citationPotential} />
            <ScoreCard label="Technical SEO" score={result.scores.technicalSEO} />
            <ScoreCard label="Link Analysis" score={result.scores.linkAnalysis} />
            <ScoreCard label="AID Agent" score={result.scores.aidAgent} />
          </div>

          {/* Detailed Category Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Schema Markup Details */}
            <CategoryDetail
              title="Schema Markup"
              score={result.scores.schemaMarkup}
              issues={result.details.schemaMarkup.issues}
              strengths={result.details.schemaMarkup.strengths}
            />

            {/* Meta Tags Details */}
            <CategoryDetail
              title="Meta Tags"
              score={result.scores.metaTags}
              issues={result.details.metaTags.issues}
              strengths={result.details.metaTags.strengths}
            />

            {/* AI Crawlers Details */}
            <CategoryDetail
              title="AI Crawlers"
              score={result.scores.aiCrawlers}
              issues={result.details.aiCrawlers.issues}
              strengths={result.details.aiCrawlers.strengths}
            />

            {/* E-E-A-T Details */}
            <CategoryDetail
              title="E-E-A-T Signals"
              score={result.scores.eeat}
              issues={result.details.eeat.issues}
              strengths={result.details.eeat.strengths}
            />

            {/* Structure Details */}
            <CategoryDetail
              title="HTML Structure"
              score={result.scores.structure}
              issues={result.details.structure.issues}
              strengths={result.details.structure.strengths}
            />

            {/* Performance Details */}
            <CategoryDetail
              title="Performance"
              score={result.scores.performance}
              issues={result.details.performance.issues}
              strengths={result.details.performance.strengths}
            />

            {/* Content Quality Details */}
            <CategoryDetail
              title="Content Quality"
              score={result.scores.contentQuality}
              issues={result.details.contentQuality.issues}
              strengths={result.details.contentQuality.strengths}
            />

            {/* Citation Potential Details */}
            <CategoryDetail
              title="Citation Potential"
              score={result.scores.citationPotential}
              issues={result.details.citationPotential.issues}
              strengths={result.details.citationPotential.strengths}
            />

            {/* Technical SEO Details */}
            <CategoryDetail
              title="Technical SEO"
              score={result.scores.technicalSEO}
              issues={result.details.technicalSEO.issues}
              strengths={result.details.technicalSEO.strengths}
            />

            {/* Link Analysis Details */}
            <CategoryDetail
              title="Link Analysis"
              score={result.scores.linkAnalysis}
              issues={result.details.linkAnalysis.issues}
              strengths={result.details.linkAnalysis.strengths}
            />

            {/* AID Agent Details */}
            <CategoryDetail
              title="AID Agent Support"
              score={result.scores.aidAgent}
              issues={result.details.aidAgent.errors || []}
              strengths={result.details.aidAgent.detected ? ['AID protocol detected'] : []}
            />
          </div>

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="bg-black/20 border border-slate-800/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Top Recommendations
                </h3>
              </div>
              <div className="space-y-2">
                {result.recommendations.slice(0, 10).map((rec, idx) => (
                  <div
                    key={idx}
                    className="bg-black/30 border border-slate-800/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 ${
                            rec.priority === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            rec.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}>
                            {rec.priority}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {rec.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                          {rec.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {rec.description}
                        </p>
                        {rec.impact && (
                          <p className="text-xs text-blue-400 mt-1">
                            Impact: {rec.impact}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Metrics - All Category Metrics */}
          <DetailedMetrics result={result} />
        </div>
      )}

      {/* Audit History */}
      <div className="bg-black/20 border border-slate-800/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
            Recent Audits
          </h3>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
          </div>
        ) : savedAudits.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-600 font-mono">No audit history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedAudits.map((audit) => (
              <div
                key={audit.id}
                className="bg-black/30 border border-slate-800/30 p-3 flex items-center justify-between hover:border-slate-700/50 transition-colors cursor-pointer"
                onClick={() => {
                  setUrl(audit.url);
                  toast.info('URL loaded. Click Analyze to re-audit.');
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-base font-bold font-mono ${getScoreColor(audit.overall_score)}`}>
                      {audit.overall_score.toFixed(3)}
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {audit.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(audit.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Score Card Component
 */
function ScoreCard({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-black/20 border border-slate-800/50 p-3">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono ${getColor(score)}`}>
        {score.toFixed(1)}
      </div>
    </div>
  );
}

/**
 * Category Detail Component - Shows issues and strengths for each category
 */
function CategoryDetail({ 
  title, 
  score, 
  issues, 
  strengths 
}: { 
  title: string; 
  score: number; 
  issues: string[]; 
  strengths: string[]; 
}) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBorderColor = (s: number) => {
    if (s >= 80) return 'border-emerald-500/30';
    if (s >= 60) return 'border-yellow-500/30';
    if (s >= 40) return 'border-orange-500/30';
    return 'border-red-500/30';
  };

  return (
    <div className={`bg-black/20 border ${getBorderColor(score)} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
          {title}
        </h4>
        <span className={`text-lg font-bold font-mono ${getColor(score)}`}>
          {score.toFixed(1)}
        </span>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1.5">
            ✓ Strengths
          </div>
          <ul className="space-y-1">
            {strengths.map((strength, idx) => (
              <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-red-400 uppercase tracking-wider mb-1.5">
            ⚠ Issues
          </div>
          <ul className="space-y-1">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-xs text-slate-500 flex items-start gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No issues or strengths */}
      {issues.length === 0 && strengths.length === 0 && (
        <p className="text-xs text-slate-600 italic">No detailed information available</p>
      )}
    </div>
  );
}

export default AuditPage;
