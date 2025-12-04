# HistoricalComparison Component

## Overview

The `HistoricalComparison` component provides comprehensive historical analysis by comparing the current audit with previous audits for the same domain. It visualizes trends, calculates rate of change, and highlights improving or declining metrics.

## Features

### 1. **Historical Data Fetching**
- Fetches previous audits from Supabase for the same domain
- Filters by user and domain
- Supports multiple time ranges (7d, 30d, 90d, all)
- Handles up to 50 historical audits

### 2. **Trend Analysis**
- **Overall Score Trend**: Shows current score, change, and rate of change
- **Visual Indicators**: 
  - 🟢 TrendingUp icon for improvements (>0.5 points)
  - 🔴 TrendingDown icon for declines (<-0.5 points)
  - ⚪ Minus icon for stable scores
- **Trend Chart**: Line chart showing score history over time

### 3. **Category-Level Comparison**
- Compares all 10 category scores with previous audit
- Shows previous → current score transition
- Displays change amount with color coding
- Labels categories as IMPROVED or DECLINED

### 4. **Rate of Change Calculation**
- Calculates points per day change rate
- Accounts for time between audits
- Helps predict future trends

### 5. **Summary Statistics**
- Total number of audits
- Count of improving categories
- Count of declining categories
- Count of stable categories

## Usage

### Basic Usage

```tsx
import { HistoricalComparison } from './tabs/HistoricalComparison';

<HistoricalComparison result={currentAuditResult} />
```

### Integration in OverviewTab

```tsx
// In OverviewTab.tsx
import { HistoricalComparison } from './HistoricalComparison';

export function OverviewTab({ result }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Existing content */}
      <PreciseScoreDisplay ... />
      <QuickSummary ... />
      
      {/* Add Historical Comparison */}
      <HistoricalComparison result={result} />
      
      {/* Rest of content */}
      <CategoryScoresChart ... />
    </div>
  );
}
```

## Props

### `HistoricalComparisonProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `result` | `AuditResult` | Yes | Current audit result to compare against historical data |

## Data Flow

```
1. Component mounts with current audit result
2. Extracts domain from result.url
3. Fetches historical audits from Supabase:
   - Filters by user_id and domain
   - Filters by time range
   - Orders by timestamp (ascending)
4. Calculates comparisons:
   - Gets previous audit (second-to-last)
   - Calculates change for each metric
   - Calculates rate of change
5. Renders visualizations:
   - Overall score comparison
   - Trend chart
   - Category comparisons
   - Summary stats
```

## Time Range Options

| Range | Description | Use Case |
|-------|-------------|----------|
| `7d` | Last 7 days | Recent changes, quick iterations |
| `30d` | Last 30 days | Monthly trends, regular monitoring |
| `90d` | Last 90 days | Quarterly analysis, long-term trends |
| `all` | All time | Complete history, major changes |

## Visual Design

### Color Coding

