/**
 * Additional Export Formats for GEO Audit Reports
 * CSV, Markdown, HTML formats for different use cases
 */

import { AuditResult } from './geoAuditEnhanced';

// =============== CSV EXPORT ===============
export function exportToCSV(result: AuditResult): void {
  const hostname = new URL(result.url).hostname;
  
  const rows = [
    ['GEO Audit Report - CSV Export'],
    ['Website', hostname],
    ['Analysis Date', new Date(result.timestamp).toLocaleString()],
    ['Overall Score', result.overallScore.toString()],
    ['Grade', result.grade],
    [''],
    ['Score Breakdown'],
    ['Category', 'Score', 'Status'],
  ];

  Object.entries(result.scores).forEach(([category, score]) => {
    const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
    const status = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
    rows.push([categoryName, score.toString(), status]);
  });

  rows.push(['']);
  rows.push(['Quick Statistics']);
  rows.push(['Metric', 'Value']);
  rows.push(['Valid Schemas', result.details.schemaMarkup.validSchemas.toString()]);
  rows.push(['AI Crawlers Allowed', result.details.aiCrawlers.totalAICrawlers.toString()]);
  rows.push(['Word Count', result.details.contentQuality.wordCount.toString()]);
  rows.push(['Total Links', result.details.linkAnalysis.totalLinks.toString()]);
  rows.push(['Images', result.details.contentQuality.imageCount.toString()]);

  rows.push(['']);
  rows.push(['Recommendations']);
  rows.push(['Priority', 'Title', 'Category', 'Effort', 'Impact']);

  result.recommendations.forEach((rec) => {
    rows.push([
      rec.priority,
      rec.title.replace(/,/g, ';'),
      rec.category,
      rec.effort || 'N/A',
      rec.impact?.replace(/,/g, ';') || 'N/A'
    ]);
  });

  const csvContent = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `GEO-Audit-${hostname}-${Date.now()}.csv`);
  link.click();
  URL.revokeObjectURL(url);
}

// =============== MARKDOWN EXPORT ===============
export function exportToMarkdown(result: AuditResult): void {
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toLocaleString();

  let md = `# GEO Audit Report\n\n`;
  md += `**Website:** ${hostname}  \n`;
  md += `**Analysis Date:** ${date}  \n`;
  md += `**Overall Score:** ${result.overallScore}/100  \n`;
  md += `**Grade:** ${result.grade}  \n\n`;

  md += `---\n\n`;

  md += `## Executive Summary\n\n`;
  md += `This comprehensive GEO (Generative Engine Optimization) audit evaluates your website's readiness for AI-powered search engines including ChatGPT, Gemini, and Perplexity.\n\n`;

  md += `### Overall Performance\n\n`;
  md += `| Metric | Score | Status |\n`;
  md += `|--------|-------|--------|\n`;
  md += `| **Overall Score** | **${result.overallScore}/100** | **${result.grade}** |\n\n`;

  md += `## Score Breakdown\n\n`;
  md += `| Category | Score | Status |\n`;
  md += `|----------|-------|--------|\n`;

  Object.entries(result.scores).forEach(([category, score]) => {
    const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
    const status = score >= 80 ? '✅ Excellent' : score >= 60 ? '🟢 Good' : score >= 40 ? '🟡 Fair' : '🔴 Poor';
    md += `| ${categoryName} | ${score} | ${status} |\n`;
  });

  md += `\n## Quick Statistics\n\n`;
  md += `- **Schemas Found:** ${result.details.schemaMarkup.validSchemas}\n`;
  md += `- **AI Crawlers Allowed:** ${result.details.aiCrawlers.totalAICrawlers}\n`;
  md += `- **Word Count:** ${result.details.contentQuality.wordCount}\n`;
  md += `- **Total Links:** ${result.details.linkAnalysis.totalLinks}\n`;
  md += `- **Images:** ${result.details.contentQuality.imageCount}\n\n`;

  if (result.insights && result.insights.length > 0) {
    md += `## Key Insights\n\n`;
    result.insights.forEach((insight, idx) => {
      md += `${idx + 1}. ${insight}\n`;
    });
    md += `\n`;
  }

  md += `## Detailed Category Analysis\n\n`;
  Object.entries(result.details).forEach(([category, details]) => {
    const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
    const score = result.scores[category as keyof typeof result.scores];
    
    md += `### ${categoryName} (Score: ${score}/100)\n\n`;
    
    if (details.strengths && details.strengths.length > 0) {
      md += `**✅ Strengths:**\n\n`;
      details.strengths.forEach((strength) => {
        md += `- ${strength}\n`;
      });
      md += `\n`;
    }

    if (details.issues && details.issues.length > 0) {
      md += `**⚠️ Issues:**\n\n`;
      details.issues.forEach((issue) => {
        md += `- ${issue}\n`;
      });
      md += `\n`;
    }
  });

  md += `## Recommendations & Action Plan\n\n`;

  const priorityGroups = {
    critical: result.recommendations.filter(r => r.priority === 'critical'),
    high: result.recommendations.filter(r => r.priority === 'high'),
    medium: result.recommendations.filter(r => r.priority === 'medium'),
  };

  Object.entries(priorityGroups).forEach(([priority, recs]) => {
    if (recs.length === 0) return;
    
    const emoji = priority === 'critical' ? '🔴' : priority === 'high' ? '🟠' : '🟡';
    md += `### ${emoji} ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;

    recs.forEach((rec, idx) => {
      md += `#### ${idx + 1}. ${rec.title}\n\n`;
      md += `**Category:** ${rec.category}  \n`;
      if (rec.effort) md += `**Effort:** ${rec.effort}  \n`;
      if (rec.estimatedTime) md += `**Time:** ${rec.estimatedTime}  \n\n`;
      md += `${rec.description}\n\n`;
      if (rec.impact) md += `💡 **Impact:** ${rec.impact}\n\n`;
      if (rec.implementation) md += `🔧 **Implementation:** ${rec.implementation}\n\n`;
    });
  });

  md += `---\n\n`;
  md += `*Generated by Anóteros Lógos GEO Audit Tool*  \n`;
  md += `*Visit https://anoteroslogos.com for expert GEO implementation support*\n`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `GEO-Audit-${hostname}-${Date.now()}.md`);
  link.click();
  URL.revokeObjectURL(url);
}

// =============== HTML EXPORT ===============
export function exportToHTML(result: AuditResult): void {
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toLocaleString();

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
            <p><strong>contact@anoteroslogos.com</strong> | <strong>https://anoteroslogos.com</strong></p>
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
