import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MarketGrowthChart from '../components/MarketGrowthChart';
import {
  TrendingUp,
  DollarSign,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  Users,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  XCircle,
  Minus,
  Star,
  TrendingDown,
  Building2,
  Globe,
  Lock,
  Rocket,
} from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  rating?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, trend, rating }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-all group">
    <div className="flex items-start justify-between mb-3">
      <div className="text-brand-accent">{icon}</div>
      {rating && (
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
            />
          ))}
        </div>
      )}
    </div>
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    {trend && (
      <div className="text-xs text-green-400 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        {trend}
      </div>
    )}
  </div>
);

const InvestorRelationsPage: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<'tam' | 'sam' | 'som'>('tam');

  const marketSegments = {
    tam: {
      label: 'Total Addressable Market',
      value: '$2-3B',
      description: 'Annual global market for GEO and AI-powered SEO services',
      segments: [
        { name: 'AI-Powered SEO Software', value: '$1.7B → $6.5B by 2030', cagr: '18.3%' },
        { name: 'Generative Engine Optimization', value: '$500M → $6.1B by 2030', cagr: '45%+' },
        { name: 'Digital Transformation Services', value: '$1.07T → $4.6T by 2030', cagr: '28.5%' },
      ],
    },
    sam: {
      label: 'Serviceable Available Market',
      value: '$500M-$800M',
      description: 'North America & Europe enterprise/growth segments',
      segments: [
        { name: 'Enterprise B2B/SaaS', share: '60%', budget: '$25K-$100K+' },
        { name: 'Growth-stage Tech', share: '30%', budget: '$10K-$50K' },
        { name: 'Healthcare/Legal/Finance', share: '10%', budget: '$15K-$75K' },
      ],
    },
    som: {
      label: 'Serviceable Obtainable Market',
      value: '$10-50M',
      description: 'Realistic target over 3-5 years with current resources',
      segments: [
        { name: 'Year 1-2', value: '$2-5M', clients: '20-50 clients' },
        { name: 'Year 3-4', value: '$10-25M', clients: '100-250 clients' },
        { name: 'Year 5+', value: '$30-50M', clients: '300-500 clients' },
      ],
    },
  };

  const revenueStreams = [
    {
      name: 'Strategy Consulting',
      structure: 'Discovery, audit, roadmap',
      average: '$15K-$35K',
      duration: '6-8 weeks',
      margin: '45%',
    },
    {
      name: 'Implementation Services',
      structure: 'Ongoing optimization',
      average: '$5K-$15K/month',
      duration: '3-12 months',
      margin: '40%',
    },
    {
      name: 'Retainer Model',
      structure: 'Continuous + reporting',
      average: '$8K-$25K/month',
      duration: '6-24+ months',
      margin: '42%',
    },
    {
      name: 'Training/Certification',
      structure: 'Team enablement',
      average: '$10K-$50K',
      duration: '4-8 weeks',
      margin: '50%',
    },
    {
      name: 'Software/Tools',
      structure: 'Proprietary GEO platform',
      average: '$500-$5K/month',
      duration: 'Recurring',
      margin: '80%',
    },
  ];

  const competitiveAnalysis = [
    {
      tier: 'Tier 1: Enterprise Agencies',
      players: 'First Page Sage, Intero Digital',
      strengths: ['Brand recognition', 'Large teams', 'Existing client base'],
      weaknesses: ['GEO as add-on service', 'Slow to pivot', 'Higher pricing'],
      threat: 'Medium',
    },
    {
      tier: 'Tier 2: GEO Specialists',
      players: 'Authority Engine, Previsible',
      strengths: ['Deep GEO expertise', 'Agile operations', 'Focused methodology'],
      weaknesses: ['Limited resources', 'Smaller brand', 'Geographic constraints'],
      threat: 'High',
    },
    {
      tier: 'Tier 3: Software/Tools',
      players: 'Semrush, Clearscope, MarketMuse',
      strengths: ['Scalable platforms', 'Established products', 'Data access'],
      weaknesses: ['Limited consulting', 'Generic solutions', 'No IP architecture'],
      threat: 'Low',
    },
  ];

  const risks = [
    {
      risk: 'Algorithm Dependency',
      probability: '40-50%',
      impact: 'Critical',
      mitigation: 'Multi-platform optimization (Google, ChatGPT, Perplexity, Claude)',
      color: 'text-red-400',
    },
    {
      risk: 'Market Commoditization',
      probability: '60%',
      impact: 'High',
      mitigation: 'Proprietary IP (Nicosia Method), thought leadership, certification',
      color: 'text-orange-400',
    },
    {
      risk: 'Economic Sensitivity',
      probability: '25-30%',
      impact: 'Medium',
      mitigation: 'ROI-focused models, performance-based pricing, flexible packages',
      color: 'text-yellow-400',
    },
    {
      risk: 'Adoption Uncertainty',
      probability: '25-30%',
      impact: 'Medium',
      mitigation: 'Service diversification, traditional SEO foundation, education',
      color: 'text-yellow-400',
    },
  ];

  const swotAnalysis = {
    strengths: [
      'Proprietary "Nicosia Method" framework',
      'First-mover in pure-play GEO agency space',
      '100% focus vs. traditional agency pivots',
      'Intellectual property and methodologies',
      'Perfect timing in market transformation',
      'Proven technical excellence (GEO Audit tool)',
    ],
    weaknesses: [
      'Early-stage brand awareness',
      'Limited initial resources vs. enterprises',
      'Client acquisition costs in new category',
      'Team scaling challenges',
      'Geographic concentration risk',
    ],
    opportunities: [
      '$2-3B TAM with 45%+ CAGR in GEO',
      '71% of Americans using AI search (2025)',
      '25-50% predicted traffic shift by 2026-2028',
      '50%+ enterprises launching GEO pilots',
      'Platform maturity (ChatGPT, Perplexity, Claude)',
      'Regulatory drivers in healthcare/finance',
    ],
    threats: [
      'Large agencies adding GEO services',
      'DIY tools and platforms commoditization',
      'Algorithm changes and platform volatility',
      'Economic downturns affecting budgets',
      'Fast follower competitors',
    ],
  };

  return (
    <>
      <SEOHead
        url="https://anoteroslogos.com/investors"
        title="Investor Relations | Anóteros Lógos"
        description="Investment analysis, market intelligence, and financial metrics for Anóteros Lógos - pioneering Generative Engine Optimization agency."
        keywords="GEO investment, AI SEO market, investor relations, market analysis, TAM SAM SOM"
      />
      
      <div className="min-h-screen bg-brand-bg text-brand-text">
        <Header />
        
        <main className="pt-20 sm:pt-24 pb-12">
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 mb-4">
                <Award className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                <span className="text-xs sm:text-sm font-semibold text-green-400">Investment Rating: STRONG BUY</span>
                <div className="flex gap-0.5 ml-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                Investor Relations
              </h1>
              <p className="text-base sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Comprehensive investment analysis for pioneering Generative Engine Optimization agency
              </p>
              <div className="mt-4 sm:mt-6 text-xl sm:text-2xl font-bold text-brand-accent">
                Valuation Target: $10-25M (Series A)
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Market Momentum"
                value="Transformational"
                rating={5}
              />
              <MetricCard
                icon={<DollarSign className="w-6 h-6" />}
                label="TAM (Annual)"
                value="$2-3B"
                rating={5}
                trend="45%+ CAGR"
              />
              <MetricCard
                icon={<Target className="w-6 h-6" />}
                label="Competitive Position"
                value="First-Mover"
                rating={4}
              />
              <MetricCard
                icon={<BarChart3 className="w-6 h-6" />}
                label="Gross Margin"
                value="40-45%"
                rating={4}
              />
            </div>
          </section>

          {/* Market Size Analysis */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
                Market Size Analysis
              </h2>
              
              <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                {(['tam', 'sam', 'som'] as const).map((segment) => (
                  <button
                    key={segment}
                    onClick={() => setSelectedSegment(segment)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all ${
                      selectedSegment === segment
                        ? 'bg-brand-accent text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {segment.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
                      {marketSegments[selectedSegment].label}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-400">{marketSegments[selectedSegment].description}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-brand-accent whitespace-nowrap">
                    {marketSegments[selectedSegment].value}
                  </div>
                </div>

                <div className="grid gap-3 sm:gap-4 mt-4 sm:mt-6">
                  {marketSegments[selectedSegment].segments.map((segment, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white mb-1">{segment.name}</div>
                          <div className="text-sm text-gray-400">
                            {'value' in segment && segment.value}
                            {'share' in segment && `Share: ${segment.share} | Budget: ${segment.budget}`}
                            {'clients' in segment && segment.clients}
                          </div>
                        </div>
                        {'cagr' in segment && (
                          <div className="text-green-400 font-semibold flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {segment.cagr}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Growth Visualization */}
              <div className="mt-6 sm:mt-8 bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Market Growth Projections (2024-2030)</h3>
                <MarketGrowthChart variant="area" />
              </div>
            </div>
          </section>

          {/* Revenue Model */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
                Revenue Model & Unit Economics
              </h2>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                  <div className="text-sm text-gray-400 mb-2">Average CLV</div>
                  <div className="text-3xl font-bold text-white mb-1">$40K-$75K</div>
                  <div className="text-xs text-gray-500">Over 18-24 months</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                  <div className="text-xs sm:text-sm text-gray-400 mb-2">Customer Acquisition Cost</div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">$3K-$8K</div>
                  <div className="text-xs text-gray-500">3-4 month payback</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                  <div className="text-xs sm:text-sm text-gray-400 mb-2">CLV/CAC Ratio</div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">5-9x</div>
                  <div className="text-xs text-gray-500">Excellent unit economics</div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {revenueStreams.map((stream, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1">{stream.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-400">{stream.structure}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-lg sm:text-xl font-bold text-brand-accent">{stream.average}</div>
                        <div className="text-xs text-gray-500">{stream.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <span className="text-xs text-gray-500">Gross Margin</span>
                      <span className="text-sm font-semibold text-green-400">{stream.margin}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Competitive Landscape */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
                Competitive Landscape
              </h2>

              <div className="space-y-4 sm:space-y-6">
                {competitiveAnalysis.map((tier, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{tier.tier}</h3>
                        <p className="text-xs sm:text-sm text-gray-400">{tier.players}</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          tier.threat === 'High'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : tier.threat === 'Medium'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}
                      >
                        {tier.threat} Threat
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          Strengths
                        </div>
                        <ul className="space-y-1">
                          {tier.strengths.map((strength, sIdx) => (
                            <li key={sIdx} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-green-400 mt-1">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-400" />
                          Weaknesses
                        </div>
                        <ul className="space-y-1">
                          {tier.weaknesses.map((weakness, wIdx) => (
                            <li key={wIdx} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-red-400 mt-1">•</span>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Risk Assessment */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
                Risk Assessment & Mitigation
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {risks.map((risk, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1">{risk.risk}</h3>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                          <span className="text-gray-400">
                            Probability: <span className={risk.color}>{risk.probability}</span>
                          </span>
                          <span className="text-gray-400">
                            Impact: <span className={risk.color}>{risk.impact}</span>
                          </span>
                        </div>
                      </div>
                      <AlertTriangle className={`w-5 h-5 sm:w-6 sm:h-6 ${risk.color} flex-shrink-0`} />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded p-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Mitigation Strategy</div>
                      <p className="text-sm text-gray-300">{risk.mitigation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SWOT Analysis */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
                SWOT Analysis
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Strengths */}
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-green-400 mb-3 sm:mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {swotAnalysis.strengths.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <Zap className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-red-400 mb-3 sm:mb-4 flex items-center gap-2">
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {swotAnalysis.weaknesses.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <Minus className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-400 mb-3 sm:mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    Opportunities
                  </h3>
                  <ul className="space-y-2">
                    {swotAnalysis.opportunities.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Threats */}
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-orange-400 mb-3 sm:mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                    Threats
                  </h3>
                  <ul className="space-y-2">
                    {swotAnalysis.threats.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                        <TrendingDown className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Strategic Differentiators */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
            <div className="bg-gradient-to-br from-brand-accent/10 to-purple-600/10 border border-brand-accent/20 rounded-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
                Strategic Differentiators
              </h2>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                  <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent mb-2 sm:mb-3" />
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">Proprietary IP</h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    "Nicosia Method" - proprietary framework for AI authority architecture that cannot be replicated by competitors
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                  <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent mb-2 sm:mb-3" />
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">First-Mover Position</h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Pure-play GEO agency founded for the AI era, not a traditional SEO agency pivot
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent mb-2 sm:mb-3" />
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">Perfect Timing</h3>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Market entry at inflection point of search transformation: 71% AI usage, 25-50% traffic shift predicted
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-0">
            <div className="bg-gradient-to-r from-brand-accent/20 to-purple-600/20 border border-brand-accent/30 rounded-xl p-6 sm:p-8 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Investment Opportunity</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-300 mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed">
                Join us in architecting the future of brand authority in the AI age. 
                Series A funding target: $10-25M for market expansion and platform development.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold transition-all"
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  Contact Investor Relations
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
                <a
                  href="/geo-audit"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold transition-all"
                >
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Try GEO Audit Tool
                </a>
              </div>
            </div>
          </section>
        </main>

        <Footer 
          onPhilosophyClick={() => window.location.href = '/#philosophy'}
          onMethodClick={() => window.location.href = '/#nicosia-method'}
          onClientsClick={() => window.location.href = '/#clients'}
          onFAQClick={() => window.location.href = '/#faq'}
          onContactClick={() => window.location.href = '/'}
        />
      </div>
    </>
  );
};

export default InvestorRelationsPage;
