/**
 * Export Buttons Component
 * Export audit report in multiple formats using ExportManager
 */

import { FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import type { AuditResult } from '../../../../utils/geoAuditEnhanced';
import { ExportManager } from '../../../../utils/export/ExportManager';
import { ExportFormat, type ExportError as ExportErrorType } from '../../../../utils/export/types';
import { JSONExporter } from '../../../../utils/export/exporters/JSONExporter';
import { CSVExporter } from '../../../../utils/export/exporters/CSVExporter';
import { MarkdownExporter } from '../../../../utils/export/exporters/MarkdownExporter';

interface ExportButtonsProps {
  result: AuditResult;
}

export function ExportButtons({ result }: ExportButtonsProps) {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  
  // Initialize export manager (lazy initialization)
  const [exportManager] = useState(() => {
    const manager = new ExportManager();
    manager.registerExporter(new JSONExporter());
    manager.registerExporter(new CSVExporter());
    manager.registerExporter(new MarkdownExporter());
    return manager;
  });

  /**
   * Generic export handler using ExportManager
   * Handles loading states and error notifications
   */
  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);
    
    try {
      // Dynamically load exporters for formats not yet registered
      if (format === ExportFormat.HTML) {
        const { HTMLExporter } = await import('../../../../utils/export/exporters/HTMLExporter');
        if (!exportManager.getSupportedFormats().includes(ExportFormat.HTML)) {
          exportManager.registerExporter(new HTMLExporter());
        }
      } else if (format === ExportFormat.XML) {
        const { XMLExporter } = await import('../../../../utils/export/exporters/XMLExporter');
        if (!exportManager.getSupportedFormats().includes(ExportFormat.XML)) {
          exportManager.registerExporter(new XMLExporter());
        }
      } else if (format === ExportFormat.PLAIN_TEXT) {
        const { PlainTextExporter } = await import('../../../../utils/export/exporters/PlainTextExporter');
        if (!exportManager.getSupportedFormats().includes(ExportFormat.PLAIN_TEXT)) {
          exportManager.registerExporter(new PlainTextExporter());
        }
      } else if (format === ExportFormat.YAML) {
        const { YAMLExporter } = await import('../../../../utils/export/exporters/YAMLExporter');
        if (!exportManager.getSupportedFormats().includes(ExportFormat.YAML)) {
          exportManager.registerExporter(new YAMLExporter());
        }
      } else if (format === ExportFormat.PDF) {
        const { PDFExporter } = await import('../../../../utils/export/exporters/PDFExporter');
        if (!exportManager.getSupportedFormats().includes(ExportFormat.PDF)) {
          exportManager.registerExporter(new PDFExporter());
        }
      }
      
      // Export using ExportManager
      const exportResult = await exportManager.exportToFormat(result, format);
      
      if (!exportResult.success) {
        throw exportResult.error || new Error('Export failed');
      }
      
      // Show success toast
      toast.success(`${format.toUpperCase()} report downloaded`);
      
    } catch (error) {
      console.error(`Failed to export ${format}:`, error);
      
      // Extract user-friendly error message
      let errorMessage = 'Failed to export report';
      if (error && typeof error === 'object' && 'userMessage' in error) {
        errorMessage = (error as ExportErrorType).userMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setExportingFormat(null);
    }
  };
  
  // Individual export handlers
  const exportJSON = () => handleExport(ExportFormat.JSON);
  const exportCSV = () => handleExport(ExportFormat.CSV);
  const exportMarkdown = () => handleExport(ExportFormat.MARKDOWN);
  const exportHTML = () => handleExport(ExportFormat.HTML);
  const exportXML = () => handleExport(ExportFormat.XML);
  const exportPlainText = () => handleExport(ExportFormat.PLAIN_TEXT);
  const exportYAML = () => handleExport(ExportFormat.YAML);
  const exportPDF = () => handleExport(ExportFormat.PDF);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={exportPDF}
        disabled={exportingFormat === ExportFormat.PDF}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as PDF"
      >
        {exportingFormat === ExportFormat.PDF ? (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-blue-400" />
        )}
        PDF
      </button>
      <button
        onClick={exportHTML}
        disabled={exportingFormat === ExportFormat.HTML}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as HTML"
      >
        {exportingFormat === ExportFormat.HTML ? (
          <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-orange-400" />
        )}
        HTML
      </button>
      <button
        onClick={exportMarkdown}
        disabled={exportingFormat === ExportFormat.MARKDOWN}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as Markdown"
      >
        {exportingFormat === ExportFormat.MARKDOWN ? (
          <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-green-400" />
        )}
        MD
      </button>
      <button
        onClick={exportXML}
        disabled={exportingFormat === ExportFormat.XML}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as XML"
      >
        {exportingFormat === ExportFormat.XML ? (
          <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-red-400" />
        )}
        XML
      </button>
      <button
        onClick={exportPlainText}
        disabled={exportingFormat === ExportFormat.PLAIN_TEXT}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as Plain Text"
      >
        {exportingFormat === ExportFormat.PLAIN_TEXT ? (
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
        )}
        TXT
      </button>
      <button
        onClick={exportYAML}
        disabled={exportingFormat === ExportFormat.YAML}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as YAML"
      >
        {exportingFormat === ExportFormat.YAML ? (
          <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-yellow-400" />
        )}
        YAML
      </button>
      <button
        onClick={exportCSV}
        disabled={exportingFormat === ExportFormat.CSV}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as CSV"
      >
        {exportingFormat === ExportFormat.CSV ? (
          <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
        )}
        CSV
      </button>
      <button
        onClick={exportJSON}
        disabled={exportingFormat === ExportFormat.JSON}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export as JSON"
      >
        {exportingFormat === ExportFormat.JSON ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileJson className="w-3.5 h-3.5" />
        )}
        JSON
      </button>
    </div>
  );
}