- **Emerald (Green)**: Improving metrics (change > 0.5)
- **Red**: Declining metrics (change < -0.5)
- **Slate (Gray)**: Stable metrics (-0.5 ≤ change ≤ 0.5)

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Header + Time Range Selector            │
├─────────────────────────────────────────┤
│ Overall Score Comparison                │
│ ┌─────────┬─────────┬─────────┐        │
│ │ Current │ Change  │ Rate    │        │
│ └─────────┴─────────┴─────────┘        │
│ [Trend Chart]                           │
├─────────────────────────────────────────┤
│ Category Changes                        │
│ ┌─────────────────────────────────┐    │
│ │ 📈 Schema: 75.0 → 82.0 (+7.0)  │    │
│ │ 📉 E-E-A-T: 68.0 → 62.0 (-6.0) │    │
│ │ ...                              │    │
│ └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│ Summary Stats                           │
│ Total | Improving | Declining | Stable │
└─────────────────────────────────────────┘
```

## States

### Loading State
```tsx
<Loader2 className="animate-spin" />
```

### Error State
```tsx
<AlertCircle /> Failed to load historical data
```

### No Data State
```tsx
<BarChart3 /> No previous audits found
Run more audits to see trends
```

### Data Available State
Full comparison UI with all features

## Calculations

### Change Calculation
```typescript
change = currentScore - previousScore
```

### Rate of Change
```typescript
rateOfChange = (currentScore - previousScore) / daysBetween
```

### Days Between Audits
```typescript
daysBetween = (currentTimestamp - previousTimestamp) / (1000 * 60 * 60 * 24)
```

### Trend Classification
```typescript
if (change > 0.5) return 'Improving'
if (change < -0.5) return 'Declining'
return 'Stable'
```

## Dependencies

- **React**: Core framework
- **Recharts**: Trend chart visualization
- **Lucide React**: Icons
- **Supabase**: Historical data storage
- **Auth Guard**: User authentication

## Performance Considerations

1. **Data Fetching**:
   - Limits to 50 audits per query
   - Filters by time range to reduce data
   - Uses indexed columns (user_id, domain, timestamp)

2. **Rendering**:
   - Conditional rendering for empty states
   - Memoization opportunities for calculations
   - Responsive chart sizing

3. **Caching**:
   - Consider adding React Query for caching
   - Invalidate cache on new audit completion

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Color-blind friendly indicators (icons + colors)
- Screen reader friendly text

## Error Handling

1. **No Supabase Connection**: Graceful fallback
2. **No User Session**: Shows loading then empty state
3. **Fetch Errors**: Displays error message
4. **No Historical Data**: Shows helpful empty state
5. **Invalid Data**: Filters and validates

## Future Enhancements

### Potential Features
- [ ] Export historical data as CSV
- [ ] Predictive trend analysis
- [ ] Anomaly detection
- [ ] Comparison with industry benchmarks
- [ ] Multi-domain comparison
- [ ] Custom date range picker
- [ ] Downloadable trend reports
- [ ] Email alerts for significant changes

### Performance Optimizations
- [ ] Implement React Query for caching
- [ ] Add virtual scrolling for large datasets
- [ ] Lazy load chart library
- [ ] Optimize re-renders with useMemo

## Testing

### Unit Tests
```typescript
describe('HistoricalComparison', () => {
  it('calculates change correctly', () => {
    const change = calculateChange(85, 75);
    expect(change).toBe(10);
  });

  it('calculates rate of change', () => {
    const rate = calculateRateOfChange(85, 75, 10);
    expect(rate).toBe(1); // 10 points over 10 days = 1 point/day
  });

  it('classifies trends correctly', () => {
    expect(getTrendLabel(5)).toBe('Improving');
    expect(getTrendLabel(-5)).toBe('Declining');
    expect(getTrendLabel(0.3)).toBe('Stable');
  });
});
```

### Integration Tests
- Test with real Supabase data
- Test time range filtering
- Test empty state handling
- Test error scenarios

## Troubleshooting

### Issue: No historical data showing
**Solution**: 
- Check user is authenticated
- Verify domain matches exactly
- Check time range selection
- Ensure previous audits exist in database

### Issue: Chart not rendering
**Solution**:
- Verify Recharts is installed
- Check data format matches expected structure
- Ensure container has height

### Issue: Slow loading
**Solution**:
- Reduce time range
- Check database indexes
- Implement caching
- Optimize query

## Related Components

- `OverviewTab`: Parent container
- `PreciseScoreDisplay`: Current score display
- `QuickSummary`: Insights summary
- `CategoryScoresChart`: Category visualization

## References

- [Recharts Documentation](https://recharts.org/)
- [Supabase Queries](https://supabase.com/docs/guides/database/queries)
- [Lucide Icons](https://lucide.dev/)

---

**Last Updated**: December 4, 2025  
**Component Version**: 1.0.0  
**Status**: ✅ Production Ready
