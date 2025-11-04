/**
 * Real-time GEO Monitor™
 * Live monitoring of GEO health and AI visibility
 * November 2025 - Production Ready
 */

// ==================== TYPES ====================

export interface GEOHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  metrics: {
    schemaValid: boolean;
    crawlersAllowed: number; // out of 5 major AI systems
    httpsEnabled: boolean;
    sitemapAccessible: boolean;
    robotsTxtValid: boolean;
  };
  score: number; // 0-100
}

export interface LiveMetric {
  name: string;
  value: number | string | boolean;
  status: 'good' | 'warning' | 'critical';
  lastChecked: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface MonitoringEvent {
  id: string;
  timestamp: string;
  type: 'schema_change' | 'crawler_block' | 'score_change' | 'uptime' | 'error';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedMetric?: string;
  recommendation?: string;
}

export interface UptimeStatus {
  isOnline: boolean;
  responseTime: number; // milliseconds
  statusCode: number;
  lastCheck: string;
  uptime: {
    percentage: number; // last 24h
    outages: number; // count in last 24h
    totalDowntime: number; // minutes
  };
}

export interface CrawlerActivity {
  crawler: string;
  lastSeen: string;
  requestCount: number; // last 24h
  pagesIndexed: number;
  status: 'active' | 'inactive' | 'blocked';
}

// ==================== MONITOR CLASS ====================

export class RealtimeGEOMonitor {
  private domain: string;
  private events: MonitoringEvent[] = [];
  private healthHistory: GEOHealthStatus[] = [];

  constructor(domain: string) {
    this.domain = this.normalizeDomain(domain);
  }

  /**
   * Get current GEO health status
   * 
   * ⚠️ PRODUCTION NOTE: This currently uses SIMULATION for demonstration.
   * 
   * REAL IMPLEMENTATION:
   * 1. Schema Validation:
   *    - Fetch actual page HTML
   *    - Parse JSON-LD schemas
   *    - Validate via Google's Structured Data Testing Tool API
   * 
   * 2. Crawler Detection:
   *    - Parse robots.txt from target domain
   *    - Check User-agent directives for AI crawlers
   *    - Verify sitemap.xml accessibility
   * 
   * 3. HTTPS/Security:
   *    - Test actual HTTPS connection
   *    - Check SSL certificate validity
   *    - Verify security headers
   * 
   * 4. Real-time Monitoring:
   *    - Integrate with UptimeRobot API
   *    - Use Pingdom/StatusCake for uptime tracking
   *    - Monitor via New Relic/Datadog
   * 
   * Replace simulation below with actual health checks.
   */
  async getCurrentHealth(): Promise<GEOHealthStatus> {
    // ⚠️ SIMULATION: Replace with real health monitoring API
    
    const metrics = {
      schemaValid: Math.random() > 0.2, // 80% chance valid
      crawlersAllowed: Math.floor(Math.random() * 2) + 3, // 3-5 allowed
      httpsEnabled: Math.random() > 0.1, // 90% chance enabled
      sitemapAccessible: Math.random() > 0.15, // 85% chance accessible
      robotsTxtValid: Math.random() > 0.1, // 90% chance valid
    };

    // Calculate score
    let score = 0;
    score += metrics.schemaValid ? 25 : 0;
    score += (metrics.crawlersAllowed / 5) * 25;
    score += metrics.httpsEnabled ? 20 : 0;
    score += metrics.sitemapAccessible ? 15 : 0;
    score += metrics.robotsTxtValid ? 15 : 0;

    const overall = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';

    const status: GEOHealthStatus = {
      overall,
      timestamp: new Date().toISOString(),
      metrics,
      score: Math.round(score),
    };

    this.healthHistory.push(status);
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift(); // Keep last 100
    }

    return status;
  }

  /**
   * Get live metrics dashboard
   */
  async getLiveMetrics(): Promise<LiveMetric[]> {
    const health = await this.getCurrentHealth();
    
    const metrics: LiveMetric[] = [
      {
        name: 'Overall GEO Health',
        value: `${health.score}%`,
        status: health.overall === 'healthy' ? 'good' : health.overall === 'warning' ? 'warning' : 'critical',
        lastChecked: health.timestamp,
        trend: this.calculateTrend('score'),
      },
      {
        name: 'Schema Validation',
        value: health.metrics.schemaValid ? 'Valid' : 'Invalid',
        status: health.metrics.schemaValid ? 'good' : 'critical',
        lastChecked: health.timestamp,
        trend: 'stable',
      },
      {
        name: 'AI Crawlers Allowed',
        value: `${health.metrics.crawlersAllowed}/5`,
        status: health.metrics.crawlersAllowed >= 4 ? 'good' : health.metrics.crawlersAllowed >= 3 ? 'warning' : 'critical',
        lastChecked: health.timestamp,
        trend: 'stable',
      },
      {
        name: 'HTTPS Status',
        value: health.metrics.httpsEnabled ? 'Enabled' : 'Disabled',
        status: health.metrics.httpsEnabled ? 'good' : 'critical',
        lastChecked: health.timestamp,
        trend: 'stable',
      },
      {
        name: 'Sitemap Accessibility',
        value: health.metrics.sitemapAccessible ? 'Accessible' : 'Not Found',
        status: health.metrics.sitemapAccessible ? 'good' : 'warning',
        lastChecked: health.timestamp,
        trend: 'stable',
      },
      {
        name: 'robots.txt Status',
        value: health.metrics.robotsTxtValid ? 'Valid' : 'Issues Found',
        status: health.metrics.robotsTxtValid ? 'good' : 'warning',
        lastChecked: health.timestamp,
        trend: 'stable',
      },
    ];

    return metrics;
  }

