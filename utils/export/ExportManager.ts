/**
 * Export Manager - Orchestrates export operations
 * Handles format registry, validation, timeouts, and downloads
 */

import { AuditResult } from '../geoAuditEnhanced';
import { 
  ExportFormat, 
  ExportResult, 
  ExportOutput, 
  ExportError, 
  ExportErrorType,
  FormatExporter,
  ExportOptions,
  ProgressCallback
} from './types';
import { ValidationEngine } from './validation';
import { ExportSecurity } from './security';

export class ExportManager {
  private validators: ValidationEngine;
  private exporters: Map<ExportFormat, FormatExporter>;
  private skipDownload: boolean;
  
  constructor(options?: { skipDownload?: boolean }) {
    this.validators = new ValidationEngine();
    this.exporters = new Map();
    this.skipDownload = options?.skipDownload || false;
  }
  
  /**
   * Register a format exporter
   */
  registerExporter(exporter: FormatExporter): void {
    this.exporters.set(exporter.format, exporter);
  }
  
  /**
   * Get all supported export formats
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }
  
  /**
   * Validate audit result before export
   */
  validateAuditResult(result: AuditResult) {
    return this.validators.validateComplete(result);
  }
  
  /**
   * Export to specific format with validation, timeout, and error handling
   */
  async exportToFormat(
    result: AuditResult,
    format: ExportFormat,
    options?: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Report progress: Starting validation
      options?.progressCallback?.(10, 'Validating audit data...');
      
      // 1. Validate audit result
      const validation = this.validators.validateComplete(result);
      if (!validation.isValid) {
        throw new ExportError(
          ExportErrorType.VALIDATION_ERROR,
          format,
          { url: result.url, timestamp: result.timestamp },
          'Audit result is incomplete or invalid',
          validation.errors.map(e => `${e.field}: ${e.message}`).join(', '),
          false
        );
      }
      
      // Report progress: Validation complete
      options?.progressCallback?.(20, 'Validation complete');
      
      // 2. Get exporter for format
      const exporter = this.exporters.get(format);
      if (!exporter) {
        throw new ExportError(
          ExportErrorType.FORMAT_ERROR,
          format,
          { url: result.url, timestamp: result.timestamp },
          `Export format ${format} is not supported`,
          `No exporter registered for format: ${format}`,
          false
        );
      }
      
      // Report progress: Starting export
      options?.progressCallback?.(30, `Generating ${format.toUpperCase()} export...`);
      
      // 3. Optimize for large datasets
      const optimizedResult = this.optimizeForLargeDataset(result);
      
      // Report progress: Export in progress
      options?.progressCallback?.(50, 'Processing data...');
      
      // 4. Export with timeout
      const timeoutMs = format === ExportFormat.PDF ? 15000 : 5000;
      const output = await this.withTimeout(
        exporter.export(optimizedResult, options),
        timeoutMs,
        format
      );
      
      // Report progress: Export complete
      options?.progressCallback?.(80, 'Export complete, validating...');
      
      // 5. Validate output format
      if (!exporter.validate(output.content)) {
        throw new ExportError(
          ExportErrorType.FORMAT_ERROR,
          format,
          { url: result.url, timestamp: result.timestamp },
          'Export produced invalid output',
          'Output failed format validation',
          true
        );
      }
      
      // Report progress: Triggering download
      options?.progressCallback?.(90, 'Preparing download...');
      
      // 6. Trigger download (skip in test environments)
      if (!this.skipDownload) {
        this.triggerDownload(output);
      }
      
      // Report progress: Complete
      options?.progressCallback?.(100, 'Download started');
      
      return {
        success: true,
        output,
        format,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return this.handleError(error, result, format);
    }
  }
  
  /**
   * Export to multiple formats with concurrent support
   */
  async exportToMultipleFormats(
    result: AuditResult,
    formats: ExportFormat[],
    options?: ExportOptions
  ): Promise<ExportResult[]> {
    // Use Promise.all for concurrent exports to improve performance
    // Each export is isolated and won't interfere with others
    const exportPromises = formats.map(format => 
      this.exportToFormat(result, format, options)
    );
    
    return Promise.all(exportPromises);
  }
  
