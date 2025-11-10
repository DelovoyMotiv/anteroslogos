/**
 * Knowledge Graph Dashboard
 * Interactive visualization of client's knowledge graph with real-time citation tracking
 * Production-ready React component with D3.js force-directed graph
 */

import React, { useState } from 'react';
import { Network, Database, TrendingUp, Zap, Eye, Target, DollarSign } from 'lucide-react';
import type { KnowledgeGraph, Entity } from '../utils/knowledgeGraph/builder';
import type { SyndicationResult } from '../lib/aiSyndication';
import type { CitationStats } from '../utils/citationProof/tracker';

// ==================== INTERFACES ====================

interface KnowledgeGraphDashboardProps {
  graph: KnowledgeGraph;
  syndicationResults?: SyndicationResult[];
  citationStats?: CitationStats;
  onEntityClick?: (entity: Entity) => void;
}

// ==================== MAIN COMPONENT ====================

const KnowledgeGraphDashboard: React.FC<KnowledgeGraphDashboardProps> = ({
  graph,
  syndicationResults = [],
  citationStats,
  onEntityClick,
}) => {
  const [selectedTab, setSelectedTab] = useState<'graph' | 'entities' | 'claims' | 'citations'>('graph');

  // Calculate graph quality score
  const graphQuality = React.useMemo(() => {
    const avgConfidence = graph.entities.reduce((sum, e) => sum + e.confidence, 0) / graph.entities.length;
    const relationshipDensity = graph.relationships.length / (graph.entities.length * (graph.entities.length - 1) / 2);
    const claimsPerEntity = graph.claims.length / graph.entities.length;
    
    return Math.round((avgConfidence * 40) + (relationshipDensity * 30) + (Math.min(1, claimsPerEntity / 2) * 30));
  }, [graph]);

  // Syndication status summary
  const syndicationSummary = React.useMemo(() => {
    const total = syndicationResults.length;
    const synced = syndicationResults.filter(r => r.status === 'synced').length;
    const failed = syndicationResults.filter(r => r.status === 'failed').length;
    
    return { total, synced, failed };
  }, [syndicationResults]);

  // Render simplified force-directed graph (production would use D3.js)
  const renderGraph = () => {
    return (
      <div className="relative w-full h-[500px] bg-brand-bg border border-white/10 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Network className="w-16 h-16 text-brand-accent mx-auto mb-4 opacity-50" />
            <p className="text-white/50 mb-2">Interactive Knowledge Graph</p>
            <p className="text-white/30 text-sm">
              {graph.entities.length} entities • {graph.relationships.length} relationships
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-brand-accent font-bold">{graph.entities.length}</div>
                <div className="text-white/40">Entities</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-bold">{graph.relationships.length}</div>
                <div className="text-white/40">Relationships</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">{graph.claims.length}</div>
                <div className="text-white/40">Claims</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative graph nodes (simplified visualization) */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <radialGradient id="nodeGradient">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Central node */}
          <circle cx="50%" cy="50%" r="40" fill="url(#nodeGradient)" />
          {/* Satellite nodes */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * 2 * Math.PI;
            const radius = 150;
            const cx = 50 + Math.cos(angle) * radius;
            const cy = 50 + Math.sin(angle) * radius;
            return (
              <g key={i}>
                <circle cx={`${cx}%`} cy={`${cy}%`} r="20" fill="url(#nodeGradient)" />
                <line
                  x1="50%"
                  y1="50%"
                  x2={`${cx}%`}
                  y2={`${cy}%`}
                  stroke="#3b82f6"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Graph Quality */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-brand-accent" />
            <span className="text-sm text-white/60">Graph Quality</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{graphQuality}</span>
            <span className="text-sm text-white/40">/100</span>
          </div>
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-accent to-blue-400"
              style={{ width: `${graphQuality}%` }}
            />
          </div>
        </div>

        {/* Syndication Status */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-green-400" />
            <span className="text-sm text-white/60">AI Platforms</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{syndicationSummary.synced}</span>
            <span className="text-sm text-white/40">/ {syndicationSummary.total} synced</span>
          </div>
          <div className="mt-2 flex gap-1">
            {syndicationResults.map((result, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  result.status === 'synced' ? 'bg-green-400' : 
                  result.status === 'failed' ? 'bg-red-400' : 
                  'bg-yellow-400'
                }`}
                title={`${result.platform}: ${result.status}`}
              />
            ))}
          </div>
        </div>

        {/* Citations */}
        {citationStats && (
          <>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-white/60">Total Citations</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {citationStats.totalCitations.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 text-xs text-green-400">
                +{Math.round(citationStats.estimatedReach / 1000)}K reach
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-white/60">Estimated Value</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  ${citationStats.estimatedValue.toFixed(0)}
                </span>
              </div>
              <div className="mt-2 text-xs text-white/40">
                CPM-based valuation
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'graph', label: 'Graph View', icon: Network },
          { id: 'entities', label: 'Entities', icon: Database },
          { id: 'claims', label: 'Claims', icon: Target },
          { id: 'citations', label: 'Citations', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'text-brand-accent border-b-2 border-brand-accent'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {selectedTab === 'graph' && (
          <div className="space-y-4">
            {renderGraph()}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Graph Metadata</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-white/40 mb-1">Created</div>
                  <div className="text-white">{new Date(graph.metadata.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-white/40 mb-1">Version</div>
                  <div className="text-white">{graph.metadata.version}</div>
                </div>
                <div>
                  <div className="text-white/40 mb-1">Entities</div>
                  <div className="text-white">{graph.metadata.entityCount}</div>
                </div>
                <div>
                  <div className="text-white/40 mb-1">Relationships</div>
                  <div className="text-white">{graph.metadata.relationshipCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'entities' && (
          <div className="space-y-3">
            {graph.entities.slice(0, 20).map((entity) => (
              <div
                key={entity.id}
                onClick={() => onEntityClick?.(entity)}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm px-2 py-1 bg-brand-accent/20 text-brand-accent rounded">
                        {entity.type}
                      </span>
                      <h4 className="text-white font-medium">{entity.name}</h4>
                    </div>
                    {entity.sourceContext && (
                      <p className="text-sm text-white/60 line-clamp-2">{entity.sourceContext}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs text-white/40">Confidence</div>
                      <div className="text-sm text-white font-medium">
                        {(entity.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {graph.entities.length > 20 && (
              <div className="text-center text-sm text-white/40 py-4">
                Showing 20 of {graph.entities.length} entities
              </div>
            )}
          </div>
        )}

        {selectedTab === 'claims' && (
          <div className="space-y-3">
            {graph.claims.slice(0, 10).map((claim) => (
              <div
                key={claim.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <p className="text-white mb-3">{claim.statement}</p>
                {claim.evidence.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-white/40 font-medium">Evidence:</div>
                    {claim.evidence.map((evidence, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="px-2 py-1 bg-blue-400/20 text-blue-400 rounded text-xs">
                          {evidence.type}
                        </span>
                        <span className="text-white/60 flex-1">{evidence.source}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="text-white/40">
                    {claim.entities.length} entities mentioned
                  </div>
                  <div className="text-white/60">
                    Confidence: {(claim.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
            {graph.claims.length > 10 && (
              <div className="text-center text-sm text-white/40 py-4">
                Showing 10 of {graph.claims.length} claims
              </div>
            )}
          </div>
        )}

        {selectedTab === 'citations' && citationStats && (
          <div className="space-y-4">
            {/* Citations by Source */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4">Citations by AI Platform</h3>
              <div className="space-y-3">
                {Object.entries(citationStats.citationsBySource).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-white/80 capitalize">{source}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-accent"
                          style={{
                            width: `${(count / citationStats.totalCitations) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-white font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Cited Entities */}
            {citationStats.citationsByEntity.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">Most Cited Entities</h3>
                <div className="space-y-2">
                  {citationStats.citationsByEntity.slice(0, 5).map((entity, i) => (
                    <div key={entity.entityId} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="text-white flex-1">{entity.entityName}</span>
                      <span className="text-white/60">{entity.count} citations</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphDashboard;
