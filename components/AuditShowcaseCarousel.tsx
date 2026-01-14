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

        // Fetch 20 most recent audits with filters
        const { data, error } = await supabase
          .from('audits')
          .select('id, domain, overall_score, grade, timestamp, url')
          .is('deleted_at', null)
          .not('overall_score', 'is', null)
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

            if (typeof audit.overall_score !== 'number' || 
                audit.overall_score < 0 || 
                audit.overall_score > 100) {
              if (import.meta.env.DEV) {
                console.warn('[AuditShowcaseCarousel] Skipping audit with invalid score:', audit);
              }
              continue;
            }

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
            validAudits.push(audit as AuditData);
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
          <h2 className="text-2xl font-bold text-white mb-6">Recent Audits</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[360px] bg-white/5 border border-white/10 rounded-xl p-6 relative overflow-hidden"
              >
                {/* Shimmer effect overlay */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                
                {/* Skeleton content */}
                <div className="h-6 bg-white/10 rounded mb-4 w-3/4"></div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <div className="h-4 bg-white/10 rounded mb-2 w-16"></div>
                    <div className="h-10 bg-white/10 rounded w-20"></div>
                  </div>
                  <div className="h-10 bg-white/10 rounded w-16"></div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full"></div>
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
          <h2 className="text-2xl font-bold text-white mb-6">Recent Audits</h2>
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
          <h2 className="text-2xl font-bold text-white mb-6">Recent Audits</h2>
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white mb-6">Recent Audits</h2>
        {/* Horizontal scrolling carousel container */}
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-lg"
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
            />
          ))}
        </div>
        <p className="text-white/50 text-sm mt-2 text-center">
          Use arrow keys to navigate through audits
        </p>
      </div>
    </section>
  );
};

export default AuditShowcaseCarousel;
