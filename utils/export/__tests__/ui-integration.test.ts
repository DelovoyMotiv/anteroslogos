/**
 * UI Integration Tests
 * Tests the integration between UI components and ExportManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExportManager } from '../ExportManager';
import { ExportFormat } from '../types';
import { JSONExporter } from '../exporters/JSONExporter';
import { CSVExporter } from '../exporters/CSVExporter';
import { MarkdownExporter } from '../exporters/MarkdownExporter';
import type { AuditResult } from '../../geoAuditEnhanced';

// Helper to create minimal audit result
function createMinimalAuditResult(): AuditResult {
  return {
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    overallScore: 75,
    preciseScore: 75.123,
    grade: 'Advanced' as const,
    scores: {
      schemaMarkup: 80,
      metaTags: 70,
      aiCrawlers: 75,
      eeat: 72,
      structure: 78,
      performance: 76,
      contentQuality: 74,
      citationPotential: 73,
      technicalSEO: 77,
      linkAnalysis: 71,
      aidAgent: 0
    },
    details: {
      schemaMarkup: { 
        issues: [], 
        strengths: [], 
        score: 80,
        totalSchemas: 5,
        validSchemas: 5,
        hasGraphStructure: true,
        schemas: {
          Organization: true,
          WebSite: true,
          Article: false,
          Product: false
        }
      },
      metaTags: { issues: [], strengths: [], score: 70 },
      aiCrawlers: { issues: [], strengths: [], score: 75 },
      eeat: { issues: [], strengths: [], score: 72 },
      structure: { issues: [], strengths: [], score: 78 },
      performance: { issues: [], strengths: [], score: 76 },
      contentQuality: { issues: [], strengths: [], score: 74 },
      citationPotential: { issues: [], strengths: [], score: 73 },
      technicalSEO: { issues: [], strengths: [], score: 77 },
      linkAnalysis: { issues: [], strengths: [], score: 71 },
      aidAgent: { detected: false, errors: [], score: 0 }
    },
    recommendations: [
      {
        title: 'Add Schema Markup',
        priority: 'high',
        category: 'schemaMarkup',
        description: 'Add structured data',
        impact: 'High impact',
        implementation: 'Add JSON-LD',
        effort: 'medium',
        estimatedTime: '2 hours'
      }
    ],
    insights: ['Good overall structure', 'Needs more schema markup']
  } as AuditResult;
}

describe('UI Integration', () => {
  let exportManager: ExportManager;
  
  beforeEach(() => {
    exportManager = new ExportManager({ skipDownload: true });
    exportManager.registerExporter(new JSONExporter());
    exportManager.registerExporter(new CSVExporter());
    exportManager.registerExporter(new MarkdownExporter());
  });
  
  describe('Export Manager Initialization', () => {
    it('should initialize with registered exporters', () => {
      const formats = exportManager.getSupportedFormats();
      expect(formats).toContain(ExportFormat.JSON);
      expect(formats).toContain(ExportFormat.CSV);
      expect(formats).toContain(ExportFormat.MARKDOWN);
    });
    
    it('should allow dynamic exporter registration', async () => {
      const { HTMLExporter } = await import('../exporters/HTMLExporter');
      exportManager.registerExporter(new HTMLExporter());
      
      const formats = exportManager.getSupportedFormats();
      expect(formats).toContain(ExportFormat.HTML);
    });
  });
  
  describe('Export Handler Pattern', () => {
    it('should handle successful export', async () => {
      const result = createMinimalAuditResult();
      const exportResult = await exportManager.exportToFormat(result, ExportFormat.JSON);
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.format).toBe(ExportFormat.JSON);
      expect(exportResult.output).toBeDefined();
    });
    
    it('should handle export errors gracefully', async () => {
      const invalidResult = {} as AuditResult;
      const exportResult = await exportManager.exportToFormat(invalidResult, ExportFormat.JSON);
      
      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toBeDefined();
      expect(exportResult.error?.userMessage).toBeTruthy();
    });
    
    it('should provide user-friendly error messages', async () => {
      const invalidResult = {} as AuditResult;
      const exportResult = await exportManager.exportToFormat(invalidResult, ExportFormat.JSON);
      
      expect(exportResult.error?.userMessage).toContain('incomplete');
      expect(exportResult.error?.recoverable).toBe(false);
    });
  });
  
  describe('Loading State Management', () => {
    it('should support concurrent exports without interference', async () => {
      const result = createMinimalAuditResult();
      
      const [export1, export2, export3] = await Promise.all([
        exportManager.exportToFormat(result, ExportFormat.JSON),
        exportManager.exportToFormat(result, ExportFormat.CSV),
        exportManager.exportToFormat(result, ExportFormat.MARKDOWN)
      ]);
      
      expect(export1.success).toBe(true);
      expect(export2.success).toBe(true);
      expect(export3.success).toBe(true);
      
      expect(export1.format).toBe(ExportFormat.JSON);
      expect(export2.format).toBe(ExportFormat.CSV);
      expect(export3.format).toBe(ExportFormat.MARKDOWN);
    });
  });
  
  describe('Validation Integration', () => {
    it('should validate audit result before export', async () => {
      const result = createMinimalAuditResult();
      const validation = exportManager.validateAuditResult(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.completeness).toBeGreaterThan(90);
    });
    
    it('should provide validation errors for incomplete data', async () => {
      const incompleteResult = {
        url: 'https://example.com',
        // Missing required fields
      } as AuditResult;
      
      const validation = exportManager.validateAuditResult(incompleteResult);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.completeness).toBeLessThan(100);
    });
  });
  
  describe('Error Recovery', () => {
    it('should allow retry after failed export', async () => {
      const invalidResult = {} as AuditResult;
      
      // First attempt should fail
      const firstAttempt = await exportManager.exportToFormat(invalidResult, ExportFormat.JSON);
      expect(firstAttempt.success).toBe(false);
      
      // Retry with valid result should succeed
      const validResult = createMinimalAuditResult();
      const retryAttempt = await exportManager.exportToFormat(validResult, ExportFormat.JSON);
      expect(retryAttempt.success).toBe(true);
    });
  });
});
