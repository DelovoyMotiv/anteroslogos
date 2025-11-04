import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditWebsite, type AuditResult } from '../utils/geoAuditEnhanced';
import { Search, AlertCircle, CheckCircle, TrendingUp, Download, Share2, ExternalLink, Award, Target, Zap, TrendingDown, Minus, History, Shield, FileText } from 'lucide-react';
import { saveAuditToHistory, compareWithPrevious, checkScoreDrop } from '../utils/auditHistory';
import { validateAndSanitizeUrl, checkRateLimit, validateAuditResult } from '../utils/urlValidator';
import { generatePDFReport } from '../utils/pdfReportGenerator';
import { exportToCSV, exportToMarkdown, exportToHTML } from '../utils/exportFormats';
import { analyzeAndGenerateAlerts, type Alert } from '../utils/monitoringAlerts';
import { analyzeTrend, generatePerformanceInsights, type TrendAnalysis, type PerformanceInsights } from '../utils/advancedAnalytics';
import { generateCompetitiveComparison, updateCompetitorData, type CompetitiveComparison } from '../utils/competitiveIntelligence';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnalysisProgress from '../components/AnalysisProgress';
import ScoreRadarChart from '../components/charts/ScoreRadarChart';
import ScoreTrendChart from '../components/charts/ScoreTrendChart';
import PriorityMatrix from '../components/charts/PriorityMatrix';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import ExecutiveSummary from '../components/ExecutiveSummary';
import SEOHead from '../components/SEOHead';
import RealtimeMonitorPanel from '../components/RealtimeMonitorPanel';

