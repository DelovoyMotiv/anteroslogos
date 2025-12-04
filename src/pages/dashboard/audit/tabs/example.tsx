/**
 * Example Usage of Tab Components
 * 
 * This file demonstrates how to use the TabContainer, TabButton, and TabContent
 * components to create a tabbed interface.
 * 
 * NOTE: This is an example file for reference. It is not used in production.
 */

import { TabContainer, TabButton, TabContent } from './index';
import { useAuditNavigation } from '../hooks/useAuditNavigation';
import { BarChart3, Search, Lightbulb, Settings } from 'lucide-react';

// Example: Simple tabbed interface
export function SimpleTabExample() {
  const { state, setActiveTab } = useAuditNavigation();

  return (
    <div className="p-6">
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
        <div className="p-6 bg-slate-900/50 border border-slate-800/50 rounded">
          <h2 className="text-xl font-bold text-slate-200 mb-4">Overview Tab</h2>
          <p className="text-slate-400">
            This is the overview tab content. It shows when the Overview tab is active.
          </p>
        </div>
      </TabContent>

      <TabContent isActive={state.activeTab === 'analysis'}>
        <div className="p-6 bg-slate-900/50 border border-slate-800/50 rounded">
          <h2 className="text-xl font-bold text-slate-200 mb-4">Analysis Tab</h2>
          <p className="text-slate-400">
            This is the analysis tab content. It shows when the Analysis tab is active.
          </p>
        </div>
      </TabContent>

      <TabContent isActive={state.activeTab === 'insights'}>
        <div className="p-6 bg-slate-900/50 border border-slate-800/50 rounded">
          <h2 className="text-xl font-bold text-slate-200 mb-4">Insights Tab</h2>
          <p className="text-slate-400">
            This is the insights tab content. It shows when the Insights tab is active.
          </p>
        </div>
      </TabContent>

      <TabContent isActive={state.activeTab === 'technical'}>
        <div className="p-6 bg-slate-900/50 border border-slate-800/50 rounded">
          <h2 className="text-xl font-bold text-slate-200 mb-4">Technical Tab</h2>
          <p className="text-slate-400">
            This is the technical tab content. It shows when the Technical tab is active.
          </p>
        </div>
      </TabContent>
    </div>
  );
}

// Example: Tab with custom styling
export function CustomStyledTabExample() {
  const { state, setActiveTab } = useAuditNavigation();

  return (
    <div className="p-6">
      <TabContainer className="bg-slate-950/50 rounded-t-lg p-2">
        <TabButton
          id="overview"
          label="Overview"
          icon={<BarChart3 className="w-4 h-4" />}
          isActive={state.activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className="rounded-t-lg"
        />
        <TabButton
          id="analysis"
          label="Analysis"
          icon={<Search className="w-4 h-4" />}
          isActive={state.activeTab === 'analysis'}
          onClick={() => setActiveTab('analysis')}
          className="rounded-t-lg"
        />
      </TabContainer>

      <TabContent isActive={state.activeTab === 'overview'}>
        <div className="p-6 bg-slate-900/50 border border-slate-800/50 rounded-b-lg">
          <p className="text-slate-400">Custom styled tab content</p>
        </div>
      </TabContent>
    </div>
  );
}

// Example: Tab with badges
export function TabWithBadgesExample() {
  const { state, setActiveTab } = useAuditNavigation();

  // Simulate issue counts
  const issueCounts = {
    overview: 0,
    analysis: 11,
    insights: 27,
    technical: 5,
  };

  return (
    <div className="p-6">
      <TabContainer>
        <TabButton
          id="overview"
          label="Overview"
          icon={<BarChart3 className="w-4 h-4" />}
          isActive={state.activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          badge={issueCounts.overview}
        />
        <TabButton
          id="analysis"
          label="Analysis"
          icon={<Search className="w-4 h-4" />}
          isActive={state.activeTab === 'analysis'}
          onClick={() => setActiveTab('analysis')}
          badge={issueCounts.analysis}
        />
        <TabButton
          id="insights"
          label="Insights"
          icon={<Lightbulb className="w-4 h-4" />}
          isActive={state.activeTab === 'insights'}
          onClick={() => setActiveTab('insights')}
          badge={issueCounts.insights}
        />
        <TabButton
          id="technical"
          label="Technical"
          icon={<Settings className="w-4 h-4" />}
          isActive={state.activeTab === 'technical'}
          onClick={() => setActiveTab('technical')}
          badge={issueCounts.technical}
        />
      </TabContainer>
    </div>
  );
}
