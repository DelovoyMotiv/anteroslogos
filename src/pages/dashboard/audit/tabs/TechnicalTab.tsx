/**
 * TechnicalTab Component
 * 
 * Technical details and deep dive information for developers.
 * Implements sub-tab navigation for different technical views.
 * 
 * Features:
 * - Sub-tab navigation (Raw Data, Knowledge Graph, AID Protocol, Schemas)
 * - JSON viewer for raw data
 * - Knowledge Graph visualization
 * - AID Protocol technical details
 * - Schema validation details
 * 
 * Layout:
 * - Top: Sub-tab navigation bar
 * - Content: Active sub-tab content
 * 
 * Requirements:
 * - Sub-navigation structure: 4 sub-tabs
 * - Technical detail display: JSON, graphs, protocols
 * - Developer-friendly: Copy buttons, syntax highlighting
 * 
 * Usage:
 * ```tsx
 * <TabContent isActive={activeTab === 'technical'}>
 *   <TechnicalTab result={result} />
 * </TabContent>
 * ```
 */

import { useState } from 'react';
import { 
  FileJson,
  Network,
  Zap,
  Code,
} from 'lucide-react';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';
import { RawDataView } from './RawDataView';
import { AIDProtocolView } from './AIDProtocolView';
import { SchemaValidationView } from './SchemaValidationView';

interface TechnicalTabProps {
  /** Complete audit result data */
  result: AuditResult;
}

type SubTab = 'raw-data' | 'knowledge-graph' | 'aid-protocol' | 'schemas';

export function TechnicalTab({ result }: TechnicalTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('raw-data');

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Sub-Tab Navigation - Scrollable on Mobile */}
      <div className="flex items-center gap-1 md:gap-2 border-b border-slate-800/50 pb-2 overflow-x-auto">
        <SubTabButton
          icon={<FileJson className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          label="Raw Data"
          isActive={activeSubTab === 'raw-data'}
          onClick={() => setActiveSubTab('raw-data')}
        />
        <SubTabButton
          icon={<Network className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          label="Knowledge Graph"
          isActive={activeSubTab === 'knowledge-graph'}
          onClick={() => setActiveSubTab('knowledge-graph')}
        />
        <SubTabButton
          icon={<Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          label="AID Protocol"
          isActive={activeSubTab === 'aid-protocol'}
          onClick={() => setActiveSubTab('aid-protocol')}
        />
        <SubTabButton
          icon={<Code className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          label="Schemas"
          isActive={activeSubTab === 'schemas'}
          onClick={() => setActiveSubTab('schemas')}
        />
      </div>

      {/* Sub-Tab Content */}
      <div className="min-h-[300px] md:min-h-[400px]">
        {activeSubTab === 'raw-data' && (
          <RawDataView result={result} />
        )}
        {activeSubTab === 'knowledge-graph' && (
          <KnowledgeGraphView result={result} />
        )}
        {activeSubTab === 'aid-protocol' && (
          <AIDProtocolView result={result} />
        )}
        {activeSubTab === 'schemas' && (
          <SchemaValidationView result={result} />
        )}
      </div>
    </div>
  );
}

/**
 * SubTabButton Component
 * 
 * Individual sub-tab button with icon and label.
 * Styled for technical/developer aesthetic.
 */
interface SubTabButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SubTabButton({ icon, label, isActive, onClick }: SubTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-[10px] md:text-xs font-mono uppercase tracking-wider
        border-b-2 transition-all whitespace-nowrap flex-shrink-0
        ${isActive
          ? 'border-blue-500 text-blue-400 bg-blue-500/10'
          : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-black/20'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
    </button>
  );
}

// RawDataView component moved to separate file: ./RawDataView.tsx

/**
 * KnowledgeGraphView Component
 * 
 * Displays knowledge graph data if available.
 * Shows entities, relationships, and claims.
 */
function KnowledgeGraphView({ result }: { result: AuditResult }) {
  if (!result.knowledgeGraph) {
    return (
      <div className="bg-black/20 border border-slate-800/50 rounded p-8 text-center">
        <Network className="w-12 h-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-sm font-mono text-slate-400 mb-2">
          Knowledge Graph Not Available
        </h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Knowledge Graph extraction was not performed for this audit.
          This feature requires additional processing and may not be available for all sites.
        </p>
      </div>
    );
  }

  const kg = result.knowledgeGraph;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Entities" value={kg.entities.length} color="purple" />
        <StatCard label="Relationships" value={kg.relationships.length} color="blue" />
        <StatCard label="Claims" value={kg.claims.length} color="emerald" />
        <StatCard label="Domain" value={kg.domain} color="slate" isText />
      </div>

      {/* Entities */}
      {kg.entities.length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Entities ({kg.entities.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {kg.entities.map((entity, idx) => (
              <div
                key={idx}
                className="bg-purple-500/5 border border-purple-500/20 rounded p-3 hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm text-slate-200 font-medium mb-1">
                      {entity.name}
                    </div>
                    <div className="text-xs text-purple-400 font-mono">
                      {entity.type}
                    </div>
                  </div>
                  {entity.confidence && (
                    <div className="text-xs text-slate-500 font-mono">
                      {(entity.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relationships */}
      {kg.relationships.length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3">
            Relationships ({kg.relationships.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {kg.relationships.map((rel, idx) => (
              <div
                key={idx}
                className="bg-blue-500/5 border border-blue-500/20 rounded p-3 hover:border-blue-500/40 transition-colors"
              >
                <div className="text-xs text-slate-300 font-mono">
                  <span className="text-blue-400">{rel.source}</span>
                  {' → '}
                  <span className="text-slate-500">{rel.type}</span>
                  {' → '}
                  <span className="text-blue-400">{rel.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claims */}
      {kg.claims.length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3">
            Claims ({kg.claims.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {kg.claims.map((claim, idx) => (
              <div
                key={idx}
                className="bg-emerald-500/5 border border-emerald-500/20 rounded p-3 hover:border-emerald-500/40 transition-colors"
              >
                <div className="text-xs text-slate-300 leading-relaxed">
                  {claim.statement}
                </div>
                {claim.confidence && (
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Confidence: {(claim.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// AIDProtocolView component moved to separate file: ./AIDProtocolView.tsx
// SchemaValidationView component moved to separate file: ./SchemaValidationView.tsx

/**
 * StatCard Component
 * 
 * Compact stat display for technical metrics.
 */
interface StatCardProps {
  label: string;
  value: string | number;
  color: 'blue' | 'emerald' | 'purple' | 'red' | 'yellow' | 'slate';
  isText?: boolean;
}

function StatCard({ label, value, color, isText = false }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
  };

  return (
    <div className={`${colorClasses[color]} border rounded p-3`}>
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`${isText ? 'text-sm' : 'text-xl'} font-bold font-mono leading-none`}>
        {value}
      </div>
    </div>
  );
}
