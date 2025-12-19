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
import { prepareAuditData, validatePreparedData } from '../../../utils/auditDataPreparation';
import { retryWithBackoff } from '../../../utils/retryWithBackoff';
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
  score_structure: number;
  score_performance: number;
  score_citation_potential: number;
  score_technical_seo: number;
  score_link_analysis: number;
  schema_findings: any;
  meta_findings: any;
  crawler_findings: any;
  eeat_findings: any;
  structure_findings: any;
  performance_findings: any;
  content_findings: any;
  citation_findings: any;
  technical_findings: any;
  link_findings: any;
  ai_recommendations: any[];
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
  const [loadingAudit, setLoadingAudit] = useState(false);

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
    console.log('=== LOAD AUDIT HISTORY START ===');
    console.log('User:', user ? { id: user.id, email: user.email } : 'null');
    console.log('Supabase configured:', !!supabase);
    
    if (!user || !supabase) {
      console.log('Cannot load history: user or supabase is null');
      setLoadingHistory(false);
      return;
    }

    try {
      // Verify session before making request
      console.log('Checking session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check result:', {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userId: session?.user?.id,
      });
      
      if (sessionError || !session) {
        console.warn('No active session for audit history');
        setLoadingHistory(false);
        return;
      }

      console.log('Querying audits table...');
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
          score_content_quality,
          score_structure,
          score_performance,
          score_citation_potential,
          score_technical_seo,
          score_link_analysis,
          schema_findings,
          meta_findings,
          crawler_findings,
          eeat_findings,
          structure_findings,
          performance_findings,
          content_findings,
          citation_findings,
          technical_findings,
          link_findings,
          ai_recommendations
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('timestamp', { ascending: false })
        .limit(10);

      console.log('Query result:', {
        success: !error,
        error: error?.message,
        count: data?.length || 0,
      });

      if (error) {
        console.error('Failed to load audit history:', error);
        // Don't throw - just log and continue
      } else {
        console.log('✅ Loaded audits:', data);
        setSavedAudits(data || []);
      }
    } catch (err) {
      console.error('Failed to load audit history:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setLoadingHistory(false);
      console.log('=== LOAD AUDIT HISTORY END ===');
    }
  };

  const loadSavedAudit = async (auditId: string) => {
    console.log('=== LOAD SAVED AUDIT START ===');
    console.log('Audit ID:', auditId);
    
    if (!user || !supabase) {
      toast.error('Cannot load audit: Not authenticated');
      return;
    }

    setLoadingAudit(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Failed to load audit:', error);
        toast.error('Failed to load saved audit');
        return;
      }

      if (!data) {
        toast.error('Audit not found');
        return;
      }

      console.log('Loaded audit data:', data);

      // Convert saved audit to AuditResult format
      const auditResult: AuditResult = {
        url: data.url,
        timestamp: data.timestamp,
        overallScore: data.overall_score,
        preciseScore: data.overall_score,
        grade: mapGradeToAuditGrade(data.grade),
        scores: {
          schemaMarkup: data.score_schema_markup || 0,
          metaTags: data.score_meta_tags || 0,
          aiCrawlers: data.score_ai_crawlers || 0,
          eeat: data.score_eeat || 0,
          structure: data.score_structure || 0,
          performance: data.score_performance || 0,
          contentQuality: data.score_content_quality || 0,
          citationPotential: data.score_citation_potential || 0,
          technicalSEO: data.score_technical_seo || 0,
          linkAnalysis: data.score_link_analysis || 0,
          aidAgent: 0, // Not stored in DB
        },
        details: {
          schemaMarkup: data.schema_findings || {},
          metaTags: data.meta_findings || {},
          aiCrawlers: data.crawler_findings || {},
          eeat: data.eeat_findings || {},
          structure: data.structure_findings || {},
          performance: data.performance_findings || {},
          contentQuality: data.content_findings || {},
          citationPotential: data.citation_findings || {},
          technicalSEO: data.technical_findings || {},
          linkAnalysis: data.link_findings || {},
          aidAgent: {
            detected: false,
            discoveryMethod: 'none',
            errors: [],
            warnings: [],
          },
        },
        recommendations: data.ai_recommendations || [],
        insights: [],
      };

      setResult(auditResult);
      setUrl(data.url);
      toast.success('Loaded saved audit report');
      console.log('✅ Audit loaded successfully');
    } catch (err) {
      console.error('Error loading audit:', err);
      toast.error('Failed to load audit');
    } finally {
      setLoadingAudit(false);
      console.log('=== LOAD SAVED AUDIT END ===');
    }
  };

  // Helper function to map database grade to AuditResult grade
  const mapGradeToAuditGrade = (grade: string): 'Authority' | 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner' => {
    const gradeMap: Record<string, 'Authority' | 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner'> = {
      'A+': 'Authority',
      'A': 'Expert',
      'B': 'Advanced',
      'C': 'Intermediate',
      'D': 'Beginner',
      'F': 'Beginner',
    };
    return gradeMap[grade] || 'Beginner';
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
    console.log('=== SAVE AUDIT TO SUPABASE START ===');
    console.log('User:', user ? { id: user.id, email: user.email } : 'null');
    console.log('Supabase configured:', !!supabase);
    
    // Early validation - don't block UI, just log and notify
    if (!user) {
      console.error('Cannot save audit: user is null');
      toast.warning('Audit completed but not saved (not authenticated)');
      return;
    }

    if (!supabase) {
      console.error('Cannot save audit: supabase client is not configured');
      toast.error('Audit completed but database connection unavailable');
      return;
    }

    try {
      // Session verification with fallback
      console.log('Checking session...');
      
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('Session check result:', {
          hasSession: !!currentSession,
          sessionError: sessionError?.message,
          userId: currentSession?.user?.id,
        });
        
        if (sessionError) {
          console.warn('Session check error:', sessionError.message);
          // Fallback: try to continue anyway - RLS might still work
          toast.warning('Session verification failed, attempting to save anyway...');
        } else if (!currentSession) {
          console.warn('No active session for saving audit');
          toast.warning('Audit completed but not saved (no active session)');
          return;
        }
      } catch (sessionCheckError) {
        // Fallback for session check failures - don't block the save attempt
        console.error('Session check threw exception:', sessionCheckError);
        toast.warning('Session check failed, attempting to save anyway...');
      }

      // Data preparation with validation
      console.log('Preparing audit data...');
      let auditData: ReturnType<typeof prepareAuditData>;
      
      try {
        auditData = prepareAuditData(auditResult, user.id);
        
        console.log('Prepared audit data:', {
          user_id: auditData.user_id,
          url: auditData.url,
          normalized_url: auditData.normalized_url,
          domain: auditData.domain,
          overall_score: auditData.overall_score,
          grade: auditData.grade,
        });
      } catch (prepError) {
        console.error('Data preparation failed:', prepError);
        const errorMsg = prepError instanceof Error ? prepError.message : 'Unknown preparation error';
        toast.error(`Failed to prepare audit data: ${errorMsg}`);
        return;
      }

      // Validate the prepared data
      const validation = validatePreparedData(auditData);
      if (!validation.isValid) {
        console.error('Data validation failed:', validation.errors);
        const errorDetails = validation.errors?.join(', ') || 'Invalid data structure';
        toast.error(`Failed to save audit: ${errorDetails}`);
        return;
      }

      // Database insert with retry logic for transient failures
      console.log('Inserting audit into database with retry logic...');
      
      const retryResult = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.from('audits').insert([auditData]).select();
          
          if (error) {
            throw error;
          }
          
          return data;
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
        }
      );

      console.log('Insert result:', {
        success: retryResult.success,
        attempts: retryResult.attempts,
        error: retryResult.error,
      });

      if (!retryResult.success) {
        const error = retryResult.error;
        console.error('Database insert error after retries:', error);
        
        // Provide specific error messages based on error type
        if (typeof error === 'object' && error !== null) {
          const err = error as { code?: string; message?: string };
          
          if (err.code === '23505') {
            // Unique constraint violation
            toast.error('Audit already exists in history');
          } else if (err.code === '23503') {
            // Foreign key violation
            toast.error('Failed to save audit: User reference invalid');
          } else if (err.code === '42501') {
            // Insufficient privilege (RLS policy)
            toast.error('Failed to save audit: Permission denied. Please try logging in again.');
          } else if (err.code === '23502') {
            // Not null violation
            toast.error('Failed to save audit: Missing required data');
          } else if (err.message?.includes('JWT')) {
            // JWT/Auth related errors
            toast.error('Failed to save audit: Authentication expired. Please refresh the page.');
          } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
            // Network errors (after retries)
            toast.error(`Failed to save audit after ${retryResult.attempts} attempts: Network error. Please check your connection.`);
          } else {
            // Generic database error
            toast.error(`Failed to save audit: ${err.message || 'Database error'}`);
          }
        } else {
          toast.error('Failed to save audit: Unknown error');
        }
        
        return;
      }

      console.log(`✅ Audit saved successfully after ${retryResult.attempts} attempt(s)!`);
      if (retryResult.attempts > 1) {
        toast.success(`Audit saved to history after ${retryResult.attempts} attempts!`);
      } else {
        toast.success('Audit saved to history!');
      }
      
    } catch (err) {
      // Catch-all for unexpected errors - ensure UI is never blocked
      console.error('Unexpected error in saveAuditToSupabase:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack : undefined,
      });
      
      // Provide user-friendly error message
      if (err instanceof TypeError) {
        toast.error('Audit completed but failed to save: Data type error');
      } else if (err instanceof Error && err.message.includes('fetch')) {
        toast.error('Audit completed but failed to save: Network error');
      } else if (err instanceof Error && err.message.includes('timeout')) {
        toast.error('Audit completed but failed to save: Request timeout');
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Audit completed but failed to save: ${errorMsg}`);
      }
      
    } finally {
      console.log('=== SAVE AUDIT TO SUPABASE END ===');
      // Ensure UI is never blocked - no throw, no re-throw
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
              disabled={isAnalyzing || loadingAudit}
            />
            <button
              type="submit"
              disabled={isAnalyzing || loadingAudit || !url}
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
              {isAnalyzing || loadingAudit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingAudit ? 'Loading...' : 'Analyzing...'}</span>
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
                  loadSavedAudit(audit.id);
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