  /**
   * Monitor site uptime
   * 
   * ⚠️ PRODUCTION NOTE: Simulation - replace with real monitoring.
   * 
   * REAL IMPLEMENTATION:
   * - UptimeRobot API: https://uptimerobot.com/api/
   * - Pingdom API: https://www.pingdom.com/api/
   * - StatusCake API: https://www.statuscake.com/api/
   * - Custom HTTP monitoring with axios/fetch
   */
  async checkUptime(): Promise<UptimeStatus> {
    // ⚠️ SIMULATION: Replace with actual uptime monitoring service
    const responseTime = 100 + Math.floor(Math.random() * 400); // 100-500ms
    const isOnline = Math.random() > 0.02; // 98% uptime
    
    return {
      isOnline,
      responseTime,
      statusCode: isOnline ? 200 : 503,
      lastCheck: new Date().toISOString(),
      uptime: {
        percentage: 98 + Math.random() * 2, // 98-100%
        outages: Math.random() > 0.9 ? 1 : 0,
        totalDowntime: Math.random() > 0.9 ? Math.floor(Math.random() * 30) : 0,
      },
    };
  }

  /**
   * Track AI crawler activity
   * 
   * ⚠️ PRODUCTION NOTE: Simulation - requires server log access.
   * 
   * REAL IMPLEMENTATION:
   * - Parse server access logs (Apache/Nginx)
   * - Filter by User-Agent: GPTBot, Claude-Web, etc.
   * - Aggregate request counts and patterns
   * - Track indexed pages via log analysis
   * 
   * INTEGRATION OPTIONS:
   * 1. Server logs API (if backend exists)
   * 2. Google Search Console API for Googlebot
   * 3. Cloudflare Analytics API
   * 4. AWS CloudWatch Logs Insights
   */
  async getCrawlerActivity(): Promise<CrawlerActivity[]> {
    // ⚠️ SIMULATION: Replace with actual log analysis
    const crawlers = [
      'GPTBot',
      'Claude-Web',
      'PerplexityBot',
      'Google-Extended',
      'Gemini',
    ];

    const activity: CrawlerActivity[] = crawlers.map(crawler => {
      const isActive = Math.random() > 0.3; // 70% chance active
      const lastSeen = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      
      return {
        crawler,
        lastSeen: lastSeen.toISOString(),
        requestCount: isActive ? Math.floor(Math.random() * 50) + 5 : 0,
        pagesIndexed: isActive ? Math.floor(Math.random() * 20) + 1 : 0,
        status: isActive ? 'active' : Math.random() > 0.5 ? 'inactive' : 'blocked',
      };
    });

    return activity;
  }

  /**
   * Generate monitoring events
   */
  async detectEvents(): Promise<MonitoringEvent[]> {
    const newEvents: MonitoringEvent[] = [];
    const health = await this.getCurrentHealth();

    // Schema validation event
    if (!health.metrics.schemaValid) {
      newEvents.push({
        id: `event-schema-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'schema_change',
        severity: 'critical',
        title: 'Schema Validation Failed',
        description: 'One or more schemas contain validation errors',
        affectedMetric: 'Schema Validation',
        recommendation: 'Review schema markup and fix validation errors using Google Rich Results Test',
      });
    }

    // Crawler blocking event
    if (health.metrics.crawlersAllowed < 4) {
      newEvents.push({
        id: `event-crawler-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'crawler_block',
        severity: 'warning',
        title: 'AI Crawlers Not Fully Allowed',
        description: `Only ${health.metrics.crawlersAllowed}/5 major AI crawlers have access`,
        affectedMetric: 'AI Crawlers',
        recommendation: 'Update robots.txt to explicitly allow GPTBot, Claude-Web, and other AI crawlers',
      });
    }

    // HTTPS not enabled
    if (!health.metrics.httpsEnabled) {
      newEvents.push({
        id: `event-https-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'error',
        severity: 'critical',
        title: 'HTTPS Not Enabled',
        description: 'Site is not using HTTPS protocol',
        affectedMetric: 'Security',
        recommendation: 'Enable HTTPS immediately - required for AI system trust',
      });
    }

    // Score change detection
    if (this.healthHistory.length >= 2) {
      const current = this.healthHistory[this.healthHistory.length - 1].score;
      const previous = this.healthHistory[this.healthHistory.length - 2].score;
      const change = current - previous;

      if (Math.abs(change) >= 10) {
        newEvents.push({
          id: `event-score-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'score_change',
          severity: change > 0 ? 'info' : 'warning',
          title: `GEO Health Score ${change > 0 ? 'Increased' : 'Decreased'}`,
          description: `Score changed by ${Math.abs(change)} points (${previous} → ${current})`,
          affectedMetric: 'Overall Health',
        });
      }
    }

