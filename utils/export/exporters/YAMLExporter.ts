/**
 * YAML Exporter - Exports audit results to YAML format
 */

import { AuditResult } from '../../geoAuditEnhanced';
import { ExportFormat, ExportOutput, ExportMetadata, FormatExporter, ExportOptions } from '../types';
import { ExportSecurity } from '../security';

export class YAMLExporter implements FormatExporter {
  readonly format = ExportFormat.YAML;
  
  async export(result: AuditResult, options?: ExportOptions): Promise<ExportOutput> {
    // Generate YAML content
    const yaml = this.generateYAML(result);
    
    // Generate filename
    const hostname = new URL(result.url).hostname;
    const timestamp = Date.now();
    const filename = ExportSecurity.sanitizeFilename(`geo-audit-${hostname}-${timestamp}.yaml`);
    
    return {
      content: yaml,
      filename,
      mimeType: 'application/x-yaml',
      size: new Blob([yaml]).size
    };
  }
  
  validate(output: string | Uint8Array): boolean {
    if (typeof output !== 'string') return false;
    // Basic YAML validation - should have key-value pairs
    return output.includes(':') && output.length > 0;
  }
  
  getMetadata(): ExportMetadata {
    return {
      format: ExportFormat.YAML,
      specification: 'YAML 1.2',
      mimeType: 'application/x-yaml',
      fileExtension: '.yaml',
      supportsStreaming: false,
      maxRecommendedSize: 5 * 1024 * 1024 // 5MB
    };
  }
  
  private generateYAML(result: AuditResult): string {
    const lines: string[] = [];
    
    lines.push('# GEO Audit Report');
    lines.push('');
    lines.push('metadata:');
    lines.push(`  url: "${this.escapeYAML(result.url)}"`);
    lines.push(`  timestamp: "${result.timestamp}"`);
    lines.push(`  grade: "${result.grade}"`);
    lines.push(`  overallScore: ${result.overallScore}`);
    lines.push(`  preciseScore: ${result.preciseScore}`);
    lines.push('');
    lines.push('scores:');
    
    Object.entries(result.scores).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value}`);
    });
    
    lines.push('');
    lines.push('recommendations:');
    
    result.recommendations.forEach((rec, idx) => {
      lines.push(`  - title: "${this.escapeYAML(rec.title)}"`);
      lines.push(`    priority: "${rec.priority}"`);
      lines.push(`    category: "${rec.category}"`);
      lines.push(`    description: "${this.escapeYAML(rec.description)}"`);
      lines.push(`    impact: "${this.escapeYAML(rec.impact)}"`);
      if (rec.effort) lines.push(`    effort: "${rec.effort}"`);
      if (rec.estimatedTime) lines.push(`    estimatedTime: "${rec.estimatedTime}"`);
    });
    
    lines.push('');
    lines.push('insights:');
    result.insights.forEach(insight => {
      lines.push(`  - "${this.escapeYAML(insight)}"`);
    });
    
    return lines.join('\n');
  }
  
  private escapeYAML(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
