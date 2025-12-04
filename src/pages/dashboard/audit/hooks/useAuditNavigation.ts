/**
 * useAuditNavigation Hook
 * Manages navigation state for tabbed GEO Audit interface
 * Features:
 * - URL state synchronization (query params)
 * - Browser history support (back/forward)
 * - Deep linking support
 * - Type-safe navigation state
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Main tab identifiers
 */
export type TabId = 'overview' | 'analysis' | 'insights' | 'technical';

/**
 * Category identifiers for Analysis tab
 */
export type CategoryId =
  | 'schemaMarkup'
  | 'metaTags'
  | 'aiCrawlers'
  | 'eeat'
  | 'structure'
  | 'performance'
  | 'contentQuality'
  | 'citationPotential'
  | 'technicalSEO'
  | 'linkAnalysis'
  | 'aidAgent';

/**
 * Priority filter options for Insights tab
 */
export type PriorityFilter = 'critical' | 'high' | 'medium' | 'low';

/**
 * Effort filter options for Insights tab
 */
export type EffortFilter = 'quick-win' | 'strategic' | 'long-term';

/**
 * Technical sub-tab identifiers
 */
export type TechnicalSubTab = 'raw' | 'knowledge-graph' | 'aid-protocol' | 'schemas';

/**
 * Complete navigation state interface
 */
export interface NavigationState {
  // Main tab
  activeTab: TabId;

  // Analysis tab state
  analysisCategory: CategoryId | null;

  // Insights tab state
  insightsFilters: {
    priority: PriorityFilter[];
    category: CategoryId[];
    effort: EffortFilter[];
  };

  // Technical tab state
  technicalSubTab: TechnicalSubTab;
}

/**
 * Default navigation state
 */
const DEFAULT_STATE: NavigationState = {
  activeTab: 'overview',
  analysisCategory: null,
  insightsFilters: {
    priority: [],
    category: [],
    effort: [],
  },
  technicalSubTab: 'raw',
};

/**
 * Parse URL query parameters into navigation state
 */
function parseUrlParams(): Partial<NavigationState> {
  const params = new URLSearchParams(window.location.search);
  const state: Partial<NavigationState> = {};

  // Parse main tab
  const tab = params.get('tab');
  if (tab && isValidTab(tab)) {
    state.activeTab = tab as TabId;
  }

  // Parse analysis category
  const category = params.get('category');
  if (category && isValidCategory(category)) {
    state.analysisCategory = category as CategoryId;
  }

  // Parse insights filters
  const priority = params.get('priority');
  const filterCategory = params.get('filterCategory');
  const effort = params.get('effort');

  if (priority || filterCategory || effort) {
    state.insightsFilters = {
      priority: priority ? priority.split(',').filter(isValidPriority) as PriorityFilter[] : [],
      category: filterCategory ? filterCategory.split(',').filter(isValidCategory) as CategoryId[] : [],
      effort: effort ? effort.split(',').filter(isValidEffort) as EffortFilter[] : [],
    };
  }

  // Parse technical sub-tab
  const subTab = params.get('subTab');
  if (subTab && isValidTechnicalSubTab(subTab)) {
    state.technicalSubTab = subTab as TechnicalSubTab;
  }

  return state;
}

/**
 * Update URL with current navigation state
 */
function updateUrl(state: NavigationState): void {
  const params = new URLSearchParams();

  // Always include main tab
  params.set('tab', state.activeTab);

  // Include analysis category if set
  if (state.activeTab === 'analysis' && state.analysisCategory) {
    params.set('category', state.analysisCategory);
  }

  // Include insights filters if any are set
  if (state.activeTab === 'insights') {
    if (state.insightsFilters.priority.length > 0) {
      params.set('priority', state.insightsFilters.priority.join(','));
    }
    if (state.insightsFilters.category.length > 0) {
      params.set('filterCategory', state.insightsFilters.category.join(','));
    }
    if (state.insightsFilters.effort.length > 0) {
      params.set('effort', state.insightsFilters.effort.join(','));
    }
  }

  // Include technical sub-tab if not default
  if (state.activeTab === 'technical' && state.technicalSubTab !== 'raw') {
    params.set('subTab', state.technicalSubTab);
  }

  // Update URL without page reload
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({ navigationState: state }, '', newUrl);
}

