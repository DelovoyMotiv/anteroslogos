# ROI Calculator Component

## Overview

The **ROI Calculator** is a comprehensive analysis component that calculates Return on Investment (ROI) for all audit recommendations. It helps users prioritize improvements by showing the relationship between impact and effort, potential score improvements, and time investment required.

## Features

### 1. ROI Calculation
- **Impact Score**: Based on priority level (critical=4, high=3, medium=2, low=1)
- **Effort Score**: Based on effort level (quick-win=1, strategic=2, long-term=3)
- **ROI Formula**: `(Impact / Effort) × 10` for granularity
- Higher ROI = Better return on investment

### 2. Score Improvement Estimation
- **Critical Priority**: +8-12 points
- **High Priority**: +5-8 points
- **Medium Priority**: +3-5 points
- **Low Priority**: +1-3 points

### 3. Time Investment Analysis
- Parses time estimates from recommendations
- Aggregates total time investment
- Converts to human-readable format (minutes, hours, days)

### 4. ROI Distribution
Groups recommendations into four tiers:
- **Excellent**: ROI ≥ 30 (highest priority)
- **Good**: ROI 20-29 (high priority)
- **Fair**: ROI 10-19 (medium priority)
- **Poor**: ROI < 10 (low priority)

### 5. Visual Components

#### Summary Cards
- **Total Impact**: Shows potential score improvement range and projected score
- **Time Investment**: Displays total time required for all recommendations
- **Average ROI**: Shows average ROI across all recommendations

#### ROI Distribution
- Visual breakdown of recommendations by ROI tier
- Count and description for each tier
- Color-coded for easy identification

#### Top 10 by ROI
- Lists top 10 recommendations sorted by ROI score
- Shows rank, title, priority, category, and ROI score
- Displays impact, effort, and time metrics
- Visual arrow indicator based on ROI tier

#### Implementation Strategy
- Three-phase approach for tackling recommendations
- Phase 1: Excellent ROI items (quick wins)
- Phase 2: Good ROI items (strategic improvements)
- Phase 3: Fair/Poor ROI items (comprehensive optimization)

## Usage

```tsx
import { ROICalculator } from './tabs/ROICalculator';

<ROICalculator 
  recommendations={result.recommendations} 
  currentScore={result.preciseScore} 
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `recommendations` | `EnhancedRecommendation[]` | Yes | Array of all recommendations from audit |
| `currentScore` | `number` | Yes | Current overall score for improvement calculations |

## ROI Calculation Examples

### Example 1: Critical Priority, Quick Win
- Priority: critical (impact = 4)
- Effort: quick-win (effort = 1)
- ROI = (4 / 1) × 10 = **40** (Excellent)
- Potential Improvement: +8-12 points

### Example 2: High Priority, Strategic
- Priority: high (impact = 3)
- Effort: strategic (effort = 2)
- ROI = (3 / 2) × 10 = **15** (Fair)
- Potential Improvement: +5-8 points

### Example 3: Medium Priority, Long-term
- Priority: medium (impact = 2)
- Effort: long-term (effort = 3)
- ROI = (2 / 3) × 10 = **6.7** (Poor)
- Potential Improvement: +3-5 points

## Time Parsing

The component intelligently parses various time formats:

- **Minutes**: "30 minutes", "45 min"
- **Hours**: "2 hours", "1.5 hours"
- **Days**: "1 day", "2 days"
- **Weeks**: "1 week", "2 weeks"

Default estimate: 2 hours (120 minutes) if parsing fails

## Color Coding

### ROI Tiers
- **Emerald** (≥30): Excellent ROI
- **Blue** (20-29): Good ROI
- **Yellow** (10-19): Fair ROI
- **Slate** (<10): Poor ROI

### Priority Levels
- **Red**: Critical
- **Orange**: High
- **Yellow**: Medium
- **Slate**: Low

## Integration with InsightsTab

The ROI Calculator is designed to be displayed in the Insights tab alongside:
- AI Insights Panel
- Quick Wins Section
- Correlation Analysis
- Recommendations with Filtering

Recommended placement: After Correlation Analysis, before detailed Recommendations

## Performance Considerations

- Calculations are performed once during render
- No heavy computations or API calls
- Efficient sorting and grouping algorithms
- Memoization not required due to simple calculations

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast meets WCAG 2.1 AA standards
- Screen reader friendly

## Responsive Design

- Mobile: Single column layout, stacked cards
- Tablet: 2-column grid for summary cards
- Desktop: 3-column grid for optimal space usage
- All components adapt to viewport width

## Future Enhancements

1. **Interactive Filtering**: Filter by ROI tier, priority, or category
2. **Sorting Options**: Sort by ROI, impact, effort, or time
3. **Export Functionality**: Export ROI analysis to CSV or PDF
4. **Historical Comparison**: Compare ROI across multiple audits
5. **Custom Weights**: Allow users to adjust impact/effort weights
6. **Visual Charts**: Add bar charts or scatter plots for ROI visualization

## Related Components

- **QuickWins**: Shows top 5 quick wins (subset of ROI Calculator)
- **RecommendationsFilter**: Filters recommendations by various criteria
- **CorrelationAnalysis**: Analyzes relationships between metrics
- **InsightsTab**: Parent component containing all insight features

## Testing

### Unit Tests
- ROI calculation accuracy
- Time parsing for various formats
- Score improvement estimation
- Grouping and sorting logic

### Integration Tests
- Rendering with real audit data
- Interaction with parent components
- Responsive behavior across devices

### Edge Cases
- Empty recommendations array
- Invalid time formats
- Extreme ROI values
- Missing or undefined fields

## Maintenance Notes

- ROI formula is configurable via constants
- Score improvement ranges can be adjusted
- Time parsing logic is extensible
- Color schemes follow design system

## Version History

- **v1.0.0** (2025-12-04): Initial implementation
  - ROI calculation and scoring
  - Score improvement estimation
  - Time investment analysis
  - ROI distribution visualization
  - Top 10 recommendations display
  - Implementation strategy guidance

---

*Part of the GEO Audit Tabbed Navigation System*  
*Ph.D.-level Engineering Standards*
