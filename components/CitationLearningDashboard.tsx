import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, Target, AlertTriangle, CheckCircle, Brain, Activity } from 'lucide-react';
import type { 
  QueryPattern, 
  EntityPerformance, 
  OptimizationAction,
  CitationPrediction 
} from '../utils/citationLearning/feedbackEngine';

interface CitationLearningDashboardProps {
  topQueryPatterns: QueryPattern[];
  entityPerformanceRanking: EntityPerformance[];
  criticalOptimizations: OptimizationAction[];
  overallHealthScore: number;
  onPredictCitation?: (entityId: string) => CitationPrediction;
  onApplyOptimization?: (actionId: string) => void;
}

const CitationLearningDashboard: React.FC<CitationLearningDashboardProps> = ({
  topQueryPatterns,
  entityPerformanceRanking,
  criticalOptimizations,
  overallHealthScore,
  onPredictCitation,
  onApplyOptimization,
}) => {
  const [activeTab, setActiveTab] = useState<'patterns' | 'performance' | 'optimizations'>('patterns');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<CitationPrediction | null>(null);

  const healthScoreColor = useMemo(() => {
    if (overallHealthScore >= 80) return 'text-green-400';
    if (overallHealthScore >= 60) return 'text-yellow-400';
    if (overallHealthScore >= 40) return 'text-orange-400';
    return 'text-red-400';
  }, [overallHealthScore]);

  const handlePredictClick = (entityId: string) => {
    if (onPredictCitation) {
      const result = onPredictCitation(entityId);
      setPrediction(result);
      setSelectedEntity(entityId);
    }
  };

  const handleApplyOptimization = (actionId: string) => {
    if (onApplyOptimization) {
      onApplyOptimization(actionId);
    }
  };

  return (
    <div className="bg-white/5 border border-brand-secondary rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Citation Learning Engine</h3>
            <p className="text-xs text-white/50">AI-powered feedback loop intelligence</p>
          </div>
        </div>

        {/* Overall Health Score */}
        <div className="flex flex-col items-end">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Health Score</div>
          <div className={`text-3xl font-bold tabular-nums ${healthScoreColor}`}>
            {overallHealthScore.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
            <Activity className="w-3 h-3" />
            <span>Query Patterns</span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {topQueryPatterns.length}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
            <Target className="w-3 h-3" />
            <span>Entities</span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {entityPerformanceRanking.length}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
            <Zap className="w-3 h-3" />
            <span>Optimizations</span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {criticalOptimizations.length}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            <span>Avg Velocity</span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {(entityPerformanceRanking.reduce((sum, e) => sum + e.trendVelocity, 0) / Math.max(entityPerformanceRanking.length, 1)).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'patterns'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Query Patterns
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'performance'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Entity Performance
        </button>
        <button
          onClick={() => setActiveTab('optimizations')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'optimizations'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Optimizations
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Query Patterns Tab */}
        {activeTab === 'patterns' && (
          <>
            {topQueryPatterns.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                No query patterns detected yet. Citations needed to learn patterns.
              </div>
            ) : (
              topQueryPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium mb-1 line-clamp-2">
                        {pattern.pattern}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <span>Frequency: {pattern.frequency}x</span>
                        <span>Citations: {pattern.triggeredCitations}</span>
                        <span>Confidence: {(pattern.averageConfidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      {pattern.aiPlatforms.slice(0, 3).map((platform) => (
                        <div
                          key={platform}
                          className="px-2 py-1 bg-brand-accent/10 text-brand-accent text-xs rounded font-mono"
                        >
                          {platform}
                        </div>
                      ))}
                    </div>
                  </div>
                  {pattern.topEntities.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-xs text-white/40 mb-1">Top Entities:</div>
                      <div className="flex flex-wrap gap-1">
                        {pattern.topEntities.slice(0, 5).map((entityId) => {
                          const entity = entityPerformanceRanking.find(e => e.entityId === entityId);
                          return (
                            <span key={entityId} className="px-2 py-0.5 bg-purple-500/10 text-purple-300 text-xs rounded">
                              {entity?.entityName || entityId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* Entity Performance Tab */}
        {activeTab === 'performance' && (
          <>
            {entityPerformanceRanking.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                No entity performance data yet. Build and syndicate knowledge graph first.
              </div>
            ) : (
              entityPerformanceRanking.slice(0, 10).map((entity) => (
                <div
                  key={entity.entityId}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold mb-1">{entity.entityName}</h4>
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <span>Citations: {entity.totalCitations}</span>
                        <span>Confidence: {(entity.averageConfidence * 100).toFixed(0)}%</span>
                        <span className="flex items-center gap-1">
                          {entity.trendVelocity > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          {entity.trendVelocity.toFixed(2)}/day
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/40 mb-1">Optimization Score</div>
                      <div className={`text-2xl font-bold tabular-nums ${
                        entity.optimizationScore >= 70 ? 'text-green-400' :
                        entity.optimizationScore >= 50 ? 'text-yellow-400' :
                        'text-orange-400'
                      }`}>
                        {entity.optimizationScore}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          entity.optimizationScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          entity.optimizationScore >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-orange-500 to-red-500'
                        }`}
                        style={{ width: `${entity.optimizationScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Recommendations */}
                  {entity.recommendations.length > 0 && (
                    <div className="space-y-1">
                      {entity.recommendations.slice(0, 2).map((rec, idx) => (
                        <div key={idx} className="text-xs text-white/60 flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Predict Button */}
                  {onPredictCitation && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => handlePredictClick(entity.entityId)}
                        className="w-full px-3 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-sm rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Predict Citation Probability
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* Optimizations Tab */}
        {activeTab === 'optimizations' && (
          <>
            {criticalOptimizations.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                No optimization actions required. Knowledge graph is healthy.
              </div>
            ) : (
              criticalOptimizations.map((action) => (
                <div
                  key={action.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          action.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          action.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          action.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {action.priority.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 text-xs rounded font-mono">
                          {action.actionType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-white/40">
                          Impact: +{(action.expectedImpact * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-white mb-2">{action.description}</p>
                      <div className="bg-white/5 border border-white/10 rounded p-2 text-xs text-white/70">
                        <strong className="text-brand-accent">Implementation:</strong> {action.implementation}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleApplyOptimization(action.id)}
                      disabled={action.status !== 'pending'}
                      className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        action.status === 'pending'
                          ? 'bg-brand-accent hover:bg-brand-accent/80 text-white'
                          : 'bg-white/5 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {action.status === 'pending' && <CheckCircle className="w-4 h-4" />}
                      {action.status === 'pending' ? 'Apply Optimization' : action.status.toUpperCase()}
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Prediction Modal */}
      {prediction && selectedEntity && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-bg border border-brand-accent/30 rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Citation Probability Prediction</h3>
              <button
                onClick={() => {
                  setPrediction(null);
                  setSelectedEntity(null);
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Prediction Score */}
            <div className="mb-6 text-center">
              <div className="text-sm text-white/60 mb-2">Predicted Citation Probability</div>
              <div className="text-5xl font-bold text-brand-accent tabular-nums">
                {(prediction.predictedCitationProbability * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-white/40 mt-1">
                Range: {(prediction.confidenceInterval[0] * 100).toFixed(1)}% - {(prediction.confidenceInterval[1] * 100).toFixed(1)}%
              </div>
            </div>

            {/* Factors */}
            <div className="space-y-3 mb-6">
              <div className="text-sm font-semibold text-white mb-2">Contributing Factors:</div>
              {Object.entries(prediction.factors).map(([factor, value]) => (
                <div key={factor} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 capitalize">{factor.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-white font-mono">{(value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-accent to-blue-500 transition-all duration-500"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {prediction.recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white mb-2">Recommendations:</div>
                {prediction.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-brand-accent mt-0.5">→</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitationLearningDashboard;
