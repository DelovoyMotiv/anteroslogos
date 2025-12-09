/**
 * Export Buttons Component
 * Export audit report in multiple formats: JSON, CSV, PDF
 */

import { FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditResult } from '../../../../utils/geoAuditEnhanced';

interface ExportButtonsProps {
  result: AuditResult;
}

export function ExportButtons({ result }: ExportButtonsProps) {
  const hostname = new URL(result.url).hostname;
  const timestamp = Date.now();

  const exportJSON = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const fileName = `geo-audit-${hostname}-${timestamp}.json`;
    downloadFile(dataUri, fileName);
    toast.success('JSON report downloaded');
  };

  const exportCSV = () => {
    // Create CSV with scores and key metrics
    const headers = ['Category', 'Score', 'Issues', 'Strengths'];
    const rows = [
      ['Overall', result.preciseScore.toFixed(3), '', result.grade],
      ['Schema Markup', result.scores.schemaMarkup.toFixed(1), result.details.schemaMarkup.issues.length.toString(), result.details.schemaMarkup.strengths.length.toString()],
      ['Meta Tags', result.scores.metaTags.toFixed(1), result.details.metaTags.issues.length.toString(), result.details.metaTags.strengths.length.toString()],
      ['AI Crawlers', result.scores.aiCrawlers.toFixed(1), result.details.aiCrawlers.issues.length.toString(), result.details.aiCrawlers.strengths.length.toString()],
      ['E-E-A-T', result.scores.eeat.toFixed(1), result.details.eeat.issues.length.toString(), result.details.eeat.strengths.length.toString()],
      ['Structure', result.scores.structure.toFixed(1), result.details.structure.issues.length.toString(), result.details.structure.strengths.length.toString()],
      ['Performance', result.scores.performance.toFixed(1), result.details.performance.issues.length.toString(), result.details.performance.strengths.length.toString()],
      ['Content Quality', result.scores.contentQuality.toFixed(1), result.details.contentQuality.issues.length.toString(), result.details.contentQuality.strengths.length.toString()],
      ['Citation Potential', result.scores.citationPotential.toFixed(1), result.details.citationPotential.issues.length.toString(), result.details.citationPotential.strengths.length.toString()],
      ['Technical SEO', result.scores.technicalSEO.toFixed(1), result.details.technicalSEO.issues.length.toString(), result.details.technicalSEO.strengths.length.toString()],
      ['Link Analysis', result.scores.linkAnalysis.toFixed(1), result.details.linkAnalysis.issues.length.toString(), result.details.linkAnalysis.strengths.length.toString()],
      ['AID Agent', result.scores.aidAgent.toFixed(1), result.details.aidAgent.errors.length.toString(), result.details.aidAgent.detected ? '1' : '0'],
    ];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const fileName = `geo-audit-${hostname}-${timestamp}.csv`;
    downloadFile(dataUri, fileName);
    toast.success('CSV report downloaded');
  };

  const exportMarkdown = () => {
    // Create comprehensive Markdown report
    const md = `# GEO Audit Report

**URL:** ${result.url}  
**Date:** ${new Date(result.timestamp).toLocaleString()}  
**Overall Score:** ${result.preciseScore.toFixed(3)} / 100  
**Grade:** ${result.grade}

## Score Breakdown

${result.scoreBreakdown ? `
- **Core GEO:** ${result.scoreBreakdown.core.toFixed(1)}
- **Technical:** ${result.scoreBreakdown.technical.toFixed(1)}
- **Content:** ${result.scoreBreakdown.content.toFixed(1)}
- **Weighted:** ${result.scoreBreakdown.weighted.toFixed(3)}
` : ''}

## Category Scores

| Category | Score | Issues | Strengths |
|----------|-------|--------|-----------|
| Schema Markup | ${result.scores.schemaMarkup.toFixed(1)} | ${result.details.schemaMarkup.issues.length} | ${result.details.schemaMarkup.strengths.length} |
| Meta Tags | ${result.scores.metaTags.toFixed(1)} | ${result.details.metaTags.issues.length} | ${result.details.metaTags.strengths.length} |
| AI Crawlers | ${result.scores.aiCrawlers.toFixed(1)} | ${result.details.aiCrawlers.issues.length} | ${result.details.aiCrawlers.strengths.length} |
| E-E-A-T | ${result.scores.eeat.toFixed(1)} | ${result.details.eeat.issues.length} | ${result.details.eeat.strengths.length} |
| Structure | ${result.scores.structure.toFixed(1)} | ${result.details.structure.issues.length} | ${result.details.structure.strengths.length} |
| Performance | ${result.scores.performance.toFixed(1)} | ${result.details.performance.issues.length} | ${result.details.performance.strengths.length} |
| Content Quality | ${result.scores.contentQuality.toFixed(1)} | ${result.details.contentQuality.issues.length} | ${result.details.contentQuality.strengths.length} |
| Citation Potential | ${result.scores.citationPotential.toFixed(1)} | ${result.details.citationPotential.issues.length} | ${result.details.citationPotential.strengths.length} |
| Technical SEO | ${result.scores.technicalSEO.toFixed(1)} | ${result.details.technicalSEO.issues.length} | ${result.details.technicalSEO.strengths.length} |
| Link Analysis | ${result.scores.linkAnalysis.toFixed(1)} | ${result.details.linkAnalysis.issues.length} | ${result.details.linkAnalysis.strengths.length} |
| AID Agent | ${result.scores.aidAgent.toFixed(1)} | ${result.details.aidAgent.errors.length} | ${result.details.aidAgent.detected ? 1 : 0} |

## Top Recommendations

${result.recommendations.slice(0, 10).map((rec, idx) => `
### ${idx + 1}. ${rec.title}

**Priority:** ${rec.priority.toUpperCase()}  
**Category:** ${rec.category}  
**Effort:** ${rec.effort}

${rec.description}

**Impact:** ${rec.impact}

**Implementation:** ${rec.implementation}

${rec.estimatedTime ? `**Estimated Time:** ${rec.estimatedTime}` : ''}

${rec.codeExample ? `\`\`\`\n${rec.codeExample}\n\`\`\`` : ''}
`).join('\n')}

## Insights

${result.insights.map(insight => `- ${insight}`).join('\n')}

---

*Generated by Anóteros Lógos GEO Audit Engine*
`;

    const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    const fileName = `geo-audit-${hostname}-${timestamp}.md`;
    downloadFile(dataUri, fileName);
    toast.success('Markdown report downloaded');
  };

  const downloadFile = (dataUri: string, fileName: string) => {
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  };

  const exportHTML = async () => {
    try {
      const { exportToHTML } = await import('../../../../utils/exportFormats');
      exportToHTML(result);
      toast.success('HTML report downloaded');
    } catch (error) {
      console.error('Failed to export HTML:', error);
      toast.error('Failed to export HTML report');
    }
  };

  const exportXML = async () => {
    try {
      const { exportToXML } = await import('../../../../utils/exportFormats');
      exportToXML(result);
      toast.success('XML report downloaded');
    } catch (error) {
      console.error('Failed to export XML:', error);
      toast.error('Failed to export XML report');
    }
  };

  const exportPlainText = async () => {
    try {
      const { exportToPlainText } = await import('../../../../utils/exportFormats');
      exportToPlainText(result);
      toast.success('Plain text report downloaded');
    } catch (error) {
      console.error('Failed to export Plain Text:', error);
      toast.error('Failed to export plain text report');
    }
  };

  const exportYAML = async () => {
    try {
      const { exportToYAML } = await import('../../../../utils/exportFormats');
      exportToYAML(result);
      toast.success('YAML report downloaded');
    } catch (error) {
      console.error('Failed to export YAML:', error);
      toast.error('Failed to export YAML report');
    }
  };

  const exportPDF = async () => {
    try {
      const { generatePDFReport } = await import('../../../../utils/pdfReportGenerator');
      await generatePDFReport(result, {
        includeCharts: true,
        includeRecommendations: true,
        includeDetails: true,
        companyName: 'Anóteros Lógos',
        reportDate: new Date().toLocaleDateString(),
      });
      toast.success('PDF report generated');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={exportPDF}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as PDF"
      >
        <FileText className="w-3.5 h-3.5 text-blue-400" />
        PDF
      </button>
      <button
        onClick={exportHTML}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as HTML"
      >
        <FileText className="w-3.5 h-3.5 text-orange-400" />
        HTML
      </button>
      <button
        onClick={exportMarkdown}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as Markdown"
      >
        <FileText className="w-3.5 h-3.5 text-green-400" />
        MD
      </button>
      <button
        onClick={exportXML}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as XML"
      >
        <FileText className="w-3.5 h-3.5 text-red-400" />
        XML
      </button>
      <button
        onClick={exportPlainText}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as Plain Text"
      >
        <FileText className="w-3.5 h-3.5 text-cyan-400" />
        TXT
      </button>
      <button
        onClick={exportYAML}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as YAML"
      >
        <FileText className="w-3.5 h-3.5 text-yellow-400" />
        YAML
      </button>
      <button
        onClick={exportCSV}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as CSV"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
        CSV
      </button>
      <button
        onClick={exportJSON}
        className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-300 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2"
        title="Export as JSON"
      >
        <FileJson className="w-3.5 h-3.5" />
        JSON
      </button>
    </div>
  );
}
