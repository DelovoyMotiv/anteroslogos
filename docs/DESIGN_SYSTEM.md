# Anóteros Lógos — HUD-Style Design System
**Enterprise-Grade Scientific Aesthetic**

> Version 1.0 — November 2025

---

## Philosophy

This design system implements a **HUD (Heads-Up Display)** aesthetic inspired by aviation cockpits, scientific instruments, and laboratory equipment. Every pixel serves a purpose. Information density is maximized without sacrificing readability.

### Core Principles

1. **High-Density Information Design**
   - Minimal padding/margins (2-3 spacing units)
   - Monospace fonts for all numeric data
   - No decorative elements
   - Grid-based layouts with tight gutters

2. **Scientific Aesthetic**
   - Slate/Zinc dark palette (not generic gray)
   - 1px borders throughout
   - Glassmorphism only for functional layering
   - Status indicators (dots, lines) for system state

3. **Data Visualization First**
   - Inline sparklines and mini-charts
   - Real-time metrics with trend indicators
   - Bar charts embedded in components
   - Color-coded status (nominal/warning/critical)

4. **HUD-Style Components**
   - Borderless or single-pixel borders
   - Monospace typography for labels
   - UPPERCASE tracking-widest labels
   - Subtle backdrop-blur for depth

---

## Color Palette

### Base Colors (Pure Black + Slate Borders)
```css
bg-black          /* #000000 - Primary background */
bg-black/20       /* #000000/20 - Panel background (pure transparency) */
bg-black/30       /* #000000/30 - Panel hover */
bg-black/60       /* #000000/60 - Sidebar background */
border-slate-800/50 /* #1e293b/50 - Primary border */
border-slate-700  /* #334155 - Secondary border */
```

### Text Colors
```css
text-slate-100    /* #f1f5f9 - Primary text */
text-slate-200    /* #e2e8f0 - Secondary text */
text-slate-300    /* #cbd5e1 - Tertiary text */
text-slate-400    /* #94a3b8 - Muted text */
text-slate-500    /* #64748b - Labels */
text-slate-600    /* #475569 - Sublabels */
```

### Status Colors
```css
/* Nominal (Green) */
bg-emerald-500    /* #10b981 - Status dot */
text-emerald-400  /* #34d399 - Trend up */

/* Warning (Amber) */
border-amber-500/20 /* #f59e0b/20 */
bg-amber-950/10   /* #451a03/10 */

/* Critical (Red) */
border-red-500/20 /* #ef4444/20 */
bg-red-950/10     /* #450a0a/10 */
```

### Accent Colors
```css
/* Blue (Primary action) */
bg-blue-500       /* #3b82f6 */
bg-blue-500/10    /* #3b82f6/10 - Subtle highlight */
border-blue-500/30 /* #3b82f6/30 */

/* Purple (Agency tier) */
bg-purple-500     /* #a855f7 */
border-purple-500/30 /* #a855f7/30 */
```

---

## Typography

### Font Families
```css
font-sans: Inter, system-ui, sans-serif
font-mono: JetBrains Mono, monospace
font-display: Space Grotesk, DM Sans, sans-serif
```

### Typography Scale
```css
/* Headers */
text-base uppercase tracking-tight  /* System headers */
text-sm font-mono font-semibold     /* Panel headers */
text-xs font-mono uppercase tracking-widest /* Labels */

/* Metrics */
text-2xl font-mono font-bold        /* Primary metrics */
text-lg font-mono font-bold         /* Secondary metrics */

/* Body */
text-xs font-mono                   /* Body text */
text-[10px] font-mono               /* Sublabels */
text-[9px] font-mono uppercase      /* Micro labels */
```

---

## Component Patterns

### MetricPanel (Primary KPI Display)
```tsx
<div className="border border-slate-700/50 bg-black/20 backdrop-blur-md p-2.5">
  {/* Status indicator */}
  <div className="flex items-center gap-1.5">
    <div className="w-1 h-1 rounded-full bg-emerald-500" />
    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
      LABEL
    </span>
  </div>
  
  {/* Value */}
  <div className="font-mono font-bold text-2xl text-slate-100 leading-none">
    123.4K
  </div>
  
  {/* Sublabel */}
  <div className="text-[10px] font-mono text-slate-600">
    sublabel text
  </div>
</div>
```

### ActionPanel (Clickable Navigation)
```tsx
<Link className="border border-slate-800/50 bg-black/20 backdrop-blur-md hover:border-slate-700 hover:bg-black/30 transition-all group">
  <div className="p-2.5 flex items-center gap-2.5">
    <div className="p-1.5 border border-slate-800/50 bg-slate-900/50">
      <Icon className="w-4 h-4 text-slate-400" />
    </div>
    <div>
      <div className="text-xs font-mono font-semibold text-slate-300">
        LABEL
      </div>
      <div className="text-[10px] font-mono text-slate-600">
        description
      </div>
    </div>
  </div>
</Link>
```

