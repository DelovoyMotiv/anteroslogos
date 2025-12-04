/**
 * Tab Components
 * 
 * Base components for tabbed navigation interface.
 * 
 * Components:
 * - TabContainer: Wrapper for tab buttons (desktop only)
 * - TabButton: Individual tab button with active/hover states
 * - TabContent: Content wrapper with transitions
 * - MobileTabDropdown: Mobile-optimized dropdown tab selector
 * - OverviewTab: Overview tab content with scores and charts
 * - AnalysisTab: Detailed category analysis with sidebar navigation
 * - InsightsTab: AI insights and actionable recommendations
 * - TechnicalTab: Technical details with sub-tab navigation (Raw Data, Knowledge Graph, AID Protocol, Schemas)
 * 
 * Usage:
 * ```tsx
 * import { TabContainer, TabButton, TabContent, MobileTabDropdown, OverviewTab, AnalysisTab, InsightsTab, TechnicalTab } from './tabs';
 * 
 * // Desktop tabs
 * <TabContainer>
 *   <TabButton id="overview" label="Overview" icon={...} isActive={...} onClick={...} />
 *   <TabButton id="analysis" label="Analysis" icon={...} isActive={...} onClick={...} />
 *   <TabButton id="insights" label="Insights" icon={...} isActive={...} onClick={...} />
 *   <TabButton id="technical" label="Technical" icon={...} isActive={...} onClick={...} />
 * </TabContainer>
 * 
 * // Mobile dropdown
 * <MobileTabDropdown
 *   tabs={tabs}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * 
 * <TabContent isActive={activeTab === 'overview'}>
 *   <OverviewTab result={result} />
 * </TabContent>
 * 
 * <TabContent isActive={activeTab === 'analysis'}>
 *   <AnalysisTab result={result} />
 * </TabContent>
 * 
 * <TabContent isActive={activeTab === 'insights'}>
 *   <InsightsTab result={result} />
 * </TabContent>
 * 
 * <TabContent isActive={activeTab === 'technical'}>
 *   <TechnicalTab result={result} />
 * </TabContent>
 * ```
 */

export { TabContainer } from './TabContainer';
export { TabButton } from './TabButton';
export { TabContent } from './TabContent';
export { MobileTabDropdown } from './MobileTabDropdown';
export type { MobileTab } from './MobileTabDropdown';
export { OverviewTab } from './OverviewTab';
export { AnalysisTab } from './AnalysisTab';
export { InsightsTab } from './InsightsTab';
export { TechnicalTab } from './TechnicalTab';
export { HistoricalComparison } from './HistoricalComparison';
