import { Eye, TrendingUp, Shield, FileText, Zap } from 'lucide-react';
import { AuditResult } from '../utils/geoAuditEnhanced';

interface AIVisibilityScoreProps {
  result: AuditResult;
}

interface VisibilityFactor {
  name: string;
  score: number;
  weight: number;
  icon: typeof Eye;
  color: string;
}

/**
 * Calculate AI Visibility Score - probability of AI citation (0-100)
 * Based on key factors that AI systems use for source selection
 */
export function calculateAIVisibilityScore(result: AuditResult): {
  overall: number;
  factors: VisibilityFactor[];
} {
  // Key factors for AI visibility with weights
  const factors: VisibilityFactor[] = [
    {
      name: 'AI Access',
      score: result.scores.aiCrawlers,
      weight: 0.25, // 25% - Most critical
      icon: Eye,
      color: 'text-purple-400',
    },
    {
      name: 'Authority',
      score: result.scores.eeat,
      weight: 0.20, // 20% - Trust signals
      icon: Shield,
      color: 'text-blue-400',
    },
    {
      name: 'Structure',
      score: (result.scores.schemaMarkup + result.scores.structure) / 2,
      weight: 0.20, // 20% - Parsability
      icon: FileText,
      color: 'text-green-400',
    },
    {
      name: 'Content',
      score: (result.scores.contentQuality + result.scores.citationPotential) / 2,
      weight: 0.20, // 20% - Quality & citeability
      icon: TrendingUp,
      color: 'text-yellow-400',
    },
    {
      name: 'Technical',
      score: (result.scores.technicalSEO + result.scores.performance) / 2,
      weight: 0.15, // 15% - Accessibility
      icon: Zap,
      color: 'text-orange-400',
    },
  ];

  // Calculate weighted score
  const overall = Math.round(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  );

  return { overall, factors };
}

function getVisibilityLevel(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 85) {
    return {
      label: 'Excellent',
      color: 'text-green-400',
      description: 'High probability of AI citation. Your content is highly visible to AI systems.',
    };
  }
  if (score >= 70) {
    return {
      label: 'Good',
      color: 'text-blue-400',
      description: 'Good AI visibility. Minor improvements will maximize citation potential.',
    };
  }
  if (score >= 50) {
    return {
      label: 'Fair',
      color: 'text-yellow-400',
      description: 'Moderate visibility. Address key issues to improve AI discoverability.',
    };
  }
  if (score >= 30) {
    return {
      label: 'Poor',
      color: 'text-orange-400',
      description: 'Low AI visibility. Significant improvements needed for AI recognition.',
    };
  }
  return {
    label: 'Critical',
    color: 'text-red-400',
    description: 'Very low visibility. AI systems may not access or cite your content.',
  };
}

const AIVisibilityScore = ({ result }: AIVisibilityScoreProps) => {
  const { overall, factors } = calculateAIVisibilityScore(result);
  const level = getVisibilityLevel(overall);

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
        <Eye className="w-5 h-5 text-brand-accent" />
        AI Visibility Index
      </h3>
      
      <div className="p-4 bg-gradient-to-br from-brand-accent/10 to-transparent border border-brand-accent/30 rounded-lg">
        {/* Main Score Display */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-4xl font-bold tabular-nums ${level.color}`}>
                {overall}%
              </span>
              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                overall >= 85 ? 'bg-green-500/20 text-green-300' :
                overall >= 70 ? 'bg-blue-500/20 text-blue-300' :
                overall >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                overall >= 30 ? 'bg-orange-500/20 text-orange-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {level.label}
              </span>
            </div>
            <p className="text-xs text-white/60 leading-snug max-w-lg">
              {level.description}
            </p>
          </div>
          
          {/* Circular indicator */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-white/10"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - overall / 100)}`}
                className={level.color}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Eye className={`w-6 h-6 ${level.color}`} />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                overall >= 85 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                overall >= 70 ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
                overall >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                overall >= 30 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                'bg-gradient-to-r from-red-500 to-red-700'
              }`}
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wide font-semibold mb-2">
            Visibility Factors
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {factors.map((factor) => {
              const Icon = factor.icon;
              return (
                <div
                  key={factor.name}
                  className="p-2 bg-white/5 border border-white/10 rounded"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3 h-3 ${factor.color}`} />
                    <span className="text-[9px] text-white/40 font-medium uppercase tracking-wide">
                      {factor.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold tabular-nums ${
                      factor.score >= 80 ? 'text-green-400' :
                      factor.score >= 60 ? 'text-yellow-400' :
                      factor.score >= 40 ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      {Math.round(factor.score)}
                    </span>
                    <span className="text-[9px] text-white/30">/ 100</span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        factor.score >= 80 ? 'bg-green-400' :
                        factor.score >= 60 ? 'bg-yellow-400' :
                        factor.score >= 40 ? 'bg-orange-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info note */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-[10px] text-white/40 leading-snug">
            AI Visibility Index predicts how likely AI systems (ChatGPT, Claude, Perplexity, Gemini) 
            are to discover, access, and cite your content based on 5 key factors.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIVisibilityScore;
