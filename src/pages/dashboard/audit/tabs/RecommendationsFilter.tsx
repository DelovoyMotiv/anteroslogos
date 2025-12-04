/**
 * RecommendationsFilter Component
 * 
 * Multi-select filter controls for recommendations.
 * Allows filtering by Priority, Category, and Effort.
 * 
 * Features:
 * - Priority filter (Critical/High/Medium/Low)
 * - Category filter (11 categories)
 * - Effort filter (Quick-win/Strategic/Long-term)
 * - Multi-select functionality with checkboxes
 * - Clear filters button
 * - Active filter count badges
 * - Collapsible filter sections
 * 
 * Requirements:
 * - Filtering logic: Multi-select with AND logic within groups
 * - UX: Clear visual feedback, easy to use
 * - Accessibility: Keyboard navigation, ARIA labels
 * 
 * Usage:
 * ```tsx
 * <RecommendationsFilter
 *   filters={filters}
 *   onFilterChange={setFilters}
 *   onClearFilters={clearFilters}
 * />
 * ```
 */

import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterState {
  priorities: string[];
  categories: string[];
  efforts: string[];
}

interface RecommendationsFilterProps {
  /** Current filter state */
  filters: FilterState;
  /** Callback when filters change */
  onFilterChange: (filters: FilterState) => void;
  /** Callback to clear all filters */
  onClearFilters: () => void;
}

// Filter options
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'low', label: 'Low', color: 'text-slate-400' },
];

const CATEGORY_OPTIONS = [
  { value: 'Schema Markup', label: 'Schema Markup' },
  { value: 'Meta Tags', label: 'Meta Tags' },
  { value: 'AI Crawlers', label: 'AI Crawlers' },
  { value: 'E-E-A-T', label: 'E-E-A-T' },
  { value: 'HTML Structure', label: 'HTML Structure' },
  { value: 'Performance', label: 'Performance' },
  { value: 'Content Quality', label: 'Content Quality' },
  { value: 'Citation Potential', label: 'Citation Potential' },
  { value: 'Technical GEO', label: 'Technical GEO' },
  { value: 'Link Analysis', label: 'Link Analysis' },
  { value: 'AID Protocol', label: 'AID Protocol' },
];

const EFFORT_OPTIONS = [
  { value: 'quick-win', label: 'Quick Win', color: 'text-emerald-400' },
  { value: 'strategic', label: 'Strategic', color: 'text-blue-400' },
  { value: 'long-term', label: 'Long-term', color: 'text-purple-400' },
];

export function RecommendationsFilter({
  filters,
  onFilterChange,
  onClearFilters,
}: RecommendationsFilterProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'priority',
    'category',
    'effort',
  ]);

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter((s) => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const togglePriority = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    onFilterChange({ ...filters, priorities: newPriorities });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const toggleEffort = (effort: string) => {
    const newEfforts = filters.efforts.includes(effort)
      ? filters.efforts.filter((e) => e !== effort)
      : [...filters.efforts, effort];
    onFilterChange({ ...filters, efforts: newEfforts });
  };

  const hasActiveFilters =
    filters.priorities.length > 0 ||
    filters.categories.length > 0 ||
    filters.efforts.length > 0;

  const totalActiveFilters =
    filters.priorities.length + filters.categories.length + filters.efforts.length;

  return (
    <div className="bg-black/30 border border-slate-800/30 rounded overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-black/20 border-b border-slate-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Filters
          </span>
          {totalActiveFilters > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
              {totalActiveFilters}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-blue-400 hover:text-blue-300 font-mono uppercase tracking-wider transition-colors flex items-center gap-1"
            aria-label="Clear all filters"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Filter Sections */}
      <div className="divide-y divide-slate-800/30">
        {/* Priority Filter */}
        <FilterSection
          title="Priority"
          isExpanded={expandedSections.includes('priority')}
          onToggle={() => toggleSection('priority')}
          activeCount={filters.priorities.length}
        >
          <div className="space-y-2">
            {PRIORITY_OPTIONS.map((option) => (
              <FilterCheckbox
                key={option.value}
                label={option.label}
                checked={filters.priorities.includes(option.value)}
                onChange={() => togglePriority(option.value)}
                color={option.color}
              />
            ))}
          </div>
        </FilterSection>

        {/* Category Filter */}
        <FilterSection
          title="Category"
          isExpanded={expandedSections.includes('category')}
          onToggle={() => toggleSection('category')}
          activeCount={filters.categories.length}
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {CATEGORY_OPTIONS.map((option) => (
              <FilterCheckbox
                key={option.value}
                label={option.label}
                checked={filters.categories.includes(option.value)}
                onChange={() => toggleCategory(option.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Effort Filter */}
        <FilterSection
          title="Effort"
          isExpanded={expandedSections.includes('effort')}
          onToggle={() => toggleSection('effort')}
          activeCount={filters.efforts.length}
        >
          <div className="space-y-2">
            {EFFORT_OPTIONS.map((option) => (
              <FilterCheckbox
                key={option.value}
                label={option.label}
                checked={filters.efforts.includes(option.value)}
                onChange={() => toggleEffort(option.value)}
                color={option.color}
              />
            ))}
          </div>
        </FilterSection>
      </div>
    </div>
  );
}

/**
 * FilterSection Component
 * 
 * Collapsible section for a filter group.
 */
interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  activeCount: number;
  children: React.ReactNode;
}

function FilterSection({
  title,
  isExpanded,
  onToggle,
  activeCount,
  children,
}: FilterSectionProps) {
  return (
    <div>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-black/20 transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} filter`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
              {activeCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>

      {/* Section Content */}
      {isExpanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

/**
 * FilterCheckbox Component
 * 
 * Individual checkbox for a filter option.
 */
interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  color?: string;
}

function FilterCheckbox({ label, checked, onChange, color }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 rounded border-slate-700 bg-black/40 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0 cursor-pointer"
      />
      <span
        className={`text-xs font-mono ${
          color || 'text-slate-400'
        } group-hover:text-slate-300 transition-colors`}
      >
        {label}
      </span>
    </label>
  );
}
