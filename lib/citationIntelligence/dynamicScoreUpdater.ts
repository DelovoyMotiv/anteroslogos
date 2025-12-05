/**
 * Dynamic Score Updater
 * Recalculates citation probability on content changes and shows immediate impact
 * 
 * This module implements:
 * 1. Real-time score recalculation on content change
 * 2. Immediate impact visualization (improvements/regressions)
 * 3. Dynamic suggestion updates based on new content
 * 4. Change tracking and diff analysis
 * 
 * @module lib/citationIntelligence/dynamicScoreUpdater
 */

import type { RealTimeAnalysisResult } from './realTimeContentAnalyzer';
import type { SuggestionEngineResult } from './inlineSuggestionEngine';
import { analyzeContentRealTime } from './realTimeContentAnalyzer';
import { generateInlineSuggestions } from './inlineSuggestionEngine';

// ============================================================================
// Types
// ============================================================================

export interface ContentChange {
  previousContent: string;
  newContent: string;
  timestamp: Date;
  changeType: 'addition' | 'deletion' | 'modification';
  changedText?: string;
}

export interface ScoreComparison {
  previous: {
    semanticDensity: number;
    entityCount: number;
    claimCount: number;
    citationPotential: number;
  };
  current: {
    semanticDensity: number;
    entityCount: number;
    claimCount: number;
    citationPotential: number;
  };
  changes: {
    semanticDensity: number; // Positive = improvement
    entityCount: number;
    claimCount: number;
    citationPotential: number;
  };
  improvements: string[];
  regressions: string[];
}

export interface DynamicUpdateResult {
  analysis: RealTimeAnalysisResult;
  suggestions: SuggestionEngineResult;
  comparison: ScoreComparison | null;
  updateTime: number; // milliseconds
}

// ============================================================================
// Change Detection
// ============================================================================

// ============================================================================
// Score Comparison
// ============================================================================

/**
 * Compare scores between two analyses
 */
function compareScores(
  previousAnalysis: RealTimeAnalysisResult,
  currentAnalysis: RealTimeAnalysisResult
): ScoreComparison {
  const previous = {
    semanticDensity: previousAnalysis.semanticDensity,
    entityCount: previousAnalysis.entityPresence.count,
    claimCount: previousAnalysis.claimStructure.totalClaims,
    citationPotential: previousAnalysis.citationPotential,
  };
  
  const current = {
    semanticDensity: currentAnalysis.semanticDensity,
    entityCount: currentAnalysis.entityPresence.count,
    claimCount: currentAnalysis.claimStructure.totalClaims,
    citationPotential: currentAnalysis.citationPotential,
  };
  
  const changes = {
    semanticDensity: current.semanticDensity - previous.semanticDensity,
    entityCount: current.entityCount - previous.entityCount,
    claimCount: current.claimCount - previous.claimCount,
    citationPotential: current.citationPotential - previous.citationPotential,
  };
  
  // Identify improvements and regressions
  const improvements: string[] = [];
  const regressions: string[] = [];
  
  if (changes.semanticDensity > 1) {
    improvements.push(`Semantic density improved by ${changes.semanticDensity.toFixed(1)} points`);
  } else if (changes.semanticDensity < -1) {
    regressions.push(`Semantic density decreased by ${Math.abs(changes.semanticDensity).toFixed(1)} points`);
  }
  
  if (changes.entityCount > 0) {
    improvements.push(`Added ${changes.entityCount} new ${changes.entityCount === 1 ? 'entity' : 'entities'}`);
  } else if (changes.entityCount < 0) {
    regressions.push(`Removed ${Math.abs(changes.entityCount)} ${Math.abs(changes.entityCount) === 1 ? 'entity' : 'entities'}`);
  }
  
  if (changes.claimCount > 0) {
    improvements.push(`Added ${changes.claimCount} new ${changes.claimCount === 1 ? 'claim' : 'claims'}`);
  } else if (changes.claimCount < 0) {
    regressions.push(`Removed ${Math.abs(changes.claimCount)} ${Math.abs(changes.claimCount) === 1 ? 'claim' : 'claims'}`);
  }
  
  if (changes.citationPotential > 2) {
    improvements.push(`Citation potential increased by ${changes.citationPotential.toFixed(1)} points`);
  } else if (changes.citationPotential < -2) {
    regressions.push(`Citation potential decreased by ${Math.abs(changes.citationPotential).toFixed(1)} points`);
  }
  
  return {
    previous,
    current,
    changes,
    improvements,
    regressions,
  };
}

