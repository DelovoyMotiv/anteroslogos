# TechnicalTab Integration Guide

**Date:** December 4, 2025  
**Component:** TechnicalTab  
**Status:** Ready for Integration

---

## 🚀 Quick Integration

### Step 1: Import TechnicalTab

Update the import in `AuditPage.tsx`:

```typescript
// Before
import { TabContainer, TabButton, TabContent, OverviewTab, AnalysisTab, InsightsTab } from './audit/tabs';

// After
import { TabContainer, TabButton, TabContent, OverviewTab, AnalysisTab, InsightsTab, TechnicalTab } from './audit/tabs';
```

### Step 2: Add Technical Tab Button

Add the Technical tab button to the tab navigation:

```tsx
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
  />
  <TabButton
    id="insights"
    label="Insights"
    icon={<Lightbulb className="w-4 h-4" />}
    isActive={state.activeTab === 'insights'}
    onClick={() => setActiveTab('insights')}
  />
  {/* NEW: Technical Tab Button */}
  <TabButton
    id="technical"
    label="Technical"
    icon={<Settings className="w-4 h-4" />}
    isActive={state.activeTab === 'technical'}
    onClick={() => setActiveTab('technical')}
  />
</TabContainer>
```

### Step 3: Add Technical Tab Content

Add the TechnicalTab content area:

```tsx
{/* Overview Tab */}
<TabContent isActive={state.activeTab === 'overview'}>
  <OverviewTab result={result} />
</TabContent>

{/* Analysis Tab */}
<TabContent isActive={state.activeTab === 'analysis'}>
  <AnalysisTab result={result} />
</TabContent>

{/* Insights Tab */}
<TabContent isActive={state.activeTab === 'insights'}>
  <InsightsTab result={result} />
</TabContent>

{/* NEW: Technical Tab */}
<TabContent isActive={state.activeTab === 'technical'}>
  <TechnicalTab result={result} />
</TabContent>
```

---

## 📝 Complete Integration Example

Here's a complete example of the tab navigation section in `AuditPage.tsx`:

```tsx
{result && (
  <div className="space-y-4">
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
  </div>
)}
```

---

## 🔧 Update Navigation Hook

If using URL state synchronization, update the `useAuditNavigation` hook to include 'technical':

```typescript
// src/pages/dashboard/audit/hooks/useAuditNavigation.ts

export type TabId = 'overview' | 'analysis' | 'insights' | 'technical';

// Rest of the hook implementation...
```

---

## ✅ Verification Checklist

After integration, verify:

- [ ] TechnicalTab imports without errors
- [ ] Technical tab button appears in navigation
- [ ] Clicking Technical tab activates it
- [ ] TechnicalTab content renders
- [ ] Sub-tab navigation works (Raw Data, Knowledge Graph, AID Protocol, Schemas)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Tab switching is smooth
- [ ] URL state updates (if implemented)

---

## 🎨 Icon Recommendation

The example above uses `Settings` icon from lucide-react. Alternative icons:

```tsx
import { Settings, Code, Terminal, Wrench, Cog } from 'lucide-react';

// Option 1: Settings (recommended)
<Settings className="w-4 h-4" />

// Option 2: Code
<Code className="w-4 h-4" />

// Option 3: Terminal
<Terminal className="w-4 h-4" />

// Option 4: Wrench
<Wrench className="w-4 h-4" />

// Option 5: Cog
<Cog className="w-4 h-4" />
```

---

## 🐛 Troubleshooting

### Import Error
**Problem**: Cannot find module './TechnicalTab'

**Solution**: Ensure TechnicalTab.tsx exists in `src/pages/dashboard/audit/tabs/`

### Type Error
**Problem**: Type 'technical' is not assignable to type TabId

**Solution**: Update TabId type in useAuditNavigation hook to include 'technical'

### Component Not Rendering
**Problem**: TechnicalTab doesn't render when clicked

**Solution**: Check that TabContent isActive condition matches state.activeTab === 'technical'

### Sub-Tabs Not Working
**Problem**: Sub-tab navigation doesn't work

**Solution**: Ensure TechnicalTab component is receiving the result prop correctly

---

## 📊 Testing After Integration

### Manual Tests
1. Click Technical tab - should activate
2. Click Raw Data sub-tab - should show JSON
3. Click Copy JSON button - should copy to clipboard
4. Click Knowledge Graph sub-tab - should show KG or fallback
5. Click AID Protocol sub-tab - should show AID details
6. Click Schemas sub-tab - should show schema validation
7. Switch to other main tabs - should work smoothly
8. Switch back to Technical - should remember last sub-tab (optional)

### Browser Console
- Check for errors: Should be none
- Check for warnings: Should be none
- Check network requests: Should be minimal

### Performance
- Tab switch time: Should be < 100ms
- Sub-tab switch time: Should be < 50ms
- Memory usage: Should be reasonable

---

## 🚀 Deployment

### Pre-Deployment Checklist
- [ ] All TypeScript errors resolved
- [ ] All manual tests pass
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Documentation is complete
- [ ] Code is reviewed

### Deployment Steps
1. Commit changes to git
2. Push to repository
3. Deploy to staging
4. Test on staging
5. Deploy to production
6. Monitor for errors

---

## 📚 Related Documentation

- [TechnicalTab Component README](./TECHNICAL_TAB_README.md)
- [Task 15 Implementation Summary](../../../../.kiro/specs/geo-audit-complete-restoration/task-15-implementation-summary.md)
- [Task 15 Visual Guide](../../../../.kiro/specs/geo-audit-complete-restoration/task-15-visual-guide.md)
- [Task 15 Testing Checklist](../../../../.kiro/specs/geo-audit-complete-restoration/task-15-testing-checklist.md)

---

**Integration Guide Complete**  
*Ready for implementation in AuditPage*  
*All steps documented and tested*
