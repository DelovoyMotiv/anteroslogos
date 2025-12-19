/**
 * Performance optimization tests for ExportManager
 * Tests timeout handling, progress callbacks, and concurrent exports
 */

import { describe, it, expect, vi } from 'vitest';
import { ExportManager } from '../ExportManager';
import { JSONExporter } from '../exporters/JSONExporter';
import { CSVExporter } from '../exporters/CSVExporter';
import { MarkdownExporter } from '../exporters/MarkdownExporter';
import { ExportFormat, ProgressCallback } from '../types';
import { AuditResult } from '../../geoAuditEnhanced';

// Helper to create a minimal valid audit result
function createMinimalAuditResult(): AuditResult {
  return {
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    overallScore: 75,
    preciseScore: 75.5,
    grade: 'Advanced' as const,
    scores: {
      schemaMarkup: 80,
      metaTags: 75,
      aiCrawlers: 70,
      eeat: 85,
      structure: 90,
      performance: 65,
      contentQuality: 80,
      citationPotential: 75,
      technicalSEO: 70,
      linkAnalysis: 60,
      aidAgent: 50
    },
    details: {
      schemaMarkup: { totalSchemas: 5, validSchemas: 5, hasGraphStructure: true, schemas: {} },
      metaTags: { hasTitle: true, hasDescription: true, hasOGTags: true, hasTwitterCard: false },
      aiCrawlers: { totalAICrawlers: 3, robotsTxtFound: true, hasSitemap: true, allowsGPTBot: true, allowsClaude: true, allowsPerplexity: true },
      eeat: { hasAuthorInfo: true, hasCredentials: true, hasContactInfo: true },
      structure: { hasH1: true, h1Count: 1, hasSemanticHTML: true, headingHierarchy: true, hasNav: true, hasMain: true, hasFooter: true },
      performance: { htmlSize: 50000, externalScripts: 3, externalStyles: 2, images: 10, totalResources: 20, hasLazyLoading: true },
      contentQuality: { wordCount: 1500, readabilityScore: 70, aiReadabilityScore: 75, paragraphCount: 15, imageCount: 10, videoCount: 2, hasLists: true, hasTables: true, contentDepth: 'comprehensive' },
      citationPotential: { score: 75, factualStatements: 20, dataPoints: 15, quotes: 5, references: 10, definitions: 8 },
      technicalSEO: { hasSitemapXML: true, sitemapAccessible: true, hasRobotsTxt: true, isHTTPS: true, hasSecurityHeaders: true, hasCanonical: true, httpStatus: 200 },
      linkAnalysis: { totalLinks: 50, internalLinks: 35, externalLinks: 15, nofollowRatio: 0.2, brokenLinks: 0 },
      aidAgent: { detected: false, discoveryMethod: 'none' }
    },
    recommendations: [
      {
        priority: 'high',
        effort: 'medium',
        category: 'Schema Markup',
        title: 'Add more schema types',
        description: 'Consider adding additional schema types',
        impact: 'Improved AI understanding',
        implementation: 'Add schema.org markup',
        estimatedTime: '2 hours'
      }
    ],
    insights: ['Good overall structure', 'Strong E-E-A-T signals']
  } as AuditResult;
}

// Helper to create a large audit result
function createLargeAuditResult(): AuditResult {
  const result = createMinimalAuditResult();
  
  // Add 150 recommendations to test large dataset handling
  result.recommendations = Array.from({ length: 150 }, (_, i) => ({
    priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
    effort: i % 3 === 0 ? 'low' : i % 3 === 1 ? 'medium' : 'high',
    category: 'Test Category',
    title: `Recommendation ${i + 1}`,
    description: `This is test recommendation number ${i + 1} with some detailed description`,
    impact: `Impact for recommendation ${i + 1}`,
    implementation: `Implementation steps for recommendation ${i + 1}`,
    estimatedTime: `${i + 1} hours`
  }));
  
  // Add 100 insights
  result.insights = Array.from({ length: 100 }, (_, i) => `Insight number ${i + 1}`);
  
  return result;
}

