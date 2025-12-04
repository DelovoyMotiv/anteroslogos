# Historical Comparison - Quick Start Guide

**Component**: `HistoricalComparison.tsx`  
**Location**: Overview Tab  
**Status**: ✅ Production Ready

---

## 🚀 Quick Start

### Basic Usage

```tsx
import { HistoricalComparison } from './tabs/HistoricalComparison';

<HistoricalComparison result={currentAuditResult} />
```

### Already Integrated

The component is already integrated into the Overview tab. No additional setup needed!

---

## 📊 What It Does

Compares your current audit with previous audits for the same domain:

- **Overall Score Trend**: Shows current score, change, and rate of change
- **Trend Chart**: Visual line chart of score history
- **Category Comparisons**: All 10 categories with trend indicators
- **Summary Stats**: Quick overview of improving/declining metrics

---

## 🎯 Key Features

### 1. Time Range Selector
Choose your analysis period:
- **7d**: Last 7 days (recent changes)
- **30d**: Last 30 days (monthly trends)
- **90d**: Last 90 days (quarterly analysis)
- **All**: Complete history

### 2. Trend Indicators
Visual feedback for score changes:
- 📈 **Green**: Improving (>0.5 points)
- 📉 **Red**: Declining (<-0.5 points)
- ➖ **Gray**: Stable (-0.5 to 0.5 points)

### 3. Rate of Change
Unique metric showing velocity:
- **+0.52/day**: Improving by 0.52 points per day
- **-0.15/day**: Declining by 0.15 points per day

---

## 🎨 Visual Design

### Color Coding
- **Emerald**: Improvements
- **Red**: Declines
- **Slate**: Stable

### Layout
```
┌─────────────────────────────┐
│ Header + Time Range         │
├─────────────────────────────┤
│ Overall Score Comparison    │
│ [Current] [Change] [Rate]   │
│ [Trend Chart]               │
├─────────────────────────────┤
│ Category Changes            │
│ • Schema: 75→82 (+7) ✓      │
│ • E-E-A-T: 68→62 (-6) ✗     │
│ ...                         │
├─────────────────────────────┤
│ Summary Stats               │
│ Total | +4 | -2 | =4        │
└─────────────────────────────┘
```

---

## 📱 Responsive

- **Mobile**: Stacked layout
- **Tablet**: 2-column grids
- **Desktop**: 3-column grids

---

## 🔧 Requirements

### Data Requirements
- At least 2 audits for the same domain
- Active Supabase connection
- User authentication

### Dependencies
- React
- Recharts (for chart)
- Lucide React (for icons)
- Supabase (for data)

---

## 🎯 States

### Loading
Shows spinner while fetching data

### Error
Displays error message if fetch fails

### No Data
Helpful message when no previous audits exist

### Data Available
Full comparison UI with all features

---

## 💡 Tips

1. **First Audit**: Won't show comparison (need 2+ audits)
2. **Same Domain**: Only compares audits for the same domain
3. **Time Ranges**: Use 7d for recent changes, 90d for long-term trends
4. **Rate of Change**: Helps predict future trends
5. **Category Focus**: Identify which areas are improving/declining

---

## 🐛 Troubleshooting

### No data showing?
- Check you have 2+ audits for the domain
- Verify user is authenticated
- Check time range selection

### Chart not rendering?
- Ensure Recharts is installed
- Check browser console for errors

### Slow loading?
- Reduce time range
- Check network connection

---

## 📚 Documentation

- **README**: `HISTORICAL_COMPARISON_README.md`
- **Implementation**: `task-25-implementation-summary.md`
- **Testing**: `task-25-testing-checklist.md`
- **Visual Guide**: `task-25-visual-guide.md`

---

## 🎉 Quick Reference

### Trend Thresholds
```typescript
change > 0.5   → Improving
change < -0.5  → Declining
-0.5 ≤ change ≤ 0.5 → Stable
```

### Calculations
```typescript
change = current - previous
rate = change / daysBetween
```

### Color Codes
```typescript
Improving: emerald-400 (#34d399)
Declining: red-400 (#f87171)
Stable: slate-500 (#64748b)
```

---

**Ready to use!** The component is already integrated and working in the Overview tab. Just run audits and watch the trends! 📈
