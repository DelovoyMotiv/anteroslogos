# Audit Navigation Hooks

## useAuditNavigation

A custom React hook for managing navigation state in the GEO Audit tabbed interface.

### Features

- **URL State Synchronization**: Automatically syncs navigation state with URL query parameters
- **Browser History Support**: Full support for browser back/forward navigation
- **Deep Linking**: Support for direct links to specific tabs, categories, and filters
- **Type-Safe**: Fully typed with TypeScript for compile-time safety
- **Persistent State**: Navigation state is preserved in browser history

### Usage

```typescript
import { useAuditNavigation } from './hooks/useAuditNavigation';

function AuditPage() {
  const navigation = useAuditNavigation();

  // Access current state
  const { activeTab, analysisCategory, insightsFilters, technicalSubTab } = navigation.state;

  // Change tabs
  const handleTabChange = (tab: TabId) => {
    navigation.setActiveTab(tab);
  };

  // Navigate to specific category in Analysis tab
  const handleCategoryClick = (category: CategoryId) => {
    navigation.navigateToCategory(category);
  };

  // Set insights filters
  const handleFilterChange = () => {
    navigation.setInsightsFilters({
      priority: ['critical', 'high'],
      category: ['schemaMarkup'],
    });
  };

  return (
    <div>
      {/* Tab buttons */}
      <button onClick={() => navigation.setActiveTab('overview')}>
        Overview
      </button>
      <button onClick={() => navigation.setActiveTab('analysis')}>
        Analysis
      </button>
      <button onClick={() => navigation.setActiveTab('insights')}>
        Insights
      </button>
      <button onClick={() => navigation.setActiveTab('technical')}>
        Technical
      </button>

      {/* Render active tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'analysis' && (
        <AnalysisTab
          category={analysisCategory}
          onCategoryChange={navigation.setAnalysisCategory}
        />
      )}
      {activeTab === 'insights' && (
        <InsightsTab
          filters={insightsFilters}
          onFiltersChange={navigation.setInsightsFilters}
          onClearFilters={navigation.clearInsightsFilters}
        />
      )}
      {activeTab === 'technical' && (
        <TechnicalTab
          subTab={technicalSubTab}
          onSubTabChange={navigation.setTechnicalSubTab}
        />
      )}
    </div>
  );
}
```

### API Reference

#### State

```typescript
interface NavigationState {
  activeTab: TabId;                    // Current active main tab
  analysisCategory: CategoryId | null; // Selected category in Analysis tab
  insightsFilters: {                   // Active filters in Insights tab
    priority: PriorityFilter[];
    category: CategoryId[];
    effort: EffortFilter[];
  };
  technicalSubTab: TechnicalSubTab;    // Active sub-tab in Technical tab
}
```

#### Methods

- **`setActiveTab(tab: TabId)`**: Change the active main tab
- **`setAnalysisCategory(category: CategoryId | null)`**: Set the selected category in Analysis tab
- **`navigateToCategory(category: CategoryId)`**: Navigate to Analysis tab and select a category
- **`setInsightsFilters(filters: Partial<InsightsFilters>)`**: Update insights filters (partial update)
- **`clearInsightsFilters()`**: Clear all insights filters
- **`setTechnicalSubTab(subTab: TechnicalSubTab)`**: Change the active sub-tab in Technical tab
- **`resetNavigation()`**: Reset all navigation state to defaults

#### Types

```typescript
type TabId = 'overview' | 'analysis' | 'insights' | 'technical';

type CategoryId =
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

type PriorityFilter = 'critical' | 'high' | 'medium' | 'low';
type EffortFilter = 'quick-win' | 'strategic' | 'long-term';
type TechnicalSubTab = 'raw' | 'knowledge-graph' | 'aid-protocol' | 'schemas';
```

### URL Format

The hook automatically syncs state with URL query parameters:

- **Overview tab**: `?tab=overview`
- **Analysis tab with category**: `?tab=analysis&category=schemaMarkup`
- **Insights tab with filters**: `?tab=insights&priority=critical,high&filterCategory=schemaMarkup,metaTags&effort=quick-win`
- **Technical tab with sub-tab**: `?tab=technical&subTab=knowledge-graph`

### Deep Linking Examples

Users can share direct links to specific views:

```
# Link to Schema Markup analysis
/audit?tab=analysis&category=schemaMarkup

# Link to critical priority recommendations
/audit?tab=insights&priority=critical

# Link to AID Protocol technical details
/audit?tab=technical&subTab=aid-protocol
```

### Browser History

The hook fully supports browser back/forward navigation:

1. User navigates: Overview → Analysis (Schema) → Insights
2. User clicks browser back button
3. Hook automatically restores previous state (Analysis with Schema category)
4. User clicks back again
5. Hook restores Overview tab

### Implementation Notes

- State changes trigger URL updates via `history.replaceState` (no page reload)
- URL parameters are validated to prevent invalid states
- Invalid parameters are ignored and defaults are used
- The hook uses `useCallback` for stable function references
- All state updates are batched for optimal performance
