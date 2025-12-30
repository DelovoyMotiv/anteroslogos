/**
 * Additional Export Formats for GEO Audit Reports
 * JSON, CSV, Markdown, HTML formats for different use cases
 */

import { AuditResult } from './geoAuditEnhanced';
import { ExportManager } from './export/ExportManager';
import { JSONExporter, CSVExporter, MarkdownExporter } from './export/exporters';
import { ExportFormat } from './export/types';

// Initialize export manager with exporters
const exportManager = new ExportManager();
exportManager.registerExporter(new JSONExporter());
exportManager.registerExporter(new CSVExporter());
exportManager.registerExporter(new MarkdownExporter());

// =============== JSON EXPORT ===============
/**
 * Export audit result to JSON format using the new ExportManager architecture
 * Includes complete data validation, error handling, and filename sanitization
 */
export async function exportToJSON(result: AuditResult): Promise<void> {
  try {
    const exportResult = await exportManager.exportToFormat(result, ExportFormat.JSON);
    
    if (!exportResult.success) {
      console.error('JSON export failed:', exportResult.error);
      throw new Error(exportResult.error?.userMessage || 'Failed to export JSON');
    }
  } catch (error) {
    console.error('Failed to export JSON:', error);
    throw error;
  }
}

// =============== CSV EXPORT ===============
/**
 * Export audit result to CSV format using the new ExportManager architecture
 * Includes complete data validation, RFC 4180 compliance, and proper escaping
 */
export async function exportToCSV(result: AuditResult): Promise<void> {
  try {
    const exportResult = await exportManager.exportToFormat(result, ExportFormat.CSV);
    
    if (!exportResult.success) {
      console.error('CSV export failed:', exportResult.error);
      throw new Error(exportResult.error?.userMessage || 'Failed to export CSV');
    }
  } catch (error) {
    console.error('Failed to export CSV:', error);
    throw error;
  }
}

// =============== MARKDOWN EXPORT ===============
/**
 * Export audit result to Markdown format using the new ExportManager architecture
 * Includes proper heading hierarchy, tables, lists, and complete data coverage
 */
export async function exportToMarkdown(result: AuditResult): Promise<void> {
  try {
    await exportManager.exportToFormat(result, ExportFormat.MARKDOWN);
  } catch (error) {
    console.error('Failed to export Markdown:', error);
    throw error;
  }
}

// =============== HTML EXPORT ===============
/**
 * Export audit result to HTML format
 * Requirements: 6.1-6.4 (Metadata and compliance features)
 */
