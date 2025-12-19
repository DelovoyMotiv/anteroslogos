/**
 * JSON Exporter for GEO Audit Reports
 * Exports complete AuditResult data as RFC 8259 compliant JSON
 */

import { AuditResult } from '../../geoAuditEnhanced';
import { 
  ExportFormat, 
  ExportOutput, 
  ExportMetadata, 
  FormatExporter,
  ExportOptions
} from '../types';
import { ExportSecurity } from '../security';
import { getExportMetadata, formatMetadataAsJSON } from '../metadata';

export class JSONExporter implements FormatExporter {
  readonly format = ExportFormat.JSON;
  
  /**
   * Export AuditResult to JSON format
   * Includes all fields with proper structure and metadata
   */
  async export(result: AuditResult, options?: ExportOptions): Promise<ExportOutput> {
    // Report progress if callback provided
    options?.progressCallback?.(60, 'Serializing to JSON...');
    
    // Get standardized metadata (Requirements 6.1, 6.2, 6.5)
    const metadata = getExportMetadata(ExportFormat.JSON);
    
    // Create complete export object with all fields
    const exportData = {
      // Metadata (Requirements 6.1-6.5)
      metadata: formatMetadataAsJSON(metadata),
      
      // Core identification
      url: result.url,
      timestamp: result.timestamp,
      
      // Scoring
      overallScore: result.overallScore,
      preciseScore: result.preciseScore,
      grade: result.grade,
      scoreBreakdown: result.scoreBreakdown,
      
      // All 11 category scores
      scores: {
        schemaMarkup: result.scores.schemaMarkup,
        metaTags: result.scores.metaTags,
        aiCrawlers: result.scores.aiCrawlers,
        eeat: result.scores.eeat,
        structure: result.scores.structure,
        performance: result.scores.performance,
        contentQuality: result.scores.contentQuality,
        citationPotential: result.scores.citationPotential,
        technicalSEO: result.scores.technicalSEO,
        linkAnalysis: result.scores.linkAnalysis,
        aidAgent: result.scores.aidAgent
      },
      
      // All 11 category details
      details: {
        schemaMarkup: result.details.schemaMarkup,
        metaTags: result.details.metaTags,
        aiCrawlers: result.details.aiCrawlers,
        eeat: result.details.eeat,
        structure: result.details.structure,
        performance: result.details.performance,
        contentQuality: result.details.contentQuality,
        citationPotential: result.details.citationPotential,
        technicalSEO: result.details.technicalSEO,
        linkAnalysis: result.details.linkAnalysis,
        aidAgent: result.details.aidAgent
      },
      
      // Recommendations with complete metadata
      recommendations: result.recommendations.map(rec => ({
        priority: rec.priority,
        effort: rec.effort,
        category: rec.category,
        title: rec.title,
        description: rec.description,
        impact: rec.impact,
        implementation: rec.implementation,
        estimatedTime: rec.estimatedTime
      })),
      
      // Insights
      insights: result.insights || [],
      
      // Optional advanced features
      knowledgeGraph: result.knowledgeGraph,
      browserMetadata: result.browserMetadata
    };
    
    // Convert to JSON with proper formatting
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Generate safe filename
    const hostname = new URL(result.url).hostname;
    const timestamp = Date.now();
    const filename = ExportSecurity.sanitizeFilename(
      `GEO-Audit-${hostname}-${timestamp}.json`
    );
    
    return {
      content: jsonContent,
      filename,
      mimeType: 'application/json;charset=utf-8',
      size: new Blob([jsonContent]).size
    };
  }
  
  /**
   * Validate JSON output
   * Ensures the output is valid JSON that can be parsed
   */
  validate(output: string | Uint8Array): boolean {
    try {
      if (typeof output !== 'string') {
        return false;
      }
      
      // Parse to validate JSON syntax
      const parsed = JSON.parse(output);
      
      // Verify required top-level fields are present
      if (!parsed.url || !parsed.timestamp || !parsed.scores || !parsed.details) {
        return false;
      }
      
      // Verify all 11 score categories are present
      const requiredScores = [
        'schemaMarkup', 'metaTags', 'aiCrawlers', 'eeat', 'structure',
        'performance', 'contentQuality', 'citationPotential', 'technicalSEO',
        'linkAnalysis', 'aidAgent'
      ];
      
      for (const scoreKey of requiredScores) {
        if (!(scoreKey in parsed.scores)) {
          return false;
        }
      }
      
      // Verify all 11 detail categories are present
      for (const detailKey of requiredScores) {
        if (!(detailKey in parsed.details)) {
          return false;
        }
      }
      
      // Verify recommendations is an array
      if (!Array.isArray(parsed.recommendations)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get metadata about JSON export format
   */
  getMetadata(): ExportMetadata {
    return {
      format: ExportFormat.JSON,
      specification: 'RFC 8259',
      mimeType: 'application/json',
      fileExtension: '.json',
      supportsStreaming: true,
      maxRecommendedSize: 50 * 1024 * 1024 // 50 MB
    };
  }
}
