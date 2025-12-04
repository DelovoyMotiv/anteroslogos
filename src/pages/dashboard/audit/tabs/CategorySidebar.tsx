/**
 * CategorySidebar Component
 * 
 * Navigation sidebar for Analysis tab showing all 11 GEO audit categories.
 * 
 * Features:
 * - Lists all 11 categories with scores
 * - Color-coded score badges (emerald ≥80, yellow ≥60, orange ≥40, red <40)
 * - Issue count indicators (red badges)
 * - Active category highlighting (blue border and background)
 * - Smooth scroll to category (handled by parent)
 * - Responsive design (sticky positioning on desktop)
 * 
 * Visual Design:
 * - Dark theme with slate/blue color scheme
 * - Active state: blue-500/20 background with blue-500 left border
 * - Hover state: black/40 background
 * - Score badges: color-coded with border
 * - Issue badges: red background with count
 * - Icons from lucide-react
 * 
 * Accessibility:
 * - Semantic button elements
 * - ARIA labels with score information
 * - aria-current for active state
 * - Keyboard navigable
 * 
 * Requirements:
 * - Navigation UX: Clear visual feedback
 * - Visual feedback: Color-coded scores and issue counts
 * 
 * @module CategorySidebar
 */

import { 
  FileCode, 
  Tag, 
  Bot, 
  Award, 
  Layout, 
  Gauge, 
  FileText, 
  Quote, 
  Wrench, 
  Link2, 
  Zap,
  ChevronRight
} from 'lucide-react';

/**
 * Category identifier type
 */
export type CategoryId = 
  | 'schema'
  | 'meta'
  | 'crawlers'
  | 'eeat'
  | 'structure'
  | 'performance'
  | 'content'
  | 'citation'
  | 'technical'
  | 'links'
  | 'aid';

/**
 * Category data structure
 */
export interface Category {
  /** Unique category identifier */
  id: CategoryId;
  /** Display label */
  label: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Category score (0-100) */
  score: number;
  /** Number of issues found */
  issueCount: number;
  /** Number of strengths found */
  strengthCount: number;
}

/**
 * CategorySidebar component props
 */
export interface CategorySidebarProps {
  /** List of all categories with scores and counts */
  categories: Category[];
  /** Currently active category ID */
  activeCategory: CategoryId;
  /** Callback when category is clicked */
  onCategoryClick: (categoryId: CategoryId) => void;
}

/**
 * Get icon component for category
 */
export function getCategoryIcon(categoryId: CategoryId): React.ReactNode {
  const iconClass = "w-4 h-4";
  
  switch (categoryId) {
    case 'schema':
      return <FileCode className={iconClass} />;
    case 'meta':
      return <Tag className={iconClass} />;
    case 'crawlers':
      return <Bot className={iconClass} />;
    case 'eeat':
      return <Award className={iconClass} />;
    case 'structure':
      return <Layout className={iconClass} />;
    case 'performance':
      return <Gauge className={iconClass} />;
    case 'content':
      return <FileText className={iconClass} />;
    case 'citation':
      return <Quote className={iconClass} />;
    case 'technical':
      return <Wrench className={iconClass} />;
    case 'links':
      return <Link2 className={iconClass} />;
    case 'aid':
      return <Zap className={iconClass} />;
    default:
      return <FileCode className={iconClass} />;
  }
}

/**
 * CategorySidebar Component
 * 
 * Displays navigation sidebar with all audit categories.
 */
export function CategorySidebar({ 
  categories, 
  activeCategory, 
  onCategoryClick 
}: CategorySidebarProps) {
  return (
    <div className="bg-black/20 border border-slate-800/50 p-2 md:p-3 lg:sticky lg:top-4">
      <h3 className="text-[10px] md:text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 md:mb-3 px-2">
        Categories
      </h3>
      <nav className="space-y-1" role="navigation" aria-label="Category navigation">
        {categories.map((category) => (
          <CategoryNavItem
            key={category.id}
            category={category}
            isActive={activeCategory === category.id}
            onClick={() => onCategoryClick(category.id)}
          />
        ))}
      </nav>
    </div>
  );
}

/**
 * Category Navigation Item
 * 
 * Individual category button in sidebar with score badge and issue count.
 */
interface CategoryNavItemProps {
  /** Category data */
  category: Category;
  /** Whether this category is currently active */
  isActive: boolean;
  /** Click handler */
  onClick: () => void;
}

function CategoryNavItem({ category, isActive, onClick }: CategoryNavItemProps) {
  /**
   * Get color classes for score badge based on score value
   * - Emerald (≥80): Excellent
   * - Yellow (≥60): Good
   * - Orange (≥40): Needs improvement
   * - Red (<40): Critical
   */
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    if (score >= 40) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  const scoreColorClass = getScoreColor(category.score);

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-2 md:px-3 py-2.5 md:py-3 flex items-center justify-between gap-2
        text-[11px] md:text-xs font-mono transition-all duration-300 ease-out min-h-[44px]
        rounded-md group
        ${
          isActive
            ? 'bg-blue-500/20 border-l-4 border-blue-500 text-slate-200 shadow-lg shadow-blue-500/10 scale-[1.02]'
            : 'bg-black/20 border-l-4 border-transparent text-slate-400 hover:bg-black/40 hover:text-slate-300 hover:border-slate-600/50 hover:scale-[1.01]'
        }
        active:scale-[0.99] transform
      `}
      aria-label={`${category.label} - Score ${category.score.toFixed(1)}`}
      aria-current={isActive ? 'true' : undefined}
      type="button"
    >
      {/* Left side: Icon + Label */}
      <div className="flex items-center gap-2 md:gap-2.5 flex-1 min-w-0">
        <span className={`transition-all duration-300 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-500 group-hover:text-slate-400 group-hover:scale-105'}`}>
          {category.icon}
        </span>
        <span className="truncate">{category.label}</span>
      </div>

      {/* Right side: Badges + Indicator */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
        {/* Issue count badge - only show if there are issues */}
        {category.issueCount > 0 && (
          <span
            className="bg-red-500/20 text-red-400 text-[9px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/30 shadow-sm shadow-red-500/20 animate-pulse"
            title={`${category.issueCount} issue${category.issueCount !== 1 ? 's' : ''}`}
            aria-label={`${category.issueCount} issue${category.issueCount !== 1 ? 's' : ''}`}
          >
            {category.issueCount}
          </span>
        )}

        {/* Score badge - always visible */}
        <span
          className={`${scoreColorClass} text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all duration-300 group-hover:scale-105`}
          title={`Score: ${category.score.toFixed(1)}`}
          aria-label={`Score: ${category.score.toFixed(1)}`}
        >
          {category.score.toFixed(1)}
        </span>

        {/* Active indicator chevron with animation */}
        {isActive && (
          <ChevronRight 
            className="w-3.5 h-3.5 text-blue-400 animate-pulse" 
            aria-hidden="true" 
          />
        )}
      </div>
    </button>
  );
}