### Bar Chart (Progress Indicator)
```tsx
<div className="relative h-8 bg-slate-900/50 border border-slate-800/50">
  <div 
    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600/20 to-blue-500/30 border-r border-blue-500/50"
    style={{ width: `${percent}%` }}
  >
    <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
  </div>
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="text-xs font-mono font-bold text-slate-300">
      {percent}% CONSUMED
    </span>
  </div>
</div>
```

---

## Spacing System

### Grid Gaps
```css
gap-2    /* 8px - Primary grid gap */
gap-3    /* 12px - Secondary grid gap */
gap-1.5  /* 6px - Tight elements */
```

### Padding
```css
p-2.5    /* 10px - Panel padding */
px-3 py-2 /* 12px/8px - Button padding */
px-2.5 py-1.5 /* 10px/6px - Compact padding */
```

### Margin/Spacing
```css
space-y-3 /* 12px - Section spacing */
space-y-2 /* 8px - Component spacing */
space-y-0.5 /* 2px - Dense list spacing */
```

---

## Border System

### Border Widths
```css
border     /* 1px - Primary borders (HUD standard) */
border-l-2 /* 2px - Active state indicator */
```

### Border Colors by Context
```css
/* Panel borders */
border-slate-800/50

/* Interactive borders */
border-slate-700 (hover)
border-blue-500 (active)

/* Status borders */
border-blue-500/20 (info)
border-amber-500/20 (warning)
border-red-500/20 (critical)
```

---

## Interactive States

### Hover States
```css
hover:bg-slate-900/50        /* Panel hover */
hover:border-slate-700       /* Border hover */
hover:text-slate-300         /* Text hover */
```

### Active States
```css
bg-blue-950/30               /* Active panel background */
border-blue-500              /* Active border (2px left) */
text-blue-300                /* Active text */
```

### Focus States
Use same visual treatment as hover (HUD consistency)

---

## Animation Guidelines

### Allowed Animations
```css
animate-pulse         /* Status indicators only */
transition-all        /* Hover states */
transition-colors     /* Color shifts */
```

### Forbidden Animations
- ❌ Scale transforms (except subtle pulse)
- ❌ Rotation (except collapse icons)
- ❌ Slide-in effects
- ❌ Fade transitions > 200ms

---

## Layout Patterns

### Primary Dashboard Grid
```tsx
<div className="space-y-3">
  {/* Header with status */}
  <div className="border-b border-slate-800/50 pb-3">
    ...
  </div>
  
  {/* Metrics grid */}
  <div className="grid grid-cols-4 gap-2">
    ...
  </div>
  
  {/* Full-width panel */}
  <div className="border border-slate-800/50">
    ...
  </div>
  
  {/* Action grid */}
  <div className="grid grid-cols-3 gap-2">
    ...
  </div>
</div>
```

### Sidebar Layout
```tsx
<div className="fixed left-0 w-64 h-screen bg-slate-950 border-r border-slate-800/50">
  {/* Header: h-14 */}
  <div className="h-14 border-b border-slate-800/50">
    ...
  </div>
  
  {/* Nav: flex-1 */}
  <nav className="flex-1 px-2 py-3 space-y-0.5">
    ...
  </nav>
  
  {/* Footer: auto height */}
  <div className="border-t border-slate-800/50 p-2.5">
    ...
  </div>
</div>
```

---

## Accessibility

### Contrast Ratios
- Text on bg-slate-950: All text-slate-* colors meet WCAG AA
- Interactive elements: Minimum 3:1 for borders
- Status indicators: Redundant encoding (color + shape)

### Keyboard Navigation
- All interactive elements accessible via Tab
- Focus states mirror hover states
- Skip links for screen readers

### Screen Readers
- Semantic HTML throughout
- aria-label for icon-only buttons
- Live regions for status updates

---

## Implementation Notes

### Tailwind Config
Slate palette is built-in to Tailwind v3+. No custom colors needed.

### Font Loading
```tsx
import '@fontsource/inter';
import '@fontsource/jetbrains-mono';
```

### Dark Mode
All components use direct color classes (no dark: prefix toggle). This is a dark-only design system.

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- backdrop-filter support required

---

## Examples

See `src/pages/dashboard/OverviewPage.tsx` for reference implementation.

### Before (Generic Dashboard)
- Rounded corners everywhere
- Large padding (p-6)
- Colorful icon backgrounds
- Generic gray palette
- Low information density

### After (HUD Dashboard)
- Sharp borders (1px)
- Tight padding (p-2.5)
- Monospace metrics
- Slate palette
- 3x information density

---

## Version History

**v1.1** (Nov 2025) - Unified background design
- DigitalBackground component integrated (animated canvas)
- Pure black transparency (bg-black/20) instead of slate tints
- Enhanced glassmorphism (backdrop-blur-md/xl)
- Unified visual language across main site and dashboard

**v1.0** (Nov 2025) - Initial HUD-style implementation
- Slate palette adoption
- High-density metric panels
- Scientific aesthetic
- Monospace typography system
