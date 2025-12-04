# Mobile Tab Navigation - Quick Start Guide

**Quick reference for using the mobile tab navigation system**

---

## TL;DR

Mobile users get a dropdown selector + swipe gestures. Desktop users get horizontal tabs. Everything is touch-optimized and accessible.

---

## Usage

### Basic Setup

```tsx
import { 
  TabContainer, 
  TabButton, 
  TabContent, 
  MobileTabDropdown 
} from './tabs';
import type { MobileTab } from './tabs';
import { useAuditNavigation } from './hooks/useAuditNavigation';
import { useSwipeGesture, getAdjacentTab } from './hooks/useSwipeGesture';

function MyComponent() {
  const { state, setActiveTab } = useAuditNavigation();
  
  // Define tab order
  const tabOrder = ['overview', 'analysis', 'insights', 'technical'];
  
  // Define mobile tabs
  const mobileTabs: MobileTab[] = [
    { id: 'overview', label: 'Overview', icon: <Icon /> },
    { id: 'analysis', label: 'Analysis', icon: <Icon />, badge: 11 },
    // ... more tabs
  ];
  
  // Setup swipe gestures
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => setActiveTab(getAdjacentTab(tabOrder, state.activeTab, 'next')),
    onSwipeRight: () => setActiveTab(getAdjacentTab(tabOrder, state.activeTab, 'previous')),
  });
  
  return (
    <>
      {/* Mobile dropdown */}
      <div className="md:hidden">
        <MobileTabDropdown
          tabs={mobileTabs}
          activeTab={state.activeTab}
          onTabChange={setActiveTab}
        />
      </div>
      
      {/* Desktop tabs */}
      <TabContainer>
        <TabButton id="overview" label="Overview" icon={<Icon />} ... />
      </TabContainer>
      
      {/* Content with swipe support */}
      <div {...swipeHandlers}>
        <TabContent isActive={state.activeTab === 'overview'}>
          <OverviewTab />
        </TabContent>
      </div>
    </>
  );
}
```

---

## Components

### MobileTabDropdown

**When to use**: Mobile devices (<768px)

**Props**:
```typescript
{
  tabs: MobileTab[];        // Array of tab definitions
  activeTab: TabId;         // Currently active tab
  onTabChange: (TabId) => void;  // Tab change handler
}
```

**Features**:
- Touch-optimized (44x44px)
- Icon + label + badge
- Click-outside to close
- Escape key to close
- Full accessibility

### useSwipeGesture

**When to use**: Enable swipe navigation on mobile

**Options**:
```typescript
{
  onSwipeLeft?: () => void;      // Next tab
  onSwipeRight?: () => void;     // Previous tab
  threshold?: number;            // Min distance (default: 50px)
  maxVerticalMovement?: number;  // Max vertical (default: 100px)
  minVelocity?: number;          // Min speed (default: 0.3 px/ms)
}
```

**Returns**: Touch event handlers to spread on container

---

## Responsive Behavior

| Screen Size | Dropdown | Horizontal Tabs | Swipe Gestures |
|-------------|----------|-----------------|----------------|
| Mobile (<768px) | ✅ Visible | ❌ Hidden | ✅ Enabled |
| Desktop (≥768px) | ❌ Hidden | ✅ Visible | ⚠️ Optional |

---

## Touch Targets

All interactive elements meet WCAG 2.1 AAA standards:

- **Minimum size**: 44x44px ✅
- **Spacing**: 8px minimum ✅
- **Full tap area**: 100% width ✅

---

## Swipe Gestures

### How it works

1. **Swipe left** → Next tab (wraps around)
2. **Swipe right** → Previous tab (wraps around)

### Detection rules

- Horizontal movement ≥ 50px
- Vertical movement < 100px
- Velocity ≥ 0.3 px/ms

### Why these rules?

- Prevents accidental swipes during scrolling
- Ensures intentional gestures
- Feels natural and responsive

---

## Accessibility

### Keyboard Navigation

- **Tab**: Focus dropdown
- **Enter/Space**: Open dropdown
- **Arrow keys**: Navigate menu
- **Enter**: Select item
- **Escape**: Close dropdown

### Screen Readers

