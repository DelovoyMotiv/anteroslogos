# Tab Components

Base components for the GEO Audit tabbed navigation interface.

## Overview

This directory contains reusable tab components that provide a consistent, accessible, and performant tabbed interface for the GEO Audit system.

## Components

### TabContainer

Wrapper component for tab navigation interface.

**Features:**
- Horizontal tab bar layout
- Bottom border separator
- Responsive spacing
- Consistent styling

**Usage:**
```tsx
import { TabContainer } from './tabs';

<TabContainer>
  <TabButton ... />
  <TabButton ... />
</TabContainer>
```

**Props:**
- `children: React.ReactNode` - Tab buttons to render
- `className?: string` - Optional additional CSS classes

---

### TabButton

Individual tab button with active/hover states and optional badge.

**Features:**
- Active state styling (blue border, darker background)
- Hover state styling (lighter background)
- Icon support with color coding
- Optional badge for notifications/counts
- Keyboard accessible (focus ring)
- Smooth transitions
- ARIA attributes for accessibility

**Usage:**
```tsx
import { TabButton } from './tabs';
import { BarChart3 } from 'lucide-react';

<TabButton
  id="overview"
  label="Overview"
  icon={<BarChart3 className="w-4 h-4" />}
  isActive={activeTab === 'overview'}
  onClick={() => setActiveTab('overview')}
  badge={5}
/>
```

**Props:**
- `id: string` - Unique identifier for the tab
- `label: string` - Display label
- `icon: React.ReactNode` - Icon element
- `isActive: boolean` - Whether tab is currently active
- `onClick: () => void` - Click handler
- `badge?: number` - Optional badge count
- `className?: string` - Optional additional CSS classes
- `ariaLabel?: string` - Optional ARIA label for accessibility

**Styling:**
- Active: `bg-black/40 border-blue-500 text-slate-200`
- Inactive: `bg-black/20 border-transparent text-slate-500`
- Hover: `hover:bg-black/30 hover:text-slate-300`
- Icon (active): `text-blue-400`
- Icon (inactive): `text-slate-500`

---

### TabContent

Wrapper for tab content with smooth fade-in transitions.

**Features:**
- Fade-in animation on mount
- Slide-up effect for smooth appearance
- Conditional rendering (only renders when active)
- Performance optimized (doesn't render inactive content)
- ARIA attributes for accessibility

**Usage:**
```tsx
import { TabContent } from './tabs';

<TabContent isActive={activeTab === 'overview'}>
  <OverviewTab result={result} />
</TabContent>
```

**Props:**
- `isActive: boolean` - Whether content should be displayed
- `children: React.ReactNode` - Content to render when active
- `className?: string` - Optional additional CSS classes
- `id?: string` - Optional ID for the content panel

**Animation:**
- Duration: 200ms
- Easing: ease-in-out
- Effect: Fade in + slide up 10px

---

## Complete Example

```tsx
import { TabContainer, TabButton, TabContent } from './tabs';
import { useAuditNavigation } from '../hooks/useAuditNavigation';
import { BarChart3, Search, Lightbulb, Settings } from 'lucide-react';

function AuditTabs({ result }) {
  const { state, setActiveTab } = useAuditNavigation();

  return (
    <>
      {/* Tab Navigation */}
      <TabContainer>
        <TabButton
          id="overview"
          label="Overview"
          icon={<BarChart3 className="w-4 h-4" />}
          isActive={state.activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          id="analysis"
          label="Analysis"
          icon={<Search className="w-4 h-4" />}
          isActive={state.activeTab === 'analysis'}
          onClick={() => setActiveTab('analysis')}
          badge={11} // 11 categories
        />
        <TabButton
          id="insights"
          label="Insights"
          icon={<Lightbulb className="w-4 h-4" />}
          isActive={state.activeTab === 'insights'}
          onClick={() => setActiveTab('insights')}
        />
        <TabButton
          id="technical"
          label="Technical"
          icon={<Settings className="w-4 h-4" />}
          isActive={state.activeTab === 'technical'}
          onClick={() => setActiveTab('technical')}
        />
      </TabContainer>

      {/* Tab Content */}
      <TabContent isActive={state.activeTab === 'overview'}>
        <OverviewTab result={result} />
      </TabContent>

      <TabContent isActive={state.activeTab === 'analysis'}>
        <AnalysisTab result={result} />
      </TabContent>

      <TabContent isActive={state.activeTab === 'insights'}>
        <InsightsTab result={result} />
      </TabContent>

      <TabContent isActive={state.activeTab === 'technical'}>
        <TechnicalTab result={result} />
      </TabContent>
    </>
  );
}
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Tab buttons are keyboard accessible with focus indicators
- **ARIA Attributes**: Proper `role`, `aria-selected`, `aria-hidden`, and `aria-label` attributes
- **Focus Management**: Clear focus indicators with ring styling
- **Screen Reader Support**: Semantic HTML and ARIA labels

## Performance

- **Conditional Rendering**: TabContent only renders when active
- **Smooth Transitions**: 200ms animations for professional feel
- **Optimized Re-renders**: Components use React best practices

## Styling

Components use Tailwind CSS with the following design system:

**Colors:**
- Background (active): `bg-black/40`
- Background (inactive): `bg-black/20`
- Background (hover): `bg-black/30`
- Border (active): `border-blue-500`
- Text (active): `text-slate-200`
- Text (inactive): `text-slate-500`
- Icon (active): `text-blue-400`
- Badge: `bg-red-500`

**Typography:**
- Font: `font-mono`
- Size: `text-xs`
- Transform: `uppercase`
- Tracking: `tracking-wider`

**Spacing:**
- Padding: `px-4 py-3`
- Gap: `gap-1` (between buttons), `gap-2` (icon-label)
- Margin: `mb-6` (after tab bar)

## Animation

The fadeIn animation is defined in `index.css`:

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Mobile Dropdown**: Replace horizontal tabs with dropdown on mobile
2. **Swipe Gestures**: Add touch swipe support for mobile
3. **Keyboard Shortcuts**: Ctrl+1/2/3/4 for quick tab switching
4. **Tab Prefetching**: Preload next probable tab content
5. **Loading States**: Add skeleton loaders for tab content
6. **Tab Badges**: More sophisticated badge types (colors, icons)

## Related Files

- `hooks/useAuditNavigation.ts` - Navigation state management
- `tabs/OverviewTab/` - Overview tab implementation (future)
- `tabs/AnalysisTab/` - Analysis tab implementation (future)
- `tabs/InsightsTab/` - Insights tab implementation (future)
- `tabs/TechnicalTab/` - Technical tab implementation (future)

---

*Part of the GEO Audit Complete Restoration project*  
*Ph.D.-level Engineering Standards*
