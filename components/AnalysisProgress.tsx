import { useEffect, useState } from 'react';
import { Search, Globe, Brain, Shield, Layout, Zap, FileText, Target, Code } from 'lucide-react';

interface AnalysisStep {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  duration: number;
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: 'fetch', label: 'Fetching Website', icon: Globe, color: 'text-blue-400', duration: 1500 },
  { id: 'schema', label: 'Schema Markup', icon: Code, color: 'text-purple-400', duration: 1200 },
  { id: 'meta', label: 'Meta Tags', icon: FileText, color: 'text-green-400', duration: 800 },
  { id: 'crawlers', label: 'AI Crawlers', icon: Brain, color: 'text-cyan-400', duration: 1000 },
  { id: 'eeat', label: 'E-E-A-T Signals', icon: Shield, color: 'text-amber-400', duration: 1300 },
  { id: 'structure', label: 'HTML Structure', icon: Layout, color: 'text-pink-400', duration: 900 },
  { id: 'performance', label: 'Performance', icon: Zap, color: 'text-yellow-400', duration: 1100 },
  { id: 'content', label: 'Content Quality', icon: FileText, color: 'text-teal-400', duration: 1400 },
  { id: 'technical', label: 'Technical SEO', icon: Target, color: 'text-orange-400', duration: 1000 },
];

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  url: string;
}

const AnalysisProgress = ({ isAnalyzing, url }: AnalysisProgressProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0);
      setCompletedSteps(new Set());
      setProgress(0);
      return;
    }

    let stepIndex = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let progressInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const advanceStep = () => {
      if (!isMounted || stepIndex >= ANALYSIS_STEPS.length) {
        return;
      }

      setCurrentStep(stepIndex);
      
      // Simulate step progress
      const step = ANALYSIS_STEPS[stepIndex];
      progressInterval = setInterval(() => {
        if (!isMounted) return;
        setProgress(prev => {
          const increment = 100 / (step.duration / 50);
          return Math.min(prev + increment, 100);
        });
      }, 50);

      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        if (progressInterval) clearInterval(progressInterval);
        setCompletedSteps(prev => new Set(prev).add(stepIndex));
        setProgress(0);
        stepIndex++;
        advanceStep();
      }, step.duration);
    };

    advanceStep();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
      setProgress(0);
    };
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  const overallProgress = completedSteps.size / ANALYSIS_STEPS.length * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/95 backdrop-blur-sm">
      <div className="max-w-2xl w-full mx-4 p-8 bg-gradient-to-br from-brand-secondary/40 to-transparent border border-brand-accent/30 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-brand-accent/20 rounded-full">
            <Search className="w-8 h-8 text-brand-accent animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Website</h2>
          <p className="text-white/60 text-sm break-all">{url}</p>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Overall Progress</span>
            <span className="text-sm font-semibold text-brand-accent">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-accent to-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {ANALYSIS_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.has(index);
            const isCurrent = currentStep === index;
            const isUpcoming = index > currentStep;

            return (
              <div
                key={step.id}
                className={`relative p-4 rounded-xl border transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-white/10 border-green-500/50 shadow-lg shadow-green-500/20' 
                    : isCurrent
                    ? 'bg-brand-accent/10 border-brand-accent animate-pulse'
                    : 'bg-white/5 border-brand-secondary/30'
                }`}
              >
                {/* Step Icon */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex-shrink-0 ${
                    isCompleted 
                      ? 'text-green-400' 
                      : isCurrent 
                      ? step.color 
                      : 'text-white/30'
                  }`}>
                    <Icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce' : ''}`} />
                  </div>
                  <span className={`text-xs font-medium ${
                    isUpcoming ? 'text-white/40' : 'text-white/90'
                  }`}>
                    {step.label}
                  </span>
                </div>

                {/* Individual Step Progress */}
                {isCurrent && (
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${step.color.replace('text-', 'from-')} to-brand-accent transition-all duration-100`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {/* Checkmark for completed */}
                {isCompleted && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Pulse animation for current step */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-xl border-2 border-brand-accent/50 animate-ping" />
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Label */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent/20 border border-brand-accent/40 rounded-full">
            <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
            <span className="text-sm font-medium text-brand-accent">
              {ANALYSIS_STEPS[currentStep]?.label || 'Analyzing...'}
            </span>
          </div>
        </div>

        {/* Fun Facts or Tips */}
        <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-xs text-white/60 text-center">
            💡 <span className="font-semibold text-white/80">Pro Tip:</span> {getTipForStep(currentStep)}
          </p>
        </div>
      </div>
    </div>
  );
};

function getTipForStep(stepIndex: number): string {
  const tips = [
    'We\'re fetching your website HTML and resources...',
    'Checking for Schema.org structured data in JSON-LD format',
    'Analyzing meta tags for SEO and social sharing',
    'Verifying robots.txt allows AI crawlers like GPTBot and Claude',
    'Evaluating expertise, authority, and trust signals',
    'Examining semantic HTML5 structure and heading hierarchy',
    'Measuring page weight, scripts, and optimization',
    'Assessing content depth, readability, and citation potential',
    'Validating technical SEO elements like HTTPS and canonical URLs',
  ];
  return tips[stepIndex] || 'Running comprehensive analysis...';
}

export default AnalysisProgress;
