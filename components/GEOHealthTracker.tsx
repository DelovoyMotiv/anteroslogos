import { Activity, TrendingUp, Flame, Calendar, Zap, Target, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GEOHealthTrackerProps {
  url: string;
  currentScore: number; // AI Visibility Index from parent
}

interface HealthPoint {
  date: string;
  score: number;
  timestamp: number;
}

interface DailyDelta {
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  affectedFactors: string[];
}

interface Streak {
  current: number;
  best: number;
  type: 'improvement' | 'maintenance' | 'none';
}

/**
 * GEO Health Tracker - Daily monitoring with predictive analytics
 * Keeps users coming back by showing real-time AI visibility trends
 */
const GEOHealthTracker = ({ url, currentScore }: GEOHealthTrackerProps) => {
  const [history, setHistory] = useState<HealthPoint[]>([]);
  const [dailyDelta, setDailyDelta] = useState<DailyDelta | null>(null);
  const [streak, setStreak] = useState<Streak>({ current: 0, best: 0, type: 'none' });
  const [forecast, setForecast] = useState<{ days7: number; days30: number } | null>(null);

  useEffect(() => {
    // Load history from localStorage
    const historyKey = `geo_health_${btoa(url).substring(0, 20)}`;
    const stored = localStorage.getItem(historyKey);
    
    let historicalData: HealthPoint[] = stored ? JSON.parse(stored) : [];
    
    // Add current score
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const existingTodayIndex = historicalData.findIndex(
      p => p.date === today
    );

    if (existingTodayIndex >= 0) {
      // Update today's score
      historicalData[existingTodayIndex] = { date: today, score: currentScore, timestamp: now };
    } else {
      // Add new entry
      historicalData.push({ date: today, score: currentScore, timestamp: now });
    }

    // Keep last 30 days
    historicalData = historicalData
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30)
      .reverse();

    // Save updated history
    localStorage.setItem(historyKey, JSON.stringify(historicalData));
    setHistory(historicalData);

    // Calculate daily delta
    if (historicalData.length >= 2) {
      const previous = historicalData[historicalData.length - 2].score;
      const change = currentScore - previous;
      const changePercent = (change / previous) * 100;
      
      setDailyDelta({
        change,
        changePercent,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        affectedFactors: detectAffectedFactors(change),
      });
    }

    // Calculate streak
    const streakData = calculateStreak(historicalData);
    setStreak(streakData);

    // Generate forecast
    if (historicalData.length >= 3) {
      const forecastData = generateForecast(historicalData, currentScore);
      setForecast(forecastData);
    }
  }, [url, currentScore]);

  const detectAffectedFactors = (change: number): string[] => {
    // Simple heuristic - in production would compare detailed scores
    if (Math.abs(change) < 2) return [];
    if (change > 0) return ['Content', 'Structure', 'Authority'];
    return ['Technical', 'AI Access', 'Performance'];
  };

  const calculateStreak = (data: HealthPoint[]): Streak => {
    if (data.length < 2) return { current: 0, best: 0, type: 'none' };

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let lastScore = data[0].score;

    for (let i = 1; i < data.length; i++) {
      if (data[i].score >= lastScore) {
        tempStreak++;
        if (i === data.length - 1) currentStreak = tempStreak;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
      lastScore = data[i].score;
    }

    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

    return {
      current: currentStreak,
      best: bestStreak,
      type: currentStreak > 0 ? 'improvement' : 'none',
    };
  };

  const generateForecast = (data: HealthPoint[], current: number) => {
    // Simple linear regression for trend
    const recent = data.slice(-7); // Last 7 days
    if (recent.length < 3) return null;

    const avgChange = recent.reduce((sum, point, i) => {
      if (i === 0) return 0;
      return sum + (point.score - recent[i - 1].score);
    }, 0) / (recent.length - 1);

    // Project forward with dampening factor (realistic ceiling at 100)
    const days7 = Math.min(100, Math.max(0, Math.round(current + avgChange * 7 * 0.8)));
    const days30 = Math.min(100, Math.max(0, Math.round(current + avgChange * 30 * 0.5)));

    return { days7, days30 };
  };

  const maxScore = Math.max(...history.map(h => h.score), 100);
  const minScore = Math.min(...history.map(h => h.score), 0);
  const range = maxScore - minScore || 20;

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
        <Activity className="w-5 h-5 text-brand-accent" />
        GEO Health Tracker™
        <span className="text-xs text-white/40 font-normal ml-2">30-day monitoring</span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Chart */}
        <div className="lg:col-span-2 p-4 bg-white/5 border border-white/10 rounded-lg">
          {/* Header Stats */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wide font-semibold mb-1">
                Current AI Visibility
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-brand-accent">
                  {currentScore}%
                </span>
                {dailyDelta && (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${
                    dailyDelta.trend === 'up' ? 'text-green-400' :
                    dailyDelta.trend === 'down' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {dailyDelta.trend === 'up' ? '↑' : dailyDelta.trend === 'down' ? '↓' : '→'}
                    {Math.abs(dailyDelta.change).toFixed(1)}
                    <span className="text-[10px] text-white/40">24h</span>
                  </div>
                )}
              </div>
            </div>
            
            {streak.current > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded">
                <Flame className="w-4 h-4 text-orange-400" />
                <div className="text-right">
                  <div className="text-sm font-bold text-orange-300">{streak.current} day{streak.current > 1 ? 's' : ''}</div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wide">Streak</div>
                </div>
              </div>
            )}
          </div>

          {/* Sparkline Chart */}
          {history.length >= 2 ? (
            <div className="relative h-32">
              <svg className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((value) => {
                  const y = 128 - ((value - minScore) / range) * 128;
                  return (
                    <line
                      key={value}
                      x1="0"
                      x2="100%"
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-white/10"
                    />
                  );
                })}

                {/* Area gradient */}
                <defs>
                  <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Area path */}
                <path
                  d={`
                    M 0,128
                    ${history.map((point, i) => {
                      const x = (i / (history.length - 1)) * 100;
                      const y = 128 - ((point.score - minScore) / range) * 128;
                      return `L ${x}%,${y}`;
                    }).join(' ')}
                    L 100%,128 Z
                  `}
                  fill="url(#areaGradient)"
                />

                {/* Line path */}
                <path
                  d={history.map((point, i) => {
                    const x = (i / (history.length - 1)) * 100;
                    const y = 128 - ((point.score - minScore) / range) * 128;
                    return `${i === 0 ? 'M' : 'L'} ${x}%,${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {history.map((point, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = 128 - ((point.score - minScore) / range) * 128;
                  return (
                    <circle
                      key={point.timestamp}
                      cx={`${x}%`}
                      cy={y}
                      r="3"
                      fill="rgb(59, 130, 246)"
                      className="hover:r-5 transition-all cursor-pointer"
                    >
                      <title>{`${point.date}: ${point.score}%`}</title>
                    </circle>
                  );
                })}
              </svg>
              
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[9px] text-white/40 -ml-8">
                <span>{Math.round(maxScore)}</span>
                <span>{Math.round((maxScore + minScore) / 2)}</span>
                <span>{Math.round(minScore)}</span>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center border border-dashed border-white/20 rounded">
              <div className="text-center">
                <Calendar className="w-6 h-6 text-white/40 mx-auto mb-2" />
                <p className="text-xs text-white/40">Check back tomorrow to see your trend</p>
              </div>
            </div>
          )}

          {/* Timeline labels */}
          {history.length >= 2 && (
            <div className="flex justify-between mt-2 text-[9px] text-white/40">
              <span>{history[0].date.substring(5)}</span>
              <span>Last 30 days</span>
              <span>{history[history.length - 1].date.substring(5)}</span>
            </div>
          )}
        </div>

        {/* Right: Insights & Forecast */}
        <div className="space-y-3">
          {/* Today's Impact */}
          {dailyDelta && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide">Today's Impact</h4>
              </div>
              <div className={`text-2xl font-bold mb-1 ${
                dailyDelta.trend === 'up' ? 'text-green-400' :
                dailyDelta.trend === 'down' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                {dailyDelta.change > 0 ? '+' : ''}{dailyDelta.change.toFixed(1)} pts
              </div>
              <p className="text-[10px] text-white/50 leading-snug">
                {dailyDelta.trend === 'up' ? 'Improvement in ' : dailyDelta.trend === 'down' ? 'Decline in ' : 'Stable '}
                {dailyDelta.affectedFactors.slice(0, 2).join(', ') || 'monitoring'}
              </p>
            </div>
          )}

          {/* Forecast */}
          {forecast && (
            <div className="p-3 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wide">Forecast</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-white/50">7 days</span>
                  <span className={`text-lg font-bold tabular-nums ${
                    forecast.days7 > currentScore ? 'text-green-400' :
                    forecast.days7 < currentScore ? 'text-orange-400' :
                    'text-gray-400'
                  }`}>
                    {forecast.days7}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-white/50">30 days</span>
                  <span className={`text-lg font-bold tabular-nums ${
                    forecast.days30 > currentScore ? 'text-green-400' :
                    forecast.days30 < currentScore ? 'text-orange-400' :
                    'text-gray-400'
                  }`}>
                    {forecast.days30}%
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-white/40 mt-2">Based on recent trend</p>
            </div>
          )}

          {/* Streak Stats */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <h4 className="text-xs font-bold uppercase tracking-wide">Performance</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-white/50">Current streak</span>
                <span className="text-base font-bold text-orange-400">{streak.current} days</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-white/50">Best streak</span>
                <span className="text-base font-bold text-brand-accent">{streak.best} days</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-white/50">Data points</span>
                <span className="text-base font-bold text-white/70">{history.length}</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          {history.length < 3 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-300 font-semibold mb-1">Build your history</p>
                  <p className="text-[10px] text-white/60 leading-snug">
                    Check back daily to unlock forecasts and track your progress over time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GEOHealthTracker;
