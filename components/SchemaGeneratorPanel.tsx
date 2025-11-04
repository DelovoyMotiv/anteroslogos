import { useState } from 'react';
import { Code, Sparkles, CheckCircle, AlertTriangle, Copy, Download } from 'lucide-react';
import { 
  AISchemaGenerator,
  type SchemaGenerationRequest,
  type GeneratedSchema,
  type SchemaRecommendation
} from '../utils/ai/schemaGenerator';

interface SchemaGeneratorPanelProps {
  url: string;
  existingSchemas?: string[];
}

const SchemaGeneratorPanel = ({ url, existingSchemas = [] }: SchemaGeneratorPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'recommendations'>('recommendations');
  const [recommendations, setRecommendations] = useState<SchemaRecommendation[]>([]);
  const [generatedSchema, setGeneratedSchema] = useState<GeneratedSchema | null>(null);
  const [contentType, setContentType] = useState<SchemaGenerationRequest['contentType']>('article');

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const generator = new AISchemaGenerator();
      const recs = await generator.analyzeExistingSchemas(existingSchemas);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSchema = async () => {
    setLoading(true);
    try {
      const generator = new AISchemaGenerator();
      const request: SchemaGenerationRequest = {
        url,
        contentType,
        pageContent: {
          title: 'Sample Page',
          description: 'Sample description for schema generation',
        },
      };
      const schema = await generator.generateSchema(request);
      setGeneratedSchema(schema);
      setActiveTab('generate');
    } catch (error) {
      console.error('Failed to generate schema:', error);
      alert('Failed to generate schema. OpenRouter API key may not be configured.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadSchema = (schema: string, filename: string) => {
    const blob = new Blob([schema], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">AI Schema Generator</h2>
        <p className="text-white/60">
          Automatic Schema.org markup generation using GEO Marketolog AI
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => {
            setActiveTab('recommendations');
            if (recommendations.length === 0) loadRecommendations();
          }}
          className={`px-6 py-3 text-sm font-medium transition-all ${
            activeTab === 'recommendations'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-white/60 hover:text-white/90'
          }`}
        >
          Recommendations
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-6 py-3 text-sm font-medium transition-all ${
            activeTab === 'generate'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-white/60 hover:text-white/90'
          }`}
        >
          Generate Schema
        </button>
      </div>

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {recommendations.length === 0 && !loading && (
            <button
              onClick={loadRecommendations}
              className="w-full p-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center"
            >
              <Sparkles className="w-12 h-12 text-brand-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analyze Your Schemas</h3>
              <p className="text-white/60 mb-4">
                Get AI-powered recommendations for improving your Schema.org markup
              </p>
              <span className="inline-block px-6 py-3 bg-brand-accent rounded-lg text-white font-semibold">
                Analyze Schemas
              </span>
            </button>
          )}

          {loading && (
            <div className="py-12 text-center">
              <Sparkles className="w-8 h-8 text-brand-accent mx-auto animate-pulse mb-4" />
              <p className="text-white/60">Analyzing schemas with AI...</p>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-xl border ${
                    rec.priority === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : rec.priority === 'high'
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Code className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-semibold text-lg">{rec.schemaType}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full uppercase font-bold ${
                            rec.priority === 'critical'
                              ? 'bg-red-500/30 text-red-300'
                              : rec.priority === 'high'
                              ? 'bg-orange-500/20 text-orange-300'
                              : rec.priority === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 mb-3">{rec.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-sm text-white/50">Est. Time</div>
                      <div className="font-semibold">{rec.estimatedTime}</div>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm font-semibold text-green-400 mb-2">Implementation:</p>
                    <p className="text-sm text-white/70 whitespace-pre-line">{rec.implementation}</p>
                  </div>

                  {rec.codeExample && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-brand-accent hover:underline flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        View Code Example
                      </summary>
                      <div className="mt-3 relative">
                        <button
                          onClick={() => copyToClipboard(rec.codeExample)}
                          className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <pre className="p-4 bg-black/50 rounded-lg text-xs text-green-400 overflow-x-auto">
                          <code>{rec.codeExample}</code>
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {/* Content Type Selector */}
          <div>
            <label className="block text-sm font-semibold mb-3">Content Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['article', 'product', 'service', 'organization', 'person', 'faq', 'howto', 'event'] as const).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all ${
                      contentType === type
                        ? 'bg-brand-accent text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateSchema}
            disabled={loading}
            className="w-full p-6 rounded-xl bg-gradient-to-r from-brand-accent to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate {contentType.charAt(0).toUpperCase() + contentType.slice(1)} Schema
              </>
            )}
          </button>

          {/* Generated Schema Display */}
          {generatedSchema && (
            <div className="space-y-6">
              {/* Validation Status */}
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  generatedSchema.validation?.isValid
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                {generatedSchema.validation?.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                )}
                <div>
                  <h4 className="font-semibold">
                    {generatedSchema.validation?.isValid ? 'Valid Schema' : 'Schema Generated'}
                  </h4>
                  <p className="text-sm text-white/60">
                    {generatedSchema.schemaType} - Ready to implement
                  </p>
                </div>
              </div>

              {/* Impact Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-sm text-white/50 mb-1">GEO Score</p>
                  <p className="text-2xl font-bold text-green-400">
                    +{generatedSchema.estimatedImpact.geoScoreIncrease}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-sm text-white/50 mb-1">Citation +</p>
                  <p className="text-2xl font-bold text-blue-400">
                    +{generatedSchema.estimatedImpact.citationProbabilityIncrease}%
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-sm text-white/50 mb-1">Visibility</p>
                  <p className="text-lg font-bold text-purple-400">
                    {generatedSchema.estimatedImpact.visibilityImprovement}
                  </p>
                </div>
              </div>

              {/* AI Insights */}
              {generatedSchema.aiInsights.length > 0 && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI Insights
                  </h4>
                  <ul className="space-y-2">
                    {generatedSchema.aiInsights.map((insight, i) => (
                      <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                        <span className="text-purple-400">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* JSON-LD Code */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">JSON-LD Markup</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedSchema.jsonLd)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </button>
                    <button
                      onClick={() => downloadSchema(generatedSchema.jsonLd, `${contentType}-schema.json`)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Download</span>
                    </button>
                  </div>
                </div>
                <pre className="p-4 bg-black/50 rounded-lg text-xs text-green-400 overflow-x-auto border border-white/10">
                  <code>{generatedSchema.jsonLd}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Footer */}
      <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <p className="text-sm text-white/70">
          <strong>Note:</strong> AI Schema Generator uses OpenRouter API with GEO Marketolog Agent to create
          production-ready Schema.org markup optimized for AI visibility and citation likelihood.
        </p>
      </div>
    </div>
  );
};

export default SchemaGeneratorPanel;
