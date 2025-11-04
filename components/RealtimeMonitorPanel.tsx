import { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, Clock, Wifi } from 'lucide-react';
import { 
  RealtimeGEOMonitor,
  type GEOHealthStatus,
  type LiveMetric,
  type UptimeStatus,
  type CrawlerActivity
} from '../utils/ai/realtimeMonitor';

interface RealtimeMonitorPanelProps {
  domain: string;
}

const RealtimeMonitorPanel = ({ domain }: RealtimeMonitorPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<GEOHealthStatus | null>(null);
  const [metrics, setMetrics] = useState<LiveMetric[]>([]);
  const [uptime, setUptime] = useState<UptimeStatus | null>(null);
  const [crawlers, setCrawlers] = useState<CrawlerActivity[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    
    if (autoRefresh) {
      const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
    return undefined;
  }, [domain, autoRefresh]);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      const monitor = new RealtimeGEOMonitor(domain);
      
      const [healthData, metricsData, uptimeData, crawlerData] = await Promise.all([
        monitor.getCurrentHealth(),
        monitor.getLiveMetrics(),
        monitor.checkUptime(),
        monitor.getCrawlerActivity(),
      ]);

      setHealth(healthData);
      setMetrics(metricsData);
      setUptime(uptimeData);
      setCrawlers(crawlerData);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !health) {
    return (
      <div className="py-12 text-center">
        <Activity className="w-8 h-8 text-brand-accent mx-auto animate-pulse mb-4" />
        <p className="text-white/60">Initializing real-time monitoring...</p>
      </div>
    );
  }

  const getHealthColor = (status: GEOHealthStatus['overall']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: LiveMetric['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Real-time GEO Monitor™</h2>
          <p className="text-white/60">
            Live monitoring of your GEO health and AI visibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadMonitoringData}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            title="Refresh now"
          >
            <Activity className="w-5 h-5" />
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/5 text-white/60 border border-white/10'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Health Status Card */}
      {health && (
        <div className={`p-6 rounded-xl border ${
          health.overall === 'healthy'
            ? 'bg-green-500/10 border-green-500/30'
            : health.overall === 'warning'
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold mb-1">GEO Health Status</h3>
              <p className="text-sm text-white/60">
                Last updated: {new Date(health.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-6xl font-bold ${getHealthColor(health.overall)}`}>
                {health.score}
              </div>
              <div className="text-sm text-white/50 mt-1">Health Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/50 mb-1">Schema</p>
              <p className={`text-lg font-semibold ${health.metrics.schemaValid ? 'text-green-400' : 'text-red-400'}`}>
                {health.metrics.schemaValid ? 'Valid' : 'Invalid'}
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/50 mb-1">AI Crawlers</p>
              <p className="text-lg font-semibold text-blue-400">
                {health.metrics.crawlersAllowed}/5
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/50 mb-1">HTTPS</p>
              <p className={`text-lg font-semibold ${health.metrics.httpsEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {health.metrics.httpsEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/50 mb-1">Sitemap</p>
              <p className={`text-lg font-semibold ${health.metrics.sitemapAccessible ? 'text-green-400' : 'text-yellow-400'}`}>
                {health.metrics.sitemapAccessible ? 'OK' : 'Not Found'}
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/50 mb-1">robots.txt</p>
              <p className={`text-lg font-semibold ${health.metrics.robotsTxtValid ? 'text-green-400' : 'text-yellow-400'}`}>
                {health.metrics.robotsTxtValid ? 'Valid' : 'Issues'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Uptime Status */}
      {uptime && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Wifi className={`w-6 h-6 ${uptime.isOnline ? 'text-green-400' : 'text-red-400'}`} />
              <h3 className="text-xl font-semibold">Uptime Status</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Status</span>
                <span className={`font-semibold ${uptime.isOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {uptime.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Response Time</span>
                <span className="font-semibold">{uptime.responseTime}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Uptime (24h)</span>
                <span className="font-semibold text-green-400">{uptime.uptime.percentage.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Outages (24h)</span>
                <span className="font-semibold">{uptime.uptime.outages}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-semibold">Monitoring Info</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Check Frequency</span>
                <span className="font-semibold">30 seconds</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Last Check</span>
                <span className="font-semibold">{new Date(uptime.lastCheck).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total Downtime</span>
                <span className="font-semibold">{uptime.uptime.totalDowntime}min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Status Code</span>
                <span className={`font-semibold ${uptime.statusCode === 200 ? 'text-green-400' : 'text-red-400'}`}>
                  {uptime.statusCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Metrics Grid */}
      {metrics.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Live Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metric.status)}
                    <h4 className="font-semibold text-sm">{metric.name}</h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    metric.trend === 'improving' ? 'bg-green-500/20 text-green-300' :
                    metric.trend === 'declining' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {metric.trend}
                  </span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {typeof metric.value === 'boolean' 
                    ? (metric.value ? 'Yes' : 'No')
                    : metric.value}
                </div>
                <p className="text-xs text-white/50">
                  {new Date(metric.lastChecked).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Crawler Activity */}
      {crawlers.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">AI Crawler Activity</h3>
          <div className="space-y-3">
            {crawlers.map((crawler, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  crawler.status === 'active'
                    ? 'bg-green-500/10 border-green-500/30'
                    : crawler.status === 'inactive'
                    ? 'bg-gray-500/10 border-gray-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    crawler.status === 'active' ? 'bg-green-400 animate-pulse' :
                    crawler.status === 'inactive' ? 'bg-gray-400' :
                    'bg-red-400'
                  }`} />
                  <div>
                    <h4 className="font-semibold">{crawler.crawler}</h4>
                    <p className="text-xs text-white/50">
                      Last seen: {new Date(crawler.lastSeen).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{crawler.requestCount}</div>
                  <div className="text-xs text-white/50">requests (24h)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="p-6 rounded-xl bg-orange-500/10 border border-orange-500/30">
        <p className="text-sm text-white/70 mb-2">
          <strong>⚠️ Demo Mode:</strong> Monitoring data is simulated for demonstration. Auto-refresh: 30 seconds.
        </p>
        <p className="text-xs text-white/60">
          Production integration requires: Server log access for crawler tracking, uptime monitoring service (UptimeRobot/Pingdom),
          and real schema validation APIs. Health metrics simulate realistic GEO monitoring patterns.
        </p>
      </div>
    </div>
  );
};

export default RealtimeMonitorPanel;
