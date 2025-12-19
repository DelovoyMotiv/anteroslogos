/**
 * Type definitions for the GEO Audit Export System
 */

import { AuditResult } from '../geoAuditEnhanced';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  MARKDOWN = 'markdown',
  HTML = 'html',
  XML = 'xml',
  YAML = 'yaml',
  PLAIN_TEXT = 'text',
  PDF = 'pdf'
}

export enum ExportErrorType {
  VALIDATION_ERROR = 'validation_error',
  FORMAT_ERROR = 'format_error',
  ENCODING_ERROR = 'encoding_error',
  SIZE_ERROR = 'size_error',
  TIMEOUT_ERROR = 'timeout_error',
  BROWSER_ERROR = 'browser_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface ExportOutput {
  content: string | Uint8Array;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ExportMetadata {
  format: ExportFormat;
  specification: string; // e.g., "RFC 8259", "RFC 4180"
  mimeType: string;
  fileExtension: string;
  supportsStreaming: boolean;
  maxRecommendedSize: number; // bytes
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completeness: number; // 0-100 percentage
}

export interface ExportResult {
  success: boolean;
  output?: ExportOutput;
  format: ExportFormat;
  timestamp: string;
  error?: ExportError;
}

export class ExportError extends Error {
  constructor(
    public type: ExportErrorType,
    public format: ExportFormat,
    public context: {
      url: string;
      timestamp: string;
      stackTrace?: string;
    },
    public userMessage: string,
    public technicalMessage: string,
    public recoverable: boolean
  ) {
    super(userMessage);
    this.name = 'ExportError';
  }
}

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export interface ExportOptions {
  progressCallback?: ProgressCallback;
  useStreaming?: boolean;
  chunkSize?: number;
}

export interface FormatExporter {
  readonly format: ExportFormat;
  export(result: AuditResult, options?: ExportOptions): Promise<ExportOutput>;
  validate(output: string | Uint8Array): boolean;
  getMetadata(): ExportMetadata;
}
