/**
 * Unit tests for Pre-Publication Checklist
 */

import { describe, it, expect } from 'vitest';
import {
  generatePrePublicationChecklist,
  getCriticalIssues,
  getActionableItems,
  formatChecklistAsMarkdown,
} from '../prePublicationChecklist';
import { analyzeContentRealTime } from '../realTimeContentAnalyzer';

describe('Pre-Publication Checklist', () => {
  describe('generatePrePublicationChecklist', () => {
    it('should generate checklist for content', async () => {
      const content = 'AI is transforming industries. According to research, it improves efficiency.';
      const analysis = await analyzeContentRealTime(content);
      
      const checklist = generatePrePublicationChecklist(content, analysis);
      
      expect(checklist.overallStatus).toBeDefined();
      expect(checklist.score).toBeGreaterThanOrEqual(0);
      expect(checklist.score).toBeLessThanOrEqual(100);
      expect(checklist.items).toBeInstanceOf(Array);
      expect(checklist.summary).toHaveProperty('passed');
      expect(checklist.summary).toHaveProperty('warnings');
      expect(checklist.summary).toHaveProperty('failed');
      expect(checklist.recommendations).toBeInstanceOf(Array);
    });
    
    it('should rate high-quality content as ready', async () => {
      const content = `
        <script type="application/ld+json">
        {
          "@type": "Article",
          "headline": "AI in Healthcare",
          "author": {"@type": "Person", "name": "Dr. Jane Smith"}
        }
        </script>
        
        # AI in Healthcare
        
        By Dr. Jane Smith, PhD
        Published: January 2024
        
        According to Stanford University research, AI systems achieve 98% accuracy.
        Studies published in Nature demonstrate significant improvements.
        Data from MIT shows a 40% increase in diagnostic speed.
        
        ## Key Benefits
        - Improved accuracy
        - Faster diagnosis
        - Reduced costs
      `;
      
      const analysis = await analyzeContentRealTime(content);
      const checklist = generatePrePublicationChecklist(content, analysis);
      
      expect(checklist.score).toBeGreaterThan(70);
      expect(checklist.summary.failed).toBeLessThan(3);
    });
    
    it('should identify issues in low-quality content', async () => {
      const content = 'AI is good. It helps people.';
      const analysis = await analyzeContentRealTime(content);
      
      const checklist = generatePrePublicationChecklist(content, analysis);
      
      expect(checklist.overallStatus).not.toBe('ready');
      expect(checklist.summary.failed + checklist.summary.warnings).toBeGreaterThan(0);
    });
  });
  
  describe('getCriticalIssues', () => {
    it('should return critical issues', async () => {
      const content = 'AI is good.';
      const analysis = await analyzeContentRealTime(content);
      const checklist = generatePrePublicationChecklist(content, analysis);
      
      const critical = getCriticalIssues(checklist);
      
      critical.forEach(item => {
        expect(item.status).toBe('fail');
        expect(item.priority).toBe('critical');
      });
    });
  });
  
  describe('getActionableItems', () => {
    it('should return actionable items', async () => {
      const content = 'AI is good.';
      const analysis = await analyzeContentRealTime(content);
      const checklist = generatePrePublicationChecklist(content, analysis);
      
      const actionable = getActionableItems(checklist);
      
      actionable.forEach(item => {
        expect(['fail', 'warning']).toContain(item.status);
        expect(item.action).toBeDefined();
      });
    });
  });
  
  describe('formatChecklistAsMarkdown', () => {
    it('should format checklist as markdown', async () => {
      const content = 'AI is transforming industries.';
      const analysis = await analyzeContentRealTime(content);
      const checklist = generatePrePublicationChecklist(content, analysis);
      
      const markdown = formatChecklistAsMarkdown(checklist);
      
      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('# Pre-Publication Checklist');
      expect(markdown).toContain('Overall Status');
      expect(markdown).toContain('Score');
    });
  });
});
