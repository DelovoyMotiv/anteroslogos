/**
 * Audit History Management
 * Stores and manages historical audit data in localStorage
 */

import type { AuditResult } from './geoAuditEnhanced';

const STORAGE_KEY = 'geo_audit_history';
const MAX_HISTORY_ITEMS = 50;

export interface HistoryItem {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  grade: string;
  scores: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    citationPotential: number;
    technicalSEO: number;
    linkAnalysis: number;
  };
}

/**
 * Save audit result to history
 */
export function saveAuditToHistory(result: AuditResult): void {
  try {
    const history = getAuditHistory();
    
    const historyItem: HistoryItem = {
      id: `${result.url}_${Date.now()}`,
      url: result.url,
      timestamp: result.timestamp,
      overallScore: result.overallScore,
      grade: result.grade,
      scores: result.scores,
    };
    
    // Add to beginning of array
    history.unshift(historyItem);
    
    // Keep only last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save audit to history:', error);
  }
}

/**
 * Get all audit history
 */
export function getAuditHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored) as HistoryItem[];
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Failed to load audit history:', error);
    return [];
  }
}

/**
 * Get history for specific URL
 */
export function getUrlHistory(url: string): HistoryItem[] {
  const history = getAuditHistory();
  const normalizedUrl = normalizeUrlForComparison(url);
  
  return history.filter(item => 
    normalizeUrlForComparison(item.url) === normalizedUrl
  );
}

/**
 * Get score trend for URL
 */
export function getScoreTrend(url: string): HistoryItem[] {
  const urlHistory = getUrlHistory(url);
  return urlHistory.reverse(); // Oldest first for chart display
}

/**
 * Get latest audit for URL
 */
export function getLatestAudit(url: string): HistoryItem | null {
  const urlHistory = getUrlHistory(url);
  return urlHistory.length > 0 ? urlHistory[0] : null;
}

/**
 * Compare current audit with previous
 */
export function compareWithPrevious(
  current: AuditResult
): {
  previous: HistoryItem | null;
  changes: {
    overallScore: number;
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    citationPotential: number;
    technicalSEO: number;
    linkAnalysis: number;
  } | null;
} {
  const urlHistory = getUrlHistory(current.url);
  
  // Skip the most recent (which might be the current one we just saved)
  // and get the one before
  const previous = urlHistory.length > 1 ? urlHistory[1] : urlHistory[0];
  
  if (!previous) {
    return { previous: null, changes: null };
  }
  
  const changes = {
    overallScore: current.overallScore - previous.overallScore,
    schemaMarkup: current.scores.schemaMarkup - previous.scores.schemaMarkup,
    metaTags: current.scores.metaTags - previous.scores.metaTags,
    aiCrawlers: current.scores.aiCrawlers - previous.scores.aiCrawlers,
    eeat: current.scores.eeat - previous.scores.eeat,
    structure: current.scores.structure - previous.scores.structure,
    performance: current.scores.performance - previous.scores.performance,
    contentQuality: current.scores.contentQuality - previous.scores.contentQuality,
    citationPotential: current.scores.citationPotential - (previous.scores.citationPotential || 0),
    technicalSEO: current.scores.technicalSEO - (previous.scores.technicalSEO || 0),
    linkAnalysis: current.scores.linkAnalysis - (previous.scores.linkAnalysis || 0),
  };
  
  return { previous, changes };
}

/**
 * Get statistics for all audits
 */
export function getHistoryStats(): {
  totalAudits: number;
  uniqueUrls: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  lastAuditDate: string | null;
} {
  const history = getAuditHistory();
  
  if (history.length === 0) {
    return {
      totalAudits: 0,
      uniqueUrls: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      lastAuditDate: null,
    };
  }
  
  const uniqueUrls = new Set(history.map(item => normalizeUrlForComparison(item.url)));
  const scores = history.map(item => item.overallScore);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  return {
    totalAudits: history.length,
    uniqueUrls: uniqueUrls.size,
    averageScore,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    lastAuditDate: history[0].timestamp,
  };
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

/**
 * Delete specific audit from history
 */
export function deleteAudit(id: string): void {
  try {
    const history = getAuditHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete audit:', error);
  }
}

/**
 * Export history as JSON
 */
export function exportHistory(): string {
  const history = getAuditHistory();
  return JSON.stringify(history, null, 2);
}

/**
 * Import history from JSON
 */
export function importHistory(jsonData: string): boolean {
  try {
    const imported = JSON.parse(jsonData) as HistoryItem[];
    
    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected array');
    }
    
    // Validate structure
    const isValid = imported.every(item => 
      item.id && item.url && item.timestamp && typeof item.overallScore === 'number'
    );
    
    if (!isValid) {
      throw new Error('Invalid data structure');
    }
    
    // Merge with existing history
    const existing = getAuditHistory();
    const merged = [...imported, ...existing];
    
    // Remove duplicates by id
    const unique = merged.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );
    
    // Sort by timestamp (newest first)
    unique.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Keep only MAX_HISTORY_ITEMS
    const final = unique.slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
    return true;
  } catch (error) {
    console.error('Failed to import history:', error);
    return false;
  }
}

/**
 * Normalize URL for comparison (remove protocol, www, trailing slash)
 */
function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    let normalized = parsed.hostname + parsed.pathname;
    
    // Remove www.
    if (normalized.startsWith('www.')) {
      normalized = normalized.substring(4);
    }
    
    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized.toLowerCase();
  } catch {
    // If URL parsing fails, return as-is
    return url.toLowerCase();
  }
}

/**
 * Check if score dropped significantly (> 10 points)
 */
export function checkScoreDrop(url: string, currentScore: number): {
  dropped: boolean;
  previousScore: number | null;
  difference: number;
} {
  const latest = getLatestAudit(url);
  
  if (!latest) {
    return { dropped: false, previousScore: null, difference: 0 };
  }
  
  const difference = currentScore - latest.overallScore;
  const dropped = difference < -10;
  
  return {
    dropped,
    previousScore: latest.overallScore,
    difference,
  };
}

/**
 * Get improvement suggestions based on history
 */
export function getImprovementSuggestions(url: string): string[] {
  const urlHistory = getUrlHistory(url);
  
  if (urlHistory.length < 2) {
    return [];
  }
  
  const suggestions: string[] = [];
  const latest = urlHistory[0];
  const previous = urlHistory[1];
  
  // Check which categories declined
  Object.keys(latest.scores).forEach(category => {
    const currentScore = latest.scores[category as keyof typeof latest.scores];
    const previousScore = previous.scores[category as keyof typeof previous.scores];
    
    if (currentScore < previousScore - 5) {
      suggestions.push(
        `${category.replace(/([A-Z])/g, ' $1').trim()} score dropped by ${Math.round(previousScore - currentScore)} points - review recent changes`
      );
    }
  });
  
  return suggestions;
}
