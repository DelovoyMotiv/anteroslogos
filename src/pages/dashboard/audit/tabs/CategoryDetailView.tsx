/**
 * CategoryDetailView Component
 * 
 * Displays detailed metrics, issues, and strengths for a selected category.
 * Extracted from DetailedMetrics.tsx to provide focused, category-specific views.
 * 
 * Features:
 * - Category-specific metrics display
 * - Issues and strengths sections
 * - Category-specific visualizations
 * - Smooth transitions between categories
 * - Color-coded score indicators
 * - Progress bars and badges
 * 
 * Requirements:
 * - Content organization: Clear hierarchy of information
 * - Transitions: Smooth fade-in/fade-out effects
 * - Visual feedback: Color-coded scores and indicators
 * 
 * Usage:
 * ```tsx
 * <CategoryDetailView result={result} categoryId="schema" />
 * ```
 */

import { 
  FileCode, 
  Tag, 
  Bot, 
  Award, 
  Layout, 
  Gauge, 
  FileText, 
  Quote, 
  Wrench, 
  Link2, 
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';
import type { CategoryId } from './CategorySidebar';

interface CategoryDetailViewProps {
  /** Complete audit result data */
  result: AuditResult;
  /** Selected category ID */
  categoryId: CategoryId;
}

/**
 * Main CategoryDetailView component
 */
export function CategoryDetailView({ result, categoryId }: CategoryDetailViewProps) {
  const getCategoryData = () => {
    switch (categoryId) {
      case 'schema':
        return {
          title: 'Schema Markup',
          icon: <FileCode className="w-5 h-5" />,
          score: result.scores.schemaMarkup,
          details: result.details.schemaMarkup,
          renderContent: () => <SchemaMarkupView details={result.details.schemaMarkup} />,
        };
      case 'meta':
        return {
          title: 'Meta Tags',
          icon: <Tag className="w-5 h-5" />,
          score: result.scores.metaTags,
          details: result.details.metaTags,
          renderContent: () => <GenericCategoryView />,
        };
      case 'crawlers':
        return {
          title: 'AI Crawlers',
          icon: <Bot className="w-5 h-5" />,
          score: result.scores.aiCrawlers,
          details: result.details.aiCrawlers,
          renderContent: () => <AICrawlersView details={result.details.aiCrawlers} />,
        };
      case 'eeat':
        return {
          title: 'E-E-A-T Signals',
          icon: <Award className="w-5 h-5" />,
          score: result.scores.eeat,
          details: result.details.eeat,
          renderContent: () => <EEATView details={result.details.eeat} />,
        };
      case 'structure':
        return {
          title: 'HTML Structure',
          icon: <Layout className="w-5 h-5" />,
          score: result.scores.structure,
          details: result.details.structure,
          renderContent: () => <StructureView details={result.details.structure} />,
        };
      case 'performance':
        return {
          title: 'Performance',
          icon: <Gauge className="w-5 h-5" />,
          score: result.scores.performance,
          details: result.details.performance,
          renderContent: () => <PerformanceView details={result.details.performance} />,
        };
      case 'content':
        return {
          title: 'Content Quality',
          icon: <FileText className="w-5 h-5" />,
          score: result.scores.contentQuality,
          details: result.details.contentQuality,
          renderContent: () => <ContentQualityView details={result.details.contentQuality} />,
        };
      case 'citation':
        return {
          title: 'Citation Potential',
          icon: <Quote className="w-5 h-5" />,
          score: result.scores.citationPotential,
          details: result.details.citationPotential,
          renderContent: () => <CitationPotentialView details={result.details.citationPotential} />,
        };
      case 'technical':
        return {
          title: 'Technical SEO',
          icon: <Wrench className="w-5 h-5" />,
          score: result.scores.technicalSEO,
          details: result.details.technicalSEO,
          renderContent: () => <TechnicalSEOView details={result.details.technicalSEO} />,
        };
      case 'links':
        return {
          title: 'Link Analysis',
          icon: <Link2 className="w-5 h-5" />,
          score: result.scores.linkAnalysis,
          details: result.details.linkAnalysis,
          renderContent: () => <LinkAnalysisView details={result.details.linkAnalysis} />,
        };
      case 'aid':
        return {
          title: 'AID Protocol',
          icon: <Zap className="w-5 h-5" />,
          score: result.scores.aidAgent,
          details: result.details.aidAgent,
          renderContent: () => <AIDProtocolView details={result.details.aidAgent} />,
        };
      default:
        return null;
    }
  };

  const categoryData = getCategoryData();
  if (!categoryData) return null;

  const { title, icon, score, details, renderContent } = categoryData;

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBorderColor = (s: number) => {
    if (s >= 80) return 'border-emerald-500/30';
    if (s >= 60) return 'border-yellow-500/30';
    if (s >= 40) return 'border-orange-500/30';
    return 'border-red-500/30';
  };

  const getBgColor = (s: number) => {
    if (s >= 80) return 'bg-emerald-500/5';
    if (s >= 60) return 'bg-yellow-500/5';
    if (s >= 40) return 'bg-orange-500/5';
    return 'bg-red-500/5';
  };

  // Extract issues and strengths (handle different detail structures)
  const issues = 'issues' in details ? details.issues : ('errors' in details ? details.errors : []);
  const strengths = 'strengths' in details ? details.strengths : [];

  return (
    <div 
      className={`${getBgColor(score)} border ${getBorderColor(score)} p-6 space-y-6 animate-fadeIn`}
      key={categoryId}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={getScoreColor(score)}>{icon}</span>
          <h2 className="text-lg font-mono text-slate-200 uppercase tracking-wider">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Score</div>
            <div className={`text-3xl font-bold font-mono ${getScoreColor(score)}`}>
              {score.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Score Progress Bar */}
      <div className="relative">
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreColor(score).replace('text-', 'bg-')} transition-all duration-500 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-600 font-mono">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Category-Specific Content */}
      <div className="space-y-4">
        {renderContent()}
      </div>

      {/* Strengths Section */}
      {strengths.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
              Strengths ({strengths.length})
            </h3>
          </div>
          <ul className="space-y-2">
            {strengths.map((strength, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2 animate-slideIn" style={{ animationDelay: `${idx * 50}ms` }}>
                <span className="text-emerald-400 mt-1 flex-shrink-0">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues Section */}
      {issues.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider">
              Issues ({issues.length})
            </h3>
          </div>
          <ul className="space-y-2">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-sm text-slate-400 flex items-start gap-2 animate-slideIn" style={{ animationDelay: `${idx * 50}ms` }}>
                <span className="text-red-400 mt-1 flex-shrink-0">⚠</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No Data Message */}
      {issues.length === 0 && strengths.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500 italic">
            No detailed information available for this category
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Category-Specific View Components
// ============================================================================

/**
 * Schema Markup View
 */
function SchemaMarkupView({ details }: { details: any }) {
  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Schemas" value={details.totalSchemas} />
        <MetricCard label="Valid Schemas" value={details.validSchemas} valueColor="text-emerald-400" />
        <MetricCard 
          label="Graph Structure" 
          value={details.hasGraphStructure ? 'Yes' : 'No'}
          valueColor={details.hasGraphStructure ? 'text-emerald-400' : 'text-slate-500'}
        />
        <MetricCard label="Schema Errors" value={details.schemaErrors.length} valueColor={details.schemaErrors.length > 0 ? 'text-red-400' : 'text-slate-500'} />
      </div>

      {/* Schema Types Grid */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Schema Types Present
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(details.schemas).map(([type, present]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              {present ? (
                <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-slate-700 flex-shrink-0" />
              )}
              <span className={present ? 'text-slate-300' : 'text-slate-600'}>
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Critical Schemas */}
      {details.missingCriticalSchemas.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3">
            Missing Critical Schemas
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.missingCriticalSchemas.map((schema: string) => (
              <span key={schema} className="text-xs bg-red-500/10 border border-red-500/30 px-2 py-1 rounded text-red-400">
                {schema}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Content Quality View
 */
function ContentQualityView({ details }: { details: any }) {
  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Word Count" value={details.wordCount.toLocaleString()} />
        <MetricCard label="Readability" value={details.readabilityScore.toFixed(1)} />
        <MetricCard label="AI Readability" value={details.aiReadabilityScore.toFixed(1)} />
        <MetricCard label="Paragraphs" value={details.paragraphCount} />
      </div>

      {/* Content Structure */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Content Structure
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Avg Paragraph" value={`${details.averageParagraphLength} words`} />
          <MetricCard label="Avg Sentence" value={`${details.averageSentenceLength} words`} />
          <MetricCard label="Content Depth" value={details.contentDepth} />
          <MetricCard label="Passive Voice" value={`${details.passiveVoicePercentage}%`} />
          <MetricCard label="Jargon Density" value={`${details.jargonDensity}%`} />
          <MetricCard label="Info Density" value={`${details.informationDensity}%`} />
        </div>
      </div>

      {/* Media & Links */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Media & Links
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Images" value={details.imageCount} />
          <MetricCard label="Videos" value={details.videoCount} />
          <MetricCard label="Internal Links" value={details.internalLinks} />
          <MetricCard label="External Links" value={details.externalLinks} />
        </div>
      </div>
    </div>
  );
}

/**
 * Citation Potential View
 */
function CitationPotentialView({ details }: { details: any }) {
  return (
    <div className="space-y-4">
      {/* Citation Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="Factual Statements" value={details.factualStatements} />
        <MetricCard label="Data Points" value={details.dataPoints} />
        <MetricCard label="Quotes" value={details.quotes} />
        <MetricCard label="References" value={details.references} />
        <MetricCard label="Definitions" value={details.definitions} />
        <MetricCard label="Unique Insights" value={details.uniqueInsights} />
      </div>

      {/* Authority Indicators */}
      {details.authorityIndicators.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3">
            Authority Indicators
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.authorityIndicators.map((indicator: string, idx: number) => (
              <span key={idx} className="text-xs bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-emerald-400">
                {indicator}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Link Analysis View - Enhanced with Anchor Text Patterns, Link Context, and Domain Authority
 */
function LinkAnalysisView({ details }: { details: any }) {
  return (
    <div className="space-y-4">
      {/* Link Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Links" value={details.totalLinks} />
        <MetricCard label="Internal" value={details.internalLinks} valueColor="text-blue-400" />
        <MetricCard label="External" value={details.externalLinks} valueColor="text-purple-400" />
        <MetricCard label="Nofollow" value={details.nofollowLinks} />
      </div>

      {/* Link Quality */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Link Quality
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Nofollow Ratio" value={`${details.nofollowRatio.toFixed(1)}%`} />
          <MetricCard label="Anchor Quality" value={`${details.anchorTextQuality}%`} />
          <MetricCard label="Empty Anchors" value={details.emptyAnchors} valueColor={details.emptyAnchors > 0 ? 'text-red-400' : 'text-emerald-400'} />
          <MetricCard label="Link Depth" value={details.linkDepth} />
        </div>
      </div>

      {/* Enhanced: Anchor Text Patterns */}
      {details.anchorTextPatterns && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3">
            Anchor Text Patterns
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard label="Exact Match" value={details.anchorTextPatterns.exactMatch} valueColor="text-yellow-400" />
            <MetricCard label="Partial Match" value={details.anchorTextPatterns.partialMatch} valueColor="text-emerald-400" />
            <MetricCard label="Branded" value={details.anchorTextPatterns.branded} valueColor="text-blue-400" />
            <MetricCard label="Generic" value={details.anchorTextPatterns.generic} valueColor="text-slate-400" />
            <MetricCard label="Naked URL" value={details.anchorTextPatterns.nakedUrl} valueColor="text-orange-400" />
            <MetricCard label="Image" value={details.anchorTextPatterns.image} valueColor="text-purple-400" />
          </div>
        </div>
      )}

      {/* Enhanced: Link Context Distribution */}
      {details.linkContextDistribution && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-3">
            Link Context Distribution
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard label="Main Content" value={details.linkContextDistribution.mainContent} valueColor="text-emerald-400" />
            <MetricCard label="Navigation" value={details.linkContextDistribution.navigation} valueColor="text-blue-400" />
            <MetricCard label="Header" value={details.linkContextDistribution.header} valueColor="text-cyan-400" />
            <MetricCard label="Footer" value={details.linkContextDistribution.footer} valueColor="text-slate-400" />
            <MetricCard label="Sidebar" value={details.linkContextDistribution.sidebar} valueColor="text-purple-400" />
            <MetricCard label="Other" value={details.linkContextDistribution.other} valueColor="text-slate-500" />
          </div>
        </div>
      )}

      {/* Enhanced: Follow/Nofollow Distribution */}
      {details.followDistribution && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-3">
            Follow/Nofollow Distribution
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Internal Follow" value={details.followDistribution.internalFollow} valueColor="text-emerald-400" />
            <MetricCard label="Internal Nofollow" value={details.followDistribution.internalNofollow} valueColor="text-slate-400" />
            <MetricCard label="External Follow" value={details.followDistribution.externalFollow} valueColor="text-blue-400" />
            <MetricCard label="External Nofollow" value={details.followDistribution.externalNofollow} valueColor="text-slate-400" />
          </div>
        </div>
      )}

      {/* Enhanced: External Domain Quality */}
      {details.externalDomainQuality && (
        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-3">
            External Domain Authority Distribution
          </h4>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricCard label="High Authority (DA 70+)" value={details.externalDomainQuality.highAuthority} valueColor="text-emerald-400" />
            <MetricCard label="Medium Authority (DA 40-69)" value={details.externalDomainQuality.mediumAuthority} valueColor="text-yellow-400" />
            <MetricCard label="Low Authority (DA 0-39)" value={details.externalDomainQuality.lowAuthority} valueColor="text-red-400" />
          </div>
          
          {/* Top External Domains by Authority */}
          {details.externalDomainQuality.topDomains && details.externalDomainQuality.topDomains.length > 0 && (
            <div>
              <h5 className="text-[10px] font-mono text-amber-300 uppercase tracking-wider mb-2">
                Top External Domains by Authority
              </h5>
              <div className="space-y-2">
                {details.externalDomainQuality.topDomains.slice(0, 5).map((domain: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-black/20 p-2 rounded">
                    <span className="text-slate-400 truncate flex-1">{domain.domain}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                        domain.estimatedAuthority >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                        domain.estimatedAuthority >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        DA {domain.estimatedAuthority}
                      </span>
                      <span className="text-amber-400 font-mono text-xs">{domain.linkCount} links</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Internal Pages */}
      {details.topInternalPages.length > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3">
            Top Internal Pages
          </h4>
          <div className="space-y-2">
            {details.topInternalPages.map((page: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-400 truncate flex-1">{page.url}</span>
                <span className="text-blue-400 ml-2 font-mono">{page.count} links</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Domains */}
      {details.externalDomains.length > 0 && (
        <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3">
            External Domains ({details.externalDomains.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.externalDomains.slice(0, 10).map((domain: string, idx: number) => (
              <span key={idx} className="text-xs bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded text-purple-400">
                {domain}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Performance View
 */
function PerformanceView({ details }: { details: any }) {
  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="HTML Size" value={`${(details.htmlSize / 1024).toFixed(1)} KB`} />
        <MetricCard label="External Scripts" value={details.externalScripts} />
        <MetricCard label="External Styles" value={details.externalStyles} />
        <MetricCard label="Images" value={details.images} />
        <MetricCard label="Total Resources" value={details.totalResources} />
        <MetricCard 
          label="Lazy Loading" 
          value={details.hasLazyLoading ? 'Yes' : 'No'}
          valueColor={details.hasLazyLoading ? 'text-emerald-400' : 'text-slate-500'}
        />
      </div>

      {/* Resource Breakdown Visualization */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Resource Breakdown
        </h4>
        <div className="space-y-3">
          <ResourceBar label="Scripts" value={details.externalScripts} max={details.totalResources} color="bg-yellow-500" />
          <ResourceBar label="Styles" value={details.externalStyles} max={details.totalResources} color="bg-blue-500" />
          <ResourceBar label="Images" value={details.images} max={details.totalResources} color="bg-purple-500" />
        </div>
      </div>
    </div>
  );
}

/**
 * Structure View
 */
function StructureView({ details }: { details: any }) {
  return (
    <div className="space-y-4">
      {/* Structure Flags */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <FlagCard label="Semantic HTML" present={details.hasSemanticHTML} />
        <FlagCard label="Heading Hierarchy" present={details.headingHierarchy} />
        <FlagCard label="Has Nav" present={details.hasNav} />
        <FlagCard label="Has Main" present={details.hasMain} />
        <FlagCard label="Has Footer" present={details.hasFooter} />
        <MetricCard label="H1 Count" value={details.h1Count} valueColor={details.h1Count === 1 ? 'text-emerald-400' : 'text-yellow-400'} />
      </div>

      {/* Heading Distribution */}
      <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Heading Distribution
        </h4>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(details.headingCount).map(([tag, count]) => (
            <div key={tag} className="bg-black/30 border border-slate-800/30 p-2 rounded text-center">
              <div className="text-xs text-slate-500 uppercase font-mono">{tag}</div>
              <div className="text-lg font-bold text-slate-300 font-mono">{count as number}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * AI Crawlers View
 */
function AICrawlersView({ details }: { details: any }) {
  const crawlers = [
    { name: 'GPTBot', allowed: details.allowsGPTBot },
    { name: 'Claude', allowed: details.allowsClaude },
    { name: 'Perplexity', allowed: details.allowsPerplexity },
    { name: 'Google Extended', allowed: details.allowsGoogleExtended },
    { name: 'Anthropic AI', allowed: details.allowsAnthropicAI },
    { name: 'Cohere', allowed: details.allowsCohere },
    { name: 'CCBot', allowed: details.allowsCCBot },
  ];

  const allowedCount = crawlers.filter(c => c.allowed).length;
  const blockedCount = crawlers.length - allowedCount;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Crawlers" value={crawlers.length} />
        <MetricCard label="Allowed" value={allowedCount} valueColor="text-emerald-400" />
        <MetricCard label="Blocked" value={blockedCount} valueColor={blockedCount > 0 ? 'text-red-400' : 'text-slate-500'} />
        <MetricCard label="Access Rate" value={`${((allowedCount / crawlers.length) * 100).toFixed(0)}%`} />
      </div>

      {/* Crawler Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {crawlers.map((crawler) => (
          <div 
            key={crawler.name}
            className={`bg-black/30 border ${crawler.allowed ? 'border-emerald-500/30' : 'border-red-500/30'} p-3 rounded-lg flex items-center gap-3`}
          >
            {crawler.allowed ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-mono text-slate-300">{crawler.name}</div>
              <div className={`text-xs font-mono ${crawler.allowed ? 'text-emerald-400' : 'text-red-400'}`}>
                {crawler.allowed ? 'Allowed' : 'Blocked'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * E-E-A-T View
 */
function EEATView({ details }: { details: any }) {
  const signals = [
    { label: 'Author Info', present: details.hasAuthorInfo },
    { label: 'Credentials', present: details.hasCredentials },
    { label: 'About Page', present: details.hasAboutPage },
    { label: 'Contact Info', present: details.hasContactInfo },
    { label: 'Publication Date', present: details.hasPublicationDate },
    { label: 'Update Date', present: details.hasUpdateDate },
    { label: 'Citations', present: details.hasCitations },
    { label: 'Expert Quotes', present: details.hasExpertQuotes },
    { label: 'Trust Badges', present: details.hasTrustBadges },
    { label: 'Privacy Policy', present: details.hasPrivacyPolicy },
    { label: 'Terms of Service', present: details.hasTermsOfService },
  ];

  const presentCount = signals.filter(s => s.present).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Signals" value={signals.length} />
        <MetricCard label="Present" value={presentCount} valueColor="text-emerald-400" />
        <MetricCard label="Missing" value={signals.length - presentCount} valueColor="text-red-400" />
        <MetricCard label="Content Freshness" value={`${details.contentFreshness}%`} />
      </div>

      {/* E-E-A-T Signals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {signals.map((signal) => (
          <FlagCard key={signal.label} label={signal.label} present={signal.present} />
        ))}
      </div>
    </div>
  );
}

/**
 * Technical SEO View
 */
function TechnicalSEOView({ details }: { details: any }) {
  const flags = [
    { label: 'HTTPS', present: details.isHTTPS, critical: true },
    { label: 'Viewport', present: details.hasViewport },
    { label: 'Charset', present: details.hasCharset },
    { label: 'Lang', present: details.hasLang },
    { label: 'Canonical', present: details.hasCanonical },
    { label: 'Hreflang', present: details.hasHreflang },
    { label: 'Alternate Mobile', present: details.hasAlternateMobile },
    { label: 'AMP', present: details.hasAMP },
    { label: 'Sitemap XML', present: details.hasSitemapXML },
    { label: 'Robots.txt', present: details.hasRobotsTxt },
    { label: 'Security Headers', present: details.hasSecurityHeaders },
    { label: 'No Index', present: !details.hasNoIndex, critical: true },
  ];

  return (
    <div className="space-y-4">
      {/* Technical Flags Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {flags.map((flag) => (
          <FlagCard key={flag.label} label={flag.label} present={flag.present} critical={flag.critical} />
        ))}
      </div>

      {/* Technical Details */}
      {details.viewport && (
        <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
            Technical Details
          </h4>
          <div className="space-y-2">
            <DetailRow label="Viewport" value={details.viewport} />
            <DetailRow label="Charset" value={details.charset} />
            <DetailRow label="Language" value={details.lang} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AID Protocol View
 */
function AIDProtocolView({ details }: { details: any }) {
  return (
    <div className="space-y-4">
      {/* Detection Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard 
          label="Detection Status" 
          value={details.detected ? 'Detected' : 'Not Detected'}
          valueColor={details.detected ? 'text-emerald-400' : 'text-red-400'}
        />
        <MetricCard 
          label="Discovery Method" 
          value={details.discoveryMethod.toUpperCase()}
        />
        {details.version && (
          <MetricCard label="Protocol Version" value={details.version} />
        )}
      </div>

      {/* Protocols Supported */}
      {details.protocols && details.protocols.length > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3">
            Supported Protocols
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.protocols.map((protocol: string) => (
              <span key={protocol} className="text-xs bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded text-blue-400 font-mono">
                {protocol.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Endpoint Info */}
      {details.endpoint && (
        <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
            Endpoint Information
          </h4>
          <div className="space-y-2">
            <DetailRow label="Endpoint URL" value={details.endpoint} />
            {details.agentName && (
              <DetailRow label="Service Name" value={details.agentName} />
            )}
          </div>
        </div>
      )}

      {/* Capabilities */}
      {details.capabilities && details.capabilities.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3">
            Capabilities
          </h4>
          <div className="flex flex-wrap gap-2">
            {details.capabilities.map((cap: string, idx: number) => (
              <span key={idx} className="text-xs bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-emerald-400">
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {details.errors && details.errors.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3">
            Errors
          </h4>
          <div className="space-y-2">
            {details.errors.map((error: string, idx: number) => (
              <div key={idx} className="text-sm text-red-400 flex items-start gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {details.warnings && details.warnings.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg">
          <h4 className="text-xs font-mono text-yellow-400 uppercase tracking-wider mb-3">
            Warnings
          </h4>
          <div className="space-y-2">
            {details.warnings.map((warning: string, idx: number) => (
              <div key={idx} className="text-sm text-yellow-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generic Category View (for categories without specific visualizations)
 */
function GenericCategoryView() {
  return (
    <div className="bg-black/20 border border-slate-800/50 p-4 rounded-lg">
      <p className="text-sm text-slate-400 italic">
        Detailed metrics for this category are displayed in the issues and strengths sections below.
      </p>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Metric Card - Displays a single metric with label and value
 */
function MetricCard({ 
  label, 
  value, 
  valueColor = 'text-slate-300' 
}: { 
  label: string; 
  value: string | number; 
  valueColor?: string;
}) {
  return (
    <div className="bg-black/30 border border-slate-800/30 p-3 rounded-lg">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-sm font-bold font-mono ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Flag Card - Displays a boolean flag with check/cross icon
 */
function FlagCard({ 
  label, 
  present, 
  critical = false 
}: { 
  label: string; 
  present: boolean; 
  critical?: boolean;
}) {
  const color = critical 
    ? (present ? 'emerald' : 'red') 
    : (present ? 'emerald' : 'slate');
  
  return (
    <div className={`bg-black/30 border border-${color}-500/30 p-3 rounded-lg flex items-center gap-2`}>
      {present ? (
        <CheckCircle className={`w-4 h-4 text-${color}-500 flex-shrink-0`} />
      ) : (
        <XCircle className={`w-4 h-4 text-${color === 'red' ? 'red' : 'slate'}-${color === 'red' ? '500' : '700'} flex-shrink-0`} />
      )}
      <div className={`text-xs font-mono ${present ? 'text-slate-300' : 'text-slate-600'}`}>
        {label}
      </div>
    </div>
  );
}

/**
 * Resource Bar - Displays a horizontal bar chart for resource breakdown
 */
function ResourceBar({ 
  label, 
  value, 
  max, 
  color 
}: { 
  label: string; 
  value: number; 
  max: number; 
  color: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 font-mono">{label}</span>
        <span className="text-xs text-slate-500 font-mono">{value}</span>
      </div>
      <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Detail Row - Displays a label-value pair
 */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500 font-mono">{label}:</span>
      <span className="text-slate-300 font-mono text-right break-all">{value}</span>
    </div>
  );
}
