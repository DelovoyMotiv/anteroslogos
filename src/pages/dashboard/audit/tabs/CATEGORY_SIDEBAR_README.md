# CategorySidebar Component

## Overview

The `CategorySidebar` component provides navigation for the Analysis tab, displaying all 11 GEO audit categories with their scores, issue counts, and visual indicators.

## Features

### ✅ Core Functionality
- **11 Categories Listed**: All audit categories displayed in a vertical list
- **Color-Coded Score Badges**: Visual score indicators with color thresholds
- **Issue Count Indicators**: Red badges showing number of issues per category
- **Active Category Highlighting**: Blue border and background for selected category
- **Smooth Scroll Support**: Parent component handles scrolling to category
- **Responsive Design**: Sticky positioning on desktop, collapsible on mobile

### 🎨 Visual Design

#### Color Scheme
- **Score Colors**:
  - Emerald (≥80): Excellent performance
  - Yellow (≥60): Good performance
  - Orange (≥40): Needs improvement
  - Red (<40): Critical issues

- **Active State**:
  - Background: `bg-blue-500/20`
  - Left Border: `border-blue-500` (2px)
  - Text: `text-slate-200`
  - Icon: `text-blue-400`
  - Chevron indicator on right

- **Hover State**:
  - Background: `bg-black/40`
  - Text: `text-slate-300`

#### Layout
```
┌─────────────────────────────────┐
│ CATEGORIES                      │
├─────────────────────────────────┤
│ [Icon] Schema Markup    [3] 85.0│ ← Active (blue)
│ [Icon] Meta Tags        [1] 72.5│
│ [Icon] AI Crawlers          95.0│
│ [Icon] E-E-A-T          [5] 45.0│
│ ...                             │
└─────────────────────────────────┘
```

### ♿ Accessibility

- **Semantic HTML**: Uses `<button>` elements for navigation
- **ARIA Labels**: Each button includes score in label
- **ARIA Current**: Active category marked with `aria-current="true"`
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Issue counts and scores announced

## Usage

### Basic Example

```tsx
import { CategorySidebar } from './CategorySidebar';
import type { Category } from './CategorySidebar';

function AnalysisTab({ result }: { result: AuditResult }) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('schema');

  const categories: Category[] = [
    {
      id: 'schema',
      label: 'Schema Markup',
      icon: getCategoryIcon('schema'),
      score: result.scores.schemaMarkup,
      issueCount: result.details.schemaMarkup.issues.length,
      strengthCount: result.details.schemaMarkup.strengths.length,
    },
    // ... other categories
  ];

  return (
    <CategorySidebar
      categories={categories}
      activeCategory={activeCategory}
      onCategoryClick={setActiveCategory}
    />
  );
}
```

### With Responsive Container

```tsx
<aside className="lg:w-64 lg:flex-shrink-0 hidden lg:block">
  <CategorySidebar
    categories={categories}
    activeCategory={activeCategory}
    onCategoryClick={handleCategoryClick}
  />
</aside>
```

## Props

### CategorySidebarProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `categories` | `Category[]` | Yes | Array of all categories with scores and counts |
| `activeCategory` | `CategoryId` | Yes | Currently selected category ID |
| `onCategoryClick` | `(id: CategoryId) => void` | Yes | Callback when category is clicked |

### Category Interface

```typescript
interface Category {
  id: CategoryId;           // Unique identifier
  label: string;            // Display name
  icon: React.ReactNode;    // Icon component
  score: number;            // Score (0-100)
  issueCount: number;       // Number of issues
  strengthCount: number;    // Number of strengths
}
```

### CategoryId Type

```typescript
type CategoryId = 
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
```

## Helper Functions

### getCategoryIcon(categoryId: CategoryId)

Returns the appropriate Lucide React icon for each category.

```typescript
import { getCategoryIcon } from './CategorySidebar';

const icon = getCategoryIcon('schema'); // Returns <FileCode />
```

**Icon Mapping**:
- `schema` → FileCode
- `meta` → Tag
- `crawlers` → Bot
- `eeat` → Award
- `structure` → Layout
- `performance` → Gauge
- `content` → FileText
- `citation` → Quote
- `technical` → Wrench
- `links` → Link2
- `aid` → Zap

