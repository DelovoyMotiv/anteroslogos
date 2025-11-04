/**
 * Real-time Monitoring & Alerts Module - Hi-End AAA Level
 * Score drop detection, validation errors, broken links, performance degradation
 */

import type { AuditResult } from './geoAuditEnhanced';
import { getUrlHistory } from './auditHistory';

const ALERTS_STORAGE_KEY = 'geo_audit_alerts';
const MAX_ALERTS = 100;

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertCategory = 
  | 'score_drop'
  | 'schema_error'
  | 'broken_link'
  | 'performance'
  | 'security'
  | 'content'
  | 'accessibility'
  | 'seo';

export interface Alert {
  id: string;
  url: string;
  timestamp: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  details?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  actionable: boolean;
  recommendation?: string;
}

export interface MonitoringConfig {
  scoreDropThreshold: number; // Alert if score drops by this many points
  criticalScoreThreshold: number; // Alert if score falls below this
  performanceBudget: {
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift
  };
  enableAlerts: boolean;
  alertFrequency: 'immediate' | 'hourly' | 'daily';
  notificationPreferences: {
    browser: boolean;
    email: boolean;
  };
}

const DEFAULT_CONFIG: MonitoringConfig = {
  scoreDropThreshold: 10,
  criticalScoreThreshold: 50,
  performanceBudget: {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
  },
  enableAlerts: true,
  alertFrequency: 'immediate',
  notificationPreferences: {
    browser: true,
    email: false,
  },
};

/**
 * Get monitoring configuration
 */
