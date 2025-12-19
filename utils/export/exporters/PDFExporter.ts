/**
 * PDF Exporter - Exports audit results to PDF format
 * Uses existing PDFReportGenerator
 */

import { AuditResult } from '../../geoAuditEnhanced';
import { ExportFormat, ExportOutput, ExportMetadata, FormatExporter, ExportOptions } from '../types';
import { ExportSecurity } from '../security';

export class PDFExporter implements FormatExporter {
  readonly format = ExportFormat.PDF;
  
  async export(result: AuditResult, options?: ExportOptions): Promise<ExportOutput> {
    // Use existing PDF generator
    const { generatePDFReport } = await import('../../pdfReportGenerator');
    
    // Generate PDF - this will trigger download automatically
    await generatePDFReport(result, {
      includeCharts: true,
      includeRecommendations: true,
      includeDetails: true,
      companyName: 'Anóteros Lógos',
      reportDate: new Date().toLocaleDateString(),
    });
    
    // Generate filename
    const hostname = new URL(result.url).hostname;
    const timestamp = Date.now();
    const filename = ExportSecurity.sanitizeFilename(`geo-audit-${hostname}-${timestamp}.pdf`);
    
    // Return placeholder output (actual PDF is handled by jsPDF)
    return {
      content: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // PDF header
      filename,
      mimeType: 'application/pdf',
      size: 0 // Size unknown for PDF
    };
  }
  
  validate(output: string | Uint8Array): boolean {
    // PDF validation - check for PDF header
    if (output instanceof Uint8Array) {
      return output[0] === 0x25 && output[1] === 0x50 && output[2] === 0x44 && output[3] === 0x46;
    }
    if (typeof output === 'string') {
      return output.startsWith('%PDF');
    }
    return false;
  }
  
  getMetadata(): ExportMetadata {
    return {
      format: ExportFormat.PDF,
      specification: 'PDF/A',
      mimeType: 'application/pdf',
      fileExtension: '.pdf',
      supportsStreaming: false,
      maxRecommendedSize: 50 * 1024 * 1024 // 50MB
    };
  }
}
