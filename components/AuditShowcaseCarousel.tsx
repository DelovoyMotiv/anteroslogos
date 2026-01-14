import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AuditCard from './AuditCard';

// AuditData interface matching database schema
export interface AuditData {
  id: string;
  domain: string;
  overall_score: number;
  grade: string;
  timestamp: string;
  url: string;
  score_schema_markup?: number;
  score_eeat?: number;
  score_performance?: number;
  score_ai_crawlers?: number;
}

// Component state interface
interface AuditShowcaseState {
  audits: AuditData[];
  isLoading: boolean;
  error: string | null;
}

const AuditShowcaseCarousel: React.FC = () => {
  const [state, setState] = useState<AuditShowcaseState>({
    audits: [],
    isLoading: true,
    error: null,
  });

  // Ref for the scrollable container
  const carouselRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!carouselRef.current) return;

    const scrollAmount = 320; // Approximate card width + gap

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        carouselRef.current.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth',
        });
        break;
      case 'ArrowRight':
        event.preventDefault();
        carouselRef.current.scrollBy({
          left: scrollAmount,
          behavior: 'smooth',
        });
        break;
      case 'Home':
        event.preventDefault();
        carouselRef.current.scrollTo({
          left: 0,
          behavior: 'smooth',
        });
        break;
      case 'End':
        event.preventDefault();
        carouselRef.current.scrollTo({
          left: carouselRef.current.scrollWidth,
          behavior: 'smooth',
        });
        break;
    }
  }, []);

  useEffect(() => {
    // Abort controller for cleanup
    const abortController = new AbortController();
    
    const fetchAudits = async () => {
      try {
        // Check if Supabase is configured
        if (!supabase) {
          // Log detailed error in development only
          if (import.meta.env.DEV) {
            console.error('[AuditShowcaseCarousel] Supabase client is not configured');
          }
          setState({
            audits: [],
            isLoading: false,
            error: 'Unable to load recent audits',
          });
          return;
        }

        // Fetch 20 most recent PUBLIC audits with filters
        const { data, error } = await supabase
          .from('audits')
          .select('id, domain, overall_score, grade, timestamp, url, score_schema_markup, score_eeat, score_performance, score_ai_crawlers')
          .is('deleted_at', null)
          .not('overall_score', 'is', null)
          .eq('is_public', true)
          .order('timestamp', { ascending: false })
          .limit(20);

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Handle database errors
        if (error) {
          // Log detailed error in development only
          if (import.meta.env.DEV) {
            console.error('[AuditShowcaseCarousel] Database query error:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            });
          }
          
          // Display user-friendly error message
          setState({
            audits: [],
            isLoading: false,
            error: 'Unable to load recent audits',
          });
          return;
        }

        // Handle empty result set
        if (!data || data.length === 0) {
          setState({
            audits: [],
            isLoading: false,
            error: null,
          });
          return;
        }

        // Validate and filter malformed data
        const validAudits: AuditData[] = [];
        
        for (const audit of data) {
          try {
            // Validate required fields
            if (!audit.id || typeof audit.id !== 'string') {
              if (import.meta.env.DEV) {
                console.warn('[AuditShowcaseCarousel] Skipping audit with invalid id:', audit);
              }
              continue;
            }

            if (!audit.domain || typeof audit.domain !== 'string') {
              if (import.meta.env.DEV) {
                console.warn('[AuditShowcaseCarousel] Skipping audit with invalid domain:', audit);
              }
              continue;
            }

            // Convert overall_score to number if it's a string (Supabase numeric type)
            const scoreValue = typeof audit.overall_score === 'string' 
              ? parseFloat(audit.overall_score) 
              : audit.overall_score;

            if (typeof scoreValue !== 'number' || 
                isNaN(scoreValue) ||
                scoreValue < 0 || 
                scoreValue > 100) {
              if (import.meta.env.DEV) {
                console.warn('[AuditShowcaseCarousel] Skipping audit with invalid score:', audit);
              }
              continue;
            }

            // Convert mini metric scores to numbers if they're strings
            const scoreSchemaMarkup = audit.score_schema_markup !== undefined
              ? (typeof audit.score_schema_markup === 'string' 
                  ? parseFloat(audit.score_schema_markup) 
                  : audit.score_schema_markup)
              : undefined;

            const scoreEeat = audit.score_eeat !== undefined
              ? (typeof audit.score_eeat === 'string' 
                  ? parseFloat(audit.score_eeat) 
                  : audit.score_eeat)
              : undefined;

            const scorePerformance = audit.score_performance !== undefined
              ? (typeof audit.score_performance === 'string' 
                  ? parseFloat(audit.score_performance) 
                  : audit.score_performance)
              : undefined;

            const scoreAiCrawlers = audit.score_ai_crawlers !== undefined
              ? (typeof audit.score_ai_crawlers === 'string' 
                  ? parseFloat(audit.score_ai_crawlers) 
                  : audit.score_ai_crawlers)
              : undefined;

            if (!audit.grade || typeof audit.grade !== 'string') {
              if (import.meta.env.DEV) {
                console.warn('[AuditShowcaseCarousel] Skipping audit with invalid grade:', audit);
              }
              continue;
            }

            if (!audit.timestamp || typeof audit.timestamp !== 'string') {
              if (import.meta.env.DEV) {
                console.warn('[AuditShowcaseCarousel] Skipping audit with invalid timestamp:', audit);
              }
              continue;
            }

            if (!audit.url || typeof audit.url !== 'string') {
              if (import.meta.env.DEV) {
                console.warn('[AuditShowcaseCarousel] Skipping audit with invalid url:', audit);
              }
              continue;
            }

            // Add valid audit to the list
            validAudits.push({
              ...audit,
              overall_score: scoreValue,
              score_schema_markup: scoreSchemaMarkup,
              score_eeat: scoreEeat,
              score_performance: scorePerformance,
              score_ai_crawlers: scoreAiCrawlers,
            } as AuditData);
          } catch (validationError) {
            // Skip individual malformed records without crashing
            if (import.meta.env.DEV) {
              console.warn('[AuditShowcaseCarousel] Error validating audit record:', validationError, audit);
            }
            continue;
          }
        }

        // Update state with valid audits
        setState({
          audits: validAudits,
          isLoading: false,
          error: null,
        });

      } catch (err) {
        // Only update state if not aborted
        if (!abortController.signal.aborted) {
          // Log detailed error in development only
          if (import.meta.env.DEV) {
            console.error('[AuditShowcaseCarousel] Unexpected error fetching audits:', {
              error: err,
              message: err instanceof Error ? err.message : 'Unknown error',
              stack: err instanceof Error ? err.stack : undefined,
            });
          }
          
          // Display user-friendly error message
          setState({
            audits: [],
            isLoading: false,
            error: 'Unable to load recent audits',
          });
        }
      }
    };

    fetchAudits();

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, []);

  // Loading state with skeleton cards
  if (state.isLoading) {
    return (
      <section
        className="w-full py-8"
        aria-label="Recent audit results"
        aria-busy="true"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[240px] sm:w-[260px] lg:w-[280px] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl p-5 relative overflow-hidden"
              >
                {/* Shimmer effect overlay */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                
                {/* Skeleton content */}
                {/* Header: Domain */}
                <div className="mb-4">
                  <div className="h-5 bg-white/10 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/3"></div>
                </div>
                
                {/* Score section */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="h-3 bg-white/10 rounded mb-2 w-16"></div>
                    <div className="h-8 bg-white/10 rounded w-12"></div>
                  </div>
                  <div className="h-8 bg-white/10 rounded w-12"></div>
                </div>
                
                {/* Mini metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2 h-12"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (state.error) {
    return (
      <section
        className="w-full py-8"
        aria-label="Recent audit results"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white/70">{state.error}</p>
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (state.audits.length === 0) {
    return (
      <section
        className="w-full py-8"
        aria-label="Recent audit results"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white/70">No audits available yet</p>
          </div>
        </div>
      </section>
    );
  }

  // Success state with audit cards
  return (
    <section
      className="w-full py-8"
      aria-label="Recent audit results"
      role="region"
    >
      {/* Full-width carousel container without max-width constraint */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Horizontal scrolling carousel container */}
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-lg"
          style={{
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
          role="list"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Scrollable carousel of recent audit results. Use arrow keys to navigate, Home to go to start, End to go to end."
        >
          {state.audits.map((audit) => (
            <AuditCard
              key={audit.id}
              domain={audit.domain}
              score={audit.overall_score}
              grade={audit.grade}
              timestamp={audit.timestamp}
              scoreSchemaMarkup={audit.score_schema_markup}
              scoreEeat={audit.score_eeat}
              scorePerformance={audit.score_performance}
              scoreAiCrawlers={audit.score_ai_crawlers}
            />
          ))}
        </div>
        <p className="text-white/50 text-xs mt-2 text-center">
          Use arrow keys to navigate through audits
        </p>
      </div>
    </section>
  );
};

export default AuditShowcaseCarousel;
