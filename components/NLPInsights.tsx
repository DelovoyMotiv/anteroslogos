import { Brain, TrendingUp, MessageSquare, Target, AlertCircle, CheckCircle, Hash, BookOpen } from 'lucide-react';
import { NLPContentAnalysis } from '../utils/nlpContentAnalysis';

interface NLPInsightsProps {
  analysis: NLPContentAnalysis;
}

const NLPInsights = ({ analysis }: NLPInsightsProps) => {
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

  const getRiskColor = (risk: string) => {
    if (risk === 'low' || risk === 'none') return 'text-green-400';
    if (risk === 'medium') return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSentimentEmoji = (label: string) => {
    if (label === 'positive') return '😊';
    if (label === 'negative') return '😟';
    return '😐';
  };

  return (
    <div className="mb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-brand-accent" />
        <h3 className="text-2xl font-bold">NLP Content Intelligence</h3>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 border rounded-xl ${getScoreBg(analysis.contentUniquenessScore)}`}>
          <div className="text-xs text-white/50 mb-1">Uniqueness</div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.contentUniquenessScore)}`}>
            {analysis.contentUniquenessScore}
          </div>
          <div className="text-xs text-white/40 mt-1">Originality: {analysis.estimatedOriginality}%</div>
        </div>

        <div className={`p-4 border rounded-xl ${getScoreBg(analysis.aiComprehensionScore)}`}>
          <div className="text-xs text-white/50 mb-1">AI Comprehension</div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.aiComprehensionScore)}`}>
            {analysis.aiComprehensionScore}
          </div>
          <div className="text-xs text-white/40 mt-1">
            <span className={getRiskColor(analysis.duplicateContentRisk)}>
              {analysis.duplicateContentRisk} risk
            </span>
          </div>
        </div>

        <div className={`p-4 border rounded-xl ${getScoreBg(analysis.semanticRichness)}`}>
          <div className="text-xs text-white/50 mb-1">Semantic Richness</div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.semanticRichness)}`}>
            {analysis.semanticRichness}
          </div>
          <div className="text-xs text-white/40 mt-1">
            Vocabulary: {(analysis.vocabularyDiversity * 100).toFixed(0)}%
          </div>
        </div>

        <div className={`p-4 border rounded-xl ${getScoreBg(analysis.topicCohesion)}`}>
          <div className="text-xs text-white/50 mb-1">Topic Cohesion</div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.topicCohesion)}`}>
            {Math.round(analysis.topicCohesion)}
          </div>
          <div className="text-xs text-white/40 mt-1">
            Diversity: {Math.round(analysis.topicDiversity)}%
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keywords Analysis */}
        <div className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-brand-accent" />
            <h4 className="font-bold text-lg">Primary Keywords</h4>
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold ${getRiskColor(analysis.keywordStuffingRisk)}`}>
              {analysis.keywordStuffingRisk === 'none' ? '✓ Natural' : analysis.keywordStuffingRisk.toUpperCase()}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            {analysis.primaryKeywords.slice(0, 8).map((kw, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white/80 font-medium">{kw.word}</span>
                  <span className="text-xs text-white/40">({kw.frequency}x)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${kw.density > 3 ? 'bg-red-400' : kw.density > 2 ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(kw.density * 20, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono ${kw.density > 3 ? 'text-red-400' : 'text-white/60'}`}>
                    {kw.density.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 text-sm">
            <div className="flex justify-between text-white/60">
              <span>Total Density:</span>
              <span className={`font-semibold ${analysis.keywordDensity > 20 ? 'text-red-400' : 'text-green-400'}`}>
                {analysis.keywordDensity.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-white/60 mt-1">
              <span>Distribution:</span>
              <span className={`font-semibold ${
                analysis.keywordDistribution === 'natural' ? 'text-green-400' :
                analysis.keywordDistribution === 'forced' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {analysis.keywordDistribution}
              </span>
            </div>
          </div>
        </div>

        {/* Topic Clusters */}
        <div className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-accent" />
            <h4 className="font-bold text-lg">Topic Analysis</h4>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Main Topic:</span>
              <span className="px-3 py-1 bg-brand-accent/20 text-brand-accent rounded-full text-sm font-bold">
                {analysis.mainTopic}
              </span>
            </div>
            {analysis.subtopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {analysis.subtopics.map((topic, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {analysis.detectedTopics.slice(0, 4).map((topic, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white/80">{topic.topic}</span>
                  <span className="text-xs text-white/40">{Math.round(topic.relevance)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-accent to-blue-400"
                    style={{ width: `${topic.relevance}%` }}
                  />
                </div>
                {topic.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topic.keywords.map((kw, kidx) => (
                      <span key={kidx} className="text-xs text-white/40">
                        {kw}{kidx < topic.keywords.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sentiment & Tone */}
        <div className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-brand-accent" />
            <h4 className="font-bold">Sentiment & Tone</h4>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Sentiment:</span>
                <span className="flex items-center gap-1 font-semibold">
                  {getSentimentEmoji(analysis.sentimentLabel)} {analysis.sentimentLabel}
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    analysis.sentimentLabel === 'positive' ? 'bg-green-400' :
                    analysis.sentimentLabel === 'negative' ? 'bg-red-400' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${((analysis.sentimentScore + 1) / 2) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              {Object.entries(analysis.toneAnalysis).map(([tone, score]) => (
                <div key={tone} className="flex justify-between items-center text-xs">
                  <span className="text-white/60 capitalize">{tone}:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-accent"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-white/80 w-8 text-right">{Math.round(score)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Classification */}
        <div className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-brand-accent" />
            <h4 className="font-bold">Content Profile</h4>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm text-white/60">Content Type:</span>
              <div className="mt-1 px-3 py-1.5 bg-brand-accent/20 rounded-lg text-center">
                <span className="font-semibold capitalize">{analysis.contentType}</span>
              </div>
            </div>

            <div>
              <span className="text-sm text-white/60">Intent:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {analysis.contentIntent.map((intent, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white/10 rounded text-xs capitalize">
                    {intent}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-sm text-white/60">Target Audience:</span>
              <div className="mt-1 px-3 py-1 bg-white/10 rounded text-center">
                <span className="text-sm font-medium capitalize">{analysis.targetAudience}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-white/50">Lexical Density:</span>
                <span className="font-semibold">{(analysis.lexicalDensity * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Avg Sentence:</span>
                <span className="font-semibold">{analysis.averageSentenceLength.toFixed(0)} words</span>
              </div>
            </div>
          </div>
        </div>

        {/* Entities & Gaps */}
        <div className="p-6 bg-white/5 border border-brand-secondary rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand-accent" />
            <h4 className="font-bold">Entities & Gaps</h4>
          </div>

          <div className="space-y-3">
            {analysis.entities.people.length > 0 && (
              <div>
                <span className="text-xs text-white/50">People:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {analysis.entities.people.slice(0, 3).map((person, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-500/20 rounded text-xs">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.entities.organizations.length > 0 && (
              <div>
                <span className="text-xs text-white/50">Organizations:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {analysis.entities.organizations.slice(0, 3).map((org, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-500/20 rounded text-xs">
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.contentGaps.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Content Gaps:
                </span>
                <div className="mt-2 space-y-1">
                  {analysis.contentGaps.slice(0, 2).map((gap, idx) => (
                    <div key={idx} className="text-xs text-white/60">
                      • {gap}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Improvement Suggestions */}
      {analysis.improvementSuggestions.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-brand-accent/5 to-transparent border border-brand-accent/20 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-brand-accent" />
            <h4 className="font-bold">NLP Optimization Suggestions</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.improvementSuggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded-lg text-sm text-white/70 flex items-start gap-2">
                <span className="text-brand-accent">→</span>
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NLPInsights;
