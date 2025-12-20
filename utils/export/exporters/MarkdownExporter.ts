/**
 * Markdown Exporter for GEO Audit Reports
 * Exports complete AuditResult data as CommonMark-compliant Markdown
 * 
 * Features:
 * - Proper heading hierarchy (H1/H2/H3)
 * - Tables for score breakdowns
 * - Lists for recommendations and insights
 * - Code blocks for implementation examples
 * - Complete data coverage for all audit sections
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
import { getExportMetadata } from '../metadata';

export class MarkdownExporter implements FormatExporter {
  readonly format = ExportFormat.MARKDOWN;
  
  /**
   * Export AuditResult to Markdown format
   * Includes all fields with proper structure and formatting
   */
  async export(result: AuditResult, options?: ExportOptions): Promise<ExportOutput> {
    // Report progress if callback provided
    options?.progressCallback?.(60, 'Generating Markdown...');
    
    let md = '';
    
    // H1: Document title
    md += this.generateHeader(result);
    
    // H2: Executive Summary
    md += this.generateExecutiveSummary(result);
    
    // H2: Score Breakdown
    md += this.generateScoreBreakdown(result);
    
    // H2: Quick Statistics
    md += this.generateQuickStatistics(result);
    
    // H2: Key Insights
    if (result.insights && result.insights.length > 0) {
      md += this.generateInsights(result);
    }
    
    // H2: Detailed Category Analysis
    md += this.generateDetailedAnalysis(result);
    
    // H2: Recommendations & Action Plan
    md += this.generateRecommendations(result);
    
    // H2: Knowledge Graph (if present)
    if (result.knowledgeGraph) {
      md += this.generateKnowledgeGraph(result);
    }
    
    // H2: Browser Metadata (if present)
    if (result.browserMetadata) {
      md += this.generateBrowserMetadata(result);
    }
    
    // H2: AIP Agent Information (if present)
    if (result.details?.aidAgent) {
      md += this.generateAIPAgentInfo(result);
    }
    
    // Footer
    md += this.generateFooter(result);
    
    // Generate safe filename
    const hostname = new URL(result.url).hostname;
    const timestamp = Date.now();
    const filename = ExportSecurity.sanitizeFilename(
      `GEO-Audit-${hostname}-${timestamp}.md`
    );
    
    return {
      content: md,
      filename,
      mimeType: 'text/markdown;charset=utf-8',
      size: new Blob([md]).size
    };
  }
  
  /**
   * Generate document header with H1 title and metadata
   */
  private generateHeader(result: AuditResult): string {
    const hostname = new URL(result.url).hostname;
    const date = new Date(result.timestamp).toLocaleString();
    
    let md = `# GEO Audit Report\n\n`;
    md += `**Website:** ${this.escapeMarkdown(hostname)}  \n`;
    md += `**URL:** ${this.escapeMarkdown(result.url)}  \n`;
    md += `**Analysis Date:** ${date}  \n`;
    md += `**Overall Score:** ${result.overallScore}/100  \n`;
    md += `**Precise Score:** ${result.preciseScore.toFixed(3)}  \n`;
    md += `**Grade:** ${result.grade}  \n\n`;
    md += `---\n\n`;
    
    return md;
  }
  
  /**
   * Generate executive summary section (H2)
   */
  private generateExecutiveSummary(result: AuditResult): string {
    let md = `## Executive Summary\n\n`;
    md += `This comprehensive GEO (Generative Engine Optimization) audit evaluates your website's readiness for AI-powered search engines including ChatGPT, Gemini, and Perplexity.\n\n`;
    
    md += `### Overall Performance\n\n`;
    md += `| Metric | Score | Status |\n`;
    md += `|--------|-------|--------|\n`;
    md += `| **Overall Score** | **${result.overallScore}/100** | **${result.grade}** |\n`;
    
    if (result.scoreBreakdown) {
      md += `| Core Score | ${result.scoreBreakdown.core.toFixed(1)} | - |\n`;
      md += `| Technical Score | ${result.scoreBreakdown.technical.toFixed(1)} | - |\n`;
      md += `| Content Score | ${result.scoreBreakdown.content.toFixed(1)} | - |\n`;
      md += `| Weighted Score | ${result.scoreBreakdown.weighted.toFixed(1)} | - |\n`;
    }
    
    md += `\n`;
    return md;
  }
  
  /**
   * Generate score breakdown table (H2)
   */
  private generateScoreBreakdown(result: AuditResult): string {
    let md = `## Score Breakdown\n\n`;
    md += `| Category | Score | Status |\n`;
    md += `|----------|-------|--------|\n`;
    
    const scoreEntries: [string, number][] = [
      ['Schema Markup', result.scores.schemaMarkup],
      ['Meta Tags', result.scores.metaTags],
      ['AI Crawlers', result.scores.aiCrawlers],
      ['E-E-A-T', result.scores.eeat],
      ['Structure', result.scores.structure],
      ['Performance', result.scores.performance],
      ['Content Quality', result.scores.contentQuality],
      ['Citation Potential', result.scores.citationPotential],
      ['Technical SEO', result.scores.technicalSEO],
      ['Link Analysis', result.scores.linkAnalysis],
      ['AID Agent', result.scores.aidAgent]
    ];
    
    scoreEntries.forEach(([category, score]) => {
      const status = this.getScoreStatus(score);
      md += `| ${category} | ${score} | ${status} |\n`;
    });
    
    md += `\n`;
    return md;
  }
  
  /**
   * Generate quick statistics section (H2)
   */
  private generateQuickStatistics(result: AuditResult): string {
    let md = `## Quick Statistics\n\n`;
    
    // Schema Markup stats
    if (result.details?.schemaMarkup) {
      md += `- **Total Schemas:** ${result.details.schemaMarkup.totalSchemas || 0}\n`;
      md += `- **Valid Schemas:** ${result.details.schemaMarkup.validSchemas || 0}\n`;
      md += `- **Has Graph Structure:** ${result.details.schemaMarkup.hasGraphStructure ? 'Yes' : 'No'}\n`;
    }
    
    // AI Crawlers stats
    if (result.details?.aiCrawlers) {
      md += `- **AI Crawlers Allowed:** ${result.details.aiCrawlers.totalAICrawlers || 0}\n`;
      md += `- **Robots.txt Found:** ${result.details.aiCrawlers.robotsTxtFound ? 'Yes' : 'No'}\n`;
    }
    
    // Content Quality stats
    if (result.details?.contentQuality) {
      md += `- **Word Count:** ${result.details.contentQuality.wordCount || 0}\n`;
      md += `- **Readability Score:** ${result.details.contentQuality.readabilityScore || 0}\n`;
      md += `- **Paragraph Count:** ${result.details.contentQuality.paragraphCount || 0}\n`;
      md += `- **Images:** ${result.details.contentQuality.imageCount || 0}\n`;
      md += `- **Videos:** ${result.details.contentQuality.videoCount || 0}\n`;
    }
    
    // Link Analysis stats
    if (result.details?.linkAnalysis) {
      md += `- **Total Links:** ${result.details.linkAnalysis.totalLinks || 0}\n`;
      md += `- **Internal Links:** ${result.details.linkAnalysis.internalLinks || 0}\n`;
      md += `- **External Links:** ${result.details.linkAnalysis.externalLinks || 0}\n`;
      md += `- **Nofollow Ratio:** ${(result.details.linkAnalysis.nofollowRatio * 100).toFixed(1)}%\n`;
    }
    
    // Performance stats
    if (result.details?.performance) {
      md += `- **HTML Size:** ${this.formatBytes(result.details.performance.htmlSize || 0)}\n`;
      md += `- **Total Resources:** ${result.details.performance.totalResources || 0}\n`;
    }
    
    // Browser load time (if available)
    if (result.browserMetadata?.loadTime) {
      md += `- **Load Time:** ${result.browserMetadata.loadTime}ms\n`;
    }
    
    md += `\n`;
    return md;
  }
  
  /**
   * Generate insights section (H2)
   */
  private generateInsights(result: AuditResult): string {
    let md = `## Key Insights\n\n`;
    
    result.insights.forEach((insight, idx) => {
      md += `${idx + 1}. ${this.escapeMarkdown(insight)}\n`;
    });
    
    md += `\n`;
    return md;
  }
  
  /**
   * Generate detailed category analysis (H2 with H3 subsections)
   */
  private generateDetailedAnalysis(result: AuditResult): string {
    let md = `## Detailed Category Analysis\n\n`;
    
    if (!result.details) {
      return md;
    }
    
    const categories = [
      { key: 'schemaMarkup', name: 'Schema Markup' },
      { key: 'metaTags', name: 'Meta Tags' },
      { key: 'aiCrawlers', name: 'AI Crawlers' },
      { key: 'eeat', name: 'E-E-A-T' },
      { key: 'structure', name: 'Structure' },
      { key: 'performance', name: 'Performance' },
      { key: 'contentQuality', name: 'Content Quality' },
      { key: 'citationPotential', name: 'Citation Potential' },
      { key: 'technicalSEO', name: 'Technical SEO' },
      { key: 'linkAnalysis', name: 'Link Analysis' }
    ];
    
    categories.forEach(({ key, name }) => {
      const details = result.details[key as keyof typeof result.details];
      const score = result.scores[key as keyof typeof result.scores];
      
      if (!details) return;
      
      md += `### ${name} (Score: ${score}/100)\n\n`;
      
      // Strengths
      if ((details as any).strengths && (details as any).strengths.length > 0) {
        md += `**✅ Strengths:**\n\n`;
        (details as any).strengths.forEach((strength: string) => {
          md += `- ${this.escapeMarkdown(strength)}\n`;
        });
        md += `\n`;
      }
      
      // Issues
      if ((details as any).issues && (details as any).issues.length > 0) {
        md += `**⚠️ Issues:**\n\n`;
        (details as any).issues.forEach((issue: string) => {
          md += `- ${this.escapeMarkdown(issue)}\n`;
        });
        md += `\n`;
      }
      
      // Category-specific details
      md += this.generateCategorySpecificDetails(key, details);
    });
    
    return md;
  }
  
  /**
   * Generate category-specific details
   */
  private generateCategorySpecificDetails(category: string, details: any): string {
    let md = '';
    
    switch (category) {
      case 'schemaMarkup':
        if (details.schemas && details.schemas.length > 0) {
          md += `**Schema Types Found:**\n\n`;
          details.schemas.forEach((schema: any) => {
            md += `- ${schema.type || 'Unknown'}\n`;
          });
          md += `\n`;
        }
        break;
        
      case 'metaTags':
        if (details.tags) {
          md += `**Meta Tags:**\n\n`;
          md += `- Title: ${details.tags.title ? '✅' : '❌'}\n`;
          md += `- Description: ${details.tags.description ? '✅' : '❌'}\n`;
          md += `- Keywords: ${details.tags.keywords ? '✅' : '❌'}\n`;
          md += `- Open Graph: ${details.tags.openGraph ? '✅' : '❌'}\n`;
          md += `- Twitter Card: ${details.tags.twitterCard ? '✅' : '❌'}\n`;
          md += `\n`;
        }
        break;
        
      case 'aiCrawlers':
        if (details.allowedCrawlers && details.allowedCrawlers.length > 0) {
          md += `**Allowed AI Crawlers:**\n\n`;
          details.allowedCrawlers.forEach((crawler: string) => {
            md += `- ${this.escapeMarkdown(crawler)}\n`;
          });
          md += `\n`;
        }
        break;
        
      case 'eeat':
        if (details.authorInfo) {
          md += `**Author Information:**\n\n`;
          md += `- Has Author: ${details.authorInfo.hasAuthor ? '✅' : '❌'}\n`;
          md += `- Has Bio: ${details.authorInfo.hasBio ? '✅' : '❌'}\n`;
          md += `- Has Credentials: ${details.authorInfo.hasCredentials ? '✅' : '❌'}\n`;
          md += `\n`;
        }
        break;
    }
    
    return md;
  }
  
  /**
   * Generate recommendations section (H2 with H3 subsections)
   */
  private generateRecommendations(result: AuditResult): string {
    let md = `## Recommendations & Action Plan\n\n`;
    
    if (!result.recommendations || result.recommendations.length === 0) {
      md += `No specific recommendations at this time.\n\n`;
      return md;
    }
    
    // Group by priority
    const priorityGroups = {
      critical: result.recommendations.filter(r => r.priority === 'critical'),
      high: result.recommendations.filter(r => r.priority === 'high'),
      medium: result.recommendations.filter(r => r.priority === 'medium'),
      low: result.recommendations.filter(r => r.priority === 'low')
    };
    
    Object.entries(priorityGroups).forEach(([priority, recs]) => {
      if (recs.length === 0) return;
      
      const emoji = priority === 'critical' ? '🔴' : 
                    priority === 'high' ? '🟠' : 
                    priority === 'medium' ? '🟡' : '🟢';
      const priorityName = priority.charAt(0).toUpperCase() + priority.slice(1);
      
      md += `### ${emoji} ${priorityName} Priority\n\n`;
      
      recs.forEach((rec, idx) => {
        md += `#### ${idx + 1}. ${this.escapeMarkdown(rec.title)}\n\n`;
        md += `**Category:** ${this.escapeMarkdown(rec.category)}  \n`;
        if (rec.effort) md += `**Effort:** ${rec.effort}  \n`;
        if (rec.estimatedTime) md += `**Time:** ${this.escapeMarkdown(rec.estimatedTime)}  \n`;
        md += `\n`;
        md += `${this.escapeMarkdown(rec.description)}\n\n`;
        
        if (rec.impact) {
          md += `💡 **Impact:** ${this.escapeMarkdown(rec.impact)}\n\n`;
        }
        
        if (rec.implementation) {
          md += `🔧 **Implementation:**\n\n`;
          md += `\`\`\`\n${rec.implementation}\n\`\`\`\n\n`;
        }
      });
    });
    
    return md;
  }
  
  /**
   * Generate knowledge graph section (H2)
   */
  private generateKnowledgeGraph(result: AuditResult): string {
    if (!result.knowledgeGraph) return '';
    
    let md = `## Knowledge Graph\n\n`;
    
    const kg = result.knowledgeGraph;
    
    md += `**Summary:**\n\n`;
    md += `- **Entities:** ${kg.entities.length}\n`;
    md += `- **Relationships:** ${kg.relationships.length}\n`;
    md += `- **Claims:** ${kg.claims.length}\n\n`;
    
    if (kg.entities.length > 0) {
      md += `### Entities\n\n`;
      md += `| Name | Type | Confidence |\n`;
      md += `|------|------|------------|\n`;
      kg.entities.slice(0, 10).forEach(entity => {
        md += `| ${this.escapeMarkdown(entity.name)} | ${this.escapeMarkdown(entity.type)} | ${(entity.confidence * 100).toFixed(1)}% |\n`;
      });
      if (kg.entities.length > 10) {
        md += `\n*... and ${kg.entities.length - 10} more entities*\n`;
      }
      md += `\n`;
    }
    
    if (kg.relationships.length > 0) {
      md += `### Relationships\n\n`;
      kg.relationships.slice(0, 10).forEach(rel => {
        md += `- **${this.escapeMarkdown(rel.source)}** → *${this.escapeMarkdown(rel.type)}* → **${this.escapeMarkdown(rel.target)}**\n`;
      });
      if (kg.relationships.length > 10) {
        md += `\n*... and ${kg.relationships.length - 10} more relationships*\n`;
      }
      md += `\n`;
    }
    
    return md;
  }
  
  /**
   * Generate browser metadata section (H2)
   */
  private generateBrowserMetadata(result: AuditResult): string {
    if (!result.browserMetadata) return '';
    
    let md = `## Browser Metadata\n\n`;
    
    const bm = result.browserMetadata;
    
    md += `- **Used Browser:** ${bm.usedBrowser ? 'Yes' : 'No'}\n`;
    md += `- **User Agent:** ${this.escapeMarkdown(bm.userAgent || 'N/A')}\n`;
    md += `- **Viewport:** ${bm.viewport?.width || 0}x${bm.viewport?.height || 0}\n`;
    
    if (bm.finalUrl) {
      md += `- **Final URL:** ${this.escapeMarkdown(bm.finalUrl)}\n`;
    }
    
    if (bm.loadTime) {
      md += `- **Load Time:** ${bm.loadTime}ms\n`;
    }
    
    if (bm.resourceCounts) {
      md += `- **Scripts:** ${bm.resourceCounts.scripts}\n`;
      md += `- **Stylesheets:** ${bm.resourceCounts.stylesheets}\n`;
      md += `- **Images:** ${bm.resourceCounts.images}\n`;
    }
    
    md += `\n`;
    return md;
  }
  
  /**
   * Generate AIP Agent information section (H2)
   */
  private generateAIPAgentInfo(result: AuditResult): string {
    if (!result.details?.aidAgent) return '';
    
    let md = `## AIP Agent Information\n\n`;
    
    const aid = result.details.aidAgent;
    
    md += `- **AIP Protocol Detected:** ${aid.detected ? 'Yes' : 'No'}\n`;
    md += `- **Discovery Method:** ${aid.discoveryMethod}\n`;
    
    if (aid.detected) {
      if (aid.agentName) {
        md += `- **Agent Name:** ${this.escapeMarkdown(aid.agentName)}\n`;
      }
      if (aid.agentVersion) {
        md += `- **Agent Version:** ${this.escapeMarkdown(aid.agentVersion)}\n`;
      }
      if (aid.capabilities && aid.capabilities.length > 0) {
        md += `- **Capabilities:** ${aid.capabilities.length}\n`;
        md += `\n**Capability List:**\n\n`;
        aid.capabilities.forEach(cap => {
          md += `- ${this.escapeMarkdown(cap)}\n`;
        });
      }
      if (aid.endpoint) {
        md += `- **Endpoint:** ${this.escapeMarkdown(aid.endpoint)}\n`;
      }
      if (aid.protocols && aid.protocols.length > 0) {
        md += `- **Protocols:** ${aid.protocols.join(', ')}\n`;
      }
    }
    
    md += `\n`;
    return md;
  }
  
  /**
   * Generate footer with metadata
   * Requirements: 6.1, 6.2, 6.3
   */
  private generateFooter(result: AuditResult): string {
    // Get standardized metadata
    const metadata = getExportMetadata(ExportFormat.MARKDOWN);
    
    let md = `---\n\n`;
    md += `**Export Information:**\n\n`;
    md += `- Generated by: ${metadata.generatedBy}\n`;
    md += `- Tool Version: ${metadata.toolVersion}\n`;
    md += `- Export Format: ${metadata.exportFormat}\n`;
    md += `- Export Version: ${metadata.exportVersion}\n`;
    md += `- Generated At: ${metadata.generatedAt}\n`;
    md += `- Analyzed URL: ${this.escapeMarkdown(result.url)}\n\n`;
    md += `*Visit [https://anoteroslogos.com](https://anoteroslogos.com) for expert GEO implementation support*\n`;
    
    return md;
  }
  
  /**
   * Get status emoji and text for score
   */
  private getScoreStatus(score: number): string {
    if (score >= 80) return '✅ Excellent';
    if (score >= 60) return '🟢 Good';
    if (score >= 40) return '🟡 Fair';
    return '🔴 Poor';
  }
  
  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Escape special Markdown characters
   * Escapes: \ ` * _ { } [ ] ( ) # + - . ! |
   */
  private escapeMarkdown(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!')
      .replace(/\|/g, '\\|');
  }
  
  /**
   * Validate Markdown output
   * Ensures proper heading hierarchy and required sections
   */
  validate(output: string | Uint8Array): boolean {
    try {
      if (typeof output !== 'string') {
        return false;
      }
      
      // Check for H1 title
      if (!output.includes('# GEO Audit Report')) {
        return false;
      }
      
      // Check for required H2 sections
      const requiredSections = [
        '## Executive Summary',
        '## Score Breakdown',
        '## Quick Statistics',
        '## Detailed Category Analysis',
        '## Recommendations & Action Plan'
      ];
      
      for (const section of requiredSections) {
        if (!output.includes(section)) {
          return false;
        }
      }
      
      // Check for proper table structure in score breakdown
      if (!output.includes('| Category | Score | Status |')) {
        return false;
      }
      
      // Check for all 11 score categories
      const requiredCategories = [
        'Schema Markup',
        'Meta Tags',
        'AI Crawlers',
        'E-E-A-T',
        'Structure',
        'Performance',
        'Content Quality',
        'Citation Potential',
        'Technical SEO',
        'Link Analysis',
        'AID Agent'
      ];
      
      for (const category of requiredCategories) {
        if (!output.includes(category)) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get metadata about Markdown export format
   */
  getMetadata(): ExportMetadata {
    return {
      format: ExportFormat.MARKDOWN,
      specification: 'CommonMark',
      mimeType: 'text/markdown',
      fileExtension: '.md',
      supportsStreaming: true,
      maxRecommendedSize: 10 * 1024 * 1024 // 10 MB
    };
  }
}