export function exportToHTML(result: AuditResult): void {
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toLocaleString();
  
  // Get standardized metadata (Requirements 6.1, 6.2, 6.4)
  const { getExportMetadata, formatMetadataAsHTMLMeta } = require('./export/metadata');
  const { ExportFormat } = require('./export/types');
  const metadata = getExportMetadata(ExportFormat.HTML);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#FB923C';
    return '#EF4444';
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GEO Audit Report - ${hostname}</title>
${formatMetadataAsHTMLMeta(metadata)}
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #f8fafc;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .score {
            font-size: 5em;
            font-weight: bold;
            margin: 20px 0;
        }
        .header .grade {
            font-size: 1.5em;
            opacity: 0.9;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #3b82f6;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .score-card {
            padding: 20px;
            border-left: 4px solid;
            background: #f8fafc;
            border-radius: 8px;
        }
        .score-card h3 {
            font-size: 0.9em;
            color: #64748b;
            margin-bottom: 10px;
        }
        .score-card .value {
            font-size: 2em;
            font-weight: bold;
        }
        .progress-bar {
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            transition: width 0.3s;
        }
        .insights li {
            margin-bottom: 10px;
            padding-left: 25px;
            position: relative;
        }
        .insights li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10B981;
            font-weight: bold;
        }
        .recommendation {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid;
        }
        .recommendation.critical { border-color: #EF4444; }
        .recommendation.high { border-color: #F59E0B; }
        .recommendation.medium { border-color: #EAB308; }
        .recommendation h3 { margin-bottom: 10px; color: #1e293b; }
        .recommendation .meta {
            display: flex;
            gap: 15px;
            margin: 10px 0;
            font-size: 0.9em;
            color: #64748b;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .badge.critical { background: #FEE2E2; color: #991B1B; }
        .badge.high { background: #FED7AA; color: #9A3412; }
        .badge.medium { background: #FEF3C7; color: #854D0E; }
        .footer {
            text-align: center;
            padding: 30px;
            background: #1e293b;
            color: white;
            border-radius: 12px;
            margin-top: 30px;
        }
        @media print {
            body { background: white; }
            .section { box-shadow: none; border: 1px solid #e2e8f0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>GEO Audit Report</h1>
            <p><strong>${hostname}</strong></p>
            <div class="score" style="color: ${getScoreColor(result.overallScore)}">${result.overallScore}</div>
            <div class="grade">Grade: ${result.grade}</div>
            <p style="margin-top: 20px; opacity: 0.8;">Analysis Date: ${date}</p>
        </div>

        <div class="section">
            <h2>Score Breakdown</h2>
            <div class="score-grid">
                ${Object.entries(result.scores).map(([category, score]) => {
                    const color = getScoreColor(score);
                    const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
                    return `
                        <div class="score-card" style="border-color: ${color}">
                            <h3>${categoryName}</h3>
                            <div class="value" style="color: ${color}">${score}</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${score}%; background: ${color}"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        ${result.insights && result.insights.length > 0 ? `
        <div class="section">
            <h2>Key Insights</h2>
            <ul class="insights">
                ${result.insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div class="section">
            <h2>Recommendations & Action Plan</h2>
            ${result.recommendations.map((rec, idx) => `
                <div class="recommendation ${rec.priority}">
                    <h3>${idx + 1}. ${rec.title}</h3>
                    <div class="meta">
                        <span class="badge ${rec.priority}">${rec.priority.toUpperCase()}</span>
                        ${rec.effort ? `<span>Effort: ${rec.effort}</span>` : ''}
                        ${rec.estimatedTime ? `<span>Time: ${rec.estimatedTime}</span>` : ''}
                    </div>
                    <p>${rec.description}</p>
                    ${rec.impact ? `<p style="margin-top: 10px;"><strong>💡 Impact:</strong> ${rec.impact}</p>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <h3>Need Expert Implementation Support?</h3>
            <p style="margin: 15px 0;">Our GEO specialists can implement these recommendations and<br>maximize your visibility in AI-powered search platforms.</p>
            <p><strong>Peitho@anoteroslogos.com</strong> | <strong>https://anoteroslogos.com</strong></p>
            <p style="margin-top: 20px; font-size: 0.9em; opacity: 0.8;">
                Generated by ${metadata.generatedBy} v${metadata.toolVersion}<br>
                Report Generated: ${new Date(metadata.generatedAt).toLocaleString()}<br>
                Analyzed URL: ${result.url}
            </p>
        </div>
    </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `GEO-Audit-${hostname}-${Date.now()}.html`);
  link.click();
  URL.revokeObjectURL(url);
}

// =============== XML EXPORT (for LLM analysis) ===============
/**
 * Export audit result to XML format
 * Requirements: 6.1, 6.2, 6.3, 6.5 (Metadata and schema version)
 */
export function exportToXML(result: AuditResult): void {
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toISOString();
  
  // Get standardized metadata (Requirements 6.1, 6.2, 6.5)
  const { getExportMetadata, formatMetadataAsXML } = require('./export/metadata');
  const { ExportFormat } = require('./export/types');
  const metadata = getExportMetadata(ExportFormat.XML);

  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<GEOAuditReport xmlns="https://anoteroslogos.com/schema/geo-audit" version="${metadata.schemaVersion}">\n`;
  xml += formatMetadataAsXML(metadata);
  xml += `  <AuditData>\n`;
  xml += `    <Website>${escapeXML(hostname)}</Website>\n`;
  xml += `    <URL>${escapeXML(result.url)}</URL>\n`;
  xml += `    <AnalysisDate>${date}</AnalysisDate>\n`;
  xml += `    <Timestamp>${result.timestamp}</Timestamp>\n`;
  xml += `  </AuditData>\n\n`;

  xml += `  <OverallScore>\n`;
  xml += `    <Score>${result.overallScore}</Score>\n`;
  xml += `    <Grade>${result.grade}</Grade>\n`;
  xml += `    <MaxScore>100</MaxScore>\n`;
  xml += `  </OverallScore>\n\n`;

  xml += `  <ScoreBreakdown>\n`;
  Object.entries(result.scores).forEach(([category, score]) => {
    const categoryName = category.replace(/([A-Z])/g, '_$1').toUpperCase();
    xml += `    <Category name="${categoryName}">\n`;
    xml += `      <Score>${score}</Score>\n`;
    xml += `      <Status>${score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'}</Status>\n`;
    xml += `    </Category>\n`;
  });
  xml += `  </ScoreBreakdown>\n\n`;

  if (result.insights && result.insights.length > 0) {
    xml += `  <KeyInsights>\n`;
    result.insights.forEach((insight, idx) => {
      xml += `    <Insight id="${idx + 1}">${escapeXML(insight)}</Insight>\n`;
    });
    xml += `  </KeyInsights>\n\n`;
  }

  xml += `  <DetailedAnalysis>\n`;
  if (result.details) {
    Object.entries(result.details).forEach(([category, details]: [string, any]) => {
      const categoryName = category.replace(/([A-Z])/g, '_$1').toUpperCase();
      xml += `    <${categoryName}>\n`;
      
      if (details?.strengths && details.strengths.length > 0) {
        xml += `      <Strengths>\n`;
        details.strengths.forEach((strength: string) => {
          xml += `        <Item>${escapeXML(strength)}</Item>\n`;
        });
        xml += `      </Strengths>\n`;
      }

      if (details?.issues && details.issues.length > 0) {
        xml += `      <Issues>\n`;
        details.issues.forEach((issue: string) => {
          xml += `        <Item>${escapeXML(issue)}</Item>\n`;
        });
        xml += `      </Issues>\n`;
      }

      xml += `    </${categoryName}>\n`;
    });
  }
  xml += `  </DetailedAnalysis>\n\n`;

  xml += `  <Recommendations>\n`;
  result.recommendations.forEach((rec, idx) => {
    xml += `    <Recommendation id="${idx + 1}" priority="${rec.priority}">\n`;
    xml += `      <Title>${escapeXML(rec.title)}</Title>\n`;
    xml += `      <Category>${escapeXML(rec.category)}</Category>\n`;
    xml += `      <Description>${escapeXML(rec.description)}</Description>\n`;
    if (rec.effort) xml += `      <Effort>${escapeXML(rec.effort)}</Effort>\n`;
    if (rec.estimatedTime) xml += `      <EstimatedTime>${escapeXML(rec.estimatedTime)}</EstimatedTime>\n`;
    if (rec.impact) xml += `      <Impact>${escapeXML(rec.impact)}</Impact>\n`;
    if (rec.implementation) xml += `      <Implementation>${escapeXML(rec.implementation)}</Implementation>\n`;
    xml += `    </Recommendation>\n`;
  });
  xml += `  </Recommendations>\n\n`;

  xml += `  <Statistics>\n`;
  xml += `    <ValidSchemas>${result.details?.schemaMarkup?.validSchemas || 0}</ValidSchemas>\n`;
  xml += `    <AICrawlersAllowed>${result.details?.aiCrawlers?.totalAICrawlers || 0}</AICrawlersAllowed>\n`;
  xml += `    <WordCount>${result.details?.contentQuality?.wordCount || 0}</WordCount>\n`;
  xml += `    <TotalLinks>${result.details?.linkAnalysis?.totalLinks || 0}</TotalLinks>\n`;
  xml += `    <BrokenLinks>${result.details?.linkAnalysis?.brokenLinks || 0}</BrokenLinks>\n`;
  xml += `    <ImageCount>${result.details?.contentQuality?.imageCount || 0}</ImageCount>\n`;
  xml += `  </Statistics>\n\n`;

  // Add broken links section if present
  if (result.details?.linkAnalysis?.brokenLinkDetails && result.details.linkAnalysis.brokenLinkDetails.length > 0) {
    xml += `  <BrokenLinks>\n`;
    result.details.linkAnalysis.brokenLinkDetails.forEach((brokenLink, idx) => {
      xml += `    <BrokenLink id="${idx + 1}">\n`;
      xml += `      <URL>${escapeXML(brokenLink.url)}</URL>\n`;
      xml += `      <Status>${brokenLink.status}</Status>\n`;
      xml += `      <Broken>${brokenLink.broken}</Broken>\n`;
      xml += `      <Redirected>${brokenLink.redirected}</Redirected>\n`;
      if (brokenLink.finalUrl) xml += `      <FinalURL>${escapeXML(brokenLink.finalUrl)}</FinalURL>\n`;
      if (brokenLink.error) xml += `      <Error>${escapeXML(brokenLink.error)}</Error>\n`;
      xml += `    </BrokenLink>\n`;
    });
    xml += `  </BrokenLinks>\n\n`;
  }

  xml += `</GEOAuditReport>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `GEO-Audit-${hostname}-${Date.now()}.xml`);
  link.click();
  URL.revokeObjectURL(url);
}

// =============== PLAIN TEXT EXPORT (token-efficient for LLM) ===============
/**
 * Export audit result to Plain Text format
 * Requirements: 6.1, 6.2, 6.3 (Metadata)
 */
export function exportToPlainText(result: AuditResult): void {
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toLocaleString();
  
  // Get standardized metadata (Requirements 6.1, 6.2, 6.3)
  const { getExportMetadata } = require('./export/metadata');
  const { ExportFormat } = require('./export/types');
  const metadata = getExportMetadata(ExportFormat.PLAIN_TEXT);

  let text = `GEO AUDIT REPORT\n`;
  text += `${'='.repeat(80)}\n\n`;
  
  text += `Website: ${hostname}\n`;
  text += `URL: ${result.url}\n`;
  text += `Analysis Date: ${date}\n`;
  text += `Overall Score: ${result.overallScore}/100\n`;
  text += `Grade: ${result.grade}\n\n`;

  text += `${'='.repeat(80)}\n`;
  text += `SCORE BREAKDOWN\n`;
  text += `${'='.repeat(80)}\n\n`;

  Object.entries(result.scores).forEach(([category, score]) => {
    const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
    const status = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'POOR';
    const bar = '█'.repeat(Math.floor(score / 5)) + '░'.repeat(20 - Math.floor(score / 5));
    text += `${categoryName.padEnd(25)} ${score.toString().padStart(3)}/100 [${bar}] ${status}\n`;
  });

  text += `\n${'='.repeat(80)}\n`;
  text += `KEY STATISTICS\n`;
  text += `${'='.repeat(80)}\n\n`;
  
  text += `Valid Schemas: ${result.details?.schemaMarkup?.validSchemas || 0}\n`;
  text += `AI Crawlers Allowed: ${result.details?.aiCrawlers?.totalAICrawlers || 0}\n`;
  text += `Word Count: ${result.details?.contentQuality?.wordCount || 0}\n`;
  text += `Total Links: ${result.details?.linkAnalysis?.totalLinks || 0}\n`;
  text += `Broken Links: ${result.details?.linkAnalysis?.brokenLinks || 0}\n`;
  text += `Images: ${result.details?.contentQuality?.imageCount || 0}\n`;

  // Add broken links section if present
  if (result.details?.linkAnalysis?.brokenLinkDetails && result.details.linkAnalysis.brokenLinkDetails.length > 0) {
    text += `\n${'='.repeat(80)}\n`;
    text += `BROKEN LINKS DETECTED\n`;
    text += `${'='.repeat(80)}\n\n`;
    
    result.details.linkAnalysis.brokenLinkDetails.forEach((brokenLink, idx) => {
      text += `${idx + 1}. ${brokenLink.url}\n`;
      text += `   Status: ${brokenLink.status}\n`;
      text += `   Broken: ${brokenLink.broken ? 'Yes' : 'No'}\n`;
      text += `   Redirected: ${brokenLink.redirected ? 'Yes' : 'No'}\n`;
      if (brokenLink.finalUrl) text += `   Final URL: ${brokenLink.finalUrl}\n`;
      if (brokenLink.error) text += `   Error: ${brokenLink.error}\n`;
      text += `\n`;
    });
  }

  if (result.insights && result.insights.length > 0) {
    text += `\n${'='.repeat(80)}\n`;
    text += `KEY INSIGHTS\n`;
    text += `${'='.repeat(80)}\n\n`;
    result.insights.forEach((insight, idx) => {
      text += `${idx + 1}. ${insight}\n`;
    });
  }

  text += `\n${'='.repeat(80)}\n`;
  text += `DETAILED ANALYSIS\n`;
  text += `${'='.repeat(80)}\n\n`;

  if (result.details) {
    Object.entries(result.details).forEach(([category, details]: [string, any]) => {
      const categoryName = category.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
      const score = result.scores[category as keyof typeof result.scores];
      
      text += `${categoryName} (Score: ${score || 0}/100)\n`;
      text += `${'-'.repeat(80)}\n`;
      
      if (details?.strengths && details.strengths.length > 0) {
        text += `\nSTRENGTHS:\n`;
        details.strengths.forEach((strength: string) => {
          text += `  + ${strength}\n`;
        });
      }

      if (details?.issues && details.issues.length > 0) {
        text += `\nISSUES:\n`;
        details.issues.forEach((issue: string) => {
          text += `  - ${issue}\n`;
        });
      }
      text += `\n`;
    });
  }

  text += `${'='.repeat(80)}\n`;
  text += `RECOMMENDATIONS & ACTION PLAN\n`;
  text += `${'='.repeat(80)}\n\n`;

  const priorityGroups = {
    critical: result.recommendations.filter(r => r.priority === 'critical'),
    high: result.recommendations.filter(r => r.priority === 'high'),
    medium: result.recommendations.filter(r => r.priority === 'medium'),
  };

  Object.entries(priorityGroups).forEach(([priority, recs]) => {
    if (recs.length === 0) return;
    
    text += `\n${priority.toUpperCase()} PRIORITY\n`;
    text += `${'-'.repeat(80)}\n\n`;

    recs.forEach((rec, idx) => {
      text += `${idx + 1}. ${rec.title}\n`;
      text += `   Category: ${rec.category}\n`;
      if (rec.effort) text += `   Effort: ${rec.effort}\n`;
      if (rec.estimatedTime) text += `   Time: ${rec.estimatedTime}\n`;
      text += `\n   ${rec.description}\n`;
      if (rec.impact) text += `\n   Impact: ${rec.impact}\n`;
      if (rec.implementation) text += `\n   Implementation: ${rec.implementation}\n`;
      text += `\n`;
    });
  });

  text += `${'='.repeat(80)}\n`;
  text += `EXPORT INFORMATION\n`;
  text += `${'='.repeat(80)}\n`;
  text += `Generated by: ${metadata.generatedBy}\n`;
  text += `Tool Version: ${metadata.toolVersion}\n`;
  text += `Export Format: ${metadata.exportFormat}\n`;
  text += `Export Version: ${metadata.exportVersion}\n`;
  text += `Generated At: ${metadata.generatedAt}\n`;
  text += `Analyzed URL: ${result.url}\n\n`;
  text += `Visit https://anoteroslogos.com for expert GEO implementation support\n`;
  text += `${'='.repeat(80)}\n`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `GEO-Audit-${hostname}-${Date.now()}.txt`);
  link.click();
  URL.revokeObjectURL(url);
}

// =============== YAML EXPORT (for configuration analysis) ===============
/**
 * Export audit result to YAML format
 * Requirements: 6.1, 6.2, 6.3, 6.5 (Metadata and schema version)
 */
export function exportToYAML(result: AuditResult): void {
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toISOString();
  
  // Get standardized metadata (Requirements 6.1, 6.2, 6.5)
  const { getExportMetadata, formatMetadataAsYAML } = require('./export/metadata');
  const { ExportFormat } = require('./export/types');
  const metadata = getExportMetadata(ExportFormat.YAML);

  const escapeYAML = (str: string): string => {
    if (str.includes(':') || str.includes('#') || str.includes('\n')) {
      return `"${str.replace(/"/g, '\\"')}"`;
    }
    return str;
  };

  let yaml = `---\n`;
  yaml += `geo_audit_report:\n`;
  yaml += formatMetadataAsYAML(metadata);
  yaml += `\n  audit_data:\n`;
  yaml += `    website: ${escapeYAML(hostname)}\n`;
  yaml += `    url: ${escapeYAML(result.url)}\n`;
  yaml += `    analysis_date: ${date}\n`;
  yaml += `    timestamp: ${result.timestamp}\n\n`;

  yaml += `  overall_score:\n`;
  yaml += `    score: ${result.overallScore}\n`;
  yaml += `    grade: ${result.grade}\n`;
  yaml += `    max_score: 100\n\n`;

  yaml += `  score_breakdown:\n`;
  Object.entries(result.scores).forEach(([category, score]) => {
    const categoryKey = category.replace(/([A-Z])/g, '_$1').toLowerCase();
    const status = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
    yaml += `    ${categoryKey}:\n`;
    yaml += `      score: ${score}\n`;
    yaml += `      status: ${status}\n`;
  });

  if (result.insights && result.insights.length > 0) {
    yaml += `\n  key_insights:\n`;
    result.insights.forEach((insight) => {
      yaml += `    - ${escapeYAML(insight)}\n`;
    });
  }

  yaml += `\n  statistics:\n`;
  yaml += `    valid_schemas: ${result.details?.schemaMarkup?.validSchemas || 0}\n`;
  yaml += `    ai_crawlers_allowed: ${result.details?.aiCrawlers?.totalAICrawlers || 0}\n`;
  yaml += `    word_count: ${result.details?.contentQuality?.wordCount || 0}\n`;
  yaml += `    total_links: ${result.details?.linkAnalysis?.totalLinks || 0}\n`;
  yaml += `    broken_links: ${result.details?.linkAnalysis?.brokenLinks || 0}\n`;
  yaml += `    image_count: ${result.details?.contentQuality?.imageCount || 0}\n`;

  // Add broken links section if present
  if (result.details?.linkAnalysis?.brokenLinkDetails && result.details.linkAnalysis.brokenLinkDetails.length > 0) {
    yaml += `\n  broken_links_details:\n`;
    result.details.linkAnalysis.brokenLinkDetails.forEach((brokenLink) => {
      yaml += `    - url: ${escapeYAML(brokenLink.url)}\n`;
      yaml += `      status: ${brokenLink.status}\n`;
      yaml += `      broken: ${brokenLink.broken}\n`;
      yaml += `      redirected: ${brokenLink.redirected}\n`;
      if (brokenLink.finalUrl) yaml += `      final_url: ${escapeYAML(brokenLink.finalUrl)}\n`;
      if (brokenLink.error) yaml += `      error: ${escapeYAML(brokenLink.error)}\n`;
    });
  }

  yaml += `\n  detailed_analysis:\n`;
  if (result.details) {
    Object.entries(result.details).forEach(([category, details]: [string, any]) => {
      const categoryKey = category.replace(/([A-Z])/g, '_$1').toLowerCase();
      yaml += `    ${categoryKey}:\n`;
      
      if (details?.strengths && details.strengths.length > 0) {
        yaml += `      strengths:\n`;
        details.strengths.forEach((strength: string) => {
          yaml += `        - ${escapeYAML(strength)}\n`;
        });
      }

      if (details?.issues && details.issues.length > 0) {
        yaml += `      issues:\n`;
        details.issues.forEach((issue: string) => {
          yaml += `        - ${escapeYAML(issue)}\n`;
        });
      }
    });
  }

  yaml += `\n  recommendations:\n`;
  result.recommendations.forEach((rec, idx) => {
    yaml += `    - id: ${idx + 1}\n`;
    yaml += `      priority: ${rec.priority}\n`;
    yaml += `      title: ${escapeYAML(rec.title)}\n`;
    yaml += `      category: ${escapeYAML(rec.category)}\n`;
    yaml += `      description: ${escapeYAML(rec.description)}\n`;
    if (rec.effort) yaml += `      effort: ${escapeYAML(rec.effort)}\n`;
    if (rec.estimatedTime) yaml += `      estimated_time: ${escapeYAML(rec.estimatedTime)}\n`;
    if (rec.impact) yaml += `      impact: ${escapeYAML(rec.impact)}\n`;
    if (rec.implementation) yaml += `      implementation: ${escapeYAML(rec.implementation)}\n`;
  });

  yaml += `\n  contact_info:\n`;
  yaml += `    website: "https://anoteroslogos.com"\n`;
  yaml += `    email: "Peitho@anoteroslogos.com"\n`;

  const blob = new Blob([yaml], { type: 'application/x-yaml;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `GEO-Audit-${hostname}-${Date.now()}.yaml`);
  link.click();
  URL.revokeObjectURL(url);
}