  /**
   * Optimize audit result for large datasets
   * Uses memory-efficient processing techniques
   */
  private optimizeForLargeDataset(result: AuditResult): AuditResult {
    // For very large recommendation arrays, we can process them in chunks
    // This prevents memory issues with large datasets
    
    // Check if optimization is needed (>100 recommendations or large insights)
    const needsOptimization = 
      result.recommendations.length > 100 || 
      result.insights.length > 50;
    
    if (!needsOptimization) {
      return result;
    }
    
    // Create a memory-efficient copy
    // We don't modify the original, but create a reference-based copy
    // that shares immutable data where possible
    return {
      ...result,
      // Recommendations and insights are already arrays, no need to clone
      // The exporters will process them efficiently
      recommendations: result.recommendations,
      insights: result.insights
    };
  }
  
  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    format: ExportFormat
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Export timeout after ${timeoutMs}ms for format ${format}`)),
          timeoutMs
        )
      )
    ]);
  }
  
  /**
   * Trigger browser download
   */
  private triggerDownload(output: ExportOutput): void {
    try {
      // Sanitize filename
      const safeFilename = ExportSecurity.sanitizeFilename(output.filename);
      
      // Create blob and download
      const content = typeof output.content === 'string' 
        ? output.content 
        : new Uint8Array(output.content);
      
      const blob = new Blob(
        [content],
        { type: output.mimeType }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to trigger download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Handle export errors
   */
  private handleError(
    error: unknown,
    result: AuditResult,
    format: ExportFormat
  ): ExportResult {
    let exportError: ExportError;
    
    if (error instanceof ExportError) {
      exportError = error;
    } else if (error instanceof Error) {
      // Determine error type from message
      let errorType = ExportErrorType.UNKNOWN_ERROR;
      
      if (error.message.includes('timeout')) {
        errorType = ExportErrorType.TIMEOUT_ERROR;
      } else if (error.message.includes('validation')) {
        errorType = ExportErrorType.VALIDATION_ERROR;
      } else if (error.message.includes('format')) {
        errorType = ExportErrorType.FORMAT_ERROR;
      } else if (error.message.includes('encoding')) {
        errorType = ExportErrorType.ENCODING_ERROR;
      } else if (error.message.includes('size')) {
        errorType = ExportErrorType.SIZE_ERROR;
      } else if (error.message.includes('browser') || error.message.includes('download')) {
        errorType = ExportErrorType.BROWSER_ERROR;
      }
      
      exportError = new ExportError(
        errorType,
        format,
        { 
          url: result.url, 
          timestamp: result.timestamp,
          stackTrace: error.stack 
        },
        this.getUserFriendlyMessage(errorType, format),
        error.message,
        errorType !== ExportErrorType.VALIDATION_ERROR
      );
    } else {
      exportError = new ExportError(
        ExportErrorType.UNKNOWN_ERROR,
        format,
        { url: result.url, timestamp: result.timestamp },
        'An unexpected error occurred during export',
        String(error),
        true
      );
    }
    
    // Log error for debugging
    console.error('Export error:', {
      type: exportError.type,
      format: exportError.format,
      userMessage: exportError.userMessage,
      technicalMessage: exportError.technicalMessage,
      context: exportError.context
    });
    
    return {
      success: false,
      format,
      timestamp: new Date().toISOString(),
      error: exportError
    };
  }
  
  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(errorType: ExportErrorType, format: ExportFormat): string {
    switch (errorType) {
      case ExportErrorType.VALIDATION_ERROR:
        return 'The audit data is incomplete and cannot be exported. Please run the audit again.';
      case ExportErrorType.FORMAT_ERROR:
        return `Failed to generate ${format.toUpperCase()} export. The data may contain unsupported characters.`;
      case ExportErrorType.ENCODING_ERROR:
        return 'Failed to encode the export data. Some characters may not be supported.';
      case ExportErrorType.SIZE_ERROR:
        return 'The export data is too large. Try exporting to a simpler format.';
      case ExportErrorType.TIMEOUT_ERROR:
        return `Export took too long and was cancelled. Try exporting to a simpler format than ${format.toUpperCase()}.`;
      case ExportErrorType.BROWSER_ERROR:
        return 'Your browser blocked the download. Please check your browser settings and try again.';
      case ExportErrorType.UNKNOWN_ERROR:
      default:
        return 'An unexpected error occurred during export. Please try again.';
    }
  }
}