/**
 * Type guards for validation
 */
function isValidTab(tab: string): tab is TabId {
  return ['overview', 'analysis', 'insights', 'technical'].includes(tab);
}

function isValidCategory(category: string): category is CategoryId {
  return [
    'schemaMarkup',
    'metaTags',
    'aiCrawlers',
    'eeat',
    'structure',
    'performance',
    'contentQuality',
    'citationPotential',
    'technicalSEO',
    'linkAnalysis',
    'aidAgent',
  ].includes(category);
}

function isValidPriority(priority: string): priority is PriorityFilter {
  return ['critical', 'high', 'medium', 'low'].includes(priority);
}

function isValidEffort(effort: string): effort is EffortFilter {
  return ['quick-win', 'strategic', 'long-term'].includes(effort);
}

function isValidTechnicalSubTab(subTab: string): subTab is TechnicalSubTab {
  return ['raw', 'knowledge-graph', 'aid-protocol', 'schemas'].includes(subTab);
}

/**
 * Main navigation hook
 */
export function useAuditNavigation() {
  // Initialize state from URL or defaults
  const [state, setState] = useState<NavigationState>(() => {
    const urlState = parseUrlParams();
    return { ...DEFAULT_STATE, ...urlState };
  });

  // Type-safe setState wrapper to work around TypeScript inference issues
  const updateState = (updater: (prev: NavigationState) => NavigationState) => {
    setState(updater as any);
  };

  // Sync with URL on mount and when browser back/forward is used
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.navigationState) {
        setState(event.state.navigationState);
      } else {
        // Parse URL if no state in history
        const urlState = parseUrlParams();
        setState({ ...DEFAULT_STATE, ...urlState });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL when state changes
  useEffect(() => {
    updateUrl(state);
  }, [state]);

  /**
   * Set active main tab
   */
  const setActiveTab = useCallback((tab: TabId) => {
    updateState((prev) => ({
      ...prev,
      activeTab: tab,
      // Reset category when leaving analysis tab
      analysisCategory: tab === 'analysis' ? prev.analysisCategory : null,
    }));
  }, []);

  /**
   * Set analysis category
   */
  const setAnalysisCategory = useCallback((category: CategoryId | null) => {
    updateState((prev) => ({
      ...prev,
      analysisCategory: category,
    }));
  }, []);

  /**
   * Set insights filters (partial update)
   */
  const setInsightsFilters = useCallback(
    (filters: Partial<NavigationState['insightsFilters']>) => {
      updateState((prev) => ({
        ...prev,
        insightsFilters: {
          ...prev.insightsFilters,
          ...filters,
        },
      }));
    },
    []
  );

  /**
   * Clear all insights filters
   */
  const clearInsightsFilters = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      insightsFilters: {
        priority: [],
        category: [],
        effort: [],
      },
    }));
  }, []);

  /**
   * Set technical sub-tab
   */
  const setTechnicalSubTab = useCallback((subTab: TechnicalSubTab) => {
    updateState((prev) => ({
      ...prev,
      technicalSubTab: subTab,
    }));
  }, []);

  /**
   * Navigate to specific category in analysis tab
   */
  const navigateToCategory = useCallback((category: CategoryId) => {
    updateState((prev) => ({
      ...prev,
      activeTab: 'analysis' as TabId,
      analysisCategory: category,
    }));
  }, []);

  /**
   * Reset to default state
   */
  const resetNavigation = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    // Current state
    state,

    // Tab navigation
    setActiveTab,
    
    // Analysis tab
    setAnalysisCategory,
    navigateToCategory,
    
    // Insights tab
    setInsightsFilters,
    clearInsightsFilters,
    
    // Technical tab
    setTechnicalSubTab,
    
    // Utilities
    resetNavigation,
  };
}

/**
 * Hook return type for external use
 */
export type UseAuditNavigationReturn = ReturnType<typeof useAuditNavigation>;