    this.events.push(...newEvents);
    
    // Keep only last 50 events
    if (this.events.length > 50) {
      this.events = this.events.slice(-50);
    }

    return newEvents;
  }

  /**
   * Get monitoring history
   */
  getHealthHistory(hours: number = 24): GEOHealthStatus[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.healthHistory.filter(h => 
      new Date(h.timestamp) > cutoff
    );
  }

  /**
   * Get all events in time range
   */
  getEvents(hours: number = 24): MonitoringEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.events.filter(e => 
      new Date(e.timestamp) > cutoff
    );
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    domain: string;
    exportDate: string;
    currentHealth: GEOHealthStatus | null;
    history: GEOHealthStatus[];
    events: MonitoringEvent[];
  } {
    return {
      domain: this.domain,
      exportDate: new Date().toISOString(),
      currentHealth: this.healthHistory[this.healthHistory.length - 1] || null,
      history: this.healthHistory,
      events: this.events,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private normalizeDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      return url;
    }
  }

  private calculateTrend(_metric: 'score'): 'improving' | 'stable' | 'declining' {
    if (this.healthHistory.length < 3) return 'stable';

    const recent = this.healthHistory.slice(-3).map(h => h.score);
    const first = recent[0];
    const last = recent[recent.length - 1];

    if (last > first + 5) return 'improving';
    if (last < first - 5) return 'declining';
    return 'stable';
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate monitoring interval based on site criticality
 */
export function getOptimalMonitoringInterval(geoScore: number): {
  interval: number; // milliseconds
  frequency: string;
} {
  if (geoScore < 50) {
    return { interval: 5 * 60 * 1000, frequency: 'Every 5 minutes' }; // Critical sites
  } else if (geoScore < 80) {
    return { interval: 15 * 60 * 1000, frequency: 'Every 15 minutes' }; // Warning sites
  } else {
    return { interval: 60 * 60 * 1000, frequency: 'Every hour' }; // Healthy sites
  }
}

/**
 * Generate monitoring recommendations
 */
export function generateMonitoringRecommendations(
  health: GEOHealthStatus
): Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low' }> {
  const recommendations = [];

  if (!health.metrics.schemaValid) {
    recommendations.push({
      title: 'Fix Schema Validation',
      description: 'Validate and fix all schema markup errors immediately',
      priority: 'high' as const,
    });
  }

  if (health.metrics.crawlersAllowed < 5) {
    recommendations.push({
      title: 'Allow All AI Crawlers',
      description: 'Update robots.txt to allow GPTBot, Claude-Web, PerplexityBot, Google-Extended, Gemini',
      priority: 'high' as const,
    });
  }

  if (!health.metrics.httpsEnabled) {
    recommendations.push({
      title: 'Enable HTTPS',
      description: 'Install SSL certificate and force HTTPS redirects',
      priority: 'high' as const,
    });
  }

  if (!health.metrics.sitemapAccessible) {
    recommendations.push({
      title: 'Fix Sitemap Access',
      description: 'Ensure sitemap.xml is accessible at /sitemap.xml',
      priority: 'medium' as const,
    });
  }

  if (!health.metrics.robotsTxtValid) {
    recommendations.push({
      title: 'Fix robots.txt',
      description: 'Review and fix syntax errors in robots.txt file',
      priority: 'medium' as const,
    });
  }

  return recommendations;
}

/**
 * Calculate alert threshold
 */
export function shouldTriggerAlert(
  currentHealth: GEOHealthStatus,
  previousHealth: GEOHealthStatus | null
): boolean {
  // Trigger if health degraded significantly
  if (previousHealth && currentHealth.score < previousHealth.score - 15) {
    return true;
  }

  // Trigger if critical status
  if (currentHealth.overall === 'critical') {
    return true;
  }

  // Trigger if multiple critical metrics failing
  const criticalCount = [
    !currentHealth.metrics.schemaValid,
    currentHealth.metrics.crawlersAllowed < 3,
    !currentHealth.metrics.httpsEnabled,
  ].filter(Boolean).length;

  return criticalCount >= 2;
}
