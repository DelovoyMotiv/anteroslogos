# Broken Links UI Display - Visual Example

## DetailedMetrics.tsx Display

### Link Analysis Metrics Section

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔗 LINK ANALYSIS METRICS                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Total    │ │ Internal │ │ External │ │ Nofollow │          │
│  │ Links    │ │          │ │          │ │          │          │
│  │   45     │ │    32    │ │    13    │ │    5     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Nofollow │ │ Unique   │ │ Unique   │ │ Anchor   │          │
│  │ Ratio    │ │ Internal │ │ External │ │ Quality  │          │
│  │  11.1%   │ │    28    │ │    11    │ │   85%    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Empty    │ │ Image    │ │ Link     │ │ Distrib- │          │
│  │ Anchors  │ │ Links    │ │ Depth    │ │ ution    │          │
│  │    2     │ │    8     │ │ balanced │ │   good   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  ┌──────────┐                                                   │
│  │ Broken   │  🔴 Red if > 0, 🟢 Green if 0                    │
│  │ Links    │                                                   │
│  │    3     │                                                   │
│  └──────────┘                                                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 BROKEN LINKS (3)                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://example.com/old-page                              │ │
│  │ [HTTP 404] 🔴                                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://external-site.com/resource                        │ │
│  │ [HTTP 503] 🟠                                             │ │
│  │ Error: Service Unavailable                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://moved-page.com/article                            │ │
│  │ [HTTP 301] 🟡 [Redirected]                                │ │
│  │ Redirected to: https://moved-page.com/new-article         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## CategoryDetailView.tsx Display (Link Analysis Tab)

### Broken Links Section

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔗 LINK ANALYSIS                                    Score: 78.5 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Progress Bar: ████████████████████░░░░░░░░ 78.5%]             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Link Metrics                                                     │
├─────────────────────────────────────────────────────────────────┤
│  ... (other metrics) ...                                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 BROKEN LINKS (3)                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://example.com/old-page                          ❌  │ │
│  │ [HTTP 404] 🔴                                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://external-site.com/resource                    ❌  │ │
│  │ [HTTP 503] 🟠                                             │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ Error: Service Unavailable                          │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://moved-page.com/article                        ❌  │ │
│  │ [HTTP 301] 🔴 [Redirected] 🟡                             │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ Final URL: https://moved-page.com/new-article       │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### No Broken Links Display

```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ No broken links detected                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Coding Legend

### Status Codes:
- 🔴 **Red (400-499)**: Client errors (404 Not Found, 403 Forbidden, etc.)
- 🟠 **Orange (500-599)**: Server errors (500 Internal Server Error, 503 Service Unavailable, etc.)
- ⚫ **Gray (0)**: Connection failures (timeout, DNS error, network error)

### Additional Indicators:
- 🟡 **Yellow**: Redirected links (301, 302, 307, 308)
- ✅ **Green**: No broken links detected
- ❌ **Red X**: Broken link indicator

---

## Responsive Behavior

### Desktop (> 768px):
- Metrics displayed in 4-column grid
- Broken links displayed in full width cards
- URLs displayed with truncation and tooltip

### Tablet (768px - 1024px):
- Metrics displayed in 3-column grid
- Broken links displayed in full width cards
- URLs truncated with ellipsis

### Mobile (< 768px):
- Metrics displayed in 2-column grid
- Broken links displayed in stacked cards
- URLs truncated with ellipsis
- Status badges wrap to new line if needed

---

## Interaction Details

### Hover States:
- Metric cards: Subtle highlight
- Broken link cards: Border color intensifies
- URLs: Show full URL in tooltip

### Click Behavior:
- URLs: Could be made clickable to open in new tab (future enhancement)
- Status badges: Could show more details on click (future enhancement)

---

## Accessibility

### ARIA Labels:
- Broken links section has proper heading hierarchy
- Status codes have semantic meaning
- Color is not the only indicator (text labels included)

### Keyboard Navigation:
- All interactive elements are keyboard accessible
- Proper focus indicators
- Logical tab order

### Screen Readers:
- Descriptive labels for all metrics
- Status information announced properly
- Error messages clearly associated with URLs

---

## Example Data Scenarios

### Scenario 1: Multiple Broken Links
```typescript
brokenLinkDetails: [
  { url: 'https://example.com/page1', status: 404, broken: true, redirected: false },
  { url: 'https://example.com/page2', status: 500, broken: true, redirected: false, error: 'Internal Server Error' },
  { url: 'https://example.com/page3', status: 0, broken: true, redirected: false, error: 'Connection timeout' }
]
```

### Scenario 2: Redirected Links
```typescript
brokenLinkDetails: [
  { 
    url: 'https://example.com/old', 
    status: 301, 
    broken: false, 
    redirected: true, 
    finalUrl: 'https://example.com/new' 
  }
]
```

### Scenario 3: No Broken Links
```typescript
brokenLinks: 0,
brokenLinkDetails: []
```

### Scenario 4: Broken Link Checking Disabled
```typescript
brokenLinks: 0,
brokenLinkDetails: undefined  // Section won't display
```

---

## Implementation Notes

### Conditional Rendering:
1. Broken links section only shows when `brokenLinkDetails` exists and has items
2. Success message shows when `brokenLinks === 0` and `brokenLinkDetails !== undefined`
3. No section appears when broken link checking is disabled

### Performance:
- List is not paginated (assumes reasonable number of broken links)
- Could add pagination if > 20 broken links (future enhancement)
- URLs are truncated to prevent layout issues

### Error Handling:
- Gracefully handles missing fields
- Displays "Connection Failed" when status is 0
- Shows error message when available
- Handles missing finalUrl for redirects

---

This UI design provides comprehensive broken link information while maintaining the existing design system and ensuring a great user experience.
