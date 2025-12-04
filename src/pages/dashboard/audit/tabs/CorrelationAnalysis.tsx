/**
 * CorrelationAnalysis Component
 * 
 * Analyzes relationships between different audit metrics to generate
 * actionable insights about how improvements in one area can impact others.
 * 
 * Features:
 * - Correlation detection between metrics
 * - Visual correlation strength indicators
 * - Actionable insights based on correlations
 * - Priority recommendations based on impact
 * 
 * Analysis Types:
 * 1. Strong Positive Correlations (>0.7): Metrics that move together
 * 2. Moderate Correlations (0.4-0.7): Related metrics
 * 3. Weak Correlations (<0.4): Independent metrics
 * 
 * Key Insights:
 * - Schema Markup ↔ Citation Potential
 * - Content Quality ↔ E-E-A-T
 * - Performance ↔ Technical SEO
 * - Structure ↔ AI Crawlers
 * 
 * Requirements:
 * - Data analysis: Calculate correlations between metrics
 * - Insight generation: Generate actionable recommendations
 * - Visual feedback: Color-coded correlation strength
 * 
 * Usage:
 * ```tsx
 * <CorrelationAnalysis result={result} />
 * ```
 */

import { useState } from 'react';
import { 
  TrendingUp,
  ArrowRight,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';

interface CorrelationAnalysisProps {
  /** Complete audit result data */
  result: AuditResult;
}

interface Correlation {
  metric1: string;
  metric2: string;
  strength: number; // -1 to 1
  type: 'positive' | 'negative';
  insight: string;
  actionable: string;
  priority: 'high' | 'medium' | 'low';
}

interface MetricImpact {
  metric: string;
  currentScore: number;
  potentialImpact: number;
  affectedMetrics: string[];
  recommendation: string;
}

export function CorrelationAnalysis({ result }: CorrelationAnalysisProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('correlations');

  // Calculate correlations between metrics
  const correlations = calculateCorrelations(result);
  
  // Calculate potential impact of improving each metric
  const impacts = calculateMetricImpacts(result, correlations);

  // Sort by priority
  const highPriorityCorrelations = correlations.filter(c => c.priority === 'high');
  const mediumPriorityCorrelations = correlations.filter(c => c.priority === 'medium');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-black/20 border border-purple-500/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-mono text-purple-300 uppercase tracking-wider">
            Correlation Analysis
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Understanding how different metrics influence each other helps prioritize improvements
          for maximum impact. Focus on high-leverage areas that create cascading benefits.
        </p>
      </div>

      {/* Key Correlations */}
      <div className="bg-black/20 border border-slate-800/50">
        <button
          onClick={() => toggleSection('correlations')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/20 transition-all group"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
              Key Metric Relationships
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({highPriorityCorrelations.length} high priority)
            </span>
          </div>
          {expandedSection === 'correlations' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedSection === 'correlations' && (
          <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* High Priority Correlations */}
            {highPriorityCorrelations.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-orange-400 uppercase tracking-wider mb-2">
                  High Priority Relationships
                </div>
                {highPriorityCorrelations.map((corr, idx) => (
                  <CorrelationCard key={idx} correlation={corr} />
                ))}
              </div>
            )}

            {/* Medium Priority Correlations */}
            {mediumPriorityCorrelations.length > 0 && (
              <div className="space-y-2 mt-4">
                <div className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider mb-2">
                  Medium Priority Relationships
                </div>
                {mediumPriorityCorrelations.map((corr, idx) => (
                  <CorrelationCard key={idx} correlation={corr} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Impact Analysis */}
      <div className="bg-black/20 border border-slate-800/50">
        <button
          onClick={() => toggleSection('impacts')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/20 transition-all group"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
              High-Leverage Improvements
            </span>
            <span className="text-xs text-slate-500 font-mono">
              (Top {Math.min(5, impacts.length)} opportunities)
            </span>
          </div>
          {expandedSection === 'impacts' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedSection === 'impacts' && (
          <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {impacts.slice(0, 5).map((impact, idx) => (
              <ImpactCard key={idx} impact={impact} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>

      {/* Insights Summary */}
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 p-4">
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-mono text-purple-300 uppercase tracking-wider mb-2">
              Strategic Insight
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {generateStrategicInsight(result, correlations, impacts)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CorrelationCard Component
 * 
 * Displays a single correlation relationship with visual indicators.
 */
interface CorrelationCardProps {
  correlation: Correlation;
}

function CorrelationCard({ correlation }: CorrelationCardProps) {
  const getStrengthColor = (strength: number) => {
    const absStrength = Math.abs(strength);
    if (absStrength >= 0.7) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (absStrength >= 0.4) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
  };

  const getStrengthLabel = (strength: number) => {
    const absStrength = Math.abs(strength);
    if (absStrength >= 0.7) return 'Strong';
    if (absStrength >= 0.4) return 'Moderate';
    return 'Weak';
  };

  return (
    <div className="bg-black/30 border border-slate-800/30 p-3 rounded hover:border-slate-700/50 transition-all">
      {/* Metrics Relationship */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded">
          {correlation.metric1}
        </span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded">
          {correlation.metric2}
        </span>
        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded ${getStrengthColor(correlation.strength)}`}>
          {getStrengthLabel(correlation.strength)} ({(correlation.strength * 100).toFixed(0)}%)
        </span>
      </div>

      {/* Insight */}
      <div className="mb-2">
        <p className="text-xs text-slate-300 leading-relaxed">
          {correlation.insight}
        </p>
      </div>

      {/* Actionable */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded">
        <div className="flex items-start gap-2">
          <Zap className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300 leading-relaxed">
            {correlation.actionable}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ImpactCard Component
 * 
 * Displays potential impact of improving a specific metric.
 */
interface ImpactCardProps {
  impact: MetricImpact;
  rank: number;
}

function ImpactCard({ impact, rank }: ImpactCardProps) {
  const getImpactColor = (potentialImpact: number) => {
    if (potentialImpact >= 15) return 'text-emerald-400';
    if (potentialImpact >= 10) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="bg-black/30 border border-slate-800/30 p-3 rounded hover:border-slate-700/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 bg-slate-500/10 border border-slate-500/30 px-1.5 py-0.5 rounded">
            #{rank}
          </span>
          <span className="text-sm font-mono text-slate-200">
            {impact.metric}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Potential Impact
          </div>
          <div className={`text-lg font-mono font-bold ${getImpactColor(impact.potentialImpact)}`}>
            +{impact.potentialImpact.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Current Score */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Current:
        </span>
        <span className="text-xs font-mono text-slate-300">
          {impact.currentScore.toFixed(1)}/100
        </span>
      </div>

      {/* Affected Metrics */}
      {impact.affectedMetrics.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
            Also Improves:
          </div>
          <div className="flex flex-wrap gap-1">
            {impact.affectedMetrics.map((metric, idx) => (
              <span
                key={idx}
                className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded"
              >
                {metric}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded">
        <div className="flex items-start gap-2">
          <Target className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-relaxed">
            {impact.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate correlations between metrics
 */
function calculateCorrelations(result: AuditResult): Correlation[] {
  const correlations: Correlation[] = [];
  const scores = result.scores;

  // Schema Markup ↔ Citation Potential (Strong positive)
  if (scores.schemaMarkup < 70 && scores.citationPotential < 70) {
    correlations.push({
      metric1: 'Schema Markup',
      metric2: 'Citation Potential',
      strength: 0.75,
      type: 'positive',
      insight: 'Structured data helps AI systems understand and cite your content more accurately. Better schema markup directly improves citation potential.',
      actionable: 'Add Article, FAQPage, and HowTo schemas to make your content more citable by AI systems.',
      priority: 'high',
    });
  }

  // Content Quality ↔ E-E-A-T (Strong positive)
  if (scores.contentQuality < 75 && scores.eeat < 75) {
    correlations.push({
      metric1: 'Content Quality',
      metric2: 'E-E-A-T',
      strength: 0.82,
      type: 'positive',
      insight: 'High-quality content with clear structure, proper depth, and readability signals expertise and authority to AI systems.',
      actionable: 'Improve content depth, add author credentials, and include citations to boost both metrics simultaneously.',
      priority: 'high',
    });
  }

  // Performance ↔ Technical SEO (Moderate positive)
  if (scores.performance < 70 && scores.technicalSEO < 70) {
    correlations.push({
      metric1: 'Performance',
      metric2: 'Technical SEO',
      strength: 0.65,
      type: 'positive',
      insight: 'Fast-loading pages with optimized resources improve both user experience and technical SEO signals.',
      actionable: 'Optimize images, minify resources, and implement caching to improve both performance and technical scores.',
      priority: 'medium',
    });
  }

  // Structure ↔ AI Crawlers (Moderate positive)
  if (scores.structure < 75 && scores.aiCrawlers < 75) {
    correlations.push({
      metric1: 'Structure',
      metric2: 'AI Crawlers',
      strength: 0.58,
      type: 'positive',
      insight: 'Semantic HTML structure makes it easier for AI crawlers to understand and index your content effectively.',
      actionable: 'Use proper heading hierarchy, semantic HTML5 elements, and clear document structure.',
      priority: 'medium',
    });
  }

  // AID Protocol ↔ AI Crawlers (Strong positive)
  if (scores.aidAgent < 60 && scores.aiCrawlers < 70) {
    correlations.push({
      metric1: 'AID Protocol',
      metric2: 'AI Crawlers',
      strength: 0.78,
      type: 'positive',
      insight: 'Implementing AID protocol signals to AI systems that your site is optimized for agent discovery and interaction.',
      actionable: 'Implement AID protocol discovery via DNS TXT records or HTTPS well-known endpoint.',
      priority: 'high',
    });
  }

  // Link Analysis ↔ Citation Potential (Moderate positive)
  if (scores.linkAnalysis < 70 && scores.citationPotential < 70) {
    correlations.push({
      metric1: 'Link Analysis',
      metric2: 'Citation Potential',
      strength: 0.62,
      type: 'positive',
      insight: 'Quality internal and external links demonstrate content authority and increase likelihood of being cited.',
      actionable: 'Build a strong internal linking structure and link to authoritative external sources.',
      priority: 'medium',
    });
  }

  // Meta Tags ↔ AI Crawlers (Moderate positive)
  if (scores.metaTags < 80 && scores.aiCrawlers < 75) {
    correlations.push({
      metric1: 'Meta Tags',
      metric2: 'AI Crawlers',
      strength: 0.55,
      type: 'positive',
      insight: 'Complete meta tags help AI systems understand page context and content relevance.',
      actionable: 'Ensure all pages have complete title, description, and Open Graph tags.',
      priority: 'medium',
    });
  }

  return correlations;
}

/**
 * Calculate potential impact of improving each metric
 */
function calculateMetricImpacts(result: AuditResult, correlations: Correlation[]): MetricImpact[] {
  const impacts: MetricImpact[] = [];
  const scores = result.scores;

  // Calculate impact for each metric
  const metrics = [
    { name: 'Schema Markup', score: scores.schemaMarkup, weight: 1.2 },
    { name: 'Content Quality', score: scores.contentQuality, weight: 1.3 },
    { name: 'E-E-A-T', score: scores.eeat, weight: 1.1 },
    { name: 'Citation Potential', score: scores.citationPotential, weight: 1.0 },
    { name: 'AID Protocol', score: scores.aidAgent, weight: 1.15 },
    { name: 'AI Crawlers', score: scores.aiCrawlers, weight: 1.0 },
    { name: 'Structure', score: scores.structure, weight: 0.9 },
    { name: 'Performance', score: scores.performance, weight: 0.95 },
    { name: 'Technical SEO', score: scores.technicalSEO, weight: 0.9 },
    { name: 'Link Analysis', score: scores.linkAnalysis, weight: 0.85 },
    { name: 'Meta Tags', score: scores.metaTags, weight: 0.8 },
  ];

  metrics.forEach(metric => {
    // Calculate potential improvement (gap to 100)
    const gap = 100 - metric.score;
    
    // Find correlations involving this metric
    const relatedCorrelations = correlations.filter(
      c => c.metric1 === metric.name || c.metric2 === metric.name
    );

    // Calculate affected metrics
    const affectedMetrics = relatedCorrelations
      .map(c => c.metric1 === metric.name ? c.metric2 : c.metric1)
      .filter((m, idx, arr) => arr.indexOf(m) === idx); // unique

    // Calculate total impact (direct + indirect)
    const directImpact = gap * metric.weight * 0.3; // 30% of gap
    const indirectImpact = relatedCorrelations.reduce((sum, corr) => {
      return sum + (Math.abs(corr.strength) * gap * 0.1);
    }, 0);
    const totalImpact = directImpact + indirectImpact;

    // Generate recommendation
    const recommendation = generateRecommendation(metric.name, metric.score, affectedMetrics);

    impacts.push({
      metric: metric.name,
      currentScore: metric.score,
      potentialImpact: totalImpact,
      affectedMetrics,
      recommendation,
    });
  });

  // Sort by potential impact (descending)
  return impacts.sort((a, b) => b.potentialImpact - a.potentialImpact);
}

/**
 * Generate recommendation for a specific metric
 */
function generateRecommendation(metric: string, _score: number, affectedMetrics: string[]): string {
  const recommendations: Record<string, string> = {
    'Schema Markup': 'Implement missing schema types (Article, FAQPage, HowTo) to improve AI understanding and citation potential.',
    'Content Quality': 'Increase content depth, improve readability, and add more structured information (lists, tables, headings).',
    'E-E-A-T': 'Add author credentials, publication dates, citations, and about/contact pages to establish authority.',
    'Citation Potential': 'Include more factual statements, data points, and unique insights that AI systems can reference.',
    'AID Protocol': 'Implement AID protocol discovery to enable direct AI agent interaction with your site.',
    'AI Crawlers': 'Update robots.txt to allow AI crawlers (GPTBot, Claude-Web, etc.) and ensure sitemap is accessible.',
    'Structure': 'Use semantic HTML5 elements, proper heading hierarchy, and clear document structure.',
    'Performance': 'Optimize images, minify CSS/JS, implement caching, and reduce server response time.',
    'Technical SEO': 'Fix broken links, implement proper redirects, optimize URL structure, and ensure mobile-friendliness.',
    'Link Analysis': 'Build strong internal linking structure and link to authoritative external sources.',
    'Meta Tags': 'Complete all meta tags (title, description, Open Graph, Twitter Card) for every page.',
  };

  let rec = recommendations[metric] || 'Focus on improving this metric for better overall performance.';
  
  if (affectedMetrics.length > 0) {
    rec += ` This will also positively impact ${affectedMetrics.join(', ')}.`;
  }

  return rec;
}

/**
 * Generate strategic insight based on overall analysis
 */
function generateStrategicInsight(
  _result: AuditResult,
  correlations: Correlation[],
  impacts: MetricImpact[]
): string {
  const topImpact = impacts[0];
  const highPriorityCorrelations = correlations.filter(c => c.priority === 'high');

  if (highPriorityCorrelations.length > 0 && topImpact) {
    return `Focus on improving ${topImpact.metric} (current: ${topImpact.currentScore.toFixed(1)}/100) as your highest-leverage opportunity. This single improvement could boost your overall score by up to ${topImpact.potentialImpact.toFixed(1)} points and create positive cascading effects across ${topImpact.affectedMetrics.length} related metrics. The strong correlations identified suggest that strategic improvements in key areas will compound their benefits.`;
  }

  if (topImpact) {
    return `Your highest-leverage opportunity is ${topImpact.metric} with a potential impact of +${topImpact.potentialImpact.toFixed(1)} points. Focus here first for maximum return on effort.`;
  }

  return 'Continue optimizing across all metrics. Your scores show good balance, so incremental improvements in any area will contribute to overall performance.';
}