- Dropdown announces: "Select tab, button, expanded/collapsed"
- Items announce: "Overview tab - View summary, option, selected/not selected"
- Tab panels announce: "Overview tab panel"

### WCAG Compliance

- ✅ Level A: Keyboard accessible, semantic HTML
- ✅ Level AA: Color contrast, focus indicators
- ✅ Level AAA: 44x44px touch targets

---

## Common Patterns

### Tab with Badge

```tsx
{
  id: 'analysis',
  label: 'Analysis',
  icon: <Search className="w-4 h-4" />,
  badge: 11,  // Shows notification count
  ariaLabel: 'Analysis tab - 11 categories',
}
```

### Tab without Badge

```tsx
{
  id: 'overview',
  label: 'Overview',
  icon: <BarChart3 className="w-4 h-4" />,
  ariaLabel: 'Overview tab - View summary',
}
```

### Wrap-around Navigation

```tsx
const nextTab = getAdjacentTab(
  ['overview', 'analysis', 'insights', 'technical'],
  'technical',  // Current tab
  'next'        // Direction
);
// Result: 'overview' (wraps around)
```

---

## Styling

### Dropdown Button

```css
min-height: 44px
padding: 12px 16px
background: bg-black/40
border: border-slate-700/50
text: text-slate-200
```

### Menu Items

```css
min-height: 44px
padding: 12px 16px
background: transparent (inactive)
background: bg-blue-500/20 (active)
border-left: 2px blue (active)
```

### Animations

```css
Dropdown open: 200ms fade-in + slide-in
Tab transition: 200ms fade-in + slide-up
```

---

## Testing

### Quick Test Checklist

Mobile:
- [ ] Tap dropdown to open
- [ ] Tap item to select
- [ ] Tap outside to close
- [ ] Swipe left/right to change tabs
- [ ] All touch targets ≥44px

Desktop:
- [ ] Horizontal tabs visible
- [ ] Dropdown hidden
- [ ] Click tabs to switch
- [ ] Hover effects work

Accessibility:
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Focus indicators visible

---

## Troubleshooting

### Dropdown not showing on mobile

**Check**: Is the container using `md:hidden` class?

```tsx
<div className="md:hidden">
  <MobileTabDropdown ... />
</div>
```

### Swipe not working

**Check**: Are swipe handlers applied to container?

```tsx
const swipeHandlers = useSwipeGesture({ ... });

<div {...swipeHandlers}>
  <TabContent>...</TabContent>
</div>
```

### Touch targets too small

**Check**: Are you using minimum 44px height?

```tsx
className="min-h-[44px] px-4 py-3"
```

### Swipe triggers during scroll

**Check**: Adjust vertical movement threshold

```tsx
useSwipeGesture({
  maxVerticalMovement: 150,  // Increase if needed
  ...
})
```

---

## Performance Tips

1. **Use React.memo** for tab content components
2. **Lazy load** tab content (only render active tab)
3. **Debounce** rapid swipes (built-in)
4. **Cleanup** event listeners (automatic)

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Safari (iOS) | 15+ | ✅ |
| Chrome (Android) | 10+ | ✅ |
| Firefox (Android) | 10+ | ✅ |
| Samsung Internet | 10+ | ✅ |
| Edge | Latest | ✅ |

---

## Files

```
src/pages/dashboard/audit/
├── tabs/
│   ├── MobileTabDropdown.tsx      # Mobile dropdown
│   ├── TabContainer.tsx           # Desktop tabs
│   ├── TabButton.tsx              # Tab button
│   ├── TabContent.tsx             # Content wrapper
│   └── index.ts                   # Exports
├── hooks/
│   ├── useAuditNavigation.ts      # Navigation state
│   └── useSwipeGesture.ts         # Swipe detection
└── AuditPage.tsx                  # Integration
```

---

## Need More Help?

- **Full documentation**: `MOBILE_NAVIGATION_README.md`
- **Implementation details**: `task-28-implementation-summary.md`
- **Testing guide**: `task-28-testing-checklist.md`
- **Visual guide**: `task-28-visual-guide.md`

---

**Quick Start Complete!** 🚀

Now you're ready to use mobile tab navigation in your app.

