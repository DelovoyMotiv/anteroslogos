import { Shield, Zap, Target, TrendingUp, AlertTriangle, CheckCircle, Activity, Globe } from 'lucide-react';
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
    <div className="mb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold mb-2">Executive Summary</h3>
          <p className="text-white/60 text-sm">
            High-level overview of your website's AI optimization status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {criticalIssues > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-300">{criticalIssues} Critical</span>
            </div>
          )}
          {highPriorityIssues > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">{highPriorityIssues} High Priority</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          const badge = getGradeBadge(kpi.score);
          
          return (
            <div
              key={index}
              className={`p-5 border rounded-xl transition-all hover:border-brand-accent/50 ${getScoreBg(kpi.score)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${getScoreBg(kpi.score)}`}>
                  <Icon className={`w-5 h-5 ${getScoreColor(kpi.score)}`} />
                </div>
                {kpi.badge && (
                  <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-bold">
                    {kpi.badge}
                  </span>
                )}
              </div>
              
              <h4 className="font-semibold text-white mb-1">{kpi.title}</h4>
              <p className="text-xs text-white/50 mb-3">{kpi.description}</p>
              
              <div className="flex items-end justify-between">
                <div>
                  <div className={`text-3xl font-bold ${getScoreColor(kpi.score)}`}>
                    {kpi.score}
                  </div>
                  <div className="text-xs text-white/40">/ 100</div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge.color}`}>
                    {badge.label}
                  </span>
                  {kpi.trend === '+' && (
                    <TrendingUp className="w-4 h-4 text-green-400 mt-1" />
                  )}
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
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

      {/* Supplementary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {supplementaryMetrics.map((metric, index) => (
          <div
            key={index}
            className="p-4 bg-white/5 border border-brand-secondary rounded-lg hover:border-brand-accent/30 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">{metric.label}</span>
              {metric.score >= 80 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : metric.score >= 60 ? (
                <CheckCircle className="w-4 h-4 text-yellow-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-orange-400" />
              )}
            </div>
            <div className={`text-2xl font-bold mb-1 ${getScoreColor(metric.score)}`}>
              {metric.score}
            </div>
            <div className="text-xs text-white/40">{metric.grade}</div>
          </div>
        ))}
      </div>

      {/* Overall Health Indicator */}
      <div className="p-6 bg-gradient-to-br from-brand-accent/10 to-transparent border border-brand-accent/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${getScoreBg(result.overallScore)}`}>
              <Globe className={`w-6 h-6 ${getScoreColor(result.overallScore)}`} />
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">Overall GEO Health</h4>
              <p className="text-sm text-white/60">
                {result.overallScore >= 90 ? 'Exceptional AI optimization. You\'re ahead of 95% of websites.' :
                 result.overallScore >= 75 ? 'Strong foundation. Minor improvements will maximize visibility.' :
                 result.overallScore >= 60 ? 'Good start. Focus on critical issues for major gains.' :
                 result.overallScore >= 40 ? 'Needs attention. Follow action plan to improve AI citations.' :
                 'Critical issues detected. Immediate action required for AI visibility.'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(result.overallScore)}`}>
              {result.overallScore}%
            </div>
            <div className="text-sm text-white/40 mt-1">{result.grade} Grade</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3 bg-white/5 rounded-lg text-center">
          <div className="text-xs text-white/50 mb-1">Schemas</div>
          <div className="text-lg font-bold">{result.details.schemaMarkup.validSchemas}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg text-center">
          <div className="text-xs text-white/50 mb-1">AI Crawlers</div>
          <div className="text-lg font-bold">{result.details.aiCrawlers.totalAICrawlers}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg text-center">
          <div className="text-xs text-white/50 mb-1">Word Count</div>
          <div className="text-lg font-bold">{result.details.contentQuality.wordCount}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg text-center">
          <div className="text-xs text-white/50 mb-1">Links</div>
          <div className="text-lg font-bold">{result.details.linkAnalysis.totalLinks}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg text-center">
          <div className="text-xs text-white/50 mb-1">Images</div>
          <div className="text-lg font-bold">{result.details.contentQuality.imageCount}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg text-center">
          <div className="text-xs text-white/50 mb-1">Issues</div>
          <div className="text-lg font-bold text-orange-400">{criticalIssues + highPriorityIssues}</div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;