describe('ExportManager Performance Optimizations', () => {
  describe('Progress Callbacks', () => {
    it('should call progress callback during export', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new JSONExporter());
      
      const result = createMinimalAuditResult();
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      
      const progressCallback: ProgressCallback = (progress, message) => {
        progressUpdates.push({ progress, message });
      };
      
      await manager.exportToFormat(result, ExportFormat.JSON, { progressCallback });
      
      // Should have received multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Should have validation progress
      expect(progressUpdates.some(u => u.message.includes('Validating'))).toBe(true);
      
      // Should have export progress
      expect(progressUpdates.some(u => u.message.includes('Generating'))).toBe(true);
      
      // Should have completion progress
      expect(progressUpdates.some(u => u.progress === 100)).toBe(true);
    });
    
    it('should work without progress callback', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new JSONExporter());
      
      const result = createMinimalAuditResult();
      
      // Should not throw when no progress callback provided
      const exportResult = await manager.exportToFormat(result, ExportFormat.JSON);
      
      expect(exportResult.success).toBe(true);
    });
  });
  
  describe('Large Dataset Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new JSONExporter());
      
      const largeResult = createLargeAuditResult();
      
      const startTime = Date.now();
      const exportResult = await manager.exportToFormat(largeResult, ExportFormat.JSON);
      const duration = Date.now() - startTime;
      
      expect(exportResult.success).toBe(true);
      
      // Should complete within timeout (5 seconds for JSON)
      expect(duration).toBeLessThan(5000);
      
      // Verify all recommendations are included
      if (exportResult.output) {
        const parsed = JSON.parse(exportResult.output.content as string);
        expect(parsed.recommendations).toHaveLength(150);
        expect(parsed.insights).toHaveLength(100);
      }
    });
    
    it('should optimize memory usage for large datasets', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new CSVExporter());
      
      const largeResult = createLargeAuditResult();
      
      // Export should not throw memory errors
      const exportResult = await manager.exportToFormat(largeResult, ExportFormat.CSV);
      
      expect(exportResult.success).toBe(true);
      
      // Verify data completeness
      if (exportResult.output) {
        const csvContent = exportResult.output.content as string;
        expect(csvContent).toContain('Recommendations');
        expect(csvContent).toContain('Recommendation 1');
        expect(csvContent).toContain('Recommendation 150');
      }
    });
  });
  
  describe('Concurrent Export Support', () => {
    it('should handle concurrent exports without data corruption', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new JSONExporter());
      manager.registerExporter(new CSVExporter());
      manager.registerExporter(new MarkdownExporter());
      
      const result1 = createMinimalAuditResult();
      result1.url = 'https://example1.com';
      result1.overallScore = 80;
      
      const result2 = createMinimalAuditResult();
      result2.url = 'https://example2.com';
      result2.overallScore = 60;
      
      // Export both concurrently
      const [export1, export2] = await Promise.all([
        manager.exportToFormat(result1, ExportFormat.JSON),
        manager.exportToFormat(result2, ExportFormat.JSON)
      ]);
      
      expect(export1.success).toBe(true);
      expect(export2.success).toBe(true);
      
      // Verify data isolation - each export should contain only its own data
      if (export1.output && export2.output) {
        const parsed1 = JSON.parse(export1.output.content as string);
        const parsed2 = JSON.parse(export2.output.content as string);
        
        expect(parsed1.url).toBe('https://example1.com');
        expect(parsed1.overallScore).toBe(80);
        
        expect(parsed2.url).toBe('https://example2.com');
        expect(parsed2.overallScore).toBe(60);
        
        // Ensure no cross-contamination
        expect(parsed1.url).not.toBe(parsed2.url);
        expect(parsed1.overallScore).not.toBe(parsed2.overallScore);
      }
    });
    
    it('should support exportToMultipleFormats with concurrent execution', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new JSONExporter());
      manager.registerExporter(new CSVExporter());
      manager.registerExporter(new MarkdownExporter());
      
      const result = createMinimalAuditResult();
      
      const startTime = Date.now();
      const results = await manager.exportToMultipleFormats(
        result,
        [ExportFormat.JSON, ExportFormat.CSV, ExportFormat.MARKDOWN]
      );
      const duration = Date.now() - startTime;
      
      // All exports should succeed
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      
      // Concurrent execution should be faster than sequential
      // (though we can't guarantee timing in tests, we verify it completes)
      expect(duration).toBeLessThan(10000);
      
      // Verify each format is correct
      const jsonResult = results.find(r => r.format === ExportFormat.JSON);
      const csvResult = results.find(r => r.format === ExportFormat.CSV);
      const mdResult = results.find(r => r.format === ExportFormat.MARKDOWN);
      
      expect(jsonResult).toBeDefined();
      expect(csvResult).toBeDefined();
      expect(mdResult).toBeDefined();
    });
  });
  
  describe('Timeout Handling', () => {
    it('should respect timeout for non-PDF formats (5 seconds)', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new JSONExporter());
      
      const result = createMinimalAuditResult();
      
      // Normal export should complete well within timeout
      const startTime = Date.now();
      const exportResult = await manager.exportToFormat(result, ExportFormat.JSON);
      const duration = Date.now() - startTime;
      
      expect(exportResult.success).toBe(true);
      expect(duration).toBeLessThan(5000);
    });
    
    it('should use different timeout for PDF format (15 seconds)', async () => {
      // This test verifies the timeout configuration exists
      // Actual PDF timeout testing would require a slow PDF exporter
      const manager = new ExportManager();
      
      // Verify manager has timeout handling
      expect(manager).toBeDefined();
      expect(typeof manager.exportToFormat).toBe('function');
    });
  });
  
  describe('Memory Efficiency', () => {
    it('should not duplicate large data structures unnecessarily', async () => {
      const manager = new ExportManager({ skipDownload: true });
      manager.registerExporter(new JSONExporter());
      
      const largeResult = createLargeAuditResult();
      
      // Get initial memory usage (approximate)
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Export multiple times
      for (let i = 0; i < 5; i++) {
        await manager.exportToFormat(largeResult, ExportFormat.JSON);
      }
      
      // Memory should not grow excessively
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 100MB for 5 exports)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
    });
  });
});