## Styling

### Tailwind Classes

The component uses a consistent dark theme:

```css
/* Container */
.bg-black/20 border border-slate-800/50 p-3 sticky top-4

/* Header */
.text-xs font-mono text-slate-400 uppercase tracking-wider

/* Button (inactive) */
.bg-black/20 border-l-2 border-transparent text-slate-400
.hover:bg-black/40 hover:text-slate-300

/* Button (active) */
.bg-blue-500/20 border-l-2 border-blue-500 text-slate-200

/* Score Badge */
.text-[10px] font-bold px-1.5 py-0.5 rounded border

/* Issue Badge */
.bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded
```

## Integration with AnalysisTab

The CategorySidebar is designed to work seamlessly with the AnalysisTab component:

1. **State Management**: Parent manages active category state
2. **Category Building**: Parent builds category array from audit results
3. **Click Handling**: Parent handles category selection and mobile sidebar closing
4. **Responsive Behavior**: Parent controls sidebar visibility on mobile

```tsx
// In AnalysisTab.tsx
const handleCategoryClick = (categoryId: CategoryId) => {
  setActiveCategory(categoryId);
  // Close sidebar on mobile after selection
  if (window.innerWidth < 1024) {
    setIsSidebarOpen(false);
  }
};
```

## Responsive Behavior

### Desktop (≥1024px)
- Fixed width: `w-64`
- Sticky positioning: `sticky top-4`
- Always visible

### Tablet (768-1024px)
- Collapsible via mobile menu toggle
- Full width when open

### Mobile (<768px)
- Hidden by default
- Shown via menu toggle button
- Closes automatically after category selection

## Performance Considerations

- **Memoization**: Consider wrapping in `React.memo` if categories don't change often
- **Icon Optimization**: Icons are imported from lucide-react (tree-shakeable)
- **Minimal Re-renders**: Component only re-renders when props change

## Testing

### Unit Tests

```typescript
describe('CategorySidebar', () => {
  it('renders all categories', () => {
    // Test that all 11 categories are rendered
  });

  it('highlights active category', () => {
    // Test active state styling
  });

  it('shows issue count badges', () => {
    // Test issue count display
  });

  it('calls onCategoryClick when clicked', () => {
    // Test click handler
  });

  it('applies correct score colors', () => {
    // Test color-coding logic
  });
});
```

### Accessibility Tests

```typescript
describe('CategorySidebar Accessibility', () => {
  it('has proper ARIA labels', () => {
    // Test aria-label includes score
  });

  it('marks active category with aria-current', () => {
    // Test aria-current="true"
  });

  it('is keyboard navigable', () => {
    // Test tab navigation
  });
});
```

## Future Enhancements

### Potential Improvements
- [ ] Add keyboard shortcuts (1-9, 0, -)
- [ ] Add category search/filter
- [ ] Add collapse/expand animation
- [ ] Add category grouping (e.g., Technical, Content, SEO)
- [ ] Add tooltips with detailed info on hover
- [ ] Add strength count badges (green)
- [ ] Add progress bars in sidebar
- [ ] Add category icons customization

### Performance Optimizations
- [ ] Virtualize list for very long category lists
- [ ] Lazy load category icons
- [ ] Memoize score color calculations

## Related Components

- **AnalysisTab**: Parent component that uses CategorySidebar
- **CategoryDetailView**: Shows details for selected category
- **TabButton**: Similar button styling pattern
- **useAuditNavigation**: Hook for managing navigation state

## Requirements Satisfied

✅ **Task 8 Requirements**:
- ✅ Create `CategorySidebar.tsx` component
- ✅ List all 11 categories with scores
- ✅ Add color-coded score badges
- ✅ Add issue count indicators
- ✅ Implement active category highlighting
- ✅ Add smooth scroll to category (parent handles)
- ✅ Navigation UX with visual feedback

## Version History

- **v1.0.0** (2025-12-04): Initial implementation
  - All 11 categories supported
  - Color-coded score badges
  - Issue count indicators
  - Active state highlighting
  - Full accessibility support

---

**Status**: ✅ Complete  
**Last Updated**: December 4, 2025  
**Component Location**: `src/pages/dashboard/audit/tabs/CategorySidebar.tsx`