const GeoAuditPage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState<ReturnType<typeof compareWithPrevious> | null>(null);
  const [scoreDrop, setScoreDrop] = useState<ReturnType<typeof checkScoreDrop> | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trend, setTrend] = useState<TrendAnalysis | null>(null);
  const [insights, setInsights] = useState<PerformanceInsights | null>(null);
  const [competitive, setCompetitive] = useState<CompetitiveComparison | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setComparison(null);
    setScoreDrop(null);

    // 1. Rate limiting check
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.error || 'Rate limit exceeded');
      return;
    }

    // 2. Input validation and sanitization
    const validation = validateAndSanitizeUrl(url);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    const sanitizedUrl = validation.sanitizedUrl!;

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.log('URL validation warnings:', validation.warnings);
    }

    setIsAnalyzing(true);
    
    try {
      const auditResult = await auditWebsite(sanitizedUrl);
      
      // 3. Validate audit result
      if (!validateAuditResult(auditResult)) {
        throw new Error('Invalid audit result received');
      }
      
      // Save to history
      saveAuditToHistory(auditResult);
      
      // Get comparison with previous audit
      const comp = compareWithPrevious(auditResult);
      setComparison(comp);
      
      // Check for score drops
      const drop = checkScoreDrop(auditResult.url, auditResult.overallScore);
      setScoreDrop(drop);
      
      // Generate monitoring alerts
      const generatedAlerts = analyzeAndGenerateAlerts(auditResult);
      setAlerts(generatedAlerts);
      console.log('Generated alerts:', generatedAlerts);
      
      // Analyze trends with advanced analytics
      const urlHistory = (await import('../utils/auditHistory')).getUrlHistory(auditResult.url);
      if (urlHistory.length >= 2) {
        const trendAnalysis = analyzeTrend(urlHistory);
        setTrend(trendAnalysis);
        console.log('Trend analysis:', trendAnalysis);
        
        const perfInsights = generatePerformanceInsights(urlHistory);
        setInsights(perfInsights);
        console.log('Performance insights:', perfInsights);
      }
      
      // Update competitor data if this is a tracked competitor
      updateCompetitorData(auditResult.url, auditResult);
      
      // Generate competitive comparison
      const competitiveComparison = generateCompetitiveComparison(auditResult.url, auditResult);
      setCompetitive(competitiveComparison);
      if (competitiveComparison) {
        console.log('Competitive comparison:', competitiveComparison);
      }
      
      setResult(auditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze website');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number): string => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  const downloadReport = () => {
    if (!result) return;
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `geo-audit-${new URL(result.url).hostname}-${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const downloadCSVReport = () => {
    if (!result) return;
    try {
      exportToCSV(result);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV report. Please try again.');
    }
  };

  const downloadMarkdownReport = () => {
    if (!result) return;
    try {
      exportToMarkdown(result);
    } catch (error) {
      console.error('Failed to export Markdown:', error);
      alert('Failed to export Markdown report. Please try again.');
    }
  };

  const downloadHTMLReport = () => {
    if (!result) return;
    try {
      exportToHTML(result);
    } catch (error) {
      console.error('Failed to export HTML:', error);
      alert('Failed to export HTML report. Please try again.');
    }
  };

  const downloadPDFReport = async () => {
    if (!result) return;
    try {
      await generatePDFReport(result, {
        includeCharts: true,
        includeRecommendations: true,
        includeDetails: true,
        companyName: 'Anóteros Lógos',
        reportDate: new Date().toLocaleDateString(),
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  const shareResults = () => {
    if (!result) return;
    const text = `I analyzed ${result.url} with GEO Audit Tool and got a score of ${result.overallScore}/100! Check your site's AI optimization: https://anoteroslogos.com/geo-audit`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  // Generate structured data for the page
  const pageSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://anoteroslogos.com/geo-audit#webpage",
        "url": "https://anoteroslogos.com/geo-audit",
        "name": "Free GEO Score Calculator | AI-Ready Website Analysis Tool",
        "description": "Instantly analyze your website's readiness for AI-powered search engines. Get a comprehensive GEO score with actionable recommendations to optimize for generative AI systems like ChatGPT, Gemini, and Perplexity.",
        "isPartOf": {
          "@id": "https://anoteroslogos.com/#website"
        },
        "about": {
          "@id": "https://anoteroslogos.com/#organization"
        },
        "datePublished": "2024-01-01T00:00:00+00:00",
        "dateModified": "2025-11-04T00:00:00+00:00",
        "inLanguage": "en-US",
        "potentialAction": {
          "@type": "AnalyzeAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://anoteroslogos.com/geo-audit",
            "actionPlatform": [
              "http://schema.org/DesktopWebPlatform",
              "http://schema.org/MobileWebPlatform"
            ]
          },
          "object": {
            "@type": "WebSite",
            "name": "Website to analyze"
          },
          "result": {
            "@type": "Report",
            "name": "GEO Score Report"
          }
        },
        "mainEntity": {
          "@id": "https://anoteroslogos.com/geo-audit#tool"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://anoteroslogos.com/geo-audit#tool",
        "name": "GEO Score Calculator",
        "applicationCategory": "WebApplication",
        "operatingSystem": "Any",
        "description": "Advanced website analysis tool that evaluates your site's optimization for AI-powered search engines and generative AI systems. Provides comprehensive scoring across 8 key dimensions including Schema Markup, AI Crawler Support, E-E-A-T Signals, Content Quality, and Citation Potential.",
        "url": "https://anoteroslogos.com/geo-audit",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "featureList": [
          "Schema Markup Analysis (20% weight) - Evaluates 16+ schema types including Organization, Person, Article, Product, Review, HowTo",
          "AI Crawler Support (18% weight) - Checks robots.txt for GPTBot, Claude, Perplexity, Google-Extended",
          "E-E-A-T Signals (18% weight) - Analyzes Experience, Expertise, Authoritativeness, and Trustworthiness",
          "Meta Tags Validation (12% weight) - Validates title, description, OG tags, Twitter Card, canonical",
          "Content Quality Assessment (10% weight) - Measures word count, readability, structure, multimedia",
          "HTML Structure (8% weight) - Assesses HTML5 semantics, heading hierarchy, accessibility",
          "Performance Metrics (8% weight) - Evaluates HTML size, script optimization, lazy loading",
          "Citation Potential (6% weight) - Calculates factual statements, data points, quotes, references",
          "Visual Analytics Dashboard",
          "Actionable Recommendations",
          "PDF Report Generation",
          "Historical Trend Analysis",
          "Competitive Intelligence"
        ],
        "screenshot": "https://anoteroslogos.com/images/geo-audit-screenshot.jpg",
        "provider": {
          "@id": "https://anoteroslogos.com/#organization"
        },
        "author": {
          "@id": "https://anoteroslogos.com/#organization"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "157",
          "bestRating": "5",
          "worstRating": "1"
        },
        "softwareVersion": "2.0",
        "softwareHelp": {
          "@type": "CreativeWork",
          "url": "https://anoteroslogos.com/knowledge-base"
        }
      },
      {
        "@type": "HowTo",
        "name": "How to Use the GEO Score Calculator",
        "description": "Step-by-step guide to analyze your website's AI-readiness using our free GEO Score Calculator tool.",
        "totalTime": "PT2M",
        "step": [
          {
            "@type": "HowToStep",
            "position": 1,
            "name": "Enter Website URL",
            "text": "Type or paste your website URL into the input field. The tool accepts any format (with or without protocol).",
            "url": "https://anoteroslogos.com/geo-audit#analyze"
          },
          {
            "@type": "HowToStep",
            "position": 2,
            "name": "Click Analyze",
            "text": "Click the 'Analyze' button to start the comprehensive website audit. The tool will evaluate 8 key dimensions of GEO optimization.",
            "url": "https://anoteroslogos.com/geo-audit#analyze"
          },
          {
            "@type": "HowToStep",
            "position": 3,
            "name": "Review Your Score",
            "text": "Examine your overall GEO score (0-100) and detailed breakdown across categories like Schema Markup, AI Crawlers, E-E-A-T, and Content Quality.",
            "url": "https://anoteroslogos.com/geo-audit#results"
          },
          {
            "@type": "HowToStep",
            "position": 4,
            "name": "Implement Recommendations",
            "text": "Follow the prioritized action plan with specific, actionable recommendations to improve your site's AI optimization and citation potential.",
            "url": "https://anoteroslogos.com/geo-audit#recommendations"
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://anoteroslogos.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "GEO Score Calculator",
            "item": "https://anoteroslogos.com/geo-audit"
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <SEOHead
        title="Free GEO Score Calculator | AI-Ready Website Analysis | Anóteros Lógos"
        description="Instantly analyze your website's readiness for AI-powered search engines like ChatGPT, Gemini, and Perplexity. Get a comprehensive GEO score with actionable recommendations. Free tool from the GEO experts at Anóteros Lógos."
        url="https://anoteroslogos.com/geo-audit"
        type="website"
        image="https://anoteroslogos.com/images/geo-audit-og.jpg"
        imageAlt="GEO Score Calculator - Free AI-Ready Website Analysis Tool"
        keywords="GEO score calculator, AI optimization tool, generative engine optimization, website AI readiness, ChatGPT optimization, AI search optimization, schema markup checker, E-E-A-T analyzer, free SEO tool, GEO audit"
        author="Anóteros Lógos"
        modifiedTime="2025-11-04T00:00:00+00:00"
        schema={pageSchema}
      />
      {/* Analysis Progress Overlay */}
      <AnalysisProgress isAnalyzing={isAnalyzing} url={url} />
      
      <Header 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
      {/* Hero Section */}
      <section className="relative pb-20 md:pb-32 overflow-hidden" style={{ paddingTop: 'calc(var(--header-height) + 3rem)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent)]"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
            <TrendingUp className="w-4 h-4 text-brand-accent" />
            <span className="font-mono text-xs tracking-wider uppercase text-brand-accent">Free GEO Analysis Tool</span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
              GEO Score Calculator
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Instantly analyze your website's readiness for AI-powered search. Get a comprehensive GEO score with actionable recommendations.
          </p>

          {/* Analysis Form */}
          <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto mb-8">
            {/* Desktop: Input with button inside */}
            <div className="hidden lg:block relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your website URL (e.g., example.com)"
                className="w-full px-6 py-5 pr-40 bg-white/5 border-2 border-brand-secondary focus:border-brand-accent rounded-xl text-lg focus:outline-none transition-colors"
                disabled={isAnalyzing}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                maxLength={2048}
                pattern="[^<>{}[\]|;`]*"
                title="Enter a valid website URL"
              />
              <button
                type="submit"
                disabled={isAnalyzing}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-accent hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Mobile: Stacked input and button */}
            <div className="lg:hidden space-y-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL (e.g., example.com)"
                className="w-full px-6 py-4 bg-white/5 border-2 border-brand-secondary focus:border-brand-accent rounded-xl text-base focus:outline-none transition-colors"
                disabled={isAnalyzing}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                maxLength={2048}
                pattern="[^<>{}[\]|;`]*"
                title="Enter a valid website URL"
              />
              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full bg-brand-accent hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing Your Site...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Analyze Website</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Security Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/40">
            <Shield className="w-3 h-3" />
            <span>Input validated • Rate limited • XSS protected</span>
          </div>

          {/* Features Grid - Only show if no results */}
          {!result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { title: 'Schema Analysis', desc: 'Check JSON-LD structured data' },
              { title: 'AI Crawler Support', desc: 'Verify robots.txt for AI bots' },
              { title: 'E-E-A-T Signals', desc: 'Measure expertise & authority' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      {result && (
        <section className="py-8 px-4 lg:px-6">
          <div className="max-w-[1800px] mx-auto">
            {/* Overall Score - Minimalist Header */}
            <div className="mb-12 py-6">
              <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6">
                {/* Left: Title + Domain */}
                <div className="flex flex-col items-center lg:items-start gap-1 flex-shrink-0">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Overall GEO Score</h2>
                  <p className="text-sm text-white/40 break-all max-w-[280px] text-center lg:text-left">
                    {new URL(result.url).hostname}
                  </p>
                </div>
                
                {/* Center: Score Display + Grade */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center">
                    <div className={`text-7xl font-bold leading-none tabular-nums ${getScoreColor(result.overallScore)}`} style={{
                      textShadow: `0 0 40px ${getScoreColor(result.overallScore).includes('green') ? '#34d39960' : getScoreColor(result.overallScore).includes('yellow') ? '#fbbf2460' : getScoreColor(result.overallScore).includes('red') ? '#f8717160' : '#60a5fa60'}`
                    }}>
                      {result.overallScore}
                    </div>
                    <div className="text-white/30 text-xs mt-1 font-light">/ 100</div>
                  </div>
                  
                  {/* Grade Badge */}
                  {result.grade && (
                    <div className="flex flex-col items-center gap-1">
                      <Award className={`w-8 h-8 ${
                        result.grade === 'Authority' ? 'text-purple-400' :
                        result.grade === 'Expert' ? 'text-green-400' :
                        result.grade === 'Advanced' ? 'text-blue-400' :
                        result.grade === 'Intermediate' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`} />
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        result.grade === 'Authority' ? 'text-purple-400' :
                        result.grade === 'Expert' ? 'text-green-400' :
                        result.grade === 'Advanced' ? 'text-blue-400' :
                        result.grade === 'Intermediate' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {result.grade}
                      </span>
                    </div>
                  )}
                  
                  {/* Score Change Indicator */}
                  {comparison?.changes && (
                    <div className="flex flex-col items-center justify-center gap-1">
                      {comparison.changes.overallScore > 0 ? (
                        <>
                          <TrendingUp className="w-6 h-6 text-green-400" />
                          <span className="text-green-400 font-bold text-lg tabular-nums">+{comparison.changes.overallScore}</span>
                        </>
                      ) : comparison.changes.overallScore < 0 ? (
                        <>
                          <TrendingDown className="w-6 h-6 text-red-400" />
                          <span className="text-red-400 font-bold text-lg tabular-nums">{comparison.changes.overallScore}</span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-6 h-6 text-gray-400" />
                          <span className="text-gray-400 text-lg font-medium tabular-nums">0</span>
                        </>
                      )}
                      <span className="text-white/30 text-xs">vs prev</span>
                    </div>
                  )}
                </div>
                
                {/* Right: Export & Share Buttons */}
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-center lg:justify-end">
                  <button
                    onClick={downloadPDFReport}
                    className="p-2.5 hover:bg-white/5 rounded-lg transition-all group"
                    title="Download PDF Report"
                    aria-label="Download professional PDF report"
                  >
                    <FileText className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={downloadHTMLReport}
                    className="p-2.5 hover:bg-white/5 rounded-lg transition-all group"
                    title="Download HTML Report"
                    aria-label="Download standalone HTML report"
                  >
                    <FileText className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={downloadMarkdownReport}
                    className="p-2.5 hover:bg-white/5 rounded-lg transition-all group"
                    title="Download Markdown Report"
                    aria-label="Download markdown report for GitHub/docs"
                  >
                    <FileText className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={downloadCSVReport}
                    className="p-2.5 hover:bg-white/5 rounded-lg transition-all group"
                    title="Download CSV Report"
                    aria-label="Download CSV report for data analysis"
                  >
                    <Download className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={downloadReport}
                    className="p-2.5 hover:bg-white/5 rounded-lg transition-all group"
                    title="Download JSON"
                    aria-label="Download JSON report"
                  >
                    <Download className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
                  </button>
                  <button
                    onClick={shareResults}
                    className="p-2.5 hover:bg-white/5 rounded-lg transition-all group"
                    title="Share on Twitter"
                    aria-label="Share results on Twitter"
                  >
                    <Share2 className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
                  </button>
                </div>
              </div>
            </div>

            {/* Score Drop Alert */}
            {scoreDrop?.dropped && (
              <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">⚠️ Score Drop Detected</h3>
                    <p className="text-white/80 mb-2">
                      Your GEO score dropped by <strong>{Math.abs(scoreDrop.difference)} points</strong> (from {scoreDrop.previousScore} to {result.overallScore}).
                      This indicates potential issues that need immediate attention.
                    </p>
                    <p className="text-sm text-white/60">
                      Review the detailed findings below to identify what changed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Executive Summary Dashboard */}
            <ExecutiveSummary result={result} />

            {/* Insights */}
            {result.insights && result.insights.length > 0 && (
              <div className="mb-16">
                <h3 className="text-xl font-bold text-white mb-6 tracking-tight">Key Insights</h3>
                <div className="space-y-4">
                  {result.insights.map((insight, i) => (
                    <p key={i} className="text-white/70 pl-4 border-l border-blue-400/40 text-sm leading-relaxed">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Analytics - Optimized Layout */}
            <div className="mb-16">
              <h3 className="text-xl font-bold text-white mb-6 tracking-tight">Visual Analytics</h3>
              {/* Top Row: Charts 3 columns on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div className="lg:col-span-1">
                  <ScoreRadarChart 
                    scores={result.scores} 
                    comparison={comparison?.previous?.scores}
                  />
                </div>
                <div className="lg:col-span-1">
                  <CategoryBarChart scores={result.scores} />
                </div>
                <div className="lg:col-span-1">
                  <PriorityMatrix recommendations={result.recommendations} />
                </div>
              </div>
              {/* Bottom Row: Trend Chart Full Width */}
              <div className="w-full">
                <ScoreTrendChart url={result.url} />
              </div>
            </div>

            {/* Score Breakdown - Minimalist Grid */}
            <div className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white tracking-tight">Score Breakdown</h3>
                {comparison?.previous && (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <History className="w-3 h-3" />
                    <span>vs. {new Date(comparison.previous.timestamp).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {Object.entries(result.scores).map(([key, score]) => {
                  const change = comparison?.changes?.[key as keyof typeof comparison.changes] || 0;
                  return (
                  <div key={key} className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-xs text-white/40 uppercase tracking-wider font-medium">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      {change !== 0 && (
                        <span className={`text-xs font-semibold tabular-nums ${
                          change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      )}
                    </div>
                    <div className={`text-4xl font-bold tabular-nums ${getScoreColor(score)}`}>
                      {score}
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${getScoreGradient(score)} transition-all duration-1000`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Findings - Minimalist Grid */}
            <div className="mb-16">
              <h3 className="text-xl font-bold text-white mb-6 tracking-tight">Detailed Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                {Object.entries(result.details).map(([category, details]) => (
                  <div key={category} className="space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      {category.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    
                    {details.strengths.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-green-400 font-semibold uppercase tracking-wider">Strengths</p>
                        <ul className="space-y-2">
                          {details.strengths.map((strength, i) => (
                            <li key={i} className="text-xs text-white/60 flex items-start gap-2 leading-relaxed">
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {details.issues.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider">Issues</p>
                        <ul className="space-y-2">
                          {details.issues.map((issue, i) => (
                            <li key={i} className="text-xs text-white/60 flex items-start gap-2 leading-relaxed">
                              <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Monitoring Alerts */}
            {alerts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  Monitoring Alerts ({alerts.length})
                </h3>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 border rounded-xl ${
                        alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/40' :
                        alert.severity === 'high' ? 'bg-orange-500/10 border-orange-500/40' :
                        alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/40' :
                        'bg-blue-500/10 border-blue-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                          alert.severity === 'critical' ? 'text-red-400' :
                          alert.severity === 'high' ? 'text-orange-400' :
                          alert.severity === 'medium' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${
                              alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                              alert.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                              alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-xs text-white/40">{alert.category}</span>
                          </div>
                          <h4 className="font-bold mb-1">{alert.title}</h4>
                          <p className="text-sm text-white/70 mb-2">{alert.message}</p>
                          {alert.recommendation && (
                            <p className="text-xs text-brand-accent">💡 {alert.recommendation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Analytics - Trends & Insights */}
            {(trend || insights) && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-brand-accent" />
                  Performance Analytics
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {trend && (
                    <div className="p-4 bg-white/5 border border-brand-secondary rounded-xl">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        📈 Trend Analysis
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          trend.direction === 'improving' ? 'bg-green-500/20 text-green-300' :
                          trend.direction === 'declining' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {trend.direction}
                        </span>
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Trend Slope:</span>
                          <span className="font-mono text-brand-accent">{trend.slope} pts/audit</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Confidence:</span>
                          <span className="font-mono">{Math.round(trend.confidence * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Volatility:</span>
                          <span className="font-mono">{trend.volatility}</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-white/10">
                          <p className="text-white/60 text-xs mb-2">Forecast:</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-white/50 text-xs">7 days:</span>
                              <span className="font-mono text-xs">{trend.forecast.next7Days}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50 text-xs">30 days:</span>
                              <span className="font-mono text-xs">{trend.forecast.next30Days}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {insights && (
                    <div className="p-4 bg-white/5 border border-brand-secondary rounded-xl">
                      <h4 className="font-bold mb-4">📊 Performance Insights</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Best Score:</span>
                          <span className="font-mono text-green-400">{insights.bestScore.score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Worst Score:</span>
                          <span className="font-mono text-red-400">{insights.worstScore.score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Average:</span>
                          <span className="font-mono">{insights.averageScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Improvement:</span>
                          <span className={`font-mono ${
                            insights.improvement > 0 ? 'text-green-400' : insights.improvement < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {insights.improvement > 0 && '+'}{insights.improvement.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Consistency:</span>
                          <span className="font-mono">{insights.consistency}/100</span>
                        </div>
                        {insights.timeToReachTarget && (
                          <div className="pt-3 mt-3 border-t border-white/10">
                            <p className="text-brand-accent text-xs">🎯 {insights.timeToReachTarget} days to reach 90+ score</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitive Intelligence */}
            {competitive && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-purple-400" />
                  Competitive Analysis
                </h3>
                <div className="p-4 bg-white/5 border border-brand-secondary rounded-xl">
                  <div className="mb-6">
                    <h4 className="font-bold mb-3">Your Position</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-brand-accent">#{competitive.yourSite.rank}</div>
                      <div className="flex-1">
                        <p className="text-sm text-white/60">out of {competitive.competitors.length + 1} sites analyzed</p>
                        <p className="text-lg font-semibold">{competitive.yourSite.score} points</p>
                      </div>
                    </div>
                  </div>
                  {competitive.insights.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-bold text-white/60 mb-2">INSIGHTS</h5>
                      {competitive.insights.map((insight, i) => (
                        <p key={i} className="text-sm text-white/80 mb-1">{insight}</p>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {competitive.strengths.length > 0 && (
                      <div>
                        <h5 className="text-sm font-bold text-green-400 mb-2">✓ STRENGTHS</h5>
                        <ul className="text-xs space-y-1">
                          {competitive.strengths.map((str, i) => (
                            <li key={i} className="text-white/70">{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {competitive.weaknesses.length > 0 && (
                      <div>
                        <h5 className="text-sm font-bold text-red-400 mb-2">⚠ WEAKNESSES</h5>
                        <ul className="text-xs space-y-1">
                          {competitive.weaknesses.map((weak, i) => (
                            <li key={i} className="text-white/70">{weak}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {competitive.opportunities.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h5 className="text-sm font-bold text-purple-400 mb-2">🎯 OPPORTUNITIES</h5>
                      <ul className="text-xs space-y-1">
                        {competitive.opportunities.map((opp, i) => (
                          <li key={i} className="text-white/70">{opp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations - Compact Action Plan */}
            {result.recommendations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Action Plan</h3>
                <div className="space-y-3">
                  {result.recommendations.map((rec, i) => (
                    <div 
                      key={i} 
                      className={`p-4 border rounded-xl hover:border-opacity-100 transition-all ${
                        rec.priority === 'critical' ? 'bg-red-500/10 border-red-500/40' :
                        rec.priority === 'high' ? 'bg-orange-500/5 border-orange-500/30' :
                        rec.priority === 'medium' ? 'bg-yellow-500/5 border-yellow-500/30' :
                        'bg-blue-500/5 border-blue-500/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="flex gap-2 flex-shrink-0">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            rec.priority === 'critical' ? 'bg-red-500/30 text-red-300' :
                            rec.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                            rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {rec.priority}
                          </div>
                          {rec.effort && (
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              rec.effort === 'quick-win' ? 'bg-green-500/20 text-green-300' :
                              rec.effort === 'strategic' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {rec.effort === 'quick-win' && <Zap className="w-3 h-3 inline mr-1" />}
                              {rec.effort === 'quick-win' ? 'Quick Win' : rec.effort === 'strategic' ? 'Strategic' : 'Long-term'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 w-full sm:w-auto">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5">
                            <h4 className="font-semibold text-sm">{rec.title}</h4>
                            <span className="text-xs text-white/40">• {rec.category}</span>
                            {rec.estimatedTime && (
                              <span className="text-xs text-white/30">• {rec.estimatedTime}</span>
                            )}
                          </div>
                          <p className="text-xs text-white/70 mb-2">{rec.description}</p>
                          <div className="space-y-1.5">
                            <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                              <p className="text-xs text-brand-accent font-semibold mb-0.5">💡 Impact</p>
                              <p className="text-xs text-white/70">{rec.impact}</p>
                            </div>
                            {rec.implementation && (
                              <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-xs text-green-400 font-semibold mb-0.5">🔧 Implementation</p>
                                <p className="text-xs text-white/70">{rec.implementation}</p>
                              </div>
                            )}
                            {rec.codeExample && (
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-brand-accent hover:text-blue-400 font-semibold">View Code Example</summary>
                                <pre className="mt-1.5 p-2.5 bg-black/30 rounded-lg text-xs text-green-400 overflow-x-auto border border-brand-accent/20">
                                  <code>{rec.codeExample}</code>
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real-time GEO Monitor Section */}
            <div className="mt-16 mb-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3">
                  <span className="bg-gradient-to-r from-cyan-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                    Real-time GEO Monitor™
                  </span>
                </h2>
                <p className="text-white/60 max-w-3xl mx-auto">
                  Live monitoring of your GEO health and AI visibility. Track schema validation, crawler access, 
                  uptime status, and more in real-time.
                </p>
              </div>

              {/* Monitor Content */}
              <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
                <RealtimeMonitorPanel domain={new URL(result.url).hostname} />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 p-6 bg-gradient-to-br from-brand-accent/10 to-transparent border border-brand-accent/30 rounded-xl text-center">
              <h3 className="text-xl font-bold mb-3">Need Expert Help?</h3>
              <p className="text-white/70 mb-6 max-w-2xl mx-auto">
                Our GEO specialists can implement these recommendations and transform your website into an AI-cited authority in your industry.
              </p>
              <a 
                href="/#contact"
                className="inline-flex items-center gap-2 bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all"
              >
                Schedule Consultation
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16 px-6 bg-white/5">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">How GEO Score Works</h2>
          <p className="text-white/60 mb-12 max-w-3xl mx-auto">
            Our advanced algorithm analyzes 8 key dimensions of AI readiness to calculate your comprehensive GEO Score.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Schema Markup (20%)', desc: 'Evaluates 16+ schema types including Organization, Person, Article, Product, Review, HowTo, and validates @graph structure' },
              { title: 'AI Crawlers (18%)', desc: 'Checks robots.txt for GPTBot, Claude, Perplexity, Google-Extended, and sitemap declaration' },
              { title: 'E-E-A-T (18%)', desc: 'Analyzes author credentials, content freshness, expert quotes, citations, trust badges, and legal pages' },
              { title: 'Meta Tags (12%)', desc: 'Validates title, description, OG tags, Twitter Card, canonical, viewport, charset, and lang attributes' },
              { title: 'Content Quality (10%)', desc: 'Measures word count, readability, structure, multimedia usage, internal/external links, and content depth' },
              { title: 'Structure (8%)', desc: 'Assesses HTML5 semantics, heading hierarchy, nav/main/footer elements, and accessibility' },
              { title: 'Performance (8%)', desc: 'Evaluates HTML size, script/style optimization, lazy loading, and resource efficiency' },
              { title: 'Citation Potential (6%)', desc: 'Calculates factual statements, data points, quotes, references, definitions, and unique insights' }
            ].map((item, i) => (
              <div key={i} className="text-left p-4 bg-white/5 rounded-xl border border-brand-secondary hover:border-brand-accent transition-all">
                <h4 className="font-bold text-brand-accent mb-2 text-sm">{item.title}</h4>
                <p className="text-xs text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 bg-brand-accent/5 rounded-xl border border-brand-accent/20">
            <p className="text-sm text-white/70">
              <strong className="text-brand-accent">Note:</strong> Weights are dynamically adjusted based on content type. 
              Content-heavy sites receive higher weighting for Content Quality and Citation Potential.
            </p>
          </div>
        </div>
      </section>
      
      <Footer 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onFAQClick={() => navigate('/')} 
        onPhilosophyClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
    </div>
  );
};

export default GeoAuditPage;
