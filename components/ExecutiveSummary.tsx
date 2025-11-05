import { Shield, Zap, Target, AlertTriangle, CheckCircle, Activity, Globe } from 'lucide-react';
import { AuditResult } from '../utils/geoAuditEnhanced';

interface ExecutiveSummaryProps {
  result: AuditResult;
  advancedMetrics?: {
    coreWebVitals?: { performanceScore: number; lcpGrade: string; fidGrade: string; clsGrade: string };
    security?: { securityScore: number; sslGrade: string; isHTTPS: boolean };
    mobile?: { mobileFriendlyScore: number; isResponsive: boolean };
    accessibility?: { accessibilityScore: number; wcagLevel: string };
    international?: { internationalScore: number; isMultilingual: boolean };
  };
}

const ExecutiveSummary = ({ result, advancedMetrics }: ExecutiveSummaryProps) => {
  // Calculate key metrics
  const aiReadiness = Math.round(
    (result.scores.schemaMarkup + result.scores.aiCrawlers + result.scores.eeat) / 3
  );
  
  const technicalHealth = Math.round(
    (result.scores.technicalSEO + result.scores.performance + result.scores.structure) / 3
  );
  
  const contentScore = Math.round(
    (result.scores.contentQuality + result.scores.citationPotential) / 2
  );
  
  const criticalIssues = result.recommendations.filter(r => r.priority === 'critical').length;
  const highPriorityIssues = result.recommendations.filter(r => r.priority === 'high').length;

  // Calculate performance from advanced metrics or fallback
  const performanceScore = advancedMetrics?.coreWebVitals?.performanceScore ?? result.scores.performance;
  const securityScore = advancedMetrics?.security?.securityScore ?? (result.details.technicalSEO.isHTTPS ? 75 : 30);
  const mobileScore = advancedMetrics?.mobile?.mobileFriendlyScore ?? 70;
  const accessibilityScore = advancedMetrics?.accessibility?.accessibilityScore ?? 60;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
    if (score >= 40) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getGradeBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500/20 text-green-300' };
    if (score >= 75) return { label: 'Good', color: 'bg-blue-500/20 text-blue-300' };
    if (score >= 60) return { label: 'Fair', color: 'bg-yellow-500/20 text-yellow-300' };
    if (score >= 40) return { label: 'Poor', color: 'bg-orange-500/20 text-orange-300' };
    return { label: 'Critical', color: 'bg-red-500/20 text-red-300' };
  };

  const kpiCards = [
    {
      title: 'AI Readiness',
      score: aiReadiness,
      icon: Zap,
      description: 'Schema, AI Crawlers, E-E-A-T',
      trend: aiReadiness >= 70 ? '+' : aiReadiness >= 50 ? '=' : '-',
    },
    {
      title: 'Technical Health',
      score: technicalHealth,
      icon: Activity,
      description: 'SEO, Performance, Structure',
      trend: technicalHealth >= 70 ? '+' : technicalHealth >= 50 ? '=' : '-',
    },
    {
      title: 'Content Quality',
      score: contentScore,
      icon: Target,
      description: 'Quality & Citation Potential',
      trend: contentScore >= 70 ? '+' : contentScore >= 50 ? '=' : '-',
    },
    {
      title: 'Security Score',
      score: securityScore,
      icon: Shield,
      description: 'HTTPS, Headers, Compliance',
      trend: securityScore >= 70 ? '+' : securityScore >= 50 ? '=' : '-',
      badge: advancedMetrics?.security?.sslGrade,
    },
  ];

  const supplementaryMetrics = [
    {
      label: 'Core Web Vitals',
      score: performanceScore,
      grade: advancedMetrics?.coreWebVitals ? 
        `LCP: ${advancedMetrics.coreWebVitals.lcpGrade}, FID: ${advancedMetrics.coreWebVitals.fidGrade}` : 
        'Not measured',
    },
    {
      label: 'Mobile-Friendly',
      score: mobileScore,
      grade: advancedMetrics?.mobile?.isResponsive ? 'Responsive' : 'Needs work',
    },
    {
      label: 'Accessibility',
      score: accessibilityScore,
      grade: advancedMetrics?.accessibility?.wcagLevel ?? 'Not rated',
    },
    {
      label: 'Link Analysis',
      score: result.scores.linkAnalysis,
      grade: `${result.details.linkAnalysis.totalLinks} links`,
    },
  ];

  return (
    <div className="mb-8 space-y-4">
      {/* Compact Header with Alerts */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Executive Summary</h3>
          <p className="text-white/50 text-xs">High-level AI optimization status</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalIssues > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/40 rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-300">{criticalIssues} Critical</span>
            </div>
          )}
          {highPriorityIssues > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/20 border border-orange-500/40 rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-semibold text-orange-300">{highPriorityIssues} High Priority</span>
            </div>
          )}
        </div>
      </div>

      {/* Compact KPI Cards - 2 rows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          const badge = getGradeBadge(kpi.score);
          
          return (
            <div
              key={index}
              className={`p-3 border rounded-lg transition-all hover:border-brand-accent/50 ${getScoreBg(kpi.score)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${getScoreColor(kpi.score)}`} />
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              
              <h4 className="font-semibold text-sm text-white mb-0.5">{kpi.title}</h4>
              <p className="text-[10px] text-white/40 mb-2 leading-tight">{kpi.description}</p>
              
              <div className="flex items-baseline gap-1">
                <div className={`text-2xl font-bold tabular-nums ${getScoreColor(kpi.score)}`}>
                  {kpi.score}
                </div>
                <div className="text-[10px] text-white/30">/ 100</div>
              </div>

              {/* Mini Progress Bar */}
              <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    kpi.score >= 80 ? 'bg-green-400' :
                    kpi.score >= 60 ? 'bg-yellow-400' :
                    kpi.score >= 40 ? 'bg-orange-400' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${kpi.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Supplementary Metrics */}
      <div className="grid grid-cols-4 gap-2">
        {supplementaryMetrics.map((metric, index) => (
          <div
            key={index}
            className="p-2 bg-white/5 border border-brand-secondary/50 rounded hover:border-brand-accent/30 transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/40 font-medium">{metric.label}</span>
              {metric.score >= 80 ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : metric.score >= 60 ? (
                <CheckCircle className="w-3 h-3 text-yellow-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-orange-400" />
              )}
            </div>
            <div className={`text-xl font-bold tabular-nums ${getScoreColor(metric.score)}`}>
              {metric.score}
            </div>
            <div className="text-[9px] text-white/30 truncate">{metric.grade}</div>
          </div>
        ))}
      </div>

      {/* Compact Overall Health Indicator */}
      <div className="p-4 bg-gradient-to-br from-brand-accent/10 to-transparent border border-brand-accent/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getScoreBg(result.overallScore)}`}>
              <Globe className={`w-5 h-5 ${getScoreColor(result.overallScore)}`} />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-0.5">Overall GEO Health</h4>
              <p className="text-xs text-white/50 leading-tight">
                {result.overallScore >= 90 ? 'Exceptional AI optimization. You\'re ahead of 95% of websites.' :
                 result.overallScore >= 75 ? 'Strong foundation. Minor improvements will maximize visibility.' :
                 result.overallScore >= 60 ? 'Good start. Focus on critical issues for major gains.' :
                 result.overallScore >= 40 ? 'Needs attention. Follow action plan to improve AI citations.' :
                 'Critical issues detected. Immediate action required for AI visibility.'}
              </p>
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <div className={`text-3xl font-bold tabular-nums ${getScoreColor(result.overallScore)}`}>
              {result.overallScore}%
            </div>
            <div className="text-xs text-white/30 mt-0.5">{result.grade} Grade</div>
          </div>
        </div>
      </div>

      {/* Ultra-Compact Quick Stats */}
      <div className="grid grid-cols-6 gap-2">
        <div className="p-2 bg-white/5 rounded text-center">
          <div className="text-[9px] text-white/40 mb-0.5 uppercase font-medium">Schemas</div>
          <div className="text-base font-bold tabular-nums">{result.details.schemaMarkup.validSchemas}</div>
        </div>
        <div className="p-2 bg-white/5 rounded text-center">
          <div className="text-[9px] text-white/40 mb-0.5 uppercase font-medium">AI Crawlers</div>
          <div className="text-base font-bold tabular-nums">{result.details.aiCrawlers.totalAICrawlers}</div>
        </div>
        <div className="p-2 bg-white/5 rounded text-center">
          <div className="text-[9px] text-white/40 mb-0.5 uppercase font-medium">Word Count</div>
          <div className="text-base font-bold tabular-nums">{result.details.contentQuality.wordCount}</div>
        </div>
        <div className="p-2 bg-white/5 rounded text-center">
          <div className="text-[9px] text-white/40 mb-0.5 uppercase font-medium">Links</div>
          <div className="text-base font-bold tabular-nums">{result.details.linkAnalysis.totalLinks}</div>
        </div>
        <div className="p-2 bg-white/5 rounded text-center">
          <div className="text-[9px] text-white/40 mb-0.5 uppercase font-medium">Images</div>
          <div className="text-base font-bold tabular-nums">{result.details.contentQuality.imageCount}</div>
        </div>
        <div className="p-2 bg-white/5 rounded text-center">
          <div className="text-[9px] text-white/40 mb-0.5 uppercase font-medium">Issues</div>
          <div className="text-base font-bold text-orange-400 tabular-nums">{criticalIssues + highPriorityIssues}</div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;
