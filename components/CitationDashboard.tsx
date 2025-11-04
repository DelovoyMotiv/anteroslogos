import { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, AlertCircle, ExternalLink, Calendar } from 'lucide-react';
import { 
  AIcitationTracker, 
  calculateCitationProbability,
  analyzeCitationQuality,
  type CitationSource,
  type CitationStats,
  type CitationAlert 
} from '../utils/ai/citationTracker';

interface CitationDashboardProps {
  domain: string;
  geoScore: number;
}

const CitationDashboard = ({ domain, geoScore }: CitationDashboardProps) => {
  const [citations, setCitations] = useState<CitationSource[]>([]);
  const [stats, setStats] = useState<CitationStats | null>(null);
  const [alerts, setAlerts] = useState<CitationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadCitationData();
  }, [domain, timeRange]);

  const loadCitationData = async () => {
    setLoading(true);
    try {
      const tracker = new AIcitationTracker(domain);
      const detectedCitations = await tracker.detectCitations(timeRange);
      const citationStats = tracker.getCitationStats();
      const citationAlerts = tracker.generateAlerts();

      setCitations(detectedCitations);
      setStats(citationStats);
      setAlerts(citationAlerts);
    } catch (error) {
      console.error('Failed to load citation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const citationProbability = calculateCitationProbability(geoScore);
  const quality = analyzeCitationQuality(citations);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Sparkles className="w-8 h-8 text-brand-accent mx-auto animate-pulse mb-4" />
        <p className="text-white/60">Detecting AI citations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">AI Citation Tracker™</h2>
        <p className="text-white/60">
          Real-time monitoring of when and where AI systems cite your content
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['24h', '7d', '30d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeRange === range
                ? 'bg-brand-accent text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </button>
        ))}
      </div>

      {/* Citation Probability Card */}
      <div className="bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Citation Probability</h3>
          <Sparkles className="w-6 h-6 text-fuchsia-400" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-4xl font-bold text-fuchsia-400">
              {citationProbability.probability}%
            </p>
            <p className="text-sm text-white/60 mt-1">Probability</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-purple-400">
              {citationProbability.rating}
            </p>
            <p className="text-sm text-white/60 mt-1">Rating</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-cyan-400">
              ~{citationProbability.estimatedCitationsPerMonth}
            </p>
            <p className="text-sm text-white/60 mt-1">Est. Citations/Month</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-xl border border-white/10">
            <p className="text-3xl font-bold">{stats.totalCitations}</p>
            <p className="text-sm text-white/60 mt-1">Total Citations</p>
          </div>
          <div className="p-6 rounded-xl border border-white/10">
            <p className="text-3xl font-bold text-green-400">{stats.last24h}</p>
            <p className="text-sm text-white/60 mt-1">Last 24 Hours</p>
          </div>
          <div className="p-6 rounded-xl border border-white/10">
            <p className="text-3xl font-bold text-blue-400">{stats.averagePosition}</p>
            <p className="text-sm text-white/60 mt-1">Avg Position</p>
          </div>
          <div className="p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-5 h-5 ${
                stats.citationTrend === 'increasing' ? 'text-green-400' :
                stats.citationTrend === 'decreasing' ? 'text-red-400' :
                'text-yellow-400'
              }`} />
              <p className="text-lg font-semibold capitalize">{stats.citationTrend}</p>
            </div>
            <p className="text-sm text-white/60 mt-1">Trend</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold mb-4">Recent Alerts</h3>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex items-start gap-4 ${
                alert.priority === 'high'
                  ? 'bg-red-500/10 border-red-500/30'
                  : alert.priority === 'medium'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                alert.priority === 'high' ? 'text-red-400' :
                alert.priority === 'medium' ? 'text-yellow-400' :
                'text-blue-400'
              }`} />
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{alert.title}</h4>
                <p className="text-sm text-white/70">{alert.description}</p>
                <p className="text-xs text-white/50 mt-2">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Citations by System */}
      {stats && Object.keys(stats.bySystem).length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Citations by AI System</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(stats.bySystem).map(([system, count]) => (
              <div key={system} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-white/60 mt-1">{system}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
          <p className="text-3xl font-bold text-green-400">{quality.averageConfidence}%</p>
          <p className="text-sm text-white/60 mt-1">Avg Confidence</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
          <p className="text-3xl font-bold text-blue-400">{quality.systemDiversity}%</p>
          <p className="text-sm text-white/60 mt-1">System Diversity</p>
        </div>
        <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
          <p className="text-3xl font-bold text-purple-400">{quality.quality}</p>
          <p className="text-sm text-white/60 mt-1">Overall Quality</p>
        </div>
      </div>

      {/* Top Queries */}
      {stats && stats.topQueries.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Top Queries Triggering Citations</h3>
          <div className="space-y-2">
            {stats.topQueries.slice(0, 5).map((query, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <span className="text-white/90">{query.query}</span>
                <span className="text-brand-accent font-semibold">{query.count} citations</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Citations */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Recent Citations</h3>
        <div className="space-y-3">
          {citations.slice(0, 10).map((citation, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-sm font-medium">
                    {citation.system}
                  </span>
                  <span className="text-sm text-white/50 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(citation.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className="text-sm text-green-400 font-medium">
                  {citation.confidence}% confidence
                </span>
              </div>
              <p className="text-white/90 mb-2 font-medium">{citation.query}</p>
              <p className="text-sm text-white/60 italic mb-3">"{citation.context}"</p>
              <a
                href={citation.citedURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-accent hover:underline flex items-center gap-1"
              >
                {citation.citedURL}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-6 rounded-xl bg-orange-500/10 border border-orange-500/30">
        <p className="text-sm text-white/70 mb-2">
          <strong>⚠️ Demo Mode:</strong> Citation data is currently simulated for demonstration purposes.
        </p>
        <p className="text-xs text-white/60">
          Production integration requires AI system APIs (OpenAI, Anthropic, Google) or third-party citation monitoring services.
          Contact us to enable real citation tracking with enterprise API access.
        </p>
      </div>
    </div>
  );
};

export default CitationDashboard;