export function getMonitoringConfig(): MonitoringConfig {
  try {
    const stored = localStorage.getItem('monitoring_config');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load monitoring config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Update monitoring configuration
 */
export function updateMonitoringConfig(config: Partial<MonitoringConfig>): void {
  try {
    const current = getMonitoringConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('monitoring_config', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update monitoring config:', error);
  }
}

/**
 * Analyze audit result and generate alerts
 */
export function analyzeAndGenerateAlerts(
  result: AuditResult,
  config: MonitoringConfig = getMonitoringConfig()
): Alert[] {
  if (!config.enableAlerts) return [];

  const alerts: Alert[] = [];
  const history = getUrlHistory(result.url);

  // 1. Score drop detection
  if (history.length > 0) {
    const previous = history[0];
    const scoreDrop = previous.overallScore - result.overallScore;

    if (scoreDrop >= config.scoreDropThreshold) {
      alerts.push({
        id: generateAlertId(),
        url: result.url,
        timestamp: new Date().toISOString(),
        severity: scoreDrop >= 20 ? 'critical' : scoreDrop >= 15 ? 'high' : 'medium',
        category: 'score_drop',
        title: 'Significant Score Drop Detected',
        message: `Overall score dropped by ${scoreDrop.toFixed(1)} points (${previous.overallScore} → ${result.overallScore})`,
        details: {
          previousScore: previous.overallScore,
          currentScore: result.overallScore,
          drop: scoreDrop,
          previousTimestamp: previous.timestamp,
        },
        resolved: false,
        actionable: true,
        recommendation: 'Review recent changes to your website and compare category scores to identify the cause.',
      });
    }
  }

  // 2. Critical score threshold
  if (result.overallScore < config.criticalScoreThreshold) {
    alerts.push({
      id: generateAlertId(),
      url: result.url,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      category: 'score_drop',
      title: 'Critical Score Threshold Breached',
      message: `Overall score (${result.overallScore}) is below critical threshold of ${config.criticalScoreThreshold}`,
      details: {
        currentScore: result.overallScore,
        threshold: config.criticalScoreThreshold,
        grade: result.grade,
      },
      resolved: false,
      actionable: true,
      recommendation: 'Focus on high-priority recommendations to bring the score above minimum acceptable level.',
    });
  }

  // 3. Schema validation errors
  const schemaIssues = result.recommendations.filter(
    r => r.category === 'schemaMarkup' && r.priority === 'high'
  );
  if (schemaIssues.length > 0) {
    alerts.push({
      id: generateAlertId(),
      url: result.url,
      timestamp: new Date().toISOString(),
      severity: 'high',
      category: 'schema_error',
      title: 'Schema Markup Validation Errors',
      message: `Found ${schemaIssues.length} critical schema markup issue${schemaIssues.length > 1 ? 's' : ''}`,
      details: {
        issueCount: schemaIssues.length,
        issues: schemaIssues.map(i => i.title),
      },
      resolved: false,
      actionable: true,
      recommendation: 'Validate schema markup using Google\'s Rich Results Test and fix structural errors.',
    });
  }

  // 4. Performance degradation
  if (history.length > 0) {
    const previous = history[0];
    const perfDrop = previous.scores.performance - result.scores.performance;
    
    if (perfDrop >= 15) {
      alerts.push({
        id: generateAlertId(),
        url: result.url,
        timestamp: new Date().toISOString(),
        severity: perfDrop >= 25 ? 'high' : 'medium',
        category: 'performance',
        title: 'Performance Score Degradation',
        message: `Performance score dropped by ${perfDrop.toFixed(1)} points`,
        details: {
          previousScore: previous.scores.performance,
          currentScore: result.scores.performance,
          drop: perfDrop,
        },
        resolved: false,
        actionable: true,
        recommendation: 'Check for new scripts, large images, or render-blocking resources added recently.',
      });
    }
  }

  // 5. Security issues
  const securityIssues = result.recommendations.filter(
    r => {
      const title = r.title.toLowerCase();
      return ['technicalSEO', 'contentQuality'].includes(r.category) && 
             (title.includes('https') || title.includes('security') || title.includes('ssl'));
    }
  );
  if (securityIssues.length > 0) {
    alerts.push({
      id: generateAlertId(),
      url: result.url,
      timestamp: new Date().toISOString(),
      severity: 'high',
      category: 'security',
      title: 'Security Configuration Issues',
      message: `Detected ${securityIssues.length} security-related issue${securityIssues.length > 1 ? 's' : ''}`,
      details: {
        issues: securityIssues.map(i => i.title),
      },
      resolved: false,
      actionable: true,
      recommendation: 'Ensure HTTPS is properly configured and security headers are in place.',
    });
  }

  // 6. Content quality issues
  if (result.scores.contentQuality < 60) {
    alerts.push({
      id: generateAlertId(),
      url: result.url,
      timestamp: new Date().toISOString(),
      severity: result.scores.contentQuality < 40 ? 'high' : 'medium',
      category: 'content',
      title: 'Low Content Quality Score',
      message: `Content quality score is ${result.scores.contentQuality.toFixed(1)} - below recommended level`,
      details: {
        score: result.scores.contentQuality,
        threshold: 60,
      },
      resolved: false,
      actionable: true,
      recommendation: 'Improve content depth, add semantic markup, and ensure proper heading structure.',
    });
  }

  // 7. E-E-A-T concerns
  if (result.scores.eeat < 70) {
    alerts.push({
      id: generateAlertId(),
      url: result.url,
      timestamp: new Date().toISOString(),
      severity: result.scores.eeat < 50 ? 'high' : 'medium',
      category: 'seo',
      title: 'E-E-A-T Score Needs Improvement',
      message: `Experience, Expertise, Authoritativeness, and Trust score is ${result.scores.eeat.toFixed(1)}`,
      details: {
        score: result.scores.eeat,
        threshold: 70,
      },
      resolved: false,
      actionable: true,
      recommendation: 'Add author information, credentials, contact details, and authoritative backlinks.',
    });
  }

  // 8. Accessibility issues
  const accessibilityIssues = result.recommendations.filter(
    r => {
      const title = r.title.toLowerCase();
      return title.includes('accessibility') || title.includes('alt') || 
             title.includes('aria') || title.includes('wcag');
    }
  );
  if (accessibilityIssues.length > 2) {
    alerts.push({
      id: generateAlertId(),
      url: result.url,
      timestamp: new Date().toISOString(),
      severity: 'medium',
      category: 'accessibility',
      title: 'Multiple Accessibility Issues Found',
      message: `Found ${accessibilityIssues.length} accessibility-related issues`,
      details: {
        issueCount: accessibilityIssues.length,
        issues: accessibilityIssues.map(i => i.title),
      },
      resolved: false,
      actionable: true,
      recommendation: 'Review WCAG 2.1 guidelines and ensure all interactive elements are keyboard accessible.',
    });
  }

  // Save alerts to storage
  saveAlerts(alerts);

  // Trigger browser notifications if enabled
  if (config.notificationPreferences.browser && alerts.length > 0) {
    requestNotificationPermission().then(granted => {
      if (granted) {
        const critical = alerts.filter(a => a.severity === 'critical');
        if (critical.length > 0) {
          showBrowserNotification(critical[0]);
        }
      }
    });
  }

  return alerts;
}

/**
 * Get all alerts
 */
export function getAllAlerts(): Alert[] {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!stored) return [];
    
    const alerts = JSON.parse(stored) as Alert[];
    return Array.isArray(alerts) ? alerts : [];
  } catch (error) {
    console.error('Failed to load alerts:', error);
    return [];
  }
}

/**
 * Get alerts for specific URL
 */
export function getUrlAlerts(url: string): Alert[] {
  return getAllAlerts().filter(alert => alert.url === url);
}

/**
 * Get unresolved alerts
 */
export function getUnresolvedAlerts(): Alert[] {
  return getAllAlerts().filter(alert => !alert.resolved);
}

/**
 * Get alerts by severity
 */
export function getAlertsBySeverity(severity: AlertSeverity): Alert[] {
  return getAllAlerts().filter(alert => alert.severity === severity);
}

/**
 * Get alerts by category
 */
export function getAlertsByCategory(category: AlertCategory): Alert[] {
  return getAllAlerts().filter(alert => alert.category === category);
}

/**
 * Resolve alert
 */
export function resolveAlert(alertId: string): void {
  const alerts = getAllAlerts();
  const alert = alerts.find(a => a.id === alertId);
  
  if (alert) {
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }
}

/**
 * Delete alert
 */
export function deleteAlert(alertId: string): void {
  const alerts = getAllAlerts().filter(a => a.id !== alertId);
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

/**
 * Clear all alerts
 */
export function clearAllAlerts(): void {
  localStorage.removeItem(ALERTS_STORAGE_KEY);
}

/**
 * Clear resolved alerts
 */
export function clearResolvedAlerts(): void {
  const unresolved = getUnresolvedAlerts();
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(unresolved));
}

/**
 * Get alert statistics
 */
export function getAlertStats(): {
  total: number;
  unresolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<AlertCategory, number>;
} {
  const alerts = getAllAlerts();
  const unresolved = alerts.filter(a => !a.resolved);

  const byCategory: Record<AlertCategory, number> = {
    score_drop: 0,
    schema_error: 0,
    broken_link: 0,
    performance: 0,
    security: 0,
    content: 0,
    accessibility: 0,
    seo: 0,
  };

  alerts.forEach(alert => {
    byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;
  });

  return {
    total: alerts.length,
    unresolved: unresolved.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
    byCategory,
  };
}

/**
 * Save alerts to storage
 */
function saveAlerts(newAlerts: Alert[]): void {
  try {
    const existing = getAllAlerts();
    const combined = [...newAlerts, ...existing];
    
    // Keep only MAX_ALERTS most recent
    if (combined.length > MAX_ALERTS) {
      combined.splice(MAX_ALERTS);
    }
    
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(combined));
  } catch (error) {
    console.error('Failed to save alerts:', error);
  }
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request browser notification permission
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show browser notification
 */
function showBrowserNotification(alert: Alert): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(alert.title, {
    body: alert.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: alert.id,
    requireInteraction: alert.severity === 'critical',
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

/**
 * Export alerts to JSON
 */
export function exportAlertsToJSON(): string {
  const alerts = getAllAlerts();
  return JSON.stringify(alerts, null, 2);
}

/**
 * Get alert trend (alerts over time)
 */
export function getAlertTrend(days: number = 30): Array<{ date: string; count: number }> {
  const alerts = getAllAlerts();
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const trend: Record<string, number> = {};

  alerts.forEach(alert => {
    const alertDate = new Date(alert.timestamp);
    if (alertDate >= startDate) {
      const dateKey = alertDate.toLocaleDateString();
      trend[dateKey] = (trend[dateKey] || 0) + 1;
    }
  });

  return Object.entries(trend)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get most common alert types
 */
export function getMostCommonAlerts(limit: number = 5): Array<{
  category: AlertCategory;
  count: number;
  percentage: number;
}> {
  const alerts = getAllAlerts();
  const total = alerts.length;

  if (total === 0) return [];

  const categoryCounts: Record<AlertCategory, number> = {
    score_drop: 0,
    schema_error: 0,
    broken_link: 0,
    performance: 0,
    security: 0,
    content: 0,
    accessibility: 0,
    seo: 0,
  };

  alerts.forEach(alert => {
    categoryCounts[alert.category] = (categoryCounts[alert.category] || 0) + 1;
  });

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category: category as AlertCategory,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
