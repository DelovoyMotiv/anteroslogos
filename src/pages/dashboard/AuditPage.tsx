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
  History,
  ExternalLink,
  Clock,
  BarChart3,
  Lightbulb,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { DetailedMetrics } from './audit/DetailedMetrics';
import { TabContainer, TabButton, TabContent, MobileTabDropdown, OverviewTab, AnalysisTab, InsightsTab } from './audit/tabs';
import type { MobileTab } from './audit/tabs';
import { useAuditNavigation } from './audit/hooks/useAuditNavigation';
import { useSwipeGesture, getAdjacentTab } from './audit/hooks/useSwipeGesture';
import type { TabId } from './audit/hooks/useAuditNavigation';

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
  const { state, setActiveTab } = useAuditNavigation();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [savedAudits, setSavedAudits] = useState<SavedAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Define tab order for swipe navigation
  const tabOrder: TabId[] = ['overview', 'analysis', 'insights', 'technical'];

  // Mobile tab data for dropdown
  const mobileTabs: MobileTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 className="w-4 h-4" />,
      ariaLabel: 'Overview tab - View summary and key metrics',
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: <Search className="w-4 h-4" />,
      badge: 11,
      ariaLabel: 'Analysis tab - Detailed category breakdown (11 categories)',
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: <Lightbulb className="w-4 h-4" />,
      ariaLabel: 'Insights tab - AI recommendations and action items',
    },
    {
      id: 'technical',
      label: 'Technical',
      icon: <Settings className="w-4 h-4" />,
      ariaLabel: 'Technical tab - Raw data and technical details',
    },
  ];

  // Swipe gesture handlers for mobile
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => {
      // Swipe left = next tab
      const nextTab = getAdjacentTab(tabOrder, state.activeTab, 'next');
      setActiveTab(nextTab);
    },
    onSwipeRight: () => {
      // Swipe right = previous tab
      const prevTab = getAdjacentTab(tabOrder, state.activeTab, 'previous');
      setActiveTab(prevTab);
    },
    threshold: 50,
    maxVerticalMovement: 100,
    minVelocity: 0.3,
  });

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
      {/* Header with enhanced styling */}
      <div className="border-b border-slate-800/50 pb-4 mb-1">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 animate-pulse" />
          <h1 className="text-base font-semibold text-slate-100 tracking-tight uppercase">
            GEO Audit
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-mono leading-relaxed">
          Analyze website visibility for Generative AI engines
        </p>
      </div>

      {/* Audit Form with enhanced styling */}
      <form onSubmit={handleAnalyze} className="space-y-3">
        <div className="bg-black/20 border border-slate-800/50 p-4 md:p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
          <label htmlFor="url" className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
            Website URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="
                flex-1 px-4 py-2.5 
                bg-black/40 border border-slate-700/50 rounded-lg
                text-slate-200 text-sm font-mono 
                placeholder:text-slate-600 
                focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                transition-all duration-300
                hover:border-slate-600/50
              "
              required
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={isAnalyzing || !url}
              className="
                px-6 py-2.5 
                bg-blue-600 hover:bg-blue-500 
                disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed
                text-white text-sm font-medium uppercase tracking-wider 
                rounded-lg shadow-lg hover:shadow-xl
                transition-all duration-300 ease-out
                flex items-center justify-center gap-2
                hover:scale-[1.02] active:scale-[0.98]
                transform
              "
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display with enhanced styling */}
        {error && (
          <div className="
            bg-red-950/20 border border-red-500/30 
            p-3 md:p-4 rounded-lg
            flex items-start gap-3
            shadow-lg shadow-red-500/10
            animate-in fade-in slide-in-from-top-2 duration-300
          ">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-xs md:text-sm font-mono text-red-400 leading-relaxed">{error}</p>
            </div>
          </div>
        )}
      </form>

      {/* Audit Results */}
      {result && (
        <div className="space-y-4">
          {/* Mobile Tab Dropdown - Visible only on mobile */}
          <div className="md:hidden mb-4">
            <MobileTabDropdown
              tabs={mobileTabs}
              activeTab={state.activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Desktop Tab Navigation - Hidden on mobile */}
          <TabContainer>
            <TabButton
              id="overview"
              label="Overview"
              icon={<BarChart3 className="w-4 h-4" />}
              isActive={state.activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              ariaLabel="Overview tab - View summary and key metrics"
            />
            <TabButton
              id="analysis"
              label="Analysis"
              icon={<Search className="w-4 h-4" />}
              isActive={state.activeTab === 'analysis'}
              onClick={() => setActiveTab('analysis')}
              badge={11}
              ariaLabel="Analysis tab - Detailed category breakdown (11 categories)"
            />
            <TabButton
              id="insights"
              label="Insights"
              icon={<Lightbulb className="w-4 h-4" />}
              isActive={state.activeTab === 'insights'}
              onClick={() => setActiveTab('insights')}
              ariaLabel="Insights tab - AI recommendations and action items"
            />
            <TabButton
              id="technical"
              label="Technical"
              icon={<Settings className="w-4 h-4" />}
              isActive={state.activeTab === 'technical'}
              onClick={() => setActiveTab('technical')}
              ariaLabel="Technical tab - Raw data and technical details"
            />
          </TabContainer>

          {/* Tab Content with Swipe Gesture Support */}
          <div {...swipeHandlers}>
            {/* Overview Tab */}
            <TabContent isActive={state.activeTab === 'overview'}>
              <OverviewTab result={result} />
            </TabContent>

            {/* Analysis Tab */}
            <TabContent isActive={state.activeTab === 'analysis'}>
              <AnalysisTab result={result} />
            </TabContent>

            {/* Insights Tab */}
            <TabContent isActive={state.activeTab === 'insights'}>
              <InsightsTab result={result} />
            </TabContent>

            {/* Technical Tab */}
            <TabContent isActive={state.activeTab === 'technical'}>
              <div className="space-y-4">
                <div className="bg-black/20 border border-slate-800/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                      Technical Details & Metrics
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Comprehensive technical analysis including all category metrics, AID protocol details, and raw data.
                  </p>
                </div>

                {/* Detailed Metrics - All Category Metrics */}
                <DetailedMetrics result={result} />
              </div>
            </TabContent>
          </div>
        </div>
      )}

      {/* Audit History with enhanced styling */}
      <div className="bg-black/20 border border-slate-800/50 p-4 md:p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-2.5 mb-4">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
            Recent Audits
          </h3>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : savedAudits.length === 0 ? (
          <div className="text-center py-10">
            <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-3 opacity-50" />
            <p className="text-xs text-slate-600 font-mono">No audit history yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {savedAudits.map((audit, idx) => (
              <div
                key={audit.id}
                className="
                  bg-black/30 border border-slate-800/30 
                  p-3 md:p-4 rounded-lg
                  flex items-center justify-between 
                  hover:border-slate-700/50 hover:bg-black/40
                  transition-all duration-300 ease-out
                  cursor-pointer
                  hover:scale-[1.01] hover:shadow-lg
                  transform
                  animate-in fade-in slide-in-from-left-2
                  group
                "
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => {
                  setUrl(audit.url);
                  toast.info('URL loaded. Click Analyze to re-audit.');
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`
                      text-base md:text-lg font-bold font-mono ${getScoreColor(audit.overall_score)}
                      transition-transform duration-300 group-hover:scale-110
                    `}>
                      {audit.overall_score.toFixed(3)}
                    </span>
                    <span className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">
                      {audit.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono group-hover:text-slate-500 transition-colors">
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
                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-all duration-300 group-hover:scale-110" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}





export default AuditPage;
