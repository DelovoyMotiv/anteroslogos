/**
 * Detailed Metrics Component
 * Shows comprehensive metrics for each category
 */

import { FileText, Link as LinkIcon, Code, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { AuditResult } from '../../../../utils/geoAuditEnhanced';

interface DetailedMetricsProps {
  result: AuditResult;
}

// Helper function to get score color
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function DetailedMetrics({ result }: DetailedMetricsProps) {
  return (
    <div className="space-y-4">
      {/* Schema Markup Detailed */}
      <MetricSection
        title="Schema Markup Details"
        icon={<Code className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="Total Schemas" value={result.details.schemaMarkup.totalSchemas} />
          <MetricItem label="Valid Schemas" value={result.details.schemaMarkup.validSchemas} />
          <MetricItem 
            label="Graph Structure" 
            value={result.details.schemaMarkup.hasGraphStructure ? 'Yes' : 'No'}
            valueColor={result.details.schemaMarkup.hasGraphStructure ? 'text-emerald-400' : 'text-slate-500'}
          />
          <MetricItem label="Schema Errors" value={result.details.schemaMarkup.schemaErrors.length} />
        </div>
        
        {/* Schema Types Grid */}
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
            Schema Types Present
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(result.details.schemaMarkup.schemas).map(([type, present]) => (
              <div key={type} className="flex items-center gap-2">
                {present ? (
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-slate-700" />
                )}
                <span className={`text-xs ${present ? 'text-slate-300' : 'text-slate-600'}`}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {result.details.schemaMarkup.missingCriticalSchemas.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-red-400 uppercase tracking-wider mb-2">
              Missing Critical Schemas
            </div>
            <div className="flex flex-wrap gap-2">
              {result.details.schemaMarkup.missingCriticalSchemas.map((schema) => (
                <span key={schema} className="text-xs bg-red-500/10 border border-red-500/30 px-2 py-1 rounded text-red-400">
                  {schema}
                </span>
              ))}
            </div>
          </div>
        )}
      </MetricSection>

      {/* Content Quality Detailed */}
      <MetricSection
        title="Content Quality Metrics"
        icon={<FileText className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="Word Count" value={result.details.contentQuality.wordCount.toLocaleString()} />
          <MetricItem label="Readability" value={result.details.contentQuality.readabilityScore.toFixed(1)} />
          <MetricItem label="AI Readability" value={result.details.contentQuality.aiReadabilityScore.toFixed(1)} />
          <MetricItem label="Paragraphs" value={result.details.contentQuality.paragraphCount} />
          <MetricItem label="Avg Paragraph" value={`${result.details.contentQuality.averageParagraphLength} words`} />
          <MetricItem label="Avg Sentence" value={`${result.details.contentQuality.averageSentenceLength} words`} />
          <MetricItem label="Images" value={result.details.contentQuality.imageCount} />
          <MetricItem label="Videos" value={result.details.contentQuality.videoCount} />
          <MetricItem label="Internal Links" value={result.details.contentQuality.internalLinks} />
          <MetricItem label="External Links" value={result.details.contentQuality.externalLinks} />
          <MetricItem label="Content Depth" value={result.details.contentQuality.contentDepth} />
          <MetricItem label="Passive Voice" value={`${result.details.contentQuality.passiveVoicePercentage}%`} />
          <MetricItem label="Jargon Density" value={`${result.details.contentQuality.jargonDensity}%`} />
          <MetricItem label="Sentence Type" value={result.details.contentQuality.sentenceComplexity} />
          <MetricItem label="Info Density" value={`${result.details.contentQuality.informationDensity}%`} />
          <MetricItem label="Technical Terms" value={result.details.contentQuality.technicalTermCount} />
        </div>
      </MetricSection>

      {/* Citation Potential Detailed */}
      <MetricSection
        title="Citation Potential Metrics"
        icon={<FileText className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="Factual Statements" value={result.details.citationPotential.factualStatements} />
          <MetricItem label="Data Points" value={result.details.citationPotential.dataPoints} />
          <MetricItem label="Quotes" value={result.details.citationPotential.quotes} />
          <MetricItem label="References" value={result.details.citationPotential.references} />
          <MetricItem label="Definitions" value={result.details.citationPotential.definitions} />
          <MetricItem label="Unique Insights" value={result.details.citationPotential.uniqueInsights} />
        </div>
        
        {result.details.citationPotential.authorityIndicators.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-2">
              Authority Indicators
            </div>
            <div className="flex flex-wrap gap-2">
              {result.details.citationPotential.authorityIndicators.map((indicator, idx) => (
                <span key={idx} className="text-xs bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-emerald-400">
                  {indicator}
                </span>
              ))}
            </div>
          </div>
        )}
      </MetricSection>

      {/* Link Analysis Detailed */}
      <MetricSection
        title="Link Analysis Metrics"
        icon={<LinkIcon className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="Total Links" value={result.details.linkAnalysis.totalLinks} />
          <MetricItem label="Internal" value={result.details.linkAnalysis.internalLinks} />
          <MetricItem label="External" value={result.details.linkAnalysis.externalLinks} />
          <MetricItem label="Nofollow" value={result.details.linkAnalysis.nofollowLinks} />
          <MetricItem label="Nofollow Ratio" value={`${result.details.linkAnalysis.nofollowRatio.toFixed(1)}%`} />
          <MetricItem label="Unique Internal" value={result.details.linkAnalysis.uniqueInternalLinks} />
          <MetricItem label="Unique External" value={result.details.linkAnalysis.uniqueExternalLinks} />
          <MetricItem label="Anchor Quality" value={`${result.details.linkAnalysis.anchorTextQuality}%`} />
          <MetricItem label="Empty Anchors" value={result.details.linkAnalysis.emptyAnchors} />
          <MetricItem label="Image Links" value={result.details.linkAnalysis.imageLinks} />
          <MetricItem label="Link Depth" value={result.details.linkAnalysis.linkDepth} />
          <MetricItem label="Distribution" value={result.details.linkAnalysis.linkDistribution} />
        </div>

        {result.details.linkAnalysis.topInternalPages.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-2">
              Top Internal Pages
            </div>
            <div className="space-y-1">
              {result.details.linkAnalysis.topInternalPages.map((page, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate flex-1">{page.url}</span>
                  <span className="text-blue-400 ml-2">{page.count} links</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.details.linkAnalysis.externalDomains.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider mb-2">
              External Domains ({result.details.linkAnalysis.externalDomains.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {result.details.linkAnalysis.externalDomains.slice(0, 10).map((domain, idx) => (
                <span key={idx} className="text-xs bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded text-purple-400">
                  {domain}
                </span>
              ))}
            </div>
          </div>
        )}
      </MetricSection>

      {/* Performance Detailed */}
      <MetricSection
        title="Performance Metrics"
        icon={<Zap className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="HTML Size" value={`${(result.details.performance.htmlSize / 1024).toFixed(1)} KB`} />
          <MetricItem label="External Scripts" value={result.details.performance.externalScripts} />
          <MetricItem label="External Styles" value={result.details.performance.externalStyles} />
          <MetricItem label="Images" value={result.details.performance.images} />
          <MetricItem label="Total Resources" value={result.details.performance.totalResources} />
          <MetricItem 
            label="Lazy Loading" 
            value={result.details.performance.hasLazyLoading ? 'Yes' : 'No'}
            valueColor={result.details.performance.hasLazyLoading ? 'text-emerald-400' : 'text-slate-500'}
          />
        </div>
      </MetricSection>

      {/* Structure Detailed */}
      <MetricSection
        title="HTML Structure Metrics"
        icon={<Code className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem label="H1 Count" value={result.details.structure.h1Count} />
          <MetricItem 
            label="Semantic HTML" 
            value={result.details.structure.hasSemanticHTML ? 'Yes' : 'No'}
            valueColor={result.details.structure.hasSemanticHTML ? 'text-emerald-400' : 'text-slate-500'}
          />
          <MetricItem 
            label="Heading Hierarchy" 
            value={result.details.structure.headingHierarchy ? 'Valid' : 'Invalid'}
            valueColor={result.details.structure.headingHierarchy ? 'text-emerald-400' : 'text-red-400'}
          />
          <MetricItem 
            label="Has Nav" 
            value={result.details.structure.hasNav ? 'Yes' : 'No'}
            valueColor={result.details.structure.hasNav ? 'text-emerald-400' : 'text-slate-500'}
          />
          <MetricItem 
            label="Has Main" 
            value={result.details.structure.hasMain ? 'Yes' : 'No'}
            valueColor={result.details.structure.hasMain ? 'text-emerald-400' : 'text-slate-500'}
          />
          <MetricItem 
            label="Has Footer" 
            value={result.details.structure.hasFooter ? 'Yes' : 'No'}
            valueColor={result.details.structure.hasFooter ? 'text-emerald-400' : 'text-slate-500'}
          />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
            Heading Distribution
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(result.details.structure.headingCount).map(([tag, count]) => (
              <div key={tag} className="bg-black/30 border border-slate-800/30 p-2 rounded text-center">
                <div className="text-xs text-slate-500 uppercase">{tag}</div>
                <div className="text-lg font-bold text-slate-300">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </MetricSection>

      {/* AI Crawlers Detailed */}
      <MetricSection
        title="AI Crawlers Access"
        icon={<Code className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CrawlerStatus label="GPTBot" allowed={result.details.aiCrawlers.allowsGPTBot} />
          <CrawlerStatus label="Claude" allowed={result.details.aiCrawlers.allowsClaude} />
          <CrawlerStatus label="Perplexity" allowed={result.details.aiCrawlers.allowsPerplexity} />
          <CrawlerStatus label="Google Extended" allowed={result.details.aiCrawlers.allowsGoogleExtended} />
          <CrawlerStatus label="Anthropic AI" allowed={result.details.aiCrawlers.allowsAnthropicAI} />
          <CrawlerStatus label="Cohere" allowed={result.details.aiCrawlers.allowsCohere} />
          <CrawlerStatus label="CCBot" allowed={result.details.aiCrawlers.allowsCCBot} />
          <MetricItem label="Total Allowed" value={result.details.aiCrawlers.totalAICrawlers} />
        </div>
      </MetricSection>

      {/* E-E-A-T Detailed */}
      <MetricSection
        title="E-E-A-T Signals"
        icon={<CheckCircle className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <EEATFlag label="Author Info" present={result.details.eeat.hasAuthorInfo} />
          <EEATFlag label="Credentials" present={result.details.eeat.hasCredentials} />
          <EEATFlag label="About Page" present={result.details.eeat.hasAboutPage} />
          <EEATFlag label="Contact Info" present={result.details.eeat.hasContactInfo} />
          <EEATFlag label="Publication Date" present={result.details.eeat.hasPublicationDate} />
          <EEATFlag label="Update Date" present={result.details.eeat.hasUpdateDate} />
          <EEATFlag label="Citations" present={result.details.eeat.hasCitations} />
          <EEATFlag label="Expert Quotes" present={result.details.eeat.hasExpertQuotes} />
          <EEATFlag label="Trust Badges" present={result.details.eeat.hasTrustBadges} />
          <EEATFlag label="Privacy Policy" present={result.details.eeat.hasPrivacyPolicy} />
          <EEATFlag label="Terms of Service" present={result.details.eeat.hasTermsOfService} />
          <MetricItem label="Content Freshness" value={`${result.details.eeat.contentFreshness}%`} />
        </div>
      </MetricSection>

      {/* Technical SEO Detailed */}
      <MetricSection
        title="Technical SEO Flags"
        icon={<Code className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TechFlag label="HTTPS" present={result.details.technicalSEO.isHTTPS} />
          <TechFlag label="Viewport" present={result.details.technicalSEO.hasViewport} />
          <TechFlag label="Charset" present={result.details.technicalSEO.hasCharset} />
          <TechFlag label="Lang" present={result.details.technicalSEO.hasLang} />
          <TechFlag label="Canonical" present={result.details.technicalSEO.hasCanonical} />
          <TechFlag label="Hreflang" present={result.details.technicalSEO.hasHreflang} />
          <TechFlag label="Alternate Mobile" present={result.details.technicalSEO.hasAlternateMobile} />
          <TechFlag label="AMP" present={result.details.technicalSEO.hasAMP} />
          <TechFlag label="Sitemap XML" present={result.details.technicalSEO.hasSitemapXML} />
          <TechFlag label="Robots.txt" present={result.details.technicalSEO.hasRobotsTxt} />
          <TechFlag label="Security Headers" present={result.details.technicalSEO.hasSecurityHeaders} />
          <TechFlag label="No Index" present={!result.details.technicalSEO.hasNoIndex} critical />
        </div>

        {result.details.technicalSEO.viewport && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <MetricItem label="Viewport" value={result.details.technicalSEO.viewport} />
            <MetricItem label="Charset" value={result.details.technicalSEO.charset} />
            <MetricItem label="Language" value={result.details.technicalSEO.lang} />
          </div>
        )}
      </MetricSection>

      {/* AID Protocol Detailed */}
      <MetricSection
        title="AID Protocol Discovery"
        icon={<Zap className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricItem 
            label="Detection Status" 
            value={result.details.aidAgent.detected ? 'Detected' : 'Not Detected'}
            valueColor={result.details.aidAgent.detected ? 'text-emerald-400' : 'text-red-400'}
          />
          <MetricItem 
            label="Discovery Method" 
            value={result.details.aidAgent.discoveryMethod.toUpperCase()}
          />
          {result.details.aidAgent.version && (
            <MetricItem 
              label="Protocol Version" 
              value={result.details.aidAgent.version}
            />
          )}
          <MetricItem 
            label="Score" 
            value={result.scores.aidAgent.toFixed(1)}
            valueColor={getScoreColor(result.scores.aidAgent)}
          />
        </div>

        {/* Protocols Supported */}
        {result.details.aidAgent.protocols && result.details.aidAgent.protocols.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Supported Protocols
            </div>
            <div className="flex flex-wrap gap-2">
              {result.details.aidAgent.protocols.map((protocol) => (
                <span key={protocol} className="text-xs bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded text-blue-400">
                  {protocol.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Endpoint Info */}
        {result.details.aidAgent.endpoint && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <MetricItem 
              label="Endpoint URL" 
              value={result.details.aidAgent.endpoint}
            />
            {result.details.aidAgent.agentName && (
              <MetricItem 
                label="Service Name" 
                value={result.details.aidAgent.agentName}
              />
            )}
          </div>
        )}

        {/* Capabilities */}
        {result.details.aidAgent.capabilities && result.details.aidAgent.capabilities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-2">
              Capabilities
            </div>
            <div className="flex flex-wrap gap-2">
              {result.details.aidAgent.capabilities.map((cap, idx) => (
                <span key={idx} className="text-xs bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-emerald-400">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {result.details.aidAgent.errors && result.details.aidAgent.errors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-red-400 uppercase tracking-wider mb-2">
              Errors
            </div>
            <div className="space-y-1">
              {result.details.aidAgent.errors.map((error, idx) => (
                <div key={idx} className="text-xs text-red-400 flex items-start gap-2">
                  <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.details.aidAgent.warnings && result.details.aidAgent.warnings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider mb-2">
              Warnings
            </div>
            <div className="space-y-1">
              {result.details.aidAgent.warnings.map((warning, idx) => (
                <div key={idx} className="text-xs text-yellow-400 flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </MetricSection>
    </div>
  );
}

// Helper Components
function MetricSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-black/20 border border-slate-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-blue-400">{icon}</div>
        <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function MetricItem({ label, value, valueColor = 'text-slate-300' }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="bg-black/30 border border-slate-800/30 p-2 rounded">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-sm font-bold font-mono ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}

function CrawlerStatus({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className={`bg-black/30 border ${allowed ? 'border-emerald-500/30' : 'border-slate-800/30'} p-2 rounded flex items-center gap-2`}>
      {allowed ? (
        <CheckCircle className="w-3 h-3 text-emerald-500" />
      ) : (
        <XCircle className="w-3 h-3 text-slate-700" />
      )}
      <div className="flex-1">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        <div className={`text-xs font-bold ${allowed ? 'text-emerald-400' : 'text-slate-600'}`}>
          {allowed ? 'Allowed' : 'Blocked'}
        </div>
      </div>
    </div>
  );
}

function EEATFlag({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`bg-black/30 border ${present ? 'border-emerald-500/30' : 'border-slate-800/30'} p-2 rounded flex items-center gap-2`}>
      {present ? (
        <CheckCircle className="w-3 h-3 text-emerald-500" />
      ) : (
        <XCircle className="w-3 h-3 text-slate-700" />
      )}
      <div className="text-xs ${present ? 'text-slate-300' : 'text-slate-600'}">
        {label}
      </div>
    </div>
  );
}

function TechFlag({ label, present, critical = false }: { label: string; present: boolean; critical?: boolean }) {
  const color = critical ? (present ? 'emerald' : 'red') : (present ? 'emerald' : 'slate');
  
  return (
    <div className={`bg-black/30 border border-${color}-500/30 p-2 rounded flex items-center gap-2`}>
      {present ? (
        <CheckCircle className={`w-3 h-3 text-${color}-500`} />
      ) : (
        <XCircle className={`w-3 h-3 text-${color === 'red' ? 'red' : 'slate'}-${color === 'red' ? '500' : '700'}`} />
      )}
      <div className={`text-xs text-${present ? 'slate-300' : 'slate-600'}`}>
        {label}
      </div>
    </div>
  );
}
