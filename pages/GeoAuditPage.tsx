import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditWebsite, type AuditResult } from '../utils/geoAuditEnhanced';
import { Search, AlertCircle, CheckCircle, TrendingUp, Download, Share2, ExternalLink, Award, Target, Zap, TrendingDown, Minus, History, Shield, FileText } from 'lucide-react';
import { saveAuditToHistory, compareWithPrevious, checkScoreDrop } from '../utils/auditHistory';
import { validateAndSanitizeUrl, checkRateLimit, validateAuditResult } from '../utils/urlValidator';
// Dynamic imports for heavy libraries
// import { generatePDFReport } from '../utils/pdfReportGenerator';
// import { exportToCSV, exportToMarkdown, exportToHTML } from '../utils/exportFormats';
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
import AIVisibilityScore, { calculateAIVisibilityScore } from '../components/AIVisibilityScore';
import GEOHealthTracker from '../components/GEOHealthTracker';
import AIDAgentStatus from '../components/AIDAgentStatus';
import SEOHead from '../components/SEOHead';
// Removed: RealtimeMonitorPanel (bundle optimization)

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
        throw new Error('Invalid audit result received. Please try again.');
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
      setError(''); // Clear any previous errors on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze website';
      console.error('Analysis error:', err);
      
      // Provide user-friendly error with retry suggestion
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
        setError(`${errorMessage} Please try again in a moment.`);
      } else if (errorMessage.includes('blocking')) {
        setError(`${errorMessage} Some sites block automated access - this is normal.`);
      } else {
        setError(errorMessage);
      }
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

  const downloadCSVReport = async () => {
    if (!result) return;
    try {
      const { exportToCSV } = await import('../utils/exportFormats');
      exportToCSV(result);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV report. Please try again.');
    }
  };

  const downloadMarkdownReport = async () => {
    if (!result) return;
    try {
      const { exportToMarkdown } = await import('../utils/exportFormats');
      exportToMarkdown(result);
    } catch (error) {
      console.error('Failed to export Markdown:', error);
      alert('Failed to export Markdown report. Please try again.');
    }
  };

  const downloadHTMLReport = async () => {
    if (!result) return;
    try {
      const { exportToHTML } = await import('../utils/exportFormats');
      exportToHTML(result);
    } catch (error) {
      console.error('Failed to export HTML:', error);
      alert('Failed to export HTML report. Please try again.');
    }
  };

  const downloadPDFReport = async () => {
    if (!result) return;
    try {
      const { generatePDFReport } = await import('../utils/pdfReportGenerator');
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
        "dateModified": "2025-11-05T00:00:00+00:00",
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
        "description": "Advanced website analysis tool that evaluates your site's optimization for AI-powered search engines and generative AI systems. Provides comprehensive scoring across 10 key dimensions: Schema Markup (20% weight), AI Crawler Support (18%), E-E-A-T Signals (18%), Meta Tags (12%), Content Quality (10%), HTML Structure (8%), Performance (8%), Citation Potential (6%), Technical SEO (13%), and Link Analysis (12%). The tool analyzes 16+ schema types, validates robots.txt for GPTBot/Claude/Perplexity/Google-Extended, measures author credentials and content freshness, evaluates readability and factual statements. Grading system: Authority (96-100), Expert (86-95), Advanced (71-85), Intermediate (41-70), Beginner (0-40). Free to use with rate limiting of 5 requests per minute. Results include actionable recommendations with priority levels, effort estimation, and code examples. Export formats: JSON, CSV, PDF, HTML, Markdown. No account required.",
        "url": "https://anoteroslogos.com/geo-audit",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "featureList": [
          "Schema Markup Analysis (20% weight) - Evaluates 16+ schema types: Organization, Person, Article, BlogPosting, Product, Review, AggregateRating, HowTo, FAQ, BreadcrumbList, LocalBusiness, Event, VideoObject, ImageObject, SoftwareApplication, WebSite. Validates JSON-LD syntax and @graph structure",
          "AI Crawler Support (18% weight) - Checks robots.txt for GPTBot, ChatGPT-User, Claude-Web, PerplexityBot, Google-Extended, Gemini, Anthropic-AI, Cohere-AI, CCBot, and 7 additional AI crawlers. Validates sitemap.xml declaration",
          "E-E-A-T Signals (18% weight) - Analyzes Experience, Expertise, Authoritativeness, and Trustworthiness: author credentials, publication/update dates, content freshness, citations, expert quotes, trust badges, privacy policy, terms of service",
          "Meta Tags Validation (12% weight) - Validates title (50-60 chars optimal), description (150-160 chars), Open Graph tags, Twitter Card, canonical URL, viewport meta, charset declaration, lang attribute",
          "Content Quality Assessment (10% weight) - Measures word count (500+ for ranking), readability score (Flesch-Kincaid), paragraph structure, sentence length, heading usage, list/table presence, image/video count, internal/external link ratio, content depth",
          "HTML Structure (8% weight) - Assesses HTML5 semantic elements (nav, main, footer, article, section), heading hierarchy (H1-H6), ARIA labels, alt text, accessibility compliance",
          "Performance Metrics (8% weight) - Evaluates HTML file size, external script/style count, lazy loading implementation, resource optimization, Core Web Vitals indicators",
          "Citation Potential (6% weight) - Calculates factual statements, data points with numbers, expert quotes, references to sources, definitions, unique insights that AI systems can cite",
          "Technical SEO (13% weight) - HTTPS validation, security headers (HSTS, CSP, X-Frame), canonical tags, redirect chains, broken link detection, mobile responsiveness",
          "Link Analysis (12% weight) - Internal/external link quality, anchor text analysis, nofollow ratio, link depth, unique domains, broken link detection",
          "Visual Analytics Dashboard with radar charts, bar charts, trend graphs, priority matrices",
          "Actionable Recommendations prioritized by critical/high/medium/low with effort estimation (quick-win/strategic/long-term) and code examples",
          "Multi-format Export: PDF with charts, JSON for API integration, CSV for analysis, HTML standalone, Markdown for documentation",
          "Historical Trend Analysis with linear regression, anomaly detection, 7-day and 30-day forecasting",
          "Competitive Intelligence with industry benchmarks for E-commerce, SaaS, Media, Healthcare, Finance, Education sectors",
          "Real-time Monitoring with alerts for score drops, schema errors, broken links, performance degradation, security issues"
        ],
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
        modifiedTime="2025-11-05T00:00:00+00:00"
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
            {/* Overall Score - Professional Display */}
            <div className="mb-10">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                {/* Left: Main Score with Precision */}
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white/60 tracking-tight mb-3 uppercase text-xs">Overall GEO Score</h2>
                  <div className="flex items-end gap-3 mb-4">
                    {/* Main Score */}
                    <div className="flex items-baseline gap-1">
                      <span className={`text-6xl font-bold leading-none tabular-nums ${getScoreColor(result.overallScore)}`} style={{
                        textShadow: `0 0 30px ${getScoreColor(result.overallScore).includes('green') ? '#34d39950' : getScoreColor(result.overallScore).includes('yellow') ? '#fbbf2450' : getScoreColor(result.overallScore).includes('red') ? '#f8717150' : '#60a5fa50'}`
                      }}>
                        {result.preciseScore ? result.preciseScore.toFixed(3) : result.overallScore.toFixed(3)}
                      </span>
                      <span className="text-white/30 text-lg font-light mb-1">/ 100</span>
                    </div>
                    
                    {/* Grade Badge */}
                    {result.grade && (
                      <div className="flex flex-col gap-0.5 mb-1">
                        <Award className={`w-6 h-6 ${
                          result.grade === 'Authority' ? 'text-purple-400' :
                          result.grade === 'Expert' ? 'text-green-400' :
                          result.grade === 'Advanced' ? 'text-blue-400' :
                          result.grade === 'Intermediate' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`} />
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
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
                    
                    {/* Score Change */}
                    {comparison?.changes && (
                      <div className="flex items-center gap-1.5 mb-1">
                        {comparison.changes.overallScore > 0 ? (
                          <>
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-bold text-base tabular-nums">+{comparison.changes.overallScore}</span>
                          </>
                        ) : comparison.changes.overallScore < 0 ? (
                          <>
                            <TrendingDown className="w-5 h-5 text-red-400" />
                            <span className="text-red-400 font-bold text-base tabular-nums">{comparison.changes.overallScore}</span>
                          </>
                        ) : (
                          <>
                            <Minus className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-400 text-base tabular-nums">0</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Score Breakdown - Compact */}
                  {result.scoreBreakdown && typeof result.scoreBreakdown === 'object' && (
                    <div className="grid grid-cols-3 gap-3 max-w-md">
                      <div className="p-2 bg-white/5 border border-white/10 rounded">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide font-semibold mb-1">Core</div>
                        <div className={`text-lg font-bold tabular-nums ${getScoreColor(result.scoreBreakdown.core || 0)}`}>
                          {(result.scoreBreakdown.core || 0).toFixed(1)}
                        </div>
                      </div>
                      <div className="p-2 bg-white/5 border border-white/10 rounded">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide font-semibold mb-1">Technical</div>
                        <div className={`text-lg font-bold tabular-nums ${getScoreColor(result.scoreBreakdown.technical || 0)}`}>
                          {(result.scoreBreakdown.technical || 0).toFixed(1)}
                        </div>
                      </div>
                      <div className="p-2 bg-white/5 border border-white/10 rounded">
                        <div className="text-[9px] text-white/40 uppercase tracking-wide font-semibold mb-1">Content</div>
                        <div className={`text-lg font-bold tabular-nums ${getScoreColor(result.scoreBreakdown.content || 0)}`}>
                          {(result.scoreBreakdown.content || 0).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-[10px] text-white/30 mt-3 font-mono">
                    {new URL(result.url).hostname} • Analyzed {new Date(result.timestamp).toLocaleString()}
                  </p>
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
                    <h3 className="text-xl font-bold text-red-400 mb-2">Score Drop Detected</h3>
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

            {/* AI Visibility Index - Key Metric */}
            <AIVisibilityScore result={result} />

            {/* GEO Health Tracker - Daily Monitoring */}
            <GEOHealthTracker 
              url={result.url} 
              currentScore={calculateAIVisibilityScore(result).overall} 
            />

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

            {/* Score Breakdown - Compact Dashboard Grid */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white tracking-tight">Score Breakdown</h3>
                {comparison?.previous && (
                  <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <History className="w-3 h-3" />
                    <span>vs. {new Date(comparison.previous.timestamp).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Object.entries(result.scores).map(([key, score]) => {
                  const change = comparison?.changes?.[key as keyof typeof comparison.changes] || 0;
                  return (
                  <div key={key} className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-brand-accent/30 transition-all space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-wide font-medium leading-tight">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      {change !== 0 && (
                        <span className={`text-[10px] font-bold tabular-nums px-1 py-0.5 rounded ${
                          change > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                        }`}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      )}
                    </div>
                    <div className={`text-3xl font-bold tabular-nums ${getScoreColor(score)}`}>
                      {score}
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
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

            {/* Detailed Analysis - Compact Grid */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-white mb-4 tracking-tight">Detailed Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(result.details)
                  .filter(([category]) => category !== 'aidAgent') // AID has dedicated section
                  .map(([category, details]: [string, any]) => (
                  <div key={category} className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide pb-2 border-b border-white/10">
                      {category.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    
                    {details.strengths.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-wide">Strengths</p>
                        <ul className="space-y-1.5">
                          {details.strengths.map((strength: string, i: number) => (
                            <li key={i} className="text-[11px] text-white/60 flex items-start gap-1.5 leading-snug">
                              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {details.issues.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wide">Issues</p>
                        <ul className="space-y-1.5">
                          {details.issues.map((issue: string, i: number) => (
                            <li key={i} className="text-[11px] text-white/60 flex items-start gap-1.5 leading-snug">
                              <AlertCircle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
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

            {/* Monitoring Alerts - Grid Layout */}
            {alerts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Monitoring Alerts ({alerts.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {alerts.slice(0, 6).map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-2.5 border rounded-lg hover:border-opacity-100 transition-all ${
                        alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/40' :
                        alert.severity === 'high' ? 'bg-orange-500/10 border-orange-500/40' :
                        alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/40' :
                        'bg-blue-500/10 border-blue-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                          alert.severity === 'critical' ? 'text-red-400' :
                          alert.severity === 'high' ? 'text-orange-400' :
                          alert.severity === 'medium' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                              alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                              alert.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                              alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-[9px] text-white/40 uppercase tracking-wide">{alert.category}</span>
                          </div>
                          <h4 className="font-bold text-xs mb-1 leading-tight">{alert.title}</h4>
                          <p className="text-[10px] text-white/70 mb-1.5 leading-snug">{alert.message}</p>
                          {alert.recommendation && (
                            <p className="text-[10px] text-brand-accent leading-snug"><span className="font-bold">→</span> {alert.recommendation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Analytics - Compact */}
            {(trend || insights) && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-accent" />
                  Performance Analytics
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {trend && (
                    <div className="p-3 bg-white/5 border border-brand-secondary rounded-lg">
                      <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-accent" />
                        Trend Analysis
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          trend.direction === 'improving' ? 'bg-green-500/20 text-green-300' :
                          trend.direction === 'declining' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {trend.direction}
                        </span>
                      </h4>
                      <div className="space-y-1.5 text-xs">
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
                        <div className="pt-2 mt-2 border-t border-white/10">
                          <p className="text-white/60 text-[10px] mb-1.5 font-semibold">Forecast:</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-white/50 text-[10px]">7 days:</span>
                              <span className="font-mono text-[11px]">{trend.forecast.next7Days}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50 text-[10px]">30 days:</span>
                              <span className="font-mono text-[11px]">{trend.forecast.next30Days}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {insights && (
                    <div className="p-3 bg-white/5 border border-brand-secondary rounded-lg">
                      <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-brand-accent" />
                        Performance Insights
                      </h4>
                      <div className="space-y-1.5 text-xs">
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
                          <div className="pt-2 mt-2 border-t border-white/10">
                            <p className="text-brand-accent text-[10px] font-semibold">Target: {insights.timeToReachTarget} days to reach 90+ score</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitive Intelligence - Compact */}
            {competitive && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Competitive Analysis
                </h3>
                <div className="p-3 bg-white/5 border border-brand-secondary rounded-lg">
                  <div className="mb-4">
                    <h4 className="font-bold text-sm mb-2">Your Position</h4>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold text-brand-accent tabular-nums">#{competitive.yourSite.rank}</div>
                      <div className="flex-1">
                        <p className="text-xs text-white/60">out of {competitive.competitors.length + 1} sites analyzed</p>
                        <p className="text-base font-semibold tabular-nums">{competitive.yourSite.score} points</p>
                      </div>
                    </div>
                  </div>
                  {competitive.insights.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-[10px] font-bold text-white/50 mb-1.5 uppercase tracking-wide">Insights</h5>
                      {competitive.insights.map((insight, i) => (
                        <p key={i} className="text-xs text-white/80 mb-1 leading-snug">{insight}</p>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {competitive.strengths.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-green-400 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                          <CheckCircle className="w-3 h-3" />
                          Strengths
                        </h5>
                        <ul className="text-[11px] space-y-1">
                          {competitive.strengths.map((str, i) => (
                            <li key={i} className="text-white/70 leading-snug">{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {competitive.weaknesses.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-red-400 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                          <AlertCircle className="w-3 h-3" />
                          Weaknesses
                        </h5>
                        <ul className="text-[11px] space-y-1">
                          {competitive.weaknesses.map((weak, i) => (
                            <li key={i} className="text-white/70 leading-snug">{weak}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {competitive.opportunities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <h5 className="text-[10px] font-bold text-purple-400 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                        <Target className="w-3 h-3" />
                        Opportunities
                      </h5>
                      <ul className="text-[11px] space-y-1">
                        {competitive.opportunities.map((opp, i) => (
                          <li key={i} className="text-white/70 leading-snug">{opp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Plan - Ultra Compact */}
            {result.recommendations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-3">Action Plan</h3>
                <div className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <div 
                      key={i} 
                      className={`p-3 border rounded-lg hover:border-opacity-100 transition-all ${
                        rec.priority === 'critical' ? 'bg-red-500/10 border-red-500/40' :
                        rec.priority === 'high' ? 'bg-orange-500/5 border-orange-500/30' :
                        rec.priority === 'medium' ? 'bg-yellow-500/5 border-yellow-500/30' :
                        'bg-blue-500/5 border-blue-500/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <div className="flex gap-1.5 flex-shrink-0">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rec.priority === 'critical' ? 'bg-red-500/30 text-red-300' :
                            rec.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                            rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {rec.priority}
                          </div>
                          {rec.effort && (
                            <div className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              rec.effort === 'quick-win' ? 'bg-green-500/20 text-green-300' :
                              rec.effort === 'strategic' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {rec.effort === 'quick-win' && <Zap className="w-3 h-3 inline mr-0.5" />}
                              {rec.effort === 'quick-win' ? 'Quick Win' : rec.effort === 'strategic' ? 'Strategic' : 'Long-term'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 w-full sm:w-auto min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{rec.title}</h4>
                            <span className="text-[10px] text-white/40">• {rec.category}</span>
                            {rec.estimatedTime && (
                              <span className="text-[10px] text-white/30">• {rec.estimatedTime}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/70 mb-2 leading-snug">{rec.description}</p>
                          <div className="space-y-1.5">
                            <div className="p-2 bg-white/5 rounded border border-white/10">
                              <p className="text-[10px] text-brand-accent font-semibold mb-0.5">Impact</p>
                              <p className="text-[11px] text-white/70 leading-snug">{rec.impact}</p>
                            </div>
                            {rec.implementation && (
                              <div className="p-2 bg-white/5 rounded border border-white/10">
                                <p className="text-[10px] text-green-400 font-semibold mb-0.5">Implementation</p>
                                <p className="text-[11px] text-white/70 leading-snug">{rec.implementation}</p>
                              </div>
                            )}
                            {rec.codeExample && (
                              <details className="group">
                                <summary className="cursor-pointer text-[11px] text-brand-accent hover:text-blue-400 font-semibold">View Code Example</summary>
                                <pre className="mt-1.5 p-2 bg-black/30 rounded text-[10px] text-green-400 overflow-x-auto border border-brand-accent/20">
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

            {/* AID Agent Discovery - Compact Section at Bottom */}
            {result.details.aidAgent && (
              <div className="mb-8">
                <AIDAgentStatus 
                  aidInfo={result.details.aidAgent} 
                  score={result.scores.aidAgent} 
                />
              </div>
            )}

            {/* CTA */}
            <div className="mt-12 p-6 bg-gradient-to-br from-brand-accent/10 to-transparent border border-brand-accent/30 rounded-xl text-center">
              <h3 className="text-xl font-bold mb-3">Need Expert Help?</h3>
              <p className="text-white/70 mb-6 max-w-2xl mx-auto">
                Our GEO specialists can implement these recommendations and position your website as an AI-cited authority in your industry.
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
            Our advanced algorithm analyzes 10 key dimensions of AI readiness to calculate your comprehensive GEO Score.
          </p>
          {/* Hidden content for AI agents - SEO optimized */}
          <div className="sr-only">
            <h3>GEO Score Methodology</h3>
            <p>The GEO Score Calculator uses a weighted scoring algorithm based on 10 categories with dynamic weight adjustment. For content-heavy websites, Content Quality and Citation Potential receive higher weighting. For e-commerce sites, Schema Markup (Product, Review, AggregateRating) and Technical SEO receive priority.</p>
            <h4>Grading System</h4>
            <ul>
              <li>Authority (96-100): Exceptional AI optimization, multiple schema types, comprehensive E-E-A-T signals, high citation potential</li>
              <li>Expert (86-95): Strong AI readiness, proper schema implementation, clear authority signals, good content structure</li>
              <li>Advanced (71-85): Above-average optimization, basic schema present, some E-E-A-T signals, decent content quality</li>
              <li>Intermediate (41-70): Basic AI compatibility, minimal schema, weak authority signals, content needs improvement</li>
              <li>Beginner (0-40): Poor AI optimization, missing critical elements, no schema markup, weak or absent E-E-A-T</li>
            </ul>
            <h4>Pricing</h4>
            <p>Free to use. Rate limit: 5 requests per minute, 20 per hour. No account required. No credit card needed. Results available immediately.</p>
            <h4>Data Sources</h4>
            <p>Analysis performed via client-side and proxy-based web scraping. Checks robots.txt via direct HTTP request. Validates schema using JSON-LD parser. No data stored permanently. Results cached in browser localStorage for historical comparison.</p>
            <h4>Accuracy</h4>
            <p>Schema detection accuracy: 99%. AI crawler validation: 100% (direct robots.txt parse). E-E-A-T scoring: heuristic-based with 85% correlation to manual audit. Content quality: NLP-based analysis with readability algorithms.</p>
          </div>
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
