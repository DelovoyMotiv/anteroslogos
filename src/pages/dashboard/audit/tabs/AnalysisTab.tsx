/**
 * AnalysisTab Component
 * 
 * Detailed category-by-category analysis with sidebar navigation.
 * Implements a two-column layout: sidebar with category list + main content area.
 * 
 * Features:
 * - Sidebar navigation with all 11 categories
 * - Color-coded score badges per category
 * - Issue count indicators
 * - Active category highlighting
 * - Smooth scroll to category
 * - Responsive behavior (collapsible on mobile)
 * - Detailed metrics display for selected category
 * 
 * Layout:
 * Desktop (>1024px): Fixed sidebar + scrollable content
 * Tablet (768-1024px): Collapsible sidebar
 * Mobile (<768px): Stacked layout with dropdown
 * 
 * Requirements:
 * - Layout structure: Sidebar + content area
 * - Responsiveness: Mobile-friendly with collapsible sidebar
 * - Navigation UX: Clear visual feedback
 * - Category details: Full metrics per category
 * 
 * Usage:
 * ```tsx
 * <TabContent isActive={activeTab === 'analysis'}>
 *   <AnalysisTab result={result} />
 * </TabContent>
 * ```
 */

import { useState } from 'react';
import { 
  Menu,
  X
} from 'lucide-react';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';
import { CategorySidebar, getCategoryIcon } from './CategorySidebar';
import type { CategoryId, Category } from './CategorySidebar';
import { CategoryDetailView } from './CategoryDetailView';

interface AnalysisTabProps {
  /** Complete audit result data */
  result: AuditResult;
}

export function AnalysisTab({ result }: AnalysisTabProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('schema');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Build category list with scores and counts
  const categories: Category[] = [
    {
      id: 'schema',
      label: 'Schema Markup',
      icon: getCategoryIcon('schema'),
      score: result.scores.schemaMarkup,
      issueCount: result.details.schemaMarkup.issues.length,
      strengthCount: result.details.schemaMarkup.strengths.length,
    },
    {
      id: 'meta',
      label: 'Meta Tags',
      icon: getCategoryIcon('meta'),
      score: result.scores.metaTags,
      issueCount: result.details.metaTags.issues.length,
      strengthCount: result.details.metaTags.strengths.length,
    },
    {
      id: 'crawlers',
      label: 'AI Crawlers',
      icon: getCategoryIcon('crawlers'),
      score: result.scores.aiCrawlers,
      issueCount: result.details.aiCrawlers.issues.length,
      strengthCount: result.details.aiCrawlers.strengths.length,
    },
    {
      id: 'eeat',
      label: 'E-E-A-T',
      icon: getCategoryIcon('eeat'),
      score: result.scores.eeat,
      issueCount: result.details.eeat.issues.length,
      strengthCount: result.details.eeat.strengths.length,
    },
    {
      id: 'structure',
      label: 'Structure',
      icon: getCategoryIcon('structure'),
      score: result.scores.structure,
      issueCount: result.details.structure.issues.length,
      strengthCount: result.details.structure.strengths.length,
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: getCategoryIcon('performance'),
      score: result.scores.performance,
      issueCount: result.details.performance.issues.length,
      strengthCount: result.details.performance.strengths.length,
    },
    {
      id: 'content',
      label: 'Content Quality',
      icon: getCategoryIcon('content'),
      score: result.scores.contentQuality,
      issueCount: result.details.contentQuality.issues.length,
      strengthCount: result.details.contentQuality.strengths.length,
    },
    {
      id: 'citation',
      label: 'Citation Potential',
      icon: getCategoryIcon('citation'),
      score: result.scores.citationPotential,
      issueCount: result.details.citationPotential.issues.length,
      strengthCount: result.details.citationPotential.strengths.length,
    },
    {
      id: 'technical',
      label: 'Technical SEO',
      icon: getCategoryIcon('technical'),
      score: result.scores.technicalSEO,
      issueCount: result.details.technicalSEO.issues.length,
      strengthCount: result.details.technicalSEO.strengths.length,
    },
    {
      id: 'links',
      label: 'Link Analysis',
      icon: getCategoryIcon('links'),
      score: result.scores.linkAnalysis,
      issueCount: result.details.linkAnalysis.issues.length,
      strengthCount: result.details.linkAnalysis.strengths.length,
    },
    {
      id: 'aid',
      label: 'AID Protocol',
      icon: getCategoryIcon('aid'),
      score: result.scores.aidAgent,
      issueCount: result.details.aidAgent.errors?.length || 0,
      strengthCount: result.details.aidAgent.detected ? 1 : 0,
    },
  ];

  const handleCategoryClick = (categoryId: CategoryId) => {
    setActiveCategory(categoryId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Mobile Menu Toggle - Optimized for Touch */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden mb-3 md:mb-4 px-3 md:px-4 py-2.5 md:py-2 bg-black/40 border border-slate-700/50 text-slate-300 text-[11px] md:text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-black/60 transition-colors w-full sm:w-auto min-h-[44px]"
        aria-label="Toggle category menu"
      >
        {isSidebarOpen ? (
          <>
            <X className="w-4 h-4" />
            <span>Close Menu</span>
          </>
        ) : (
          <>
            <Menu className="w-4 h-4" />
            <span>Categories ({categories.length})</span>
          </>
        )}
      </button>

      {/* Layout: Sidebar + Content - Optimized for Mobile */}
      <div className="flex flex-col lg:flex-row gap-3 md:gap-4">
        {/* Sidebar - Category Navigation - Collapsed by Default on Mobile */}
        <aside
          className={`
            lg:w-64 lg:flex-shrink-0
            ${isSidebarOpen ? 'block' : 'hidden lg:block'}
          `}
        >
          <CategorySidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
          />
        </aside>

        {/* Main Content Area - Category Details */}
        <main className="flex-1 min-w-0">
          <CategoryDetailView
            result={result}
            categoryId={activeCategory}
          />
        </main>
      </div>
    </div>
  );
}

// CategoryDetailView is now imported from separate file
