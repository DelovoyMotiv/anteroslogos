/**
 * Unit tests for Dynamic Score Updater
 */

import { describe, it, expect } from 'vitest';
import {
  updateScoresDynamically,
  ContentChangeTracker,
  formatScoreComparison,
} from '../dynamicScoreUpdater';
import { analyzeContentRealTime } from '../realTimeContentAnalyzer';

describe('Dynamic Score Updater', () => {
  describe('updateScoresDynamically', () => {
    it('should update scores for new content', async () => {
      const content = 'AI is transforming industries. According to research, it improves efficiency.';
      
      const result = await updateScoresDynamically(content);
      
      expect(result.analysis).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.comparison).toBeNull(); // No previous analysis
      expect(result.updateTime).toBeGreaterThan(0);
    });
    
    it('should compare with previous analysis when provided', async () => {
      const previousContent = 'AI is good.';
      const newContent = 'AI is transforming industries. According to research from MIT, it improves efficiency by 40%.';
      
      const previousAnalysis = await analyzeContentRealTime(previousContent);
      const result = await updateScoresDynamically(newContent, previousAnalysis);
      
      expect(result.comparison).toBeDefined();
      expect(result.comparison?.changes).toBeDefined();
      expect(result.comparison?.improvements).toBeInstanceOf(Array);
      expect(result.comparison?.regressions).toBeInstanceOf(Array);
    });
    
    it('should detect improvements', async () => {
      const previousContent = 'AI is useful.';
      const newContent = 'Artificial intelligence and machine learning are transforming healthcare. According to Stanford University research, AI systems achieve 98% diagnostic accuracy.';
      
      const previousAnalysis = await analyzeContentRealTime(previousContent);
      const result = await updateScoresDynamically(newContent, previousAnalysis);
      
      expect(result.comparison?.improvements.length).toBeGreaterThan(0);
      expect(result.comparison?.changes.citationPotential).toBeGreaterThan(0);
    });
  });
  
  describe('ContentChangeTracker', () => {
    it('should track content changes', async () => {
      const tracker = new ContentChangeTracker();
      
      await tracker.trackChange('AI is good.');
      await tracker.trackChange('AI is transforming industries.');
      
      const history = tracker.getHistory();
      expect(history.length).toBe(2);
    });
    
    it('should get latest analysis', async () => {
      const tracker = new ContentChangeTracker();
      
      await tracker.trackChange('AI is good.');
      const latest = tracker.getLatest();
      
      expect(latest).toBeDefined();
      expect(latest?.citationPotential).toBeGreaterThanOrEqual(0);
    });
    
    it('should get score trend', async () => {
      const tracker = new ContentChangeTracker();
      
      await tracker.trackChange('AI is good.');
      await tracker.trackChange('AI is transforming industries.');
      
      const trend = tracker.getScoreTrend();
      expect(trend.length).toBe(2);
      expect(trend[0]).toHaveProperty('citationPotential');
      expect(trend[0]).toHaveProperty('timestamp');
    });
    
    it('should limit history size', async () => {
      const tracker = new ContentChangeTracker();
      tracker.setMaxHistorySize(3);
      
      await tracker.trackChange('Version 1');
      await tracker.trackChange('Version 2');
      await tracker.trackChange('Version 3');
      await tracker.trackChange('Version 4');
      
      const history = tracker.getHistory();
      expect(history.length).toBe(3);
    });
    
    it('should clear history', async () => {
      const tracker = new ContentChangeTracker();
      
      await tracker.trackChange('AI is good.');
      tracker.clearHistory();
      
      const history = tracker.getHistory();
      expect(history.length).toBe(0);
    });
  });
  
  describe('formatScoreComparison', () => {
    it('should format comparison as string', async () => {
      const previousContent = 'AI is good.';
      const newContent = 'AI is transforming industries. According to research, it improves efficiency.';
      
      const previousAnalysis = await analyzeContentRealTime(previousContent);
      const result = await updateScoresDynamically(newContent, previousAnalysis);
      
      if (result.comparison) {
        const formatted = formatScoreComparison(result.comparison);
        expect(typeof formatted).toBe('string');
        expect(formatted).toContain('Score Changes');
      }
    });
  });
});
