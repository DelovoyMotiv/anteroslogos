import { useState, useEffect } from 'react';
import { TrendingUp, Target, Zap, Calendar, AlertTriangle } from 'lucide-react';
import { 
  PredictiveGEOEngine,
  type ScoreHistory,
  type Forecast,
  type WhatIfScenario,
  type PredictiveInsight
} from '../utils/ai/predictiveScore';

interface PredictiveDashboardProps {
  domain: string;
  currentScore: number;
  history: ScoreHistory[];
}

const PredictiveDashboard = ({ currentScore, history }: PredictiveDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<{
    forecast30d: Forecast;
    forecast60d: Forecast;
    forecast90d: Forecast;
  } | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);

  useEffect(() => {
    loadPredictions();
  }, [history, currentScore]);

  const loadPredictions = () => {
    setLoading(true);
    try {
      if (history.length < 2) {
        // Not enough data for predictions
        setLoading(false);
        return;
      }

      const engine = new PredictiveGEOEngine(history);
      const forecastData = engine.generateForecasts();
      const scenarioData = engine.generateWhatIfScenarios(currentScore);
      const insightData = engine.generateInsights(currentScore, forecastData);

      setForecasts(forecastData);
      setScenarios(scenarioData);
      setInsights(insightData);
    } catch (error) {
      console.error('Failed to generate predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <TrendingUp className="w-8 h-8 text-brand-accent mx-auto animate-pulse mb-4" />
        <p className="text-white/60">Calculating ML forecasts...</p>
      </div>
    );
  }

  if (!forecasts || history.length < 2) {
    return (
      <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Insufficient Data</h3>
        <p className="text-white/60">
          Run at least 2 audits on this domain to unlock predictive forecasting.
        </p>
      </div>
    );
  }

  const getForecastColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Predictive GEO Score™</h2>
        <p className="text-white/60">
          ML-powered forecasting for your GEO performance
        </p>
      </div>

      {/* Forecasts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: '30 Days', forecast: forecasts.forecast30d, icon: Calendar },
          { label: '60 Days', forecast: forecasts.forecast60d, icon: Calendar },
          { label: '90 Days', forecast: forecasts.forecast90d, icon: Calendar },
        ].map(({ label, forecast, icon: Icon }) => (
          <div
            key={label}
            className="p-6 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/60">{label} Forecast</h3>
              <Icon className="w-5 h-5 text-brand-accent" />
            </div>
            <div className={`text-5xl font-bold mb-2 ${getForecastColor(forecast.predictedScore)}`}>
              {forecast.predictedScore}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50 mb-3">
              <span>Range: {forecast.range.min}-{forecast.range.max}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${
                  forecast.predictedScore >= 80
                    ? 'from-green-500 to-emerald-500'
                    : forecast.predictedScore >= 60
                    ? 'from-yellow-500 to-orange-500'
                    : 'from-red-500 to-red-700'
                }`}
                style={{ width: `${forecast.predictedScore}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-3">
              {forecast.confidence}% confidence
            </p>
          </div>
        ))}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Predictive Insights</h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border flex items-start gap-4 ${
                  insight.priority === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : insight.priority === 'high'
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : insight.priority === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex-shrink-0">
                  {insight.type === 'milestone' && <Target className="w-5 h-5 text-green-400" />}
                  {insight.type === 'opportunity' && <Zap className="w-5 h-5 text-yellow-400" />}
                  {insight.type === 'risk' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{insight.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      insight.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                      insight.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                      insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {insight.priority}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{insight.description}</p>
                  {insight.estimatedDate && (
                    <p className="text-xs text-white/50 mt-2">
                      Est. {new Date(insight.estimatedDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What-If Scenarios */}
      {scenarios.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">What-If Scenarios</h3>
          <div className="space-y-4">
            {scenarios.slice(0, 5).map((scenario, index) => (
              <div
                key={index}
                className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">{scenario.scenario}</h4>
                    <p className="text-sm text-white/60">{scenario.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-3xl font-bold text-green-400">
                      +{scenario.estimatedImpact}
                    </div>
                    <p className="text-xs text-white/50">points</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-white/50 mb-1">Probability</p>
                    <p className="text-lg font-semibold">{scenario.probability}%</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-white/50 mb-1">Time to Effect</p>
                    <p className="text-lg font-semibold">{scenario.timeToEffect}</p>
                  </div>
                </div>

                <details className="group cursor-pointer">
                  <summary className="text-sm text-brand-accent hover:underline">
                    View Implementation Plan
                  </summary>
                  <div className="mt-3 p-3 bg-black/30 rounded-lg">
                    <pre className="text-xs text-white/70 whitespace-pre-wrap">
                      {scenario.implementation}
                    </pre>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="p-6 rounded-xl bg-purple-500/10 border border-purple-500/30">
        <p className="text-sm text-white/70 mb-2">
          <strong>ML-Powered Forecasting:</strong> Predictive GEO Score uses linear regression models trained on your audit history.
        </p>
        <p className="text-xs text-white/60">
          Forecasts are based on historical trends with diminishing returns modeling. Requires minimum 2 audit data points.
          Confidence intervals reflect prediction accuracy based on data volatility and trend consistency.
        </p>
      </div>
    </div>
  );
};

export default PredictiveDashboard;