// ============================================================================
// Dynamic Update Engine
// ============================================================================

/**
 * Update scores dynamically when content changes
 */
export async function updateScoresDynamically(
  newContent: string,
  previousAnalysis?: RealTimeAnalysisResult
): Promise<DynamicUpdateResult> {
  const startTime = Date.now();
  
  // Analyze new content
  const currentAnalysis = await analyzeContentRealTime(newContent);
  
  // Generate updated suggestions
  const suggestions = generateInlineSuggestions(newContent, currentAnalysis);
  
  // Compare with previous if available
  const comparison = previousAnalysis
    ? compareScores(previousAnalysis, currentAnalysis)
    : null;
  
  const updateTime = Date.now() - startTime;
  
  return {
    analysis: currentAnalysis,
    suggestions,
    comparison,
    updateTime,
  };
}

/**
 * Track content changes over time
 */
export class ContentChangeTracker {
  private history: Array<{
    content: string;
    analysis: RealTimeAnalysisResult;
    timestamp: Date;
  }> = [];
  
  private maxHistorySize = 10;
  
  /**
   * Add new content version to history
   */
  async trackChange(content: string): Promise<DynamicUpdateResult> {
    const previousAnalysis = this.history.length > 0
      ? this.history[this.history.length - 1].analysis
      : undefined;
    
    const result = await updateScoresDynamically(content, previousAnalysis);
    
    // Add to history
    this.history.push({
      content,
      analysis: result.analysis,
      timestamp: new Date(),
    });
    
    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    return result;
  }
  
  /**
   * Get change history
   */
  getHistory(): Array<{
    content: string;
    analysis: RealTimeAnalysisResult;
    timestamp: Date;
  }> {
    return [...this.history];
  }
  
  /**
   * Get latest analysis
   */
  getLatest(): RealTimeAnalysisResult | null {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1].analysis;
  }
  
  /**
   * Get score trend over time
   */
  getScoreTrend(): Array<{
    timestamp: Date;
    citationPotential: number;
    semanticDensity: number;
    entityCount: number;
    claimCount: number;
  }> {
    return this.history.map(entry => ({
      timestamp: entry.timestamp,
      citationPotential: entry.analysis.citationPotential,
      semanticDensity: entry.analysis.semanticDensity,
      entityCount: entry.analysis.entityPresence.count,
      claimCount: entry.analysis.claimStructure.totalClaims,
    }));
  }
  
  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }
  
  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size);
    
    // Trim if necessary
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}

/**
 * Highlight improvements and regressions in comparison
 */
export function formatScoreComparison(comparison: ScoreComparison): string {
  const lines: string[] = [];
  
  lines.push('Score Changes:');
  lines.push(`  Citation Potential: ${comparison.previous.citationPotential.toFixed(1)} → ${comparison.current.citationPotential.toFixed(1)} (${comparison.changes.citationPotential > 0 ? '+' : ''}${comparison.changes.citationPotential.toFixed(1)})`);
  lines.push(`  Semantic Density: ${comparison.previous.semanticDensity.toFixed(1)} → ${comparison.current.semanticDensity.toFixed(1)} (${comparison.changes.semanticDensity > 0 ? '+' : ''}${comparison.changes.semanticDensity.toFixed(1)})`);
  lines.push(`  Entity Count: ${comparison.previous.entityCount} → ${comparison.current.entityCount} (${comparison.changes.entityCount > 0 ? '+' : ''}${comparison.changes.entityCount})`);
  lines.push(`  Claim Count: ${comparison.previous.claimCount} → ${comparison.current.claimCount} (${comparison.changes.claimCount > 0 ? '+' : ''}${comparison.changes.claimCount})`);
  
  if (comparison.improvements.length > 0) {
    lines.push('');
    lines.push('Improvements:');
    comparison.improvements.forEach(improvement => {
      lines.push(`  ✓ ${improvement}`);
    });
  }
  
  if (comparison.regressions.length > 0) {
    lines.push('');
    lines.push('Regressions:');
    comparison.regressions.forEach(regression => {
      lines.push(`  ✗ ${regression}`);
    });
  }
  
  return lines.join('\n');
}
